
(function(){
"use strict";

/* ==================== 数据层 ==================== */
var D = window.DECLINE_DATA;   /* {y0, y1, series{name:{b0,b1,abs,pct,seg}}} */
var Y0 = D.y0, Y1 = D.y1;
var selected = null;

var HMT = { '台湾省':1, '香港特别行政区':1, '澳门特别行政区':1 };
function mainlandNames(){
  var out = [];
  for (var n in D.series) if (!HMT[n]) out.push(n);
  return out;
}
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

/* 色带：单一蓝色系（同「各省生育地图」），降幅越大颜色越深 */
var ramp = ['#F0F3FA','#D9E2F6','#B7C7EF','#8CA6E3','#5F82D4','#2F55C0'];
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
  var el = document.getElementById('map');
  var w = (el && el.clientWidth) || 800, h = (el && el.clientHeight) || 600;
  var byMin = Math.min(w, h) * 1.05;
  var px = Math.min(byMin, w * 0.99);
  return Math.round(px);
}

/* ==================== 图表 ==================== */
var chart = echarts.init(document.getElementById('map'), null, {renderer:'canvas'});
echarts.registerMap('china', window.CHINA_GEO);

/* ECharts 对注册名为 china 的地图会自动附加「南海诸岛」方框附图；
   选中省份切换到自注册的 china-focus 地图后需手动带上同一附图 */
var NANHAI_BOX = {"type":"Feature","properties":{"name":"南海诸岛"},"geometry":{"type":"MultiPolygon","coordinates":[[[[126,24.75],[126.666667,24.2],[127.428571,24.15],[128.857143,24.5],[130,24.95],[130.952381,24.95],[131.333333,24.45],[131.619048,24.95],[132.095238,24.95],[132.095238,25],[126.47619,25],[126,24.75]]],[[[127.238095,23.85],[127.809524,23.95],[127.52381,23.45],[127.047619,23.35],[127.238095,23.85]]],[[[127.142857,22.7],[127.333333,22.25],[127.428571,22.25],[127.238095,22.7],[127.142857,22.7]]],[[[127.52381,21.6],[127.142857,21.2],[127.238095,21.2],[127.714286,21.6],[127.52381,21.6]]],[[[126.571429,20.4],[126.761905,20],[126.857143,20],[126.761905,20.4],[126.571429,20.4]]],[[[128.190476,19.1],[128.761905,19.3],[128.857143,19.3],[128.380952,19.1],[128.190476,19.1]]],[[[129.52381,19.95],[130.095238,20.55],[130.190476,20.55],[129.714286,19.95],[129.52381,19.95]]],[[[130.571429,21.35],[130.857143,21.75],[131.047619,21.75],[130.761905,21.35],[130.571429,21.35]]],[[[130.857143,22.5],[130.857143,22.95],[131.047619,22.95],[131.047619,22.5],[130.857143,22.5]]],[[[130.952381,23.4],[131.238095,23.75],[131.333333,23.75],[131.047619,23.4],[130.952381,23.4]]],[[[131.52381,24.1],[131.904762,24.5],[132,24.5],[131.714286,24.1],[131.52381,24.1]]],[[[126,24.75],[126,18.35],[132.095238,18.35],[132.095238,25],[132,25],[132,18.4],[126.095238,18.4],[126.095238,24.75],[126,24.75]]]]}};

function updateLegend(){
  document.getElementById('lgBar').style.background =
    'linear-gradient(90deg,' + ramp.slice().reverse().join(',') + ')';
  document.getElementById('lgMin').textContent = fmt1(PMIN) + '%';
  document.getElementById('lgMax').textContent = fmt1(PMAX) + '%';
}

function mapOption(){
  var data = [];
  var regions = [];
  var mapName = 'china';
  if (selected && D.series[selected]) {
    var feats = window.CHINA_GEO.features;
    var selF = feats.filter(function(f){ return f.properties.name === selected; });
    var restF = feats.filter(function(f){ return f.properties.name !== selected; });
    echarts.registerMap('china-focus', { type: 'FeatureCollection', features: restF.concat(selF, [NANHAI_BOX]) });
    mapName = 'china-focus';
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
    itemStyle: { areaColor: '#B7C7EF', borderColor: '#B7C7EF', borderWidth: 0.3 },
    emphasis: { itemStyle: { areaColor: GOLD, borderColor: '#B7C7EF', borderWidth: 0.3 } },
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
function sparkSVG(vals, fromYear){
  var w = 210, h = 46, pad = 4;
  var nums = vals.filter(function(v){ return v != null; });
  if (nums.length < 2) return '';
  var mx = Math.max.apply(null, nums), mn = Math.min.apply(null, nums);
  var xy = [];
  vals.forEach(function(v, i){
    if (v == null) return;
    var x = pad + i * (w - 2 * pad) / (vals.length - 1);
    var y = pad + (h - 2 * pad) * (1 - (v - mn) / (mx - mn || 1));
    xy.push({ x: x, y: y, last: i === vals.length - 1, idx: i });
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
    if (xy[k].idx === xy[k - 1].idx + 1) cur.push(xy[k]);
    else { runs.push(cur); cur = [xy[k]]; }
  }
  runs.push(cur);
  return '<svg width="' + w + '" height="' + (h + 22) + '" style="display:block;">'
    + runs.map(function(r){ return '<path d="' + segD(r) + '" fill="none" stroke="#3E6AE1" stroke-width="1.8" stroke-linecap="round"/>'; }).join('')
    + [xy[0], xy[xy.length - 1]].map(function(d){
        return '<circle cx="' + d.x.toFixed(1) + '" cy="' + d.y.toFixed(1) + '" r="2.4" fill="'
          + (d.last ? '#3E6AE1' : '#171A20') + '"/>';
      }).join('')
    + '<text x="' + pad + '" y="' + (h + 12) + '" font-size="9.5" fill="#8E8E8E">' + fromYear + '</text>'
    + '<text x="' + (w - pad) + '" y="' + (h + 12) + '" font-size="9.5" fill="#8E8E8E" text-anchor="end">' + (fromYear + vals.length - 1) + '</text>'
    + '<line x1="' + pad + '" y1="' + (h + 18) + '" x2="' + (w - pad) + '" y2="' + (h + 18) + '" stroke="#D0D1D2" stroke-width="1"/>'
    + '</svg>';
}
function tooltipCard(params){
  var p = D.series[params.name];
  if (!p) return '<div style="padding:14px 18px;font-size:12.5px;color:#5C5E62;">' + params.name + '（暂无数据）</div>';
  var head = '<div style="padding:14px 18px 6px;">'
    + '<div style="font-family:\'Noto Sans SC\',Arial,sans-serif;font-weight:500;font-size:18px;color:#171A20;">' + params.name + '</div>'
    + '<div style="font-size:11.5px;color:#8E8E8E;letter-spacing:normal;margin-top:2px;">' + Y0 + ' → ' + Y1 + ' 年出生人口</div>'
    + '</div>';
  var body = '<div style="padding:4px 18px 12px;">'
    + '<div style="font-size:11.5px;color:#5C5E62;letter-spacing:normal;">下降幅度</div>'
    + '<div style="font-family:\'Noto Sans SC\',Arial,sans-serif;font-weight:500;font-size:27px;line-height:1.3;color:#3E6AE1;">'
    + '↘ ' + fmt1(Math.abs(p.pct)) + ' <span style="font-size:13px;font-weight:500;">%</span></div>'
    + '<div style="font-size:12px;color:#393C41;margin-top:6px;">'
    + Y0 + ' 年 <b style="color:#171A20;">' + fmt1(p.b0) + ' 万</b>'
    + '&nbsp; &nbsp;' + Y1 + ' 年 <b style="color:#171A20;">' + fmt1(p.b1) + ' 万</b>'
    + '&nbsp; <span style="color:#8E8E8E;">（' + sign1(p.abs) + ' 万）</span>'
    + '</div></div>';
  var sparkBlock = '<div style="padding:2px 18px 14px;">'
    + '<div style="font-size:11.5px;color:#5C5E62;letter-spacing:normal;margin-bottom:4px;">' + Y0 + '~' + Y1 + ' 年出生人口（万人）</div>'
    + sparkSVG(p.seg, Y0) + '</div>';
  return head + body + sparkBlock;
}

/* ---------- 侧栏：全国 ---------- */
function natView(){
  document.getElementById('sideDefault').style.display = 'flex';
  document.getElementById('provPane').classList.remove('on');
  var names = mainlandNames();
  var b0 = 0, b1 = 0;
  names.forEach(function(n){
    b0 += D.series[n].b0;
    b1 += D.series[n].b1;
  });
  var pct = (b1 - b0) / b0 * 100;
  document.getElementById('natB0').innerHTML = fmt1(b0) + '<small>万</small>';
  document.getElementById('natB1').innerHTML = fmt1(b1) + '<small>万</small>';
  document.getElementById('natDelta').innerHTML =
    '十年间出生人口 <b>减少 −' + fmt1(Math.abs(pct)) + '%</b>（合计 ' + sign1(b1 - b0) + ' 万人）';
  var rows = names.map(function(n){ return { name: n, pct: D.series[n].pct, abs: D.series[n].abs }; })
    .sort(function(a, b){ return a.pct - b.pct; });
  renderRankBar(rows);
}

/* ---------- 排名条形图（样式同「各省生育地图」页） ---------- */
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
function renderRankBar(rows){
  var el = document.getElementById('rankBar');
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
      textStyle: { fontSize: 11.5, fontFamily: 'Noto Sans SC, Arial, sans-serif' },
      formatter: function(p){
        var o = rankRows[p.dataIndex];
        return '<b>' + o.name + '</b>　' + Y0 + '→' + Y1 + '<br>'
          + '下降幅度：' + fmt1(o.pct) + '%（' + sign1(o.abs) + ' 万）';
      },
      /* .rank-scroll 是滚动容器且 #rankBar 高于可视区：提示卡须按「可视区」定位 */
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
      axisLabel: { fontFamily: 'Noto Sans SC, Arial, sans-serif', fontSize: 10, color: '#8E8E8E', formatter: function(v){ return v + '%'; } }
    },
    yAxis: {
      type: 'category', data: rankRows.map(function(o){ return shortName(o.name); }),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { fontFamily: 'Noto Sans SC, Arial, sans-serif', fontSize: 11.5, color: '#393C41' }
    },
    series: [{
      type: 'bar', barWidth: 10, cursor: 'pointer',
      data: rankRows.map(function(o){
        return {
          value: o.pct,
          itemStyle: { color: '#D6D8DC', borderRadius: 2 },
          emphasis: { itemStyle: { color: '#A9ADB3' } },
          label: { position: 'left', color: '#8E8E8E', fontWeight: 400 }
        };
      }),
      label: {
        show: true, fontFamily: 'Noto Sans SC, Arial, sans-serif', fontSize: 10,
        formatter: function(p){ return fmt1(p.value) + '%'; }
      }
    }]
  }, true);
}

/* ---------- 侧栏：省份详情 ---------- */
var panelBirths = null;
function ensurePanelChart(){
  if (!panelBirths) panelBirths = echarts.init(document.getElementById('panelBirths'));
  panelBirths.resize();
}
function provView(name){
  var p = D.series[name];
  document.getElementById('sideDefault').style.display = 'none';
  document.getElementById('provPane').classList.add('on');
  document.getElementById('pName').textContent = name;
  document.getElementById('sB0').innerHTML = fmt1(p.b0) + '<small>万</small>';
  document.getElementById('sB1').innerHTML = fmt1(p.b1) + '<small>万</small>';
  document.getElementById('sAbs').innerHTML = sign1(p.abs) + '<small>万</small>';
  document.getElementById('sPct').innerHTML = '−' + fmt1(Math.abs(p.pct)) + '<small>%</small>';
  ensurePanelChart();
  panelBirths.setOption(panelLineOption(p.seg), true);
}
function panelLineOption(vals){
  var yrs = [];
  for (var y = Y0; y <= Y1; y++) yrs.push(String(y));
  var curIdx = vals.length - 1;
  return {
    grid: { left: 58, right: 22, top: 22, bottom: 28 },
    tooltip: {
      trigger: 'axis', textStyle: { fontSize: 11 },
      formatter: function(params){
        params = Array.isArray(params) ? params : [params];
        var p = null;
        for (var i = 0; i < params.length; i++) {
          if (params[i] && params[i].seriesType === 'line') { p = params[i]; break; }
        }
        if (!p || p.value == null) return '';
        return p.marker + p.axisValueLabel + '&nbsp;&nbsp;' + fmt1(p.value) + ' 万人';
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
      lineStyle: { color: '#3E6AE1', width: 2, cap: 'round', join: 'round' }
    }, {
      type: 'scatter', data: vals, symbolSize: 4,
      itemStyle: { color: '#3E6AE1', opacity: 0.85 }
    }, {
      type: 'scatter', data: (vals[curIdx] != null)
        ? [{ value: [curIdx, vals[curIdx]], symbolSize: 7, itemStyle: { color: '#3E6AE1', borderColor: '#fff', borderWidth: 1.5 } }]
        : []
    }]
  };
}
function renderSide(){
  if (selected && D.series[selected]) provView(selected); else natView();
}

/* ---------- 交互 ---------- */
document.getElementById('pClose').addEventListener('click', function(){
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
  if (panelBirths) panelBirths.resize();
  if (rankBar) rankBar.resize();
});

/* ==================== 启动 ==================== */
updateLegend();
fillSelect();
chart.setOption(mapOption());
renderSide();
})();
