/**
 * Player.test.ts — Unit tests for Player core
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Player } from '../Player';
import { HTML5AudioDriver } from '../drivers/HTML5AudioDriver';

vi.mock('../drivers/HTML5AudioDriver', () => {
  return {
    HTML5AudioDriver: vi.fn().mockImplementation(function (this: unknown) {
      return {
        play: vi.fn(),
        pause: vi.fn(),
        getTime: vi.fn().mockReturnValue(10),
        setTime: vi.fn(),
        getStatus: vi.fn().mockReturnValue('paused'),
        getLength: vi.fn().mockReturnValue(100),
        isReady: vi.fn().mockReturnValue(true),
        getSpeed: vi.fn().mockReturnValue(1),
        setSpeed: vi.fn(),
        getName: vi.fn().mockReturnValue('MockDriver'),
        destroy: vi.fn(),
      };
    }),
  };
});

describe('Player', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('instantiates and reports ready', () => {
    const onReady = vi.fn();
    const player = new Player({
      driver: 'HTML5_AUDIO',
      source: 'test.mp3',
      name: 'Test',
      onReady,
    });

    // onReady is called after checking isReady in a timeout loop
    vi.runOnlyPendingTimers();
    expect(onReady).toHaveBeenCalledWith(player);
  });

  it('play() auto-rewinds 1.5s', () => {
    const player = new Player({ driver: 'HTML5_AUDIO', source: 'test.mp3' });
    const driverInstance = vi.mocked(HTML5AudioDriver).mock.results[0].value;

    player.play();

    // getTime returns 10, so it should seek to 10 - 1.5 = 8.5
    expect(driverInstance.setTime).toHaveBeenCalledWith(8.5);
    expect(driverInstance.play).toHaveBeenCalled();
  });

  it('skip() jumps by 1.5s', () => {
    const player = new Player({ driver: 'HTML5_AUDIO', source: 'test.mp3' });
    const driverInstance = vi.mocked(HTML5AudioDriver).mock.results[0].value;

    player.skip('forwards');
    expect(driverInstance.setTime).toHaveBeenCalledWith(11.5);

    player.skip('backwards');
    expect(driverInstance.setTime).toHaveBeenCalledWith(8.5);
  });

  it('speed changes are bounded', () => {
    const player = new Player({ driver: 'HTML5_AUDIO', source: 'test.mp3' });
    const driverInstance = vi.mocked(HTML5AudioDriver).mock.results[0].value;

    player.speedUp();
    expect(driverInstance.setSpeed).toHaveBeenCalledWith(1.125); // 1 + 0.125

    expect(() => player.setSpeed(3)).toThrow(); // MAX_SPEED is 2
    expect(() => player.setSpeed(0.1)).toThrow(); // MIN_SPEED is 0.5
  });

  it('destroys safely', () => {
    const player = new Player({ driver: 'HTML5_AUDIO', source: 'test.mp3' });
    const driverInstance = vi.mocked(HTML5AudioDriver).mock.results[0].value;

    player.destroy();
    expect(driverInstance.pause).toHaveBeenCalled();
    expect(driverInstance.destroy).toHaveBeenCalled();

    // Subsquent calls to play/pause should not throw
    expect(() => player.play()).not.toThrow();
  });
});
