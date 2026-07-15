/**
 * TimestampNode.ts — Custom TipTap inline atom node for timestamps
 *
 * Renders as: <span class="timestamp" data-timestamp="{seconds}" contenteditable="false">
 * Clicking the node seeks the player to that position.
 *
 * See PLAN.md section 2.4, 4 (kluczowa decyzja)
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import TimestampNodeView from './TimestampNodeView';
import { formatTime } from './TimestampExtension';

interface TimestampOptions {
  /** Called when a timestamp is clicked */
  onTimestampClick?: (seconds: number) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    timestamp: {
      /** Insert a timestamp at current cursor position */
      insertTimestamp: (seconds: number, displayText: string) => ReturnType;
    };
  }
}

export const TimestampNode = Node.create<TimestampOptions>({
  name: 'timestamp',

  group: 'inline',
  inline: true,
  atom: true, // Non-editable atom — matches original contenteditable="false"
  selectable: false,

  addOptions() {
    return {
      onTimestampClick: undefined,
    };
  },

  addAttributes() {
    return {
      seconds: {
        default: 0,
        parseHTML: (el) => {
          const raw = el.getAttribute('data-timestamp') ?? '0';
          // Backwards compat: "MM:SS" strings → seconds number
          if (raw.includes(':')) {
            const parts = raw.split(':').map(Number);
            return parts.length === 3
              ? parts[0] * 3600 + parts[1] * 60 + parts[2]
              : parts[0] * 60 + parts[1];
          }
          return parseFloat(raw);
        },
        renderHTML: (attrs) => ({
          'data-timestamp': String(attrs.seconds),
        }),
      },
      displayText: {
        default: '0:00',
        parseHTML: (el) => {
          const text = el.textContent;
          if (text && text.trim()) return text.trim();
          // Original .otr files have empty spans — derive display from data-timestamp
          const raw = el.getAttribute('data-timestamp') ?? '0';
          let secs: number;
          if (raw.includes(':')) {
            const parts = raw.split(':').map(Number);
            secs =
              parts.length === 3
                ? parts[0] * 3600 + parts[1] * 60 + parts[2]
                : parts[0] * 60 + parts[1];
          } else {
            secs = parseFloat(raw);
          }
          return formatTime(secs, false);
        },
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span.timestamp',
        priority: 51,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'timestamp',
        contenteditable: 'false',
      }),
      HTMLAttributes.displayText ?? '',
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TimestampNodeView);
  },

  addCommands() {
    return {
      insertTimestamp:
        (seconds: number, displayText: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: 'timestamp',
            attrs: { seconds, displayText },
          });
        },
    };
  },
});
