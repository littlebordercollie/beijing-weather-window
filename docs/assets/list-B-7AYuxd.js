import{c as s,t as o,s as a,S as i}from"./styles-D5AaNiqm.js";function l(e){if(e.error){document.querySelector("#station-list").innerHTML='<div class="panel-error">天气接口暂时不可达，请稍后重试。未使用演示数据替代。</div>';return}document.querySelector("#timeline").innerHTML=o(e.analysis.slots),document.querySelector("#station-list").innerHTML=e.stationWeather.length?e.stationWeather.map(a).join(""):`
      <div class="empty-card empty-card--large">
        <b>${e.radiusKm} km 内没有公开参考台站</b>
        <span>这只代表 DB11/T 1643—2023 的 18 个参考台站中没有点落入范围，不代表附近没有区域自动站。</span>
      </div>
    `,document.querySelector("#probe-list").innerHTML=e.probeAnalysis.rows.map(t=>`
    <article class="probe-row">
      <span class="probe-direction">${t.direction}</span>
      <div><b>${t.label}</b><small>模型网格 ${Number(t.gridLat).toFixed(3)}, ${Number(t.gridLon).toFixed(3)}</small></div>
      <strong>${t.precipitation.toFixed(1)}<small> mm</small></strong>
    </article>
  `).join(""),document.querySelector("#probe-statement").textContent=e.probeAnalysis.statement;const n=document.querySelector("#city-rain-list");n.innerHTML=e.cityRain?`
      <div class="rain-context__summary"><b>${e.cityRain.stationCount}</b><span>个站点行<br><small>${e.cityRain.window}</small></span></div>
      <div class="rain-context__top">
        ${e.cityRain.top.map((t,r)=>`<span><i>0${r+1}</i><b>${t.name}</b><strong>${t.rain.toFixed(1)} mm</strong></span>`).join("")}
      </div>
      <p>水务响应没有经纬度，因此这些站不参与 3/5 km 附近计数。</p>
    `:'<div class="panel-error">北京市水务雨情接口暂时不可达。</div>',document.querySelector("#source-station").href=i.url,document.querySelector("#source-station-date").textContent=i.publishedAt}s({renderView:l});
