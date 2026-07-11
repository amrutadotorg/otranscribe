/**
 * importFile.ts — File import handler for .otr files
 *
 * Returns parsed OtrDocument for the caller to feed into editor state.
 * No direct DOM access — caller handles UI updates.
 */

import { parseOtrFile } from './otrFormat';
import type { OtrDocument } from '../../types/otr';

/**
 * Read an .otr File object and parse it.
 * Resolves with OtrDocument on success, rejects with Error on failure.
 */
export function importOtrFile(file: File, t?: (key: string) => string): Promise<OtrDocument> {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith('.otr') && file.type !== 'application/json') {
      // Accept anyway — .otr is just JSON
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (typeof reader.result !== 'string') {
          reject(new Error(t ? t('error-read-file') : 'Could not read file.'));
          return;
        }
        const doc = parseOtrFile(reader.result, t);
        resolve(doc);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    reader.onerror = () => {
      reject(new Error(t ? t('error-file-read') : 'File read error.'));
    };
    reader.readAsText(file);
  });
}
