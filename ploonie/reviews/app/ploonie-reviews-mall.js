/* 플루니 몰 연결부 (2026-10-24, 크리마 해지 대체)
 * 스킨 공통 파일에 이 파일 하나만 붙인다. 같은 폴더의 CSS·JS 를 불러오고, 리뷰 데이터는 GitHub raw 에서 읽어
 * 크리마 위젯이 있던 자리에 그린다.
 *   상품 상세: #rvSlot52(사진 띠) · #detail3(리뷰 목록) · .pd-rvcount · .pd-score
 *   메인·목록: [data-crema="score"|"count"] 칸
 *   REVIEW 메뉴(/board/review/4/): 카페24 기본 목록을 가리고 베스트 + 전체 목록
 * 끄기: 주소 끝에 #pr-off 를 붙이면 이 페이지에서만 안 돈다(점검용).
 */
(function () {
  'use strict';
  if (window.__PR_MALL || /pr-off/.test(location.hash)) return;
  window.__PR_MALL = 1;

  var me = document.currentScript && document.currentScript.src || '';
  var BASE = me.replace(/[^\/]*$/, '');
  var DATA = window.PLOONIE_REVIEWS_DATA || 'https://raw.githubusercontent.com/junhwi-prog/ploonie-reviews/main/ploonie/reviews/data/';
  var DEVICE = /Mobi|Android|iPhone|iPod/i.test(navigator.userAgent) ? 'mobile' : 'pc';
  var JS = ['ploonie-reviews.js', 'ploonie-reviews-board.js', 'ploonie-review-write.js', 'ploonie-review-submit.js'];
  var CSS = ['ploonie-reviews.css', 'ploonie-review-write.css'];

  // 크리마 위젯이 남아 있어도(해지 전·캐시) 우리 것만 보이게
  var st = document.createElement('style');
  st.textContent = '.crema-product-reviews,.crema-reviews,.crema-popup{display:none !important}' +
    '.pr-board-hide{display:none !important}';
  (document.head || document.documentElement).appendChild(st);
  CSS.forEach(function (f) {
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = BASE + f;
    (document.head || document.documentElement).appendChild(l);
  });

  function loadJs(i, done) {
    if (i >= JS.length) return done();
    var s = document.createElement('script'); s.src = BASE + JS[i];
    s.onload = function () { loadJs(i + 1, done); };
    s.onerror = function () { console.warn('[플루니 리뷰] 불러오기 실패', JS[i]); loadJs(i + 1, done); };
    document.head.appendChild(s);
  }
  function getJson(f) {
    // raw.githubusercontent 는 5분 캐시. 5분 단위 꼬리표로 브라우저 캐시도 같이 맞춘다
    return fetch(DATA + f + '?v=' + Math.floor(Date.now() / 3e5)).then(function (r) {
      if (!r.ok) throw new Error(f + ' ' + r.status); return r.json();
    });
  }
  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  function qs(s, r) { return (r || document).querySelector(s); }
  function qsa(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }

  function productNo() {
    var m = location.search.match(/product_no=(\d+)/) || location.pathname.match(/\/product\/[^\/]*\/(\d+)/) || location.pathname.match(/\/(\d+)\/category\//);
    return window.iProductNo ? String(window.iProductNo) : (m ? m[1] : '');
  }

  // 메인·목록·상세 제목 아래 별점: 크리마 칸을 채우고 스킨이 기다리는 'on' 을 단다
  function cards() {
    var no = productNo();
    if (no) qsa('.pd-score [data-crema]').forEach(function (e) { if (!e.getAttribute('data-code')) e.setAttribute('data-code', no); });
    window.PloonieReviews.applyCards(document);
    qsa('[data-crema="count"]').forEach(function (c) {
      var box = c.closest('.rv, .pd-score');
      if (box && /[1-9]/.test(c.textContent) && !/ on/.test(' ' + box.className)) box.className += ' on';
    });
  }
  function watchCards() {
    cards();
    var n = 0, t = setInterval(function () { cards(); if (++n > 40) clearInterval(t); }, 500);
    if (window.MutationObserver) {
      var tm = null, seen = -1;
      var mo = new MutationObserver(function () {
        if (tm) return;
        tm = setTimeout(function () { tm = null; var n = qsa('[data-crema]').length; if (n !== seen) { seen = n; cards(); } }, 300);
      });
      mo.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () { mo.disconnect(); }, 30000);
    }
  }

  function detail() {
    var no = productNo(), P = window.PLOONIE_PRODUCTS || {};
    if (!no || !P[no]) return;
    var st = window.PloonieReviews.scoreText(no);
    var mine = window.PloonieReviewSubmit ? window.PloonieReviewSubmit.mine(P[no].sources, window.PLOONIE_REVIEWS).length : 0;
    var cnt = (st.n + mine).toLocaleString('ko-KR');
    function counts() { qsa('.pd-rvcount').forEach(function (e) { e.textContent = cnt; }); }
    counts();

    var rv = qs('.pd-rv'), slot = qs('#rvSlot52');
    if (slot) {
      var keep = function () { if (rv && rv.hidden) rv.hidden = false; counts(); };
      keep();
      var ph = document.createElement('div'); slot.appendChild(ph);
      window.PloonieReviews.mount(ph, { type: 'photos', product: no, device: DEVICE, base: window.PLOONIE_REVIEWS_BASE });
      if (!ph.innerHTML && rv) rv.hidden = true;
      else { var k = 0, t = setInterval(function () { keep(); if (++k > 30) clearInterval(t); }, 500); }
    }
    var d3 = qs('#detail3');
    if (d3 && !qs('[data-pr-mall]', d3)) {
      var el = document.createElement('div'); el.setAttribute('data-pr-mall', 'list'); d3.appendChild(el);
      window.PloonieReviews.mount(el, { type: 'list', product: no, device: DEVICE, userName: '', base: window.PLOONIE_REVIEWS_BASE });
    }
  }

  function board() {
    var lp = qs('.xans-board-listpackage-4');
    if (!lp || qs('[data-pr-mall]', lp)) return;
    qsa(':scope > *', lp).forEach(function (e) { if (!/xans-board-title/.test(e.className)) e.classList.add('pr-board-hide'); });
    var best = document.createElement('div'), all = document.createElement('div');
    best.setAttribute('data-pr-mall', 'best'); all.setAttribute('data-pr-mall', 'board');
    lp.appendChild(best); lp.appendChild(all);
    window.PloonieReviews.mount(best, { type: 'best', device: DEVICE, base: window.PLOONIE_REVIEWS_BASE });
    window.PloonieReviews.mount(all, { type: 'board', device: DEVICE });
  }

  // 쓰기 화면(안전장치로 넘어온 글 채우기)은 ploonie-review-submit.js 가 스스로 처리한다
  ready(function () {
    loadJs(0, function () {
      if (!window.PloonieReviews) return;
      Promise.all([getJson('reviews.json'), getJson('products.json'), getJson('meta.json')]).then(function (r) {
        window.PLOONIE_REVIEWS = r[0]; window.PLOONIE_PRODUCTS = r[1]; window.PLOONIE_META = r[2];
        var run = function (f, n) { try { f(); } catch (e) { console.warn('[플루니 리뷰]', n, e); } };
        run(watchCards, 'cards');
        run(detail, 'detail');
        run(board, 'board');
      }).catch(function (e) { console.warn('[플루니 리뷰] 데이터 실패', e); });
    });
  });
})();
