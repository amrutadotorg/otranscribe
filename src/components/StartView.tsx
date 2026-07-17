/**
 * StartView.tsx — Landing screen with media source selection
 *
 * Uses UrlInputModal instead of native prompt() for YouTube and Vimeo URLs.
 */

import { useRef, useState, useEffect, useCallback } from 'react';
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
import { downloadAndCacheVimeo } from '../modules/storage/vimeoCache';
import { importOtrFile } from '../modules/file-io/importFile';
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

// ─── Validation helpers ────────────────────────────────────────────

function validateYouTubeUrl(
  url: string,
  t: (key: string) => string,
): string | null {
  const patterns = [
    /youtube\.com\/watch\?.*v=[\w-]+/,
    /youtu\.be\/[\w-]+/,
    /youtube\.com\/embed\/[\w-]+/,
    /youtube\.com\/shorts\/[\w-]+/,
  ];
  if (patterns.some((p) => p.test(url))) return null;
  return t('error-youtube-url');
}

function validateVimeoUrl(
  url: string,
  t: (key: string) => string,
): string | null {
  const patterns = [
    /vimeo\.com\/\d+/,
    /vimeo\.com\/\d+\/[\w]+/,
    /player\.vimeo\.com\/video\/\d+/,
  ];
  if (patterns.some((p) => p.test(url))) return null;
  return t('error-vimeo-url');
}

// ─── Component ────────────────────────────────────────────────────

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [vimeoProgress, setVimeoProgress] = useState<{
    loaded: number;
    total: number;
  } | null>(null);
  // Whether the autosave recovery banner is visible
  const [showRecoveryBanner, setShowRecoveryBanner] = useState<boolean>(
    () => typeof autosaveHtml === 'string' && autosaveHtml.trim().length > 0,
  );

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

  // AbortController for Vimeo cancellation (ESC key)
  const vimeoAbortRef = useRef<AbortController | null>(null);

  // ESC cancels active Vimeo download
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && loading && vimeoAbortRef.current) {
        vimeoAbortRef.current.abort();
      }
    },
    [loading],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ─── Handlers ───────────────────────────────────────────────────

  const handleMediaFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setLoadError(null);
    setLoading(true);
    // Navigate FIRST so #media-container is in DOM before driver appends video element
    onNavigate('transcribe');
    await new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r())),
    );
    try {
      await loadLocalFile(file);
    } catch (err) {
      setLoadError(t('error-media-load'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOtrFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setLoadError(null);
    setLoading(true);
    try {
      const doc = await importOtrFile(file, t);
      onOtrLoaded(doc); // sets pendingOtrDoc in App, then navigates to transcribe
    } catch (err) {
      setLoadError(t('error-otr-import'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleYouTubeConfirm = useCallback(
    async (url: string) => {
      setModalMode('none');
      setLoadError(null);
      setLoading(true);
      // Navigate first so TranscribeView (with #media-container) mounts before the driver
      onNavigate('transcribe');
      // Small tick to let React commit the new view to DOM
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );
      try {
        await loadYouTube(url);
      } catch (err) {
        setLoadError(t('error-youtube-load'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [loadYouTube, onNavigate, t],
  );

  // Auto-load YouTube URL passed via ?video_url= query parameter
  useEffect(() => {
    if (!pendingYouTubeUrl) return;
    // Consume the pending URL immediately to prevent double-trigger
    onYouTubePendingConsumed?.();
    // Remove the param from the browser URL to prevent re-load on refresh
    const cleanUrl =
      window.location.pathname +
      (window.location.hash ? window.location.hash : '');
    history.replaceState(null, '', cleanUrl);
    // Trigger the YouTube load flow
    handleYouTubeConfirm(pendingYouTubeUrl);
  }, [pendingYouTubeUrl, handleYouTubeConfirm, onYouTubePendingConsumed]);

  const handleVimeoConfirm = async (url: string) => {
    setModalMode('none');
    setLoadError(null);
    setLoading(true);
    setVimeoProgress(null);

    const abortController = new AbortController();
    vimeoAbortRef.current = abortController;

    try {
      // Step 1: Download with progress visible on StartView (ESC aborts)
      const { file, name } = await downloadAndCacheVimeo(
        url,
        (loaded, total) => {
          setVimeoProgress({ loaded, total });
        },
        abortController.signal,
        t,
      );

      // Step 2: Navigate so #media-container is in the DOM
      onNavigate('transcribe');
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );
      // Step 3: Load the cached file into the player
      await loadVimeoFile(file, name);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        setLoadError(null); // cancelled — silent
      } else {
        setLoadError(t('error-vimeo-load'));
        console.error(err);
      }
    } finally {
      vimeoAbortRef.current = null;
      setLoading(false);
      setVimeoProgress(null);
    }
  };

  const handleCancelVimeo = () => {
    vimeoAbortRef.current?.abort();
  };

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="start-view fade-in">
      <div
        style={{
          position: 'absolute',
          top: 'var(--space-4)',
          insetInlineEnd: 'var(--space-4)',
          display: 'flex',
          gap: 'var(--space-2)',
        }}
      >
        <Tooltip content={t('settings-language')}>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            style={{
              fontSize: 'var(--font-size-sm)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface-2)',
              color: 'var(--color-text)',
              cursor: 'pointer',
            }}
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
            style={{
              display: 'flex',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
            }}
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
                  style={{
                    background:
                      settings.theme === value
                        ? 'var(--color-accent)'
                        : 'var(--color-surface-2)',
                    color:
                      settings.theme === value
                        ? 'var(--color-on-accent)'
                        : 'var(--color-text)',
                    border: 'none',
                    borderInlineEnd:
                      value !== 'dark'
                        ? '1px solid var(--color-border)'
                        : 'none',
                    padding: '4px 9px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    lineHeight: 1,
                    transition: 'background 0.15s',
                  }}
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
            style={{
              background: 'var(--color-accent-subtle)',
              border: '1px solid var(--color-accent)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3) var(--space-4)',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                flex: 1,
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text)',
              }}
            >
              {t('autosave-recovery-message')}
            </span>
            <div
              style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}
            >
              <Tooltip content={t('autosave-restore')}>
                <button
                  id="btn-autosave-restore"
                  onClick={handleAutosaveRestore}
                  style={{
                    background: 'var(--color-accent)',
                    color: 'var(--color-on-accent)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px 14px',
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 600,
                    transition: 'opacity 0.15s',
                  }}
                >
                  {t('autosave-restore')}
                </button>
              </Tooltip>
              <Tooltip content={t('autosave-discard')}>
                <button
                  id="btn-autosave-discard"
                  onClick={handleAutosaveDiscard}
                  style={{
                    background: 'none',
                    color: 'var(--color-text-muted)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px 14px',
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-sm)',
                    transition: 'opacity 0.15s',
                  }}
                >
                  {t('autosave-discard')}
                </button>
              </Tooltip>
            </div>
          </div>
        )}

        {loadError && (
          <div
            style={{
              background: 'var(--color-danger-light)',
              border: '1px solid var(--color-danger)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3)',
              marginBottom: 'var(--space-3)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-danger)',
            }}
            role="alert"
            id="load-error-msg"
          >
            {loadError}
          </div>
        )}

        <div className="start-options">
          {/* Local file */}
          <button
            className="start-option-btn"
            onClick={() => {
              setLoadError(null);
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
              setLoadError(null);
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
              setLoadError(null);
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
              setLoadError(null);
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
          <div
            style={{
              textAlign: 'center',
              marginTop: 'var(--space-4)',
              color: 'var(--color-text-muted)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            {vimeoProgress ? (
              <div style={{ width: '100%' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  <span style={{ fontWeight: 500 }}>
                    {t('start-loading-vimeo')}&nbsp;
                    {vimeoProgress.total > 0
                      ? `${Math.round((vimeoProgress.loaded / vimeoProgress.total) * 100)}%`
                      : `${(vimeoProgress.loaded / 1_048_576).toFixed(1)} MB`}
                  </span>
                  <Tooltip content={t('title-cancel-download')}>
                    <button
                      onClick={handleCancelVimeo}
                      style={{
                        background: 'none',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '2px 8px',
                        cursor: 'pointer',
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-muted)',
                      }}
                      id="btn-cancel-vimeo"
                    >
                      {t('cancel-download')}
                    </button>
                  </Tooltip>
                </div>
                <div
                  style={{
                    height: '8px',
                    background: 'var(--color-border)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width:
                        vimeoProgress.total > 0
                          ? `${Math.round((vimeoProgress.loaded / vimeoProgress.total) * 100)}%`
                          : '100%',
                      background: 'var(--color-accent)',
                      borderRadius: '4px',
                      transition: 'width 0.2s ease',
                      animation:
                        vimeoProgress.total === 0
                          ? 'indeterminate-bar 1.5s ease-in-out infinite'
                          : 'none',
                    }}
                  />
                </div>
                <div
                  style={{
                    marginTop: 'var(--space-1)',
                    fontSize: 'var(--font-size-xs)',
                    opacity: 0.7,
                  }}
                >
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
