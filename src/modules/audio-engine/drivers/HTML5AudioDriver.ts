/**
 * HTML5AudioDriver.ts — Driver for local audio files
 *
 * Injects an <audio> element into body, manages playback.
 */

import type { PlayerDriver } from '../../../types/player';

export class HTML5AudioDriver implements PlayerDriver {
  protected element: HTMLAudioElement | HTMLVideoElement;
  protected _destroyed = false;
  protected _status: 'playing' | 'paused' | 'inactive' = 'paused';

  constructor(source: string, onPlayPause?: (status: string) => void) {
    this.element = document.createElement('audio');
    this.element.src = source;
    this.element.style.display = 'none';
    document.body.appendChild(this.element);

    if (onPlayPause) {
      this.element.addEventListener('play', () => {
        this._status = 'playing';
        onPlayPause(this._status);
      });
      this.element.addEventListener('pause', () => {
        this._status = 'paused';
        onPlayPause(this._status);
      });
    }
  }

  play(): void {
    this._status = 'playing';
    void this.element.play();
  }

  pause(): void {
    this._status = 'paused';
    this.element.pause();
  }

  getTime(): number {
    return this.element.currentTime;
  }

  setTime(seconds: number): void {
    this.element.currentTime = Math.max(0, seconds);
  }

  getStatus(): 'playing' | 'paused' | 'inactive' {
    return this._destroyed ? 'inactive' : this._status;
  }

  getLength(): number {
    return this.element.duration || 0;
  }

  isReady(): boolean {
    return (
      !this._destroyed &&
      !isNaN(this.element.duration) &&
      this.element.readyState === 4
    );
  }

  getSpeed(): number {
    return this.element.playbackRate;
  }

  setSpeed(speed: number): void {
    this.element.playbackRate = speed;
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.element.pause();
    this.element.remove();
  }
}
