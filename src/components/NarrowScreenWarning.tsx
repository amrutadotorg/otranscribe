import { useState, useEffect } from 'react';
import { useTranslation } from '../modules/shell/i18n/I18nContext';

export default function NarrowScreenWarning() {
  const [dismissed, setDismissed] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const checkWidth = () => {
      setIsNarrow(window.innerWidth < 1024);
    };

    // Initial check
    checkWidth();

    // Listen for resize
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  if (!isNarrow || dismissed) {
    return null;
  }

  return (
    <div className="modal-backdrop" style={{ zIndex: 9999 }}>
      <div className="modal" style={{ textAlign: 'center' }}>
        <h2 className="modal-title" style={{ marginBottom: 'var(--space-3)' }}>
          {t('narrow-screen-title')}
        </h2>
        <p style={{ marginBottom: 'var(--space-3)' }}>
          {t('narrow-screen-desc')}
        </p>
        <p className="text-muted" style={{ marginBottom: 'var(--space-6)' }}>
          {t('narrow-screen-min')}
        </p>
        <button
          className="button button-primary"
          onClick={() => setDismissed(true)}
        >
          {t('narrow-screen-proceed')}
        </button>
      </div>
    </div>
  );
}
