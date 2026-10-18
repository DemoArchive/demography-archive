/* 地图滚轮缩放：只有光标落在地图图形上时才缩放地图；
   光标位于地图容器内的留白（或页面任意其它位置）时，滚轮照常滚动页面。
   ECharts 的 roam 会截获整个 geo 视口矩形内的滚轮并阻止页面滚动，
   故在 window 捕获阶段先行判断：不在地图上就把事件拦在 ECharts 之前。 */
(function () {
  "use strict";
  var maps = [];

  /* 光标是否落在地图上：用 zrender 的命中检测（与地图悬停判定同源），
     自动跟随当前缩放/平移结果，无需另行换算坐标 */
  function onMap(chart, x, y) {
    var zr = chart && chart.getZr && chart.getZr();
    if (!zr || !zr.handler || !zr.handler.findHover) return true;   /* 取不到时沿用原行为 */
    var hit = zr.handler.findHover(x, y);
    return !!(hit && hit.target);
  }

  window.addEventListener("wheel", function (e) {
    if (e.ctrlKey) return;                        /* Ctrl + 滚轮 = 浏览器自身缩放 */
    for (var i = 0; i < maps.length; i++) {
      if (!maps[i].el.contains(e.target)) continue;
      var r = maps[i].el.getBoundingClientRect();
      if (onMap(maps[i].chart, e.clientX - r.left, e.clientY - r.top)) return;
      e.stopPropagation();                        /* 拦在 ECharts 之前，页面照常滚动 */
      return;
    }
  }, { capture: true, passive: true });

  window.bindMapWheelZoom = function (el, chart) {
    if (el && chart) maps.push({ el: el, chart: chart });
  };
})();
