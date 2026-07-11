export const STATION_SOURCE = {
  title: 'DB11/T 1643—2023 北京市各区推荐参考台站',
  url: 'https://bzh.scjgj.beijing.gov.cn/bzh/apifile/file/2024/20240205/d128a78b-0787-48da-8e7b-384ad60a43a5.pdf',
  publishedAt: '2024-02-05',
};

// 坐标、站号和海拔来自 DB11/T 1643—2023 表 I.1。
// 这些是公开可核验的参考台站，不代表北京所有区域自动站或水务雨量站。
export const REFERENCE_STATIONS = [
  { id: '54398', name: '顺义', region: '顺义区', lat: 40.116667, lon: 116.6, elevation: 29.6 },
  { id: '54399', name: '海淀', region: '海淀区', lat: 39.983333, lon: 116.283333, elevation: 46.9 },
  { id: '54406', name: '延庆', region: '延庆区', lat: 40.433333, lon: 115.966667, elevation: 489.4 },
  { id: '54416', name: '密云', region: '密云区', lat: 40.366667, lon: 116.85, elevation: 73.4 },
  { id: '54419', name: '怀柔', region: '怀柔区', lat: 40.35, lon: 116.616667, elevation: 75.6 },
  { id: '54421', name: '上甸子', region: '密云区（山区）', lat: 40.65, lon: 117.1, elevation: 286.5 },
  { id: '54424', name: '平谷', region: '平谷区', lat: 40.166667, lon: 117.116667, elevation: 32.1 },
  { id: '54431', name: '通州', region: '通州区', lat: 39.9, lon: 116.633333, elevation: 44.5 },
  { id: '54433', name: '朝阳', region: '朝阳区', lat: 39.95, lon: 116.5, elevation: 36.5 },
  { id: '54499', name: '昌平', region: '昌平区', lat: 40.216667, lon: 116.2, elevation: 74.1 },
  { id: '54501', name: '斋堂', region: '门头沟区（山区）', lat: 39.966667, lon: 115.683333, elevation: 441.1 },
  { id: '54505', name: '门头沟', region: '门头沟区', lat: 39.916667, lon: 116.1, elevation: 92.9 },
  { id: '54511', name: '观象台', region: '东城/西城参考', lat: 39.8, lon: 116.466667, elevation: 32.5 },
  { id: '54513', name: '石景山', region: '石景山区', lat: 39.933333, lon: 116.183333, elevation: 67.1 },
  { id: '54514', name: '丰台', region: '丰台区', lat: 39.866667, lon: 116.233333, elevation: 57 },
  { id: '54594', name: '大兴', region: '大兴区', lat: 39.716667, lon: 116.35, elevation: 38.8 },
  { id: '54596', name: '房山', region: '房山区', lat: 39.666667, lon: 116.133333, elevation: 39.2 },
  { id: '54597', name: '霞云岭', region: '房山区（山区）', lat: 39.716667, lon: 115.733333, elevation: 409.4 },
];

export const DEFAULT_LOCATION = {
  name: '朝阳公园南门',
  displayName: '朝阳公园南门 · 北京市朝阳区',
  lat: 39.932582,
  lon: 116.476949,
};
