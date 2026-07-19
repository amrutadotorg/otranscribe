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
          <p className="backup-empty">
            {t('no-backups')}
            <br />
            <br />
            {t('history-instrux-v2')}
          </p>
        ) : (
          <>
            <div className="backup-list">
              {paginated.map(({ key, entry }) => (
                <div
                  key={key}
                  className={`backup-item ${previewKey === key ? 'active' : ''}`}
                  onClick={() => setPreviewKey(previewKey === key ? null : key)}
                >
                  <div className="backup-item-header">
                    <div className="backup-item-meta">
                      <div className="backup-item-title">
                        {formatDate(entry.timestamp)}
                      </div>
                      <div
                        className="backup-item-desc"
                        title={entry.media || t('backup-no-media')}
                      >
                        {entry.media || t('backup-no-media')} ·{' '}
                        {t('wordcount', { n: wordCount(entry.text) })}
                      </div>
                    </div>
                    <div className="backup-item-actions">
                      <button
                        className="btn btn-primary backup-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore(key);
                        }}
                        id={`restore-backup-${key.slice(-8)}`}
                      >
                        {t('restore-button')}
                      </button>
                      <button
                        className="btn backup-delete-btn"
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
                      className="backup-preview"
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
              <div className="backup-pagination">
                <button
                  className="btn"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  {t('prev-page')}
                </button>
                <span className="backup-pagination-info">
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
