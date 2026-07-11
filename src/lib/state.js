import { DEFAULT_LOCATION } from '../data/stations.js';

const STORAGE_KEY = 'beijing-weather-window-state-v1';

export function readState() {
  const params = new URLSearchParams(window.location.search);
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    stored = {};
  }
  const lat = Number(params.get('lat') ?? stored.location?.lat ?? DEFAULT_LOCATION.lat);
  const lon = Number(params.get('lon') ?? stored.location?.lon ?? DEFAULT_LOCATION.lon);
  return {
    location: {
      name: params.get('name') ?? stored.location?.name ?? DEFAULT_LOCATION.name,
      displayName: params.get('display') ?? stored.location?.displayName ?? DEFAULT_LOCATION.displayName,
      lat: Number.isFinite(lat) ? lat : DEFAULT_LOCATION.lat,
      lon: Number.isFinite(lon) ? lon : DEFAULT_LOCATION.lon,
    },
    etaMinutes: Number(params.get('eta') ?? stored.etaMinutes ?? 45),
    radiusKm: Number(params.get('radius') ?? stored.radiusKm ?? 3),
  };
}

export function writeState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
