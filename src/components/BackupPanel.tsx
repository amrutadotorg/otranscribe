/**
 * BackupPanel.tsx — Slide-in panel showing backup history
 *
 * Features:
 * - Lists all backups grouped / sorted by date
 * - Preview on hover
 * - Restore button loads backup into editor
 * - Pagination (8 per page)
 */

import { useState, useEffect, useCallback } from 'react';
import { IconX, IconTrash } from '@tabler/icons-react';
import {
  getAllBackups,
  restoreBackup,
  deleteBackup,
  type BackupEntry,
} from '../modules/storage/backupManager';
import { useTranslation } from '../modules/shell/i18n/I18nContext';

interface Props {
  open: boolean;
  onClose: () => void;
  onRestore: (html: string) => void;
}

const PAGE_SIZE = 8;

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function wordCount(html: string): number {
  const div = document.createElement('div');
  div.innerHTML = html;
  const text = div.textContent ?? '';
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export default function BackupPanel({ open, onClose, onRestore }: Props) {
  const { t } = useTranslation();
  const [backups, setBackups] = useState<
    Array<{ key: string; entry: BackupEntry }>
  >([]);
  const [page, setPage] = useState(0);
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  const reload = useCallback(() => {
    setBackups(getAllBackups());
  }, []);

  useEffect(() => {
    if (open) reload();
  }, [open, reload]);

  const totalPages = Math.ceil(backups.length / PAGE_SIZE);
  const paginated = backups.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleRestore = (key: string) => {
    const entry = restoreBackup(key);
    if (entry) {
      onRestore(entry.text);
      onClose();
    }
  };

  const handleDelete = (key: string) => {
    if (!window.confirm(t('dialog-delete-backup'))) return;
    deleteBackup(key);
    reload();
  };

  return (
    <div className={`side-panel ${open ? 'open' : ''}`} id="backup-panel">
      <div className="side-panel-header">
        <h2>{t('history-title')}</h2>
        <button
          className="icon-btn"
          onClick={onClose}
          aria-label={t('cancel')}
          id="close-backup-btn"
        >
          <IconX size={18} />
        </button>
      </div>

      <div className="side-panel-body">
        {backups.length === 0 ? (
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            {t('no-backups')}
            <br />
            <br />
            {t('history-instrux-v2')}
          </p>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
              }}
            >
              {paginated.map(({ key, entry }) => (
                <div
                  key={key}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-3)',
                    background:
                      previewKey === key
                        ? 'var(--color-primary-light)'
                        : 'var(--color-surface-2)',
                    cursor: 'pointer',
                    transition: 'background var(--transition-fast)',
                  }}
                  onClick={() => setPreviewKey(previewKey === key ? null : key)}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 'var(--space-2)',
                    }}
                  >
                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: 'var(--font-size-sm)',
                          fontWeight: 600,
                        }}
                      >
                        {formatDate(entry.timestamp)}
                      </div>
                      <div
                        style={{
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--color-text-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={entry.media || t('backup-no-media')}
                      >
                        {entry.media || t('backup-no-media')} ·{' '}
                        {t('wordcount', { n: wordCount(entry.text) })}
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 'var(--space-1)',
                        flexShrink: 0,
                      }}
                    >
                      <button
                        className="btn btn-primary"
                        style={{
                          padding: '4px 10px',
                          fontSize: 'var(--font-size-xs)',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore(key);
                        }}
                        id={`restore-backup-${key.slice(-8)}`}
                      >
                        {t('restore-button')}
                      </button>
                      <button
                        className="btn"
                        style={{
                          padding: '4px 8px',
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-danger)',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(key);
                        }}
                        aria-label={t('aria-delete-backup')}
                      >
                        <IconTrash size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Preview */}
                  {previewKey === key && (
                    <div
                      style={{
                        marginTop: 'var(--space-2)',
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-muted)',
                        maxHeight: 120,
                        overflow: 'hidden',
                        lineHeight: 1.5,
                      }}
                      dangerouslySetInnerHTML={{
                        __html: entry.text.substring(0, 400) + '…',
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 'var(--space-2)',
                  marginTop: 'var(--space-4)',
                }}
              >
                <button
                  className="btn"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  {t('prev-page')}
                </button>
                <span
                  style={{
                    alignSelf: 'center',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {page + 1} / {totalPages}
                </span>
                <button
                  className="btn"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page === totalPages - 1}
                >
                  {t('next-page')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
