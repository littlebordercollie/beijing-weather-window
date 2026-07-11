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

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function errorBox(message) {
  const box = document.createElement('div');
  box.className = 'panel-error';
  box.textContent = message;
  return box;
}

function setAllText(selector, value) {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = value;
  });
}

function safeStationCardMarkup(station) {
  return stationCardMarkup({
    ...station,
    id: escapeHtml(station.id),
    gridTime: escapeHtml(station.gridTime),
    gridIntervalEnd: escapeHtml(station.gridIntervalEnd),
    nextCheckTime: escapeHtml(station.nextCheckTime),
  });
}

function destinationPopup(location, arrivalClock) {
  const fragment = document.createDocumentFragment();
  const title = document.createElement('b');
  title.textContent = location.name;
  fragment.append(title, document.createElement('br'), `预计 ${arrivalClock} 到达`);
  return fragment;
}

function stationPopup(station) {
  const popup = document.createElement('div');
  popup.className = 'map-popup';
  const meta = document.createElement('small');
  meta.textContent = `${station.id} · ${station.distanceKm.toFixed(1)} km`;
  const title = document.createElement('b');
  title.textContent = `${station.name}参考台站`;
  const reading = document.createElement('span');
  reading.textContent = `站旁格点 ${Number(station.gridWeather.current.temperature_2m).toFixed(1)}°C · ${Number(station.gridWeather.current.precipitation).toFixed(1)} mm`;
  const evidence = document.createElement('em');
  evidence.textContent = '不是台站原始观测';
  popup.append(meta, title, reading, evidence);
  return popup;
}

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
          const label = document.createElement('span');
          label.textContent = String(feature.properties.name);
          layer.bindTooltip(label, {
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
    html: `<span></span>${label ? `<b>${escapeHtml(label)}</b>` : ''}`,
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
    dynamicLayers.clearLayers();
    document.querySelector('#timeline').replaceChildren(errorBox('天气接口不可达，已清除旧天气结论。请稍后重试。'));
    document.querySelector('#station-preview').replaceChildren(errorBox('天气接口不可达，未展示此前地点的站点数值。'));
    document.querySelector('#city-rain-context').replaceChildren(errorBox('本次加载未完成，未展示旧雨情。'));
    document.querySelector('#probe-statement').textContent = '空间探针数据不可达，未沿用此前判断。';
    document.querySelector('#trend-value').textContent = '—';
    document.querySelector('#grid-count').textContent = '—';
    document.querySelector('#nearest-station').textContent = '数据不可达';
    setAllText('[data-place-name]', data.location.name);
    setAllText('[data-place-coord]', `${Number(data.location.lat).toFixed(4)}, ${Number(data.location.lon).toFixed(4)}`);
    setAllText('[data-station-count]', '0');
    setAllText('[data-arrival-time]', '--:--');
    setAllText('[data-risk-headline]', '天气数据不可达');
    setAllText('[data-risk-advice]', '旧结论已清除，请稍后重试。');
    setAllText('[data-observation-time]', '--:--');
    document.querySelectorAll('[data-risk-label]').forEach((element) => {
      element.textContent = '不可达';
      element.dataset.risk = 'low';
    });
    document.querySelectorAll('[data-weather-snapshot]').forEach((element) => element.replaceChildren());
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
    .bindPopup(destinationPopup(data.location, data.analysis.arrivalClock))
    .addTo(dynamicLayers);

  data.probeAnalysis.rows.filter((probe) => probe.id !== 'center').forEach((probe) => {
    L.marker([probe.lat, probe.lon], { icon: markerIcon('probe', probe.direction) })
      .bindTooltip(`${probe.label} · ${probe.precipitation.toFixed(1)} mm`, { direction: 'top' })
      .addTo(dynamicLayers);
  });

  data.stationWeather.forEach((station) => {
    L.marker([station.lat, station.lon], { icon: markerIcon('station', station.id) })
      .bindPopup(stationPopup(station))
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
    ? data.stationWeather.slice(0, 2).map(safeStationCardMarkup).join('')
    : `<div class="empty-card"><b>圈内没有公开参考台站</b><span>这不代表附近没有区域自动站；只是公开站表不足以验证。</span></div>`;

  const cityRain = document.querySelector('#city-rain-context');
  cityRain.innerHTML = data.cityRain
    ? `<b>${Number(data.cityRain.stationCount)}</b><span>个全市水务日雨量站已返回<br>${escapeHtml(data.cityRain.window)}</span>`
    : '<b>—</b><span>水务数据授权待确认，本版未调用</span>';
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
