import { STATION_SOURCE } from './data/stations.js';
import { createDashboard, stationCardMarkup, timelineMarkup } from './dashboard.js';
import './styles.css';

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

function renderList(data) {
  if (data.error) {
    document.querySelector('#timeline').replaceChildren(errorBox('天气接口暂时不可达，旧时间线已清除。'));
    document.querySelector('#station-list').replaceChildren(errorBox('天气接口暂时不可达，未展示此前地点的站点数值。'));
    document.querySelector('#probe-list').replaceChildren();
    document.querySelector('#city-rain-list').replaceChildren(errorBox('本次加载未完成，未展示旧雨情。'));
    document.querySelector('#probe-statement').textContent = '空间探针数据不可达，未沿用此前判断。';
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

  document.querySelector('#timeline').innerHTML = timelineMarkup(data.analysis.slots);
  document.querySelector('#station-list').innerHTML = data.stationWeather.length
    ? data.stationWeather.map(safeStationCardMarkup).join('')
    : `
      <div class="empty-card empty-card--large">
        <b>${data.radiusKm} km 内没有公开参考台站</b>
        <span>这只代表 DB11/T 1643—2023 的 18 个参考台站中没有点落入范围，不代表附近没有区域自动站。</span>
      </div>
    `;

  document.querySelector('#probe-list').innerHTML = data.probeAnalysis.rows.map((probe) => `
    <article class="probe-row">
      <span class="probe-direction">${escapeHtml(probe.direction)}</span>
      <div><b>${escapeHtml(probe.label)}</b><small>模型网格 ${Number(probe.gridLat).toFixed(3)}, ${Number(probe.gridLon).toFixed(3)}</small></div>
      <strong>${probe.precipitation.toFixed(1)}<small> mm</small></strong>
    </article>
  `).join('');
  document.querySelector('#probe-statement').textContent = data.probeAnalysis.statement;

  const cityRain = document.querySelector('#city-rain-list');
  cityRain.innerHTML = data.cityRain
    ? `
      <div class="rain-context__summary"><b>${Number(data.cityRain.stationCount)}</b><span>个站点行<br><small>${escapeHtml(data.cityRain.window)}</small></span></div>
      <div class="rain-context__top">
        ${data.cityRain.top.map((row, index) => `<span><i>0${index + 1}</i><b>${escapeHtml(row.name)}</b><strong>${Number(row.rain).toFixed(1)} mm</strong></span>`).join('')}
      </div>
      <p>水务响应没有经纬度，因此这些站不参与 3/5 km 附近计数。</p>
    `
    : '<div class="panel-error">水务数据授权待确认，本版仅提供官方页链接，未调用数据接口。</div>';

  document.querySelector('#source-station').href = STATION_SOURCE.url;
  document.querySelector('#source-station-date').textContent = STATION_SOURCE.publishedAt;
}

createDashboard({ renderView: renderList });
