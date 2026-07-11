// 常用地点坐标在 2026-07-11 逐项核验，用于常用查询的无网络降级。
export const POPULAR_PLACES = [
  { name: '北京大学', displayName: '北京大学 · 海淀区颐和园路 5 号', lat: 39.9918215, lon: 116.3039468, aliases: ['北大'] },
  { name: '清华大学', displayName: '清华大学 · 海淀区双清路 30 号', lat: 40.0022905, lon: 116.320963, aliases: ['清华'] },
  { name: '朝阳公园南门', displayName: '朝阳公园南门 · 朝阳区朝阳公园南路', lat: 39.9322961, lon: 116.4766377, aliases: ['朝阳公园'] },
  { name: '望京 SOHO', displayName: '望京 SOHO · 朝阳区阜安路', lat: 39.9955951, lon: 116.4748195, aliases: ['望京soho', '望京'] },
  { name: '国家体育场（鸟巢）', displayName: '国家体育场（鸟巢）· 朝阳区奥运村', lat: 39.9914041, lon: 116.3902864, aliases: ['鸟巢', '国家体育场'] },
  { name: '故宫博物院', displayName: '故宫博物院 · 东城区景山前街 4 号', lat: 39.9174311, lon: 116.3907817, aliases: ['故宫'] },
  { name: '北京南站', displayName: '北京南站 · 丰台区', lat: 39.8651758, lon: 116.3710384, aliases: ['南站'] },
  { name: '北京西站', displayName: '北京西站 · 丰台区', lat: 39.8936695, lon: 116.3151027, aliases: ['西站'] },
  { name: '北京首都国际机场', displayName: '北京首都国际机场 · 顺义区', lat: 40.0802322, lon: 116.5938886, aliases: ['首都机场', '首都国际机场'] },
  { name: '北京大兴国际机场', displayName: '北京大兴国际机场 · 大兴机场片区', lat: 39.4973423, lon: 116.4123149, aliases: ['大兴机场', '大兴国际机场'] },
  { name: '颐和园', displayName: '颐和园 · 海淀区', lat: 39.9900983, lon: 116.2647403, aliases: [] },
];

function normalized(value) {
  return value.toLowerCase().replace(/[\s·（）()]/g, '');
}

export function searchPopularPlaces(query) {
  const needle = normalized(query.replace(/北京$/, ''));
  if (!needle) return [];
  return POPULAR_PLACES.filter((place) => {
    const candidates = [place.name, place.displayName, ...place.aliases].map(normalized);
    return candidates.some((candidate) => candidate.includes(needle));
  }).map((place) => ({ ...place, type: 'verified-local-index' }));
}
