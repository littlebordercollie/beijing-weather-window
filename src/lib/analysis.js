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

function slotAtOrBefore(times, target) {
  for (let index = times.length - 1; index >= 0; index -= 1) {
    if (parseBeijingTime(times[index]) <= target) return index;
  }
  return 0;
}

function isFreezingPrecipitation(weatherCode) {
  return [56, 57, 66, 67].includes(Number(weatherCode));
}

function isThunderstorm(weatherCode) {
  return [95, 96, 99].includes(Number(weatherCode));
}

function riskFrom(precipitation, weatherCode, probability = 0) {
  if (isThunderstorm(weatherCode) || isFreezingPrecipitation(weatherCode) || precipitation >= 1.5) {
    return { key: 'high', label: '高风险', score: 3 };
  }
  if (precipitation >= 0.2 || probability >= 60 || weatherCode >= 61) return { key: 'medium', label: '中风险', score: 2 };
  return { key: 'low', label: '低风险', score: 1 };
}

function formatClock(date) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

function hourlyProbabilityAt(hourly, target) {
  if (!hourly?.time?.length) return 0;
  const index = slotAtOrBefore(hourly.time, target);
  return Number(hourly.precipitation_probability?.[index] ?? 0);
}

function findDryWindow(times, precipitation, weatherCodes, hourly, fromIndex, minSlots = 2) {
  let start = null;
  for (let i = fromIndex; i < Math.min(times.length, fromIndex + 12); i += 1) {
    const slotTime = parseBeijingTime(times[i]);
    const probability = hourlyProbabilityAt(hourly, slotTime);
    const weatherCode = Number(weatherCodes?.[i] ?? 0);
    const isLowRain = Number(precipitation[i] ?? 0) <= 0.1;
    const isHazardous = isThunderstorm(weatherCode) || isFreezingPrecipitation(weatherCode);
    if (isLowRain && !isHazardous && probability < 60) {
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
  const probability = hourlyProbabilityAt(weather.hourly, arrival);
  const currentProbability = hourlyProbabilityAt(weather.hourly, now);
  const currentRisk = riskFrom(
    Number(weather.current.precipitation ?? 0),
    Number(weather.current.weather_code ?? 0),
    currentProbability,
  );
  const arrivalRisk = riskFrom(arrivalPrecipitation, arrivalCode, probability);
  const journeyStart = Math.min(nowIndex, arrivalIndex);
  const journeyEnd = Math.max(nowIndex, arrivalIndex);
  const journeyRisks = timeline.time.slice(journeyStart, journeyEnd + 1).map((time, offset) => {
    const index = journeyStart + offset;
    const precipitation = Number(timeline.precipitation[index] ?? 0);
    const code = Number(timeline.weather_code[index] ?? 0);
    return {
      time,
      code,
      risk: riskFrom(precipitation, code, hourlyProbabilityAt(weather.hourly, parseBeijingTime(time))),
    };
  });
  const risk = [currentRisk, arrivalRisk, ...journeyRisks.map((slot) => slot.risk)]
    .reduce((highest, candidate) => candidate.score > highest.score ? candidate : highest, currentRisk);
  const dryWindow = findDryWindow(
    timeline.time,
    timeline.precipitation,
    timeline.weather_code,
    weather.hourly,
    nowIndex,
  );

  const nextSlots = timeline.precipitation.slice(nowIndex, nowIndex + 8).map(Number);
  const firstHalf = nextSlots.slice(0, 4).reduce((sum, value) => sum + value, 0);
  const secondHalf = nextSlots.slice(4, 8).reduce((sum, value) => sum + value, 0);
  const trend = secondHalf > firstHalf + 0.4 ? '增强' : secondHalf + 0.4 < firstHalf ? '减弱' : '变化不大';

  let headline = `到达时预计${weatherLabel(arrivalCode)}`;
  if (risk.score > arrivalRisk.score) {
    const firstHazard = journeyRisks.find((slot) => slot.risk.score === risk.score);
    if (firstHazard) headline = `途中 ${formatClock(parseBeijingTime(firstHazard.time))} 前后${weatherLabel(firstHazard.code)}`;
  }
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
  if (arrivalPrecipitation > 0 && risk.score === arrivalRisk.score) {
    headline = `到达时约 ${arrivalPrecipitation.toFixed(1)} mm / 15 分钟`;
  }

  const timelineEnd = Math.max(nowIndex + 8, arrivalIndex + 1);
  const slots = timeline.time.slice(nowIndex, timelineEnd).map((time, offset) => {
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
    statement = `${wettest.direction}侧格点雨信号更强；这只是同一时刻的空间差异，不能据此判断雨区移动方向。`;
  }
  return { rows, uniqueGridCount, spread, statement };
}
