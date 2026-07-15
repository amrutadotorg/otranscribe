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

