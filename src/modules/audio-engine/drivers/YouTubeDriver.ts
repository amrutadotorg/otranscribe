/**
 * YouTubeDriver.ts — Driver for YouTube videos
 *
 * Uses the YouTube iframe API (YT.Player).
 * Preserves the original hack: play→pause on init to fix focus stealing.
 * See PLAN.md Risk R3, Faza 3
 */

import type { PlayerDriver } from '../../../types/player';

// Extend Window to include YT API globals
declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

/** Parse YouTube video ID from various URL formats */
function parseYouTubeUrl(url: string): string | null {
  if (!url) return null;
  const cleanUrl = decodeURIComponent(
    url.replace(/\s/g, '').replace(/•.*$/, ''),
  );
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([A-Za-z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([A-Za-z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/watch.*[?&]v=([A-Za-z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\/([A-Za-z0-9_-]{11})/,
    /[?&]v=([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match?.[1]?.length === 11) return match[1];
  }
  return null;
}

let youtubeAPIPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (window.YT && typeof window.YT.Player === 'function') {
    return Promise.resolve();
  }
  if (youtubeAPIPromise) return youtubeAPIPromise;

  youtubeAPIPromise = new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve();
    if (!document.getElementById('youtube-script')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    if (window.YT && typeof window.YT.Player === 'function') resolve();
  });
  return youtubeAPIPromise;
}

export class YouTubeDriver implements PlayerDriver {
  private _isDestroyed = false;
  private _isReady = false;
  private _status: 'playing' | 'paused' | 'inactive' = 'paused';
  private _duration = 0;
  private _ytEl: YT.Player | null = null;
  private _readyTimers: ReturnType<typeof setTimeout>[] = [];
  private _container: HTMLDivElement;
  private _mediaName = '';

  constructor(
    source: string,
    onPlayPause?: (status: 'playing' | 'paused' | 'inactive') => void,
  ) {
    this._container = document.createElement('div');
    this._container.id = 'oTplayerEl';
    this._container.className = 'video-player';
    this._container.style.cssText = 'width: 100%; height: 100%;';
    const wrapper = document.getElementById('media-container') || document.body;
    wrapper.appendChild(this._container);

    const videoId = parseYouTubeUrl(source);
    if (!videoId) {
      console.error('YouTubeDriver: could not parse video ID from', source);
      return;
    }

    // Fetch title asynchronously
    void this._fetchTitle(videoId);

    loadYouTubeAPI().then(() => {
      if (this._isDestroyed) return;

      // Wait for container to be fully settled in DOM (after React flushSync/rAF)
      const initPlayer = () => {
        if (this._isDestroyed) return;
        if (!document.contains(this._container)) {
          requestAnimationFrame(initPlayer);
          return;
        }
        this._ytEl = new YT.Player('oTplayerEl', {
          width: '100%',
          videoId,
          playerVars: {
            disablekb: 1,
            fs: 0,
            rel: 0,
            modestbranding: 1,
            origin: window.location.origin,
            enablejsapi: 1,
          },
          events: {
            onReady: () => this._onReady(onPlayPause),
            onStateChange: (ev: YT.OnStateChangeEvent) =>
              this._onStateChange(ev, onPlayPause),
          },
        });
      };
      requestAnimationFrame(initPlayer);
    });
  }

  private async _fetchTitle(videoId: string): Promise<void> {
    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      );
      if (res.ok) {
        const data = (await res.json()) as { title?: string };
        this._mediaName = data.title ?? '';
      }
    } catch {
      // Title fetch is optional
    }
  }

  private _onStateChange(
    ev: YT.OnStateChangeEvent,
    onPlayPause?: (status: 'playing' | 'paused' | 'inactive') => void,
  ): void {
    if (this._isDestroyed) return;
    if (ev.data === 1) {
      this._status = 'playing';
    } else {
      this._status = 'paused';
    }
    onPlayPause?.(this._status);
  }

  private _onReady(
    onPlayPause?: (status: 'playing' | 'paused' | 'inactive') => void,
  ): void {
    if (this._isDestroyed) return;

    this._duration = this._ytEl?.getDuration?.() ?? 0;

    // Kickstart YouTube (play→pause trick to fix focus stealing — see PLAN.md R3)
    const t1 = setTimeout(() => {
      if (this._isDestroyed) return;
      this.play();
      const t2 = setTimeout(() => {
        if (this._isDestroyed) return;
        this.pause();
        this._isReady = true;
        onPlayPause?.('paused');
      }, 500);
      this._readyTimers.push(t2);
    }, 1000);
    this._readyTimers.push(t1);
  }

  play(): void {
    this._ytEl?.playVideo?.();
  }

  pause(): void {
    this._ytEl?.pauseVideo?.();
  }

  getTime(): number {
    return this._ytEl?.getCurrentTime?.() ?? 0;
  }

  setTime(seconds: number): void {
    this._ytEl?.seekTo?.(seconds, true);
  }

  getStatus(): 'playing' | 'paused' | 'inactive' {
    return this._isDestroyed ? 'inactive' : this._status;
  }

  getLength(): number {
    return this._duration;
  }

  isReady(): boolean {
    return this._isReady;
  }

  getSpeed(): number {
    return this._ytEl?.getPlaybackRate?.() ?? 1;
  }

  setSpeed(speed: number): void {
    this._ytEl?.setPlaybackRate?.(speed);
  }

  getName(): string {
    return this._mediaName;
  }

  destroy(): void {
    if (this._isDestroyed) return;
    this._isDestroyed = true;
    this._readyTimers.forEach(clearTimeout);
    this._readyTimers = [];
    this._container.remove();
    this._ytEl = null;
  }
}
