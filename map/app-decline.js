
(function(){
"use strict";

/* ==================== 数据层 ==================== */
/* 本节数据直接由各省历年生育数据（PROV_DATA）推导：
   b0/b1 = 2016/2025 年出生人口，abs/pct = 2016→2025 的减少量与降幅（%），
   pop1 = 2025 年常住人口，seg = 2016~2025 逐年出生人口。
   显示精度（1 位小数）与独立数据集完全一致。 */
var P = window.PROV_DATA;
var Y0 = 2016, Y1 = 2025;
var I0 = P.years.indexOf(Y0), I1 = P.years.indexOf(Y1);
var D = { y0: Y0, y1: Y1, series: {} };
(function(){
  for (var n in P.series) {
    var s = P.series[n];
    var b0 = s.births[I0], b1 = s.births[I1];
    if (b0 == null || b1 == null || !b0) continue;
    D.series[n] = {
      b0: b0, b1: b1, abs: b1 - b0,
      pct: (b1 - b0) / b0 * 100,
      pop1: s.pop ? s.pop[I1] : null,
      seg: s.births.slice(I0, I1 + 1)
    };
  }
})();
var selected = null;

function shortName(full){ return full.replace(/(特别行政区|维吾尔自治区|回族自治区|壮族自治区|自治区|省|市)$/, ''); }
function fmt1(v){ return (Math.round(v * 10) / 10).toLocaleString('en-US'); }
function sign1(v){ return (v > 0 ? '+' : '−') + fmt1(Math.abs(v)); }

/* 降幅范围：颜色越深 = 降幅越大 */
var PMIN = 0, PMAX = -Infinity, hasInit = false;
(function(){
  for (var n in D.series) {
    var v = D.series[n].pct;
    if (v == null) continue;
    if (!hasInit) { PMIN = v; PMAX = v; hasInit = true; continue; }
    if (v < PMIN) PMIN = v;
    if (v > PMAX) PMAX = v;
  }
})();

/* 色带：单一红色系，降幅越大颜色越深 */
var ramp = ['#FBF0F0','#F6D9D9','#EFB7B7','#E38C8C','#D45F5F','#C12F2F'];
var GOLD = 'rgba(255,215,0,0.8)';
function lerpColor(a, b, t){
  var pa = [parseInt(a.substr(1,2),16), parseInt(a.substr(3,2),16), parseInt(a.substr(5,2),16)];
  var pb = [parseInt(b.substr(1,2),16), parseInt(b.substr(3,2),16), parseInt(b.substr(5,2),16)];
  return 'rgb(' + pa.map(function(x,i){ return Math.round(x + (pb[i]-x)*t); }).join(',') + ')';
}
function rampColor(t){
  t = Math.max(0, Math.min(1, t));
  var seg = t * (ramp.length - 1);
  var i = Math.min(ramp.length - 2, Math.floor(seg));
  return lerpColor(ramp[i], ramp[i+1], seg - i);
}
function pctColor(pct){
  /* PMAX（降幅最小）→ 浅，PMIN（降幅最大）→ 深 */
  var t = (PMAX - pct) / (PMAX - PMIN || 1);
  return rampColor(t);
}

/* 地图尺寸自适应：尽量占满高度，但宽度始终不超出容器（避免裁掉新疆/黑龙江边缘） */
function geoLayoutSize(){
  var el = document.getElementById('d-map');
  var w = (el && el.clientWidth) || 800, h = (el && el.clientHeight) || 600;
  var byMin = Math.min(w, h) * 1.05;
  var px = Math.min(byMin, w * 0.99);
  return Math.round(px);
}

/* ==================== 图表 ==================== */
var MQ_NARROW = window.matchMedia('(max-width:960px)');
var chart = echarts.init(document.getElementById('d-map'), null, {renderer:'canvas'});
/* 滚轮缩放只在光标落在地图上生效（见 ../wheel-zoom.js） */
if (window.bindMapWheelZoom) window.bindMapWheelZoom(document.getElementById('d-map'), chart);

/* ECharts 对注册名为 china 的地图会自动附加「南海诸岛」方框附图；
   选中省份切换到自注册的 china-focus-d 地图后需手动带上同一附图 */
var NANHAI_BOX = {"type":"Feature","properties":{"name":"南海诸岛"},"geometry":{"type":"MultiPolygon","coordinates":[[[[126,24.75],[126.666667,24.2],[127.428571,24.15],[128.857143,24.5],[130,24.95],[130.952381,24.95],[131.333333,24.45],[131.619048,24.95],[132.095238,24.95],[132.095238,25],[126.47619,25],[126,24.75]]],[[[127.238095,23.85],[127.809524,23.95],[127.52381,23.45],[127.047619,23.35],[127.238095,23.85]]],[[[127.142857,22.7],[127.333333,22.25],[127.428571,22.25],[127.238095,22.7],[127.142857,22.7]]],[[[127.52381,21.6],[127.142857,21.2],[127.238095,21.2],[127.714286,21.6],[127.52381,21.6]]],[[[126.571429,20.4],[126.761905,20],[126.857143,20],[126.761905,20.4],[126.571429,20.4]]],[[[128.190476,19.1],[128.761905,19.3],[128.857143,19.3],[128.380952,19.1],[128.190476,19.1]]],[[[129.52381,19.95],[130.095238,20.55],[130.190476,20.55],[129.714286,19.95],[129.52381,19.95]]],[[[130.571429,21.35],[130.857143,21.75],[131.047619,21.75],[130.761905,21.35],[130.571429,21.35]]],[[[130.857143,22.5],[130.857143,22.95],[131.047619,22.95],[131.047619,22.5],[130.857143,22.5]]],[[[130.952381,23.4],[131.238095,23.75],[131.333333,23.75],[131.047619,23.4],[130.952381,23.4]]],[[[131.52381,24.1],[131.904762,24.5],[132,24.5],[131.714286,24.1],[131.52381,24.1]]],[[[126,24.75],[126,18.35],[132.095238,18.35],[132.095238,25],[132,25],[132,18.4],[126.095238,18.4],[126.095238,24.75],[126,24.75]]]]}};

function updateLegend(){
  document.getElementById('d-lgBar').style.background =
    'linear-gradient(90deg,' + ramp.slice().reverse().join(',') + ')';
  document.getElementById('d-lgMin').textContent = fmt1(PMIN) + '%';
  document.getElementById('d-lgMax').textContent = fmt1(PMAX) + '%';
}

function mapOption(){
  var data = [];
  var regions = [];
  var mapName = 'china';
  if (selected && D.series[selected]) {
    var feats = window.CHINA_GEO.features;
    var selF = feats.filter(function(f){ return f.properties.name === selected; });
    var restF = feats.filter(function(f){ return f.properties.name !== selected; });
    echarts.registerMap('china-focus-d', { type: 'FeatureCollection', features: restF.concat(selF, [NANHAI_BOX]) });
    mapName = 'china-focus-d';
  }
  for (var name in D.series) {
    var p = D.series[name];
    data.push({ name: name, value: p.pct });
    var c = pctColor(p.pct);
    if (name === selected) c = GOLD;
    var region = {
      name: name,
      itemStyle: {
        areaColor: c,
        borderColor: name === selected ? '#171A20' : '#FFFFFF',
        borderWidth: name === selected ? 2 : 0.7
      }
    };
    if (name === selected) {
      region.emphasis = { itemStyle: { areaColor: GOLD, borderColor: '#171A20', borderWidth: 2 } };
    }
    regions.push(region);
  }
  regions.push({
    name: '南海诸岛',
    itemStyle: { areaColor: '#EFB7B7', borderColor: '#EFB7B7', borderWidth: 0.3 },
    emphasis: { itemStyle: { areaColor: GOLD, borderColor: '#EFB7B7', borderWidth: 0.3 } },
    select: { disabled: true }
  });
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
    }]
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
/* 近十年走势小图：以窗口首年 = 100 归一化，所有省份共用同一刻度
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
  return '<svg width="' + w + '" height="' + (h + 22) + '" style="display:block;">'
    + '<line x1="' + padL + '" y1="' + y100.toFixed(1) + '" x2="' + plotR + '" y2="' + y100.toFixed(1) + '" stroke="#D0D1D2" stroke-width="1" stroke-dasharray="3 3"/>'
    + runs.map(function(r){ return '<path d="' + segD(r) + '" fill="none" stroke="#E13D3D" stroke-width="1.8" stroke-linecap="round"/>'; }).join('')
    + '<circle cx="' + xy[0].x.toFixed(1) + '" cy="' + xy[0].y.toFixed(1) + '" r="2.4" fill="#171A20"/>'
    + '<circle cx="' + last.x.toFixed(1) + '" cy="' + last.y.toFixed(1) + '" r="2.4" fill="'
      + (last.idx === vals.length - 1 ? '#E13D3D' : '#171A20') + '"/>'
    + '<text x="' + padL + '" y="' + (h + 12) + '" font-size="9.5" fill="#8E8E8E">' + fromYear + '</text>'
    + '<text x="' + plotR + '" y="' + (h + 12) + '" font-size="9.5" fill="#8E8E8E" text-anchor="end">' + (fromYear + vals.length - 1) + '</text>'
    + '<line x1="' + padL + '" y1="' + plotB + '" x2="' + plotR + '" y2="' + plotB + '" stroke="#D0D1D2" stroke-width="1"/>'
    + '</svg>';
}
function tooltipCard(params){
  var p = D.series[params.name];
  if (!p) return '<div style="width:' + CARD_W + 'px;box-sizing:border-box;padding:14px 18px;font-size:12.5px;color:#5C5E62;">' + params.name + '（暂无数据）</div>';
  var head = '<div style="padding:14px 18px 6px;">'
    + '<div style="font-family:\'Noto Sans SC\',Arial,sans-serif;font-weight:500;font-size:18px;color:#171A20;">' + params.name + '</div>'
    + '<div style="font-size:11.5px;color:#8E8E8E;letter-spacing:normal;margin-top:2px;">' + Y0 + ' → ' + Y1 + ' 年出生人口</div>'
    + '</div>';
  var body = '<div style="padding:4px 18px 12px;">'
    + '<div style="font-size:11.5px;color:#5C5E62;letter-spacing:normal;">下降幅度</div>'
    + '<div style="font-family:\'Noto Sans SC\',Arial,sans-serif;font-weight:500;font-size:27px;line-height:1.3;color:#E13D3D;">'
    + '↘ ' + fmt1(Math.abs(p.pct)) + ' <span style="font-size:13px;font-weight:500;">%</span></div>'
    + '<div style="font-size:12px;color:#393C41;margin-top:6px;">'
    + Y0 + ' 年 <b style="color:#171A20;">' + fmt1(p.b0) + ' 万</b> → ' + Y1 + ' 年 <b style="color:#171A20;">' + fmt1(p.b1) + ' 万</b>'
    + '<div style="color:#8E8E8E;margin-top:2px;">共减少 ' + fmt1(Math.abs(p.abs)) + ' 万</div>'
    + '</div></div>';
  var sparkBlock = '<div style="padding:2px 18px 14px;">'
    + '<div style="font-size:11.5px;color:#5C5E62;letter-spacing:normal;margin-bottom:4px;">' + Y0 + '~' + Y1 + ' 年出生人口</div>'
    + sparkSVG(p.seg, Y0) + '</div>';
  return '<div style="width:' + CARD_W + 'px;box-sizing:border-box;">' + head + body + sparkBlock + '</div>';
}

/* ---------- 侧栏：全国 ---------- */
/* 全国面板采用国家统一发布数据（2016 年 1883 万 / 2025 年 792 万），
   不由各省数据汇总相加——各省合计口径偏小（2016 年约 1682.6 万），见标题 ⓘ 说明 */
var NAT_B0 = 1883, NAT_B1 = 792;
function natView(){
  document.getElementById('d-sideDefault').style.display = 'flex';
  document.getElementById('d-provPane').classList.remove('on');
  var pct = (NAT_B1 - NAT_B0) / NAT_B0 * 100;
  document.getElementById('d-natB0').innerHTML = fmt1(NAT_B0) + '<small>万</small>';
  document.getElementById('d-natB1').innerHTML = fmt1(NAT_B1) + '<small>万</small>';
  document.getElementById('d-natDelta').innerHTML =
    '十年间出生人口 <b class="down">减少 −' + fmt1(Math.abs(pct)) + '%</b>（合计 ' + sign1(NAT_B1 - NAT_B0) + ' 万人）';
  /* 排名含全部省级行政区（含港澳台） */
  var rows = Object.keys(D.series).map(function(n){ return { name: n, pct: D.series[n].pct, abs: D.series[n].abs }; })
    .sort(function(a, b){ return a.pct - b.pct; });
  renderRankBar(rows);
}

/* ---------- 排名条形图（样式同「各省历年生育地图」节） ---------- */
var rankBar = null, rankRows = [];
function ensureRankBar(){
  if (rankBar) return;
  rankBar = echarts.init(document.getElementById('d-rankBar'), null, {renderer:'canvas'});
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
function renderRankBar(rows){
  var el = document.getElementById('d-rankBar');
  el.style.height = rows.length * 23 + 50 + 'px';
  ensureRankBar();
  rankBar.resize();
  /* rows 为显示顺序（自上而下）；ECharts y 轴首项在最底部，故倒序放入 */
  rankRows = rows.slice().reverse();
  rankBar.setOption({
    animationDuration: 420,
    grid: { left: 44, right: 46, top: 6, bottom: 22 },
    tooltip: {
      trigger: 'item',
      /* ECharts 默认让悬停框边框跟随数据项颜色（第一名红柱下很明显），统一直接去掉 */
      borderWidth: 0,
      textStyle: { fontSize: 11.5, fontFamily: 'Noto Sans SC, Arial, sans-serif' },
      formatter: function(p){
        var o = rankRows[p.dataIndex];
        return '<b>' + o.name + '</b>　' + Y0 + '→' + Y1 + '<br>'
          + '下降幅度：' + fmt1(o.pct) + '%（' + sign1(o.abs) + ' 万）';
      },
      /* .rank-scroll 是滚动容器且 #d-rankBar 高于可视区：提示卡须按「可视区」定位 */
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
      /* 全部为负值：默认 0 线在右、柱形自右向左延伸；inverse 让 0 线回到
         左缘，柱形仍按数值画（负数），但视觉上从左缘向右生长 */
      type: 'value', splitNumber: 4, inverse: true,
      axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: '#EEEEEE' } },
      axisLabel: { fontFamily: 'Noto Sans SC, Arial, sans-serif', fontSize: 10, color: '#8E8E8E', formatter: function(v){ return v + '%'; } }
    },
    yAxis: {
      type: 'category', data: rankRows.map(function(o){ return shortName(o.name); }),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { fontFamily: 'Noto Sans SC, Arial, sans-serif', fontSize: 11.5, color: '#393C41' }
    },
    series: [{
      type: 'bar', barWidth: 10, cursor: 'pointer',
      data: rankRows.map(function(o, i){
        /* 第一名（降幅最大，显示在顶端）用强调红标出；悬停时柱与数字同步变色 */
        var top = i === rankRows.length - 1;
        return {
          value: o.pct,
          itemStyle: { color: top ? '#E13D3D' : '#D6D8DC', borderRadius: 2 },
          emphasis: {
            itemStyle: { color: top ? '#C12F2F' : '#E13D3D' },
            label: { color: top ? '#C12F2F' : '#E13D3D' }
          },
          label: { position: 'right', color: top ? '#E13D3D' : '#8E8E8E', fontWeight: 400 }
        };
      }),
      label: {
        show: true, fontFamily: 'Noto Sans SC, Arial, sans-serif', fontSize: 10,
        formatter: function(p){ return fmt1(p.value) + '%'; }
      }
    }]
  }, true);
}

/* ---------- 原始数据表（样式同「各国生育补贴支出」页数据表） ---------- */
function renderDataTable(){
  var tbody = document.getElementById('d-tbody');
  if (!tbody) return;
  var rows = [];
  for (var n in D.series) {
    var p = D.series[n];
    rows.push({ name: n, b0: p.b0, b1: p.b1, abs: p.abs, pct: p.pct, pop1: p.pop1 });
  }
  rows.sort(function(a, b){ return a.pct - b.pct; });
  var html = '';
  rows.forEach(function(o, i){
    html += '<tr>'
      + '<td>' + (i + 1) + '</td>'
      + '<td>' + o.name + '</td>'
      + '<td>' + (o.pop1 == null ? '—' : fmt1(o.pop1)) + '</td>'
      + '<td>' + fmt1(o.b0) + '</td>'
      + '<td>' + fmt1(o.b1) + '</td>'
      + '<td>' + sign1(o.abs) + '</td>'
      + '<td>' + sign1(o.pct) + '</td>'
      + '</tr>';
  });
  tbody.innerHTML = html;
}

/* ---------- 侧栏：省份详情 ---------- */
var panelBirths = null;
function ensurePanelChart(){
  if (!panelBirths) panelBirths = echarts.init(document.getElementById('d-panelBirths'));
  panelBirths.resize();
}
function provView(name){
  var p = D.series[name];
  document.getElementById('d-sideDefault').style.display = 'none';
  document.getElementById('d-provPane').classList.add('on');
  document.getElementById('d-pName').textContent = name;
  document.getElementById('d-sB0').innerHTML = fmt1(p.b0) + '<small>万</small>';
  document.getElementById('d-sB1').innerHTML = fmt1(p.b1) + '<small>万</small>';
  document.getElementById('d-sAbs').innerHTML = sign1(p.abs) + '<small>万</small>';
  document.getElementById('d-sPct').innerHTML = '−' + fmt1(Math.abs(p.pct)) + '<small>%</small>';
  ensurePanelChart();
  panelBirths.setOption(panelLineOption(p.seg), true);
}
function panelLineOption(vals){
  var yrs = [];
  for (var y = Y0; y <= Y1; y++) yrs.push(String(y));
  var curIdx = vals.length - 1;
  return {
    /* 窄屏改用 containLabel 自适应贴边：y 轴刻度贴画布左缘，消除固定 left:58
       在窄面板上留下的死空白（同「各省历年生育地图」节的做法）；
       bottom 相应减小抵消 x 刻度被计入 grid 的高度 */
    grid: MQ_NARROW.matches
      ? { left: 2, right: 12, top: 22, bottom: 8, containLabel: true }
      : { left: 58, right: 22, top: 22, bottom: 28 },
    tooltip: {
      trigger: 'axis', textStyle: { fontSize: 11 },
      formatter: function(params){
        params = Array.isArray(params) ? params : [params];
        var p = null;
        for (var i = 0; i < params.length; i++) {
          if (params[i] && params[i].seriesType === 'line') { p = params[i]; break; }
        }
        if (!p || p.value == null) return '';
        return p.marker + p.axisValueLabel + '：' + fmt1(p.value) + ' 万人';
      }
    },
    xAxis: {
      type: 'category', data: yrs, boundaryGap: false,
      axisLine: { lineStyle: { color: '#EEEEEE' } }, axisTick: { show: false },
      axisLabel: { fontFamily: 'Noto Sans SC, Arial, sans-serif', fontSize: 9.5, color: '#8E8E8E', interval: 0 }
    },
    yAxis: {
      type: 'value', splitNumber: 3,
      splitLine: { lineStyle: { color: '#EEEEEE', type: 'dashed' } },
      axisLabel: { fontFamily: 'Noto Sans SC, Arial, sans-serif', fontSize: 9.5, color: '#8E8E8E', formatter: '{value}' },
      axisLine: { show: false }, axisTick: { show: false }
    },
    series: [{
      type: 'line', data: vals, symbol: 'none', smooth: 0.35,
      lineStyle: { color: '#E13D3D', width: 2, cap: 'round', join: 'round' }
    }, {
      type: 'scatter', data: vals, symbolSize: 4,
      itemStyle: { color: '#E13D3D', opacity: 0.85 }
    }, {
      type: 'scatter', data: (vals[curIdx] != null)
        ? [{ value: [curIdx, vals[curIdx]], symbolSize: 7, itemStyle: { color: '#E13D3D', borderColor: '#fff', borderWidth: 1.5 } }]
        : []
    }]
  };
}
function renderSide(){
  if (selected && D.series[selected]) provView(selected); else natView();
}

/* ---------- 交互 ---------- */
document.getElementById('d-pClose').addEventListener('click', function(){
  selected = null;
  chart.setOption(mapOption());
  renderSide();
  syncSelect();
});
chart.on('click', function(params){
  if (params.name && D.series[params.name]) {
    selected = params.name;
    chart.setOption(mapOption());
    renderSide();
    syncSelect();
  }
});
var provSelect = document.getElementById('d-provSelect');
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
/* 断点翻转时需重设 option（resize 只重算尺寸，不会改 grid 留白） */
var lastNarrow = MQ_NARROW.matches;
window.addEventListener('resize', function(){
  chart.resize();
  chart.setOption({ geo: { layoutSize: geoLayoutSize() } });
  if (MQ_NARROW.matches !== lastNarrow) {
    lastNarrow = MQ_NARROW.matches;
    renderSide();
  }
  if (panelBirths) panelBirths.resize();
  if (rankBar) rankBar.resize();
});

/* ==================== 启动 ==================== */
updateLegend();
fillSelect();
chart.setOption(mapOption());
renderSide();
renderDataTable();
})();
