/**
 * TextPanel.tsx — Editor area with TipTap editor, word counter, and format state
 */

import { useState, useCallback } from 'react';
import Editor, { type ActiveFormat } from '../modules/editor/Editor';
import QuickTutorial from './QuickTutorial';
import { useTranslation } from '../modules/shell/i18n/I18nContext';
import type { AppSettings } from '../types/settings';

interface Props {
  settings: AppSettings;
  initialHtml?: string;
  onContentChange?: (html: string) => void;
  onActiveFormatsChange?: (formats: Set<ActiveFormat>) => void;
  pauseOnTyping?: boolean;
}

export default function TextPanel({
  settings,
  initialHtml,
  onContentChange,
  onActiveFormatsChange,
  pauseOnTyping,
}: Props) {
  const { t } = useTranslation();
  const [wordCount, setWordCount] = useState({ words: 0, chars: 0 });
  const [showTutorial, setShowTutorial] = useState(true);

  const handleActiveFormats = useCallback(
    (formats: Set<ActiveFormat>) => {
      onActiveFormatsChange?.(formats);
    },
    [onActiveFormatsChange],
  );

  const handleContentChange = useCallback(
    (html: string) => {
      onContentChange?.(html);
      if (showTutorial && html.replace(/<[^>]*>/g, '').trim().length > 0) {
        setShowTutorial(false);
      }
    },
    [onContentChange, showTutorial],
  );

  return (
    <div
      className="text-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
      }}
    >
      <Editor
        initialHtml={initialHtml}
        settings={settings}
        onContentChange={handleContentChange}
        onWordCountChange={(words, chars) => setWordCount({ words, chars })}
        onActiveFormatsChange={handleActiveFormats}
        pauseOnTyping={pauseOnTyping}
      />
      {showTutorial && !initialHtml && (
        <QuickTutorial
          onDismiss={() => {
            setShowTutorial(false);
            setTimeout(
              () => document.dispatchEvent(new CustomEvent('editor:focus')),
              0,
            );
          }}
        />
      )}
      <div className="word-counter" id="word-counter" aria-live="polite">
        {t('wordcount', { n: wordCount.words })} ·{' '}
        {t('charcount', { n: wordCount.chars })}
      </div>
    </div>
  );
}
