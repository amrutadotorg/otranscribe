/**
 * PlayerContext.test.tsx — Unit tests for PlayerContext
 */

import { describe, it, expect } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { PlayerProvider, usePlayer } from '../PlayerContext';

// Simple component to extract context value
function TestComponent({
  onMount,
}: {
  onMount: (ctx: ReturnType<typeof usePlayer>) => void;
}) {
  const ctx = usePlayer();
  onMount(ctx);
  return <div data-testid="test-comp">Ready</div>;
}

describe('PlayerContext', () => {
  it('provides default state and methods', async () => {
    let ctxValue: ReturnType<typeof usePlayer> | null = null;

    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container);
      root.render(
        <PlayerProvider>
          <TestComponent
            onMount={(ctx) => {
              ctxValue = ctx;
            }}
          />
        </PlayerProvider>,
      );
    });

    expect(ctxValue).not.toBeNull();
    expect(ctxValue?.playerState.isReady).toBe(false);
    expect(ctxValue?.playerState.isPlaying).toBe(false);
    expect(typeof ctxValue?.play).toBe('function');
    expect(typeof ctxValue?.loadLocalFile).toBe('function');

    document.body.removeChild(container);
  });
});
