/* 플루니 리뷰 쓰기 → 카페24 상품후기 게시판(4번) 저장 (2026-10-20)
 * API 토큰 없이, 몰과 같은 주소(ploonie.shop)에서 카페24 원래 쓰기 페이지를 숨긴 iframe 으로 열어
 * 그 폼에 글·별점·사진을 옮겨 담고 카페24 자체 등록 함수(BOARD_WRITE.form_submit)로 보낸다.
 * 로그인·구매 확인·첨부 업로드·검사는 전부 카페24가 한다.
 *
 * 10/20 실측(로그인한 회원 화면, 제출 안 함):
 *   - 비로그인이면 /member/login.html?noMemberOrder&returnUrl=… 로 넘어간다(회원 또는 비회원 주문조회한 손님만 작성)
 *   - 폼 #boardWriteForm(action /exec/front/Board/write/4): product_no·order_id·cate_no(숨김), subject(제목, 필수),
 *     point 라디오(5~1, 기본 5), content(Froala 편집기, 필수), attach_file[] 5칸, password, secure(비밀글 F 기본)
 *   - 상품은 '주문상품선택'만 가능(상품정보선택 숨김) → 주문 목록(/order/search_board_list.html)의
 *     OrderBoard.selProduct(product_no, 이미지, 이름, 가격, 세금, 분류명, 분류번호, 주문번호) 값을 product_no·order_id·cate_no 에 넣는다
 *   - 성공하면 move_write_after(상품 상세)로 넘어간다
 * 카페24 API 로 읽은 게시판 설정(10/20): 회원·비회원 모두 구매자만, 배송완료 후 작성, 첨부 10MB,
 *   자동등록방지(글·댓글)는 비회원에게만 보인다 → 비회원 주문조회 손님은 글자 칸이 뜰 수 있다.
 *
 * PloonieReviewSubmit.submit({ product, sources, score, message, files, userName, captcha }) → Promise
 *   실패 Error.code: 'login'(로그인 화면으로) · 'no_order'(배송완료된 구매 없음) · 'not_shipped'
 *     · 'captcha'(e.image 를 보여주고 글자를 받아 다시 submit) · 그 밖은 e.fallback=true
 *   e.fallback 이면 fallback(rv) 로 카페24 쓰기 페이지로 넘긴다(본문·별점 미리 채움). 실패는 localStorage 'pr-fail' + console 에만 남긴다(외부 전송 없음)
 */
(function () {
  'use strict';
  var CFG = {
    writeUrl: '/board/product/write.html',
    orderListUrl: '/order/search_board_list.html',
    loginUrl: '/member/login.html',
    boardNo: 4,
    maxFiles: 5,          // 카페24 첨부 칸 수
    loadTimeout: 20000,   // 쓰기 화면 열기·주문 목록 읽기
    sendTimeout: 20000,   // 등록 응답 (사진 한 장마다 +5초)
    perFile: 5000,
    mineKey: 'pr-mine',   // 방금 쓴 리뷰(본인 화면에만, 수집 전까지)
    mineHours: 3,
    draftKey: 'pr-draft', // 카페24 쓰기 페이지로 넘길 때 옮겨 갈 글
    failKey: 'pr-fail'    // 실패 기록(최근 20건)
  };
  var held = null;        // 자동등록방지 글자를 받는 동안 열어 둔 숨긴 창 { frame, order, sink }

  var MSG = {
    login: '로그인 후 리뷰를 작성할 수 있습니다.',
    no_order: '구매하신 상품의 배송이 완료된 뒤 리뷰를 작성할 수 있습니다.',
    captcha: '보이는 글자를 입력해 주세요.'
  };
  function err(code, msg, extra) {
    var e = new Error(msg); e.code = code;
    e.fallback = ['login', 'no_order', 'not_shipped', 'captcha'].indexOf(code) < 0;
    for (var k in extra || {}) e[k] = extra[k];
    return e;
  }
  function store(key, v) { try { if (v === undefined) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
  function load(key, def) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function logFail(e, rv) {
    var row = { t: new Date().toISOString(), code: e.code || 'error', msg: String(e.message || e).slice(0, 200), product: rv && rv.product, page: location.pathname, files: rv && rv.files ? rv.files.length : 0 };
    try { console.warn('[ploonie-review] 저장 실패', row); } catch (x) {}
    var a = load(CFG.failKey, []); a.unshift(row); store(CFG.failKey, a.slice(0, 20));
  }

  // selProduct('16','//img…','이름',…) 인자 나누기 — 따옴표 안의 쉼표는 그대로
  function splitArgs(s) {
    var out = [], cur = '', q = null;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (q) { if (ch === '\\' && i + 1 < s.length) { cur += s[++i]; continue; } if (ch === q) { q = null; continue; } cur += ch; }
      else if (ch === '"' || ch === "'") q = ch;
      else if (ch === ',') { out.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    out.push(cur.trim());
    return out;
  }
  function parseOrders(html) {
    var out = [], src = html.replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'").replace(/&amp;/g, '&'), i = 0;
    while ((i = src.indexOf('selProduct(', i)) >= 0) {
      // 상품 이름에 괄호가 들어 있어도 따옴표 밖의 ')' 에서 끊는다
      var j = i + 11, q = null;
      for (; j < src.length; j++) {
        var ch = src[j];
        if (q) { if (ch === '\\') j++; else if (ch === q) q = null; }
        else if (ch === '"' || ch === "'") q = ch;
        else if (ch === ')') break;
      }
      var a = splitArgs(src.slice(i + 11, j));
      if (a.length >= 8 && /^\d+$/.test(a[0])) out.push({ product: a[0], cateNo: a[6], orderId: a[7] });
      i = j;
    }
    // 주문번호 모양(YYYYMMDD-0000000)은 있는데 하나도 못 읽었으면 화면이 바뀐 것 → 구매 없음으로 단정하지 않는다
    out.unreadable = !out.length && /\b20\d{6}-\d{7}\b/.test(src);
    return out;
  }
  function withTimeout(p, ms, code, msg) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(err(code, msg)); }, ms);
      p.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
  }
  // 주문 목록은 '몇 개씩 보기' 가 있어 가장 큰 값으로 한 번 더 받는다
  function fetchOrders() {
    return fetch(CFG.orderListUrl, { credentials: 'include' }).then(function (r) { return r.text(); }).then(function (h) {
      var list = parseOrders(h);
      var d = new DOMParser().parseFromString(h, 'text/html'), sel = d.querySelector('select[name]');
      if (!sel) return list;
      var max = Math.max.apply(null, [].map.call(sel.options, function (o) { return +o.value || 0; }));
      if (!max) return list;
      return fetch(CFG.orderListUrl + '?' + encodeURIComponent(sel.name) + '=' + max, { credentials: 'include' })
        .then(function (r) { return r.text(); }).then(function (h2) { var l2 = parseOrders(h2); return l2.length > list.length ? l2 : list; }, function () { return list; });
    });
  }
  // 이 상품을 산 주문 → 없으면 같은 리뷰 묶음 상품을 산 주문
  function pickOrder(orders, product, sources) {
    var hit = orders.filter(function (o) { return o.product === String(product); })[0];
    if (!hit && sources) hit = orders.filter(function (o) { return sources.indexOf(o.product) >= 0; })[0];
    return hit;
  }

  // 10/20 실측: 구매 조건이 켜진 게시판은 '주문상품선택'(order/search_board_list) 버튼이 보이고 '상품정보선택'은 .displaynone 안에 숨는다
  function needsOrder(d) {
    var a = [].slice.call(d.querySelectorAll('[onclick*="order/search_board_list"]'));
    return a.some(function (x) { return !x.closest('.displaynone'); });
  }

  function loadFrame(url) {
    return new Promise(function (resolve, reject) {
      var f = document.createElement('iframe');
      f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
      f.style.cssText = 'position:fixed;left:-9999px;top:0;width:1000px;height:800px;opacity:0;pointer-events:none;border:0';
      var t = setTimeout(function () { f.remove(); reject(err('timeout', '쓰기 화면을 열지 못했습니다.')); }, CFG.loadTimeout);
      f.onload = function () { clearTimeout(t); f.onload = null; resolve(f); };
      f.src = url;
      document.body.appendChild(f);
    });
  }
  function hookDialogs(w, sink) {
    // 숨긴 창에서 뜨는 안내는 모아서 우리 창에 보여준다(임시저장 불러오기 같은 확인 창은 '아니오')
    try { w.alert = function (m) { sink.push(String(m)); }; w.confirm = function (m) { sink.push(String(m)); return false; }; } catch (e) {}
  }
  // 자동등록방지(비회원에게만): 글자 입력칸 + 그림
  function findCaptcha(d) {
    var input = d.querySelector('#boardWriteForm input[name*="captcha" i], #boardWriteForm input[id*="captcha" i], #boardWriteForm input[name*="spam" i]');
    if (!input) return null;
    var img = d.querySelector('#boardWriteForm img[src*="aptcha"], #boardWriteForm img[id*="aptcha" i], #boardWriteForm img[class*="aptcha" i]');
    return { input: input, img: img };
  }
  function captchaImage(img) {
    return new Promise(function (resolve) {
      if (!img) return resolve(null);
      function draw() {
        try {
          var c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
          c.getContext('2d').drawImage(img, 0, 0); resolve(c.toDataURL('image/png'));
        } catch (e) { resolve(null); }
      }
      if (img.complete && img.naturalWidth) draw();
      else { img.onload = draw; img.onerror = function () { resolve(null); }; setTimeout(function () { resolve(null); }, 5000); }
    });
  }

  function fill(w, d, order, rv) {
    var f = d.getElementById('boardWriteForm');
    if (!f) throw err('form', '쓰기 화면을 읽지 못했습니다.');
    function set(name, v) { var el = f.querySelector('[name="' + name + '"]'); if (el) el.value = v; }
    set('product_no', order.product);
    if (order.orderId) set('order_id', order.orderId);
    if (order.cateNo) set('cate_no', order.cateNo);
    fillText(w, f, rv.message, rv.score);
    var ins = f.querySelectorAll('input[type="file"][name="attach_file[]"]');
    (rv.files || []).slice(0, ins.length).forEach(function (file, i) {
      var dt = new w.DataTransfer(); dt.items.add(new w.File([file], file.name, { type: file.type }));
      ins[i].files = dt.files;
    });
  }
  // 제목·별점·본문 (숨긴 창 저장과 카페24 쓰기 페이지 미리 채우기가 같이 쓴다)
  function fillText(w, f, message, score) {
    // 크리마 리뷰엔 제목이 없다 → 본문 첫 줄 앞부분을 제목으로
    var subj = f.querySelector('[name="subject"]');
    if (subj) {
      if (subj.tagName === 'SELECT') { if (subj.options.length) subj.selectedIndex = 0; }
      else subj.value = message.split('\n')[0].slice(0, 40);
    }
    var pt = f.querySelector('input[name="point"][value="' + score + '"]');
    if (pt) pt.checked = true;
    var html = message.split('\n').map(function (l) { return '<p>' + (l.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }) || '<br>') + '</p>'; }).join('');
    var ta = f.querySelector('textarea[name="content"]');
    if (ta) ta.value = html;
    var FE = w.FroalaEditor;
    if (FE && FE.INSTANCES && FE.INSTANCES[0]) { FE.INSTANCES[0].html.set(html); return true; }
    return false;
  }

  function prepare(rv) {
    var url = CFG.writeUrl + '?board_no=' + CFG.boardNo + '&product_no=' + encodeURIComponent(rv.product);
    var sink = [];
    return loadFrame(url).then(function (f) {
      var w = f.contentWindow, path = '';
      try { path = w.location.pathname; } catch (e) { f.remove(); throw err('form', '쓰기 화면을 읽지 못했습니다.'); }
      if (/\/member\/login/.test(path)) { f.remove(); throw err('login', MSG.login); }
      if (path.indexOf(CFG.writeUrl) !== 0) { f.remove(); throw err('form', '쓰기 화면이 아닌 곳으로 이동했습니다(' + path + ').'); }
      hookDialogs(w, sink);
      // 구매 조건이 꺼진 게시판(쓰기 화면에 '주문상품선택' 이 안 보임)은 주문 없이 product_no 만으로 쓴다
      if (!needsOrder(w.document)) {
        var fm = w.document.getElementById('boardWriteForm');
        var pv = fm && fm.querySelector('[name="product_no"]'), cv = fm && fm.querySelector('[name="cate_no"]');
        return { frame: f, order: { product: (pv && pv.value) || String(rv.product), orderId: '', cateNo: (cv && cv.value) || '' }, sink: sink };
      }
      return withTimeout(fetchOrders(), CFG.loadTimeout, 'timeout', '주문 목록을 읽지 못했습니다.').then(function (orders) {
        if (orders.unreadable) { f.remove(); throw err('parse', '주문 목록 화면을 읽지 못했습니다.'); }
        var order = pickOrder(orders, rv.product, rv.sources);
        if (!order) { f.remove(); throw err('no_order', MSG.no_order); }
        return { frame: f, order: order, sink: sink };
      }, function (e) { f.remove(); throw e; });
    });
  }

  function send(h, rv) {
    var f = h.frame, w = f.contentWindow, d = w.document, sink = h.sink;
    fill(w, d, h.order, rv);
    var cap = findCaptcha(d);
    if (cap) {
      if (!rv.captcha) {
        if (!cap.img) { f.remove(); held = null; return Promise.reject(err('captcha_unknown', '자동등록방지 그림을 찾지 못했습니다.')); }
        return captchaImage(cap.img).then(function (src) {
          if (!src) { f.remove(); held = null; throw err('captcha_unknown', '자동등록방지 그림을 읽지 못했습니다.'); }
          held = h;   // 같은 창에 글자를 넣어야 그림과 맞는다
          throw err('captcha', MSG.captcha, { image: src });
        });
      }
      cap.input.value = rv.captcha;
    }
    held = null;
    return new Promise(function (resolve, reject) {
      var ms = CFG.sendTimeout + CFG.perFile * (rv.files ? rv.files.length : 0);
      var t = setTimeout(function () { f.onload = null; reject(err('timeout', '등록 응답이 없습니다.')); }, ms);
      f.onload = function () {
        var p2 = ''; try { p2 = f.contentWindow.location.pathname; } catch (e) {}
        clearTimeout(t); f.onload = null;
        if (p2.indexOf(CFG.writeUrl) === 0 || /\/member\/login/.test(p2)) {
          var m = sink.join(' ');
          if (/배송/.test(m)) reject(err('not_shipped', sink[0] || MSG.no_order));
          else reject(err('cafe24', sink[0] || '카페24가 등록을 받지 않았습니다.'));
        }
        else resolve({ product: h.order.product, orderId: h.order.orderId });
      };
      if (!w.BOARD_WRITE || !w.BOARD_WRITE.form_submit) { clearTimeout(t); return reject(err('form', '카페24 등록 함수가 없습니다.')); }
      w.BOARD_WRITE.form_submit('boardWriteForm');
      // 카페24 입력 검사에서 막히면 페이지가 안 넘어가고 안내만 남는다
      setTimeout(function () {
        if (sink.length && w.BOARD_WRITE.is_submitting === false) {
          clearTimeout(t); f.onload = null;
          var m = sink[sink.length - 1];
          reject(/배송/.test(m) ? err('not_shipped', m) : /자동|문자|captcha/i.test(m) ? err('captcha_wrong', m) : err('cafe24', m));
        }
      }, 600);
    });
  }

  function submit(rv) {
    var start = (held && rv.captcha) ? Promise.resolve(held) : (dropHeld(), prepare(rv));
    var h0;
    return start.then(function (h) { h0 = h; return send(h, rv); }).then(function (res) {
      if (h0) h0.frame.remove();
      return remember(rv, res).then(function () { return res; });
    }, function (e) {
      if (!e || !e.code) e = err('error', (e && e.message) || String(e));
      if (e.code !== 'captcha' && h0) h0.frame.remove();
      if (e.code !== 'captcha') logFail(e, rv);
      throw e;
    });
  }
  function dropHeld() { if (held) { held.frame.remove(); held = null; } }

  /* ---------- 안전장치: 카페24 쓰기 페이지로 넘기기 ---------- */
  function fallback(rv) {
    dropHeld();
    store(CFG.draftKey, { product: rv.product, score: rv.score, message: rv.message, t: Date.now() });
    location.href = CFG.writeUrl + '?board_no=' + CFG.boardNo + '&product_no=' + encodeURIComponent(rv.product);
  }
  // 카페24 쓰기 페이지(스킨 공통에 이 파일이 붙어 있을 때)에서 옮겨 온 글을 채운다. 숨긴 창 안에서는 안 한다
  function prefill() {
    if (window.top !== window || location.pathname.indexOf(CFG.writeUrl) !== 0) return;
    var dr = load(CFG.draftKey, null);
    if (!dr || Date.now() - dr.t > 30 * 6e4) return;
    var tries = 0;
    (function go() {
      var f = document.getElementById('boardWriteForm');
      var ready = f && window.FroalaEditor && window.FroalaEditor.INSTANCES && window.FroalaEditor.INSTANCES[0];
      if (!ready && tries++ < 40) return setTimeout(go, 250);
      if (!f) return;
      fillText(window, f, dr.message, dr.score);
      store(CFG.draftKey, undefined);
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prefill); else prefill();

  /* ---------- 방금 쓴 리뷰: 1시간 수집 전까지 본인 화면에만 ---------- */
  function thumb(file) {
    return new Promise(function (resolve) {
      if (!/^image\//.test(file.type)) return resolve(null);
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var k = Math.min(1, 480 / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u); resolve(c.toDataURL('image/jpeg', 0.8));
      };
      im.onerror = function () { URL.revokeObjectURL(u); resolve(null); };
      im.src = u;
    });
  }
  function mask(name) { name = String(name || ''); return name ? name.slice(0, Math.max(1, name.length - 2)) + '****' : '****'; }
  function remember(rv, res) {
    return Promise.all((rv.files || []).slice(0, 4).map(thumb)).then(function (imgs) {
      var now = new Date(), a = load(CFG.mineKey, []);
      a.unshift({
        id: -now.getTime(), p: String(res.product), t: now.toISOString(),
        d: now.getFullYear() + '. ' + (now.getMonth() + 1) + '. ' + now.getDate() + '.',
        n: mask(rv.userName), g: '', o: '', s: rv.score, m: rv.message, img: imgs.filter(Boolean),
        rs: 0, pin: 0, like: 0, re: 0, own: 1, c: [], mine: 1
      });
      store(CFG.mineKey, a.slice(0, 5));
    });
  }
  // 목록이 부를 때: 아직 수집 안 된(같은 글이 데이터에 없는) 내 리뷰만
  function mine(sources, data) {
    var limit = Date.now() - CFG.mineHours * 36e5, a = load(CFG.mineKey, []);
    var keep = a.filter(function (r) { return new Date(r.t).getTime() > limit; });
    var have = {}; (data || []).forEach(function (r) { have[r.m.slice(0, 60)] = 1; });
    keep = keep.filter(function (r) { return !have[r.m.slice(0, 60)]; });
    if (keep.length !== a.length) store(CFG.mineKey, keep);
    return keep.filter(function (r) { return !sources || sources.indexOf(r.p) >= 0; });
  }
  function loginUrl() { return CFG.loginUrl + '?noMemberOrder&returnUrl=' + encodeURIComponent(location.pathname + location.search); }

  window.PloonieReviewSubmit = {
    submit: submit,
    fallback: fallback,
    cancel: dropHeld,
    mine: mine,
    loginUrl: loginUrl,
    failures: function () { return load(CFG.failKey, []); },
    config: function (o) { for (var k in o) CFG[k] = o[k]; return CFG; },
    _: { parseOrders: parseOrders, pickOrder: pickOrder, splitArgs: splitArgs, needsOrder: needsOrder }
  };
})();
