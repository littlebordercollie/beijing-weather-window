import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createDashboard, stationCardMarkup, timelineMarkup } from './dashboard.js';
import './styles.css';

const map = L.map('weather-map', {
  zoomControl: false,
  attributionControl: false,
  preferCanvas: true,
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  subdomains: 'abcd',
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors © CARTO',
}).addTo(map);
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.control.attribution({ position: 'bottomleft', prefix: false })
  .addAttribution('© OpenStreetMap contributors © CARTO')
  .addTo(map);

const dynamicLayers = L.layerGroup().addTo(map);
let hasCentered = false;
let dashboard;

// 外部瓦片不可达时，行政区矢量仍然让地图保持可读；矢量来源为阿里云 DataV 行政区边界。
fetch('https://geo.datav.aliyun.com/areas_v3/bound/110000_full.json')
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then((geojson) => {
    L.geoJSON(geojson, {
      style: {
        color: '#4d8593', weight: 1, opacity: 0.5,
        fillColor: '#0b2933', fillOpacity: 0.16,
      },
      onEachFeature: (feature, layer) => {
        if (feature.properties?.name) {
          layer.bindTooltip(feature.properties.name, {
            permanent: false, direction: 'center', className: 'district-label',
          });
        }
      },
    }).addTo(map).bringToBack();
  })
  .catch(() => {
    // 瓦片和矢量都不可达时仍保留站点、探针、半径圈与经纬网，不用假地图替代。
  });

for (let lat = 39.4; lat <= 41.1; lat += 0.1) {
  L.polyline([[lat, 115.3], [lat, 117.8]], { color: '#74b5c4', weight: 0.35, opacity: 0.1, interactive: false }).addTo(map);
}
for (let lon = 115.3; lon <= 117.8; lon += 0.1) {
  L.polyline([[39.4, lon], [41.1, lon]], { color: '#74b5c4', weight: 0.35, opacity: 0.1, interactive: false }).addTo(map);
}

function markerIcon(kind, label = '') {
  return L.divIcon({
    className: `weather-marker weather-marker--${kind}`,
    html: `<span></span>${label ? `<b>${label}</b>` : ''}`,
    iconSize: kind === 'destination' ? [34, 34] : [24, 24],
    iconAnchor: kind === 'destination' ? [17, 17] : [12, 12],
  });
}

function centerMap(location, radiusKm, force = false) {
  if (!hasCentered || force) {
    map.setView([location.lat, location.lon], radiusKm === 3 ? 13.8 : 13.1);
    hasCentered = true;
  }
}

function renderMap(data) {
  if (data.error) {
    document.querySelector('#timeline').innerHTML = '<div class="panel-error">天气接口不可达，地图和站点圈仍可使用。</div>';
    return;
  }
  dynamicLayers.clearLayers();
  centerMap(data.location, data.radiusKm);

  L.circle([data.location.lat, data.location.lon], {
    radius: data.radiusKm * 1000,
    color: '#73ddff',
    weight: 1,
    opacity: 0.8,
    fillColor: '#42bfe8',
    fillOpacity: 0.08,
    dashArray: '6 10',
  }).addTo(dynamicLayers);

  L.marker([data.location.lat, data.location.lon], { icon: markerIcon('destination') })
    .bindPopup(`<b>${data.location.name}</b><br>预计 ${data.analysis.arrivalClock} 到达`)
    .addTo(dynamicLayers);

  data.probeAnalysis.rows.filter((probe) => probe.id !== 'center').forEach((probe) => {
    L.marker([probe.lat, probe.lon], { icon: markerIcon('probe', probe.direction) })
      .bindTooltip(`${probe.label} · ${probe.precipitation.toFixed(1)} mm`, { direction: 'top' })
      .addTo(dynamicLayers);
  });

  data.stationWeather.forEach((station) => {
    L.marker([station.lat, station.lon], { icon: markerIcon('station', station.id) })
      .bindPopup(`
        <div class="map-popup">
          <small>${station.id} · ${station.distanceKm.toFixed(1)} km</small>
          <b>${station.name}参考台站</b>
          <span>站旁格点 ${Number(station.gridWeather.current.temperature_2m).toFixed(1)}°C · ${Number(station.gridWeather.current.precipitation).toFixed(1)} mm</span>
          <em>不是台站原始观测</em>
        </div>
      `)
      .addTo(dynamicLayers);
  });

  document.querySelector('#timeline').innerHTML = timelineMarkup(data.analysis.slots);
  document.querySelector('#probe-statement').textContent = data.probeAnalysis.statement;
  document.querySelector('#trend-value').textContent = data.analysis.trend;
  document.querySelector('#grid-count').textContent = String(data.probeAnalysis.uniqueGridCount);
  document.querySelector('#nearest-station').textContent = data.nearby[0]
    ? `${data.nearby[0].name} · ${data.nearby[0].distanceKm.toFixed(1)} km`
    : `${data.radiusKm} km 内暂无公开参考台站`;
  const stationPreview = document.querySelector('#station-preview');
  stationPreview.innerHTML = data.stationWeather.length
    ? data.stationWeather.slice(0, 2).map(stationCardMarkup).join('')
    : `<div class="empty-card"><b>圈内没有公开参考台站</b><span>这不代表附近没有区域自动站；只是公开站表不足以验证。</span></div>`;

  const cityRain = document.querySelector('#city-rain-context');
  cityRain.innerHTML = data.cityRain
    ? `<b>${data.cityRain.stationCount}</b><span>个全市水务日雨量站已返回<br>${data.cityRain.window}</span>`
    : '<b>—</b><span>水务雨情接口暂时不可达</span>';
}

dashboard = createDashboard({
  renderView: renderMap,
  onLocationChange: (location, radiusKm) => centerMap(location, radiusKm, true),
});

map.on('click', ({ latlng }) => {
  dashboard.chooseLocation({
    name: '地图选点',
    displayName: `地图选点 ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`,
    lat: latlng.lat,
    lon: latlng.lng,
  });
});

window.addEventListener('resize', () => map.invalidateSize());
