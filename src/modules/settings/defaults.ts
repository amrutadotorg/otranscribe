/**
 * defaults.ts — Default settings values
 *
 * Matches original oTranscribe settings defaults exactly.
 * See PLAN.md section 1.2 Table G
 */

import type { AppSettings } from '../../types/settings';

export const DEFAULT_SETTINGS: AppSettings = {
  timestampMilliseconds: false,
  timestampOffset: '00:00',
  backupIntervalMinutes: 5,
  backupsPerFile: 10,
  pauseOnTyping: false,
  theme: 'system',
  keyboardShortcuts: {
    shortcuts: {
      playPause: ['escape'],
      backwards: ['f1', 'mod+1'],
      forwards: ['f2', 'mod+2'],
      returnToStart: ['mod+0'],
      timeSelection: ['mod+k'],
      speedDown: ['f3', 'mod+3'],
      speedUp: ['f4', 'mod+4'],
      saveBackup: ['mod+s'],
      insertTimestamp: ['mod+j'],
    },
  },
  phoneticInput: {
    enabled: false,
    lang: 'sa-t-i0-und',
  },
};
