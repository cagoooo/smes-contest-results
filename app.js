/* 石門國小競賽榮譽榜：讀取 data/ 底下的 JSON，以 #/ 路由切換「公告總覽」與「單一競賽」 */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var cache = {};
  var GROUPS = ['國語文', '本土語文', '英語文'];
  var NUM = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function getJSON(url) {
    if (cache[url]) return Promise.resolve(cache[url]);
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.json();
    }).then(function (d) { cache[url] = d; return d; });
  }

  function loadAll() {
    return getJSON('data/contests.json').then(function (idx) {
      return Promise.all(idx.contests.map(function (c) {
        return getJSON(c.file).then(function (d) { d.id = c.id; return d; });
      }));
    }).then(function (list) {
      return list.sort(function (a, b) { return a.published < b.published ? 1 : -1; });
    });
  }

  /* 2026-11-25 → 民國 115 年 11 月 25 日 */
  function rocDate(iso) {
    var p = iso.split('-').map(Number);
    return { y: p[0] - 1911, m: p[1], d: p[2] };
  }
  function cnNum(n) {
    return String(n).split('').map(function (c) { return NUM[+c]; }).join('');
  }

  function cnCount(n) {
    if (n <= 10) return n === 10 ? '十' : NUM[n];
    var t = Math.floor(n / 10), o = n % 10;
    return (t > 1 ? NUM[t] : '') + '十' + (o ? NUM[o] : '');
  }

  var GRADE_ORDER = ['一年級', '二年級', '三年級', '四年級', '五年級', '五六年級', '六年級'];
  var EVENT_ORDER = ['演說', '朗讀', '說故事', '字音字形', '作文', '書法', '硬筆字'];
  function rankOf(list, v) {
    for (var k = 0; k < list.length; k++) { if (v.indexOf(list[k]) >= 0 && (list === GRADE_ORDER ? v === list[k] : true)) return k; }
    return 99;
  }
  function sortItems(items) {
    return items.slice().sort(function (a, b) {
      return (GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group)) ||
        (rankOf(EVENT_ORDER, a.event) - rankOf(EVENT_ORDER, b.event)) ||
        (a.event < b.event ? -1 : a.event > b.event ? 1 : 0) ||
        (rankOf(GRADE_ORDER, a.grade) - rankOf(GRADE_ORDER, b.grade));
    });
  }

  function summarize(c) {
    var done = sortItems(c.items.filter(function (i) { return i.results.length; }));
    var people = done.reduce(function (s, i) { return s + i.results.length; }, 0);
    return { done: done, pending: c.items.length - done.length, people: people };
  }

  function awardClass(r) {
    if (r.award === '第一名' || r.award === '特優') return 'a1';
    if (r.award === '第二名' || r.award === '優等') return 'a2';
    if (r.award === '第三名' || r.award === '甲等') return 'a3';
    return 'a4';
  }

  /* ---------- 公告總覽 ---------- */
  function renderHome(list) {
    document.title = '石門國小競賽榮譽榜';
    var cards = list.map(function (c, idx) {
      var s = summarize(c), d = rocDate(c.published);
      var featured = idx === 0;
      return '<a class="notice paper reveal' + (featured ? ' featured' : '') + '" style="animation-delay:' + (idx * 80) + 'ms" href="#/c/' + esc(c.id) + '">' +
        (featured ? '<span class="notice-new" aria-hidden="true">最新</span>' : '') +
        '<span class="notice-date">' + cnNum(d.y) + '年' + cnCount(d.m) + '月' + cnCount(d.d) + '日</span>' +
        '<div><h2>' + esc(c.title) + '</h2>' +
        (c.subtitle ? '<p class="sub">' + esc(c.subtitle) + '</p>' : '') +
        '<ul class="meta">' +
        '<li class="chip">已公布 <b>' + s.done.length + '</b> 項</li>' +
        '<li class="chip">得獎 <b>' + s.people + '</b> 人次</li>' +
        (s.pending ? '<li class="chip">整理中 ' + s.pending + ' 項</li>' : '') +
        '</ul>' +
        (featured ? '<ul class="notice-items">' + s.done.map(function (i) { return '<li>' + esc(i.title) + '</li>'; }).join('') + '</ul>' : '') +
        '<span class="go">展卷閱覽</span></div></a>';
    }).join('');

    app.innerHTML =
      '<section class="intro paper reveal">' +
      '<div><h1>競賽成績公告</h1>' +
      '<p>這裡公告石門國小各項校內外競賽的得獎名單。每一份榮耀，都是孩子們日日練習、反覆琢磨的成果；也謝謝每一位陪伴指導的老師與家長。</p></div>' +
      '<div class="intro-poem" aria-hidden="true">筆墨<span class="red">有聲</span><br>書香<span class="red">傳承</span></div>' +
      '</section>' +
      '<h2 class="section-title"><span class="brush" aria-hidden="true"></span>公告欄</h2>' +
      '<div class="notice-grid">' + (cards || '<p class="empty">目前尚無公告</p>') + '</div>';
  }

  /* ---------- 單一競賽 ---------- */
  var state = { group: '全部', cls: '' };

  function renderContest(c) {
    document.title = c.title + '｜石門國小競賽榮譽榜';
    var s = summarize(c), d = rocDate(c.published);
    var groups = GROUPS.filter(function (g) { return s.done.some(function (i) { return i.group === g; }); });
    var classes = {};
    s.done.forEach(function (i) { i.results.forEach(function (r) { classes[r.cls] = 1; }); });
    var clsList = Object.keys(classes).sort();
    var grades = {};
    s.done.forEach(function (i) { i.results.forEach(function (r) { grades[r.cls.charAt(0)] = 1; }); });
    if (state.cls && !classes[state.cls]) state.cls = '';
    if (state.group !== '全部' && groups.indexOf(state.group) < 0) state.group = '全部';

    app.innerHTML =
      '<a class="crumb reveal" href="#/">← 回公告總覽</a>' +
      '<section class="contest-head paper reveal">' +
      '<h1>' + esc(c.title) + '</h1>' +
      (c.subtitle ? '<p class="sub">' + esc(c.subtitle) + '</p>' : '') +
      '<div class="stats">' +
      '<div class="stat"><div class="n">' + s.people + '</div><div class="l">得獎人次</div></div>' +
      '<div class="stat"><div class="n">' + s.done.length + '</div><div class="l">已公布項目</div></div>' +
      '<div class="stat"><div class="n">' + Object.keys(grades).length + '</div><div class="l">參與年級</div></div>' +
      '<div class="stat"><div class="n">' + d.m + '/' + d.d + '</div><div class="l">民國 ' + d.y + ' 年公告</div></div>' +
      '</div>' +
      '<p class="privacy-note">🔒 為保護學生隱私，姓名已去識別化：三個字以上的名字中間字以「○」表示，兩個字的名字末字以「○」表示。</p>' +
      '</section>' +
      '<div class="filters reveal" role="group" aria-label="篩選">' +
      '<div class="tabs">' + ['全部'].concat(groups).map(function (g) {
        return '<button type="button" class="tab" data-group="' + g + '" aria-pressed="' + (state.group === g) + '">' + g + '</button>';
      }).join('') + '</div>' +
      '<label class="cls-filter">依班級查看<select id="clsSel"><option value="">全部班級</option>' +
      clsList.map(function (k) { return '<option value="' + k + '"' + (state.cls === k ? ' selected' : '') + '>' + k + ' 班</option>'; }).join('') +
      '</select></label>' +
      '<span class="result-count" id="resultCount" aria-live="polite"></span>' +
      '</div>' +
      '<div class="board-grid" id="boards"></div>' +
      (s.pending ? '<h2 class="section-title"><span class="brush" aria-hidden="true"></span>成績整理中</h2>' +
        '<div class="pending paper"><p>以下項目成績確認後將陸續公告，敬請期待。</p><ul>' +
        sortItems(c.items.filter(function (i) { return !i.results.length; })).map(function (i) { return '<li>' + esc(i.title) + '</li>'; }).join('') +
        '</ul></div>' : '');

    app.querySelectorAll('.tab').forEach(function (b) {
      b.addEventListener('click', function () {
        state.group = b.getAttribute('data-group');
        app.querySelectorAll('.tab').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        drawBoards(s.done);
      });
    });
    document.getElementById('clsSel').addEventListener('change', function (e) {
      state.cls = e.target.value; drawBoards(s.done);
    });
    drawBoards(s.done);
  }

  function drawBoards(items) {
    var box = document.getElementById('boards');
    var shown = items.filter(function (i) {
      if (state.group !== '全部' && i.group !== state.group) return false;
      if (state.cls && !i.results.some(function (r) { return r.cls === state.cls; })) return false;
      return true;
    });
    var hits = 0;
    function card(i, idx) {
      return '<article class="board paper reveal" style="animation-delay:' + Math.min(idx * 50, 400) + 'ms">' +
        '<header class="board-head"><h3><small>' + esc(i.grade) + '</small>' + esc(i.event) + '</h3>' +
        '<span class="board-num">' + i.results.length + ' 人</span></header>' +
        '<ol class="roll">' + i.results.map(function (r) {
          var hl = state.cls && r.cls === state.cls;
          if (hl) hits++;
          return '<li' + (hl ? ' class="hl"' : '') + '><span class="award ' + awardClass(r) + '">' + esc(r.award) + '</span>' +
            '<span class="cls">' + esc(r.cls) + '</span><span class="name">' + esc(r.name) + '</span></li>';
        }).join('') + '</ol></article>';
    }
    box.innerHTML = GROUPS.map(function (g) {
      var list = shown.filter(function (i) { return i.group === g; });
      if (!list.length) return '';
      return '<section class="group-block"><h2 class="group-title"><span>' + g + '</span><small>' + list.length + ' 項</small></h2>' +
        '<div class="board-cols">' + list.map(card).join('') + '</div></section>';
    }).join('') || '<p class="empty paper">這個分類目前沒有得獎紀錄</p>';

    var people = shown.reduce(function (s, i) { return s + i.results.length; }, 0);
    document.getElementById('resultCount').textContent = state.cls
      ? state.cls + ' 班共 ' + hits + ' 人次得獎（' + shown.length + ' 個項目）'
      : '顯示 ' + shown.length + ' 個項目、' + people + ' 人次';
  }

  /* ---------- 路由 ---------- */
  function route() {
    var m = location.hash.match(/^#\/c\/([\w-]+)/);
    loadAll().then(function (list) {
      if (m) {
        var c = list.filter(function (x) { return x.id === m[1]; })[0];
        if (c) { renderContest(c); }
        else { app.innerHTML = '<p class="empty paper">找不到這則公告，<a href="#/">回公告總覽</a></p>'; }
      } else {
        state = { group: '全部', cls: '' };
        renderHome(list);
      }
      window.scrollTo(0, 0);
    }).catch(function (err) {
      console.error(err);
      app.innerHTML = '<p class="empty paper">資料讀取失敗，請稍後重新整理頁面。</p>';
    });
  }

  window.addEventListener('hashchange', route);
  route();
})();
