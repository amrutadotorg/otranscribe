/**
 * useMediaLoader.ts — Unified media loading hook for StartView
 *
 * Owns loading state, error state, and Vimeo download progress.
 * Replaces four separate hooks (useLocalMedia, useYouTube, useVimeo, useOtrImport)
 * that duplicated the same navigate-and-wait choreography and shared UI state.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppView } from '../../App';
import type { OtrDocument } from '../../types/otr';
import { importOtrFile } from '../../modules/file-io/importFile';
import { downloadAndCacheVimeo } from '../../modules/storage/vimeoCache';

// ── URL validator (pure function, exported for UrlInputModal) ──────

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

// ── Types ───────────────────────────────────────────────────────────

interface VimeoProgress {
  loaded: number;
  total: number;
}

interface UseMediaLoaderOptions {
  onNavigate: (view: AppView) => void;
  loadLocalFile: (file: File) => Promise<void>;
  loadYouTube: (url: string) => Promise<void>;
  loadVimeoFile: (file: File, name: string) => Promise<void>;
  onOtrLoaded: (doc: OtrDocument) => void;
  t: (key: string) => string;
  pendingYouTubeUrl?: string | null;
  onYouTubePendingConsumed?: () => void;
}

interface UseMediaLoaderReturn {
  loading: boolean;
  error: string | null;
  vimeoProgress: VimeoProgress | null;
  loadLocal(file: File): Promise<void>;
  loadYouTubeUrl(url: string): Promise<void>;
  loadVimeoUrl(url: string): Promise<void>;
  loadOtr(file: File): Promise<void>;
  cancelVimeo(): void;
}

// ── Hook ────────────────────────────────────────────────────────────

export function useMediaLoader({
  onNavigate,
  loadLocalFile,
  loadYouTube,
  loadVimeoFile,
  onOtrLoaded,
  t,
  pendingYouTubeUrl,
  onYouTubePendingConsumed,
}: UseMediaLoaderOptions): UseMediaLoaderReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vimeoProgress, setVimeoProgress] = useState<VimeoProgress | null>(
    null,
  );

  const vimeoAbortRef = useRef<AbortController | null>(null);

  // Navigate to transcribe view and wait two animation frames so
  // #media-container is in the DOM before the player driver appends elements.
  const navigateAndWait = useCallback(async () => {
    onNavigate('transcribe');
    await new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r())),
    );
  }, [onNavigate]);

  // ── loadLocal ──────────────────────────────────────────────────────

  const loadLocal = useCallback(
    async (file: File) => {
      setError(null);
      setLoading(true);
      try {
        await navigateAndWait();
        await loadLocalFile(file);
      } catch (err) {
        setError(t('error-media-load'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [navigateAndWait, loadLocalFile, t],
  );

  // ── loadYouTubeUrl ─────────────────────────────────────────────────

  const loadYouTubeUrl = useCallback(
    async (url: string) => {
      setError(null);
      setLoading(true);
      try {
        await navigateAndWait();
        await loadYouTube(url);
      } catch (err) {
        setError(t('error-youtube-load'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [navigateAndWait, loadYouTube, t],
  );

  // ── loadVimeoUrl ───────────────────────────────────────────────────

  const loadVimeoUrl = useCallback(
    async (url: string) => {
      setError(null);
      setLoading(true);
      setVimeoProgress(null);

      const abortController = new AbortController();
      vimeoAbortRef.current = abortController;

      try {
        // Step 1: Download with progress visible on StartView (ESC aborts)
        const { file, name } = await downloadAndCacheVimeo(
          url,
          (loaded, total) => setVimeoProgress({ loaded, total }),
          abortController.signal,
          t,
        );
        // Step 2: Navigate so #media-container is in the DOM
        await navigateAndWait();
        // Step 3: Load the cached file into the player
        await loadVimeoFile(file, name);
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
          setError(null); // cancelled — silent
        } else {
          setError(t('error-vimeo-load'));
          console.error(err);
        }
      } finally {
        vimeoAbortRef.current = null;
        setLoading(false);
        setVimeoProgress(null);
      }
    },
    [navigateAndWait, loadVimeoFile, t],
  );

  // ── loadOtr ────────────────────────────────────────────────────────

  const loadOtr = useCallback(
    async (file: File) => {
      setError(null);
      setLoading(true);
      try {
        const doc = await importOtrFile(file, t);
        onOtrLoaded(doc); // App.tsx handles navigation via onOtrLoaded → setPendingOtrDoc + navigate
      } catch (err) {
        setError(t('error-otr-import'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [onOtrLoaded, t],
  );

  // ── cancelVimeo ────────────────────────────────────────────────────

  const cancelVimeo = useCallback(() => {
    vimeoAbortRef.current?.abort();
  }, []);

  // ── ESC key cancels active Vimeo download ──────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && loading && vimeoAbortRef.current) {
        vimeoAbortRef.current.abort();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading]);

  // ── Auto-load YouTube URL from ?video_url= query param ─────────────

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
    loadYouTubeUrl(pendingYouTubeUrl);
  }, [pendingYouTubeUrl, loadYouTubeUrl, onYouTubePendingConsumed]);

  // ── Return ─────────────────────────────────────────────────────────

  return {
    loading,
    error,
    vimeoProgress,
    loadLocal,
    loadYouTubeUrl,
    loadVimeoUrl,
    loadOtr,
    cancelVimeo,
  };
}
