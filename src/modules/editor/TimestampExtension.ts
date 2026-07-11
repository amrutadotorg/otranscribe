/**
 * TimestampExtension.ts — TipTap extension for timestamp shortcuts
 *
 * Adds keyboard shortcuts Mod+J (timestamp) and Mod+Ctrl+J (timestamp with ms).
 * Integrates with PlayerContext to get current time.
 *
 * See PLAN.md Faza 4, Table A (addTimestamp / addTimestampMilliseconds)
 */

import { Extension } from '@tiptap/core';
import type { Player } from '../audio-engine/Player';

function formatTime(seconds: number, withMs = false): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  let result = `${mm}:${ss}`;
  if (withMs) {
    const ms = String(Math.floor((seconds % 1) * 1000)).padStart(3, '0');
    result = `${result}-${ms}`;
  }
  if (h > 0) result = `${h}:${result}`;
  return result;
}

interface TimestampExtensionOptions {
  getPlayer: () => Player | null;
  timestampOffset: number; // seconds
  useMilliseconds: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    timestampShortcut: {
      triggerTimestamp: (withMs?: boolean) => ReturnType;
    };
  }
}

export const TimestampExtension = Extension.create<TimestampExtensionOptions>({
  name: 'timestampShortcut',

  addOptions() {
    return {
      getPlayer: () => null,
      timestampOffset: 0,
      useMilliseconds: false,
    };
  },

  addCommands() {
    return {
      triggerTimestamp:
        (withMs = false) =>
        ({ commands }) => {
          const player = this.options.getPlayer();
          if (!player?.isReady()) return false;

          const rawTime = player.getTime();
          const displayTime = rawTime + this.options.timestampOffset;
          const useMsActual = withMs || this.options.useMilliseconds;
          const displayText = formatTime(displayTime, useMsActual);

          return commands.insertTimestamp(rawTime, displayText);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-j': () => this.editor.commands.triggerTimestamp(false),
      'Mod-Control-j': () => this.editor.commands.triggerTimestamp(true),
    };
  },
});

export { formatTime };
