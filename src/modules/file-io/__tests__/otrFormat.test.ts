/**
 * otrFormat.test.ts — Regression tests for .otr format parsing
 *
 * Covers all fixtures from test-fixtures/otr/
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  convertTimestampToSeconds,
  normaliseTimestamp,
  parseOtrFile,
  serializeToOtr,
  preprocessOtrHtml,
} from '../otrFormat';

const fixturesDir = join(__dirname, '../../../../test-fixtures/otr');

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf-8');
}

// ─── convertTimestampToSeconds ─────────────────────────────────────────────

describe('convertTimestampToSeconds', () => {
  it('converts MM:SS format', () => {
    expect(convertTimestampToSeconds('2:03')).toBe(123);
  });

  it('converts H:MM:SS format', () => {
    expect(convertTimestampToSeconds('1:02:03')).toBe(3723);
  });

  it('converts 0:00', () => {
    expect(convertTimestampToSeconds('0:00')).toBe(0);
  });
});

// ─── normaliseTimestamp ────────────────────────────────────────────────────

describe('normaliseTimestamp', () => {
  it('returns number as-is', () => {
    expect(normaliseTimestamp(123.45)).toBe(123.45);
  });

  it('parses legacy "2:03" string to 123', () => {
    expect(normaliseTimestamp('2:03')).toBe(123);
  });

  it('parses numeric string "123.45"', () => {
    expect(normaliseTimestamp('123.45')).toBeCloseTo(123.45);
  });
});

// ─── parseOtrFile — fixture tests ──────────────────────────────────────────

describe('parseOtrFile — legacy-timestamp.otr', () => {
  it('parses and normalises legacy timestamp to seconds', () => {
    const raw = loadFixture('legacy-timestamp.otr');
    const doc = parseOtrFile(raw);

    // data-timestamp="2:03" should be converted to 123
    expect(doc.html).toContain('data-timestamp="123"');
    expect(doc.mediaDetails.name).toBe('test.mp3');
    expect(doc.mediaTime).toBe(123);
  });
});

describe('parseOtrFile — modern-timestamp.otr', () => {
  it('parses modern numeric timestamp', () => {
    const raw = loadFixture('modern-timestamp.otr');
    const doc = parseOtrFile(raw);

    expect(doc.html).toContain('data-timestamp="123.45"');
    expect(doc.mediaDetails.name).toBe('recording.mp3');
    expect(doc.mediaTime).toBeCloseTo(123.45);
  });
});

describe('parseOtrFile — youtube-source.otr', () => {
  it('parses YouTube media source URL', () => {
    const raw = loadFixture('youtube-source.otr');
    const doc = parseOtrFile(raw);

    expect(doc.mediaDetails.source).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    );
    expect(doc.mediaDetails.name).toBe('Example Video Title');
  });
});

describe('parseOtrFile — no-media.otr', () => {
  it('parses file with no media gracefully', () => {
    const raw = loadFixture('no-media.otr');
    const doc = parseOtrFile(raw);

    expect(doc.mediaDetails.name).toBe('');
    expect(doc.mediaTime).toBe(0);
    expect(doc.html).toContain('Tylko tekst');
  });
});

describe('parseOtrFile — bold-italic.otr', () => {
  it('preserves bold and italic tags', () => {
    const raw = loadFixture('bold-italic.otr');
    const doc = parseOtrFile(raw);

    expect(doc.html).toContain('<strong>');
    expect(doc.html).toContain('<em>');
  });
});

describe('parseOtrFile — multilang.otr', () => {
  it('correctly preserves Polish characters', () => {
    const raw = loadFixture('multilang.otr');
    const doc = parseOtrFile(raw);
    expect(doc.html).toContain('ąćęłńóśźż');
  });

  it('correctly preserves Cyrillic text', () => {
    const raw = loadFixture('multilang.otr');
    const doc = parseOtrFile(raw);
    expect(doc.html).toContain('привіт');
  });

  it('correctly preserves Arabic text', () => {
    const raw = loadFixture('multilang.otr');
    const doc = parseOtrFile(raw);
    expect(doc.html).toContain('مرحبا');
  });
});

// ─── parseOtrFile — error cases ────────────────────────────────────────────

describe('parseOtrFile — error handling', () => {
  it('throws on invalid JSON', () => {
    expect(() => parseOtrFile('not json')).toThrow('valid oTranscribe format');
  });

  it('throws on missing text field', () => {
    expect(() => parseOtrFile(JSON.stringify({ media: 'test.mp3' }))).toThrow(
      'missing "text" field',
    );
  });
});

// ─── serializeToOtr ────────────────────────────────────────────────────────

describe('serializeToOtr', () => {
  it('produces valid JSON', () => {
    const json = serializeToOtr({
      html: '<p>Test</p>',
      mediaName: 'test.mp3',
      mediaTime: 10,
    });
    const parsed = JSON.parse(json);
    expect(parsed.text).toBe('<p>Test</p>');
    expect(parsed.media).toBe('test.mp3');
    expect(parsed['media-time']).toBe(10);
  });

  it('round-trips correctly', () => {
    const raw = loadFixture('modern-timestamp.otr');
    const doc = parseOtrFile(raw);
    const serialized = serializeToOtr({
      html: doc.html,
      mediaName: doc.mediaDetails.name,
      mediaSource: doc.mediaDetails.source,
      mediaTime: doc.mediaTime,
    });
    const reparsed = parseOtrFile(serialized);
    expect(reparsed.mediaDetails.name).toBe(doc.mediaDetails.name);
    expect(reparsed.mediaTime).toBe(doc.mediaTime);
  });
});

// ─── preprocessOtrHtml ─────────────────────────────────────────────────────

describe('preprocessOtrHtml', () => {
  it('removes contenteditable attribute from timestamps', () => {
    const input =
      '<span class="timestamp" contenteditable="false" data-timestamp="2:03">2:03</span>';
    const output = preprocessOtrHtml(input);
    expect(output).not.toContain('contenteditable');
  });

  it('normalises legacy timestamp in data attribute', () => {
    const input = '<span class="timestamp" data-timestamp="2:03">2:03</span>';
    const output = preprocessOtrHtml(input);
    expect(output).toContain('data-timestamp="123"');
  });

  it('keeps numeric timestamp unchanged', () => {
    const input = '<span class="timestamp" data-timestamp="123.45">2:03</span>';
    const output = preprocessOtrHtml(input);
    expect(output).toContain('data-timestamp="123.45"');
  });
});
