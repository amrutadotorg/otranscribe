/**
 * TopBar.tsx — Application toolbar with real player controls
 *
 * Connected to PlayerContext — shows live time, progress, speed.
 * Keyboard shortcuts handled globally (Faza 6).
 */

import { useCallback } from 'react';
import type React from 'react';
import { usePlayer } from '../modules/audio-engine/PlayerContext';
import { formatTime } from '../modules/editor/TimestampExtension';
import FormatToolbar from './FormatToolbar';
import Tooltip from './Tooltip';
import { useTranslation } from '../modules/shell/i18n/I18nContext';
import type { ActiveFormat } from '../modules/editor/Editor';
import type { AppSettings } from '../types/settings';

interface Props {
  settings: AppSettings;
  activeFormats: Set<ActiveFormat>;
  onFormat: (format: ActiveFormat) => void;
  /** Open settings panel */
  onOpenSettings: () => void;
  /** Open help panel */
  onOpenHelp: () => void;
  /** Open backup history panel */
  onOpenBackup: () => void;
  onGoHome: () => void;
  onExport: () => void;
  exportMenuOpen: boolean;
  exportDisabled: boolean;
  exportMenuRef: React.RefObject<HTMLDivElement | null>;
  onExportFormat: (format: 'txt' | 'md' | 'otr') => void;
}

export default function TopBar({
  activeFormats,
  onFormat,
  onOpenSettings,
  onOpenHelp,
  onOpenBackup,
  onGoHome,
  onExport,
  exportMenuOpen,
  exportDisabled,
  exportMenuRef,
  onExportFormat,
}: Props) {
  const { t } = useTranslation();
  const { playerState, play, pause, skip, skipTo, speedUp, speedDown } =
    usePlayer();

  const { isPlaying, currentTime, duration, speed, isReady } = playerState;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const timeDisplay = formatTime(currentTime);
  const speedDisplay = `${speed.toFixed(2).replace(/\.?0+$/, '')}×`;

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isReady || duration === 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      skipTo(ratio * duration);
    },
    [isReady, duration, skipTo],
  );

  const handleTimeClick = useCallback(() => {
    const input = prompt(t('jump-to-time') + t('dialog-suffix-mm-ss'));
    if (!input) return;
    const trimmed = input.trim();
    let seconds = 0;
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':').map(Number);
      seconds =
        parts.length === 3
          ? parts[0] * 3600 + parts[1] * 60 + parts[2]
          : parts[0] * 60 + parts[1];
    } else {
      seconds = parseFloat(trimmed) * 60;
    }
    if (!isNaN(seconds)) skipTo(seconds);
  }, [skipTo]);

  return (
    <header className="topbar" role="banner">
      <Tooltip content={t('title-home')}>
        <div
          className="topbar-brand"
          id="brand"
          role="link"
          tabIndex={0}
          onClick={onGoHome}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onGoHome();
          }}
          style={{ cursor: 'pointer' }}
          aria-label={t('aria-home')}
        >
          Transcribe for Amruta.org
        </div>
      </Tooltip>

      <div className="player-controls" id="player-controls">
        {/* Return to start */}
        <Tooltip content={t('title-return-start')}>
          <button
            className="player-btn"
            aria-label={t('aria-return-start')}
            onClick={() => skipTo(0)}
            disabled={!isReady}
            id="btn-return-start"
          >
            ⏮
          </button>
        </Tooltip>

        {/* Rewind */}
        <Tooltip content={t('title-rewind')}>
          <button
            className="player-btn"
            aria-label={t('aria-rewind')}
            onClick={() => skip('backwards')}
            disabled={!isReady}
            id="btn-rewind"
          >
            ◀◀
          </button>
        </Tooltip>

        {/* Play/Pause */}
        <Tooltip content={t('title-play-pause')}>
          <button
            className="player-btn primary"
            aria-label={isPlaying ? t('aria-pause') : t('aria-play')}
            onClick={isPlaying ? pause : play}
            disabled={!isReady}
            id="btn-play-pause"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
        </Tooltip>

        {/* Fast forward */}
        <Tooltip content={t('title-forward')}>
          <button
            className="player-btn"
            aria-label={t('aria-forward')}
            onClick={() => skip('forwards')}
            disabled={!isReady}
            id="btn-forward"
          >
            ▶▶
          </button>
        </Tooltip>

        {/* Time display */}
        <Tooltip content={t('timeSelection')}>
          <div
            className="player-time"
            id="player-time-display"
            role="button"
            tabIndex={0}
            onClick={handleTimeClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTimeClick();
            }}
            aria-label={t('aria-current-time', { time: timeDisplay })}
          >
            {timeDisplay}
          </div>
        </Tooltip>

        {/* Progress bar */}
        <div
          className="progress-bar-container"
          id="progress-bar"
          role="slider"
          aria-valuenow={Math.round(progressPercent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('aria-media-progress')}
          onClick={handleProgressClick}
          tabIndex={isReady ? 0 : -1}
        >
          <div
            className="progress-bar-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Speed controls */}
        <Tooltip content={t('title-slow-down')}>
          <button
            className="player-btn"
            aria-label={t('aria-decrease-speed')}
            onClick={speedDown}
            disabled={!isReady}
            id="btn-speed-down"
          >
            🐢
          </button>
        </Tooltip>
        <div
          className="speed-display"
          id="speed-display"
          aria-label={t('aria-playback-speed', { speed: speedDisplay })}
        >
          {speedDisplay}
        </div>
        <Tooltip content={t('title-speed-up')}>
          <button
            className="player-btn"
            aria-label={t('aria-increase-speed')}
            onClick={speedUp}
            disabled={!isReady}
            id="btn-speed-up"
          >
            🐇
          </button>
        </Tooltip>

        {/* Format toolbar — bold/italic/underline */}
        <FormatToolbar activeFormats={activeFormats} onFormat={onFormat} />
      </div>

      <div className="topbar-actions" id="topbar-actions">
        <Tooltip content={t('history-button')}>
          <button
            className="icon-btn"
            aria-label={t('history-button')}
            onClick={onOpenBackup}
            id="btn-backup-history"
          >
            🕐
          </button>
        </Tooltip>
        <div style={{ position: 'relative' }} ref={exportMenuRef}>
          <Tooltip content={t('export')}>
            <button
              className={`icon-btn${exportMenuOpen ? ' active' : ''}`}
              aria-label={t('export')}
              id="btn-export"
              onClick={onExport}
              disabled={exportDisabled}
              aria-expanded={exportMenuOpen}
              aria-haspopup="menu"
            >
              ↗
            </button>
          </Tooltip>
          {exportMenuOpen && (
            <div
              role="menu"
              id="export-menu"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                insetInlineEnd: 0,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                minWidth: '180px',
                zIndex: 1000,
                overflow: 'hidden',
              }}
            >
              {[
                {
                  format: 'txt' as const,
                  label: `📄 ${t('export-text')}`,
                  id: 'export-txt',
                },
                {
                  format: 'md' as const,
                  label: `📝 ${t('export-markdown')}`,
                  id: 'export-md',
                },
                {
                  format: 'otr' as const,
                  label: `💾 ${t('export-otr')}`,
                  id: 'export-otr',
                },
              ].map(({ format, label, id }) => (
                <button
                  key={format}
                  role="menuitem"
                  id={id}
                  onClick={() => onExportFormat(format)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    background: 'none',
                    border: 'none',
                    textAlign: 'start',
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text)',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      'var(--color-surface-hover)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      'none';
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <Tooltip content={t('help')}>
          <button
            className="icon-btn"
            aria-label={t('help')}
            onClick={onOpenHelp}
            id="btn-help"
          >
            ?
          </button>
        </Tooltip>
        <Tooltip content={t('settings')}>
          <button
            className="icon-btn"
            aria-label={t('settings')}
            onClick={onOpenSettings}
            id="btn-settings"
          >
            ⚙
          </button>
        </Tooltip>
        <Tooltip content={t('title-home-new')}>
          <button
            className="icon-btn"
            aria-label={t('aria-home')}
            onClick={onGoHome}
            id="btn-home"
          >
            ⌂
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
