export interface KeyboardShortcuts {
  playPause: string[];
  backwards: string[];
  forwards: string[];
  returnToStart: string[];
  timeSelection: string[];
  speedDown: string[];
  speedUp: string[];
  saveBackup: string[];
}

export interface AppSettings {
  timestampMilliseconds: boolean;
  timestampOffset: string;
  backupIntervalMinutes: number;
  backupsPerFile: number;
  pauseOnTyping: boolean;
  theme: 'light' | 'dark' | 'system';
  keyboardShortcuts: {
    shortcuts: KeyboardShortcuts;
  };
}

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
    },
  },
};
