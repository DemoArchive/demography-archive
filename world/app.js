(function(){
"use strict";

/* ==================== 数据层 ==================== */
var T = window.TFR;                   /* {years, world, list[{c,n,en,v[]}]} */
var Y = T.years;
var W = T.world;
var LIST = T.list;
var byIso = {};
LIST.forEach(function(r){ byIso[r.c] = r; });

var year = Y[Y.length - 1];
var selected = null;                  /* ISO3 码 */

/* 地图要素英文名 → ISO3（ECharts world.json 名称体系） */
var EN2ISO = {
  'Somalia':'SOM','Liechtenstein':'LIE','Morocco':'MAR','Serbia':'SRB','Afghanistan':'AFG',
  'Angola':'AGO','Albania':'ALB','Andorra':'AND','United Arab Emirates':'ARE','Argentina':'ARG',
  'Armenia':'ARM','American Samoa':'ASM','Antigua and Barb.':'ATG','Australia':'AUS','Austria':'AUT',
  'Azerbaijan':'AZE','Burundi':'BDI','Belgium':'BEL','Benin':'BEN','Burkina Faso':'BFA',
  'Bangladesh':'BGD','Bulgaria':'BGR','Bahrain':'BHR','Bahamas':'BHS','Bosnia and Herz.':'BIH',
  'Belarus':'BLR','Belize':'BLZ','Bermuda':'BMU','Bolivia':'BOL','Brazil':'BRA','Barbados':'BRB',
  'Brunei':'BRN','Bhutan':'BTN','Botswana':'BWA','Central African Rep.':'CAF','Canada':'CAN',
  'Switzerland':'CHE','Chile':'CHL','China':'CHN',"C\u00f4te d'Ivoire":'CIV','Cameroon':'CMR',
  'Dem. Rep. Congo':'COD','Congo':'COG','Colombia':'COL','Comoros':'COM','Cape Verde':'CPV',
  'Costa Rica':'CRI','Cuba':'CUB','Cura\u00e7ao':'CUW','Cayman Is.':'CYM','Cyprus':'CYP',
  'Czech Rep.':'CZE','Germany':'DEU','Djibouti':'DJI','Dominica':'DMA','Denmark':'DNK',
  'Dominican Rep.':'DOM','Algeria':'DZA','Ecuador':'ECU','Egypt':'EGY','Eritrea':'ERI',
  'Spain':'ESP','Estonia':'EST','Ethiopia':'ETH','Finland':'FIN','Fiji':'FJI','France':'FRA',
  'Faeroe Is.':'FRO','Micronesia':'FSM','Gabon':'GAB','United Kingdom':'GBR','Georgia':'GEO',
  'Ghana':'GHA','Guinea':'GIN','Gambia':'GMB','Guinea-Bissau':'GNB','Eq. Guinea':'GNQ',
  'Greece':'GRC','Grenada':'GRD','Greenland':'GRL','Guatemala':'GTM','Guam':'GUM','Guyana':'GUY',
  'Honduras':'HND','Croatia':'HRV','Haiti':'HTI','Hungary':'HUN','Indonesia':'IDN',
  'Isle of Man':'IMN','India':'IND','Ireland':'IRL','Iran':'IRN','Iraq':'IRQ','Iceland':'ISL',
  'Israel':'ISR','Italy':'ITA','Jamaica':'JAM','Jordan':'JOR','Japan':'JPN','Kazakhstan':'KAZ',
  'Kenya':'KEN','Kyrgyzstan':'KGZ','Cambodia':'KHM','Kiribati':'KIR','Korea':'KOR','Kuwait':'KWT',
  'Lao PDR':'LAO','Lebanon':'LBN','Liberia':'LBR','Libya':'LBY','Saint Lucia':'LCA',
  'Sri Lanka':'LKA','Lesotho':'LSO','Lithuania':'LTU','Luxembourg':'LUX','Latvia':'LVA',
  'Moldova':'MDA','Madagascar':'MDG','Mexico':'MEX','Macedonia':'MKD','Mali':'MLI','Malta':'MLT',
  'Myanmar':'MMR','Montenegro':'MNE','Mongolia':'MNG','N. Mariana Is.':'MNP','Mozambique':'MOZ',
  'Mauritania':'MRT','Mauritius':'MUS','Malawi':'MWI','Malaysia':'MYS','Namibia':'NAM',
  'New Caledonia':'NCL','Niger':'NER','Nigeria':'NGA','Nicaragua':'NIC','Netherlands':'NLD',
  'Norway':'NOR','Nepal':'NPL','New Zealand':'NZL','Oman':'OMN','Pakistan':'PAK','Panama':'PAN',
  'Peru':'PER','Philippines':'PHL','Palau':'PLW','Papua New Guinea':'PNG','Poland':'POL',
  'Puerto Rico':'PRI','Dem. Rep. Korea':'PRK','Portugal':'PRT','Paraguay':'PRY','Palestine':'PSE',
  'Fr. Polynesia':'PYF','Qatar':'QAT','Romania':'ROU','Russia':'RUS','Rwanda':'RWA',
  'Saudi Arabia':'SAU','Sudan':'SDN','S. Sudan':'SSD','Senegal':'SEN','Singapore':'SGP',
  'Solomon Is.':'SLB','Sierra Leone':'SLE','El Salvador':'SLV','S\u00e3o Tom\u00e9 and Principe':'STP',
  'Suriname':'SUR','Slovakia':'SVK','Slovenia':'SVN','Sweden':'SWE','Swaziland':'SWZ',
  'Seychelles':'SYC','Syria':'SYR','Turks and Caicos Is.':'TCA','Chad':'TCD','Togo':'TGO',
  'Thailand':'THA','Tajikistan':'TJK','Turkmenistan':'TKM','Timor-Leste':'TLS','Tonga':'TON',
  'Trinidad and Tobago':'TTO','Tunisia':'TUN','Turkey':'TUR','Tanzania':'TZA','Uganda':'UGA',
  'Ukraine':'UKR','Uruguay':'URY','United States':'USA','Uzbekistan':'UZB',
  'St. Vin. and Gren.':'VCT','Venezuela':'VEN','U.S. Virgin Is.':'VIR','Vietnam':'VNM',
  'Vanuatu':'VUT','Samoa':'WSM','Yemen':'YEM','South Africa':'ZAF','Zambia':'ZMB','Zimbabwe':'ZWE'
};
/* 无数据要素的中文兜底名（悬停显示） */
var EN2CN = {
  'W. Sahara':'西撒哈拉','Aland':'奥兰群岛','Fr. S. Antarctic Lands':'法属南部领地',
  'Falkland Is.':'福克兰群岛（马岛）','Heard I. and McDonald Is.':'赫德岛和麦克唐纳群岛',
  'Br. Indian Ocean Ter.':'英属印度洋领地','Jersey':'泽西岛','Siachen Glacier':'锡亚琴冰川',
  'N. Cyprus':'北塞浦路斯地区','Montserrat':'蒙特塞拉特','Niue':'纽埃',
  'S. Geo. and S. Sandw. Is.':'南乔治亚和南桑威奇群岛','Saint Helena':'圣赫勒拿',
  'St. Pierre and Miquelon':'圣皮埃尔和密克隆'
};

/* 要素信息：英文名 → {iso,row,cn}；支持要素自带 cn / iso / role（国内来源数据） */
var FEATS = {};
window.WORLD_GEO.features.forEach(function(f){
  var en = f.properties.name;
  if (!en) return;
  var iso = EN2ISO[en] || f.properties.iso || null;
  FEATS[en] = {
    iso: iso,
    row: iso ? byIso[iso] : null,
    cn: f.properties.cn || ((iso && byIso[iso]) ? byIso[iso].n : (EN2CN[en] || en)),
    role: f.properties.role || null
  };
});

/* 十段线悬停走廊：虚线几何极细（默认视野下 0.1–3.5px 宽），鼠标几乎无法真正落进
   多边形内部，悬停永远没有事件；即便命中，金色填充在细线上也不可见。
   这里取每段线的中心线，做成一条透明的宽走廊（series-lines · polyline），
   把命中区域扩大到线体两侧约 2px；悬停时走廊描出金色线（与其它区域的金色高亮一致），
   并触发「暂无数据」提示卡。走廊随地图缩放平移，命中宽度按屏幕像素固定。 */
var DASH_CORRIDOR = (function(){
  var items = [];
  window.WORLD_GEO.features.forEach(function(f){
    if (!f.properties || f.properties.role !== 'boundary') return;
    f.geometry.coordinates.forEach(function(poly){
      var ring = poly[0].slice();
      var n = ring.length;
      if (n > 1 && ring[0][0] === ring[n-1][0] && ring[0][1] === ring[n-1][1]) { ring.pop(); n--; }
      if (n < 4) return;
      /* 闭合环按「去程边 + 回程边」遍历：两侧对应顶点取中点，即得平滑的中心线 */
      var k = Math.floor(n / 2), spine = [];
      for (var i = 0; i < k; i++) {
        spine.push([(ring[i][0] + ring[n-1-i][0]) / 2, (ring[i][1] + ring[n-1-i][1]) / 2]);
      }
      if (spine.length >= 2) items.push({ name: '十段线', coords: spine });
    });
  });
  return items;
})();

/* ==================== 工具 ==================== */
function fmt2(v){ return (v == null || !isFinite(v)) ? '—' : (Math.round(v * 100) / 100).toFixed(2); }
function has(r, yi){ return r && r.v[yi] != null; }

function hex2rgb(h){
  return [parseInt(h.substr(1,2),16), parseInt(h.substr(3,2),16), parseInt(h.substr(5,2),16)];
}
function lerpHex(a, b, t){
  var pa = hex2rgb(a), pb = hex2rgb(b);
  return 'rgb(' + pa.map(function(x,i){ return Math.round(x + (pb[i]-x)*t); }).join(',') + ')';
}

/* 生育率色带：浅蓝（低）→ 深蓝（高），单一蓝色系（Tesla 设计语言），
   颜色由浅到深对应总和生育率由小到大 */
var STOPS = [
  [0.7, '#F3F6FC'], [1.0, '#F1F4FB'], [1.5, '#EDF1FA'], [2.1, '#E6EBF9'],
  [2.7, '#DDE4F8'], [3.3, '#CCD7F5'], [3.9, '#B4C4F1'], [4.5, '#95ACEC'],
  [5.2, '#6E8FE7'], [6.0, '#3E6AE1'], [7.0, '#2F55C0'], [7.8, '#2445A8']
];
/* 悬停/选中统一用金色（即 ECharts 地图默认悬停金，显式写出以保证选中 = 悬停同色，
   「点完之后颜色不变」；十段线悬停走廊也是同一金） */
var GOLD = 'rgba(255,215,0,0.8)';
var V_MIN = STOPS[0][0], V_MAX = STOPS[STOPS.length-1][0];
function rampColor(v){
  if (v == null || !isFinite(v)) return null;
  var t = Math.max(0, Math.min(1, (v - V_MIN) / (V_MAX - V_MIN)));
  var seg = t * (STOPS.length - 1);
  var i = Math.min(STOPS.length - 2, Math.floor(seg));
  return lerpHex(STOPS[i][1], STOPS[i+1][1], seg - i);
}
function legendBarCSS(){
  var parts = [];
  STOPS.forEach(function(s){
    parts.push(s[1] + ' ' + ((s[0]-V_MIN)/(V_MAX-V_MIN)*100).toFixed(1) + '%');
  });
  return 'linear-gradient(90deg,' + parts.join(',') + ')';
}

/* ==================== 地图 ==================== */
var MQ_NARROW = window.matchMedia('(max-width:960px)');
var chart = echarts.init(document.getElementById('map'), null, {renderer:'canvas'});
/* 滚轮缩放只在光标落在地图上生效（见 ../wheel-zoom.js） */
if (window.bindMapWheelZoom) window.bindMapWheelZoom(document.getElementById('map'), chart);
echarts.registerMap('world', window.WORLD_GEO);

function mapOption(){
  var yi = Y.indexOf(year);
  var data = [], regions = [];
  /* 选中国注册为独立地图（该国 feature 排最后绘制）：ECharts 按要素顺序绘制，
     后画的邻国会盖住选中国的粗描边，导致「与部分邻国边界粗、与另一些细」；
     移到最后绘制后，深色描边全周覆盖（与各省生育地图页选中省同法） */
  var mapName = 'world';
  if (selected) {
    var selName = null;
    for (var en0 in FEATS) if (FEATS[en0].iso === selected) { selName = en0; break; }
    if (selName) {
      var feats = window.WORLD_GEO.features;
      var selF = feats.filter(function(f){ return f.properties.name === selName; });
      var restF = feats.filter(function(f){ return f.properties.name !== selName; });
      echarts.registerMap('world-focus', { type: 'FeatureCollection', features: restF.concat(selF) });
      mapName = 'world-focus';
    }
  }
  window.WORLD_GEO.features.forEach(function(f){
    var en = f.properties.name;
    if (!en) { regions.push({ name: ' ' }); return; }
    if (f.properties.role === 'boundary') {
      /* 南海诸岛十段线等界线要素：固定浅蓝（与各省页方框同色）；不参与年份着色与选中。
         悬停交互由下方 series-lines 透明走廊承担（细线几何命中不到），此处高亮仅作兜底；
         描边不能用 geo 级的 #171A20 —— 细线段会被深色描边整体覆盖、高亮变黑，故描边随填充取金色 */
      regions.push({
        name: en,
        itemStyle: { areaColor: '#B7C7EF', borderColor: '#B7C7EF', borderWidth: 0.3 },
        emphasis: { itemStyle: { areaColor: GOLD, borderColor: GOLD, borderWidth: 0.3 } },
        select: { disabled: true }
      });
      return;
    }
    var info = FEATS[en];
    var v = (info && info.row) ? info.row.v[yi] : null;
    data.push({ name: en, value: (v == null ? '-' : v) });
    var region = { name: en };
    var isSel = selected && info.iso === selected;
    var c = rampColor(v);
    if (c) {
      if (isSel) c = GOLD;
      region.itemStyle = {
        areaColor: c,
        borderColor: isSel ? '#171A20' : '#FFFFFF',
        borderWidth: isSel ? 1.6 : 0.6
      };
      if (isSel) {
        /* 选中国家悬停时保持选中样式（金色 + 深描边），不回落到 geo 级悬停细描边 */
        region.emphasis = { itemStyle: { areaColor: GOLD, borderColor: '#171A20', borderWidth: 1.6 } };
      }
    }
    regions.push(region);
  });
  return {
    geo: {
      map: mapName, roam: true, scaleLimit: { min: 0.9, max: 12 },
      layoutCenter: ['50%', '56%'], layoutSize: '112%',
      itemStyle: { areaColor: '#E4E5E7', borderColor: '#FFFFFF', borderWidth: 0.6 },
      emphasis: { label: { show: false }, itemStyle: { areaColor: GOLD, borderColor: '#171A20', borderWidth: 1.1 } },
      regions: regions
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: '#FFFFFF',
      borderColor: '#EEEEEE',
      borderWidth: 1,
      padding: 0,
      textStyle: { color: '#171A20', fontSize: 12.5 },
      extraCssText: 'border-radius:4px;overflow:hidden;',
      formatter: tooltipCard,
      position: function(pt, params, dom, rect, size){
        var cw = Array.isArray(size.contentSize) ? size.contentSize[0] : size.contentSize.width;
        var ch = Array.isArray(size.contentSize) ? size.contentSize[1] : size.contentSize.height;
        var x = (pt[0] > size.viewSize[0] * 0.5) ? pt[0] - cw - 18 : pt[0] + 18;
        var y = pt[1] + 18;
        if (y + ch > size.viewSize[1] - 10) y = Math.max(10, pt[1] - ch - 16);
        x = Math.max(10, Math.min(x, size.viewSize[0] - cw - 10));
        return [x, y];
      }
    },
    series: [{
      type: 'map', geoIndex: 0, selectedMode: false,
      label: { show: false },
      itemStyle: { borderWidth: 0, borderColor: 'rgba(255,255,255,0)', areaColor: 'rgba(255,255,255,0)' },
      data: data
    }, {
      /* 十段线悬停走廊：透明宽线扩大命中区；悬停描出金色线并弹出「暂无数据」卡片 */
      type: 'lines', coordinateSystem: 'geo', geoIndex: 0,
      polyline: true,
      lineStyle: { color: 'rgba(0,0,0,0)', width: 5 },
      emphasis: { lineStyle: { color: 'rgba(255,215,0,0.9)', width: 3 } },
      data: DASH_CORRIDOR
    }]
  };
}

/* ---------- 悬停卡片 ---------- */
/* 历年走势小图（1960~2024 全时段）：y 轴域恒含更替水平 2.1（整段全在其上/下时也画出），
   上下各留 5% 余量；2.1 处为水平虚线（样式同侧栏趋势图的更替水平线），
   底部实线为横轴、两端标注起止年份（样式同各省生育地图悬停面板）。 */
function sparkSVG(vals, fromYear, toYear){
  var w = 200, h = 46, padL = 4, padY = 6;
  var plotR = w - padL, plotB = h - padY;
  var nums = vals.filter(function(v){ return v != null; });
  if (nums.length < 2) return '';
  var mx = Math.max.apply(null, nums), mn = Math.min.apply(null, nums);
  mx = Math.max(mx, 2.1); mn = Math.min(mn, 2.1);
  var span = mx - mn || 1;
  mx += span * 0.05; mn -= span * 0.05;
  var xy = [];
  vals.forEach(function(v, i){
    if (v == null) return;
    xy.push({
      x: padL + i * (plotR - padL) / (vals.length - 1),
      y: padY + (plotB - padY) * (1 - (v - mn) / (mx - mn)),
      idx: i
    });
  });
  function segD(pts){
    if (pts.length < 2) return '';
    var d = 'M' + pts[0].x.toFixed(1) + ',' + pts[0].y.toFixed(1);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      var c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      var c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += 'C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ',' + c2y.toFixed(1) + ' ' + p2.x.toFixed(1) + ',' + p2.y.toFixed(1);
    }
    return d;
  }
  var runs = [], cur = [xy[0]];
  for (var k = 1; k < xy.length; k++) {
    if (xy[k].idx === xy[k-1].idx + 1) cur.push(xy[k]);
    else { runs.push(cur); cur = [xy[k]]; }
  }
  runs.push(cur);
  var y21 = padY + (plotB - padY) * (1 - (2.1 - mn) / (mx - mn));
  /* 「更替水平 2.1」标注避让：右/左 × 线上/线下共四个候选位，取与折线（含端点圆点）
     无相交者；全部相交时取相交点最少者。文本框按 64×9 估算，另留 2px 余量；
     同分时保持候选顺序（右侧线上优先，与侧栏趋势图标注位一致）。 */
  var LAB_W = 64;
  var cands = [
    { x: plotR, anchor: 'end',   y: y21 - 3,  above: true },
    { x: plotR, anchor: 'end',   y: y21 + 10, above: false },
    { x: padL,  anchor: 'start', y: y21 - 3,  above: true },
    { x: padL,  anchor: 'start', y: y21 + 10, above: false }
  ].filter(function(c){
    return c.above ? c.y - 7 >= padY - 1 : c.y + 2 <= plotB + 1;
  });
  cands.forEach(function(c){
    var x0 = (c.anchor === 'end') ? c.x - LAB_W : c.x;
    var x1 = (c.anchor === 'end') ? c.x : c.x + LAB_W;
    var y0 = c.y - 8.5, y1 = c.y + 2;
    c.hits = 0;
    xy.forEach(function(p){
      if (p.x >= x0 - 2 && p.x <= x1 + 2 && p.y >= y0 - 2 && p.y <= y1 + 2) c.hits++;
    });
  });
  cands.sort(function(a, b){ return a.hits - b.hits; });
  var lab = cands[0] || { x: plotR, anchor: 'end', y: y21 - 3 };
  return '<svg width="' + w + '" height="' + (h + 22) + '" style="display:block;">'
    + '<line x1="' + padL + '" y1="' + y21.toFixed(1) + '" x2="' + plotR + '" y2="' + y21.toFixed(1) + '" stroke="#171A20" stroke-opacity="0.55" stroke-width="1" stroke-dasharray="2 2.5"/>'
    + '<text x="' + lab.x + '" y="' + lab.y.toFixed(1) + '" font-size="8.5" fill="#5C5E62" text-anchor="' + lab.anchor + '">更替水平 2.1</text>'
    + runs.map(function(r){ return '<path d="' + segD(r) + '" fill="none" stroke="#3E6AE1" stroke-width="1.8" stroke-linecap="round"/>'; }).join('')
    + [xy[0], xy[xy.length-1]].map(function(d){
        return '<circle cx="' + d.x.toFixed(1) + '" cy="' + d.y.toFixed(1) + '" r="2.4" fill="' + (d.idx === vals.length - 1 ? '#3E6AE1' : '#2445A8') + '"/>';
      }).join('')
    + '<text x="' + padL + '" y="' + (h + 12) + '" font-size="9.5" fill="#8E8E8E">' + fromYear + '</text>'
    + '<text x="' + plotR + '" y="' + (h + 12) + '" font-size="9.5" fill="#8E8E8E" text-anchor="end">' + toYear + '</text>'
    + '<line x1="' + padL + '" y1="' + plotB + '" x2="' + plotR + '" y2="' + plotB + '" stroke="#D0D1D2" stroke-width="1"/>'
    + '</svg>';
}
function rankOf(iso, yi){
  var v = byIso[iso].v[yi];
  if (v == null) return null;
  var n = 0, total = 0;
  LIST.forEach(function(r){
    if (r.v[yi] == null) return;
    total++;
    if (r.v[yi] > v) n++;
  });
  return { no: n + 1, total: total };
}
function tooltipCard(params){
  var info = FEATS[params.name];
  /* 界线要素（十段线）：与各省页方框一致 —— 悬停出「暂无数据」提示卡 */
  if (info && info.role === 'boundary') {
    return '<div style="padding:14px 18px;font-size:12.5px;color:#5C5E62;">' + (info.cn || params.name) + '（暂无数据）</div>';
  }
  if (!info) return '<div style="padding:14px 18px;font-size:12.5px;color:#5C5E62;">' + params.name + '</div>';
  var yi = Y.indexOf(year);
  var head = '<div style="padding:14px 18px 6px;">'
    + '<div style="font-family:\'Noto Sans SC\',Arial,sans-serif;font-weight:500;font-size:18px;color:#171A20;">' + info.cn + '</div>'
    + '<div style="font-size:10.5px;color:#8E8E8E;letter-spacing:normal;margin-top:2px;">' + year + ' 年</div>'
    + '</div>';
  if (!info.row || !has(info.row, yi)) {
    return head + '<div style="padding:0 18px 14px;font-size:12px;color:#5C5E62;">世界银行暂无该年份数据</div>';
  }
  var v = info.row.v[yi];
  var rk = rankOf(info.iso, yi);
  var wv = W.v[yi];
  var vsReplacement = v >= 2.1
    ? '<span style="color:#393C41;">高于更替水平 2.1</span>'
    : '<span style="color:#2445A8;font-weight:500;">低于更替水平 2.1</span>';
  var body = '<div style="padding:4px 18px 12px;">'
    + '<div style="font-size:11.5px;color:#5C5E62;letter-spacing:normal;">生育率</div>'
    + '<div style="font-family:\'Noto Sans SC\',Arial,sans-serif;font-weight:500;font-size:27px;line-height:1.3;color:#3E6AE1;">' + fmt2(v) + '<span style="font-size:13px;font-weight:500;color:#5C5E62;"> 个/人</span></div>'
    + '<div style="font-size:12px;color:#393C41;margin-top:6px;">'
    + '世界均值 <b style="color:#171A20;">' + fmt2(wv) + '</b>'
    + '&nbsp;&nbsp;排名 <b style="color:#171A20;">#' + rk.no + '</b><span style="color:#8E8E8E;"> / ' + rk.total + '</span>'
    + '</div>'
    + '<div style="font-size:11.5px;margin-top:4px;">' + vsReplacement + '</div>'
    + '</div>';
  var seg = info.row.v;                 /* 1960~2024 全时段 */
  var spark = sparkSVG(seg, Y[0], Y[Y.length - 1]);
  var sparkBlock = spark
    ? '<div style="padding:2px 18px 12px;"><div style="font-size:11.5px;color:#5C5E62;letter-spacing:normal;margin-bottom:4px;">' + Y[0] + '~' + Y[Y.length - 1] + ' 年生育率</div>' + spark + '</div>'
    : '';
  return head + body + sparkBlock;
}

/* ==================== 侧栏：世界视角 ==================== */
function prevValue(r, yi){
  for (var j = yi - 1; j >= 0; j--) if (r.v[j] != null) return { v: r.v[j], y: Y[j] };
  return null;
}
function worldView(){
  document.getElementById('sideDefault').style.display = 'flex';
  document.getElementById('countryPane').classList.remove('on');
  var yi = Y.indexOf(year);
  var wv = W.v[yi];
  document.getElementById('ovKicker').textContent = '世界平均生育率（' + year + '）';
  document.getElementById('wVal').textContent = fmt2(wv);
  var pv = prevValue(W, yi);
  var dEl = document.getElementById('wDelta');
  if (pv) {
    var d = wv - pv.v;
    dEl.innerHTML = '较 ' + pv.y + ' 年 <b class="' + (d <= 0 ? 'down' : 'up') + '">'
      + (d > 0 ? '+' : '−') + Math.abs(d).toFixed(2) + '</b>';
  } else dEl.innerHTML = '';

  /* 排名条形图：默认从小到大（最小者在顶）；当年最高 / 最低与排序无关 */
  var rows = LIST.filter(function(r){ return has(r, yi); })
    .sort(function(a, b){ return a.v[yi] - b.v[yi]; });
  var mx = rows.reduce(function(m, r){ return r.v[yi] > m.v[yi] ? r : m; });
  var mn = rows.reduce(function(m, r){ return r.v[yi] < m.v[yi] ? r : m; });
  var below = rows.filter(function(r){ return r.v[yi] < 2.1; });
  document.getElementById('ovMax').textContent = fmt2(mx.v[yi]);
  document.getElementById('ovMaxN').textContent = mx.n;
  document.getElementById('ovMin').textContent = fmt2(mn.v[yi]);
  document.getElementById('ovMinN').textContent = mn.n;
  /* 「低于人口更替水平」一格装不下「116 个国家」同位排版：单位改为小字（同 .nat-title 的 small 惯例） */
  document.getElementById('ovBelow').innerHTML = below.length + '<span class="u"> 个国家</span>';
  document.getElementById('ovBelowN').textContent = '/ ' + rows.length + ' 个有数据国家';

  renderRankBar(rows.map(function(r){ return { name: r.n, c: r.c, v: r.v[yi] }; }));
}

/* ---------- 排名条形图（样式同「各国生育补贴支出」页） ---------- */
var rankBar = null, rankRows = [];
function ensureRankBar(){
  if (rankBar) return;
  rankBar = echarts.init(document.getElementById('rankBar'), null, {renderer:'canvas'});
  rankBar.on('click', function(p){
    var o = rankRows[p.dataIndex];
    if (!o) return;
    var row = LIST.filter(function(x){ return x.n === o.name; })[0];
    if (row) {
      selected = row.c;
      chart.setOption(mapOption());
      renderSide();
      syncSelect();
    }
  });
}
/* 超长国名截断（全名见悬停卡与详情栏） */
function rankName(s){ return s.length > 7 ? s.slice(0, 6) + '…' : s; }
function renderRankBar(rows){
  var el = document.getElementById('rankBar');
  el.style.height = rows.length * 20 + 50 + 'px';
  ensureRankBar();
  rankBar.resize();
  /* rows 为显示顺序（自上而下）；ECharts y 轴首项在最底部，故倒序放入 */
  rankRows = rows.slice().reverse();
  rankBar.setOption({
    animation: false,
    grid: { left: 84, right: 36, top: 6, bottom: 22 },
    tooltip: {
      trigger: 'item',
      textStyle: { fontSize: 11.5, fontFamily: 'Noto Sans SC, Arial, sans-serif' },
      formatter: function(p){
        var o = rankRows[p.dataIndex];
        return '<b>' + o.name + '</b>　' + year + ' 年<br>生育率：' + fmt2(o.v) + ' 个 / 人';
      },
      /* .rank-scroll 是滚动容器且 #rankBar 高于可视区：提示卡须按「可视区」定位，
         否则贴近视图下缘时会被滚动容器（白色页面）裁掉 ——
         默认光标下方；快到可视区下缘时上翻到光标上方；横向贴边向左展开 */
      position: function(pt, params, dom, rect, size){
        var cw = Array.isArray(size.contentSize) ? size.contentSize[0] : size.contentSize.width;
        var ch = Array.isArray(size.contentSize) ? size.contentSize[1] : size.contentSize.height;
        var visTop = el.parentElement.scrollTop;
        var visBot = visTop + el.parentElement.clientHeight;
        var x = pt[0] + 14;
        if (x + cw > size.viewSize[0] - 4) x = Math.max(4, pt[0] - cw - 14);
        var y = pt[1] + 16;
        if (y + ch > visBot - 2) y = pt[1] - ch - 12;
        if (y < visTop + 2) y = visTop + 2;
        return [x, y];
      }
    },
    xAxis: {
      type: 'value', splitNumber: 4,
      axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: '#EEEEEE' } },
      axisLabel: { fontFamily: 'Noto Sans SC, Arial, sans-serif', fontSize: 10, color: '#8E8E8E' }
    },
    yAxis: {
      type: 'category', data: rankRows.map(function(o){ return rankName(o.name); }),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { fontFamily: 'Noto Sans SC, Arial, sans-serif', fontSize: 11, color: '#393C41' }
    },
    series: [{
      type: 'bar', barWidth: 8, cursor: 'pointer',
      data: rankRows.map(function(o){
        return {
          value: o.v,
          /* 中国固定蓝色，其余国家灰色（与选中态/详情栏折线同色） */
          itemStyle: { color: o.c === 'CHN' ? '#3E6AE1' : '#D6D8DC', borderRadius: 2 },
          emphasis: { itemStyle: { color: '#3E6AE1' } }
        };
      }),
      label: {
        show: true, position: 'right', color: '#8E8E8E', fontWeight: 400,
        fontFamily: 'Noto Sans SC, Arial, sans-serif', fontSize: 10,
        formatter: function(p){ return fmt2(p.value); }
      }
    }]
  }, true);
}

/* ==================== 侧栏：国家视角 ==================== */
var trendChart = null;
var trendLabPos = 'insideEndTop';     /* 「更替水平 2.1」标注当前位置（fixTrendLabel 动态调整） */
function ensureTrendChart(){
  if (!trendChart) trendChart = echarts.init(document.getElementById('trendChart'));
  trendChart.resize();
}
function trendOption(r){
  var yi = Y.indexOf(year);
  var lineC = '#3E6AE1';
  var curData = [];
  if (r.v[yi] != null) curData.push({ value: [yi, r.v[yi]], symbolSize: 7, itemStyle: { color: lineC, borderColor: '#fff', borderWidth: 1.5 } });
  return {
    color: ['#8E8E8E', lineC],
    /* 窄屏改用 containLabel 自适应贴边：y 轴刻度贴画布左缘，消除固定 left:42
       在窄面板上留下的死空白；bottom 相应减小抵消 x 刻度被计入 grid 的高度 */
    grid: MQ_NARROW.matches
      ? { left: 2, right: 12, top: 30, bottom: 8, containLabel: true }
      : { left: 42, right: 20, top: 30, bottom: 28 },
    tooltip: {
      trigger: 'axis', textStyle: { fontSize: 11 },
      formatter: function(ps){
        var html = ps[0].axisValue + ' 年';
        ps.forEach(function(p){
          html += '<br/>' + p.marker + ' ' + p.seriesName + '：<b>' + fmt2(p.value) + '</b>';
        });
        return html;
      }
    },
    legend: {
      top: 0, right: 0, itemWidth: 14, itemHeight: 2, icon: 'rect',
      textStyle: { fontSize: 10, color: '#5C5E62' },
      data: ['世界均值', r.n]
    },
    xAxis: {
      type: 'category', data: Y, boundaryGap: false,
      axisLine: { lineStyle: { color: '#EEEEEE' } }, axisTick: { show: false },
      axisLabel: { fontFamily: 'Noto Sans SC, Arial, sans-serif', fontSize: 9.5, color: '#8E8E8E', interval: Math.ceil(Y.length / 8) }
    },
    yAxis: {
      type: 'value', splitNumber: 4, min: 0,
      splitLine: { lineStyle: { color: '#EEEEEE', type: 'dashed' } },
      axisLabel: { fontFamily: 'Noto Sans SC, Arial, sans-serif', fontSize: 9.5, color: '#8E8E8E' },
      axisLine: { show: false }, axisTick: { show: false }
    },
    series: [{
      name: '世界均值', type: 'line', data: W.v, symbol: 'none',
      lineStyle: { color: '#8E8E8E', width: 1.4, type: 'dashed' },
      markLine: {
        silent: true, symbol: 'none',
        data: [{ yAxis: 2.1 }],
        lineStyle: { color: '#171A20', type: 'dotted', width: 1, opacity: .55 },
        label: { formatter: '更替水平 2.1', fontSize: 9.5, color: '#5C5E62', position: trendLabPos }
      }
    }, {
      name: r.n, type: 'line', data: r.v, symbol: 'none', connectNulls: true,
      lineStyle: { color: lineC, width: 2.2, cap: 'round', join: 'round' },
      z: 5
    }, {
      name: r.n, type: 'scatter', data: curData, z: 6, tooltip: { show: false },
      itemStyle: { color: lineC }
    }]
  };
}
/* 「更替水平 2.1」标注避让（与悬停卡走势小图同法）：标注默认在右端线上方，
   所选国家/世界均值曲线走到该处时会压住文字。渲染后用 convertToPixel 实测
   曲线点位，在右/中/左 × 线上/线下六个候选位中取与两条曲线无相交者，
   全部相交时取相交最少者（同分保持候选顺序：右侧线上优先）；以 merge
   setOption 只改标注位置，不重绘曲线。
   相交检测含两点：数据点落框 + 线段穿框（Liang-Barsky）——陡峭段两端
   均在框外仍可切过框体，仅测点会漏判。 */
var TREND_LAB_W = 66, TREND_LAB_H = 11;
function fixTrendLabel(r){
  if (!trendChart) return;
  var h = trendChart.getHeight();
  var y21 = trendChart.convertToPixel({ yAxisIndex: 0 }, 2.1);
  var gl = trendChart.convertToPixel({ xAxisIndex: 0 }, 0);
  var gr = trendChart.convertToPixel({ xAxisIndex: 0 }, Y.length - 1);
  if (y21 == null || gl == null || !isFinite(y21) || !isFinite(gl) || !isFinite(gr)) return;
  var pts = [], segs = [];
  [r.v, W.v].forEach(function(arr){
    var prev = null;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] == null) continue;   /* r.v 开了 connectNulls：折线跨 null 相连，prev 保留 */
      var x = trendChart.convertToPixel({ xAxisIndex: 0 }, i);
      var y = trendChart.convertToPixel({ yAxisIndex: 0 }, arr[i]);
      if (x == null || y == null || !isFinite(x) || !isFinite(y)) { prev = null; continue; }
      var p = [x, y];
      pts.push(p);
      if (prev) segs.push([prev, p]);
      prev = p;
    }
  });
  function segHit(p, q, c){
    var x0 = c.x0 - 2, x1 = c.x1 + 2, y0 = c.y0 - 2, y1 = c.y1 + 2;
    var t0 = 0, t1 = 1;
    var d = [q[0] - p[0], q[1] - p[1]];
    var mins = [x0, y0], maxs = [x1, y1];
    for (var a = 0; a < 2; a++) {
      if (d[a] === 0) { if (p[a] < mins[a] || p[a] > maxs[a]) return false; continue; }
      var ta = (mins[a] - p[a]) / d[a], tb = (maxs[a] - p[a]) / d[a];
      if (ta > tb) { var tt = ta; ta = tb; tb = tt; }
      if (ta > t0) t0 = ta;
      if (tb < t1) t1 = tb;
      if (t0 > t1) return false;
    }
    return true;
  }
  var mid = (gl + gr) / 2;
  var cands = [
    { pos: 'insideEndTop',      x0: gr - TREND_LAB_W, x1: gr,               y0: y21 - 3 - TREND_LAB_H, y1: y21 - 3 },
    { pos: 'insideEndBottom',   x0: gr - TREND_LAB_W, x1: gr,               y0: y21 + 3,               y1: y21 + 3 + TREND_LAB_H },
    { pos: 'insideMiddleTop',   x0: mid - TREND_LAB_W / 2, x1: mid + TREND_LAB_W / 2, y0: y21 - 3 - TREND_LAB_H, y1: y21 - 3 },
    { pos: 'insideMiddleBottom', x0: mid - TREND_LAB_W / 2, x1: mid + TREND_LAB_W / 2, y0: y21 + 3,              y1: y21 + 3 + TREND_LAB_H },
    { pos: 'insideStartTop',    x0: gl,               x1: gl + TREND_LAB_W, y0: y21 - 3 - TREND_LAB_H, y1: y21 - 3 },
    { pos: 'insideStartBottom', x0: gl,               x1: gl + TREND_LAB_W, y0: y21 + 3,               y1: y21 + 3 + TREND_LAB_H }
  ].filter(function(c){
    /* 出界候选直接淘汰：上方须避开图例区（grid top=30），下方须避开横轴刻度 */
    return c.x0 >= gl - 2 && c.x1 <= gr + 2 && c.y0 >= 26 && c.y1 <= h - 24;
  });
  if (!cands.length) return;
  cands.forEach(function(c){
    c.hits = 0;
    pts.forEach(function(p){
      if (p[0] >= c.x0 - 2 && p[0] <= c.x1 + 2 && p[1] >= c.y0 - 2 && p[1] <= c.y1 + 2) c.hits++;
    });
    segs.forEach(function(s){
      if (segHit(s[0], s[1], c)) c.hits++;
    });
  });
  cands.sort(function(a, b){ return a.hits - b.hits; });
  if (cands[0].pos !== trendLabPos) {
    trendLabPos = cands[0].pos;
    trendChart.setOption({ series: [{ markLine: { label: { position: trendLabPos } } }] });
  }
}
function countryView(iso){
  var r = byIso[iso];
  if (!r) return;
  var yi = Y.indexOf(year);
  document.getElementById('sideDefault').style.display = 'none';
  document.getElementById('countryPane').classList.add('on');
  document.getElementById('cName').textContent = r.n;
  document.getElementById('cEn').textContent = r.en;
  document.getElementById('cValK').textContent = '生育率（' + year + '）';
  document.getElementById('cVal').textContent = has(r, yi) ? fmt2(r.v[yi]) : '—';
  var pv = prevValue(r, yi);
  var dEl = document.getElementById('cDelta');
  if (pv && has(r, yi)) {
    var d = r.v[yi] - pv.v;
    dEl.textContent = '较 ' + pv.y + ' 年 ' + (d > 0 ? '+' : '−') + Math.abs(d).toFixed(2);
  } else dEl.textContent = '';
  document.getElementById('cWorld').textContent = fmt2(W.v[yi]);
  var rk = rankOf(iso, yi);
  document.getElementById('cRank').textContent = rk ? ('当年排名 #' + rk.no + ' / ' + rk.total) : '当年无数据';

  ensureTrendChart();
  trendChart.setOption(trendOption(r), true);
  fixTrendLabel(r);
  drawTable(r, yi);
}
function drawTable(r, yi){
  var html = '';
  for (var i = Y.length - 1; i >= 0; i--) {
    var v = r.v[i], wv = W.v[i];
    var diff = (v != null && wv != null) ? (v - wv) : null;
    html += '<tr' + (i === yi ? ' class="cur"' : '') + '><td>' + Y[i] + '</td><td>'
      + (v == null ? '—' : fmt2(v)) + '</td><td>'
      + (diff == null ? '—' : (diff > 0 ? '+' : '−') + Math.abs(diff).toFixed(2)) + '</td></tr>';
  }
  document.getElementById('cTbody').innerHTML = html;
  document.getElementById('cNotes').innerHTML =
    '<p class="n-light">注：「—」表示当年无数据。</p>';
}
function renderSide(){
  if (selected && byIso[selected]) countryView(selected); else worldView();
}

/* ==================== 年份控制 ==================== */
var slider = document.getElementById('yearSlider');
var playBtn = document.getElementById('playBtn');
var playTimer = null;
function setYear(y){
  y = Math.max(+slider.min, Math.min(+slider.max, y));
  year = y;
  slider.value = y;
  slider.style.setProperty('--fill', ((y - slider.min) / (slider.max - slider.min) * 100) + '%');
  document.getElementById('mtlYear').textContent = y;
  markTick();
  chart.setOption(mapOption());
  renderSide();
}
function markTick(){
  var box = document.getElementById('mtlTicks');
  if (!box) return;
  var bs = box.querySelectorAll('.mtl-tick');
  for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('on', +bs[i].getAttribute('data-year') === year);
}
/* 整十年刻度（含起点年，1960、1970…），可点击直达；末年仅在与相邻刻度间距足够
   （≥28px）时标出，避免窄屏下文字重叠。首行右侧同步标注起止年份 */
function renderTicks(){
  var box = document.getElementById('mtlTicks');
  if (!box) return;
  var lo = +slider.min, hi = +slider.max, span = hi - lo || 1;
  var px = box.clientWidth || 280;
  var rng = document.getElementById('tlRange');
  if (rng) rng.textContent = lo + '–' + hi;
  var ys = [];
  for (var y = Math.ceil(lo / 10) * 10; y <= hi; y += 10) ys.push(y);
  [hi].forEach(function(v){
    var clear = ys.every(function(y){ return Math.abs(y - v) / span * px >= 28; });
    if (clear) ys.push(v);
  });
  ys.sort(function(a, b){ return a - b; });
  var html = '';
  ys.forEach(function(y){
    html += '<button type="button" class="mtl-tick" data-year="' + y
      + '" style="left:' + ((y - lo) / span * 100).toFixed(3) + '%">' + y + '</button>';
  });
  box.innerHTML = html;
  markTick();
}
if (document.getElementById('mtlTicks')) {
  document.getElementById('mtlTicks').addEventListener('click', function(e){
    var b = e.target && e.target.closest ? e.target.closest('.mtl-tick') : null;
    if (!b) return;
    stopPlay();
    setYear(+b.getAttribute('data-year'));
  });
}
slider.addEventListener('input', function(){ stopPlay(); setYear(+slider.value); });
document.addEventListener('keydown', function(e){
  if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (e.key === 'ArrowLeft') { stopPlay(); setYear(year - 1); e.preventDefault(); }
  if (e.key === 'ArrowRight') { stopPlay(); setYear(year + 1); e.preventDefault(); }
});
function stopPlay(){
  if (!playTimer) return;
  clearInterval(playTimer);
  playTimer = null;
  playBtn.classList.remove('playing');
  playBtn.querySelector('.ico-play').style.display = '';
  playBtn.querySelector('.ico-pause').style.display = 'none';
}
playBtn.addEventListener('click', function(){
  if (playTimer) { stopPlay(); return; }
  if (year >= +slider.max) setYear(+slider.min);
  playBtn.classList.add('playing');
  playBtn.querySelector('.ico-play').style.display = 'none';
  playBtn.querySelector('.ico-pause').style.display = '';
  playTimer = setInterval(function(){
    if (year >= +slider.max) { stopPlay(); return; }
    setYear(year + 1);
  }, 380);
});

/* ==================== 选择控件 / 关闭 / 标签页 ==================== */
var countrySelect = document.getElementById('countrySelect');
function fillSelect(){
  var names = LIST.slice().sort(function(a, b){ return a.n.localeCompare(b.n, 'zh-Hans-CN'); });
  var html = '<option value="">世界平均</option>';
  names.forEach(function(r){
    html += '<option value="' + r.c + '">' + r.n + '（' + r.en + '）</option>';
  });
  countrySelect.innerHTML = html;
  countrySelect.value = selected || '';
}
function syncSelect(){ countrySelect.value = selected || ''; }
countrySelect.addEventListener('change', function(){
  selected = countrySelect.value || null;
  chart.setOption(mapOption());
  renderSide();
});
document.getElementById('cClose').addEventListener('click', function(){
  selected = null;
  chart.setOption(mapOption());
  renderSide();
  syncSelect();
});
document.querySelectorAll('#countryPane .tabs button').forEach(function(btn){
  btn.addEventListener('click', function(){
    document.querySelectorAll('#countryPane .tabs button').forEach(function(b){ b.classList.toggle('on', b === btn); });
    document.getElementById('paneTrend').classList.toggle('on', btn.getAttribute('data-tab') === 'trend');
    document.getElementById('paneTable').classList.toggle('on', btn.getAttribute('data-tab') === 'table');
    if (btn.getAttribute('data-tab') === 'trend' && trendChart) trendChart.resize();
  });
});
chart.on('click', function(params){
  var info = FEATS[params.name];
  if (info && info.iso && byIso[info.iso]) {
    selected = info.iso;
    chart.setOption(mapOption());
    renderSide();
    syncSelect();
  }
});

/* 中国 ↔ 十段线悬停联动：十段线视作中国的一部分 —— 悬停任一方，中国本土与
   整条十段线同时亮起；移开则同时熄灭。本土高亮走 China 数据项（map 系列），
   十段线的可见高亮是走廊金线（lines 系列，10 段各为一个数据项），
   故用 dispatchAction 配对 highlight/downplay 联动，防止状态残留。 */
var DASH_ALL = DASH_CORRIDOR.map(function(_, i){ return i; });
function toggleDashChina(on){
  chart.dispatchAction({ type: on ? 'highlight' : 'downplay', seriesIndex: 0, name: 'China' });
  chart.dispatchAction({ type: on ? 'highlight' : 'downplay', seriesIndex: 1, dataIndex: DASH_ALL });
}
chart.on('mouseover', function(params){
  if (params.name === 'China' || params.name === '十段线') toggleDashChina(true);
});
chart.on('mouseout', function(params){
  if (params.name === 'China' || params.name === '十段线') toggleDashChina(false);
});
chart.on('globalout', function(){ toggleDashChina(false); });

/* 断点翻转时需重设 option（resize 只重算尺寸，不会改 grid 留白） */
var lastNarrow = MQ_NARROW.matches;
window.addEventListener('resize', function(){
  if (MQ_NARROW.matches !== lastNarrow) {
    lastNarrow = MQ_NARROW.matches;
    renderSide();
  }
  chart.resize();
  renderTicks();
  if (trendChart) {
    trendChart.resize();
    if (selected && byIso[selected]) fixTrendLabel(byIso[selected]);
  }
  if (rankBar) rankBar.resize();
});

/* ==================== 启动 ==================== */
document.getElementById('lgBar').style.background = legendBarCSS();
document.getElementById('lgTick').style.left = ((2.1 - V_MIN) / (V_MAX - V_MIN) * 100).toFixed(2) + '%';
document.getElementById('lgMin').textContent = V_MIN.toFixed(1);
document.getElementById('lgMax').textContent = V_MAX.toFixed(1);
renderTicks();
fillSelect();
setYear(year);
})();
