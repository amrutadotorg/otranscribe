/**
 * UrlInputModal.tsx — URL input modal to replace browser prompt()
 *
 * Used for YouTube and Vimeo URL entry.
 * Rendered inline, focusses input on open, submits on Enter.
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../modules/shell/i18n/I18nContext';

interface Props {
  open: boolean;
  title: string;
  placeholder: string;
  description?: string;
  /** Called when user confirms with a trimmed, non-empty URL */
  onConfirm: (url: string) => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** Optional: pre-validate; return error string or null */
  validate?: (url: string) => string | null;
}

export default function UrlInputModal({
  open,
  title,
  placeholder,
  description,
  onConfirm,
  onCancel,
  validate,
}: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus and reset when opened
  useEffect(() => {
    if (open) {
      setValue('');
      setError(null);
      // Small delay so the modal is visible before focusing
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError(t('error-empty-url'));
      return;
    }
    if (validate) {
      const err = validate(trimmed);
      if (err) {
        setError(err);
        return;
      }
    }
    onConfirm(trimmed);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop"
        onClick={onCancel}
        aria-hidden="true"
        id="url-modal-backdrop"
      />
      {/* Dialog */}
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="url-modal-title"
        id="url-input-modal"
      >
        <div className="modal-header">
          <h2 id="url-modal-title" className="modal-title">
            {title}
          </h2>
          <button
            className="icon-btn"
            onClick={onCancel}
            aria-label={t('aria-cancel')}
            id="url-modal-cancel-btn"
          >
            ✕
          </button>
        </div>

        {description && (
          <p
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-muted)',
              marginBottom: 'var(--space-3)',
            }}
          >
            {description}
          </p>
        )}

        <input
          ref={inputRef}
          type="url"
          className="url-input"
          id="url-modal-input"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
          aria-label={t('aria-url-input')}
          aria-describedby={error ? 'url-modal-error' : undefined}
          autoComplete="off"
          spellCheck={false}
        />

        {error && (
          <p
            id="url-modal-error"
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-danger)',
              marginTop: 'var(--space-1)',
            }}
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="modal-actions">
          <button className="btn" onClick={onCancel} id="url-modal-btn-cancel">
            {t('cancel-btn')}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            id="url-modal-btn-confirm"
          >
            {t('load-btn')}
          </button>
        </div>
      </div>
    </>
  );
}
