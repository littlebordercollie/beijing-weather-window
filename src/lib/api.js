import { searchPopularPlaces } from '../data/places.js';

const BEIJING_BOUNDS = { minLat: 39.3, maxLat: 41.1, minLon: 115.3, maxLon: 117.8 };
const geocodeCache = new Map();

const WEATHER_FIELDS = [
  'temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'precipitation',
  'rain', 'weather_code', 'cloud_cover', 'surface_pressure', 'wind_speed_10m', 'wind_direction_10m',
].join(',');

async function fetchJson(url, options = {}, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const signal = options.signal
      ? AbortSignal.any([controller.signal, options.signal])
      : controller.signal;
    const response = await fetch(url, { ...options, signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function geocodePlace(query) {
  const coordinateMatch = query.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,，]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (coordinateMatch) {
    const lat = Number(coordinateMatch[1]);
    const lon = Number(coordinateMatch[2]);
    if (lat >= BEIJING_BOUNDS.minLat && lat <= BEIJING_BOUNDS.maxLat
      && lon >= BEIJING_BOUNDS.minLon && lon <= BEIJING_BOUNDS.maxLon) {
      return [{ name: '坐标选点', displayName: `坐标 ${lat.toFixed(5)}, ${lon.toFixed(5)}`, lat, lon, type: 'coordinates' }];
    }
  }
  const localResults = searchPopularPlaces(query);
  if (localResults.length) return localResults;
  const cacheKey = query.trim().toLowerCase();
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);
  const params = new URLSearchParams({
    q: `${query} 北京`,
    limit: '8',
  });
  const data = await fetchJson(`https://photon.komoot.io/api/?${params}`);
  const results = (data.features || []).map((item) => {
    const [lon, lat] = item.geometry?.coordinates || [];
    const details = [item.properties?.name, item.properties?.street, item.properties?.district, item.properties?.city]
      .filter(Boolean);
    return {
      name: item.properties?.name || query,
      displayName: [...new Set(details)].join(' · '),
      lat: Number(lat),
      lon: Number(lon),
      type: item.properties?.type || 'place',
    };
  }).filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lon)
    && item.lat >= BEIJING_BOUNDS.minLat && item.lat <= BEIJING_BOUNDS.maxLat
    && item.lon >= BEIJING_BOUNDS.minLon && item.lon <= BEIJING_BOUNDS.maxLon);
  geocodeCache.set(cacheKey, results);
  return results;
}

export async function fetchWeather(points, { signal } = {}) {
  const params = new URLSearchParams({
    latitude: points.map((point) => point.lat.toFixed(6)).join(','),
    longitude: points.map((point) => point.lon.toFixed(6)).join(','),
    timezone: 'Asia/Shanghai',
    forecast_days: '2',
    current: WEATHER_FIELDS,
    minutely_15: 'precipitation,rain,weather_code',
    hourly: 'precipitation_probability',
  });
  const data = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`, { signal });
  return Array.isArray(data) ? data : [data];
}
