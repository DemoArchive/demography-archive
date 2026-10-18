/* ============================================================
   人口档案馆 · 各国生育率与生育支持页 · 第二节「各国生育补贴支出」
   由原独立页 spending/app.js 并入：元素 ID 加 sp- 前缀，
   避免与第一节（各国生育率地图）的 ID 冲突。
   ============================================================ */
(function(){
"use strict";

/* ==================== 数据层 ==================== */
var D = window.SPEND;                 /* {years, list[{c,n,en,v[]}]} */
var YEARS = D.years;
var LIST = D.list;
var byIso = {};
LIST.forEach(function(r){ byIso[r.c] = r; });

var RANK_YEARS = [2021, 2022, 2023];  /* 可切换的排名年份 */
var year = 2021;                      /* 当前排名年份 */
var sel = 'ISL';                      /* 当前选中（默认：2021 年最高的冰岛） */

var BLUE = '#3E6AE1', INK = '#171A20', LINE = '#EEEEEE', FAINT = '#8E8E8E';
var BAR = '#D6D8DC', BAR_HOVER = '#A9ADB3', CTX = '#D8D9DC', MED = '#8E8E8E';
var FONT = 'Noto Sans SC, Arial, sans-serif';
var MQ_NARROW = window.matchMedia('(max-width:960px)');

/* ==================== 工具 ==================== */
function fmt2(v){ return (v == null || !isFinite(v)) ? '—' : v.toFixed(2); }
function valAt(row, y){
  var i = YEARS.indexOf(y);
  if (i < 0 || row.v[i] == null) return null;
  return row.v[i];
}
function latest(row){
  for (var i = YEARS.length - 1; i >= 0; i--) {
    if (row.v[i] != null) return { y: YEARS[i], v: row.v[i], i: i };
  }
  return null;
}
function median(arr){
  var a = arr.slice().sort(function(x, y){ return x - y; });
  var n = a.length;
  if (!n) return null;
  var m = Math.floor(n / 2);
  return n % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
function yearRows(y){
  return LIST.map(function(r){
    var v = valAt(r, y);
    return v == null ? null : { r: r, v: v };
  }).filter(Boolean);
}
var MEDIANS = YEARS.map(function(y, i){
  var vs = [];
  LIST.forEach(function(r){ if (r.v[i] != null) vs.push(r.v[i]); });
  return vs.length ? median(vs) : null;
});
function selRow(){ return byIso[sel]; }

/* ==================== 排名条形图 ==================== */
var barEl = document.getElementById('sp-barChart');
var bar = echarts.init(barEl, null, { renderer: 'canvas' });

function barOption(){
  /* 升序排列：yAxis category 默认第一项在底部，数值最大者自然显示在顶部 */
  var rows = yearRows(year).sort(function(a, b){ return a.v - b.v; });
  var names = rows.map(function(o){ return o.r.n; });
  var fi = YEARS.indexOf(year);
  var data = rows.map(function(o){
    var isSel = o.r.c === sel;
    return {
      value: o.v,
      itemStyle: { color: isSel ? BLUE : BAR, borderRadius: 2 },
      emphasis: { itemStyle: { color: isSel ? '#2445A8' : BAR_HOVER } },
      label: { color: isSel ? BLUE : FAINT, fontWeight: isSel ? 500 : 400 }
    };
  });
  /* 生育率细条（下轴 0–4）：紧随支出条形下方，同排成对对照 */
  var sub = rows.map(function(o){
    var f = o.r.f[fi];
    return f == null ? null : f;
  });
  return {
    animationDuration: 420,
    /* 窄屏改用 containLabel 自适应贴边：国名刻度贴画布左缘（OECD 国名最长 4 字，
       固定 left:84 在窄画布上留死空白）；top/bottom 相应减小抵消上下轴刻度
       被计入 grid 的高度，右侧仍留足条尾数值标签空间 */
    grid: MQ_NARROW.matches
      ? { left: 2, right: 44, top: 12, bottom: 8, containLabel: true }
      : { left: 84, right: 54, top: 24, bottom: 24 },
    tooltip: {
      trigger: 'item',
      textStyle: { fontSize: 11.5, fontFamily: FONT },
      formatter: function(p){
        var o = rows[p.dataIndex];
        var f = o.r.f[fi];
        return '<b>' + o.r.n + '</b>　' + year + ' 年<br>' +
          '<span style="color:' + BLUE + '">■</span> 补贴支出：' + fmt2(o.v) + '% GDP' +
          '<br><span style="color:' + INK + '">■</span> 生育率：' + (f == null ? '—' : fmt2(f));
      }
    },
    xAxis: [
      {
        type: 'value', splitNumber: 5, position: 'top',
        axisLine: { show: false }, axisTick: { show: false },
        splitLine: { lineStyle: { color: LINE } },
        axisLabel: { fontFamily: FONT, fontSize: 10, color: FAINT, formatter: function(v){ return v + '%'; } }
      },
      {
        type: 'value', min: 0, max: 4, interval: 1,
        axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false },
        axisLabel: { fontFamily: FONT, fontSize: 10, color: FAINT }
      }
    ],
    yAxis: {
      type: 'category', data: names,
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: {
        fontFamily: FONT, fontSize: 11.5, color: '#393C41',
        formatter: function(v){ return v === selRow().n ? '{sel|' + v + '}' : v; },
        rich: { sel: { color: INK, fontWeight: 500 } }
      }
    },
    series: [
      {
        type: 'bar', data: data, barWidth: 10, cursor: 'pointer',
        label: {
          show: true, position: 'right', fontFamily: FONT, fontSize: 10,
          formatter: function(p){ return fmt2(p.value); }
        }
      },
      {
        type: 'bar', xAxisIndex: 1, yAxisIndex: 0, data: sub, barWidth: 3,
        cursor: 'pointer', z: 3,
        itemStyle: { color: INK, borderRadius: 2 }
      }
    ]
  };
}

function renderBar(){
  var n = yearRows(year).length;
  barEl.style.height = Math.max(330, n * 23 + 78) + 'px';
  bar.resize();
  bar.setOption(barOption());
  var med = median(yearRows(year).map(function(o){ return o.v; }));
  document.getElementById('sp-barCap').textContent =
    (n === LIST.length ? '共' + LIST.length + ' 国' : n + ' / ' + LIST.length + ' 国有数据') +
    '，支出中位数 ' + fmt2(med) + '%';
}

bar.on('click', function(p){
  var r = LIST.filter(function(x){ return x.n === p.name; })[0];
  if (r) selectIso(r.c);
});

/* ==================== 趋势图 ==================== */
var trend = echarts.init(document.getElementById('sp-trendChart'), null, { renderer: 'canvas' });

/* 图注左缘与绘图区左缘对齐：桌面端 grid.left=38（与 .t-cap 的 padding-left 同值）；
   窄屏 containLabel 令绘图区左缘随刻度宽度浮动，改由 convertToPixel 实测回填 */
var tCap = document.querySelector('#support .t-cap');
function alignTCap(){
  if (!tCap) return;
  try {
    var x = trend.convertToPixel({ xAxisIndex: 0 }, 0);
    if (x != null && isFinite(x)) tCap.style.paddingLeft = Math.max(0, Math.round(x)) + 'px';
  } catch (e) {}
}

/* 生育率（右轴）刻度：按所选国家数据范围取整洁刻度 */
function fertAxis(vs){
  var lo0 = Math.min.apply(null, vs), hi0 = Math.max.apply(null, vs);
  var pad = (hi0 - lo0) * 0.06 + 0.06;
  var cands = [0.5, 0.2, 0.25, 0.1];
  for (var k = 0; k < cands.length; k++){
    var iv = cands[k];
    var lo = Math.floor((lo0 - pad) / iv) * iv;
    var hi = Math.ceil((hi0 + pad) / iv) * iv;
    var n = Math.round((hi - lo) / iv);
    if (n >= 2 && n <= 5){
      return { min: Math.max(0, +lo.toFixed(2)), max: +hi.toFixed(2), splitNumber: n };
    }
  }
  return { min: Math.max(0, +(lo0 - pad).toFixed(2)), max: +(hi0 + pad).toFixed(2), splitNumber: 4 };
}

function trendOption(){
  var sr = selRow();
  var lines = LIST.map(function(r){
    var isSel = r.c === sel;
    return {
      name: r.n, type: 'line', data: r.v, symbol: 'none', smooth: 0.35,
      silent: !isSel,
      lineStyle: { color: isSel ? BLUE : CTX, width: isSel ? 2.2 : 1, opacity: isSel ? 1 : 0.8 },
      itemStyle: { color: isSel ? BLUE : CTX },
      z: isSel ? 10 : 1
    };
  });
  lines.push({
    name: '中位数', type: 'line', data: MEDIANS.map(function(v){ return v == null ? null : Math.round(v * 100) / 100; }),
    symbol: 'none', smooth: 0.35, silent: true, z: 2,
    lineStyle: { color: MED, width: 1.2, type: 'dashed' }
  });
  /* 所选国家生育率曲线（右轴） */
  lines.push({
    name: '生育率', type: 'line', yAxisIndex: 1, data: sr.f,
    symbol: 'none', smooth: 0.35, silent: true, z: 8,
    lineStyle: { color: INK, width: 1.8 }
  });
  var fa = fertAxis(sr.f.filter(function(v){ return v != null; }));
  return {
    animationDuration: 420,
    /* 窄屏改用 containLabel 自适应贴边（左右两轴刻度都计入外框），
       bottom 相应减小抵消 x 刻度被计入 grid 的高度 */
    grid: MQ_NARROW.matches
      ? { left: 2, right: 12, top: 12, bottom: 8, containLabel: true }
      : { left: 38, right: 32, top: 12, bottom: 22 },
    tooltip: {
      trigger: 'axis',
      textStyle: { fontSize: 11, fontFamily: FONT },
      axisPointer: { lineStyle: { color: '#D0D1D2' } },
      formatter: function(ps){
        var i = ps[0].dataIndex;
        var r = selRow();
        var v = r.v[i], med = MEDIANS[i], f = r.f[i];
        return '<b>' + YEARS[i] + '</b><br>' +
          '<span style="color:' + BLUE + '">■</span> ' + r.n + ' 补贴支出：' + (v == null ? '—' : fmt2(v) + '%') +
          '<br><span style="color:' + INK + '">■</span> ' + r.n + ' 生育率：' + (f == null ? '—' : fmt2(f)) +
          '<br><span style="color:#8E8E8E">' + LIST.length + ' 国支出中位数：' + (med == null ? '—' : fmt2(med) + '%') + '</span>';
      }
    },
    xAxis: {
      type: 'category', data: YEARS, boundaryGap: false,
      axisLine: { lineStyle: { color: LINE } }, axisTick: { show: false },
      axisLabel: { fontFamily: FONT, fontSize: 9.5, color: FAINT, interval: 2 }
    },
    yAxis: [
      {
        type: 'value', min: 0, splitNumber: 4,
        splitLine: { lineStyle: { color: LINE } },
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { fontFamily: FONT, fontSize: 9.5, color: FAINT, formatter: function(v){ return v + '%'; } }
      },
      {
        type: 'value', min: fa.min, max: fa.max, splitNumber: fa.splitNumber,
        splitLine: { show: false }, axisLine: { show: false }, axisTick: { show: false },
        axisLabel: {
          fontFamily: FONT, fontSize: 9, color: '#5C5E62', margin: 5,
          formatter: function(v){ return String(+v.toFixed(2)); }
        }
      }
    ],
    series: lines
  };
}

/* ==================== 交互与同步 ==================== */
var selEl = document.getElementById('sp-countrySelect');

function updateSide(){
  var r = selRow();
  var lt = latest(r);
  var v0 = r.v[0];
  document.getElementById('sp-pName').textContent = r.n;
  document.getElementById('sp-pEn').textContent = r.en;
  document.querySelector('#support .p-big .v').textContent = fmt2(lt.v);
  document.querySelector('#support .p-big small').textContent = '%（' + lt.y + ' 年）';
  var d = (v0 != null && lt.v != null) ? lt.v - v0 : null;
  var minV = null, minY = null;
  r.v.forEach(function(v, i){
    if (v != null && (minV == null || v < minV)) { minV = v; minY = YEARS[i]; }
  });
  document.getElementById('sp-pDelta').innerHTML = d == null ? '' :
    '较 2010 年 <b>' + (d > 0 ? '+' : '') + d.toFixed(2) + '</b> 个百分点' +
    '，期间最低 <b>' + fmt2(minV) + '</b>（' + minY + ' 年）';
  selEl.value = sel;
}

function updateTableSel(){
  var rows = document.querySelectorAll('#sp-tblBody tr');
  Array.prototype.forEach.call(rows, function(tr){
    tr.classList.toggle('cur', tr.getAttribute('data-c') === sel);
  });
}

function selectIso(iso){
  if (!byIso[iso] || iso === sel) return;
  sel = iso;
  updateSide();
  updateTableSel();
  bar.setOption(barOption());
  trend.setOption(trendOption());
  alignTCap();
}

/* 年份切换 */
var tabsEl = document.getElementById('sp-yearTabs');
RANK_YEARS.forEach(function(y){
  var b = document.createElement('button');
  b.type = 'button';
  b.textContent = y;
  if (y === year) b.className = 'on';
  b.addEventListener('click', function(){
    year = y;
    Array.prototype.forEach.call(tabsEl.children, function(x){ x.classList.remove('on'); });
    b.classList.add('on');
    renderBar();
  });
  tabsEl.appendChild(b);
});

/* 下拉选择（按 2021 年数值降序） */
LIST.slice().sort(function(a, b){
  return (valAt(b, 2021) || 0) - (valAt(a, 2021) || 0);
}).forEach(function(r){
  var o = document.createElement('option');
  o.value = r.c;
  o.textContent = r.n + '（' + r.en + '）';
  selEl.appendChild(o);
});
selEl.addEventListener('change', function(){ selectIso(selEl.value); });

/* 完整数据表（按 2021 年数值降序） */
(function buildTable(){
  var head = document.getElementById('sp-tblHead');
  var body = document.getElementById('sp-tblBody');
  var yHead = '<th>国家 / 地区</th>';
  YEARS.forEach(function(y){ yHead += '<th>' + y + '</th>'; });
  head.innerHTML = '<tr>' + yHead + '</tr>';
  LIST.slice().sort(function(a, b){
    return (valAt(b, 2021) || 0) - (valAt(a, 2021) || 0);
  }).forEach(function(r){
    var tds = '<td>' + r.n + '</td>';
    r.v.forEach(function(v){ tds += '<td>' + (v == null ? '—' : fmt2(v)) + '</td>'; });
    var tr = document.createElement('tr');
    tr.setAttribute('data-c', r.c);
    tr.innerHTML = tds;
    tr.addEventListener('click', function(){ selectIso(r.c); });
    body.appendChild(tr);
  });
})();

/* ==================== 启动 ==================== */
renderBar();
trend.setOption(trendOption());
alignTCap();
updateSide();
updateTableSel();

/* 断点翻转时需重设 option（resize 只重算尺寸，不会改 grid 留白） */
var lastNarrow = MQ_NARROW.matches;
window.addEventListener('resize', function(){
  if (MQ_NARROW.matches !== lastNarrow) {
    lastNarrow = MQ_NARROW.matches;
    renderBar();
    trend.setOption(trendOption());
  }
  bar.resize();
  trend.resize();
  alignTCap();
});
})();
