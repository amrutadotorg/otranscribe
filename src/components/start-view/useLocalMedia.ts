import type { AppView } from '../../App';

interface UseLocalMediaOptions {
  onNavigate: (view: AppView) => void;
  setLoadError: (err: string | null) => void;
  setLoading: (loading: boolean) => void;
  loadLocalFile: (file: File) => Promise<void>;
  t: (key: string) => string;
}

export function useLocalMedia({
  onNavigate,
  setLoadError,
  setLoading,
  loadLocalFile,
  t,
}: UseLocalMediaOptions) {
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

  return { handleMediaFileChange };
}
