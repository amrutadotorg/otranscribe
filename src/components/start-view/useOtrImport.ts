import { importOtrFile } from '../../modules/file-io/importFile';
import type { OtrDocument } from '../../types/otr';

interface UseOtrImportOptions {
  onOtrLoaded: (doc: OtrDocument) => void;
  setLoadError: (err: string | null) => void;
  setLoading: (loading: boolean) => void;
  t: (key: string) => string;
}

export function useOtrImport({
  onOtrLoaded,
  setLoadError,
  setLoading,
  t,
}: UseOtrImportOptions) {
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

  return { handleOtrFileChange };
}
