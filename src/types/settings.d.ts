interface KeyboardShortcuts {
  playPause: string[];
  backwards: string[];
  forwards: string[];
  returnToStart: string[];
  timeSelection: string[];
  speedDown: string[];
  speedUp: string[];
  saveBackup: string[];
  insertTimestamp: string[];
}

// Note: .d.ts files are ambient declarations — cannot use `import` statements.
// Use `import()` type syntax to reference TransliterationLang from the module.
interface PhoneticInputSettings {
  enabled: boolean;
  lang: import('../modules/editor/transliteration').TransliterationLang;
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
  phoneticInput: PhoneticInputSettings;
}

