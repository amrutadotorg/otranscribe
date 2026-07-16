/**
 * Player.ts — Core player class
 *
 * Abstracts over PlayerDriver implementations. Handles:
 * - skip backwards/forwards (1.5s, with compensate-setTime bug fix)
 * - speed control (0.5–2, step 0.125)
 * - play() auto-rewinds 1.5s (original UX behavior)
 * - callbacks for state changes
 */

import type { PlayerDriver, PlayerDriverType } from '../../types/player';
import { HTML5AudioDriver } from './drivers/HTML5AudioDriver';
import { HTML5VideoDriver } from './drivers/HTML5VideoDriver';
import { YouTubeDriver } from './drivers/YouTubeDriver';

const SKIP_TIME = 1.5; // seconds per skip
const SPEED_STEP = 0.125; // playback rate increment
const MIN_SPEED = 0.5;
const MAX_SPEED = 2.0;
const READY_CHECK_INTERVAL = 10; // ms
const READY_TIMEOUT_ATTEMPTS = 20000;

export interface PlayerOptions {
  driver: PlayerDriverType;
  source: string;
  name?: string;
  onReady?: (player: Player) => void;
  onPlayPause?: (status: 'playing' | 'paused' | 'inactive') => void;
  onSpeedChange?: (speed: number) => void;
  onTimeUpdate?: (time: number) => void;
}

export class Player {
  private _driver: PlayerDriver | null;
  private _destroyed = false;
  private _name: string;
  private _onPlayPauseCallback?: (
    status: 'playing' | 'paused' | 'inactive',
  ) => void;
  private _onSpeedChangeCallback?: (speed: number) => void;
  private _onTimeUpdateCallback?: (time: number) => void;
  private _timeUpdateInterval: ReturnType<typeof setInterval> | null = null;

  constructor(opts: PlayerOptions) {
    this._name = opts.name ?? '';
    this._onPlayPauseCallback = opts.onPlayPause;
    this._onSpeedChangeCallback = opts.onSpeedChange;
    this._onTimeUpdateCallback = opts.onTimeUpdate;

    const DriverClass = this._resolveDriver(opts.driver);
    this._driver = new DriverClass(opts.source, (status) => {
      this._onPlayPauseCallback?.(status as 'playing' | 'paused' | 'inactive');
    });

    if (opts.onReady) {
      this._waitForReady(opts.onReady);
    }

    // Time update polling
    this._timeUpdateInterval = setInterval(() => {
      if (!this._destroyed && this._driver?.isReady()) {
        this._onTimeUpdateCallback?.(this._driver.getTime());
      }
    }, 100);
  }

  private _resolveDriver(
    type: PlayerDriverType,
  ): new (source: string, cb?: (s: string) => void) => PlayerDriver {
    switch (type) {
      case 'HTML5_AUDIO':
        return HTML5AudioDriver;
      case 'HTML5_VIDEO':
        return HTML5VideoDriver;
      case 'YOUTUBE':
        return YouTubeDriver as unknown as new (
          source: string,
          cb?: (s: string) => void,
        ) => PlayerDriver;
    }
  }

  private _waitForReady(cb: (player: Player) => void): void {
    let attempts = 0;
    const check = () => {
      if (this._destroyed) return;
      if (this._driver?.isReady()) {
        cb(this);
      } else if (attempts < READY_TIMEOUT_ATTEMPTS) {
        attempts++;
        setTimeout(check, READY_CHECK_INTERVAL);
      } else {
        console.error('[Player] Driver ready timeout');
      }
    };
    check();
  }

  /** Play — rewinds 1.5s first (intentional UX from original) */
  play(): void {
    if (!this._hasDriver()) return;
    this._driver!.setTime(Math.max(0, this._driver!.getTime() - SKIP_TIME));
    this._driver!.play();
  }

  pause(): void {
    if (!this._hasDriver()) return;
    this._driver!.pause();
  }

  togglePlayPause(): void {
    if (this.getStatus() === 'playing') {
      this.pause();
    } else {
      this.play();
    }
  }

  getTime(): number {
    return this._hasDriver() && this._driver!.isReady()
      ? this._driver!.getTime()
      : 0;
  }

  setTime(seconds: number): void {
    if (!this._hasDriver()) return;
    this._driver!.setTime(Math.max(0, seconds));
  }

  skip(direction: 'forwards' | 'backwards'): void {
    const current = this.getTime();
    const next =
      direction === 'forwards' ? current + SKIP_TIME : current - SKIP_TIME;
    this.setTime(next);

    // Compensate for setTime bug on some video elements
    if (next > 1 && this.getTime() === 0) {
      console.debug('[Player] setTime compensating for browser bug');
      setTimeout(() => this.setTime(next), 50);
    }
  }

  getStatus(): 'playing' | 'paused' | 'inactive' {
    return this._hasDriver() && this._driver!.isReady()
      ? this._driver!.getStatus()
      : 'inactive';
  }

  getLength(): number {
    return this._hasDriver() && this._driver!.isReady()
      ? this._driver!.getLength()
      : 0;
  }

  getSpeed(): number {
    return this._hasDriver() ? this._driver!.getSpeed() : 1;
  }

  setSpeed(speed: number): void {
    if (!this._hasDriver()) return;
    if (speed < MIN_SPEED || speed > MAX_SPEED) {
      throw new Error(
        `Speed ${speed} is outside range [${MIN_SPEED}, ${MAX_SPEED}]`,
      );
    }
    this._driver!.setSpeed(speed);
    this._onSpeedChangeCallback?.(speed);
  }

  speedUp(): void {
    try {
      this.setSpeed(Math.min(MAX_SPEED, this.getSpeed() + SPEED_STEP));
    } catch {
      /* at max */
    }
  }

  speedDown(): void {
    try {
      this.setSpeed(Math.max(MIN_SPEED, this.getSpeed() - SPEED_STEP));
    } catch {
      /* at min */
    }
  }

  getName(): string {
    if (this._hasDriver() && typeof this._driver!.getName === 'function') {
      return this._driver!.getName!() ?? this._name;
    }
    return this._name;
  }

  isReady(): boolean {
    return this._hasDriver() && this._driver!.isReady();
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    if (this._timeUpdateInterval) {
      clearInterval(this._timeUpdateInterval);
      this._timeUpdateInterval = null;
    }
    if (this._driver) {
      this._driver.pause();
      this._driver.destroy();
      this._driver = null;
    }
  }

  private _hasDriver(): boolean {
    return !this._destroyed && this._driver !== null;
  }
}

// ─── Global player singleton ───────────────────────────────────────────────
// Mirrors original pattern for cross-module access

let _globalPlayer: Player | null = null;

export function getPlayer(): Player | null {
  return _globalPlayer;
}

export function createPlayer(opts: PlayerOptions): Promise<Player> {
  return new Promise((resolve) => {
    // Destroy existing player
    if (_globalPlayer) {
      _globalPlayer.destroy();
    }
    opts.onReady = (player) => {
      _globalPlayer = player;
      resolve(player);
    };
    _globalPlayer = new Player(opts);
  });
}

/** Determine if a file is video based on MIME type or extension */
export function isVideoFormat(file: File | string): boolean {
  if (typeof file === 'object' && 'type' in file) {
    return file.type.includes('video');
  }
  const ext = (file as string).split('.').pop()?.toLowerCase() ?? '';
  return ['mov', 'mp4', 'avi', 'webm', 'mkv'].includes(ext);
}
