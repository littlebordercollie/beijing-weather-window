import{c,t as s,S as l,s as m}from"./styles-DcxmF4cm.js";function r(e=""){return String(e).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}function o(e){const n=document.createElement("div");return n.className="panel-error",n.textContent=e,n}function i(e,n){document.querySelectorAll(e).forEach(t=>{t.textContent=n})}function d(e){return m({...e,id:r(e.id),gridTime:r(e.gridTime),gridIntervalEnd:r(e.gridIntervalEnd),nextCheckTime:r(e.nextCheckTime)})}function u(e){if(e.error){document.querySelector("#timeline").replaceChildren(o("天气接口暂时不可达，旧时间线已清除。")),document.querySelector("#station-list").replaceChildren(o("天气接口暂时不可达，未展示此前地点的站点数值。")),document.querySelector("#probe-list").replaceChildren(),document.querySelector("#city-rain-list").replaceChildren(o("本次加载未完成，未展示旧雨情。")),document.querySelector("#probe-statement").textContent="空间探针数据不可达，未沿用此前判断。",i("[data-place-name]",e.location.name),i("[data-place-coord]",`${Number(e.location.lat).toFixed(4)}, ${Number(e.location.lon).toFixed(4)}`),i("[data-station-count]","0"),i("[data-arrival-time]","--:--"),i("[data-risk-headline]","天气数据不可达"),i("[data-risk-advice]","旧结论已清除，请稍后重试。"),i("[data-observation-time]","--:--"),document.querySelectorAll("[data-risk-label]").forEach(t=>{t.textContent="不可达",t.dataset.risk="low"}),document.querySelectorAll("[data-weather-snapshot]").forEach(t=>t.replaceChildren());return}document.querySelector("#timeline").innerHTML=s(e.analysis.slots),document.querySelector("#station-list").innerHTML=e.stationWeather.length?e.stationWeather.map(d).join(""):`
      <div class="empty-card empty-card--large">
        <b>${e.radiusKm} km 内没有公开参考台站</b>
        <span>这只代表 DB11/T 1643—2023 的 18 个参考台站中没有点落入范围，不代表附近没有区域自动站。</span>
      </div>
    `,document.querySelector("#probe-list").innerHTML=e.probeAnalysis.rows.map(t=>`
    <article class="probe-row">
      <span class="probe-direction">${r(t.direction)}</span>
      <div><b>${r(t.label)}</b><small>模型网格 ${Number(t.gridLat).toFixed(3)}, ${Number(t.gridLon).toFixed(3)}</small></div>
      <strong>${t.precipitation.toFixed(1)}<small> mm</small></strong>
    </article>
  `).join(""),document.querySelector("#probe-statement").textContent=e.probeAnalysis.statement;const n=document.querySelector("#city-rain-list");n.innerHTML=e.cityRain?`
      <div class="rain-context__summary"><b>${Number(e.cityRain.stationCount)}</b><span>个站点行<br><small>${r(e.cityRain.window)}</small></span></div>
      <div class="rain-context__top">
        ${e.cityRain.top.map((t,a)=>`<span><i>0${a+1}</i><b>${r(t.name)}</b><strong>${Number(t.rain).toFixed(1)} mm</strong></span>`).join("")}
      </div>
      <p>水务响应没有经纬度，因此这些站不参与 3/5 km 附近计数。</p>
    `:'<div class="panel-error">水务数据授权待确认，本版仅提供官方页链接，未调用数据接口。</div>',document.querySelector("#source-station").href=l.url,document.querySelector("#source-station-date").textContent=l.publishedAt}c({renderView:u});
