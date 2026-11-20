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
  /* iOS Safari 只在页面存在 touchstart 监听时才应用 :active。加一个空监听，
     让移动端菜单/顶栏的按压反馈（浅灰底色）在 iPhone 上也能出现。 */
  document.addEventListener("touchstart", function () {}, { passive: true });
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

  /* 站点根路径：由品牌链接的相对路径推导（根页面 "./" 或 ""，子目录页面 "../"），
     面板内的缩略图、头像等固定资源一律按根路径引用 */
  var ROOT = (function () {
    var href = brand ? (brand.getAttribute("href") || "./") : "./";
    return href.split("#")[0].split("?")[0].replace(/index\.html$/, "");
  })();

  /* 各栏目悬停面板的内容定义。
     key = 栏目名（如 "harms.html"、首页 "index.html"），与所在页面无关；
     src 一律相对站点根目录；links 相关面板的条目克隆自原生 .menu。 */
  var PANELS = {
    "index.html": {
      mode: "cta",
      sub: "1949~2025，全国历年出生人口（万人）",
      visual: { src: "images/nav/story-births.png", alt: "1949~2025 年中国历年出生人口曲线，1963 年达峰值 2975 万，2025 年降至 792 万" },
      note: "人口是时间的慢变量。七十余年的出生人口曲线，既是历史数据，也是未来底稿。",
      cta: "阅读完整故事"
    },
    "harms.html": {
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
    "map.html": {
      mode: "cards",
      cards: [
        { hash: "#decline", src: "images/nav/map-decline.png", label: "近十年各省出生人口降幅排序", alt: "近十年各省出生人口降幅排序地图" },
        { hash: "#years", src: "images/nav/map-years.png", label: "各省历年生育地图", alt: "各省历年生育地图" }
      ]
    },
    "forecast.html": {
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
    "world.html": {
      mode: "cards",
      cards: [
        { hash: "#tfr", src: "images/home/preview-world-map.webp", label: "各国生育率", alt: "世界各国（总和）生育率地图，2024 年" },
        { hash: "#support", src: "images/home/preview-spending.webp", label: "各国生育补贴支出", alt: "2022 年各国生育补贴支出比较" }
      ]
    },
    "debates.html": {
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
    "viewpoints.html": {
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
    "thought-experiment.html": {
      mode: "cards",
      cardFlat: true,
      listTitle: "三个思想实验",
      /* 三张作品卡：统一采用白底三角结构图谱 */
      cards: [
        { hash: "#exp3", src: "images/condom-paradox.png", label: "核武器、毒品与避孕套", alt: "《核武器、毒品与避孕套》比较图：核武器因恐惧克制，毒品被集体禁绝，避孕套温和不可阻挡" },
        { hash: "#exp1", src: "images/prisoners-dilemma.png", label: "少子化的囚徒困境", alt: "少子化的囚徒困境博弈树：双方生育是社会最优，个体理性导致都不生育" },
        { hash: "#exp2", src: "images/phd-and-mother.png", label: "博士与母亲", alt: "《博士与母亲》关系图：博士 A 与母亲 B 在当下与三十年后的评价逆转与跨期结算" }
      ]
    },
    "datacenter.html": {
      mode: "numbered", cols: 2,
      listTitle: "数据查看和下载"
    },
    "other.html": {
      mode: "groups"
    }
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  /* 栏目 key：支持 "harms.html" 与兼容路径 "harms/index.html"，首页归一为 "index.html" */
  function keyOf(item) {
    var a = item.tagName === "A" ? item : item.querySelector(":scope > a");
    if (!a) return null;
    var href = (a.getAttribute("href") || "").split("#")[0].split("?")[0];
    var parts = href.split("/").filter(function (s) { return s && s !== "." && s !== ".."; });
    if (!parts.length) return "index.html";
    var last = parts[parts.length - 1];
    if (last === "index.html" && parts.length >= 2) return parts[parts.length - 2] + ".html";
    return last;
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
    if (cfg.cardFlat) p.classList.add("tp-flat");
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
      var cards = el("div", "tp-cardgrid" + (cfg.cards.length === 3 ? " cards3" : cfg.cards.length > 2 ? " cards4" : ""));
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
      /* 可选小标题（如「两个思想实验」）：复用分组小标题样式，置于目录首行之上 */
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

/* ============================================================
   Apple /mac/ 风格统一整块内容加载动效
   页面载入与滚动均采用「整块由下至上、同排从左向右」依次显现，每次刷新均触发
   ============================================================ */
(function () {
  "use strict";
  var prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealFlushFn = function () {};

  function groupAndOrderRows(records) {
    if (!records || !records.length) return [];
    records.sort(function (a, b) {
      return a.top !== b.top ? (a.top - b.top) : (a.left - b.left);
    });
    var rows = [];
    var curRow = [];
    var anchorTop = null;
    for (var i = 0; i < records.length; i++) {
      var rec = records[i];
      if (anchorTop === null || Math.abs(rec.top - anchorTop) <= 44) {
        curRow.push(rec);
        if (anchorTop === null) anchorTop = rec.top;
      } else {
        curRow.sort(function (a, b) { return a.left - b.left; });
        rows.push(curRow);
        curRow = [rec];
        anchorTop = rec.top;
      }
    }
    if (curRow.length) {
      curRow.sort(function (a, b) { return a.left - b.left; });
      rows.push(curRow);
    }
    return rows;
  }

  function staggerReenter(nodes) {
    if (prefersReduced || !nodes || !nodes.length) return;
    var curH = window.innerHeight || 900;
    var records = [];
    Array.prototype.forEach.call(nodes, function (el) {
      if (!el || el.hidden || el.style.display === "none") return;
      el.classList.remove("ap-anim-wait", "ap-anim-in", "ap-anim-fade", "ap-rise-in");
      el.classList.add("ap-anim-done");
      var r = el.getBoundingClientRect();
      if (r.height > 0 && r.bottom > 0 && r.top < curH * 1.15) {
        records.push({ el: el, top: r.top, left: r.left });
      }
    });
    var rows = groupAndOrderRows(records);
    var rowStart = 0;
    rows.forEach(function (row) {
      row.forEach(function (rec, colIdx) {
        var delayMs = Math.min(rowStart + colIdx * 75, 480);
        var el = rec.el;
        el.style.setProperty("--ap-delay", delayMs + "ms");
        void el.offsetWidth;
        el.classList.add("ap-rise-in");
        setTimeout(function () {
          el.classList.remove("ap-rise-in");
          el.style.removeProperty("--ap-delay");
        }, delayMs + 860);
      });
      rowStart += row.length === 1 ? 60 : Math.min(row.length * 50, 165);
    });
  }
  window.__apStaggerReenter = staggerReenter;
  window.__apFlushReveals = function () { revealFlushFn(); };

  function initAppleContentMotion() {
    if (prefersReduced) {
      document.documentElement.classList.remove("ap-preload");
      return;
    }
    var vh = window.innerHeight || 900;
    var initSy = window.scrollY || window.pageYOffset || 0;
    var initDocH = document.documentElement ? document.documentElement.scrollHeight : 0;
    var atBottomInitial = initDocH > 0 && (initSy + vh >= initDocH - 48);

    function cleanupWait(el, delayMs) {
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        el.classList.remove("ap-anim-wait", "ap-anim-in", "ap-anim-fade");
        el.classList.add("ap-anim-done");
        el.style.removeProperty("--ap-delay");
      }
      el.addEventListener("transitionend", function onEnd(e) {
        if (e.target !== el || (e.propertyName !== "transform" && e.propertyName !== "opacity")) return;
        el.removeEventListener("transitionend", onEnd);
        finish();
      });
      setTimeout(finish, (delayMs || 0) + 650);
    }

    var fadeOnlySelector = ".article h2[id], .article p.finale, .article .exp-head, .article .sec-t";

    /* 整块级联目标清单：矩形卡片/图文块整体作为一个单元显现，不拆分内部结构 */
    var blockSelectors = [
      ".hero > h1", ".hero > .statement-inline", ".hero > .lede", ".hero > .sub",
      ".head > h1", ".head > .head-row", ".head > .sub",
      ".sec-head", ".sec > .lead", ".story-sec .story-head",
      ".page-grid > .toc",
      ".clocks .clock-card", ".clocks .c-note",
      ".story .chart-wrap",
      ".tiles .tile-wide", ".tiles .tile-grid .tile",
      ".content .article > p:not(.finale)", ".content .article > h2[id]", ".content .article > p.finale",
      ".content .divider",
      ".debate > .d-head", ".debate > .tag", ".debate > .claim", ".debate > .reply-p", ".debate > .reply-list", ".debate > .args > .arg",
      ".voice > .v-head",
      ".voice > .q > .q-date", ".voice > .q > .lbl-say", ".voice > .q > .say", ".voice > .q > .lbl", ".voice > .q > .orig", ".voice > .q > p",
      ".article > .exp-head", ".article > .sec-t", ".article > figure.figure", ".article > ul.mk", ".article > ol.npts > li", ".article > .verdict",
      ".content .smallnote",
      ".controls",
      ".board > .map-area", ".board > .bar-area", ".board > .chart-box", ".board > .side",
      ".board > .stat-col > .stat",
      ".sec > .map-note", ".notes > .note-card", ".page-note",
      ".block > .b-head", ".block > .chart-box", ".block > .src-note", ".block > .sec-note",
      ".block > .mini-grid > .mini", ".block > .prov-grid > a",
      ".block > .dc-cap", ".block > .decline-grid", ".block > .tbl-scroll",
      ".part > .part-head", ".part .list > .item", ".part > .stance", ".part > .ack", ".part > .contact",
      "footer .foot-inner"
    ];

    var allWaiting = [];
    var initialVisible = [];
    var belowFold = [];
    var registered = typeof WeakSet === "function" ? new WeakSet() : null;

    function markSeen(el) {
      if (registered) {
        if (registered.has(el)) return false;
        registered.add(el);
        return true;
      }
      if (el.dataset && el.dataset.apBlockWait) return false;
      if (el.dataset) el.dataset.apBlockWait = "1";
      return true;
    }

    function isHiddenOrNested(el) {
      if (el.closest(".nav, .tl-panel, .nav-veil, .da-loader")) return true;
      if (el.hidden || el.style.display === "none") return true;
      if (el.parentElement && el.parentElement.closest(".ap-anim-wait")) return true;
      return false;
    }

    blockSelectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        if (isHiddenOrNested(el)) return;
        var r = el.getBoundingClientRect();
        /* 已向上滚出视口的旧内容保持可见，不重放以免回滚闪屏 */
        if (r.bottom <= 4) return;
        var isFirstHero = el.matches(".hero > h1, .head > h1, .head > .head-row, .sec-head");
        if (r.height <= 0 && !isFirstHero) return;
        if (!markSeen(el)) return;

        el.classList.add("ap-anim-wait");
        if (el.matches(fadeOnlySelector)) el.classList.add("ap-anim-fade");
        var item = { el: el, revealed: false };
        allWaiting.push(item);

        if (r.top < vh * 0.96 || (atBottomInitial && r.top < vh)) {
          initialVisible.push({ item: item, top: r.top, left: r.left });
        } else {
          belowFold.push(item);
        }
      });
    });

    function revealBatch(records) {
      if (!records || !records.length) return;
      var pending = records.filter(function (rec) {
        if (!rec.item || rec.item.revealed) return false;
        rec.item.revealed = true;
        return true;
      });
      if (!pending.length) return;
      var rows = groupAndOrderRows(pending);
      var rowStart = 0;
      rows.forEach(function (row) {
        var isDenseGrid = row.length >= 3 && row[0].item.el.closest(".prov-grid");
        var colStep = isDenseGrid ? 50 : 75;
        var maxCap = isDenseGrid ? 520 : 540;
        row.forEach(function (rec, colIdx) {
          var el = rec.item.el;
          var delayMs = Math.min(rowStart + colIdx * colStep, maxCap);
          el.style.setProperty("--ap-delay", delayMs + "ms");
          el.classList.add("ap-anim-in");
          cleanupWait(el, delayMs);
        });
        rowStart += isDenseGrid ? 75 : (row.length === 1 ? 65 : Math.min(row.length * 52, 175));
      });
    }

    function triggerInitial() {
      if (!initialVisible.length) return;
      void (document.body && document.body.offsetHeight);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          revealBatch(initialVisible);
        });
      });
    }

    /* 首屏元素触发：若存在首次进入全屏加载指示器，待其开始淡出后再依次显现首屏内容 */
    var activeLoader = document.querySelector(".da-loader:not(.is-done)");
    if (activeLoader && initialVisible.length) {
      var initialFired = false;
      var fireOnce = function () {
        if (initialFired) return;
        initialFired = true;
        triggerInitial();
      };
      if (window.MutationObserver) {
        var lmo = new MutationObserver(function () {
          if (!document.body.contains(activeLoader) || activeLoader.classList.contains("is-done")) {
            lmo.disconnect();
            fireOnce();
          }
        });
        lmo.observe(activeLoader, { attributes: true, attributeFilter: ["class"] });
      }
      setTimeout(fireOnce, 1800);
    } else {
      triggerInitial();
    }

    var ioReveal = null;
    if ("IntersectionObserver" in window && belowFold.length) {
      ioReveal = new IntersectionObserver(function (entries) {
        var batch = [];
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          for (var i = 0; i < belowFold.length; i++) {
            var item = belowFold[i];
            if (!item.revealed && item.el === entry.target) {
              batch.push({ item: item, top: entry.boundingClientRect.top, left: entry.boundingClientRect.left });
              ioReveal.unobserve(entry.target);
              break;
            }
          }
        });
        if (batch.length) {
          requestAnimationFrame(function () { revealBatch(batch); });
        }
      }, { threshold: 0.01, rootMargin: "0px 0px -48px 0px" });

      belowFold.forEach(function (item) { ioReveal.observe(item.el); });
    } else {
      belowFold.forEach(function (item) {
        item.el.classList.remove("ap-anim-wait", "ap-anim-fade");
        item.el.classList.add("ap-anim-done");
        item.revealed = true;
      });
    }

    revealFlushFn = function () {
      var curH = window.innerHeight || vh;
      var sy = window.scrollY || window.pageYOffset || 0;
      var docH = document.documentElement ? document.documentElement.scrollHeight : 0;
      var atBottom = docH > 0 && (sy + curH >= docH - 48);
      var batch = [];
      allWaiting.forEach(function (item) {
        if (item.revealed) return;
        if (item.el.hidden || item.el.style.display === "none") return;
        var r = item.el.getBoundingClientRect();
        if (atBottom || (r.height > 0 && r.top <= curH - 36)) {
          batch.push({ item: item, top: r.top, left: r.left });
          if (ioReveal) ioReveal.unobserve(item.el);
        }
      });
      if (batch.length) {
        requestAnimationFrame(function () { revealBatch(batch); });
      }
    };

    var scrollRaf = 0;
    function onScrollFrame() {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(function () {
        scrollRaf = 0;
        revealFlushFn();
      });
    }
    window.addEventListener("scroll", onScrollFrame, { passive: true });
    window.addEventListener("resize", function () {
      vh = window.innerHeight || vh;
      onScrollFrame();
    }, { passive: true });
    window.addEventListener("load", revealFlushFn);
    window.addEventListener("hashchange", function () {
      setTimeout(revealFlushFn, 60);
    });
    document.documentElement.classList.remove("ap-preload");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAppleContentMotion, { once: true });
  } else {
    initAppleContentMotion();
  }
  window.addEventListener("pageshow", function () {
    revealFlushFn();
    document.documentElement.classList.remove("ap-preload");
  });
})();

/* ============================================================
   统一角标点击浮层（点击 [1]/[2]/[3] 就地显示注释，不再跳转到页底）
   ============================================================ */
(function () {
  "use strict";
  var pop = null;
  var badgeEl = null;
  var bodyEl = null;
  var arrowEl = null;
  var activeTrigger = null;

  function ensurePopover() {
    if (pop) return pop;
    pop = document.createElement("div");
    pop.className = "fn-popover";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-modal", "false");
    pop.setAttribute("aria-label", "注释内容");
    pop.innerHTML =
      '<div class="fn-pop-arrow" aria-hidden="true"></div>' +
      '<div class="fn-pop-head">' +
        '<span class="fn-pop-badge"></span>' +
        '<button type="button" class="fn-pop-close" aria-label="关闭注释">&times;</button>' +
      '</div>' +
      '<div class="fn-pop-body"></div>';
    document.body.appendChild(pop);
    badgeEl = pop.querySelector(".fn-pop-badge");
    bodyEl = pop.querySelector(".fn-pop-body");
    arrowEl = pop.querySelector(".fn-pop-arrow");
    pop.querySelector(".fn-pop-close").addEventListener("click", function () {
      var prev = activeTrigger;
      closePopover();
      if (prev && typeof prev.focus === "function") prev.focus();
    });
    return pop;
  }

  function closePopover() {
    if (!pop) return;
    pop.classList.remove("is-open");
    if (activeTrigger) {
      activeTrigger.classList.remove("is-open");
      activeTrigger.setAttribute("aria-expanded", "false");
      activeTrigger = null;
    }
  }

  function positionPopover() {
    if (!pop || !activeTrigger) return;
    var rect = activeTrigger.getBoundingClientRect();
    var vw = window.innerWidth || document.documentElement.clientWidth;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var nav = document.querySelector(".nav");
    var navBottom = nav ? nav.getBoundingClientRect().bottom : 60;

    if (rect.bottom < Math.max(navBottom, 0) || rect.top > vh) {
      closePopover();
      return;
    }

    var popW = pop.offsetWidth;
    var popH = pop.offsetHeight;
    var margin = 12;
    var gap = 10;
    var centerX = rect.left + rect.width / 2;
    var left = Math.max(margin, Math.min(centerX - popW / 2, vw - popW - margin));

    var minTop = Math.max(navBottom, 0) + 8;
    var spaceAbove = rect.top - gap - minTop;
    var spaceBelow = vh - rect.bottom - gap - 8;

    var pos = "top";
    var top = rect.top - popH - gap;
    if (spaceAbove < popH && spaceBelow >= spaceAbove) {
      pos = "bottom";
      top = rect.bottom + gap;
    }
    top = Math.max(8, Math.min(top, vh - popH - 8));

    pop.setAttribute("data-pos", pos);
    pop.style.left = Math.round(left) + "px";
    pop.style.top = Math.round(top) + "px";

    var arrowLeft = Math.max(14, Math.min(centerX - left - 5, popW - 24));
    arrowEl.style.left = Math.round(arrowLeft) + "px";
  }

  function resolveNote(trigger) {
    var fnId = trigger.getAttribute("data-fn") || "";
    if (!fnId) {
      var href = trigger.getAttribute("href") || "";
      if (href.charAt(0) === "#") fnId = href.slice(1);
    }
    var label = trigger.textContent.trim();
    var html = "";
    var noteEl = fnId ? document.getElementById(fnId) : null;
    if (noteEl) {
      var kids = noteEl.children;
      if (kids && kids.length >= 2) {
        label = kids[0].textContent.trim() || label;
        html = kids[1].innerHTML;
      } else {
        html = noteEl.innerHTML;
      }
    } else if (trigger.getAttribute("data-note")) {
      html = trigger.getAttribute("data-note");
    }
    return { label: label, html: html };
  }

  function openPopover(trigger) {
    var note = resolveNote(trigger);
    if (!note.html) return;
    ensurePopover();
    if (activeTrigger && activeTrigger !== trigger) {
      activeTrigger.classList.remove("is-open");
      activeTrigger.setAttribute("aria-expanded", "false");
    }
    activeTrigger = trigger;
    trigger.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    badgeEl.textContent = "注释 " + note.label;
    bodyEl.innerHTML = note.html;
    pop.classList.remove("is-open");
    positionPopover();
    requestAnimationFrame(function () {
      if (activeTrigger === trigger) {
        positionPopover();
        pop.classList.add("is-open");
      }
    });
  }

  document.addEventListener("click", function (e) {
    var trigger = e.target && e.target.closest ? e.target.closest(".fn-ref") : null;
    if (trigger) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      e.stopPropagation();
      if (activeTrigger === trigger && pop && pop.classList.contains("is-open")) {
        closePopover();
      } else {
        openPopover(trigger);
      }
      return;
    }
    if (pop && pop.classList.contains("is-open")) {
      if (!e.target.closest || !e.target.closest(".fn-popover")) {
        closePopover();
      }
    }
  });

  document.addEventListener("keydown", function (e) {
    var trigger = e.target && e.target.closest ? e.target.closest(".fn-ref") : null;
    if (trigger && e.key === " ") {
      e.preventDefault();
      trigger.click();
      return;
    }
    if (e.key === "Escape" && pop && pop.classList.contains("is-open")) {
      var prev = activeTrigger;
      closePopover();
      if (prev && typeof prev.focus === "function") prev.focus();
    }
  });

  var posRaf = 0;
  function scheduleReposition() {
    if (!pop || !pop.classList.contains("is-open") || !activeTrigger) return;
    if (posRaf) return;
    posRaf = requestAnimationFrame(function () {
      posRaf = 0;
      positionPopover();
    });
  }
  window.addEventListener("scroll", scheduleReposition, { passive: true });
  window.addEventListener("resize", scheduleReposition, { passive: true });
})();

/* ============================================================
   全站分享按钮与国内社交分享浮层（微信扫码 / 复制链接 / 微博 / QQ）
   ============================================================ */
(function () {
  "use strict";
  var navInner = document.querySelector(".nav-inner");
  if (!navInner) return;

  /* ---------- 本地 ISO 18004 二维码生成（Byte 模式 · V1~V10 · ECC-M） ---------- */
  var GF_EXP = new Uint8Array(512);
  var GF_LOG = new Uint8Array(256);
  for (var gx = 1, gi = 0; gi < 255; gi++) {
    GF_EXP[gi] = gx;
    GF_LOG[gx] = gi;
    gx <<= 1;
    if (gx & 256) gx ^= 0x11d;
  }
  for (var gi2 = 255; gi2 < 512; gi2++) GF_EXP[gi2] = GF_EXP[gi2 - 255];

  function gfMul(a, b) {
    return (a === 0 || b === 0) ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  function rsEncode(data, ecLen) {
    var g = [1];
    for (var i = 0; i < ecLen; i++) {
      var ng = new Array(g.length + 1);
      for (var k = 0; k < ng.length; k++) ng[k] = 0;
      var root = GF_EXP[i];
      for (var j = 0; j < g.length; j++) {
        ng[j] ^= g[j];
        ng[j + 1] ^= gfMul(g[j], root);
      }
      g = ng;
    }
    var res = new Uint8Array(data.length + ecLen);
    res.set(data);
    for (var d = 0; d < data.length; d++) {
      var coef = res[d];
      if (coef !== 0) {
        for (var m = 0; m < g.length; m++) res[d + m] ^= gfMul(g[m], coef);
      }
    }
    return res.slice(data.length);
  }

  var VER_M = [
    null,
    [16, 10, [1, 16]],
    [28, 16, [1, 28]],
    [44, 26, [1, 44]],
    [64, 18, [2, 32]],
    [86, 24, [2, 43]],
    [108, 16, [4, 27]],
    [124, 18, [4, 31]],
    [154, 22, [2, 38], [2, 39]],
    [182, 22, [3, 36], [2, 37]],
    [216, 26, [4, 43], [1, 44]]
  ];
  var ALIGN = [[], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

  function encodeUtf8(str) {
    if (typeof TextEncoder === "function") return new TextEncoder().encode(str);
    var utf8 = unescape(encodeURIComponent(str));
    var out = new Uint8Array(utf8.length);
    for (var i = 0; i < utf8.length; i++) out[i] = utf8.charCodeAt(i);
    return out;
  }

  function makeQrSvg(text) {
    var bytes = encodeUtf8(text);
    var ver = 1;
    while (ver <= 10) {
      if (4 + (ver <= 9 ? 8 : 16) + bytes.length * 8 <= VER_M[ver][0] * 8) break;
      ver++;
    }
    if (ver > 10) return "";
    var spec = VER_M[ver], totalData = spec[0], ecLen = spec[1], bits = [];
    function pushBits(val, n) {
      for (var i = n - 1; i >= 0; i--) bits.push((val >> i) & 1);
    }
    pushBits(4, 4);
    pushBits(bytes.length, ver <= 9 ? 8 : 16);
    for (var bi = 0; bi < bytes.length; bi++) pushBits(bytes[bi], 8);
    var maxBits = totalData * 8;
    for (var ti = 0; ti < 4 && bits.length < maxBits; ti++) bits.push(0);
    while (bits.length & 7) bits.push(0);
    for (var pi = 0; bits.length < maxBits; pi++) pushBits((pi & 1) ? 0x11 : 0xec, 8);

    var dataBytes = new Uint8Array(totalData);
    for (var di = 0; di < totalData; di++) {
      var v = 0;
      for (var dj = 0; dj < 8; dj++) v = (v << 1) | bits[di * 8 + dj];
      dataBytes[di] = v;
    }

    var blocks = [], ecs = [], off = 0;
    for (var gi = 2; gi < spec.length; gi++) {
      var cnt = spec[gi][0], dlen = spec[gi][1];
      for (var b = 0; b < cnt; b++) {
        var blk = dataBytes.slice(off, off + dlen);
        off += dlen;
        blocks.push(blk);
        ecs.push(rsEncode(blk, ecLen));
      }
    }

    var cw = [], maxD = 0;
    for (var k = 0; k < blocks.length; k++) if (blocks[k].length > maxD) maxD = blocks[k].length;
    for (var i2 = 0; i2 < maxD; i2++) {
      for (var k2 = 0; k2 < blocks.length; k2++) if (i2 < blocks[k2].length) cw.push(blocks[k2][i2]);
    }
    for (var i3 = 0; i3 < ecLen; i3++) {
      for (var k3 = 0; k3 < ecs.length; k3++) cw.push(ecs[k3][i3]);
    }

    var size = ver * 4 + 17;
    var mod = [], isFunc = [];
    for (var r0 = 0; r0 < size; r0++) {
      var mRow = [], fRow = [];
      for (var c0 = 0; c0 < size; c0++) { mRow.push(0); fRow.push(0); }
      mod.push(mRow);
      isFunc.push(fRow);
    }
    function setF(r, c, dark) { mod[r][c] = dark ? 2 : 1; isFunc[r][c] = 1; }
    function drawFinder(fr, fc) {
      for (var dr = -1; dr <= 7; dr++) {
        for (var dc = -1; dc <= 7; dc++) {
          var r = fr + dr, c = fc + dc;
          if (r < 0 || r >= size || c < 0 || c >= size) continue;
          var in7 = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
          setF(r, c, in7 && (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4)));
        }
      }
    }
    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    var ap = ALIGN[ver];
    for (var ar = 0; ar < ap.length; ar++) {
      for (var ac = 0; ac < ap.length; ac++) {
        if (isFunc[ap[ar]][ap[ac]]) continue;
        for (var dr2 = -2; dr2 <= 2; dr2++) {
          for (var dc2 = -2; dc2 <= 2; dc2++) {
            setF(ap[ar] + dr2, ap[ac] + dc2, Math.max(Math.abs(dr2), Math.abs(dc2)) !== 1);
          }
        }
      }
    }
    for (var ti2 = 8; ti2 < size - 8; ti2++) {
      if (!isFunc[6][ti2]) setF(6, ti2, ti2 % 2 === 0);
      if (!isFunc[ti2][6]) setF(ti2, 6, ti2 % 2 === 0);
    }
    setF(size - 8, 8, true);
    for (var fi = 0; fi < 9; fi++) {
      if (!isFunc[8][fi]) setF(8, fi, false);
      if (!isFunc[fi][8]) setF(fi, 8, false);
    }
    for (var fi2 = 0; fi2 < 8; fi2++) {
      if (!isFunc[8][size - 1 - fi2]) setF(8, size - 1 - fi2, false);
      if (fi2 < 7 && !isFunc[size - 1 - fi2][8]) setF(size - 1 - fi2, 8, false);
    }
    if (ver >= 7) {
      var vrem = ver;
      for (var vi = 0; vi < 12; vi++) vrem = (vrem << 1) ^ ((vrem >> 11) * 0x1f25);
      var vb = (ver << 12) | vrem;
      for (var vi2 = 0; vi2 < 18; vi2++) {
        var vd = ((vb >> vi2) & 1) === 1;
        setF(size - 11 + (vi2 % 3), Math.floor(vi2 / 3), vd);
        setF(Math.floor(vi2 / 3), size - 11 + (vi2 % 3), vd);
      }
    }

    var bitIdx = 0, totalBits = cw.length * 8;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var j = 0; j < 2; j++) {
          var cc = right - j;
          var rr = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
          if (!isFunc[rr][cc]) {
            var dk = bitIdx < totalBits ? ((cw[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1) === 1 : false;
            bitIdx++;
            mod[rr][cc] = dk ? 2 : 1;
          }
        }
      }
    }

    var maskFn = [
      function (r, c) { return (r + c) % 2 === 0; },
      function (r, c) { return r % 2 === 0; },
      function (r, c) { return c % 3 === 0; },
      function (r, c) { return (r + c) % 3 === 0; },
      function (r, c) { return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; },
      function (r, c) { return ((r * c) % 2 + (r * c) % 3) === 0; },
      function (r, c) { return (((r * c) % 2 + (r * c) % 3) % 2) === 0; },
      function (r, c) { return (((r + c) % 2 + (r * c) % 3) % 2) === 0; }
    ];

    var bestPen = Infinity, bestGrid = null;
    for (var m = 0; m < 8; m++) {
      var g = [];
      for (var r = 0; r < size; r++) {
        var gr = [];
        for (var c = 0; c < size; c++) {
          gr.push((!isFunc[r][c] && maskFn[m](r, c)) ? mod[r][c] !== 2 : mod[r][c] === 2);
        }
        g.push(gr);
      }
      var rem = m;
      for (var ri = 0; ri < 10; ri++) rem = (rem << 1) ^ ((rem >> 9) * 0x537);
      var fb = ((m << 10) | rem) ^ 0x5412;
      for (var f1 = 0; f1 < 6; f1++) g[8][f1] = ((fb >> (14 - f1)) & 1) === 1;
      g[8][7] = ((fb >> 8) & 1) === 1;
      g[8][8] = ((fb >> 7) & 1) === 1;
      g[7][8] = ((fb >> 6) & 1) === 1;
      for (var f2 = 0; f2 < 6; f2++) g[5 - f2][8] = ((fb >> (5 - f2)) & 1) === 1;
      for (var f3 = 0; f3 < 7; f3++) g[size - 1 - f3][8] = ((fb >> (14 - f3)) & 1) === 1;
      for (var f4 = 0; f4 < 8; f4++) g[8][size - 8 + f4] = ((fb >> (7 - f4)) & 1) === 1;

      var pen = 0;
      for (var pr = 0; pr < size; pr++) {
        var runR = 1, runC = 1;
        for (var pi2 = 1; pi2 < size; pi2++) {
          if (g[pr][pi2] === g[pr][pi2 - 1]) { runR++; if (runR === 5) pen += 3; else if (runR > 5) pen++; } else runR = 1;
          if (g[pi2][pr] === g[pi2 - 1][pr]) { runC++; if (runC === 5) pen += 3; else if (runC > 5) pen++; } else runC = 1;
        }
      }
      for (var br = 0; br < size - 1; br++) {
        for (var bc = 0; bc < size - 1; bc++) {
          if (g[br][bc] === g[br][bc + 1] && g[br][bc] === g[br + 1][bc] && g[br][bc] === g[br + 1][bc + 1]) pen += 3;
        }
      }
      if (pen < bestPen) { bestPen = pen; bestGrid = g; }
    }

    var paths = [];
    for (var sr = 0; sr < size; sr++) {
      for (var sc = 0; sc < size; sc++) {
        if (bestGrid[sr][sc]) paths.push("M" + sc + "," + sr + "h1v1h-1z");
      }
    }
    return '<svg viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true"><path fill="#1D1D1F" d="' + paths.join("") + '"/></svg>';
  }

  /* ---------- 注入顶栏分享按钮与页脚分享链接 ---------- */
  var shareIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M7.5 7.5 12 3l4.5 4.5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>';

  var navShareBtn = document.createElement("button");
  navShareBtn.type = "button";
  navShareBtn.className = "nav-share";
  navShareBtn.setAttribute("aria-label", "分享本页");
  navShareBtn.setAttribute("title", "分享本页");
  navShareBtn.setAttribute("aria-expanded", "false");
  navShareBtn.setAttribute("aria-haspopup", "dialog");
  navShareBtn.innerHTML = shareIcon;

  var navGithub = navInner.querySelector(".nav-github");
  var navBurger = navInner.querySelector(".nav-burger");
  if (navGithub && navGithub.parentNode === navInner) navInner.insertBefore(navShareBtn, navGithub.nextSibling);
  else if (navBurger) navInner.insertBefore(navShareBtn, navBurger);
  else navInner.appendChild(navShareBtn);

  var footShareBtn = null;
  var footLinks = document.querySelector("footer .foot-links");
  if (footLinks) {
    footShareBtn = document.createElement("button");
    footShareBtn.type = "button";
    footShareBtn.className = "foot-share";
    footShareBtn.textContent = "分享本页";
    footShareBtn.setAttribute("aria-expanded", "false");
    footShareBtn.setAttribute("aria-haspopup", "dialog");
    footLinks.insertBefore(footShareBtn, footLinks.firstChild);
  }

  /* ---------- 分享浮层 ---------- */
  var pop = null, qrEl = null, copyBtn = null, weiboLink = null, qqLink = null, nativeBtn = null;
  var activeBtn = null, copyTimer = null;

  function getShareMeta() {
    var canonEl = document.querySelector('link[rel="canonical"]');
    var descEl = document.querySelector('meta[name="description"]');
    var imgEl = document.querySelector('meta[property="og:image"]');
    var url = location.href;
    if (location.protocol === "file:" && canonEl && canonEl.href) {
      url = canonEl.href + (location.hash || "");
    }
    return {
      url: url,
      title: document.title || "人口档案馆",
      desc: descEl ? (descEl.getAttribute("content") || "") : "",
      image: imgEl ? (imgEl.getAttribute("content") || "") : ""
    };
  }

  function ensurePopover() {
    if (pop) return pop;
    pop = document.createElement("div");
    pop.className = "share-popover";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-modal", "false");
    pop.setAttribute("aria-label", "分享本页");
    pop.innerHTML =
      '<div class="share-head">' +
        '<span class="share-title">分享本页</span>' +
        '<button type="button" class="share-close" aria-label="关闭分享浮层">×</button>' +
      '</div>' +
      '<div class="share-qr-box">' +
        '<div class="share-qr-frame"></div>' +
        '<div class="share-qr-tip">微信「扫一扫」打开页面并转发</div>' +
      '</div>' +
      '<div class="share-actions">' +
        '<button type="button" class="share-btn is-primary" data-act="copy">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
          '<span>复制页面链接</span>' +
        '</button>' +
        '<a class="share-btn" data-act="weibo" target="_blank" rel="noopener">' +
          '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.8 19.6c-4.5.4-8.3-1.6-8.5-4.6-.2-2.9 3.3-5.6 7.8-6 4.5-.4 8.3 1.6 8.5 4.6.2 2.9-3.3 5.6-7.8 6zm9.8-10.3c-.4-.1-.7-.2-.5-.6.4-1.1.4-2.1 0-2.8-.8-1.3-2.9-1.2-5.4-.1 0 0-.8.3-.6-.3.4-1.2.3-2.3-.3-2.9-1.4-1.4-5.1 0-8.2 3.1-2.4 2.4-3.7 4.9-3.7 7.1 0 4.2 5.4 6.7 10.7 6.7 6.9 0 11.5-4 11.5-7.2 0-1.9-1.6-3-3.5-3zm-9.4 7.7c-2.5.2-4.6-.9-4.7-2.6-.1-1.6 1.8-3.1 4.2-3.4 2.5-.2 4.6.9 4.7 2.6.1 1.7-1.7 3.2-4.2 3.4zm-.8-3.9c-1.1-.1-2.1.5-2.3 1.4-.1.9.6 1.7 1.7 1.8 1.1.1 2.1-.5 2.3-1.4.2-.9-.6-1.7-1.7-1.8zM20.2 3.9a5.8 5.8 0 0 0-4.9-1.5.7.7 0 0 0 .2 1.4 4.4 4.4 0 0 1 3.7 1.1 4.4 4.4 0 0 1 1 3.7.7.7 0 0 0 1.4.2 5.8 5.8 0 0 0-1.4-4.9z"/></svg>' +
          '<span>微博</span>' +
        '</a>' +
        '<a class="share-btn" data-act="qq" target="_blank" rel="noopener">' +
          '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c-3.9 0-6.8 2.8-6.8 7 0 .8.1 1.5.3 2.1-1.3 1.4-2.1 3.1-2.1 4.5 0 1 .4 1.5.9 1.5.5 0 1.1-.5 1.6-1.3.4.9 1 1.7 1.8 2.3-.9.3-1.5.8-1.5 1.3 0 .8 1.4 1.3 3.1 1.3 1.2 0 2.2-.3 2.7-.7.5.4 1.5.7 2.7.7 1.7 0 3.1-.5 3.1-1.3 0-.5-.6-1-1.5-1.3.8-.6 1.4-1.4 1.8-2.3.5.8 1.1 1.3 1.6 1.3.5 0 .9-.5.9-1.5 0-1.4-.8-3.1-2.1-4.5.2-.6.3-1.3.3-2.1 0-4.2-2.9-7-6.8-7z"/></svg>' +
          '<span>QQ</span>' +
        '</a>' +
      '</div>';

    qrEl = pop.querySelector(".share-qr-frame");
    copyBtn = pop.querySelector('[data-act="copy"]');
    weiboLink = pop.querySelector('[data-act="weibo"]');
    qqLink = pop.querySelector('[data-act="qq"]');

    if (typeof navigator.share === "function") {
      nativeBtn = document.createElement("button");
      nativeBtn.type = "button";
      nativeBtn.className = "share-btn is-native";
      nativeBtn.innerHTML = shareIcon + "<span>调用系统分享</span>";
      pop.querySelector(".share-actions").appendChild(nativeBtn);
      nativeBtn.addEventListener("click", function () {
        var meta = getShareMeta();
        navigator.share({ title: meta.title, text: meta.desc, url: meta.url }).catch(function () {});
      });
    }

    pop.querySelector(".share-close").addEventListener("click", function () {
      var prev = activeBtn;
      closeShare();
      if (prev && typeof prev.focus === "function") prev.focus();
    });

    copyBtn.addEventListener("click", function () {
      var meta = getShareMeta();
      function markCopied() {
        copyBtn.classList.add("is-copied");
        copyBtn.querySelector("span").textContent = "已复制链接 ✓";
        clearTimeout(copyTimer);
        copyTimer = setTimeout(function () {
          copyBtn.classList.remove("is-copied");
          copyBtn.querySelector("span").textContent = "复制页面链接";
        }, 2000);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(meta.url).then(markCopied, function () { fallbackCopy(meta.url, markCopied); });
      } else {
        fallbackCopy(meta.url, markCopied);
      }
    });

    document.body.appendChild(pop);
    return pop;
  }

  function fallbackCopy(text, onDone) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;";
    document.body.appendChild(ta);
    ta.select();
    try {
      if (document.execCommand("copy")) onDone();
    } catch (e) {}
    document.body.removeChild(ta);
  }

  function positionShare() {
    if (!pop || !activeBtn) return;
    var vw = window.innerWidth || document.documentElement.clientWidth;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var pw = pop.offsetWidth, ph = pop.offsetHeight;
    var margin = 12;

    if (vw <= 640) {
      pop.setAttribute("data-pos", activeBtn === footShareBtn ? "top" : "bottom");
      pop.style.left = Math.round((vw - pw) / 2) + "px";
      var topMobile = activeBtn === footShareBtn
        ? Math.max(margin, vh - ph - 24)
        : Math.max(margin, Math.min(64, vh - ph - margin));
      pop.style.top = Math.round(topMobile) + "px";
      return;
    }

    var rect = activeBtn.getBoundingClientRect();
    var left = Math.max(margin, Math.min(rect.right - pw, vw - pw - margin));
    var gap = 10;
    var pos = "bottom";
    var top = rect.bottom + gap;
    if (top + ph > vh - margin && rect.top - gap - ph >= margin) {
      pos = "top";
      top = rect.top - ph - gap;
    }
    top = Math.max(margin, Math.min(top, vh - ph - margin));
    pop.setAttribute("data-pos", pos);
    pop.style.left = Math.round(left) + "px";
    pop.style.top = Math.round(top) + "px";
  }

  function openShare(btn) {
    ensurePopover();
    var meta = getShareMeta();
    var svg = makeQrSvg(meta.url);
    if (!svg && meta.url.indexOf("#") !== -1) svg = makeQrSvg(meta.url.split("#")[0]);
    qrEl.innerHTML = svg;

    weiboLink.href = "https://service.weibo.com/share/share.php?url=" + encodeURIComponent(meta.url) +
      "&title=" + encodeURIComponent(meta.title + (meta.desc ? " — " + meta.desc : "")) +
      (meta.image ? "&pic=" + encodeURIComponent(meta.image) : "");
    qqLink.href = "https://connect.qq.com/widget/shareqq/index.html?url=" + encodeURIComponent(meta.url) +
      "&title=" + encodeURIComponent(meta.title) +
      (meta.desc ? "&summary=" + encodeURIComponent(meta.desc) : "") +
      (meta.image ? "&pics=" + encodeURIComponent(meta.image) : "");

    if (activeBtn && activeBtn !== btn) activeBtn.setAttribute("aria-expanded", "false");
    activeBtn = btn;
    btn.setAttribute("aria-expanded", "true");
    pop.classList.remove("is-open");
    positionShare();
    void pop.offsetWidth;
    pop.classList.add("is-open");
  }

  function closeShare() {
    if (!pop) return;
    pop.classList.remove("is-open");
    if (activeBtn) {
      activeBtn.setAttribute("aria-expanded", "false");
      activeBtn = null;
    }
  }

  function toggleShare(btn, e) {
    e.preventDefault();
    e.stopPropagation();
    if (document.body.classList.contains("nav-open")) {
      document.body.classList.remove("nav-open");
      var burger = document.querySelector(".nav-burger");
      if (burger) burger.setAttribute("aria-expanded", "false");
    }
    if (activeBtn === btn && pop && pop.classList.contains("is-open")) {
      closeShare();
    } else {
      openShare(btn);
    }
  }

  navShareBtn.addEventListener("click", function (e) { toggleShare(navShareBtn, e); });
  if (footShareBtn) footShareBtn.addEventListener("click", function (e) { toggleShare(footShareBtn, e); });

  document.addEventListener("click", function (e) {
    if (!pop || !pop.classList.contains("is-open")) return;
    if (!e.target.closest || !e.target.closest(".share-popover")) closeShare();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && pop && pop.classList.contains("is-open")) {
      var prev = activeBtn;
      closeShare();
      if (prev && typeof prev.focus === "function") prev.focus();
    }
  });
  window.addEventListener("resize", function () {
    if (pop && pop.classList.contains("is-open")) positionShare();
  }, { passive: true });
})();
