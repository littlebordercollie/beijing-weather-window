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

  it('includes rain between now and arrival in the journey risk', () => {
    const result = analyzeWeather(
      fixture([0, 0, 5, 5, 0, 0, 0, 0]),
      60,
      new Date('2026-07-11T16:45:00+08:00'),
    );
    expect(result.arrivalPrecipitation).toBe(0);
    expect(result.risk.key).toBe('high');
    expect(result.headline).toContain('途中');
  });

  it('uses the hourly probability interval containing the arrival time', () => {
    const weather = fixture([0, 0, 0, 0, 0, 0, 0, 0]);
    weather.hourly.precipitation_probability = [0, 90, 0];
    const result = analyzeWeather(
      weather,
      30,
      new Date('2026-07-11T16:45:00+08:00'),
    );
    expect(result.probability).toBe(90);
    expect(result.risk.key).toBe('medium');
  });

  it.each([56, 57])('treats freezing drizzle code %s as high risk', (code) => {
    const weather = fixture([0.1, 0.1, 0.1, 0.1, 0, 0, 0, 0]);
    weather.current.weather_code = code;
    weather.minutely_15.weather_code = weather.minutely_15.weather_code.map(() => code);
    weather.hourly.precipitation_probability = [20, 20, 20];
    const result = analyzeWeather(
      weather,
      15,
      new Date('2026-07-11T16:45:00+08:00'),
    );
    expect(result.risk.key).toBe('high');
  });

  it('does not call thunderstorm or high-probability slots a dry window', () => {
    const weather = fixture([0, 0, 0, 0, 0, 0, 0, 0]);
    weather.minutely_15.weather_code = weather.minutely_15.weather_code.map(() => 95);
    weather.hourly.precipitation_probability = [100, 100, 100];
    const result = analyzeWeather(
      weather,
      30,
      new Date('2026-07-11T16:45:00+08:00'),
    );
    expect(result.dryWindow).toBeNull();
  });

  it('keeps a 180-minute arrival visible on the returned timeline', () => {
    const time = Array.from({ length: 16 }, (_, index) => {
      const date = new Date('2026-07-11T16:45:00+08:00');
      date.setMinutes(date.getMinutes() + index * 15);
      return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).format(date).replace(' ', 'T');
    });
    const weather = fixture(time.map(() => 0));
    weather.minutely_15.time = time;
    weather.minutely_15.weather_code = time.map(() => 2);
    weather.hourly.time = ['2026-07-11T16:00','2026-07-11T17:00','2026-07-11T18:00','2026-07-11T19:00','2026-07-11T20:00'];
    weather.hourly.precipitation_probability = [0, 0, 0, 0, 0];
    const result = analyzeWeather(
      weather,
      180,
      new Date('2026-07-11T16:45:00+08:00'),
    );
    expect(result.slots.at(-1).clock).toBe(result.arrivalClock);
    expect(result.slots.at(-1).isArrival).toBe(true);
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

  it('describes a spatial gradient without claiming a movement direction', () => {
    const probes = ['中心','北','东','南','西'].map((direction, index) => ({ id: index ? direction : 'center', direction }));
    const weather = probes.map((probe, index) => {
      const result = fixture(index === 1 ? [1, 1, 1, 1] : [0, 0, 0, 0], [39.9 + index * 0.01, 116.4]);
      return result;
    });
    const result = analyzeProbeSpread(probes, weather, new Date('2026-07-11T17:00:00+08:00'));
    expect(result.statement).toContain('北侧格点雨信号更强');
    expect(result.statement).toContain('不能据此判断雨区移动方向');
    expect(result.statement).not.toContain('雨区可能从');
  });
});
