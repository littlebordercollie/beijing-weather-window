import { describe, expect, it } from 'vitest';
import { makeProbePoints, nearbyStations } from './geo.js';
import { REFERENCE_STATIONS } from '../data/stations.js';

describe('nearbyStations', () => {
  it('finds the verified Chaoyang reference station near Chaoyang Park', () => {
    const result = nearbyStations({ lat: 39.932582, lon: 116.476949 }, REFERENCE_STATIONS, 3);
    expect(result.map((station) => station.id)).toContain('54433');
    expect(result[0].distanceKm).toBeLessThan(3);
  });

  it('does not include stations beyond the selected radius', () => {
    const result = nearbyStations({ lat: 39.99182, lon: 116.30395 }, REFERENCE_STATIONS, 3);
    expect(result.every((station) => station.distanceKm <= 3)).toBe(true);
  });
});

describe('makeProbePoints', () => {
  it('creates a center and four cardinal probes', () => {
    const probes = makeProbePoints({ lat: 39.9, lon: 116.4, name: '测试点' }, 5);
    expect(probes).toHaveLength(5);
    expect(probes.map((probe) => probe.id)).toEqual(['center', 'north', 'east', 'south', 'west']);
    expect(probes[1].lat).toBeGreaterThan(probes[0].lat);
    expect(probes[2].lon).toBeGreaterThan(probes[0].lon);
  });
});
