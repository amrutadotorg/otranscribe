/**
 * HelpPanel.tsx — Slide-in panel for help and FAQ
 */

import { useEffect } from 'react';
import { useTranslation } from '../modules/shell/i18n/I18nContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function HelpPanel({ open, onClose }: Props) {
  const { t, tHtml } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const questions = [];
  for (let i = 1; i <= 15; i++) {
    const qKey = `help-q${i}`;
    const q = t(qKey);
    if (q === qKey) continue;

    const answerParts: string[] = [];

    const aKey = `help-a${i}`;
    const aHtml = tHtml(aKey);
    const aText = t(aKey);
    if (aHtml) {
      answerParts.push(aHtml);
    } else if (aText !== aKey) {
      answerParts.push(aText);
    }

    const suffixes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (const s of suffixes) {
      const subKey = `${aKey}${s}`;
      const subHtml = tHtml(subKey);
      const subText = t(subKey);
      if (subHtml) {
        answerParts.push(subHtml);
      } else if (subText !== subKey) {
        answerParts.push(subText);
      }
    }

    questions.push({
      id: i,
      q,
      answerHtml: answerParts.length > 0 ? answerParts.join('<br /><br />') : null
    });
  }

  return (
    <div className={`side-panel ${open ? 'open' : ''}`} id="help-panel">
      <div className="side-panel-header">
        <h2>{t('help')}</h2>
        <button className="icon-btn" onClick={onClose} aria-label={t('cancel')} id="close-help-btn">✕</button>
      </div>
      
      <div className="side-panel-body" style={{ overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {questions.map(({ id, q, answerHtml }) => (
            <div key={id}>
              <h3 style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--space-2)' }}>{q}</h3>
              {answerHtml ? (
                <p 
                  style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}
                  dangerouslySetInnerHTML={{ __html: answerHtml }} 
                />
              ) : null}
            </div>
          ))}
          {questions.length === 0 && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
              No help content available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
