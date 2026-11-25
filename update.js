/* Service Worker 註冊＋新版本提示
   - 本機開發（localhost）一律解除註冊，避免快取干擾
   - 偵測到等待中的新版 SW 時，先比對版本（避免 CDN 殘留舊檔造成假更新），確定較新才跳出下方提示
   - 使用者按「立刻更新」才切換新版並重新整理；按「稍後再說」本次瀏覽不再提示同一版 */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;

  var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (LOCAL) {
    navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); });
    return;
  }

  var userAccepted = false;
  var shownFor = null;

  function getWorkerVersion(worker) {
    return new Promise(function (resolve) {
      try {
        var ch = new MessageChannel();
        var timer = setTimeout(function () { resolve(null); }, 1500);
        ch.port1.onmessage = function (e) {
          clearTimeout(timer);
          resolve(e.data && typeof e.data.version === 'string' ? e.data.version : null);
        };
        worker.postMessage({ type: 'GET_VERSION' }, [ch.port2]);
      } catch (err) { resolve(null); }
    });
  }

  function parse(v) {
    var m = /^(\d+)\.(\d+)\.(\d+)-([0-9a-z]+)/i.exec(v || '');
    return m ? { s: [+m[1], +m[2], +m[3]], h: m[4] } : null;
  }

  /* 判準：完全相同→否；版號較舊（CDN 殘留）→否；版號較新→是；同版號不同 commit→是；解析不了→是 */
  function isNewer(waiting, active) {
    if (waiting === active) return false;
    var w = parse(waiting), a = parse(active);
    if (!w || !a) return true;
    for (var i = 0; i < 3; i++) {
      if (w.s[i] > a.s[i]) return true;
      if (w.s[i] < a.s[i]) return false;
    }
    return w.h !== a.h;
  }

  function dismissedKey(v) { return 'smes-contest-dismiss-' + v; }

  function showPrompt(worker, version) {
    if (document.getElementById('swUpdate')) return;
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; })
      .then(function (info) {
        var box = document.createElement('div');
        box.id = 'swUpdate';
        box.className = 'sw-update';
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-live', 'polite');
        box.setAttribute('aria-label', '網站有新版本');
        box.innerHTML =
          '<div class="sw-update__seal" aria-hidden="true">新</div>' +
          '<div class="sw-update__body">' +
          '<strong>榮譽榜有新版本</strong>' +
          '<p>' + (info.notes ? escapeHtml(info.notes) : '公告內容或網站功能已更新') + '。重新整理即可看到最新成績。</p>' +
          '<div class="sw-update__actions">' +
          '<button type="button" class="sw-update__go">立刻更新</button>' +
          '<button type="button" class="sw-update__later">稍後再說</button>' +
          '</div></div>';
        document.body.appendChild(box);
        requestAnimationFrame(function () { box.classList.add('is-in'); });

        box.querySelector('.sw-update__go').addEventListener('click', function () {
          userAccepted = true;
          this.disabled = true;
          this.textContent = '更新中…';
          worker.postMessage({ type: 'SKIP_WAITING' });
          // 保險：3 秒內沒切換成功就直接重新整理
          setTimeout(function () { location.reload(); }, 3000);
        });
        box.querySelector('.sw-update__later').addEventListener('click', function () {
          try { sessionStorage.setItem(dismissedKey(version || 'unknown'), '1'); } catch (e) {}
          box.classList.remove('is-in');
          setTimeout(function () { box.remove(); }, 300);
        });
      });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function consider(reg, worker) {
    if (!worker || !navigator.serviceWorker.controller) return; // 第一次安裝不提示
    var active = reg.active || navigator.serviceWorker.controller;
    Promise.all([getWorkerVersion(worker), getWorkerVersion(active)]).then(function (v) {
      var waitingVer = v[0], activeVer = v[1];
      if (waitingVer && activeVer && !isNewer(waitingVer, activeVer)) return; // 假更新：不提示、不動它
      if (shownFor === waitingVer) return;
      try { if (sessionStorage.getItem(dismissedKey(waitingVer || 'unknown'))) return; } catch (e) {}
      shownFor = waitingVer;
      showPrompt(worker, waitingVer);
    });
  }

  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (userAccepted) location.reload();
  });

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (reg) {
      if (reg.waiting) consider(reg, reg.waiting);
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'installed') consider(reg, nw);
        });
      });
      // 回到分頁時、以及每 30 分鐘，主動檢查一次有沒有新版
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') reg.update().catch(function () {});
      });
      setInterval(function () { reg.update().catch(function () {}); }, 30 * 60 * 1000);
    }).catch(function (err) { console.warn('[SW] 註冊失敗', err); });
  });

  /* 頁尾顯示目前版本 */
  fetch('version.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (info) {
    var tag = document.querySelector('.version-tag');
    if (tag && info.version) tag.textContent = 'v' + info.version + (info.build ? ' · ' + info.build.split('-').pop() : '');
  }).catch(function () {});
})();
