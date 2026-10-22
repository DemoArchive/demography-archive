  /* ============================================================
   人口档案馆 · 全站导航交互（与 nav.css 配套）
   桌面（>1080px）：悬停任一顶栏标题（停留 120ms 悬停意图，掠过不触发），
     展开该栏目专属的「悬停面板」：栏目导语 + 页面招牌可视化缩略图
     （折线图 / 地图 / 博弈树 / 人物头像）+ 子目录链接，排版见 PANELS 数据表。
     面板内容由 JS 按 PANELS 与各栏目原生 .menu 条目懒构建并缓存，
     子目录链接一律克隆自原生 .menu，href 与所在页面保持相对一致。
     所有面板共用一个持久磨砂壳（.tl-shell，直接挂在 body 下——因为带
     backdrop-filter 的元素会成为「背景根」，其子树内的 backdrop-filter
     采样不到页面内容、磨砂会失效；顶栏 .nav 自身就是磨砂的，所以面板
     必须离开它的子树。原生 .menu 原地保留）。栏目间切换时面板不完整
     重新展开：被替换内容在壳内降级为淡出层，新内容错峰淡入，壳体高度
     从当前值过渡到新内容高度（Tesla 官网同款）。
     展开/收起为卷帘式高度揭示（Apple 官网同款）：闭合态 CSS 高度 0，
     展开时把起始高度（0 或收起中的即时高度）与目标高度依次钉成内联值，
     让壳体高度过渡过去，过渡结束清掉内联高度回到 auto；收起反向过渡回 0。
     面板展开时同步在 body 下显示一块 .nav-veil 罩层，将面板之外的
     页面内容模糊+微白化（Apple 官网同款）。
   带 #hash 的进入/跳转一律「直达小节」：顶栏同页点击临时关平滑滚动瞬间到位；
     跨页进入跳过视图过渡（其快照取自目标页顶部，会先闪页顶再落锚点）；
     加载完成后再瞬间校准一次落点并恢复平滑滚动手感。
   窄屏（≤1080px）：汉堡按钮开关导航面板，带子目录的栏目以手风琴
     展开子菜单（用 .nav-drop 内的原生 .menu，与悬停面板无关）。
   ============================================================ */
(function () {
  "use strict";
  var mq = window.matchMedia("(max-width:1080px)");
  var burger = document.querySelector(".nav-burger");
  if (!burger) return;
  var nav = document.querySelector(".nav");
  var brand = document.querySelector(".brand");
  var items = Array.prototype.slice.call(document.querySelectorAll(".nav-links > a, .nav-drop"));
  var CLOSE_DELAY = 160;   // 指针从顶栏移向面板途中不闪断
  var OPEN_DELAY = 120;    // 悬停意图：掠过顶栏（如上滑去操作浏览器）不触发展开，停留片刻才开
  var closeTimer = null;
  var openTimer = null;
  var openPanel = null;
  var openItem = null;
  var veil = null;

  /* 带 #hash 进入页面时，锚点定位应瞬间完成——html 的 scroll-behavior:smooth
     会让浏览器在加载后从页顶一路平滑滑到锚点，看起来像「先到首页再滑向栏目」。
     做法：进来先临时关掉平滑滚动；load 时按锚点瞬间校准一次落点（自定义字体/
     懒加载图会让首次定位漂移），再恢复站内点击的平滑滚动手感。 */
  if (location.hash) {
    var de = document.documentElement;
    de.style.scrollBehavior = "auto";
    var restoreSmooth = function () {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { de.style.scrollBehavior = ""; });
      });
    };
    var reanchor = function () {
      var id = location.hash.slice(1);
      if (id) {
        try { id = decodeURIComponent(id); } catch (e) {}
        var el = document.getElementById(id);
        if (el) {
          de.style.scrollBehavior = "auto";
          el.scrollIntoView();
        }
      }
      restoreSmooth();
    };
    if (document.readyState === "complete") reanchor();
    else window.addEventListener("load", reanchor);
    setTimeout(restoreSmooth, 2500); /* load 迟迟不来时兜底恢复 */
  }

  /* ---------- 「小节直达」两处修正（点击顶栏小节链接不应先见目标页顶部/一路滑动） ---------- */

  /* ① 同页 hash 跳转（如首页顶栏「正在减少的中国」→ index.html#story）：
     点击时同步临时关闭平滑滚动，让浏览器原生锚点跳转瞬间完成——否则会从
     当前位置（常在页顶）一路平滑滑下去，看起来像「先回到首页再滑到小节」。
     不改动站内左栏目录等其他锚点的平滑滚动手感；跨页链接交给目标页逻辑。 */
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 ||
        e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var t = e.target;
    var a = t && t.closest ? t.closest("a[href]") : null;
    if (!a || !a.closest(".nav, .tl-panel")) return; /* 只处理顶栏与悬停面板里的链接 */
    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin || url.pathname !== location.pathname ||
        url.search !== location.search) return; /* 跨页：交给目标页的进入逻辑 */
    if (!url.hash) return;
    var de = document.documentElement;
    de.style.scrollBehavior = "auto";
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { de.style.scrollBehavior = ""; });
    });
  }, true);

  /* ② 带 #hash 的跨页进入（如从子页点「正在减少的中国」→ ../index.html#story）：
     跳过跨文档视图过渡。过渡的「新页面快照」取自首个渲染帧——彼时锚点定位尚未
     发生、快照是目标页顶部，于是先淡入目标页顶部再落到小节锚点，看起来像
     「先跳转到首页，再滑到小节」。带 hash 时要求直达，故整体跳过过渡；
     不带 hash 的普通跨页进入保持原有淡入淡出效果。 */
  window.addEventListener("pageswap", function (e) {
    try {
      var u = e.activation && e.activation.entry && e.activation.entry.url;
      if (u && new URL(u, location.href).hash && e.viewTransition) e.viewTransition.skipTransition();
    } catch (err) {}
  });
  window.addEventListener("pagereveal", function (e) {
    try {
      if (location.hash && e.viewTransition) e.viewTransition.skipTransition();
    } catch (err) {}
  });

  function close() {
    document.body.classList.remove("nav-open");
    burger.setAttribute("aria-expanded", "false");
  }
  /* 窄/桌面以 CSS 实际渲染为准（汉堡按钮 ≤1080px 才显示），
     不直接用 mq.matches——经典滚动条下 JS 视口可能比 CSS 媒体查询窄几像素，
     边界宽度上两者会分歧，跟随 CSS 才不会出现「桌面导航却无悬停面板」。 */
  function isNarrow() {
    return getComputedStyle(burger).display !== "none";
  }
  function collapseAll(except) {
    Array.prototype.forEach.call(
      document.querySelectorAll(".nav-drop.expanded"),
      function (d) { if (d !== except) d.classList.remove("expanded"); }
    );
  }

  burger.addEventListener("click", function () {
    var open = document.body.classList.toggle("nav-open");
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open) collapseAll(null);
  });

  /* ---------- 桌面：每栏目专属悬停面板 + hover 展开 ---------- */

  /* 写入顶栏高度，供面板 fixed 定位贴住其下缘 */
  function syncNavHeight() {
    if (!nav) return;
    document.documentElement.style.setProperty("--nav-h", nav.offsetHeight + "px");
  }

  /* 面板内容左右缘对齐顶栏栏目行：左缘 = 第一个栏目（「正在来临的危险」）文字
     左缘，右缘 = 最后一个栏目文字右缘，写入 --panel-left / --panel-right 供
     .tp-inner 的 margin 使用。坐标取 clientWidth 系（与 fixed 面板、
     getBoundingClientRect 同一参照，不含滚动条），右值存成「距视口右缘的
     距离」，margin-left/right 直接可用。栏目宽度随断点与字体加载变化，
     故展开面板、视口变化、字体就绪时都重新量取。 */
  function syncPanelEdges() {
    if (!items.length || isNarrow()) return;
    var first = items[0], last = items[items.length - 1];
    first = first.tagName === "A" ? first : first.querySelector(":scope > a");
    last = last.tagName === "A" ? last : last.querySelector(":scope > a");
    if (!first || !last) return;
    var fs = getComputedStyle(first), ls = getComputedStyle(last);
    var left = first.getBoundingClientRect().left + (parseFloat(fs.paddingLeft) || 0);
    var rightEdge = last.getBoundingClientRect().right - (parseFloat(ls.paddingRight) || 0);
    var de = document.documentElement;
    de.style.setProperty("--panel-left", left + "px");
    de.style.setProperty("--panel-right", (de.clientWidth - rightEdge) + "px");
  }

  /* 站点根路径：由品牌链接的相对路径推导（首页为 ""，子页为 "../"），
     面板内的缩略图、头像等固定资源一律按根路径引用 */
  var ROOT = (function () {
    var href = brand ? (brand.getAttribute("href") || "index.html") : "index.html";
    return href.replace(/index\.html[\s\S]*$/, "");
  })();

  /* 各栏目悬停面板的内容定义。
     key = 栏目链接路径的最后两段（首页为 "index.html"），与所在页面无关；
     src 一律相对站点根目录；links 相关面板的条目克隆自原生 .menu。 */
  var PANELS = {
    "index.html": {
      mode: "cta",
      sub: "1949~2025，全国历年出生人口（万人）",
      visual: { src: "images/nav/story-births.png", alt: "1949~2025 年中国历年出生人口曲线，1963 年达峰值 2975 万，2025 年降至 792 万" },
      note: "人口是时间的慢变量。七十余年的出生人口曲线，既是历史数据，也是未来底稿。",
      cta: "阅读完整故事"
    },
    "harms/index.html": {
      mode: "numbered", cols: 3, grid3x3: true,
      listTitle: "出生人口减少对不同行业的冲击",
      /* 每个行业的两行式说明（与「永恒的争论」条目同样式）：第二行灰色小字。
         键为原生菜单链接的 #hash；均取自危险页各节 h2 冒号后的半句。 */
      descs: {
        s1: "冲击已经发生，而且还没有触底",
        s2: "山顶就在眼前，山下是一道陡坡",
        s3: "当下的“巨大成就”，未来将毫无意义",
        s4: "随消费者的消失一同消失",
        s5: "服务对象都消失了，岗位存在的意义又在哪里呢",
        s6: "2021年的下跌，只是风暴的预演",
        s7: "流量红利见顶之后，是存量萎缩",
        s8: "可能是例外",
        fin: "行业规模将随出生人口一同收缩"
      }
    },
    "map/index.html": {
      mode: "cards",
      cards: [
        { hash: "#decline", src: "images/nav/map-decline.png", label: "近十年各省出生人口降幅排序", alt: "近十年各省出生人口降幅排序地图" },
        { hash: "#years", src: "images/nav/map-years.png", label: "各省历年生育地图", alt: "各省历年生育地图" }
      ]
    },
    "forecast/index.html": {
      mode: "cards",
      headInline: true,
      lead: "2026~2100 年",
      sub: "高预测、中预测、低预测三种情景",
      /* 四项指标各一张缩略折线图：由 未来人口预测/tools/gen_nav_thumbs.js 从
         forecast/forecast-data.js 提取生成（images/nav/fc-*.svg） */
      cards: [
        { hash: "#pop", src: "images/nav/fc-pop.svg?v=4", label: "总人口预测", alt: "2026~2100 年中国总人口高、中、低三种情景预测折线图" },
        { hash: "#births", src: "images/nav/fc-births.svg?v=4", label: "出生人口预测", alt: "2026~2100 年中国出生人口高、中、低三种情景预测折线图" },
        { hash: "#death", src: "images/nav/fc-death.svg?v=4", label: "死亡人口预测", alt: "2026~2100 年中国死亡人口高、中、低三种情景预测折线图" },
        { hash: "#dec", src: "images/nav/fc-dec.svg?v=4", label: "年减少人数预测", alt: "2026~2100 年中国年减少人数高、中、低三种情景预测折线图" }
      ]
    },
    "world/index.html": {
      mode: "cards",
      cards: [
        { hash: "#tfr", src: "images/home/preview-world-map.webp", label: "各国生育率", alt: "世界各国（总和）生育率地图，2024 年" },
        { hash: "#support", src: "images/home/preview-spending.webp", label: "各国生育补贴支出", alt: "2022 年各国生育补贴支出比较" }
      ]
    },
    "debates/index.html": {
      mode: "quotes",
      listTitle: "围绕低生育率的主要争议",
      quotes: {
        d1: "中国人太多了，几亿人就够了",
        d2: "出生人口减少是好事",
        d3: "未来AI和人形机器人会替代大部分工作",
        d4: "大家少生点，竞争就不卷了",
        d5: "一个顶尖科学家顶一万个普通人",
        d6: "别的国家花了那么多钱也没用"
      }
    },
    "viewpoints/index.html": {
      mode: "people",
      listTitle: "不同人物对低生育率的看法",
      people: [
        { hash: "#p1", name: "普京", country: "俄罗斯", img: "viewpoints/avatars/putin.jpg" },
        { hash: "#p2", name: "李光耀", country: "新加坡", img: "viewpoints/avatars/lee-kuan-yew.jpg" },
        { hash: "#p3", name: "马斯克", country: "美国", img: "viewpoints/avatars/musk.jpg" },
        { hash: "#p4", name: "李显龙", country: "新加坡", img: "viewpoints/avatars/lee-hsien-loong.jpg" },
        { hash: "#p5", name: "梁建章", country: "中国", img: "viewpoints/avatars/liang-jianzhang.jpg" },
        { hash: "#p6", name: "黄文政", country: "中国", img: "viewpoints/avatars/huang-wenzheng.png" }
      ]
    },
    "thought-experiment/index.html": {
      mode: "chart-links",
      listTitle: "三个思想实验",
      visual: { hash: "#exp1", src: "images/prisoners-dilemma.png", label: "《囚徒困境》博弈树", alt: "少子化的囚徒困境博弈树：双方生育是社会最优，个体理性导致都不生育" }
    },
    "datacenter/index.html": {
      mode: "numbered", cols: 2,
      listTitle: "数据查看和下载"
    },
    "other/index.html": {
      mode: "groups"
    }
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  /* 栏目 key：栏目链接路径的最后两段（"harms/index.html"、首页 "index.html"） */
  function keyOf(item) {
    var a = item.tagName === "A" ? item : item.querySelector(":scope > a");
    if (!a) return null;
    var href = (a.getAttribute("href") || "").split("#")[0].split("?")[0];
    var parts = href.split("/").filter(function (s) { return s && s !== "." && s !== ".."; });
    if (!parts.length) return null;
    return parts.slice(-2).join("/");
  }
  function hashOf(a) {
    var href = a.getAttribute("href") || "";
    return href.indexOf("#") >= 0 ? href.slice(href.indexOf("#") + 1) : "";
  }
  /* 面板条目统一走逐条淡入：--i 由 JS 写入 */
  function anim(node, i) {
    node.classList.add("tp-anim");
    node.style.setProperty("--i", i);
    return node;
  }
  function cloneLink(a, i) {
    var c = a.cloneNode(true);
    c.removeAttribute("style");
    return anim(c, i);
  }

  function buildContent(item) {
    var key = keyOf(item);
    var cfg = PANELS[key];
    if (!cfg) return null;
    var a0 = item.tagName === "A" ? item : item.querySelector(":scope > a");
    var menu = item.querySelector ? item.querySelector(".menu") : null;
    var links = menu ? Array.prototype.filter.call(menu.children, function (n) { return n.tagName === "A"; }) : [];
    var base = (a0.getAttribute("href") || "").split("#")[0];
    var i, j, found;

    /* 内容块（.tl-content）挂在持久壳 .tl-shell 内，由 showPanel 控制换入换出 */
    var p = el("div", "tl-content tp-" + cfg.mode);
    var inner = el("div", "tp-inner");

    /* 头部：栏目标签 / 导语 / 副题 */
    if (cfg.kicker || cfg.lead || cfg.sub) {
      var head = el("div", "tp-head" + (cfg.headInline ? " inline" : ""));
      if (cfg.kicker) head.appendChild(anim(el("p", "tp-kicker", cfg.kicker), 0));
      if (cfg.lead) head.appendChild(anim(el("p", "tp-lead", cfg.lead), 0));
      if (cfg.sub) head.appendChild(anim(el("p", "tp-sub", cfg.sub), 0));
      inner.appendChild(head);
    }

    /* 目录小标题（如「出生人口减少对不同行业的冲击」）：置于内容区最上方一行；
       chart-links（思想实验）的标题在右列目录内，另行处理 */
    var animBase = cfg.listTitle && cfg.mode !== "chart-links" ? 1 : 0;
    if (animBase) inner.appendChild(anim(el("p", "tp-group-h", cfg.listTitle), 0));

    var body = el("div", "tp-body");
    var visualCard = function (v, wide) {
      var card = el("a", "tp-card" + (wide ? " wide" : ""));
      card.href = base + (v.hash || "");
      var im = el("span", "im");
      var img = document.createElement("img");
      img.src = ROOT + v.src;
      img.alt = v.alt || v.label || "";
      img.loading = "lazy";
      img.decoding = "async";
      im.appendChild(img);
      card.appendChild(im);
      if (v.label) {
        var cap = el("span", "cap");
        cap.appendChild(el("span", "cap-t", v.label));
        cap.appendChild(el("span", "cap-a", "›"));
        card.appendChild(cap);
      }
      return card;
    };

    if (cfg.mode === "numbered") {
      var grid = el("div", "tp-grid cols" + (cfg.cols || 3) + (cfg.grid3x3 ? " tp-grid-3x3" : ""));
      links.forEach(function (a, k) {
        var row = cloneLink(a, k + animBase);
        row.classList.add("tp-row");
        row.textContent = "";
        row.appendChild(el("span", "t", a.textContent));
        var d = cfg.descs && cfg.descs[hashOf(a)];
        if (d) {
          row.classList.add("tp-q");
          row.appendChild(el("span", "q", "「" + d + "」"));
        }
        grid.appendChild(row);
      });
      body.appendChild(grid);

    } else if (cfg.mode === "cards") {
      var cards = el("div", "tp-cardgrid" + (cfg.cards.length > 2 ? " cards4" : ""));
      i = 0;
      cfg.cards.forEach(function (c) {
        var href = base + (c.hash || "");
        found = null;
        for (j = 0; j < links.length; j++) {
          if (hashOf(links[j]) === (c.hash || "").slice(1)) { found = links[j]; break; }
        }
        var card = visualCard(c);
        card.href = found ? found.getAttribute("href") : href;
        cards.appendChild(anim(card, i++));
      });
      body.appendChild(cards);

    } else if (cfg.mode === "chart-links") {
      var vis = el("div", "tp-visual");
      var vcard = visualCard(cfg.visual);
      found = null;
      for (j = 0; j < links.length; j++) {
        if (hashOf(links[j]) === (cfg.visual.hash || "").slice(1)) { found = links[j]; break; }
      }
      if (found) vcard.href = found.getAttribute("href");
      vis.appendChild(anim(vcard, 0));
      body.appendChild(vis);
      var list = el("div", "tp-list");
      var listBase = cfg.listTitle ? 2 : 1;
      /* 可选小标题（如「三个思想实验」）：复用分组小标题样式，置于目录首行之上 */
      if (cfg.listTitle) list.appendChild(anim(el("p", "tp-group-h", cfg.listTitle), 1));
      links.forEach(function (a, k) {
        var row = cloneLink(a, k + listBase);
        row.classList.add("tp-row");
        list.appendChild(row);
      });
      body.appendChild(list);

    } else if (cfg.mode === "quotes") {
      var qg = el("div", "tp-grid cols2");
      links.forEach(function (a, k) {
        var row = el("a", "tp-row tp-q");
        row.href = a.getAttribute("href");
        row.appendChild(el("span", "t", a.textContent));
        row.appendChild(el("span", "q", "「" + (cfg.quotes[hashOf(a)] || "") + "」"));
        qg.appendChild(anim(row, k + animBase));
      });
      body.appendChild(qg);

    } else if (cfg.mode === "people") {
      var pg = el("div", "tp-grid cols3");
      i = animBase;
      cfg.people.forEach(function (person) {
        var href = base + person.hash;
        found = null;
        for (j = 0; j < links.length; j++) {
          if (hashOf(links[j]) === person.hash.slice(1)) { found = links[j]; break; }
        }
        var row = el("a", "tp-row tp-person");
        row.href = found ? found.getAttribute("href") : href;
        var img = document.createElement("img");
        img.className = "ava";
        img.src = ROOT + person.img;
        img.alt = person.name;
        img.loading = "lazy";
        img.decoding = "async";
        var who = el("span", "who");
        who.appendChild(el("span", "n", person.name));
        who.appendChild(el("span", "c", person.country));
        row.appendChild(img);
        row.appendChild(who);
        pg.appendChild(anim(row, i++));
      });
      body.appendChild(pg);

    } else if (cfg.mode === "groups") {
      var concepts = [], about = [];
      links.forEach(function (a) {
        var h = hashOf(a);
        if (h.indexOf("g-") === 0) concepts.push(a);
        else about.push(a);
      });
      var wrap = el("div", "tp-groupwrap");
      var g1 = el("div", "tp-group grow");
      g1.appendChild(el("p", "tp-group-h", "概念解释"));
      var l1 = el("div", "tp-list cols2");
      if (concepts.length) {
        concepts.forEach(function (a, k) {
          var row = cloneLink(a, k);
          row.classList.add("tp-row");
          l1.appendChild(row);
        });
      } else {
        /* 兜底：菜单未展开时至少给出入口 */
        concepts = links.filter(function (a) { return hashOf(a) === "concept"; });
        concepts.forEach(function (a, k) {
          var row = cloneLink(a, k);
          row.classList.add("tp-row");
          l1.appendChild(row);
        });
      }
      g1.appendChild(l1);
      var g2 = el("div", "tp-group");
      g2.appendChild(el("p", "tp-group-h", "关于本站"));
      var l2 = el("div", "tp-list");
      about.forEach(function (a, k) {
        var row = cloneLink(a, k);
        row.classList.add("tp-row");
        l2.appendChild(row);
      });
      g2.appendChild(l2);
      wrap.appendChild(g1);
      wrap.appendChild(g2);
      body.appendChild(wrap);

    } else if (cfg.mode === "cta") {
      var vis = el("div", "tp-visual");
      vis.appendChild(anim(visualCard(cfg.visual, true), 0));
      body.appendChild(vis);
      var aside = el("div", "tp-aside");
      if (cfg.note) aside.appendChild(anim(el("p", "tp-note", cfg.note), 0));
      var cta = el("a", "tp-btn", cfg.cta || "查看完整内容");
      cta.href = a0.getAttribute("href");
      aside.appendChild(anim(cta, 1));
      body.appendChild(aside);
    }

    inner.appendChild(body);
    p.appendChild(inner);
    return p;
  }

  /* ---------- 持久壳：全部面板共用一个磨砂浮层（Tesla 式切换） ---------- */

  var shell = null;         /* .menu.tl-panel.tl-shell，首次展开时惰性创建 */
  var shownContent = null;  /* 当前占文档流的内容块 */
  var morphTimer = null;    /* 高度过渡结束后清掉内联高度，恢复 auto */
  var shellBorder = 0;      /* 壳的下边框宽度（border-box 计高要加上它） */

  function ensureShell() {
    if (shell) return shell;
    shell = el("div", "menu tl-panel tl-shell");
    /* 指针进入面板取消关闭、离开面板排关闭（原挂在各面板上，现只需挂一次） */
    shell.addEventListener("mouseenter", function () { if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; } });
    shell.addEventListener("mouseleave", scheduleHide);
    document.body.appendChild(shell);
    shellBorder = parseFloat(getComputedStyle(shell).borderBottomWidth) || 0;
    return shell;
  }

  /* 收起：与展开始终同源——壳体高度从当前值过渡回 0，像卷帘自下而上收回，
     内容随壳缘被裁掉（Apple 官网同款）。即时高度必须先钉成内联值：张开态
     高度为 auto，而 auto 不可过渡；随后摘掉 .tl-open 并把内联高度改到 0。 */
  function collapseShell() {
    if (!shell) return;
    if (!shell.classList.contains("tl-open")) { shell.style.height = ""; return; }
    if (morphTimer) { clearTimeout(morphTimer); morphTimer = null; }
    shell.style.height = shell.getBoundingClientRect().height + "px";
    void shell.offsetWidth; /* 冻结当前高度后再改目标值，过渡才会发生 */
    shell.classList.remove("tl-open");
    shell.style.height = "0px";
  }

  function hideMenu() {
    cancelShow();
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    collapseShell();
    openPanel = null;
    openItem = null;
    if (veil) veil.classList.remove("show");
  }
  function scheduleHide() {
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(function () { closeTimer = null; hideMenu(); }, CLOSE_DELAY);
  }
  /* 悬停意图：指针在顶栏标题上停留 OPEN_DELAY 才展开；
     面板已开时在项间移动/从面板回到顶栏立即切换，不再二次等待 */
  function scheduleShow(item) {
    if (isNarrow()) return;
    if (openPanel) { showPanel(item); return; }
    if (openTimer) clearTimeout(openTimer);
    openTimer = setTimeout(function () { openTimer = null; showPanel(item); }, OPEN_DELAY);
  }
  function cancelShow() {
    if (openTimer) { clearTimeout(openTimer); openTimer = null; }
  }
  function showPanel(item) {
    cancelShow();
    if (isNarrow()) return;
    syncPanelEdges(); /* 每次展开重取栏目行左右缘，字体/断点变化不残留旧值 */
    /* 项间切换时上一次 mouseleave 排下的关闭定时器必须撤掉，
       否则面板会在 160ms 后被误关 */
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    if (openPanel && openItem === item) return; /* 已展示该栏目 */
    var sh = ensureShell();
    var content = item._content || (item._content = buildContent(item));
    if (!content) return;
    var opening = !openPanel;
    var old = shownContent;
    /* 形变基准：必须在换内容之前量取（旧内容此时还在文档流里），
       高度过渡中断时取到的是动画中的即时高度，续接才顺滑；
       收起态壳体 CSS 高度即为 0，故关闭中也能量到「卷帘」的即时高度，
       中途再悬停可原地续接展开，不会跳变 */
    var cur = sh.getBoundingClientRect().height;

    content.classList.remove("tl-run", "tl-swap", "tl-out");
    sh.appendChild(content);
    if (old && old !== content) {
      /* 被替换内容降级为绝对定位淡出层（盖不到新内容之上，见 .tl-out），
         淡出完由 nav.js 摘除；若中途被重新唤起会先摘掉 .tl-out，此定时器作废 */
      old.classList.add("tl-out");
      setTimeout(function () {
        if (old.classList.contains("tl-out") && old.parentNode === sh) sh.removeChild(old);
      }, 240);
    }

    if (opening) {
      /* 首次展开：卷帘式高度揭示（Apple 官网同款）——壳体高度从起始值（0，或
         收起动画进行中的即时高度）过渡到内容高度，内容随壳缘自上而下被裁出
         并逐条错峰淡入。起始值必须先钉成内联高度（张开态高度为 auto、auto
         不可过渡），再加 .tl-open、随后改到目标值，过渡才会发生。 */
      var target = content.offsetHeight + shellBorder;
      if (morphTimer) { clearTimeout(morphTimer); morphTimer = null; }
      void sh.offsetWidth; /* 先提交 .tp-anim 初始隐匿态，入场动画才重得起来 */
      sh.style.height = cur + "px";
      void sh.offsetWidth; /* 冻结起始高度后再改目标值，过渡才会发生 */
      sh.classList.add("tl-open");
      sh.style.height = target + "px";
      content.classList.add("tl-run");
      morphTimer = setTimeout(function () { morphTimer = null; sh.style.height = ""; }, 520);
    } else {
      /* 已展开：面板不重新展开，只把壳体高度从当前值过渡到新内容高度 */
      var target = content.offsetHeight + shellBorder;
      if (Math.abs(target - cur) > 1) {
        if (morphTimer) { clearTimeout(morphTimer); morphTimer = null; }
        sh.style.height = cur + "px";
        void sh.offsetWidth; /* 冻结当前高度后再改目标值，过渡才会发生 */
        sh.style.height = target + "px";
        morphTimer = setTimeout(function () { morphTimer = null; sh.style.height = ""; }, 480);
      } else if (morphTimer) {
        clearTimeout(morphTimer); morphTimer = null;
        sh.style.height = "";
      }
      /* 换栏目：整块交叉淡入（Apple 官网同款）——先提交去类后的静止态，
         再加 .tl-swap，动画才重得起来（快速来回切换时同样成立） */
      void content.offsetWidth;
      content.classList.add("tl-swap");
    }
    if (veil) veil.classList.add("show");
    openPanel = sh;
    openItem = item;
    shownContent = content;
  }

  /* 原生 .menu 供窄屏手风琴与面板克隆使用 */
  items.forEach(function (item) {
    if (item.tagName !== "A") {
      var m = item.querySelector(".menu");
      if (m) item._menu = m;
    }
  });

  /* 罩层：面板展开时模糊面板外的页面内容（Apple 官网同款，样式见 nav.css） */
  veil = document.createElement("div");
  veil.className = "nav-veil";
  veil.addEventListener("click", hideMenu);
  document.body.appendChild(veil);
  syncNavHeight();
  syncPanelEdges();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncPanelEdges);

  /* 悬停/聚焦任一顶栏标题展开该栏目的面板：
     mouseenter 只「预约」展开（悬停意图延迟），mouseleave 取消预约并排关闭；
     键盘聚焦仍即时展开。 */
  items.forEach(function (item) {
    item.addEventListener("mouseenter", function () { scheduleShow(item); });
    item.addEventListener("mouseleave", function () { cancelShow(); scheduleHide(); });
    item.addEventListener("focusin", function () { showPanel(item); });
  });

  /* 点击面板外收起 */
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!isNarrow()) {
      /* 桌面：点掉面板/顶栏外即收起；点面板内的链接（含同页锚点）跳转后也收起 */
      if (t.closest && t.closest(".nav")) {
        /* 顶栏里的同页锚点（如首页顶栏「正在减少的中国」）只做页内滚动、
           不发生页面卸载，面板不会随之消失，必须在这里主动收起 */
        var na = t.closest("a[href]");
        if (na) {
          try {
            var nu = new URL(na.href);
            if (nu.origin === location.origin && nu.pathname === location.pathname &&
                nu.search === location.search) hideMenu();
          } catch (err) {}
        }
        return;
      }
      if (t.closest && t.closest(".tl-panel")) {
        if (t.closest("a[href]")) hideMenu();
        return;
      }
      hideMenu();
      return;
    }
    if (!document.body.classList.contains("nav-open")) return;
    if (t.closest && t.closest(".nav-burger")) return;
    if (t.closest && t.closest(".nav-links")) {
      /* 面板内：栏目名（首次点击用于展开）保持打开，其余链接点击后收起 */
      if (!t.closest(".nav-drop > a") && t.closest("a")) close();
      return;
    }
    close();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!isNarrow()) { hideMenu(); return; }
    if (document.body.classList.contains("nav-open")) close();
  });

  /* 窄屏：带子目录的栏目，首次点击展开而不是跳转 */
  Array.prototype.forEach.call(document.querySelectorAll(".nav-drop > a"), function (a) {
    a.addEventListener("click", function (e) {
      if (!isNarrow()) return;
      var drop = a.parentElement;
      if (!drop.classList.contains("expanded")) {
        e.preventDefault();
        collapseAll(drop);
        drop.classList.add("expanded");
      }
    });
  });

  /* 视口宽度切换：复位展开状态（悬停面板按需惰性重建，原生 .menu 始终在原位） */
  var applied = null;
  function applyMode() {
    collapseAll(null);
    hideMenu();
    close();
    applied = mq.matches;
  }
  applyMode();

  if (mq.addEventListener) {
    mq.addEventListener("change", applyMode);
  } else {
    window.addEventListener("resize", function () { if (mq.matches !== applied) applyMode(); });
  }

  window.addEventListener("resize", function () {
    syncNavHeight();
    syncPanelEdges();
    /* 视口宽度变化会改变内容排版高度，进行中的高度过渡直接落定到新的自然高度 */
    if (morphTimer) { clearTimeout(morphTimer); morphTimer = null; }
    if (shell) shell.style.height = "";
  });
})();
