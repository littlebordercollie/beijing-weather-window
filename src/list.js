import { STATION_SOURCE } from './data/stations.js';
import { createDashboard, stationCardMarkup, timelineMarkup } from './dashboard.js';
import './styles.css';

function renderList(data) {
  if (data.error) {
    document.querySelector('#station-list').innerHTML = '<div class="panel-error">天气接口暂时不可达，请稍后重试。未使用演示数据替代。</div>';
    return;
  }

  document.querySelector('#timeline').innerHTML = timelineMarkup(data.analysis.slots);
  document.querySelector('#station-list').innerHTML = data.stationWeather.length
    ? data.stationWeather.map(stationCardMarkup).join('')
    : `
      <div class="empty-card empty-card--large">
        <b>${data.radiusKm} km 内没有公开参考台站</b>
        <span>这只代表 DB11/T 1643—2023 的 18 个参考台站中没有点落入范围，不代表附近没有区域自动站。</span>
      </div>
    `;

  document.querySelector('#probe-list').innerHTML = data.probeAnalysis.rows.map((probe) => `
    <article class="probe-row">
      <span class="probe-direction">${probe.direction}</span>
      <div><b>${probe.label}</b><small>模型网格 ${Number(probe.gridLat).toFixed(3)}, ${Number(probe.gridLon).toFixed(3)}</small></div>
      <strong>${probe.precipitation.toFixed(1)}<small> mm</small></strong>
    </article>
  `).join('');
  document.querySelector('#probe-statement').textContent = data.probeAnalysis.statement;

  const cityRain = document.querySelector('#city-rain-list');
  cityRain.innerHTML = data.cityRain
    ? `
      <div class="rain-context__summary"><b>${data.cityRain.stationCount}</b><span>个站点行<br><small>${data.cityRain.window}</small></span></div>
      <div class="rain-context__top">
        ${data.cityRain.top.map((row, index) => `<span><i>0${index + 1}</i><b>${row.name}</b><strong>${row.rain.toFixed(1)} mm</strong></span>`).join('')}
      </div>
      <p>水务响应没有经纬度，因此这些站不参与 3/5 km 附近计数。</p>
    `
    : '<div class="panel-error">北京市水务雨情接口暂时不可达。</div>';

  document.querySelector('#source-station').href = STATION_SOURCE.url;
  document.querySelector('#source-station-date').textContent = STATION_SOURCE.publishedAt;
}

createDashboard({ renderView: renderList });
