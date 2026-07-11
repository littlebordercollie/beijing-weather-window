import { REFERENCE_STATIONS } from './data/stations.js';
import { analyzeProbeSpread, analyzeWeather, weatherLabel } from './lib/analysis.js';
import { fetchWeather, geocodePlace } from './lib/api.js';
import { haversineKm, makeProbePoints, nearbyStations } from './lib/geo.js';
import { readState, writeState } from './lib/state.js';

const fmt = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false,
});
const fullFmt = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});
const AUTO_REFRESH_MS = 10 * 60 * 1000;

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function addMinutesToIso(time, minutes) {
  const date = new Date(`${time}:00+08:00`);
  date.setMinutes(date.getMinutes() + minutes);
  return fmt.format(date);
}

function formatCoord(value) {
  return Number(value).toFixed(4);
}

function renderSearchResults(container, results, choose) {
  if (!results.length) {
    container.innerHTML = '<div class="search-empty">没有找到北京范围内的匹配地点，可以直接在地图上点选。</div>';
    container.hidden = false;
    return;
  }
  container.innerHTML = results.map((result, index) => `
    <button type="button" class="search-result" data-result-index="${index}">
      <span class="search-result__pin">⌖</span>
      <span><strong>${escapeHtml(result.displayName.split(',')[0])}</strong><small>${escapeHtml(result.displayName)}</small></span>
    </button>
  `).join('');
  container.hidden = false;
  container.querySelectorAll('[data-result-index]').forEach((button) => {
    button.addEventListener('click', () => choose(results[Number(button.dataset.resultIndex)]));
  });
}

export function createDashboard({ renderView, onLocationChange }) {
  let state = readState();
  let requestId = 0;
  let refreshTimer;
  let weatherController;
  const elements = {
    form: document.querySelector('#location-form'),
    input: document.querySelector('#location-input'),
    searchResults: document.querySelector('#search-results'),
    submit: document.querySelector('#search-submit'),
    locate: document.querySelector('#locate-button'),
    eta: document.querySelector('#eta-input'),
    etaValue: document.querySelector('#eta-value'),
    radiusButtons: [...document.querySelectorAll('[data-radius]')],
    status: document.querySelector('#data-status'),
    placeName: document.querySelectorAll('[data-place-name]'),
    placeCoord: document.querySelectorAll('[data-place-coord]'),
    stationCount: document.querySelectorAll('[data-station-count]'),
    arrivalTime: document.querySelectorAll('[data-arrival-time]'),
    riskLabel: document.querySelectorAll('[data-risk-label]'),
    riskHeadline: document.querySelectorAll('[data-risk-headline]'),
    riskAdvice: document.querySelectorAll('[data-risk-advice]'),
    observationTime: document.querySelectorAll('[data-observation-time]'),
    weatherSnapshot: document.querySelectorAll('[data-weather-snapshot]'),
  };

  function syncControls() {
    elements.input.value = state.location.name;
    elements.eta.value = state.etaMinutes;
    elements.etaValue.textContent = `${state.etaMinutes} 分钟`;
    elements.radiusButtons.forEach((button) => {
      const active = Number(button.dataset.radius) === state.radiusKm;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    writeState(state);
  }

  function setStatus(message, stateName = 'loading') {
    elements.status.dataset.state = stateName;
    elements.status.replaceChildren();
    const dot = document.createElement('span');
    dot.className = 'status-dot';
    elements.status.append(dot, document.createTextNode(message));
  }

  function clearWeatherText() {
    elements.riskLabel.forEach((el) => {
      el.textContent = '数据过期';
      el.dataset.risk = 'unknown';
    });
    elements.riskHeadline.forEach((el) => { el.textContent = '无法生成当前判断'; });
    elements.riskAdvice.forEach((el) => { el.textContent = '请稍后手动重试，强对流天气以官方预警为准。'; });
    elements.observationTime.forEach((el) => { el.textContent = '—'; });
    elements.weatherSnapshot.forEach((el) => { el.replaceChildren(); });
  }

  function setCommonText(data) {
    const { location, nearby, analysis, targetWeather } = data;
    elements.placeName.forEach((el) => { el.textContent = location.name; });
    elements.placeCoord.forEach((el) => { el.textContent = `${formatCoord(location.lat)}, ${formatCoord(location.lon)}`; });
    elements.stationCount.forEach((el) => { el.textContent = String(nearby.length); });
    elements.arrivalTime.forEach((el) => { el.textContent = analysis.arrivalClock; });
    elements.riskLabel.forEach((el) => {
      el.textContent = analysis.risk.label;
      el.dataset.risk = analysis.risk.key;
    });
    elements.riskHeadline.forEach((el) => { el.textContent = analysis.headline; });
    elements.riskAdvice.forEach((el) => { el.textContent = analysis.advice; });
    elements.observationTime.forEach((el) => { el.textContent = targetWeather.current.time.replace('T', ' '); });
    elements.weatherSnapshot.forEach((el) => {
      el.innerHTML = `
        <span><b>${Number(targetWeather.current.temperature_2m).toFixed(1)}°</b> 温度</span>
        <span><b>${Number(targetWeather.current.surface_pressure).toFixed(0)}</b> hPa</span>
        <span><b>${Number(targetWeather.current.relative_humidity_2m).toFixed(0)}%</b> 湿度</span>
        <span><b>${Number(targetWeather.current.wind_speed_10m).toFixed(1)}</b> km/h 风</span>
      `;
    });
  }

  async function load() {
    window.clearTimeout(refreshTimer);
    weatherController?.abort();
    weatherController = new AbortController();
    const currentRequest = ++requestId;
    setStatus('正在对齐站点、格点与到达时刻…');
    const nearby = nearbyStations(state.location, REFERENCE_STATIONS, state.radiusKm);
    const probes = makeProbePoints(state.location, state.radiusKm);
    const points = [...probes, ...nearby];
    try {
      const weatherResults = await fetchWeather(points, { signal: weatherController.signal });
      if (currentRequest !== requestId) return;
      const weather = weatherResults;
      if (weather.length !== points.length) throw new Error('天气格点返回数量不完整');
      const targetWeather = weather[0];
      if (!targetWeather?.current || !targetWeather?.minutely_15?.time?.length) {
        throw new Error('天气数据结构不完整');
      }
      const analysis = analyzeWeather(targetWeather, state.etaMinutes);
      const probeAnalysis = analyzeProbeSpread(probes, weather.slice(0, probes.length), analysis.arrival);
      const nextCheckTime = fmt.format(new Date(Date.now() + AUTO_REFRESH_MS));
      const stationWeather = nearby.map((station, index) => {
        const stationGrid = weather[probes.length + index];
        return {
          ...station,
          gridWeather: stationGrid,
          gridTime: stationGrid.current.time,
          gridIntervalEnd: addMinutesToIso(stationGrid.current.time, stationGrid.current.interval / 60),
          nextCheckTime,
          condition: weatherLabel(stationGrid.current.weather_code),
        };
      });
      const data = {
        ...state,
        nearby,
        stationWeather,
        probes,
        probeAnalysis,
        targetWeather,
        analysis,
        targetGridDistanceKm: haversineKm(state.location, {
          lat: Number(targetWeather.latitude), lon: Number(targetWeather.longitude),
        }),
        fetchedAt: new Date(),
        cityRain: null,
        cityRainUnavailableReason: '公开使用授权待确认，本版未调用水务接口',
      };
      setCommonText(data);
      renderView(data);
      const offsetWarning = data.targetGridDistanceKm > state.radiusKm
        ? ` · 注意：目标格点偏离 ${data.targetGridDistanceKm.toFixed(1)} km`
        : '';
      setStatus(`更新 ${fullFmt.format(data.fetchedAt)} · ${nearby.length} 个参考台站 · ${nextCheckTime} 再检查${offsetWarning}`, 'ready');
    } catch (error) {
      if (currentRequest !== requestId) return;
      clearWeatherText();
      setStatus(`数据暂时不可达：${error.name === 'AbortError' ? '请求超时' : error.message}`, 'error');
      renderView({ ...state, nearby, error });
    } finally {
      if (currentRequest === requestId) refreshTimer = window.setTimeout(load, AUTO_REFRESH_MS);
    }
  }

  function chooseLocation(location) {
    state = { ...state, location };
    syncControls();
    elements.searchResults.hidden = true;
    onLocationChange?.(location, state.radiusKm);
    load();
  }

  elements.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = elements.input.value.trim();
    if (!query) return;
    elements.submit.disabled = true;
    elements.submit.textContent = '搜索中';
    try {
      const results = await geocodePlace(query);
      renderSearchResults(elements.searchResults, results, chooseLocation);
    } catch (error) {
      elements.searchResults.replaceChildren();
      const message = document.createElement('div');
      message.className = 'search-empty';
      message.textContent = '地点服务暂时不可达，可输入北京经纬度或在地图上点选。';
      elements.searchResults.append(message);
      elements.searchResults.hidden = false;
      setStatus(`地点搜索失败：${error.name === 'AbortError' ? '请求超时' : error.message}`, 'error');
    } finally {
      elements.submit.disabled = false;
      elements.submit.textContent = '定位';
    }
  });

  elements.eta.addEventListener('input', () => {
    state.etaMinutes = Number(elements.eta.value);
    elements.etaValue.textContent = `${state.etaMinutes} 分钟`;
  });
  elements.eta.addEventListener('change', () => {
    syncControls();
    load();
  });
  elements.radiusButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.radiusKm = Number(button.dataset.radius);
      syncControls();
      onLocationChange?.(state.location, state.radiusKm);
      load();
    });
  });
  elements.locate?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      setStatus('当前浏览器不支持定位，请搜索或在地图点选。', 'error');
      return;
    }
    setStatus('正在读取设备位置…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const lat = Number(coords.latitude.toFixed(4));
        const lon = Number(coords.longitude.toFixed(4));
        chooseLocation({ name: '我的位置（约）', displayName: '设备定位点（已降低精度）', lat, lon });
      },
      () => setStatus('无法取得设备位置，请检查浏览器定位权限。', 'error'),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  });
  document.addEventListener('click', (event) => {
    if (!elements.searchResults.contains(event.target) && event.target !== elements.input) {
      elements.searchResults.hidden = true;
    }
  });

  syncControls();
  onLocationChange?.(state.location, state.radiusKm);
  load();

  return {
    chooseLocation,
    reload: load,
    getState: () => state,
  };
}

export function timelineMarkup(slots) {
  return slots.map((slot) => {
    const height = Math.max(4, Math.min(100, slot.precipitation * 42));
    return `
      <div class="timeline-slot ${slot.isArrival ? 'is-arrival' : ''}">
        <span class="timeline-slot__time">${slot.clock}</span>
        <div class="timeline-slot__bar"><i style="height:${height}%"></i></div>
        <b>${slot.precipitation.toFixed(1)}</b>
        <small>${escapeHtml(slot.label)}</small>
      </div>
    `;
  }).join('');
}

export function stationCardMarkup(station) {
  const weather = station.gridWeather.current;
  return `
    <article class="station-card" data-station-id="${station.id}">
      <div class="station-card__head">
        <span class="station-code">${station.id}</span>
        <span class="distance-pill">${station.distanceKm.toFixed(1)} km</span>
      </div>
      <h3>${escapeHtml(station.name)}参考台站</h3>
      <p>${escapeHtml(station.region)} · 海拔 ${station.elevation.toFixed(1)} m</p>
      <div class="station-reading">
        <strong>${Number(weather.temperature_2m).toFixed(1)}<sup>°C</sup></strong>
        <span>${escapeHtml(station.condition)}<br>${Number(weather.precipitation).toFixed(1)} mm / 15 min</span>
      </div>
      <dl>
        <div><dt>站旁格点时次</dt><dd>${station.gridTime.slice(11)}</dd></div>
        <div><dt>当前值时段至</dt><dd>${station.gridIntervalEnd}</dd></div>
        <div><dt>下次页面检查</dt><dd>${station.nextCheckTime}</dd></div>
        <div><dt>气压 / 湿度</dt><dd>${Number(weather.surface_pressure).toFixed(0)} hPa · ${Number(weather.relative_humidity_2m).toFixed(0)}%</dd></div>
      </dl>
      <div class="evidence-label"><i></i>站点坐标真实 · 数值为站旁格点估计</div>
    </article>
  `;
}
