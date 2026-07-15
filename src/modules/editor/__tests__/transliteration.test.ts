import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { transliterate } from '../transliteration';

describe('transliterate', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { onLine: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns candidates on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ candidates: ['नमस्ते'] }),
      }),
    );

    const result = await transliterate('namaste', 'sa-t-i0-und');
    expect(result).toEqual(['नमस्ते']);
  });

  it('returns empty array when offline', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const result = await transliterate('namaste', 'sa-t-i0-und');
    expect(result).toEqual([]);
  });

  it('returns empty array on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const result = await transliterate('namaste', 'sa-t-i0-und');
    expect(result).toEqual([]);
  });

  it('returns empty array on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const result = await transliterate('namaste', 'sa-t-i0-und');
    expect(result).toEqual([]);
  });

  it('returns empty array when word is empty', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await transliterate('', 'sa-t-i0-und');
    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns empty array when response has no candidates field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }),
    );
    const result = await transliterate('namaste', 'sa-t-i0-und');
    expect(result).toEqual([]);
  });
});
