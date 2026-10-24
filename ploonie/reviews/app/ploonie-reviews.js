/* 플루니 자체 리뷰 화면 (2026-10-20)
 * 크리마 위젯 4종을 같은 모양·같은 순서로 다시 그린다.
 *   PloonieReviews.mount(el, { type: 'list',   product: '29', device: 'pc'|'mobile' })  상품 상세 리뷰 목록
 *   PloonieReviews.mount(el, { type: 'photos', product: '29', device })                  상품 상세 위 사진 가로 목록
 *   PloonieReviews.mount(el, { type: 'board',  device })                                 REVIEW 메뉴 전체 목록
 *   PloonieReviews.mount(el, { type: 'best',   device })                                 REVIEW 메뉴 위 베스트 3장
 *   PloonieReviews.scoreText(code) → { score: '4.9', count: '2,144' }                     상품 카드 별점·리뷰수
 * 데이터는 window.PLOONIE_REVIEWS / PLOONIE_PRODUCTS (data/data.js) 를 쓴다.
 */
(function () {
  'use strict';
  var PER_PAGE = 5;
  var SCORE_LABEL = { 5: '아주 좋아요', 4: '맘에 들어요', 3: '보통이에요', 2: '그냥 그래요', 1: '별로예요' };
  var FILTER_LABEL = { 5: '아주 좋아요', 4: '좋아요', 3: '보통이에요', 2: '그냥 그래요', 1: '별로예요' };
  // AI 추천순은 뺐다(2026-10-20 사용자 결정: 추천 기준을 손님이 믿지 않음). 기본은 최신순
  var SORTS = [['20', '최신순'], ['30', '별점순']];
  var opts0 = { base: '' };

  /* ---------- 아이콘 (직접 그린 것) ---------- */
  var IC = {
    star: function (s) { return '<svg class="pr-ic" width="' + s + '" height="' + s + '" viewBox="0 0 24 24"><path d="M12 .8l3.4 7.05 7.75.95-5.7 5.35 1.45 7.7L12 18.05 5.1 21.85l1.45-7.7L.85 8.8l7.75-.95z"/></svg>'; },
    info: function (s) { return '<svg class="pr-ic-line" width="' + s + '" height="' + s + '" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.3"/><path d="M8 7.2v4"/><circle cx="8" cy="5" r=".35" fill="currentColor"/></svg>'; },
    right: function (s) { return '<svg class="pr-ic-line" width="' + s + '" height="' + s + '" viewBox="0 0 16 16"><path d="M6 3.5L10.5 8 6 12.5"/></svg>'; },
    down: function () { return '<svg class="pr-ic-line pr-dd__arrow" width="9" height="8" viewBox="0 0 9 8"><path d="M1 2.5l3.5 3.5L8 2.5"/></svg>'; },
    downS: function () { return '<svg class="pr-ic-line" width="10" height="10" viewBox="0 0 10 10"><path d="M2 3.5l3 3 3-3"/></svg>'; },
    search: function (s) { return '<svg class="pr-ic-line" width="' + s + '" height="' + s + '" viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.8"/><path d="M10.6 10.6L14 14"/></svg>'; },
    report: function () { return '<svg class="pr-ic-line" width="16" height="16" viewBox="0 0 16 16"><path d="M4.5 11.5V8a3.5 3.5 0 017 0v3.5M3.5 11.5h9M7 13.5h2"/></svg>'; },
    up: function () { return '<svg class="pr-ic-line" width="16" height="16" viewBox="0 0 16 16"><path d="M5 7.2V13H3V7.2zM5 7.2L7.7 3c.9 0 1.5.7 1.3 1.6L8.6 6.4h3.6c.8 0 1.4.8 1.2 1.6l-1.1 4.1c-.2.6-.7.9-1.3.9H5"/></svg>'; },
    dn: function () { return '<svg class="pr-ic-line" width="16" height="16" viewBox="0 0 16 16"><path d="M5 8.8V3H3v5.8zM5 8.8L7.7 13c.9 0 1.5-.7 1.3-1.6L8.6 9.6h3.6c.8 0 1.4-.8 1.2-1.6l-1.1-4.1C12.1 3.3 11.6 3 11 3H5"/></svg>'; },
    toggle: function () { return '<svg class="pr-ic-line" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.3"/><path d="M5.3 8.1l1.8 1.8 3.6-3.6"/></svg>'; },
    ai: function (s) { return '<svg class="pr-dd__ai" width="' + s + '" height="' + s + '" viewBox="0 0 16 16"><defs><linearGradient id="prAiG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b37cff"/><stop offset="1" stop-color="#6b5cff"/></linearGradient></defs><path fill="url(#prAiG)" d="M6.6 1.5l1.25 3.45L11.3 6.2 7.85 7.45 6.6 10.9 5.35 7.45 1.9 6.2l3.45-1.25zM12 9l.7 1.8 1.8.7-1.8.7L12 14l-.7-1.8-1.8-.7 1.8-.7z"/></svg>'; },
    media: function () { return '<svg class="pr-ic" width="20" height="20" viewBox="0 0 20 20"><path d="M6 3h10a1 1 0 011 1v10a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3 6v10a1 1 0 001 1h10" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'; },
    close: function () { return '<svg class="pr-ic-line" width="20" height="20" viewBox="0 0 20 20"><path d="M4 4l12 12M16 4L4 16"/></svg>'; }
  };

  /* ---------- 도구 ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function stars(score, size, cls) {
    var h = '<ul class="pr-rate ' + (cls || '') + '" style="--size:' + size + 'px">';
    for (var i = 1; i <= 5; i++) h += '<li class="' + (i <= score ? 'f' : '') + '">' + IC.star(size) + '</li>';
    return h + '</ul>';
  }
  function img(src) { return (/^(https?|data):/.test(src) ? '' : opts0.base) + src; }
  function data() { return { R: window.PLOONIE_REVIEWS || [], P: window.PLOONIE_PRODUCTS || {} }; }
  function reviewsOf(code) {
    var d = data(), p = d.P[code];
    if (!p) return [];
    return d.R.filter(function (r) { return p.sources.indexOf(r.p) >= 0; });
  }
  function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
  // 크리마와 같은 순서 (2026-10-20 크리마 위젯 96쪽 대조, check_order.py)
  function sortReviews(rs, sort, photoFirst) {
    var key = sort === '20' ? function (r) { return [r.t, r.id]; }
      : sort === '30' ? function (r) { return [r.s, r.t, r.id]; }
        : function (r) { return [r.rs, r.t, r.id]; };
    var out = rs.slice().sort(function (a, b) {
      var ka = key(a), kb = key(b);
      for (var i = 0; i < ka.length; i++) { var c = cmp(kb[i], ka[i]); if (c) return c; }
      return 0;
    });
    if (photoFirst) out = out.filter(function (r) { return r.img.length; }).concat(out.filter(function (r) { return !r.img.length; }));
    if (sort === '80') {
      var pins = out.filter(function (r) { return r.pin; }).sort(function (a, b) { return b.pin - a.pin; });
      out = pins.concat(out.filter(function (r) { return !r.pin; }));
    }
    return out;
  }
  function stat(rs) {
    var h = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, sum = 0;
    rs.forEach(function (r) { h[r.s]++; sum += r.s; });
    return { n: rs.length, avg: rs.length ? (Math.round(sum / rs.length * 10) / 10).toFixed(1) : '0.0', h: h };
  }
  function highlight(text, kw) {
    var t = esc(text);
    if (!kw) return t;
    var k = esc(kw).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return t.replace(new RegExp(k, 'gi'), function (m) { return '<mark>' + m + '</mark>'; });
  }
  function on(root, sel, ev, fn) {
    root.addEventListener(ev, function (e) {
      var t = e.target.closest(sel);
      if (t && root.contains(t)) fn(e, t);
    });
  }
  function wide(el) { return el.clientWidth >= 720; }

  // 크리마 NEW 표시: 10/18 리뷰엔 있고 10/12 리뷰엔 없음(10/20 기준) → 7일 안
  var NEW_DAYS = 7;
  function isNew(r) { return (Date.now() - new Date(r.t).getTime()) < NEW_DAYS * 864e5; }

  /* ---------- 리뷰 한 건 ---------- */
  function reviewHtml(r, o) {
    o = o || {};
    var h = '<div class="pr-rv" data-id="' + r.id + '">';
    var tags = (r.pin && o.showPin ? '<span class="pr-tag">쇼핑몰 추천</span>' : '') + (r.re ? '<span class="pr-tag">재구매</span>' : '') + (isNew(r) ? '<span class="pr-tag">NEW</span>' : '');
    if (tags) h += '<div class="pr-rv__tags">' + tags + '</div>';
    h += '<div class="pr-rv__user"><div class="pr-rv__row"><div class="pr-rv__name">' + esc(r.n) + '</div><div class="pr-rv__date">' + esc(r.d) + '</div></div>' +
      '<div class="pr-rv__grade">작성자 등급 ' + esc(r.g) + '</div></div>';
    if (r.o) h += '<div class="pr-rv__opt"><b>상품 옵션</b><span>' + esc(r.o) + '</span></div>';
    h += stars(r.s, 14, 'pr-rv__stars');
    h += '<div class="pr-rv__msg' + (o.full ? '' : ' cut') + '">' + highlight(r.m, o.kw) + '</div>';
    if (!o.full) h += '<div class="pr-rv__toggle" hidden><button type="button" data-act="more">리뷰 더보기</button></div>';
    if (r.img.length && !o.noMedia) {
      h += '<div class="pr-rv__media">';
      r.img.forEach(function (s, i) { h += '<a class="pr-rv__img" data-act="photo" data-i="' + i + '"><img src="' + esc(img(s)) + '" alt="" loading="lazy"></a>'; });
      h += '</div>';
    }
    // '신고 및 차단'은 뺐다(2026-10-20 사용자 결정)
    h += '<div class="pr-like"><div class="pr-like__btns"><a data-act="like">' + IC.up() + '<span>도움돼요</span>' + (r.like ? '<b>' + r.like + '</b>' : '') + '</a><a data-act="dislike">' + IC.dn() + '<span>도움안돼요</span></a></div>' +
      '<a class="pr-like__cmt" data-act="cmt"><span>댓글</span><b>' + r.c.length + '</b>' + IC.downS() + '</a></div>';
    h += '<div class="pr-cmts" hidden><ul>';
    r.c.forEach(function (c) {
      h += '<li class="pr-cmt"><div class="pr-cmt__name">' + esc(c.n) + '</div><div class="pr-cmt__msg">' + esc(c.m) + '</div></li>';
    });
    h += '</ul></div></div>';
    return h;
  }
  // 세 줄을 넘는 글만 "리뷰 더보기" 를 보인다
  function fixToggles(root) {
    root.querySelectorAll('.pr-rv__msg.cut').forEach(function (m) {
      var t = m.parentNode.querySelector('.pr-rv__toggle');
      if (t) t.hidden = m.scrollHeight <= m.clientHeight + 1;
    });
  }
  function bindReview(root, find) {
    on(root, '[data-act]', 'click', function (e, t) {
      var box = t.closest('.pr-rv'), act = t.getAttribute('data-act');
      if (!box) return;
      if (act === 'more') {
        var m = box.querySelector('.pr-rv__msg'), cut = m.classList.toggle('cut');
        t.textContent = cut ? '리뷰 더보기' : '리뷰 접기';
      } else if (act === 'cmt') {
        var c = box.querySelector('.pr-cmts');
        c.hidden = !c.hidden; t.classList.toggle('open', !c.hidden);
      } else if (act === 'like' || act === 'dislike') {
        t.classList.toggle('on');
      } else if (act === 'photo') {
        e.preventDefault();
        openPhoto(find(+box.getAttribute('data-id')), +t.getAttribute('data-i'));
      }
    });
  }

  /* ---------- 사진 크게 보기 ---------- */
  function openPhoto(r, i) {
    if (!r) return;
    var pop = document.createElement('div');
    pop.className = 'pr pr-pop';
    var draw = function () {
      pop.innerHTML = '<div class="pr-pop__box"><button class="pr-pop__close" data-x>' + IC.close() + '</button>' +
        '<div class="pr-pop__media"><img src="' + esc(img(r.img[i])) + '" alt="">' +
        (r.img.length > 1 ? '<a class="pr-pop__nav pr-pop__nav--l" data-n="-1">' + IC.right(24).replace('<svg', '<svg style="transform:rotate(180deg)"') + '</a><a class="pr-pop__nav pr-pop__nav--r" data-n="1">' + IC.right(24) + '</a>' : '') +
        '</div><div class="pr-pop__side">' + reviewHtml(r, { full: true, noMedia: true }) + '</div></div>';
    };
    draw();
    pop.addEventListener('click', function (e) {
      if (e.target === pop || e.target.closest('[data-x]')) { pop.remove(); document.body.style.overflow = ''; return; }
      var n = e.target.closest('[data-n]');
      if (n) { i = (i + +n.getAttribute('data-n') + r.img.length) % r.img.length; draw(); }
      var c = e.target.closest('[data-act="cmt"]');
      if (c) { var b = pop.querySelector('.pr-cmts'); b.hidden = !b.hidden; c.classList.toggle('open', !b.hidden); }
    });
    document.body.appendChild(pop);
    document.body.style.overflow = 'hidden';
  }

  /* ---------- 쪽 번호 ---------- */
  function pagesHtml(page, total) {
    if (total <= 1 && page <= 1) return '<div class="pr-pages"><a class="off">' + IC.right(16).replace('<svg', '<svg class="pr-left"') + '</a><a class="on">1</a><a class="off">' + IC.right(16) + '</a></div>';
    var start = Math.floor((page - 1) / 5) * 5 + 1, end = Math.min(start + 4, total);
    var h = '<div class="pr-pages"><a data-page="' + (start - 1) + '" class="' + (start === 1 ? 'off' : '') + '">' + IC.right(16).replace('<svg', '<svg class="pr-left"') + '</a>';
    for (var p = start; p <= end; p++) h += '<a data-page="' + p + '" class="' + (p === page ? 'on ' : '') + (p - start === 4 ? 'd5' : '') + '">' + p + '</a>';
    h += '<a data-page="' + (end + 1) + '" class="' + (end >= total ? 'off' : '') + '">' + IC.right(16) + '</a></div>';
    return h;
  }

  /* ---------- 상품 상세 리뷰 목록 ---------- */
  function mountList(el, o) {
    var d = data(), prod = d.P[o.product];
    var all, st, mine;
    // 방금 쓴 내 리뷰(수집 전)는 내 화면에서만 맨 위에 보인다 — ploonie-review-submit.js
    function load() {
      mine = window.PloonieReviewSubmit && prod ? window.PloonieReviewSubmit.mine(prod.sources, d.R) : [];
      all = mine.concat(reviewsOf(o.product)); st = stat(all);
    }
    load();
    var isPc = o.device !== 'mobile';
    var S = { sort: '20', page: 1, scores: [], kw: '', searching: false, photoFirst: false, menu: null };

    function list() {
      var rs = all;
      if (S.scores.length) rs = rs.filter(function (r) { return S.scores.indexOf(r.s) >= 0; });
      if (S.kw) { var k = S.kw.toLowerCase(); rs = rs.filter(function (r) { return r.m.toLowerCase().indexOf(k) >= 0; }); }
      var top = rs.filter(function (r) { return r.mine; });
      return top.concat(sortReviews(rs.filter(function (r) { return !r.mine; }), S.sort, isPc || S.photoFirst));
    }
    function headerHtml() {
      var h = '<div class="pr-title"><div class="pr-title__head"><div class="pr-title__row"><div class="pr-title__group"><div class="pr-title__text">REVIEW</div>' +
        '<a class="pr-policy" data-act="policy">' + IC.info(12) + '<span>리뷰 운영방식</span></a></div>' +
        '<a class="pr-allbtn" href="' + esc(o.boardUrl || '/board/review/4/') + '" target="_top">전체 상품 리뷰 보기 ' + IC.right(8) + '</a></div></div>' +
        '<div class="pr-title__actions"><button type="button" class="pr-write" data-act="write">내 리뷰 작성하기</button></div></div>';
      var sm = prod && prod.summary;
      h += '<div class="pr-sum-wrap"><div class="pr-sum"><div class="pr-sum__title-row">' + IC.ai(24).replace('pr-dd__ai', '') + '<div class="pr-sum__title">AI 리뷰 요약</div><span class="pr-sum__tip">' + IC.info(14) + '</span></div>';
      if (sm) {
        h += '<div class="pr-sum__body"><div class="pr-sum__one">' + esc(sm.one_line) + '</div><div class="pr-sum__pos">' + esc(sm.positive) + '</div>' +
          '<div class="pr-sum__more" data-sum-more>... <button type="button" data-act="summore">자세히 보기</button></div></div>' +
          '<div class="pr-sum__kw" hidden>' + (sm.keywords || []).map(function (k) { return '<span>' + esc(k) + '</span>'; }).join('') + '</div>' +
          (sm.sentiment ? '<div class="pr-sum__senti" hidden>' + esc(sm.sentiment) + '</div>' : '');
      } else {
        h += '<div class="pr-sum__body"><div class="pr-sum__one">최신 리뷰를 기다리는 중이에요.</div><div class="pr-sum__wait">최신 리뷰가 더 모이면, AI가 내용을 정리해 알려드릴게요.</div></div>';
      }
      h += '</div></div>';
      // 평점
      var max = 0; [5, 4, 3, 2, 1].forEach(function (k) { if (st.h[k] > max) max = st.h[k]; });
      var top = [5, 4, 3, 2, 1].filter(function (k) { return st.h[k] === max; })[0];
      var cw = Math.ceil(String(Math.max.apply(null, [5, 4, 3, 2, 1].map(function (k) { return st.h[k]; }))).length * 6.75);
      h += '<div class="pr-score"><div class="pr-score__top"><div class="pr-score__avg"><div class="pr-score__num">' + IC.star(isPc ? 36 : 20) + ' ' + st.avg + '</div>' +
        '<div><div class="pr-score__desc">' + (st.n ? Math.round(st.h[top] / st.n * 100) : 0) + '%가 <b>' + SCORE_LABEL[top] + '</b> 라고 평가했습니다.</div><div class="pr-score__cnt">리뷰 ' + num(st.n) + '개</div></div></div>' +
        '<div class="pr-score__div"></div><ul class="pr-hist">';
      [5, 4, 3, 2, 1].forEach(function (k) {
        var pct = st.n ? Math.round(st.h[k] / st.n * 100) : 0;
        h += '<li class="' + (k === top && max ? 'on' : '') + '"><div class="pr-hist__t">' + SCORE_LABEL[k] + '</div><div class="pr-hist__g">' +
          (st.h[k] ? '<i style="width:max(12px,' + pct + '%);background:' + (k === top ? 'var(--star)' : 'var(--g40)') + '"></i>' : '') + '</div><div class="pr-hist__c" style="width:' + cw + 'px">' + st.h[k] + '</div></li>';
      });
      h += '</ul></div></div>';
      // 포토&동영상 (별점 높은 순, 최대 12장)
      var photos = sortReviews(all.filter(function (r) { return r.img.length; }), '30', false).slice(0, 12);
      if (photos.length) {
        h += '<div class="pr-media"><div class="pr-media__head"><span class="pr-media__title">포토&amp;동영상</span><a class="pr-media__all" data-act="allphotos">전체보기 ' + IC.right(isWide() ? 12 : 8) + '</a></div><div class="pr-media__strip">';
        photos.forEach(function (r, i) {
          h += '<a class="pr-media__item" data-photo="' + r.id + '"><img src="' + esc(img(r.img[0])) + '" alt="" loading="lazy">' +
            (i === photos.length - 1 ? '<span class="pr-media__cover" data-act="allphotos">전체보기</span>' : '') + '</a>';
        });
        h += '</div></div>';
      }
      return h;
    }
    function isWide() { return wide(el); }
    function barHtml() {
      var label = SORTS.filter(function (x) { return x[0] === S.sort; })[0][1];
      var h = '<div class="pr-bar"><div class="pr-bar__left"><div class="pr-dd pr-sort' + (S.menu === 'sort' ? ' pr-dd--open' : '') + '"><button type="button" class="pr-dd__btn" data-act="sortmenu">' +
        (S.sort === '80' ? IC.ai(16) : '') + '<div class="pr-dd__label">' + label + '</div>' + IC.down() + '</button>';
      if (S.menu === 'sort') {
        h += '<div class="pr-menu pr-menu--left"><ul class="pr-menu__list">';
        SORTS.forEach(function (x) {
          h += '<li><label class="pr-radio' + (x[0] === S.sort ? ' on' : '') + '"><div class="pr-radio__label">' + (x[0] === '80' ? IC.ai(16) : '') + x[1] + '</div><input type="radio" name="pr-sort" value="' + x[0] + '"' + (x[0] === S.sort ? ' checked' : '') + '></label></li>';
        });
        h += '</ul><hr class="pr-menu__div"><div class="pr-menu__note">리뷰 정렬 기준 ' + IC.info(12) + '</div></div>';
      }
      h += '</div>';
      if (!isPc) h += '<button type="button" class="pr-photofirst' + (S.photoFirst ? ' on' : '') + '" data-act="photofirst">' + IC.toggle() + '포토/동영상 먼저 보기</button>';
      h += '</div><button type="button" class="pr-searchbtn' + (S.searching ? ' on' : '') + '" data-act="search">' + IC.search(15) + ' 검색</button></div>';
      if (S.searching) {
        h += '<form class="pr-form" data-form><div class="pr-sinput"><div class="pr-sinput__box"><input type="text" placeholder="리뷰 키워드 검색" value="' + esc(S.kw) + '"><button type="submit" class="pr-sinput__go">' + IC.search(16) + '</button></div>' +
          '<button type="button" class="pr-sinput__cancel" data-act="searchcancel">취소</button></div></form>';
      }
      h += '<div class="pr-filters"><div class="pr-filters__wrap"><div class="pr-dd' + (S.menu === 'score' ? ' pr-dd--open' : '') + (S.scores.length ? ' pr-dd--sel' : '') + '"><button type="button" class="pr-outline" data-act="scoremenu"><div class="pr-dd__label">' +
        (S.scores.length ? '별점 ' + S.scores.slice().sort().reverse().join(',') + '점' : '별점') + '</div>' + IC.down() + '</button></div></div>';
      if (S.menu === 'score') {
        h += '<div class="pr-menu pr-menu--score" style="left:16px"><div class="pr-menu__head"><div class="pr-menu__title">별점</div></div><ul class="pr-menu__scores">';
        [5, 4, 3, 2, 1].forEach(function (k) {
          h += '<li><label class="pr-chk"><div class="pr-chk__label">' + stars(k, 14) + '<span>' + FILTER_LABEL[k] + '</span></div><input type="checkbox" value="' + k + '"' + (S.scores.indexOf(k) >= 0 ? ' checked' : '') + '></label></li>';
        });
        h += '</ul><div class="pr-menu__foot"><button type="button" class="pr-menu__reset" data-act="scorereset">초기화</button><button type="button" class="pr-menu__apply" data-act="scoreapply">적용</button></div></div>';
      }
      h += '</div>';
      return h;
    }
    function bodyHtml() {
      var rs = list(), total = Math.max(1, Math.ceil(rs.length / PER_PAGE));
      if (S.page > total) S.page = total;
      var pageRs = rs.slice((S.page - 1) * PER_PAGE, S.page * PER_PAGE);
      var h = '<div class="pr-body">';
      if (!pageRs.length) h += '<div class="pr-empty">' + (S.kw ? '검색 결과가 없습니다.' : '등록된 리뷰가 없습니다.') + '</div>';
      pageRs.forEach(function (r) { h += reviewHtml(r, { showPin: S.sort === '80', kw: S.kw }); });
      return h + '</div>' + pagesHtml(S.page, total);
    }
    function render(keepScroll) {
      el.className = 'pr pr--list' + (isWide() ? ' pr--wide' : '');
      el.innerHTML = headerHtml() + '<div data-bar>' + barHtml() + '</div><div data-body>' + bodyHtml() + '</div>';
      fixToggles(el);
    }
    function rerender(part) {
      if (part !== 'body') el.querySelector('[data-bar]').innerHTML = barHtml();
      if (part !== 'bar') { el.querySelector('[data-body]').innerHTML = bodyHtml(); fixToggles(el); }
    }
    var find = function (id) { return all.filter(function (r) { return r.id === id; })[0]; };
    render();
    bindReview(el, find);
    on(el, '[data-photo]', 'click', function (e, t) { if (e.target.closest('[data-act="allphotos"]')) return; openPhoto(find(+t.getAttribute('data-photo')), 0); });
    on(el, '[data-act]', 'click', function (e, t) {
      var a = t.getAttribute('data-act');
      if (a === 'sortmenu') { S.menu = S.menu === 'sort' ? null : 'sort'; rerender('bar'); }
      else if (a === 'scoremenu') { S.menu = S.menu === 'score' ? null : 'score'; rerender('bar'); }
      else if (a === 'photofirst') { S.photoFirst = !S.photoFirst; S.page = 1; rerender(); }
      else if (a === 'search') { S.searching = !S.searching; S.menu = null; rerender('bar'); if (S.searching) el.querySelector('.pr-sinput input').focus(); }
      else if (a === 'searchcancel') { S.searching = false; S.kw = ''; S.page = 1; rerender(); }
      else if (a === 'scorereset') { el.querySelectorAll('.pr-chk input').forEach(function (c) { c.checked = false; }); }
      else if (a === 'scoreapply') {
        S.scores = [].map.call(el.querySelectorAll('.pr-chk input:checked'), function (c) { return +c.value; });
        S.menu = null; S.page = 1; rerender();
      }
      else if (a === 'summore') {
        el.querySelector('[data-sum-more]').remove();
        el.querySelectorAll('.pr-sum__kw, .pr-sum__senti').forEach(function (x) { x.hidden = false; });
      }
      else if (a === 'allphotos') { e.preventDefault(); e.stopPropagation(); S.photoFirst = true; S.sort = '20'; S.page = 1; if (isPc) S.photoFirst = false; rerender(); el.querySelector('[data-bar]').scrollIntoView({ behavior: 'smooth' }); }
      else if (a === 'write') {
        // 크리마와 같은 쓰기 창을 띄운다. 창 파일이 없으면 카페24 기본 글쓰기로
        if (window.PloonieReviewWrite) window.PloonieReviewWrite.open({ product: o.product, sources: prod && prod.sources, device: o.device, userName: o.userName, onSubmit: o.onSubmit, onDone: function () { load(); S.page = 1; render(); } });
        else location.href = o.writeUrl || '/board/product/write.html?board_no=4' + (o.product ? '&product_no=' + o.product : '');
      }
      else if (a === 'policy') { alertPolicy(); }
    });
    el.addEventListener('change', function (e) {
      if (e.target.name === 'pr-sort') { S.sort = e.target.value; S.menu = null; S.page = 1; rerender(); }
    });
    on(el, '[data-page]', 'click', function (e, t) {
      e.preventDefault();
      S.page = +t.getAttribute('data-page'); rerender('body');
      el.querySelector('[data-bar]').scrollIntoView({ block: 'start' });
    });
    el.addEventListener('submit', function (e) {
      e.preventDefault();
      S.kw = el.querySelector('.pr-sinput input').value.trim(); S.page = 1; rerender('body');
    });
    document.addEventListener('click', function (e) {
      if (!e.target.isConnected) return;  // 방금 메뉴를 그리면서 지워진 버튼에서 온 클릭(이걸 바깥 클릭으로 보면 메뉴가 열리자마자 닫힌다)
      if (S.menu && !el.contains(e.target)) { S.menu = null; rerender('bar'); }
      else if (S.menu && el.contains(e.target) && !e.target.closest('.pr-dd') && !e.target.closest('.pr-menu')) { S.menu = null; rerender('bar'); }
    });
  }

  function alertPolicy() {
    var pop = document.createElement('div');
    pop.className = 'pr pr-pop';
    pop.innerHTML = '<div class="pr-pop__box" style="width:min(480px,100vw);height:auto;flex-direction:column;padding:32px 24px"><button class="pr-pop__close" data-x style="color:#14161a">' + IC.close() + '</button>' +
      '<div class="pr-menu__title" style="font-size:16px;line-height:24px;margin-bottom:16px">리뷰 운영방식</div>' +
      '<div style="font-size:14px;line-height:22px;color:#40454d">' + (window.PLOONIE_POLICY || '플루니 리뷰는 실제 구매 고객만 작성할 수 있습니다.') + '</div></div>';
    pop.addEventListener('click', function (e) { if (e.target === pop || e.target.closest('[data-x]')) pop.remove(); });
    document.body.appendChild(pop);
  }

  /* ---------- 사진 가로 목록 ---------- */
  // 사진 리뷰 가로 띠: 최신 사진 리뷰 20장, 3초마다 한 장씩 저절로 넘어가고 끝에서 처음으로 이어진다
  // (크리마 위젯 52·53 설정 posts_per_page 20 · autoscroll_delay 3 · PC 한 줄 5장, 2026-10-20 실측)
  var HS_MAX = 20, HS_DELAY = 3000, HS_ANIM = 500;
  function mountPhotos(el, o) {
    var all = reviewsOf(o.product);
    var rs = sortReviews(all.filter(function (r) { return r.img.length; }), '20', false).slice(0, HS_MAX);
    var isPc = o.device !== 'mobile';
    var find = function (id) { return all.filter(function (r) { return r.id === id; })[0]; };
    el.className = 'pr pr-hs ' + (isPc ? 'pr-hs--pc' : 'pr-hs--m');
    if (!rs.length) { el.innerHTML = ''; return; }
    var head = '<div class="pr-hs__policy"><a class="pr-policy" data-act="policy">' + IC.info(12) + '<span>리뷰 운영방식</span></a></div>';
    var per = isPc ? 5 : 3.125, gap = isPc ? 20 : 8, pad = isPc ? 0 : 16;
    var cw = isPc ? (el.clientWidth - gap * (per - 1)) / per : (el.clientWidth - pad) / per - gap;
    var step = cw + gap, n = rs.length, loop = n > per, pages = Math.ceil(n / 5), cur = 0, timer = null;
    // 이어 붙이기용으로 한 벌 더 그린다(마지막 다음에 첫 장이 바로 보이게)
    var cards = (loop ? rs.concat(rs) : rs).map(function (r) {
      return '<a class="pr-hs__card" style="width:' + cw + 'px;margin-right:' + gap + 'px" data-photo="' + r.id + '"><img src="' + esc(img(r.img[0])) + '" alt="" loading="lazy"></a>';
    }).join('');
    el.innerHTML = head + (isPc ? '<div class="pr-hs__pager"><a data-hs="-1">' + IC.right(12).replace('<svg', '<svg style="transform:rotate(180deg)"') + '</a><span>1/' + pages + '</span><a data-hs="1">' + IC.right(12) + '</a></div>' : '') +
      '<div class="pr-hs__track"><div class="pr-hs__rail">' + cards + '</div></div>';
    var rail = el.querySelector('.pr-hs__rail'), label = el.querySelector('.pr-hs__pager span');
    function go(i, anim) {
      rail.style.transition = anim ? 'transform ' + HS_ANIM + 'ms cubic-bezier(.2,.7,.3,1)' : 'none';
      cur = i;
      rail.style.transform = 'translateX(' + (-cur * step) + 'px)';
      if (label) label.textContent = (Math.floor((cur % n) / 5) + 1) + '/' + pages;
    }
    rail.addEventListener('transitionend', function () { if (cur >= n) go(cur - n, false); });
    function move(d) {
      if (!loop) return;
      if (cur + d < 0) { go(cur + n, false); rail.offsetWidth; }
      go(cur + d, true);
    }
    // 크리마처럼: 화살표·밀기를 한 번 쓰면 자동 넘김은 그만, 사진 위에 마우스가 있으면 잠시 멈춤
    var hover = false;
    function stop() { clearInterval(timer); }
    if (loop) timer = setInterval(function () { if (!document.body.contains(el)) return clearInterval(timer); if (!hover) move(1); }, HS_DELAY + HS_ANIM);
    var track = el.querySelector('.pr-hs__track');
    track.addEventListener('mouseenter', function () { hover = true; });
    track.addEventListener('mouseleave', function () { hover = false; });
    // 화살표는 5장 단위 쪽 이동(지금 쪽의 첫 장 기준, 크리마 실측: 3번째 장에서 다음 → 6번째 장)
    on(el, '[data-hs]', 'click', function (e, t) {
      stop(); if (!loop) return;
      var d = +t.getAttribute('data-hs'), pg = Math.floor((cur % n) / 5), tp = (pg + d + pages) % pages;
      if (d > 0) go(tp === 0 ? n : tp * 5, true);
      else { if (cur < n) { go(cur + n, false); rail.offsetWidth; } go(tp * 5 + (tp * 5 < cur - n ? n : 0), true); }
    });
    // 손가락·마우스로 밀어 넘기기
    var x0 = null, moved = false;
    rail.addEventListener('pointerdown', function (e) { x0 = e.clientX; moved = false; });
    rail.addEventListener('pointerup', function (e) {
      if (x0 == null) return; var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 30) { moved = true; stop(); move(dx < 0 ? 1 : -1); }
    });
    rail.addEventListener('click', function (e) { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    on(el, '[data-photo]', 'click', function (e, t) { openPhoto(find(+t.getAttribute('data-photo')), 0); });
    on(el, '[data-act="policy"]', 'click', alertPolicy);
  }

  /* ---------- 상품 카드 별점·리뷰수 ---------- */
  function scoreText(code) {
    var st = stat(reviewsOf(code));
    return { score: st.avg, count: num(st.n), n: st.n };
  }

  // 메인·목록 상품 카드: 스킨에 이미 박혀 있는 data-crema="score"/"count" 자리를 크리마와 같은 모양으로 채운다
  function applyCards(root) {
    [].forEach.call((root || document).querySelectorAll('[data-crema="score"],[data-crema="count"]'), function (e) {
      var code = e.getAttribute('data-product-code') || e.getAttribute('data-code');
      if (!code || !data().P[code]) return;
      var st = scoreText(code);
      if (e.getAttribute('data-crema') === 'count') { if (e.textContent !== st.count) e.textContent = st.count; }
      else if (e.textContent !== st.score) e.innerHTML = '<div class="crema_product_reviews_score__container" style="display: inline-block; line-height: 1; font-family: inherit;">' + st.score + '</div>';
    });
  }

  window.PloonieReviews = {
    mount: function (el, o) {
      o = o || {};
      if (o.base != null) opts0.base = o.base;
      if (o.type === 'photos') return mountPhotos(el, o);
      if (o.type === 'board' && window.PloonieReviewsBoard) return window.PloonieReviewsBoard.mountBoard(el, o);
      if (o.type === 'best' && window.PloonieReviewsBoard) return window.PloonieReviewsBoard.mountBest(el, o);
      return mountList(el, o);
    },
    scoreText: scoreText,
    applyCards: applyCards,
    _: { isNew: isNew, esc: esc, num: num, stars: stars, img: img, data: data, sortReviews: sortReviews, stat: stat, reviewHtml: reviewHtml, fixToggles: fixToggles, bindReview: bindReview, pagesHtml: pagesHtml, on: on, IC: IC, openPhoto: openPhoto, highlight: highlight, wide: wide, alertPolicy: alertPolicy, reviewsOf: reviewsOf }
  };
})();
