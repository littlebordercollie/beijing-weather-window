import { describe, expect, it, vi } from 'vitest';
import { analyzeProbeSpread, analyzeWeather } from './analysis.js';

function fixture(precipitation, grid = [39.9, 116.4]) {
  return {
    latitude: grid[0],
    longitude: grid[1],
    current: {
      time: '2026-07-11T16:45', interval: 900, precipitation: precipitation[0], weather_code: precipitation[0] > 0 ? 61 : 2,
      temperature_2m: 26, surface_pressure: 996, relative_humidity_2m: 90, wind_speed_10m: 4,
    },
    minutely_15: {
      time: ['2026-07-11T16:45','2026-07-11T17:00','2026-07-11T17:15','2026-07-11T17:30','2026-07-11T17:45','2026-07-11T18:00','2026-07-11T18:15','2026-07-11T18:30'],
      precipitation,
      weather_code: precipitation.map((value) => value > 0 ? 61 : 2),
    },
    hourly: {
      time: ['2026-07-11T16:00','2026-07-11T17:00','2026-07-11T18:00'],
      precipitation_probability: [70, 60, 30],
    },
  };
}

describe('analyzeWeather', () => {
  it('classifies meaningful arrival rain as medium or high risk', () => {
    vi.setSystemTime(new Date('2026-07-11T16:45:00+08:00'));
    const result = analyzeWeather(fixture([0, 0.1, 0.6, 0.4, 0, 0, 0, 0]), 30, new Date());
    expect(result.arrivalPrecipitation).toBe(0.6);
    expect(['medium', 'high']).toContain(result.risk.key);
    expect(result.slots.some((slot) => slot.isArrival)).toBe(true);
    vi.useRealTimers();
  });

  it('finds a later dry window', () => {
    const result = analyzeWeather(
      fixture([0.8, 0.6, 0.2, 0, 0, 0, 0, 0]),
      15,
      new Date('2026-07-11T16:45:00+08:00'),
    );
    expect(result.dryWindow).not.toBeNull();
  });
});

describe('analyzeProbeSpread', () => {
  it('refuses to infer direction when probes collapse into too few grids', () => {
    const probes = ['中心','北','东','南','西'].map((direction, index) => ({ id: index ? direction : 'center', direction }));
    const weather = probes.map(() => fixture([0,0,0,0], [39.9,116.4]));
    const result = analyzeProbeSpread(probes, weather, new Date('2026-07-11T17:00:00+08:00'));
    expect(result.uniqueGridCount).toBe(1);
    expect(result.statement).toContain('不推断雨带方向');
  });
});
