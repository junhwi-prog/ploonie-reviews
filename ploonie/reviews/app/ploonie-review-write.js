/* 플루니 자체 리뷰 쓰기 창 (2026-10-20) — 크리마 쓰기 창과 같은 칸·순서, 적립금 문구만 뺐다.
 * PloonieReviewWrite.open({ product, sources, device: 'pc'|'mobile', userName, onSubmit, onDone })
 *   onSubmit({ product, sources, score, message, files, userName }) → Promise.
 *   안 주면 ploonie-review-submit.js(카페24 리뷰 게시판 4번 저장)를 쓰고, 그것도 없으면(시안) 저장 없이 완료 안내만.
 *   onDone() 은 저장 뒤 목록을 다시 그리라고 부른다.
 */
(function () {
  'use strict';
  var LABEL = { 5: '아주 좋아요', 4: '맘에 들어요', 3: '보통이에요', 2: '그냥 그래요', 1: '별로예요' };
  var MAX = 2000;   // 크리마 textarea maxlength
  var MAX_FILES = 5; // 카페24 게시판 첨부 칸 수
  var ACCEPT = 'image/*'; // 동영상은 카페24 첨부 용량·화면 표시를 실제로 확인한 뒤 연다(지금 플루니 동영상 리뷰 0건)
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function star(on) {
    return '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 .8l1.6 3.4 3.7.4-2.8 2.5.8 3.7L6 8.9 2.7 10.8l.8-3.7L.7 4.6l3.7-.4z" fill="' + (on ? '#10960b' : 'none') + '" stroke="#10960b" stroke-width="' + (on ? 0 : .9) + '"/></svg>';
  }
  function stars(n) { var h = ''; for (var i = 1; i <= 5; i++) h += star(i <= n); return '<span class="prw__stars">' + h + '</span>'; }
  var X = '<svg width="18" height="17" viewBox="0 0 18 17"><path d="M2 1.5l14 14M16 1.5l-14 14" stroke="#333" stroke-width="2.4"/></svg>';
  var PLUS = '<svg width="21" height="21" viewBox="0 0 21 21"><path d="M10.5 1v19M1 10.5h19" stroke="#c4c4c4" stroke-width="1.2"/></svg>';
  var ARROW = '<svg class="prw__arrow" width="12" height="6" viewBox="0 0 12 6"><path d="M1 .5l5 5 5-5" fill="none" stroke="#999" stroke-width="1"/></svg>';

  function open(o) {
    o = o || {};
    var P = (window.PLOONIE_PRODUCTS || {})[o.product] || {};
    var isM = o.device === 'mobile';
    var score = 5, files = [], urls = [];
    var dim = document.createElement('div'); dim.className = 'prw-dim';
    var el = document.createElement('div'); el.className = 'prw' + (isM ? ' prw--m' : '');
    el.innerHTML = '<div class="prw__front">' +
      '<div class="prw__head"><img class="prw__pimg" src="' + esc(P.image_medium || P.image || '') + '" alt=""><div class="prw__msg"><div class="prw__pname">' + esc(P.name || '') + '</div></div>' +
      '<button type="button" class="prw__close" data-a="close" aria-label="닫기">' + X + '</button></div>' +
      '<div class="prw__body">' +
      (o.userName ? '<div class="prw__greet"><b>' + esc(o.userName) + ' 고객님</b>, 구매 상품은 어떠셨나요?</div>' : '') +
      '<div class="prw__sec"><div class="prw__sh">리뷰 작성란</div><div class="prw__sb"><div class="prw__ta"><textarea maxlength="' + MAX + '" placeholder="리뷰를 남겨주세요."></textarea><div class="prw__count">0</div></div></div></div>' +
      '<div class="prw__sec"><div class="prw__sh">포토/동영상 첨부</div><div class="prw__sb"><div class="prw__mdesc">상품과 상관없는 사진 및 동영상을 첨부한 리뷰는 통보없이 삭제될 수 있습니다.</div><div class="prw__media"></div></div></div>' +
      '<div class="prw__sec"><div class="prw__sh">만족도</div><div class="prw__sb"><div class="prw__sel" data-a="sel"><div class="prw__selbtn"></div>' + ARROW + '</div></div></div>' +
      // 자동등록방지: 카페24 가 비회원(주문조회 손님)에게만 요구할 때만 보인다
      '<div class="prw__sec prw__cap" hidden><div class="prw__sh">자동등록방지</div><div class="prw__sb"><img class="prw__capimg" alt="자동등록방지 글자"><div class="prw__ta"><input type="text" class="prw__capin" autocomplete="off" placeholder="보이는 글자를 입력해 주세요"></div></div></div>' +
      '</div>' +
      '<div class="prw__foot"><button type="button" class="prw__submit" data-a="submit">리뷰 작성하기</button></div>' +
      '<div class="prw__fade">리뷰 작성이 완료되었습니다.</div></div>';
    document.body.appendChild(dim); document.body.appendChild(el);
    var ta = el.querySelector('textarea'), count = el.querySelector('.prw__count'), sel = el.querySelector('.prw__sel');
    function grow() { ta.style.height = 'auto'; ta.style.height = Math.max(72, ta.scrollHeight) + 'px'; count.textContent = ta.value.length; }
    function drawSel() { sel.querySelector('.prw__selbtn').innerHTML = '<span class="prw__seltext">' + LABEL[score] + '</span>' + stars(score); }
    function drawMedia() {
      urls.forEach(function (u) { URL.revokeObjectURL(u); }); urls = [];
      var h = files.map(function (f, i) {
        var u = URL.createObjectURL(f); urls.push(u);
        return '<div class="prw__mitem"><div class="prw__mbox">' + (/^video/.test(f.type) ? '<video src="' + u + '" muted></video>' : '<img src="' + u + '" alt="">') + '</div><button type="button" class="prw__mdel" data-del="' + i + '">×</button></div>';
      }).join('');
      // 크리마처럼 '+' 칸 하나(다 채우면 숨김)
      if (files.length < MAX_FILES) h += '<div class="prw__mitem"><label class="prw__mbox">' + PLUS + '<input type="file" accept="' + ACCEPT + '" multiple></label></div>';
      el.querySelector('.prw__media').innerHTML = h;
    }
    function close() {
      urls.forEach(function (u) { URL.revokeObjectURL(u); }); el.remove(); dim.remove(); document.removeEventListener('keydown', onKey);
      if (window.PloonieReviewSubmit) window.PloonieReviewSubmit.cancel();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    drawSel(); drawMedia(); grow();
    ta.addEventListener('input', grow);
    document.addEventListener('keydown', onKey);
    // 바깥을 눌러도 닫지 않는다(쓰던 글이 날아가지 않게, 크리마도 X 로만 닫힘)
    el.addEventListener('change', function (e) {
      if (e.target.type !== 'file') return;
      var add = [].slice.call(e.target.files).filter(function (f) { return /^image\//.test(f.type); });
      if (files.length + add.length > MAX_FILES) { alert('사진은 ' + MAX_FILES + '장까지 첨부할 수 있습니다.'); add = add.slice(0, MAX_FILES - files.length); }
      files = files.concat(add); drawMedia();
    });
    el.addEventListener('click', function (e) {
      var t = e.target.closest('[data-a],[data-del],[data-score]');
      if (!t) { var lst = el.querySelector('.prw__list'); if (lst) lst.remove(); return; }
      if (t.hasAttribute('data-del')) { files.splice(+t.getAttribute('data-del'), 1); drawMedia(); return; }
      if (t.hasAttribute('data-score')) { score = +t.getAttribute('data-score'); drawSel(); el.querySelector('.prw__list').remove(); e.stopPropagation(); return; }
      var a = t.getAttribute('data-a');
      if (a === 'close') close();
      else if (a === 'sel') {
        var cur = sel.querySelector('.prw__list');
        if (cur) { cur.remove(); return; }
        var h = '<ul class="prw__list">';
        [5, 4, 3, 2, 1].forEach(function (k) { h += '<li data-score="' + k + '" class="' + (k === score ? 'on' : '') + '"><span class="prw__seltext">' + LABEL[k] + '</span>' + stars(k) + '</li>'; });
        sel.insertAdjacentHTML('beforeend', h + '</ul>');
      }
      else if (a === 'submit') {
        var msg = ta.value.trim();
        if (!msg) { alert('리뷰 메시지를 입력해주세요.'); ta.focus(); return; }
        var capSec = el.querySelector('.prw__cap'), capIn = el.querySelector('.prw__capin');
        var captcha = capSec.hidden ? '' : capIn.value.trim();
        if (!capSec.hidden && !captcha) { alert('자동등록방지 글자를 입력해 주세요.'); capIn.focus(); return; }
        t.disabled = true; t.textContent = '등록 중...';
        var S = window.PloonieReviewSubmit;
        var rv = { product: o.product, sources: o.sources, score: score, message: msg, files: files, userName: o.userName, captcha: captcha };
        var send = o.onSubmit || (S && S.submit);
        var done = send ? send(rv) : Promise.resolve();
        Promise.resolve(done).then(function () {
          el.querySelector('.prw__fade').classList.add('on');
          setTimeout(function () { close(); if (o.onDone) o.onDone(); }, 1500);
        }, function (err) {
          t.disabled = false; t.textContent = '리뷰 작성하기';
          var code = err && err.code;
          if (code === 'captcha') {
            // 비회원 주문조회 손님: 카페24 자동등록방지 그림을 그대로 보여주고 글자를 받아 같은 창으로 다시 보낸다
            el.querySelector('.prw__capimg').src = err.image; capSec.hidden = false; capIn.value = '';
            capSec.scrollIntoView({ block: 'nearest' }); capIn.focus();
            return;
          }
          if (err && err.fallback && S && !o.onSubmit) {
            // 안전장치: 어떤 이유로든 우리 저장이 안 되면 글은 버리지 않고 카페24 원래 쓰기 화면으로 옮겨 간다
            alert('리뷰 저장이 원활하지 않아 리뷰 쓰기 화면으로 이동합니다. 작성하신 글과 별점은 그대로 옮겨 드려요.' + (files.length ? ' 사진은 다시 첨부해 주세요.' : ''));
            S.fallback(rv);
            return;
          }
          alert((err && err.message) || '리뷰 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.');
          // 로그인이 필요하면 카페24 로그인(비회원 주문조회 포함)으로 — 크리마도 로그인 화면으로 보냈다
          if (code === 'login' && S) location.href = S.loginUrl();
        });
      }
    });
    setTimeout(function () { ta.focus(); }, 50);
    return { close: close };
  }
  window.PloonieReviewWrite = { open: open };
})();
