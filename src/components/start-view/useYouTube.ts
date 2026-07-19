import { useCallback, useEffect } from 'react';
import type { AppView } from '../../App';

export function validateYouTubeUrl(
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

interface UseYouTubeOptions {
  onNavigate: (view: AppView) => void;
  setLoadError: (err: string | null) => void;
  setLoading: (loading: boolean) => void;
  setModalMode: (mode: 'none' | 'youtube' | 'vimeo') => void;
  loadYouTube: (url: string) => Promise<void>;
  t: (key: string) => string;
  pendingYouTubeUrl?: string | null;
  onYouTubePendingConsumed?: () => void;
}

export function useYouTube({
  onNavigate,
  setLoadError,
  setLoading,
  setModalMode,
  loadYouTube,
  t,
  pendingYouTubeUrl,
  onYouTubePendingConsumed,
}: UseYouTubeOptions) {
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
    [loadYouTube, onNavigate, setModalMode, setLoadError, setLoading, t],
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
    window.history.replaceState(null, '', cleanUrl);
    // Trigger the YouTube load flow
    handleYouTubeConfirm(pendingYouTubeUrl);
  }, [pendingYouTubeUrl, handleYouTubeConfirm, onYouTubePendingConsumed]);

  return { handleYouTubeConfirm };
}
