import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppView } from '../../App';
import { downloadAndCacheVimeo } from '../../modules/storage/vimeoCache';

export function validateVimeoUrl(
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

interface UseVimeoOptions {
  onNavigate: (view: AppView) => void;
  setLoadError: (err: string | null) => void;
  setLoading: (loading: boolean) => void;
  setModalMode: (mode: 'none' | 'youtube' | 'vimeo') => void;
  loadVimeoFile: (file: File, name: string) => Promise<void>;
  loading: boolean;
  t: (key: string) => string;
}

export function useVimeo({
  onNavigate,
  setLoadError,
  setLoading,
  setModalMode,
  loadVimeoFile,
  loading,
  t,
}: UseVimeoOptions) {
  const [vimeoProgress, setVimeoProgress] = useState<{
    loaded: number;
    total: number;
  } | null>(null);

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

  return { handleVimeoConfirm, handleCancelVimeo, vimeoProgress };
}
