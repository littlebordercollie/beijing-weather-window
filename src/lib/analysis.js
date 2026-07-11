const WMO_LABELS = new Map([
  [0, '晴朗'], [1, '大部晴朗'], [2, '局部多云'], [3, '阴天'],
  [45, '有雾'], [48, '雾凇'], [51, '轻微毛毛雨'], [53, '毛毛雨'], [55, '较强毛毛雨'],
  [56, '轻微冻毛毛雨'], [57, '冻毛毛雨'], [61, '小雨'], [63, '中雨'], [65, '大雨'],
  [66, '轻微冻雨'], [67, '冻雨'], [71, '小雪'], [73, '中雪'], [75, '大雪'],
  [77, '米雪'], [80, '小阵雨'], [81, '中阵雨'], [82, '强阵雨'], [85, '小阵雪'],
  [86, '强阵雪'], [95, '雷暴'], [96, '雷暴伴小冰雹'], [99, '强雷暴伴冰雹'],
]);

function parseBeijingTime(value) {
  if (!value) return new Date(NaN);
  return new Date(`${value}:00+08:00`);
}

function slotAtOrAfter(times, target) {
  const index = times.findIndex((time) => parseBeijingTime(time) >= target);
  return index === -1 ? times.length - 1 : index;
}

function riskFrom(precipitation, weatherCode, probability = 0) {
  if (weatherCode >= 95 || precipitation >= 1.5) return { key: 'high', label: '高风险', score: 3 };
  if (precipitation >= 0.2 || probability >= 60 || weatherCode >= 61) return { key: 'medium', label: '中风险', score: 2 };
  return { key: 'low', label: '低风险', score: 1 };
}

function formatClock(date) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

function findDryWindow(times, precipitation, fromIndex, minSlots = 2) {
  let start = null;
  for (let i = fromIndex; i < Math.min(times.length, fromIndex + 12); i += 1) {
    if ((precipitation[i] ?? 0) <= 0.1) {
      if (start === null) start = i;
      if (i - start + 1 >= minSlots) {
        return { start: parseBeijingTime(times[start]), end: parseBeijingTime(times[i]) };
      }
    } else {
      start = null;
    }
  }
  return null;
}

export function weatherLabel(code) {
  return WMO_LABELS.get(Number(code)) ?? '天气变化';
}

export function analyzeWeather(weather, etaMinutes, now = new Date()) {
  const timeline = weather.minutely_15;
  const arrival = new Date(now.getTime() + etaMinutes * 60_000);
  const nowIndex = slotAtOrAfter(timeline.time, now);
  const arrivalIndex = slotAtOrAfter(timeline.time, arrival);
  const arrivalPrecipitation = Number(timeline.precipitation[arrivalIndex] ?? 0);
  const arrivalCode = Number(timeline.weather_code[arrivalIndex] ?? weather.current.weather_code ?? 0);
  const hourIndex = weather.hourly?.time
    ? slotAtOrAfter(weather.hourly.time, arrival)
    : 0;
  const probability = Number(weather.hourly?.precipitation_probability?.[hourIndex] ?? 0);
  const currentRisk = riskFrom(Number(weather.current.precipitation ?? 0), Number(weather.current.weather_code ?? 0), probability);
  const arrivalRisk = riskFrom(arrivalPrecipitation, arrivalCode, probability);
  const risk = currentRisk.score >= arrivalRisk.score ? currentRisk : arrivalRisk;
  const dryWindow = findDryWindow(timeline.time, timeline.precipitation, nowIndex);

  const nextSlots = timeline.precipitation.slice(nowIndex, nowIndex + 8).map(Number);
  const firstHalf = nextSlots.slice(0, 4).reduce((sum, value) => sum + value, 0);
  const secondHalf = nextSlots.slice(4, 8).reduce((sum, value) => sum + value, 0);
  const trend = secondHalf > firstHalf + 0.4 ? '增强' : secondHalf + 0.4 < firstHalf ? '减弱' : '变化不大';

  let headline = `到达时预计${weatherLabel(arrivalCode)}`;
  let advice = '可按计划出发，仍建议出门前再次刷新。';
  if (risk.key === 'high') {
    advice = dryWindow
      ? `降雨或雷暴风险偏高，${formatClock(dryWindow.start)} 后出现短暂低雨窗口。`
      : '降雨或雷暴风险偏高，未来两小时内暂未找到稳定低雨窗口。';
  } else if (risk.key === 'medium') {
    advice = dryWindow
      ? `有被雨淋到的可能，${formatClock(dryWindow.start)}—${formatClock(dryWindow.end)} 相对更稳。`
      : '存在阵雨可能，建议携带雨具并在出发前再次刷新。';
  }
  if (arrivalPrecipitation > 0) headline = `到达时约 ${arrivalPrecipitation.toFixed(1)} mm / 15 分钟`;

  const slots = timeline.time.slice(nowIndex, nowIndex + 8).map((time, offset) => {
    const index = nowIndex + offset;
    return {
      time,
      clock: formatClock(parseBeijingTime(time)),
      precipitation: Number(timeline.precipitation[index] ?? 0),
      code: Number(timeline.weather_code[index] ?? 0),
      label: weatherLabel(timeline.weather_code[index]),
      isArrival: index === arrivalIndex,
    };
  });

  return {
    arrival,
    arrivalClock: formatClock(arrival),
    arrivalPrecipitation,
    arrivalCode,
    probability,
    risk,
    headline,
    advice,
    trend,
    dryWindow,
    slots,
  };
}

export function analyzeProbeSpread(probes, weatherResults, arrival) {
  const rows = probes.map((probe, index) => {
    const weather = weatherResults[index];
    const slot = slotAtOrAfter(weather.minutely_15.time, arrival);
    return {
      ...probe,
      gridLat: weather.latitude,
      gridLon: weather.longitude,
      precipitation: Number(weather.minutely_15.precipitation[slot] ?? 0),
      code: Number(weather.minutely_15.weather_code[slot] ?? 0),
    };
  });
  const uniqueGridCount = new Set(rows.map((row) => `${Number(row.gridLat).toFixed(3)},${Number(row.gridLon).toFixed(3)}`)).size;
  const directional = rows.filter((row) => row.id !== 'center').sort((a, b) => b.precipitation - a.precipitation);
  const wettest = directional[0];
  const driest = directional[directional.length - 1];
  const spread = wettest.precipitation - driest.precipitation;

  let statement = '周边格点的降雨信号接近，暂不推断明确移动方向。';
  if (uniqueGridCount < 3) {
    statement = `5 个探针只落入 ${uniqueGridCount} 个独立模型网格，空间证据不足，不推断雨带方向。`;
  } else if (spread >= 0.3) {
    statement = `${wettest.direction}侧格点雨信号更强，雨区可能从${wettest.direction}侧影响目的地；仍需雷达验证。`;
  }
  return { rows, uniqueGridCount, spread, statement };
}
