import { afterEach, describe, expect, it, vi } from 'vitest';
import { geocodePlace } from './api.js';

afterEach(() => vi.unstubAllGlobals());

describe('geocodePlace', () => {
  it('returns a verified local result for common Beijing destinations without network access', async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error('network should not be used')));
    vi.stubGlobal('fetch', fetchMock);
    const results = await geocodePlace('北京大学');
    expect(results[0].name).toBe('北京大学');
    expect(results[0].lat).toBeCloseTo(39.9918215);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts a Beijing coordinate pair directly', async () => {
    const results = await geocodePlace('39.91743, 116.39078');
    expect(results[0].type).toBe('coordinates');
    expect(results[0].lon).toBeCloseTo(116.39078);
  });
});
