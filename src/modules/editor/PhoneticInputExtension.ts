/**
 * PhoneticInputExtension.ts — TipTap extension that intercepts the
 * Space key, takes the Latin word immediately before the cursor, and
 * replaces it with the top transliteration candidate in the background.
 * Mirrors the "commit on space" behavior of the Google Input Tools extension.
 *
 * Uses a getter pattern for config so the extension always reads the
 * latest settings without needing editor re-creation.
 *
 * CONCURRENCY: multiple words can be "in flight" at once when typing
 * fast (e.g. dictating a mantra). Each pending replacement tracks its
 * own ProseMirror Mapping, updated on every transaction, so an earlier
 * word resolving AFTER a later one (or vice versa) still lands at the
 * correct — remapped — position instead of a stale integer offset.
 */

import { Extension } from '@tiptap/core';
import { Mapping } from '@tiptap/pm/transform';
import { transliterate, type TransliterationLang } from './transliteration';

const LATIN_WORD_PATTERN = /[A-Za-z]+$/;
// Keep in sync with MAX_TEXT_LENGTH in src/server/transliterateProxy.ts —
// otherwise long compound words get silently truncated before the API call.
const WORD_LOOKBACK = 64;

interface PhoneticInputConfig {
  enabled: boolean;
  lang: TransliterationLang;
}

export interface PhoneticInputOptions {
  /** Getter that returns current settings — avoids editor re-creation on config change. */
  getConfig: () => PhoneticInputConfig;
}

interface PendingReplacement {
  mapping: Mapping;
}

export const PhoneticInputExtension = Extension.create<PhoneticInputOptions>({
  name: 'phoneticInput',

  addOptions() {
    return {
      getConfig: () => ({
        enabled: false,
        lang: 'sa-t-i0-und' as TransliterationLang,
      }),
    };
  },

  addStorage() {
    return {
      pending: [] as PendingReplacement[],
      txHandler: null as ((...args: unknown[]) => void) | null,
    };
  },

  onCreate() {
    const handler = ({
      transaction,
    }: {
      transaction: { docChanged: boolean; mapping: Mapping };
    }) => {
      if (!transaction.docChanged) return;
      const pending = this.storage.pending as PendingReplacement[];
      for (const p of pending) {
        p.mapping.appendMapping(transaction.mapping);
      }
    };
    this.storage.txHandler = handler;
    this.editor.on('transaction', handler);
  },

  onDestroy() {
    if (this.storage.txHandler) {
      this.editor.off(
        'transaction',
        this.storage.txHandler as Parameters<typeof this.editor.off>[1],
      );
    }
  },

  addKeyboardShortcuts() {
    return {
      Space: () => {
        const config = this.options.getConfig();
        if (!config.enabled) return false;

        const { state } = this.editor;
        const { from } = state.selection;

        // If user has a non-empty selection, let TipTap handle it normally.
        // Replacing a selection with transliteration is confusing UX.
        if (!state.selection.empty) return false;

        const textBefore = state.doc.textBetween(
          Math.max(0, from - WORD_LOOKBACK),
          from,
          '\n',
        );
        const match = textBefore.match(LATIN_WORD_PATTERN);

        if (!match) return false; // no Latin word — let TipTap insert space normally

        const word = match[0];
        const wordStart = from - word.length;
        const wordEnd = from;

        // Register this replacement as pending BEFORE the async call so
        // the transaction handler above starts tracking drift immediately.
        const pending: PendingReplacement = { mapping: new Mapping() };
        const pendingList = this.storage.pending as PendingReplacement[];
        pendingList.push(pending);

        const removeFromPending = () => {
          const idx = pendingList.indexOf(pending);
          if (idx !== -1) pendingList.splice(idx, 1);
        };

        void transliterate(word, config.lang).then((candidates) => {
          if (candidates.length === 0) {
            removeFromPending();
            return;
          }
          const replacement = candidates[0];

          // Remap the ORIGINAL [wordStart, wordEnd) range through every
          // transaction that happened while we were waiting for the API —
          // including replacements of other pending words.
          //
          // IMPORTANT: both biases are -1. assoc=-1 for wordEnd ensures
          // the range boundary stays BEFORE any insertion at that exact
          // position (e.g. the space TipTap inserts). Without this,
          // mappedTo would land after the space, making currentText include
          // it and the equality check would always fail silently.
          const mappedFrom = pending.mapping.map(wordStart, -1);
          const mappedTo = pending.mapping.map(wordEnd, -1);

          removeFromPending();

          // Guard: editor may have been destroyed while we waited
          if (this.editor.isDestroyed) return;
          if (mappedFrom >= mappedTo) return; // range collapsed (e.g. user deleted it)

          const currentText = this.editor.state.doc.textBetween(
            mappedFrom,
            mappedTo,
            '\n',
          );

          if (currentText === word) {
            this.editor
              .chain()
              .insertContentAt({ from: mappedFrom, to: mappedTo }, replacement)
              .run();
          }
        });

        // Return false: let TipTap insert the space immediately.
        // No lag, no swallowed keypress.
        return false;
      },
    };
  },
});
