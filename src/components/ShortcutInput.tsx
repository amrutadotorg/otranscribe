/**
 * ShortcutInput.tsx — Interactive keyboard shortcut editor
 *
 * Displays current shortcuts as removable tags with a "Listen" button
 * that captures the next key combination pressed by the user.
 *
 * Supports modifiers: mod (Ctrl/Cmd), shift, alt.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../modules/shell/i18n/I18nContext';
import { formatShortcutDisplay } from '../modules/platform/detectPlatform';

interface Props {
  value: string[];
  onChange: (value: string[]) => void;
  id?: string;
}

export default function ShortcutInput({ value, onChange, id }: Props) {
  const { t } = useTranslation();
  const [listening, setListening] = useState(false);

  const stopListening = useCallback(() => {
    setListening(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!listening) return;

      e.preventDefault();
      e.stopPropagation();

      // Cancel on Escape
      if (e.key === 'Escape') {
        stopListening();
        return;
      }

      // Remove last shortcut on Backspace (if not holding modifiers)
      if (
        e.key === 'Backspace' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        onChange(value.slice(0, -1));
        stopListening();
        return;
      }

      // Ignore bare modifier presses
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

      // Build shortcut string
      const parts: string[] = [];
      if (e.metaKey || e.ctrlKey) parts.push('mod');
      if (e.shiftKey) parts.push('shift');
      if (e.altKey) parts.push('alt');
      parts.push(e.key.toLowerCase());

      const shortcut = parts.join('+');

      // Don't add duplicate
      if (!value.includes(shortcut)) {
        onChange([...value, shortcut]);
      }

      stopListening();
    },
    [listening, value, onChange, stopListening],
  );

  // Register keydown listener when listening
  useEffect(() => {
    if (!listening) return;
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [listening, handleKeyDown]);

  const removeShortcut = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        flexWrap: 'wrap',
      }}
    >
      {value.map((shortcut, i) => (
        <span
          key={`${shortcut}-${i}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            padding: '2px 6px',
            fontSize: 'var(--font-size-xs)',
            fontFamily: 'var(--font-mono)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface-2)',
            color: 'var(--color-text)',
          }}
        >
          {formatShortcutDisplay(shortcut)}
          <button
            onClick={() => removeShortcut(i)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontSize: '10px',
              color: 'var(--color-text-muted)',
              lineHeight: 1,
            }}
            aria-label={`Remove ${shortcut}`}
          >
            ✕
          </button>
        </span>
      ))}
      <button
        className="btn"
        onClick={() => setListening((l) => !l)}
        style={{
          padding: '2px 8px',
          fontSize: 'var(--font-size-xs)',
          background: listening ? 'var(--color-primary)' : undefined,
          color: listening ? 'var(--color-on-primary)' : undefined,
          minWidth: 60,
        }}
        id={id ? `${id}-listen` : undefined}
      >
        {listening ? '...' : t('shortcut-listen')}
      </button>
    </div>
  );
}
