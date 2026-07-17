/**
 * Editor.tsx — Main TipTap editor component
 *
 * Integrates:
 * - TipTap StarterKit (paragraph, bold, italic, history)
 * - Underline extension
 * - TimestampNode + TimestampExtension
 * - Paste cleanup
 * - Word/char counter (debounced)
 * - PlayerContext integration (timestamp click → seek)
 * - Autosave
 * - Format state reporting (for FormatToolbar)
 * - Pause on typing (pauses player when user starts typing)
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { useEffect, useCallback, useRef } from 'react';
import { TimestampNode } from './TimestampNode';
import { TimestampExtension } from './TimestampExtension';
import { cleanHTML } from './pasteCleanup';
import { PhoneticInputExtension } from './PhoneticInputExtension';
import { getPlayer } from '../audio-engine/Player';
import type { AppSettings } from '../../types/settings';
import { debouncedAutosave } from '../storage/autosave';
import { useTranslation } from '../shell/i18n/I18nContext';

export type ActiveFormat = 'bold' | 'italic' | 'underline';

interface EditorProps {
  initialHtml?: string;
  settings: AppSettings;
  onContentChange?: (html: string) => void;
  onWordCountChange?: (words: number, chars: number) => void;
  onActiveFormatsChange?: (formats: Set<ActiveFormat>) => void;
  pauseOnTyping?: boolean;
}

export default function Editor({
  initialHtml = '',
  settings,
  onContentChange,
  onWordCountChange,
  onActiveFormatsChange,
  pauseOnTyping = false,
}: EditorProps) {
  const { t } = useTranslation();
  const timestampOffset = parseTimestampOffset(settings.timestampOffset);
  const wordCountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const reportActiveFormats = useCallback(
    (ed: ReturnType<typeof useEditor>) => {
      if (!ed || !onActiveFormatsChange) return;
      const formats = new Set<ActiveFormat>();
      if (ed.isActive('bold')) formats.add('bold');
      if (ed.isActive('italic')) formats.add('italic');
      if (ed.isActive('underline')) formats.add('underline');
      onActiveFormatsChange(formats);
    },
    [onActiveFormatsChange],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: { HTMLAttributes: {} },
        // Disable built-in underline — we use @tiptap/extension-underline directly
        // to avoid the "Duplicate extension names" warning
      }),
      Underline,
      TimestampNode.configure({
        onTimestampClick: (seconds: number) => {
          getPlayer()?.setTime(seconds);
        },
      }),
      TimestampExtension.configure({
        getPlayer,
        timestampOffset,
        useMilliseconds: settings.timestampMilliseconds,
      }),
      PhoneticInputExtension.configure({
        getConfig: () => ({
          enabled: settingsRef.current.phoneticInput.enabled,
          lang: settingsRef.current.phoneticInput.lang,
        }),
      }),
    ],
    autofocus: 'end',
    content: initialHtml || '<p></p>',
    editorProps: {
      attributes: {
        class: 'editor-content',
        id: 'textbox',
        dir: 'auto',
        'aria-label': t('aria-editor'),
        'aria-multiline': 'true',
        role: 'textbox',
      },
      handlePaste: (_view, event) => {
        const html = event.clipboardData?.getData('text/html');
        if (html) {
          event.preventDefault();
          const clean = cleanHTML(html);
          editor?.commands.insertContent(clean, {
            parseOptions: { preserveWhitespace: false },
          });
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      onContentChange?.(html);
      debouncedAutosave(html);
      reportActiveFormats(ed);

      if (wordCountTimerRef.current) clearTimeout(wordCountTimerRef.current);
      wordCountTimerRef.current = setTimeout(() => {
        const text = ed.getText();
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        onWordCountChange?.(words, text.length);
      }, 1000);
    },
    onSelectionUpdate: ({ editor: ed }) => {
      reportActiveFormats(ed);
    },
    // Fires on EVERY transaction — catches storedMarks changes (Mod+B/I/U with
    // no selection) which neither onUpdate nor onSelectionUpdate see.
    onTransaction: ({ editor: ed }) => {
      reportActiveFormats(ed);
    },
  });

  // Update content when .otr file is loaded
  useEffect(() => {
    if (!editor || !initialHtml) return;
    if (editor.getHTML() !== initialHtml) {
      editor.commands.setContent(initialHtml);
    }
  }, [editor, initialHtml]);

  // NOTE: Mod+B/I/U are handled natively by TipTap's StarterKit + Underline extensions
  // via ProseMirror's keymap. Adding them here would cause a double-toggle (cancel).
  // onUpdate fires after TipTap's internal handling → reportActiveFormats is called there.

  // Expose toggle format method via DOM event (for FormatToolbar buttons)
  useEffect(() => {
    const handleFormatEvent = (e: CustomEvent<{ format: ActiveFormat }>) => {
      if (!editor) return;
      const { format } = e.detail;
      if (format === 'bold') editor.chain().focus().toggleBold().run();
      else if (format === 'italic') editor.chain().focus().toggleItalic().run();
      else if (format === 'underline')
        editor.chain().focus().toggleUnderline().run();
      // Re-report immediately — onSelectionUpdate only fires on cursor move,
      // not on storedMark changes when there is no selection
      reportActiveFormats(editor);
    };
    // Restore focus after player loads (flushSync steals it during layout change)
    // Only focus if the editor doesn't already have DOM focus — avoids stealing
    // focus when the user has already clicked somewhere else after loading.
    const handleFocusEvent = () => {
      if (!editor) return;
      const editorEl = editor.view.dom as HTMLElement;
      if (!editorEl.contains(document.activeElement)) {
        // Preserve caret position (null = don't move cursor)
        editor.commands.focus(null);
      }
    };
    document.addEventListener(
      'editor:format',
      handleFormatEvent as EventListener,
    );
    document.addEventListener('editor:focus', handleFocusEvent);
    return () => {
      document.removeEventListener(
        'editor:format',
        handleFormatEvent as EventListener,
      );
      document.removeEventListener('editor:focus', handleFocusEvent);
    };
  }, [editor, reportActiveFormats]);

  // Pause on typing: pause player when user types a printable character
  useEffect(() => {
    if (!editor || !pauseOnTyping) return;

    const handleEditorKeyDown = (e: KeyboardEvent) => {
      // Only pause on printable key presses (not modifier-only combos, arrows, etc.)
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        const player = getPlayer();
        if (player?.getStatus() === 'playing') {
          player.pause();
        }
      }
    };

    // Attach to the editor DOM element
    const editorEl = editor.view.dom as HTMLElement;
    editorEl.addEventListener('keydown', handleEditorKeyDown);
    return () => editorEl.removeEventListener('keydown', handleEditorKeyDown);
  }, [editor, pauseOnTyping]);

  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!editor) return;
      // Only focus if the click target is the container itself (i.e., padding area),
      // not a child element inside the editor
      const editorEl = editor.view.dom as HTMLElement;
      if (!editorEl.contains(e.target as Node)) {
        editor.commands.focus();
      }
    },
    [editor],
  );

  return (
    <div
      className="textbox-container"
      id="textbox-container"
      style={{ flex: 1, height: '100%', overflowY: 'auto' }}
      onClick={handleContainerClick}
    >
      <EditorContent editor={editor} />
    </div>
  );
}

function parseTimestampOffset(offsetStr: string): number {
  if (!offsetStr || offsetStr === '00:00') return 0;
  const parts = offsetStr.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 60 + (parts[1] ?? 0);
}
