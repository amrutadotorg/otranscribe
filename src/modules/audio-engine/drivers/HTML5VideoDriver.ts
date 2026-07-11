/**
 * HTML5VideoDriver.ts — Driver for local video files
 *
 * Injects a <video> element into body with class "video-player".
 * Extends HTML5AudioDriver — same interface, different element type.
 */

import { HTML5AudioDriver } from './HTML5AudioDriver';

export class HTML5VideoDriver extends HTML5AudioDriver {
  constructor(source: string, onPlayPause?: (status: string) => void) {
    // Call parent but we need a video element — we'll override after super()
    super(source, onPlayPause);
    // Replace audio element with video element
    this.element.remove();
    const video = document.createElement('video');
    video.src = source;
    video.className = 'video-player';
    video.style.cssText = 'width: 100%; height: 100%; display: block; background: #000; object-fit: contain;';
    const container = document.getElementById('media-container') || document.body;
    container.appendChild(video);
    this.element = video;

    // Re-attach play/pause listeners if callback was provided
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
}
