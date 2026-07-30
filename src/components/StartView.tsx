/**
 * StartView.tsx — Landing screen with media source selection
 *
 * Uses UrlInputModal instead of native prompt() for YouTube and Vimeo URLs.
 */

import { useRef, useState } from 'react';
import type { AppView } from '../App';
import type { AppSettings } from '../types/settings';
import type { OtrDocument } from '../types/otr';
import {
  IconMusic,
  IconBrandYoutube,
  IconBrandVimeo,
  IconFileImport,
  IconLoader2,
  IconDeviceDesktop,
  IconSun,
  IconMoon,
} from '@tabler/icons-react';
import { usePlayer } from '../modules/audio-engine/PlayerContext';
import {
  useMediaLoader,
  validateYouTubeUrl,
} from './start-view/useMediaLoader';
import { validateVimeoUrl } from '../modules/vimeo/vimeoUrl';
import { clearAutosave } from '../modules/storage/autosave';
import UrlInputModal from './UrlInputModal';
import Tooltip from './Tooltip';
import { useTranslation } from '../modules/shell/i18n/I18nContext';

interface Props {
  settings: AppSettings;
  onNavigate: (view: AppView) => void;
  onOtrLoaded: (doc: OtrDocument) => void;
  /** HTML string from autosave slot, or null if none */
  autosaveHtml?: string | null;
  /** Called after user restores or discards autosave (so App clears its state) */
  onAutosaveDismissed?: () => void;
  /** YouTube URL passed via ?video_url= query param, or null if none */
  pendingYouTubeUrl?: string | null;
  /** Called after the pending YouTube URL has been consumed */
  onYouTubePendingConsumed?: () => void;
}

type ModalMode = 'none' | 'youtube' | 'vimeo';

export default function StartView({
  settings,
  onNavigate,
  onOtrLoaded,
  onUpdateSettings,
  autosaveHtml,
  onAutosaveDismissed,
  pendingYouTubeUrl,
  onYouTubePendingConsumed,
}: Props & { onUpdateSettings?: (updates: Partial<AppSettings>) => void }) {
  const { t, tHtml, lang, setLang, availableLanguages } = useTranslation();
  const mediaFileRef = useRef<HTMLInputElement>(null);
  const otrFileRef = useRef<HTMLInputElement>(null);
  const { loadLocalFile, loadYouTube, loadVimeoFile } = usePlayer();

  const [modalMode, setModalMode] = useState<ModalMode>('none');

  const [showRecoveryBanner, setShowRecoveryBanner] = useState<boolean>(
    () => typeof autosaveHtml === 'string' && autosaveHtml.trim().length > 0,
  );

  const {
    loading,
    error,
    vimeoProgress,
    loadLocal,
    loadYouTubeUrl,
    loadVimeoUrl,
    loadOtr,
    cancelVimeo,
  } = useMediaLoader({
    onNavigate,
    loadLocalFile,
    loadYouTube: (url: string) => loadYouTube(url),
    loadVimeoFile,
    onOtrLoaded,
    t,
    pendingYouTubeUrl,
    onYouTubePendingConsumed,
  });

  // ─── Autosave recovery handlers ─────────────────────────────────

  const handleAutosaveRestore = () => {
    if (!autosaveHtml) return;
    clearAutosave();
    setShowRecoveryBanner(false);
    onAutosaveDismissed?.();
    onOtrLoaded({
      html: autosaveHtml,
      mediaDetails: { name: '' },
      mediaTime: 0,
    });
  };

  const handleAutosaveDiscard = () => {
    clearAutosave();
    setShowRecoveryBanner(false);
    onAutosaveDismissed?.();
  };

  // ─── Media Handlers ─────────────────────────────────────────────

  const handleMediaFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await loadLocal(file);
  };

  const handleOtrFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await loadOtr(file);
  };

  const handleYouTubeConfirm = (url: string) => {
    setModalMode('none');
    loadYouTubeUrl(url);
  };

  const handleVimeoConfirm = (url: string) => {
    setModalMode('none');
    loadVimeoUrl(url);
  };

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="start-view fade-in">
      <div className="start-top-controls">
        <Tooltip content={t('settings-language')}>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="lang-select"
            aria-label={t('aria-select-language')}
          >
            {availableLanguages.map((l) => {
              let name = l;
              try {
                const code = l.replace('_', '-');
                name =
                  new Intl.DisplayNames([code], { type: 'language' }).of(
                    code,
                  ) || l;
                name = name.charAt(0).toUpperCase() + name.slice(1);
              } catch {
                /* ignore */
              }
              return (
                <option key={l} value={l}>
                  {name}
                </option>
              );
            })}
          </select>
        </Tooltip>
        {onUpdateSettings && (
          <div
            role="group"
            aria-label={t('aria-select-theme')}
            className="theme-group"
          >
            {(
              [
                {
                  value: 'system',
                  icon: <IconDeviceDesktop size={14} />,
                  key: 'theme-system',
                },
                {
                  value: 'light',
                  icon: <IconSun size={14} />,
                  key: 'theme-light',
                },
                {
                  value: 'dark',
                  icon: <IconMoon size={14} />,
                  key: 'theme-dark',
                },
              ] as const
            ).map(({ value, icon, key }) => (
              <Tooltip key={value} content={t(key)}>
                <button
                  onClick={() => onUpdateSettings({ theme: value })}
                  aria-pressed={settings.theme === value}
                  className="theme-btn"
                >
                  {icon}
                </button>
              </Tooltip>
            ))}
          </div>
        )}
      </div>
      {/* Hidden file inputs */}
      <input
        ref={mediaFileRef}
        type="file"
        accept="audio/*,video/*"
        style={{ display: 'none' }}
        onChange={handleMediaFileChange}
        id="media-file-input"
      />
      <input
        ref={otrFileRef}
        type="file"
        accept=".otr"
        style={{ display: 'none' }}
        onChange={handleOtrFileChange}
        id="otr-file-input"
      />

      <div className="start-card">
        <h1>Transcribe for Amruta.org</h1>
        <p dangerouslySetInnerHTML={{ __html: tHtml('start-description')! }} />

        {/* Autosave recovery banner */}
        {showRecoveryBanner && (
          <div
            role="alert"
            id="autosave-recovery-banner"
            className="autosave-banner"
          >
            <span className="autosave-banner-text">
              {t('autosave-recovery-message')}
            </span>
            <div className="autosave-actions">
              <Tooltip content={t('autosave-restore')}>
                <button
                  id="btn-autosave-restore"
                  onClick={handleAutosaveRestore}
                  className="btn-restore"
                >
                  {t('autosave-restore')}
                </button>
              </Tooltip>
              <Tooltip content={t('autosave-discard')}>
                <button
                  id="btn-autosave-discard"
                  onClick={handleAutosaveDiscard}
                  className="btn-discard"
                >
                  {t('autosave-discard')}
                </button>
              </Tooltip>
            </div>
          </div>
        )}

        {error && (
          <div className="load-error-msg" role="alert" id="load-error-msg">
            {error}
          </div>
        )}

        <div className="start-options">
          {/* Local file */}
          <button
            className="start-option-btn"
            onClick={() => {
              mediaFileRef.current?.click();
            }}
            id="load-local-file-btn"
            disabled={loading}
          >
            <span className="option-icon">
              <IconMusic size={24} />
            </span>
            <span className="option-text">
              <span className="option-title">{t('choose-file')}</span>
              <span className="option-desc">{t('choose-file-desc')}</span>
            </span>
          </button>

          {/* YouTube */}
          <button
            className="start-option-btn"
            onClick={() => {
              setModalMode('youtube');
            }}
            id="load-youtube-btn"
            disabled={loading}
          >
            <span className="option-icon">
              <IconBrandYoutube size={24} />
            </span>
            <span className="option-text">
              <span className="option-title">{t('choose-youtube')}</span>
              <span className="option-desc">{t('choose-youtube-desc')}</span>
            </span>
          </button>

          {/* Vimeo */}
          <button
            className="start-option-btn"
            onClick={() => {
              setModalMode('vimeo');
            }}
            id="load-vimeo-btn"
            disabled={loading}
          >
            <span className="option-icon">
              <IconBrandVimeo size={24} />
            </span>
            <span className="option-text">
              <span className="option-title">{t('choose-vimeo')}</span>
              <span className="option-desc">{t('choose-vimeo-desc')}</span>
            </span>
          </button>

          {/* Import .otr */}
          <button
            className="start-option-btn"
            onClick={() => {
              otrFileRef.current?.click();
            }}
            id="import-otr-btn"
            disabled={loading}
          >
            <span className="option-icon">
              <IconFileImport size={24} />
            </span>
            <span className="option-text">
              <span className="option-title">{t('import-button')} .otr</span>
              <span className="option-desc">{t('import-otr-desc')}</span>
            </span>
          </button>
        </div>

        {loading && (
          <div className="loading-container">
            {vimeoProgress ? (
              <div className="vimeo-progress-wrapper">
                <div className="vimeo-progress-header">
                  <span className="vimeo-progress-title">
                    {t('start-loading-vimeo')}&nbsp;
                    {vimeoProgress.total > 0
                      ? `${Math.round((vimeoProgress.loaded / vimeoProgress.total) * 100)}%`
                      : `${(vimeoProgress.loaded / 1_048_576).toFixed(1)} MB`}
                  </span>
                  <Tooltip content={t('title-cancel-download')}>
                    <button
                      onClick={cancelVimeo}
                      className="vimeo-cancel-btn"
                      id="btn-cancel-vimeo"
                    >
                      {t('cancel-download')}
                    </button>
                  </Tooltip>
                </div>
                <div className="progress-track">
                  <div
                    className={`progress-fill ${vimeoProgress.total === 0 ? 'indeterminate' : ''}`}
                    style={{
                      width:
                        vimeoProgress.total > 0
                          ? `${Math.round((vimeoProgress.loaded / vimeoProgress.total) * 100)}%`
                          : '100%',
                    }}
                  />
                </div>
                <div className="vimeo-progress-hint">
                  {t('start-press-esc')}
                </div>
              </div>
            ) : (
              <>
                <span
                  style={{
                    display: 'inline-block',
                    marginInlineEnd: 'var(--space-2)',
                  }}
                  className="spin"
                >
                  <IconLoader2 size={18} />
                </span>
                {t('start-loading')}
              </>
            )}
          </div>
        )}
      </div>

      {/* YouTube URL modal */}
      <UrlInputModal
        open={modalMode === 'youtube'}
        title={t('url-youtube-title')}
        placeholder={t('url-youtube-placeholder')}
        description={t('url-youtube-desc')}
        validate={(url) => validateYouTubeUrl(url, t)}
        onConfirm={handleYouTubeConfirm}
        onCancel={() => setModalMode('none')}
      />

      {/* Vimeo URL modal */}
      <UrlInputModal
        open={modalMode === 'vimeo'}
        title={t('url-vimeo-title')}
        placeholder={t('url-vimeo-placeholder')}
        description={t('url-vimeo-desc')}
        validate={(url) => validateVimeoUrl(url, t)}
        onConfirm={handleVimeoConfirm}
        onCancel={() => setModalMode('none')}
      />
    </div>
  );
}
