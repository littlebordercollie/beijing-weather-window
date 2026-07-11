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

  it('does not let a broad local alias hide a more specific online place', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        features: [{
          properties: { name: '望京医院', district: '望京街道', city: '北京市', type: 'house' },
          geometry: { coordinates: [116.467411, 39.9836238] },
        }],
      }),
    })));
    const results = await geocodePlace('望京医院');
    expect(results[0].name).toBe('望京医院');
    expect(results[0].lat).toBeCloseTo(39.9836238);
  });

  it('filters online geocoding results outside Beijing', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        features: [{
          properties: { name: '三里屯', city: '聊城市' },
          geometry: { coordinates: [115.686, 36.6418] },
        }],
      }),
    })));
    await expect(geocodePlace('三里屯-测试唯一键')).resolves.toEqual([]);
  });
});
