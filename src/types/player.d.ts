/** Player driver abstraction - must be implemented by each driver */
export interface PlayerDriver {
  play(): void;
  pause(): void;
  getTime(): number;
  setTime(seconds: number): void;
  getStatus(): 'playing' | 'paused' | 'inactive';
  getLength(): number;
  isReady(): boolean;
  getSpeed(): number;
  setSpeed(speed: number): void;
  getName?(): string;
  destroy(): void;
}

export type PlayerDriverType = 'HTML5_AUDIO' | 'HTML5_VIDEO' | 'YOUTUBE';

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  isReady: boolean;
  driverType: PlayerDriverType | null;
  mediaName: string;
}
