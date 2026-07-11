import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchWeatherMock, geocodePlaceMock } = vi.hoisted(() => ({
  fetchWeatherMock: vi.fn(),
  geocodePlaceMock: vi.fn(),
}));

vi.mock('./lib/api.js', () => ({
  fetchWeather: fetchWeatherMock,
  geocodePlace: geocodePlaceMock,
}));

import { createDashboard } from './dashboard.js';

function weatherResult() {
  const times = Array.from({ length: 20 }, (_, index) => {
    const minutes = index * 15;
    const hour = 16 + Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `2026-07-11T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  });
  return {
    latitude: 39.93,
    longitude: 116.48,
    current: {
      time: '2026-07-11T16:00', interval: 900, temperature_2m: 25,
      precipitation: 0, weather_code: 1, surface_pressure: 1000,
      relative_humidity_2m: 60, wind_speed_10m: 5,
    },
    minutely_15: {
      time: times,
      precipitation: times.map(() => 0),
      weather_code: times.map(() => 1),
    },
    hourly: {
      time: ['2026-07-11T16:00', '2026-07-11T17:00', '2026-07-11T18:00', '2026-07-11T19:00'],
      precipitation_probability: [0, 0, 0, 0],
    },
  };
}

function installDashboardDom() {
  document.body.innerHTML = `
    <form id="location-form"><input id="location-input"><button id="search-submit"></button></form>
    <div id="search-results" hidden></div><button id="locate-button"></button>
    <input id="eta-input"><span id="eta-value"></span>
    <button data-radius="3"></button><button data-radius="5"></button>
    <div id="data-status"></div><span data-place-name></span><span data-place-coord></span>
    <span data-station-count></span><span data-arrival-time></span><span data-risk-label></span>
    <span data-risk-headline></span><span data-risk-advice></span><span data-observation-time></span>
    <div data-weather-snapshot></div>
  `;
}

describe('dashboard refresh recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-11T08:00:00Z'));
    const values = new Map();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn((key) => values.get(key) ?? null),
        setItem: vi.fn((key, value) => values.set(key, String(value))),
      },
    });
    history.replaceState(null, '', '/');
    installDashboardDom();
    fetchWeatherMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('schedules another check after a temporary weather failure', async () => {
    const weather = weatherResult();
    fetchWeatherMock
      .mockRejectedValueOnce(new Error('暂时失败'))
      .mockImplementationOnce((points) => Promise.resolve(points.map(() => weather)));
    const renderView = vi.fn();

    createDashboard({ renderView });
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchWeatherMock).toHaveBeenCalledTimes(1);
    expect(document.querySelector('#data-status').dataset.state).toBe('error');

    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    expect(fetchWeatherMock).toHaveBeenCalledTimes(2);
    expect(document.querySelector('#data-status').dataset.state).toBe('ready');
    expect(renderView).toHaveBeenLastCalledWith(expect.objectContaining({ analysis: expect.any(Object) }));
  });
});
