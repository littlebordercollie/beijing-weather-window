# 实查证据与复现命令

日期：2026-07-11
说明：本文件只记录本轮实际发出的只读请求、实际返回字段和已知限制。网页内部接口可用于事实核验，不代表获得了长期抓取或再发布许可。

## 1. 北京市水务局日雨量

公开页面：<https://nsbd.swj.beijing.gov.cn/csyq1.html>

页面使用的请求：

```bash
curl -sS 'https://nsbd.swj.beijing.gov.cn/service/jinRainList/list' \
  -H 'Content-Type: application/json' \
  --data-binary '{"queryDate":"2026-07-11"}'
```

本轮对响应做的计数命令：

```bash
curl -sS 'https://nsbd.swj.beijing.gov.cn/service/jinRainList/list' \
  -H 'Content-Type: application/json' \
  --data-binary '{"queryDate":"2026-07-11"}' \
| jq '{
    code,
    dateRange: .data.queryDate,
    totalRows: (.data.rain_data | length),
    stationRows: ([.data.rain_data[] | select(.remark != "统计")] | length),
    aggregateRows: ([.data.rain_data[] | select(.remark == "统计")] | length),
    examples: [
      .data.rain_data[]
      | select(.replace_name == "天安门" or .replace_name == "朝阳" or .replace_name == "乐家花园")
      | {stationCode: .stcdt, name: .replace_name, rainMm: .RNFL}
    ]
  }'
```

实际输出：

```json
{
  "code": 0,
  "dateRange": "2026 年 07 月 10 日 8 时  至 2026 年 07 月 11 日 8 时 ",
  "totalRows": 128,
  "stationRows": 121,
  "aggregateRows": 7,
  "examples": [
    {"stationCode": "30523930", "name": "天安门", "rainMm": 33.80},
    {"stationCode": "30523050", "name": "朝阳", "rainMm": 30.20},
    {"stationCode": "30524000", "name": "乐家花园", "rainMm": 52.20}
  ]
}
```

这里必须写成“121 个站点行 + 7 个统计行”，不能把 128 行都称为站点。

历史日期复核：

```bash
curl -sS 'https://nsbd.swj.beijing.gov.cn/service/jinRainList/list' \
  -H 'Content-Type: application/json' \
  --data-binary '{"queryDate":"2020-07-31"}' \
| jq '{
    code,
    dateRange: .data.queryDate,
    totalRows: (.data.rain_data | length),
    stationRows: ([.data.rain_data[] | select(.remark != "统计")] | length),
    nonzeroStationRows: ([.data.rain_data[] | select(.remark != "统计" and .RNFL > 0)] | length)
  }'
```

实际输出：

```json
{
  "code": 0,
  "dateRange": "2020 年 07 月 30 日 8 时  至 2020 年 07 月 31 日 8 时 ",
  "totalRows": 128,
  "stationRows": 121,
  "nonzeroStationRows": 11
}
```

能够查询这个历史日期，不等于已经证明所有日期都完整、质量一致。若产品要使用历史数据，需要另做连续日期完整性、缺测、异常值和站点变更审计。

## 2. 中国天气网朝阳当前展示字段

核验命令：

```bash
curl -sS 'http://d1.weather.com.cn/sk_2d/101010300.html' \
  -H 'Referer: http://www.weather.com.cn/' \
  -H 'User-Agent: Mozilla/5.0'
```

2026-07-11 约 16:30 返回：

```javascript
var dataSK={
  "nameen":"chaoyang",
  "cityname":"朝阳",
  "city":"101010300",
  "temp":"28.8",
  "WD":"东风",
  "WS":"2级",
  "SD":"84%",
  "qy":"996",
  "time":"16:30",
  "rain":"0",
  "rain24h":"0",
  "weather":"多云"
}
```

这证明中国天气网页面当前响应中存在气温、湿度、气压、雨量等字段，但不能由此推出：

- 数值来自哪一台具体物理站；
- 它是朝阳全部站点的原始数据；
- 该内部地址是稳定、获准复用的正式 API。

因此只把它作为“现有网站公开展示能力”的核验，不纳入 MVP 正式数据源。

## 3. 浏览器核验失败记录

尝试用浏览器打开中国天气网实况地图时，页面导航在 30 秒内超时，浏览器会话随后重置。没有用这次失败访问补写页面内容；页面能力描述来自可访问的公开页面源、官方说明和其他成功请求。

尝试访问北京本地气象服务页面 `https://qxbjwechat.bjpws.com/` 时：

- 正常 HTTPS 请求遇到证书过期；
- 忽略证书校验后返回 403。

因此没有把该站点列为可稳定依赖的数据入口。

## 4. 后续拿到密钥后的最小验证清单

### 和风天气

- 同一北京坐标是否返回 `obsTime`、`pressure`、`precip`；
- 相距 3 km 的五个坐标是否返回不同分钟序列；
- 北京边界内是否始终返回分钟降水；
- 数据更新实际间隔；
- 错误码、限流和过期响应；
- 控制台实际额度与归因要求。

### 高德

- POI 名称歧义；
- 入口/门的坐标精度；
- 骑行、步行和驾车路线的预计时间；
- 坐标系是否全链路保持 GCJ-02。

### 雷达

- RainViewer 当前 `radar.past` 帧数、时间间隔和 `nowcast` 是否为空；
- 北京覆盖和地图错位；
- 数据延迟；
- 个人原型与公开展示授权边界。

## 5. 数据申请问题清单

向北京市气象部门或 SmartWeatherAPI 询问时，至少一次问清：

- 北京区域站站号、站名、站型、经纬度和海拔；
- 温度、湿度、气压、风向、风速、阵风、1/5/10/60 分钟雨量；
- 实际观测时间、入库时间和典型延迟；
- 缺测值、质量控制标志和站点维护状态；
- 历史数据起始日期、时间分辨率和站点迁移记录；
- 请求频率、缓存期限、衍生计算、对外展示和商业化许可；
- 是否允许将数据用于自研临近预报和事后误差评估。
