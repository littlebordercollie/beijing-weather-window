import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LOCATION } from '../data/stations.js';
import { readState, writeState } from './state.js';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  const values = new Map();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: vi.fn((key) => values.get(key) ?? null),
      setItem: vi.fn((key, value) => values.set(key, String(value))),
      removeItem: vi.fn((key) => values.delete(key)),
      clear: vi.fn(() => values.clear()),
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('readState', () => {
  it('preserves a valid shared Beijing state', () => {
    window.history.replaceState(null, '', '/?name=北京大学&display=北京大学&lat=39.991821&lon=116.303947&eta=90&radius=5');

    expect(readState()).toEqual({
      location: {
        name: '北京大学',
        displayName: '北京大学',
        lat: 39.991821,
        lon: 116.303947,
      },
      etaMinutes: 90,
      radiusKm: 5,
    });
  });

  it('falls back safely for out-of-Beijing coordinates and unsupported options', () => {
    window.history.replaceState(null, '', '/?name=外地位置&lat=0&lon=0&eta=oops&radius=999');

    expect(readState()).toEqual({
      location: DEFAULT_LOCATION,
      etaMinutes: 45,
      radiusKm: 3,
    });
  });

  it('bounds state text and removes control characters', () => {
    const longName = `目的地\u0000${'甲'.repeat(200)}`;
    const params = new URLSearchParams({
      name: longName,
      display: '展示\u0007名称',
      lat: '39.9',
      lon: '116.4',
      eta: '45',
      radius: '3',
    });
    window.history.replaceState(null, '', `/?${params}`);

    const state = readState();
    expect(state.location.name).not.toMatch(/[\u0000-\u001F\u007F]/);
    expect(state.location.name).toHaveLength(120);
    expect(state.location.displayName).toBe('展示名称');
  });

  it('ignores malformed stored state', () => {
    window.localStorage.setItem('beijing-weather-window-state-v1', JSON.stringify({
      location: { name: '错误位置', lat: Infinity, lon: 116.4 },
      etaMinutes: -1,
      radiusKm: 100,
    }));

    expect(readState()).toEqual({
      location: DEFAULT_LOCATION,
      etaMinutes: 45,
      radiusKm: 3,
    });
  });
});

describe('writeState', () => {
  it('keeps URL synchronization working when localStorage is unavailable', () => {
    window.localStorage.setItem.mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    expect(() => writeState({
      location: DEFAULT_LOCATION,
      etaMinutes: 60,
      radiusKm: 5,
    })).not.toThrow();
    expect(new URLSearchParams(window.location.search).get('eta')).toBe('60');
    expect(new URLSearchParams(window.location.search).get('radius')).toBe('5');
  });
});
