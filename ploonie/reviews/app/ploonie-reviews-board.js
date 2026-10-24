/* 플루니 자체 리뷰 화면 — REVIEW 메뉴(전체 리뷰 게시판 + 베스트 갤러리) (2026-10-20)
 * ploonie-reviews.js 다음에 불러온다. 순서·장수는 크리마 위젯 설정(crema_snapshot/widget_settings.json)과 같다.
 */
(function () {
  'use strict';
  var U = window.PloonieReviews._;
  var isNew = U.isNew, esc = U.esc, num = U.num, stars = U.stars, img = U.img, IC = U.IC, on = U.on;
  var PER_PAGE = 20;
  var SORTS = [['20', '최신순', '‘최신순’ 정렬은  최신 리뷰를 우선으로 정렬합니다.'], ['30', '별점순', '‘별점순’ 정렬은  별점이 높은 리뷰를 우선으로 정렬합니다.']];  // AI 추천순은 뺐다(2026-10-20 사용자 결정)
  var FILTER_LABEL = { 5: '아주 좋아요', 4: '좋아요', 3: '보통이에요', 2: '그냥 그래요', 1: '별로예요' };

  function meta() { return window.PLOONIE_META || { categories: [] }; }
  function prodInfo(code) {
    var p = U.data().P[code] || {}, st = window.PloonieReviews.scoreText(code);
    return { name: p.name || '', image: p.image_medium || p.image || '', url: '/product/detail.html?product_no=' + code, score: st.score, count: st.count };
  }
  function prodHtml(code, cls) {
    var p = prodInfo(code);
    return '<a class="pr-prod ' + (cls || '') + '" href="' + esc(p.url) + '" target="_blank"><div class="pr-prod__left"><img class="pr-prod__img" src="' + esc(p.image) + '" alt="" loading="lazy">' +
      '<div class="pr-prod__content"><div class="pr-prod__name">' + esc(p.name) + '</div><div class="pr-prod__rating"><div class="pr-prod__score">' + IC.star(12) + '<span>' + p.score + '</span></div><span class="pr-prod__count">리뷰 ' + p.count + '</span></div></div></div></a>';
  }
  function meatHtml() {
    return '<div class="pr-dd pr-meat"><button type="button" data-act="meat"><svg class="pr-ic" width="16" height="16" viewBox="0 0 16 16"><circle cx="3" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="13" cy="8" r="1.3"/></svg></button></div>';
  }
  function likeHtml(r) {
    return '' +  // '신고 및 차단'은 뺐다(2026-10-20 사용자 결정)
      '<div class="pr-like"><div class="pr-like__btns"><a data-act="like">' + IC.up() + '<span>도움돼요</span>' + (r.like ? '<b>' + r.like + '</b>' : '') + '</a><a data-act="dislike">' + IC.dn() + '<span>도움안돼요</span></a></div>' +
      '<a class="pr-like__cmt" data-act="cmt"><span>댓글</span><b>' + r.c.length + '</b>' + IC.downS() + '</a></div>' +
      '<div class="pr-cmts" hidden><ul>' + r.c.map(function (c) {
        return '<li class="pr-cmt"><div class="pr-cmt__name">' + esc(c.n) + '</div><div class="pr-cmt__msg">' + esc(c.m) + '</div></li>';
      }).join('') + '</ul></div>';
  }
  function optHtml(r) {
    return r.o ? '<div class="pr-rv__opt"><b>상품 옵션</b><span>' + esc(r.o) + '</span></div>' : '';
  }
  function msgHtml(r, kw) {
    return '<div class="pr-rv__msg cut cut1">' + U.highlight(r.m, kw) + '</div><div class="pr-rv__toggle" hidden><button type="button" data-act="more">리뷰 더보기</button></div>';
  }
  function mediaHtml(r) {
    if (!r.img.length) return '';
    return '<div class="pr-rv__media">' + r.img.map(function (s, i) { return '<a class="pr-rv__img" data-act="photo" data-i="' + i + '"><img src="' + esc(img(s)) + '" alt="" loading="lazy"></a>'; }).join('') + '</div>';
  }
  // 모바일 한 건
  function rowMobile(r, S) {
    var tags = (S.sort === '80' && r.pin ? '<span class="pr-tag">쇼핑몰 추천</span>' : '') + (r.re ? '<span class="pr-tag">재구매</span>' : '') + (isNew(r) ? '<span class="pr-tag">NEW</span>' : '');
    return '<div class="pr-rv" data-id="' + r.id + '">' + prodHtml(r.p, 'pr-rv__prod') +
      (tags ? '<div class="pr-rv__tags">' + tags + '</div>' : '') +
      '<div class="pr-rv__user"><div class="pr-rv__row"><div class="pr-rv__name">' + esc(r.n) + '</div><div class="pr-rv__rc"><div class="pr-rv__date">' + esc(r.d) + '</div>' + (r.own ? meatHtml() : '') + '</div></div>' +
      '<div class="pr-rv__grade">작성자 등급 ' + esc(r.g) + '</div></div>' +
      optHtml(r) + stars(r.s, 14, 'pr-rv__stars') + msgHtml(r, S.kw) + mediaHtml(r) + likeHtml(r) + '</div>';
  }
  // PC 한 건 (왼쪽 리뷰 · 오른쪽 작성자)
  function rowPc(r, S) {
    var tags = (S.sort === '80' && r.pin ? '<span class="pr-tag">쇼핑몰 추천</span>' : '') + (r.re ? '<span class="pr-tag">재구매</span>' : '') + (isNew(r) ? '<span class="pr-tag">NEW</span>' : '');
    return '<div class="pr-rv pr-rvpc" data-id="' + r.id + '"><div class="pr-rvpc__left">' +
      (tags || r.own ? '<div class="pr-rvpc__tags">' + (tags ? '<div class="pr-rv__tags">' + tags + '</div>' : '') + (r.own ? meatHtml() : '') + '</div>' : '') +
      prodHtml(r.p, 'pr-rvpc__prod') + optHtml(r) + stars(r.s, 16, 'pr-rv__stars') + msgHtml(r, S.kw) + mediaHtml(r) + likeHtml(r) +
      '</div><div class="pr-rvpc__right"><div class="pr-rvpc__name">' + esc(r.n) + '</div><div class="pr-rvpc__opts"><div class="pr-rvpc__opt"><span>작성자 등급</span><span>' + esc(r.g) + '</span></div></div>' +
      '<div class="pr-rvpc__date">' + esc(r.d) + '</div></div></div>';
  }

  function mountBoard(el, o) {
    var all = U.data().R;
    var isPc = o.device !== 'mobile';
    var S = { sort: '20', page: 1, scores: [], cat: null, kw: '', searching: false, photoFirst: false, menu: null };
    var cats = meta().categories;
    function list() {
      var rs = all;
      if (S.cat) { var c = cats.filter(function (x) { return x.id === S.cat; })[0]; rs = rs.filter(function (r) { return c.products.indexOf(r.p) >= 0; }); }
      if (S.scores.length) rs = rs.filter(function (r) { return S.scores.indexOf(r.s) >= 0; });
      if (S.kw) { var k = S.kw.toLowerCase(); rs = rs.filter(function (r) { return r.m.toLowerCase().indexOf(k) >= 0; }); }
      return U.sortReviews(rs, S.sort, S.photoFirst);
    }
    function titleHtml() {
      return '<div class="pr-title"><div class="pr-title__head"><div class="pr-title__row"><div class="pr-title__group"><div class="pr-title__text">REVIEW</div>' +
        '<a class="pr-policy" data-act="policy">' + IC.info(12) + '<span>리뷰 운영방식</span></a></div></div></div></div>';
    }
    function sortMenuHtml() {
      var h = '<div class="pr-menu pr-menu--left"><ul class="pr-menu__list">';
      SORTS.forEach(function (x) {
        h += '<li><label class="pr-radio' + (x[0] === S.sort ? ' on' : '') + '"><div class="pr-radio__label">' + (x[0] === '80' ? IC.ai(16) : '') + x[1] + '</div><input type="radio" name="pr-sort" value="' + x[0] + '"' + (x[0] === S.sort ? ' checked' : '') + '></label></li>';
      });
      return h + '</ul><hr class="pr-menu__div"><div class="pr-menu__note">리뷰 정렬 기준 ' + IC.info(12) + '</div></div>';
    }
    function scoreMenuHtml() {
      var h = '<div class="pr-menu pr-menu--score" style="left:' + (isPc ? 0 : 16) + 'px"><div class="pr-menu__head"><div class="pr-menu__title">별점</div></div><ul class="pr-menu__scores">';
      [5, 4, 3, 2, 1].forEach(function (k) {
        h += '<li><label class="pr-chk"><div class="pr-chk__label">' + stars(k, 14) + '<span>' + FILTER_LABEL[k] + '</span></div><input type="checkbox" value="' + k + '"' + (S.scores.indexOf(k) >= 0 ? ' checked' : '') + '></label></li>';
      });
      return h + '</ul><div class="pr-menu__foot"><button type="button" class="pr-menu__reset" data-act="scorereset">초기화</button><button type="button" class="pr-menu__apply" data-act="scoreapply">적용</button></div></div>';
    }
    function catMenuHtml() {
      var h = '<div class="pr-menu pr-menu--cat" style="left:' + (isPc ? 0 : 16) + 'px"><div class="pr-menu__head pr-menu__head--reset"><div class="pr-menu__title">카테고리</div><button type="button" class="pr-menu__resetlink" data-act="catreset">초기화</button></div><ul class="pr-menu__list pr-menu__list--cat">';
      [{ id: null, name: '전체 카테고리' }].concat(cats).forEach(function (c) {
        h += '<li><label class="pr-radio' + (c.id === S.cat ? ' on' : '') + '"><div class="pr-radio__label">' + esc(c.name) + '</div><input type="radio" name="pr-cat" value="' + (c.id == null ? '' : c.id) + '"' + (c.id === S.cat ? ' checked' : '') + '></label></li>';
      });
      return h + '</ul></div>';
    }
    function barHtml() {
      var h = '';
      if (isPc) {
        h += '<div class="pr-pcbar"><div class="pr-pcbar__left"><ul class="pr-pcbar__orders">';
        SORTS.forEach(function (x) {
          h += '<li class="pr-pcbar__order' + (x[0] === S.sort ? ' on' : '') + '"><button type="button" data-sort="' + x[0] + '">' + (x[0] === '80' ? IC.ai(16) : '') + '<span>' + x[1] + '</span>' +
            '<div class="pr-pcbar__tip"><div class="pr-pcbar__tip-t">리뷰 정렬 기준</div><div class="pr-pcbar__tip-m">' + x[2] + '</div></div></button></li>';
        });
        h += '</ul><button type="button" class="pr-photofirst pr-photofirst--pc' + (S.photoFirst ? ' on' : '') + '" data-act="photofirst">' + IC.toggle() + '포토/동영상 먼저 보기</button></div>' +
          '<form class="pr-pcsearch" data-form><div class="pr-pcsearch__box"><button type="submit" class="pr-pcsearch__icon">' + IC.search(16) + '</button><input type="text" placeholder="리뷰 키워드 검색" value="' + esc(S.kw) + '"></div></form></div>';
      } else {
        var label = SORTS.filter(function (x) { return x[0] === S.sort; })[0][1];
        h += '<div class="pr-bar"><div class="pr-bar__left"><div class="pr-dd pr-sort' + (S.menu === 'sort' ? ' pr-dd--open' : '') + '"><button type="button" class="pr-dd__btn" data-act="sortmenu">' +
          (S.sort === '80' ? IC.ai(16) : '') + '<div class="pr-dd__label">' + label + '</div>' + IC.down() + '</button>' + (S.menu === 'sort' ? sortMenuHtml() : '') + '</div>' +
          '<button type="button" class="pr-photofirst' + (S.photoFirst ? ' on' : '') + '" data-act="photofirst">' + IC.toggle() + '포토/동영상 먼저 보기</button></div>' +
          '<button type="button" class="pr-searchbtn' + (S.searching ? ' on' : '') + '" data-act="search">' + IC.search(15) + ' 검색</button></div>';
        if (S.searching) {
          h += '<form class="pr-form" data-form><div class="pr-sinput"><div class="pr-sinput__box"><input type="text" placeholder="리뷰 키워드 검색" value="' + esc(S.kw) + '"><button type="submit" class="pr-sinput__go">' + IC.search(16) + '</button></div>' +
            '<button type="button" class="pr-sinput__cancel" data-act="searchcancel">취소</button></div></form>';
        }
      }
      var catName = S.cat ? cats.filter(function (x) { return x.id === S.cat; })[0].name : '전체 카테고리';
      h += '<div class="pr-filters"><div class="pr-filters__wrap">' +
        '<div class="pr-dd pr-fdd' + (S.menu === 'cat' ? ' pr-dd--open' : '') + (S.cat ? ' pr-dd--sel' : '') + '"><button type="button" class="pr-outline" data-act="catmenu"><div class="pr-dd__label">' + esc(catName) + '</div>' + IC.down() + '</button></div>' +
        '<div class="pr-dd pr-fdd' + (S.menu === 'score' ? ' pr-dd--open' : '') + (S.scores.length ? ' pr-dd--sel' : '') + '"><button type="button" class="pr-outline" data-act="scoremenu"><div class="pr-dd__label">' +
        (S.scores.length ? '별점 ' + S.scores.slice().sort().reverse().join(',') + '점' : '별점') + '</div>' + IC.down() + '</button></div></div>' +
        (S.menu === 'cat' ? catMenuHtml() : '') + (S.menu === 'score' ? scoreMenuHtml() : '') + '</div>';
      return h;
    }
    function bodyHtml() {
      var rs = list(), total = Math.max(1, Math.ceil(rs.length / PER_PAGE));
      if (S.page > total) S.page = total;
      var pageRs = rs.slice((S.page - 1) * PER_PAGE, S.page * PER_PAGE);
      var h = '<div class="pr-body">';
      if (!pageRs.length) h += '<div class="pr-empty">' + (S.kw ? '검색 결과가 없습니다.' : '등록된 리뷰가 없습니다.') + '</div>';
      pageRs.forEach(function (r) { h += isPc ? rowPc(r, S) : rowMobile(r, S); });
      return h + '</div>' + U.pagesHtml(S.page, total);
    }
    function rerender(part) {
      if (part !== 'body') el.querySelector('[data-bar]').innerHTML = barHtml();
      if (part !== 'bar') { el.querySelector('[data-body]').innerHTML = bodyHtml(); U.fixToggles(el); }
    }
    el.className = 'pr pr--board ' + (isPc ? 'pr--wide pr--boardpc' : 'pr--boardm');
    el.innerHTML = titleHtml() + '<div data-bar>' + barHtml() + '</div><div data-body>' + bodyHtml() + '</div>';
    U.fixToggles(el);
    var find = function (id) { return all.filter(function (r) { return r.id === id; })[0]; };
    U.bindReview(el, find);
    on(el, '[data-sort]', 'click', function (e, t) { S.sort = t.getAttribute('data-sort'); S.page = 1; rerender(); });
    on(el, '[data-act]', 'click', function (e, t) {
      var a = t.getAttribute('data-act');
      if (a === 'sortmenu') { S.menu = S.menu === 'sort' ? null : 'sort'; rerender('bar'); }
      else if (a === 'scoremenu') { S.menu = S.menu === 'score' ? null : 'score'; rerender('bar'); }
      else if (a === 'catmenu') { S.menu = S.menu === 'cat' ? null : 'cat'; rerender('bar'); }
      else if (a === 'catreset') { S.cat = null; S.menu = null; S.page = 1; rerender(); }
      else if (a === 'photofirst') { S.photoFirst = !S.photoFirst; S.page = 1; rerender(); }
      else if (a === 'search') { S.searching = !S.searching; S.menu = null; rerender('bar'); if (S.searching) el.querySelector('.pr-sinput input').focus(); }
      else if (a === 'searchcancel') { S.searching = false; S.kw = ''; S.page = 1; rerender(); }
      else if (a === 'scorereset') { el.querySelectorAll('.pr-chk input').forEach(function (c) { c.checked = false; }); }
      else if (a === 'scoreapply') { S.scores = [].map.call(el.querySelectorAll('.pr-chk input:checked'), function (c) { return +c.value; }); S.menu = null; S.page = 1; rerender(); }
      else if (a === 'policy') { U.alertPolicy(); }
      else if (a === 'meat') {
        var dd = t.closest('.pr-meat'), open = dd.querySelector('.pr-menu');
        if (open) { open.remove(); return; }
        dd.insertAdjacentHTML('beforeend', '<div class="pr-menu pr-menu--meat"><ul class="pr-menu__list"><li><button type="button" data-act="edit">리뷰 수정</button></li><li><button type="button" data-act="edit">리뷰 삭제</button></li></ul></div>');
      }
      else if (a === 'edit') { t.closest('.pr-menu').remove(); alert('리뷰 수정·삭제는 고객센터로 요청해 주세요.'); }
    });
    el.addEventListener('change', function (e) {
      if (e.target.name === 'pr-sort') { S.sort = e.target.value; S.menu = null; S.page = 1; rerender(); }
      if (e.target.name === 'pr-cat') { S.cat = e.target.value ? +e.target.value : null; S.menu = null; S.page = 1; rerender(); }
    });
    on(el, '[data-page]', 'click', function (e, t) { e.preventDefault(); S.page = +t.getAttribute('data-page'); rerender('body'); el.querySelector('[data-bar]').scrollIntoView({ block: 'start' }); });
    el.addEventListener('submit', function (e) { e.preventDefault(); S.kw = el.querySelector('[data-form] input').value.trim(); S.page = 1; rerender('body'); });
    document.addEventListener('click', function (e) {
      if (!e.target.isConnected) return;  // 방금 메뉴를 그리면서 지워진 버튼에서 온 클릭(이걸 바깥 클릭으로 보면 메뉴가 열리자마자 닫힌다)
      if (S.menu && (!el.contains(e.target) || (!e.target.closest('.pr-dd') && !e.target.closest('.pr-menu')))) { S.menu = null; rerender('bar'); }
    });
  }

  // 베스트 갤러리: 사진 리뷰 최신 3건 (크리마 위젯 54·55 설정과 같음)
  function mountBest(el, o) {
    var all = U.data().R;
    var isPc = o.device !== 'mobile';
    var rs = U.sortReviews(all.filter(function (r) { return r.img.length; }), '20', false).slice(0, 3);
    el.className = 'pr pr--board pr-bestw ' + (isPc ? 'pr--wide' : '');
    var h = '<div class="pr-hs__policy"><a class="pr-policy" data-act="policy">' + IC.info(12) + '<span>리뷰 운영방식</span></a></div><div class="pr-best"><div class="pr-best__grid">';
    rs.forEach(function (r) {
      var p = prodInfo(r.p);
      h += '<div class="pr-best__card" data-photo="' + r.id + '"><div class="pr-best__photo"><img src="' + esc(img(r.img[0])) + '" alt="" loading="lazy">' + (r.img.length > 1 ? '<span class="pr-best__multi">' + IC.media() + '</span>' : '') + '</div>' +
        '<div class="pr-best__prod"><img class="pr-best__pimg" src="' + esc(p.image) + '" alt=""><div class="pr-best__pinfo"><div class="pr-best__pname">' + esc(p.name) + '</div>' +
        '<div class="pr-best__pscore">' + IC.star(12) + '<b>' + p.score + '</b><em>리뷰 ' + p.count + '</em></div></div></div>' +
        '<div class="pr-best__info"><div class="pr-best__msg">' + esc(r.m) + '</div><div class="pr-best__meta">' + stars(r.s, isPc ? 14 : 12, '') + '<div class="pr-best__date">' + esc(r.d) + '</div><div class="pr-best__name">' + esc(r.n) + '</div></div></div></div>';
    });
    el.innerHTML = h + '</div></div>';
    on(el, '[data-photo]', 'click', function (e, t) { var r = all.filter(function (x) { return x.id === +t.getAttribute('data-photo'); })[0]; U.openPhoto(r, 0); });
    on(el, '[data-act="policy"]', 'click', U.alertPolicy);
  }

  window.PloonieReviewsBoard = { mountBoard: mountBoard, mountBest: mountBest };
})();
