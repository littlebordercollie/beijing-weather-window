const EARTH_RADIUS_KM = 6371.0088;

export function haversineKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const lat1 = a.lat * rad;
  const lat2 = b.lat * rad;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function nearbyStations(location, stations, radiusKm) {
  return stations
    .map((station) => ({ ...station, distanceKm: haversineKm(location, station) }))
    .filter((station) => station.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function makeProbePoints(location, radiusKm) {
  const offsetKm = Math.max(1.5, radiusKm * 0.72);
  const latDelta = offsetKm / 111.32;
  const lonDelta = offsetKm / (111.32 * Math.cos(location.lat * Math.PI / 180));
  return [
    { ...location, id: 'center', label: '目的地', direction: '中心' },
    { id: 'north', label: '北侧探针', direction: '北', lat: location.lat + latDelta, lon: location.lon },
    { id: 'east', label: '东侧探针', direction: '东', lat: location.lat, lon: location.lon + lonDelta },
    { id: 'south', label: '南侧探针', direction: '南', lat: location.lat - latDelta, lon: location.lon },
    { id: 'west', label: '西侧探针', direction: '西', lat: location.lat, lon: location.lon - lonDelta },
  ];
}

export function gridFingerprint(weather) {
  return `${Number(weather.latitude).toFixed(3)},${Number(weather.longitude).toFixed(3)}`;
}
