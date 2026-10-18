
(function(){
"use strict";

/* ==================== 数据层 ==================== */
var D = window.PROV_DATA;             /* {years, series{births,rate,pop}, meta{notes,file}} */
var metric = 'births';                /* births | rate | delta */
var year = 2025;
var selected = null;
/* 合并页中本图位于 #years 一节内；embed.html（首页内嵌）无该节，退回 body */
var boardRoot = document.getElementById('years') || document.body;

/* 地区分组 */
var REGION = {
  '华北':'北京市,天津市,河北省,山西省,内蒙古自治区',
  '东北':'辽宁省,吉林省,黑龙江省',
  '华东':'上海市,江苏省,浙江省,安徽省,福建省,江西省,山东省',
  '中南':'河南省,湖北省,湖南省,广东省,广西壮族自治区,海南省',
  '西南':'重庆市,四川省,贵州省,云南省,西藏自治区',
  '西北':'陕西省,甘肃省,青海省,宁夏回族自治区,新疆维吾尔自治区',
  '港澳台':'台湾省,香港特别行政区,澳门特别行政区'
};
function regionOf(name){
  for (var r in REGION) if ((',' + REGION[r] + ',').indexOf(',' + name + ',') >= 0) return r;
  return '—';
}
function shortName(full){ return (D.short && D.short[full]) || full.replace(/(特别行政区|维吾尔自治区|回族自治区|壮族自治区|自治区|省|市)$/, ''); }
function fmt1(v){ return (Math.round(v * 10) / 10).toLocaleString('en-US'); }
function has(p, yi){ return p && p.births[yi] != null; }
/* 近10年变化：以现有数据中距所选年份最近的第 9 年前为基期（如 2025 → 2016） */
function deltaInfo(p, yi){
  for (var j = yi - 9; j >= 0; j--) {
    if (p.births[j] != null && p.births[yi] != null && p.births[j] !== 0) {
      return {
        pct: (p.births[yi] - p.births[j]) / p.births[j] * 100,
        abs: p.births[yi] - p.births[j],
        b0: p.births[j], b1: p.births[yi],
        y0: YEARS()[j], y1: YEARS()[yi]
      };
    }
  }
  return null;
}
function delta10(p, yi){
  var d = deltaInfo(p, yi);
  return d ? d.pct : null;
}
/* 出生率的近10年变化（百分点 ‰） */
function deltaRate(p, yi){
  for (var j = yi - 9; j >= 0; j--) {
    if (p.rate[j] != null && p.rate[yi] != null) {
      return {
        dpp: Math.round((p.rate[yi] - p.rate[j]) * 100) / 100,
        r0: p.rate[j], r1: p.rate[yi],
        y0: YEARS()[j], y1: YEARS()[yi]
      };
    }
  }
  return null;
}
/* 地图尺寸自适应：尽量占满高度，但宽度始终不超出容器（避免裁掉新疆/黑龙江边缘） */
function geoLayoutSize(){
  var el = document.getElementById('map');
  var w = (el && el.clientWidth) || 800, h = (el && el.clientHeight) || 600;
  var byMin = Math.min(w, h) * 1.05;   /* 与原先按短边 105% 一致 */
  var px = Math.min(byMin, w * 0.99);  /* 容器偏高时按宽度收口 */
  return Math.round(px);
}
function metricValue(p, yi){
  if (!has(p, yi)) return null;
  if (metric === 'births') return p.births[yi];
  if (metric === 'rate') return p.rate[yi];
  return delta10(p, yi);
}

/* ==================== 图表 ==================== */
var chart = echarts.init(document.getElementById('map'), null, {renderer:'canvas'});
/* 滚轮缩放只在光标落在地图上生效（见 ../wheel-zoom.js） */
if (window.bindMapWheelZoom) window.bindMapWheelZoom(document.getElementById('map'), chart);
echarts.registerMap('china', window.CHINA_GEO);

/* ECharts 对注册名为 china 的地图会自动附加「南海诸岛」方框附图；
   选中省份切换到自注册的 china-focus 地图后需手动带上同一附图（坐标自 echarts 内部提取并按同规则变换） */
var NANHAI_BOX = {"type":"Feature","properties":{"name":"南海诸岛"},"geometry":{"type":"MultiPolygon","coordinates":[[[[126,24.75],[126.666667,24.2],[127.428571,24.15],[128.857143,24.5],[130,24.95],[130.952381,24.95],[131.333333,24.45],[131.619048,24.95],[132.095238,24.95],[132.095238,25],[126.47619,25],[126,24.75]]],[[[127.238095,23.85],[127.809524,23.95],[127.52381,23.45],[127.047619,23.35],[127.238095,23.85]]],[[[127.142857,22.7],[127.333333,22.25],[127.428571,22.25],[127.238095,22.7],[127.142857,22.7]]],[[[127.52381,21.6],[127.142857,21.2],[127.238095,21.2],[127.714286,21.6],[127.52381,21.6]]],[[[126.571429,20.4],[126.761905,20],[126.857143,20],[126.761905,20.4],[126.571429,20.4]]],[[[128.190476,19.1],[128.761905,19.3],[128.857143,19.3],[128.380952,19.1],[128.190476,19.1]]],[[[129.52381,19.95],[130.095238,20.55],[130.190476,20.55],[129.714286,19.95],[129.52381,19.95]]],[[[130.571429,21.35],[130.857143,21.75],[131.047619,21.75],[130.761905,21.35],[130.571429,21.35]]],[[[130.857143,22.5],[130.857143,22.95],[131.047619,22.95],[131.047619,22.5],[130.857143,22.5]]],[[[130.952381,23.4],[131.238095,23.75],[131.333333,23.75],[131.047619,23.4],[130.952381,23.4]]],[[[131.52381,24.1],[131.904762,24.5],[132,24.5],[131.714286,24.1],[131.52381,24.1]]],[[[126,24.75],[126,18.35],[132.095238,18.35],[132.095238,25],[132,25],[132,18.4],[126.095238,18.4],[126.095238,24.75],[126,24.75]]]]}};

/* 色带：单一蓝色系（Tesla 设计语言 · 唯一彩色），出生人口/出生率由浅至深 */
var rampBirths = ['#F0F3FA','#D9E2F6','#B7C7EF','#8CA6E3','#5F82D4','#2F55C0'];
var rampRate   = ['#F0F3FA','#D9E2F6','#B7C7EF','#8CA6E3','#5F82D4','#2F55C0'];
/* 十年变化（发散）：减少 = 蓝色强调，增加 = 石墨灰 */
var rampDelta  = ['#2F55C0','#7FA0E8','#EDF0F6','#D5D7DB','#8E9095','#3A3C41'];
/* 悬停/选中统一用金色（与各国生育率页高亮同源：ECharts 地图默认悬停金），
   选中 = 悬停同色，保证「点完之后颜色不变」 */
var GOLD = 'rgba(255,215,0,0.8)';
function lerpColor(a, b, t){
  var pa = [parseInt(a.substr(1,2),16), parseInt(a.substr(3,2),16), parseInt(a.substr(5,2),16)];
  var pb = [parseInt(b.substr(1,2),16), parseInt(b.substr(3,2),16), parseInt(b.substr(5,2),16)];
  return 'rgb(' + pa.map(function(x,i){ return Math.round(x + (pb[i]-x)*t); }).join(',') + ')';
}
function rampColor(ramp, t){
  t = Math.max(0, Math.min(1, t));
  var seg = t * (ramp.length - 1);
  var i = Math.min(ramp.length - 2, Math.floor(seg));
  return lerpColor(ramp[i], ramp[i+1], seg - i);
}

function legendInfo(){
  /* 返回 {min,max,unit,title,barCSS,fmt} */
  var yi = YEARS().indexOf(year);
  if (metric === 'births') {
    var vals = objVals(function(p){ return has(p, yi) ? p.births[yi] : null; });
    return { title:'出生人口', min:Math.min.apply(null,vals), max:Math.max.apply(null,vals), unit:'万',
      bar:'linear-gradient(90deg,'+rampBirths.join(',')+')' };
  }
  if (metric === 'rate') {
    var vals2 = objVals(function(p){ return has(p, yi) && p.rate[yi] != null ? p.rate[yi] : null; });
    return { title:'出生率', min:Math.min.apply(null,vals2), max:Math.max.apply(null,vals2), unit:'‰',
      bar:'linear-gradient(90deg,'+rampRate.join(',')+')' };
  }
  var ds = objVals(function(p){ return delta10(p, yi); });
  var M = Math.max.apply(null, ds.map(Math.abs).concat([1]));
  return { title:'十年变化', min:-M, max:M, unit:'%',
    bar:'linear-gradient(90deg,'+rampDelta.join(',')+')' };
}
function objVals(f){
  var out = [];
  for (var n in D.series) { var v = f(D.series[n]); if (v != null && isFinite(v)) out.push(v); }
  return out.length ? out : [0, 1];
}
function valueColor(v, li){
  if (metric === 'delta') {
    var t = (v - li.min) / (li.max - li.min || 1);
    return rampColor(rampDelta, t);
  }
  var t = (v - li.min) / (li.max - li.min || 1);
  return rampColor(rampBirths, t);
}

function YEARS(){ return D.years; }

function updateLegend(){
  var li = legendInfo();
  document.getElementById('lgTitle').textContent = li.title;
  document.getElementById('lgBar').style.background = li.bar;
  var fu = function(v){ return fmt1(v) + ' ' + (metric==='delta'?'%':li.unit); };
  document.getElementById('lgMin').textContent = fu(li.min);
  document.getElementById('lgMax').textContent = fu(li.max);
  return li;
}

function mapOption(){
  var yi = YEARS().indexOf(year);
  var li = updateLegend();
  var data = [];
  var regions = [];
  /* 选中省注册为独立地图（该省 feature 排最后绘制），描边全周覆盖相邻省界 */
  var mapName = 'china';
  if (selected && D.series[selected]) {
    var feats = window.CHINA_GEO.features;
    var selF = feats.filter(function(f){ return f.properties.name === selected; });
    var restF = feats.filter(function(f){ return f.properties.name !== selected; });
    echarts.registerMap('china-focus-y', { type: 'FeatureCollection', features: restF.concat(selF, [NANHAI_BOX]) });
    mapName = 'china-focus-y';
  }
  for (var name in D.series) {
    var p = D.series[name];
    var v = metricValue(p, yi);
    var item = { name: name, value: v };
    data.push(item);
    var region = { name: name };
    if (v != null && isFinite(v)) {
      var c = valueColor(v, li);
      if (name === selected) c = GOLD;
      region.itemStyle = {
        areaColor: c,
        borderColor: name === selected ? '#171A20' : '#FFFFFF',
        borderWidth: name === selected ? 2 : 0.7
      };
      if (name === selected) {
        /* 选中省悬停时保持选中样式（金色 + 深描边），不回落到 geo 级白色描边悬停 */
        region.emphasis = { itemStyle: { areaColor: GOLD, borderColor: '#171A20', borderWidth: 2 } };
      }
    }
    regions.push(region);
  }
  /* 南海诸岛方框附图（ECharts 内置区域）：底色取地图色带浅蓝（与省域同一套蓝）；
     悬停整区填充金色（与省域悬停一致）；不参与选中 */
  regions.push({
    name: '南海诸岛',
    itemStyle: { areaColor: '#B7C7EF', borderColor: '#B7C7EF', borderWidth: 0.3 },
    emphasis: { itemStyle: { areaColor: GOLD, borderColor: '#B7C7EF', borderWidth: 0.3 } },
    select: { disabled: true }
  });
  var series = [{
    type: 'map', geoIndex: 0, selectedMode: false,
    label: { show: false },
    itemStyle: { borderWidth: 0, borderColor: 'rgba(255,255,255,0)', areaColor: 'rgba(255,255,255,0)' },
    data: data
  }];
  return {
    geo: {
      map: mapName, roam: true, scaleLimit: { min: 0.8, max: 5 },
      aspectScale: 0.82,
      layoutCenter: ['50%', '58%'], layoutSize: geoLayoutSize(),
      itemStyle: { borderColor: '#FFFFFF', borderWidth: 0.7, areaColor: '#F4F4F4' },
      emphasis: { label: { show: false }, itemStyle: { areaColor: GOLD, borderColor: '#FFFFFF', borderWidth: 1 } },
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
        /* 光标下方；右半区向左展开，避开右上角 */
        var cw = Array.isArray(size.contentSize) ? size.contentSize[0] : size.contentSize.width;
        var ch = Array.isArray(size.contentSize) ? size.contentSize[1] : size.contentSize.height;
        var x = (pt[0] > size.viewSize[0] * 0.5) ? pt[0] - cw - 18 : pt[0] + 18;
        var y = pt[1] + 18;
        if (y + ch > size.viewSize[1] - 10) y = Math.max(10, pt[1] - ch - 16);
        x = Math.max(10, Math.min(x, size.viewSize[0] - cw - 10));
        return [x, y];
      }
    },
    series: series
  };
}

/* ---------- 悬停大卡片 ---------- */
/* 卡片固定内容宽度（36 = 左右各 18px 内边距）：折线图宽度与之对齐，避免右侧留白。
   注意：各文字行须容纳于 CARD_W - 36 内，否则会换行 */
var CARD_W = 264, SPARK_W = CARD_W - 36;
function firstIdx(vals){
  for (var i = 0; i < vals.length; i++) if (vals[i] != null && vals[i] !== 0) return i;
  return -1;
}
/* 近十年走势小图：以窗口首个有数据年份 = 100 归一化，所有省份共用同一刻度
   （0~120，超出时自动扩展），折线越陡 = 降幅越大，不同省份可直接比较；
   顶部虚线为基准线（100），底部实线为 0（归一化含义见地图下方说明）。 */
function sparkSVG(vals, fromYear){
  var w = SPARK_W, h = 46;
  var padL = 4, padY = 6;
  var plotR = w - padL, plotB = h - padY;
  var bi = firstIdx(vals);
  if (bi < 0) return '';
  var base = vals[bi];
  var mx = 100;
  vals.forEach(function(v){ if (v != null && v / base * 100 > mx) mx = v / base * 100; });
  var top = Math.max(120, Math.ceil(mx * 1.05 / 10) * 10);
  var xy = [];
  vals.forEach(function(v, i){
    if (v == null) return;
    xy.push({
      x: padL + i * (plotR - padL) / (vals.length - 1),
      y: padY + (plotB - padY) * (1 - Math.min(v / base * 100, top) / top),
      idx: i
    });
  });
  if (xy.length < 2) return '';
  /* Catmull-Rom → Bezier 平滑；按连续有值区间分段 */
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
    if (xy[k].idx === xy[k - 1].idx + 1) cur.push(xy[k]);
    else { runs.push(cur); cur = [xy[k]]; }
  }
  runs.push(cur);
  var last = xy[xy.length - 1];
  var y100 = padY + (plotB - padY) * (1 - 100 / top);
  var svg = '<svg width="' + w + '" height="' + (h + 22) + '" style="display:block;">'
    + '<line x1="' + padL + '" y1="' + y100.toFixed(1) + '" x2="' + plotR + '" y2="' + y100.toFixed(1) + '" stroke="#D0D1D2" stroke-width="1" stroke-dasharray="3 3"/>'
    + runs.map(function(r){ return '<path d="' + segD(r) + '" fill="none" stroke="#3E6AE1" stroke-width="1.8" stroke-linecap="round"/>'; }).join('')
    + '<circle cx="' + xy[0].x.toFixed(1) + '" cy="' + xy[0].y.toFixed(1) + '" r="2.4" fill="#171A20"/>'
    + '<circle cx="' + last.x.toFixed(1) + '" cy="' + last.y.toFixed(1) + '" r="2.4" fill="'
      + (last.idx === vals.length - 1 ? '#3E6AE1' : '#171A20') + '"/>'
    + '<text x="' + padL + '" y="' + (h + 12) + '" font-size="9.5" fill="#8E8E8E">' + fromYear + '</text>'
    + '<text x="' + plotR + '" y="' + (h + 12) + '" font-size="9.5" fill="#8E8E8E" text-anchor="end">' + (fromYear + vals.length - 1) + '</text>'
    + '<line x1="' + padL + '" y1="' + plotB + '" x2="' + plotR + '" y2="' + plotB + '" stroke="#D0D1D2" stroke-width="1"/>'
    + '</svg>';
  return svg;
}
function tooltipCard(params){
  var p = D.series[params.name];
  if (!p) return '<div style="width:' + CARD_W + 'px;box-sizing:border-box;padding:14px 18px;font-size:12.5px;color:#5C5E62;">' + params.name + '（暂无数据）</div>';
  var Y = YEARS(), yi = Y.indexOf(year);
  var b = p.births[yi], r = p.rate[yi];
  var pv = p.pop && p.pop[yi] != null ? p.pop[yi] : null;
  var head = '<div style="padding:14px 18px 6px;">'
    + '<div style="font-family:\'Noto Sans SC\',Arial,sans-serif;font-weight:500;font-size:18px;color:#171A20;">' + params.name + '</div>'
    + '<div style="font-size:11.5px;color:#8E8E8E;letter-spacing:normal;margin-top:2px;">' + year + ' 年</div>'
    + '</div>';
  var body = '<div style="padding:4px 18px 12px;">'
    + '<div style="font-size:11.5px;color:#5C5E62;letter-spacing:normal;">出生人口</div>'
    + '<div style="font-family:\'Noto Sans SC\',Arial,sans-serif;font-weight:500;font-size:27px;line-height:1.3;color:#3E6AE1;">'
    + (b == null ? '—' : fmt1(b) + ' <span style="font-size:13px;font-weight:500;">万</span>') + '</div>'
    + '<div style="font-size:12px;color:#393C41;margin-top:6px;">'
    + '总人口 <b style="color:#171A20;">' + (pv == null ? '—' : fmt1(pv)) + ' 万</b>'
    + '&nbsp; &nbsp;出生率 <b style="color:#171A20;">' + (r == null ? '—' : r) + '‰</b>'
    + '</div></div>';
  /* 近十年 sparkline（截止所选年份；以窗口首年 = 100 归一化，见 sparkSVG 说明） */
  var end = yi, start = Math.max(0, end - 9);
  var seg = p.births.slice(start, end + 1);
  var bi = firstIdx(seg);
  if (bi > 0) { start += bi; seg = seg.slice(bi); }   /* 前几年无数据时从首个有值年份起画 */
  var svg = bi < 0 ? '' : sparkSVG(seg, Y[start]);
  var sparkBlock = svg ? '<div style="padding:2px 18px 12px;">'
    + '<div style="font-size:11.5px;color:#5C5E62;letter-spacing:normal;margin-bottom:4px;">' + Y[start] + '~' + Y[end] + ' 年出生人口</div>'
    + svg + '</div>' : '';
  /* 十年变化（与图上基准年一致，即窗口首个有数据年份） */
  var dLine = '';
  var vN = 0;
  seg.forEach(function(v){ if (v != null) vN++; });
  var b1v = p.births[end];
  if (vN >= 2 && b1v != null && seg[0]) {
    var pctD = (b1v - seg[0]) / seg[0] * 100, absD = b1v - seg[0];
    dLine = '<div style="padding:0 18px 14px;font-size:12px;color:#393C41;">';
    dLine += '较 ' + Y[start] + ' 年 <b style="color:#3E6AE1;">' + (pctD > 0 ? '↗ +' : '↘ ') + pctD.toFixed(1) + '%</b>'
      + ' <span style="color:#8E8E8E;">（' + (absD > 0 ? '+' : '−') + fmt1(Math.abs(absD)) + ' 万）</span>';
    dLine += '</div>';
  }
  return '<div style="width:' + CARD_W + 'px;box-sizing:border-box;">' + head + body + sparkBlock + dLine + '</div>';
}

/* ---------- 侧栏 ---------- */
var panelBirths = null, panelRate = null;
function ensurePanelCharts(){
  if (!panelBirths) panelBirths = echarts.init(document.getElementById('panelBirths'));
  if (!panelRate) panelRate = echarts.init(document.getElementById('panelRate'));
  panelBirths.resize();
  panelRate.resize();
}
/* 全国面板采用国家统计局发布数据（data/nbs-national-data.xlsx），
   不由各省数据汇总相加——两套口径数值不同（如 2016 年发布 1883 万、各省合计约 1682.6 万） */
function natView(){
  document.getElementById('sideDefault').style.display = 'flex';
  document.getElementById('provPane').classList.remove('on');
  var NL = window.NATL_DATA;
  var ni = NL.years.indexOf(year);
  var natBv = NL.births[ni], natRt = NL.rates[ni];
  /* 近10年变化：国家序列同口径相减（pj 越界则无数据，显示 —） */
  var pj = ni - 9;
  var natBv10 = pj >= 0 ? NL.births[pj] : null;
  var natRt10 = pj >= 0 ? NL.rates[pj] : null;
  var pct = (natBv10 != null && natBv10) ? (natBv - natBv10) / natBv10 * 100 : null;
  var rateDpp = (natRt != null && natRt10 != null) ? Math.round((natRt - natRt10) * 100) / 100 : null;
  document.getElementById('natTitle').textContent = year + ' 年全国';
  /* 两个大数字随指标变化 */
  var k1 = document.getElementById('natB').parentNode.querySelector('.k');
  var k2 = document.getElementById('natR').parentNode.querySelector('.k');
  if (metric === 'rate') {
    k1.textContent = '出生率';
    document.getElementById('natB').innerHTML = (natRt != null ? natRt : '—') + '<small>‰</small>';
    k2.textContent = '近10年变化';
    document.getElementById('natR').innerHTML = (rateDpp != null ? (rateDpp > 0 ? '+' : '') + rateDpp.toFixed(2) : '—') + '<small>‰</small>';
  } else if (metric === 'delta') {
    k1.textContent = '近10年变化';
    document.getElementById('natB').innerHTML = (pct != null ? (pct > 0 ? '+' : '') + pct.toFixed(1) : '—') + '<small>%</small>';
    k2.textContent = '出生人口';
    document.getElementById('natR').innerHTML = Math.round(natBv).toLocaleString('en-US') + '<small>万</small>';
  } else {
    k1.textContent = '出生人口';
    document.getElementById('natB').innerHTML = Math.round(natBv).toLocaleString('en-US') + '<small>万</small>';
    k2.textContent = '出生率';
    document.getElementById('natR').innerHTML = (natRt != null ? natRt : '—') + '<small>‰</small>';
  }
  /* 排名条形图（样式同「各国生育补贴支出」页，随指标；省份部分仍用省数据） */
  var yi = YEARS().indexOf(year);
  var capEl = boardRoot.querySelector('.rank-cap');
  function rankVal(n){
    var p = D.series[n];
    if (metric === 'rate') { return p.rate[yi] != null ? p.rate[yi] : null; }
    if (metric === 'delta') { var d = deltaInfo(p, yi); return d ? d.pct : null; }
    return has(p, yi) ? p.births[yi] : null;
  }
  var capMain = metric === 'rate' ? '各省份' + YEARS()[yi] + '年出生率排序'
    : metric === 'delta' ? '各省份近10年变化排序'
    : '各省份' + YEARS()[yi] + '年出生人口排序';
  capEl.innerHTML = '<span class="cap-main">' + capMain + '</span><span class="cap-hint">点击条目进入详情</span>';
  /* 默认：出生人口/出生率从大到小，十年变化从小到大（降幅最大在前） */
  var desc = metric !== 'delta';
  /* 排名含全部省级行政区（含港澳台）；上方「全国」合计仍只算内地 31 省 */
  var rows = Object.keys(D.series).filter(function(n){ return rankVal(n) != null; })
    .sort(function(a, b){
      var va = rankVal(a), vb = rankVal(b);
      return desc ? vb - va : va - vb;
    })
    .map(function(n){ return { name: n, v: rankVal(n) }; });
  renderRankBar(rows);
}

/* ---------- 排名条形图（样式同「各国生育补贴支出」页） ---------- */
var rankBar = null, rankRows = [];
function ensureRankBar(){
  if (rankBar) return;
  rankBar = echarts.init(document.getElementById('rankBar'), null, {renderer:'canvas'});
  rankBar.on('click', function(p){
    var o = rankRows[p.dataIndex];
    if (o) {
      selected = o.name;
      chart.setOption(mapOption());
      renderSide();
      syncSelect();
    }
  });
}
function rankFmt(v){
  if (metric === 'rate') return v.toFixed(2);
  if (metric === 'delta') return (v > 0 ? '+' : '') + v.toFixed(1);
  return fmt1(v);
}
function renderRankBar(rows){
  var el = document.getElementById('rankBar');
  el.style.height = rows.length * 23 + 50 + 'px';
  ensureRankBar();
  rankBar.resize();
  /* rows 为显示顺序（自上而下）；ECharts y 轴首项在最底部，故倒序放入 */
  rankRows = rows.slice().reverse();
  var unit = metric === 'rate' ? '‰' : metric === 'delta' ? '%' : '万人';
  rankBar.setOption({
    animationDuration: playTimer ? 0 : 420,   /* 播放时逐年刷新，不做生长动画 */
    grid: { left: 44, right: 42, top: 6, bottom: 22 },
    tooltip: {
      trigger: 'item',
      /* ECharts 默认让悬停框边框跟随数据项颜色（第一名蓝柱下很明显），统一直接去掉 */
      borderWidth: 0,
      textStyle: { fontSize: 11.5, fontFamily: 'Noto Sans SC, Arial, sans-serif' },
      formatter: function(p){
        var o = rankRows[p.dataIndex];
        return '<b>' + o.name + '</b>　' + year + ' 年<br>'
          + (metric === 'rate' ? '出生率' : metric === 'delta' ? '近10年变化' : '出生人口')
          + '：' + rankFmt(o.v) + (metric === 'births' ? ' 万人' : unit);
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
      axisLabel: { fontFamily: 'Noto Sans SC, Arial, sans-serif', fontSize: 10, color: '#8E8E8E', formatter: function(v){ return v + unit; } }
    },
    yAxis: {
      type: 'category', data: rankRows.map(function(o){ return shortName(o.name); }),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { fontFamily: 'Noto Sans SC, Arial, sans-serif', fontSize: 11.5, color: '#393C41' }
    },
    series: [{
      type: 'bar', barWidth: 10, cursor: 'pointer',
      data: rankRows.map(function(o, i){
        /* y 轴倒序放入：显示在最上方的第一名即 rankRows 末项 */
        var top = i === rankRows.length - 1;
        return {
          value: o.v,
          itemStyle: { color: top ? '#3E6AE1' : '#D6D8DC', borderRadius: 2 },
          emphasis: { itemStyle: { color: '#3E6AE1' }, label: { color: '#3E6AE1' } },
          label: { position: o.v < 0 ? 'left' : 'right', color: top ? '#3E6AE1' : '#8E8E8E', fontWeight: 400 }
        };
      }),
      label: {
        show: true, fontFamily: 'Noto Sans SC, Arial, sans-serif', fontSize: 10,
        formatter: function(p){ return rankFmt(p.value); }
      }
    }]
  }, true);
}
function provView(name){
  var p = D.series[name];
  var Y = YEARS(), yi = Y.indexOf(year);
  document.getElementById('sideDefault').style.display = 'none';
  document.getElementById('provPane').classList.add('on');
  document.getElementById('pName').textContent = name;
  drawPanelChart(p);
  drawTable(p, yi);
  var notesEl = document.getElementById('pNotes');
  if (notesEl) {
    var mm = D.meta && D.meta[name] ? D.meta[name] : null;
    notesEl.innerHTML = (mm && mm.notes)
      ? mm.notes.split('|||').map(function(l){
          var cls = /^注/.test(l) ? 'n-light' : 'n-source';
          return '<p class="' + cls + '">' + l + '</p>';
        }).join('')
      : '';
  }
}
function drawPanelChart(p){
  ensurePanelCharts();
  var Y = YEARS();
  panelBirths.setOption(panelLineOption(Y, p.births, '万人', '#3E6AE1'), true);
  panelRate.setOption(panelLineOption(Y, p.rate, '‰', '#5C5E62'), true);
}
function panelLineOption(Y, series, unit, color){
  var yi = Y.indexOf(year);
  /* 从该指标第一个有数据的年份开始 */
  var start = 0;
  while (start < series.length && series[start] == null) start++;
  var yrs = Y.slice(start), vals = series.slice(start);
  var curIdx = yi - start;
  return {
    /* containLabel 让 y 轴刻度贴画布左缘（各省刻度宽度不同，自动适配），
       消除固定 left:58 在窄面板上留下的死空白；bottom 相应减小抵消 x 刻度被计入的高度 */
    grid: { left: 2, right: 20, top: 22, bottom: 8, containLabel: true },
    /* 折线与「断点圆点」是两组同值系列，悬停只取折线一条，避免显示两个相同数字 */
    tooltip: {
      trigger: 'axis', textStyle: { fontSize: 11 },
      formatter: function(params){
        params = Array.isArray(params) ? params : [params];
        var p = null;
        for (var i = 0; i < params.length; i++) {
          if (params[i] && params[i].seriesType === 'line') { p = params[i]; break; }
        }
        if (!p || p.value == null) return '';
        return p.marker + p.axisValueLabel + '：' + fmt1(p.value) + ' ' + unit;
      }
    },
    xAxis: {
      type: 'category', data: yrs, boundaryGap: false,
      name: '年', nameLocation: 'end', nameGap: 8,
      nameTextStyle: { color: '#8E8E8E', fontSize: 10 },
      axisLine: { lineStyle: { color: '#EEEEEE' } }, axisTick: { show: false },
      axisLabel: { fontFamily: 'Noto Sans SC, Arial, sans-serif', fontSize: 9.5, color: '#8E8E8E',
        interval: Math.ceil(yrs.length / 8) }
    },
    yAxis: {
      type: 'value', splitNumber: 3,
      splitLine: { lineStyle: { color: '#EEEEEE', type: 'dashed' } },
      axisLabel: { fontFamily: 'Noto Sans SC, Arial, sans-serif', fontSize: 9.5, color: '#8E8E8E', formatter: '{value}' },
      axisLine: { show: false }, axisTick: { show: false }
    },
    series: [{
      type: 'line', data: vals, symbol: 'none', smooth: 0.35,
      lineStyle: { color: color, width: 2, cap: 'round', join: 'round' }
    }, {
      /* 断点年份以圆点呈现 */
      type: 'scatter', data: vals, symbolSize: 4,
      itemStyle: { color: color, opacity: 0.85 }
    }, {
      type: 'scatter', data: (curIdx >= 0 && curIdx < vals.length && vals[curIdx] != null)
        ? [{ value: [curIdx, vals[curIdx]], symbolSize: 7, itemStyle: { color: color, borderColor: '#fff', borderWidth: 1.5 } }]
        : []
    }]
  };
}
function drawTable(p, yi){
  var Y = YEARS();
  /* 第一个有数据的年份：数据表与"全部年份趋势"对应，展示全程 */
  var first = Y.length - 1;
  for (var i = 0; i < Y.length; i++) {
    if (p.births[i] != null || p.rate[i] != null || (p.pop && p.pop[i] != null)) { first = i; break; }
  }
  var html = '';
  for (var i = Y.length - 1; i >= first; i--) {
    html += '<tr' + (i === yi ? ' class="cur"' : '') + '><td>' + Y[i] + '</td><td>'
      + (p.births[i] == null ? '—' : fmt1(p.births[i])) + '</td><td>'
      + (p.rate[i] == null ? '—' : p.rate[i]) + '</td><td>'
      + (p.pop && p.pop[i] != null ? fmt1(p.pop[i]) : '—') + '</td></tr>';
  }
  document.getElementById('pTbody').innerHTML = html;
}
function renderSide(){
  if (selected && D.series[selected]) provView(selected); else natView();
}

/* ---------- 年份选择（地图底部年份轴 1978~2025，含播放与整十年刻度） ---------- */
var slider = document.getElementById('yearSlider');
var playBtn = document.getElementById('playBtn');
var playTimer = null;
function setYear(y){
  var Y = YEARS();
  var lo = +slider.min || Y[0];
  var hi = Y[Y.length - 1];
  y = Math.max(lo, Math.min(hi, y));
  year = y;
  slider.value = y;
  /* 填充比例按滑杆范围（1978~2025）计算，而非数据起点 1949，否则与圆点错位 */
  slider.style.setProperty('--fill', ((y - lo) / (hi - lo) * 100) + '%');
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
/* 整十年刻度（含起点整十年时一并标出），可点击直达；末年仅在与相邻刻度间距足够
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
function stopPlay(){
  if (!playTimer) return;
  clearInterval(playTimer);
  playTimer = null;
  if (playBtn) {
    playBtn.classList.remove('playing');
    playBtn.querySelector('.ico-play').style.display = '';
    playBtn.querySelector('.ico-pause').style.display = 'none';
  }
}
if (playBtn) {
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
}
slider.addEventListener('input', function(){ stopPlay(); setYear(+slider.value); });
document.addEventListener('keydown', function(e){
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  if (e.key === 'ArrowLeft') { stopPlay(); setYear(year - 1); e.preventDefault(); }
  if (e.key === 'ArrowRight') { stopPlay(); setYear(year + 1); e.preventDefault(); }
});

/* 侧栏关闭 */
document.getElementById('pClose').addEventListener('click', function(){
  selected = null;
  chart.setOption(mapOption());
  renderSide();
  syncSelect();
});
/* 标签页 */
boardRoot.querySelectorAll('.tabs button').forEach(function(btn){
  btn.addEventListener('click', function(){
    boardRoot.querySelectorAll('.tabs button').forEach(function(b){ b.classList.toggle('on', b === btn); });
    document.getElementById('paneTrend').classList.toggle('on', btn.getAttribute('data-tab') === 'trend');
    document.getElementById('paneTable').classList.toggle('on', btn.getAttribute('data-tab') === 'table');
    if (btn.getAttribute('data-tab') === 'trend' && panelBirths) { panelBirths.resize(); panelRate.resize(); }
  });
});
chart.on('click', function(params){
  if (params.name && D.series[params.name]) {
    selected = params.name;
    chart.setOption(mapOption());
    renderSide();
    syncSelect();
  }
});
/* 全国 / 省份选择控件 */
var provSelect = document.getElementById('provSelect');
function fillSelect(){
  var names = Object.keys(D.series).sort(function(a, b){ return a.localeCompare(b, 'zh-Hans-CN'); });
  var html = '<option value="">全国</option>';
  names.forEach(function(n){
    html += '<option value="' + n + '">' + n + '</option>';
  });
  provSelect.innerHTML = html;
  provSelect.value = selected || '';
}
function syncSelect(){ provSelect.value = selected || ''; }
provSelect.addEventListener('change', function(){
  selected = provSelect.value || null;
  chart.setOption(mapOption());
  renderSide();
});
window.addEventListener('resize', function(){
  chart.resize();
  chart.setOption({ geo: { layoutSize: geoLayoutSize() } });
  renderTicks();
  if (panelBirths) panelBirths.resize();
  if (panelRate) panelRate.resize();
  if (rankBar) rankBar.resize();
});

/* ---------- 年份轴范围刷新（数据变化后调用） ---------- */
function refreshTimeline(){
  var Y = YEARS();
  var lo = Y[0] < 1978 ? 1978 : Y[0];   /* 年份轴自 1978 年起 */
  slider.min = lo; slider.max = Y[Y.length - 1];
  renderTicks();
  setYear(Math.min(Math.max(year, lo), Y[Y.length - 1]));
}
function refreshHead(){
  var Y = YEARS();
  var el = document.getElementById('yearRange');
  if (el) el.textContent = Y[0] + '–' + Y[Y.length - 1];
}

/* ==================== 启动 ==================== */
refreshTimeline();
refreshHead();
fillSelect();
chart.setOption(mapOption());
renderSide();

window.__mapState = {
  get metric(){ return metric; },
  get selected(){ return selected; },
  get year(){ return year; }
};
})();
