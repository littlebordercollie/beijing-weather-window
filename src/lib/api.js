import { searchPopularPlaces } from '../data/places.js';

const WEATHER_FIELDS = [
  'temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'precipitation',
  'rain', 'weather_code', 'cloud_cover', 'surface_pressure', 'wind_speed_10m', 'wind_direction_10m',
].join(',');

async function fetchJson(url, options = {}, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
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
    if (lat >= 39.3 && lat <= 41.1 && lon >= 115.3 && lon <= 117.8) {
      return [{ name: '坐标选点', displayName: `坐标 ${lat.toFixed(5)}, ${lon.toFixed(5)}`, lat, lon, type: 'coordinates' }];
    }
  }
  const localResults = searchPopularPlaces(query);
  if (localResults.length) return localResults;
  const params = new URLSearchParams({
    q: `${query} 北京`,
    format: 'jsonv2',
    limit: '5',
    'accept-language': 'zh-CN',
    countrycodes: 'cn',
    viewbox: '115.3,41.1,117.8,39.3',
    bounded: '1',
  });
  const results = await fetchJson(`https://nominatim.openstreetmap.org/search?${params}`);
  return results.map((item) => ({
    name: query,
    displayName: item.display_name,
    lat: Number(item.lat),
    lon: Number(item.lon),
    type: item.type,
  }));
}

export async function fetchWeather(points) {
  const params = new URLSearchParams({
    latitude: points.map((point) => point.lat.toFixed(6)).join(','),
    longitude: points.map((point) => point.lon.toFixed(6)).join(','),
    timezone: 'Asia/Shanghai',
    forecast_days: '2',
    current: WEATHER_FIELDS,
    minutely_15: 'precipitation,rain,weather_code',
    hourly: 'precipitation_probability',
  });
  const data = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`);
  return Array.isArray(data) ? data : [data];
}

export async function fetchCityRainContext(date = new Date()) {
  const dateString = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
  const data = await fetchJson('https://nsbd.swj.beijing.gov.cn/service/jinRainList/list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queryDate: dateString }),
  });
  if (data.code !== 0 || !data.data?.rain_data) throw new Error(data.message || '雨情数据不可用');
  const stationRows = data.data.rain_data.filter((row) => row.remark !== '统计');
  const top = [...stationRows].sort((a, b) => Number(b.RNFL) - Number(a.RNFL)).slice(0, 3);
  return {
    window: data.data.queryDate,
    stationCount: stationRows.length,
    top: top.map((row) => ({ name: row.replace_name, rain: Number(row.RNFL), code: row.stcdt })),
  };
}
