import { DEFAULT_LOCATION } from '../data/stations.js';

const STORAGE_KEY = 'beijing-weather-window-state-v1';
const BEIJING_BOUNDS = {
  minLat: 39.3,
  maxLat: 41.1,
  minLon: 115.3,
  maxLon: 117.8,
};
const VALID_ETA_MINUTES = new Set(Array.from({ length: 12 }, (_, index) => 15 + index * 15));
const VALID_RADII = new Set([3, 5]);

function safeText(value, fallback, maxLength) {
  if (typeof value !== 'string') return fallback;
  const normalized = value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maxLength);
  return normalized || fallback;
}

function validCoordinatePair(lat, lon) {
  return Number.isFinite(lat)
    && Number.isFinite(lon)
    && lat >= BEIJING_BOUNDS.minLat
    && lat <= BEIJING_BOUNDS.maxLat
    && lon >= BEIJING_BOUNDS.minLon
    && lon <= BEIJING_BOUNDS.maxLon;
}

function normalizedLocation(candidate) {
  if (!candidate || typeof candidate !== 'object') return DEFAULT_LOCATION;
  const lat = Number(candidate.lat);
  const lon = Number(candidate.lon);
  if (!validCoordinatePair(lat, lon)) return DEFAULT_LOCATION;
  return {
    name: safeText(candidate.name, DEFAULT_LOCATION.name, 120),
    displayName: safeText(candidate.displayName, DEFAULT_LOCATION.displayName, 300),
    lat,
    lon,
  };
}

function validOption(value, allowed, fallback) {
  const number = Number(value);
  return allowed.has(number) ? number : fallback;
}

export function readState() {
  const params = new URLSearchParams(window.location.search);
  let stored = {};
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    stored = parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    stored = {};
  }
  const storedLocation = normalizedLocation(stored.location);
  const hasUrlLocation = params.has('lat') || params.has('lon') || params.has('name') || params.has('display');
  const location = hasUrlLocation
    ? normalizedLocation({
      name: params.get('name') ?? storedLocation.name,
      displayName: params.get('display') ?? storedLocation.displayName,
      lat: params.get('lat') ?? storedLocation.lat,
      lon: params.get('lon') ?? storedLocation.lon,
    })
    : storedLocation;
  return {
    location,
    etaMinutes: validOption(params.get('eta') ?? stored.etaMinutes, VALID_ETA_MINUTES, 45),
    radiusKm: validOption(params.get('radius') ?? stored.radiusKm, VALID_RADII, 3),
  };
}

export function writeState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 浏览器禁止或耗尽站点存储时，URL 状态仍可正常工作。
  }
  const params = new URLSearchParams({
    name: state.location.name,
    display: state.location.displayName,
    lat: state.location.lat.toFixed(6),
    lon: state.location.lon.toFixed(6),
    eta: String(state.etaMinutes),
    radius: String(state.radiusKm),
  });
  history.replaceState(null, '', `${window.location.pathname}?${params}`);
  document.querySelectorAll('[data-view-link]').forEach((link) => {
    const target = link.dataset.viewLink;
    link.href = `${target}?${params}`;
  });
}
