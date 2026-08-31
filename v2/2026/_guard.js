/* 자료 보호 — /2026 아래 모든 문서에 서버가 자동으로 끼워 넣는다.
   스크린샷은 브라우저가 막을 수 없다. 막을 수 있는 것(복사·우클릭·드래그·인쇄·저장)을 막고,
   막을 수 없는 것은 계정 워터마크로 추적이 되게 한다. */
(function () {
  var TOP = window.self === window.top;
  var css = document.createElement('style');
  css.textContent =
    '.gd-pop-2q{position:fixed;inset:0;z-index:2147483600;display:none;place-items:center;' +
      'background:rgba(4,7,18,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}' +
    '.gd-pop-2q.on{display:grid}' +
    '.gd-box-2q{max-width:430px;margin:0 24px;padding:26px 28px;border-radius:18px;text-align:left;' +
      'background:linear-gradient(160deg,rgba(18,25,54,.98),rgba(10,15,36,.98));' +
      'border:1px solid rgba(150,180,240,.28);box-shadow:0 36px 90px -30px rgba(0,0,0,.95);' +
      'font:14px/1.65 "Pretendard","Apple SD Gothic Neo",-apple-system,system-ui,sans-serif;color:#e9eefb}' +
    '.gd-box-2q u{display:block;text-decoration:none;font:700 10px/1 ui-monospace,Menlo,monospace;' +
      'letter-spacing:.2em;color:#7f8fc4}' +
    '.gd-box-2q b{display:block;margin-top:12px;font-size:19px;font-weight:800;letter-spacing:-.6px}' +
    '.gd-box-2q p{margin-top:10px;font-size:13px;color:#93a6cc;letter-spacing:-.3px}' +
    '.gd-box-2q s{display:block;margin-top:12px;text-decoration:none;' +
      'font:700 11px/1.5 ui-monospace,Menlo,monospace;color:#8fe6ff}' +
    '.gd-box-2q button{all:unset;cursor:pointer;display:inline-flex;align-items:center;height:36px;' +
      'margin-top:16px;padding:0 16px;border-radius:999px;font-size:13px;font-weight:800;color:#08122c;' +
      'background:linear-gradient(140deg,#7fd8f5,#9fb4ff)}' +
    '.gd-blur-2q{position:fixed;inset:0;z-index:2147483400;display:none;place-items:center;' +
      'background:rgba(4,7,18,.94);font:800 15px/1.6 "Pretendard",system-ui,sans-serif;color:#93a6cc;' +
      'letter-spacing:-.3px;text-align:center;padding:0 24px}' +
    '.gd-blur-2q.on{display:grid}' +
    '@media print{body{display:none !important}html{background:#fff !important}}';
  document.documentElement.appendChild(css);

  /* ── 복사·우클릭·드래그 차단 ── */
  var block = function (e) { e.preventDefault(); pop('copy'); return false; };
  ['contextmenu', 'copy', 'cut', 'dragstart'].forEach(function (t) {
    document.addEventListener(t, block, true);
  });
  document.addEventListener('selectstart', function (e) {
    var t = e.target; if (t && /INPUT|TEXTAREA/.test(t.tagName)) return;
    e.preventDefault();
  }, true);

  /* ── 단축키 ── */
  document.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase(), m = e.ctrlKey || e.metaKey;
    if (e.key === 'PrintScreen' || k === 'printscreen') { pop('shot'); return; }
    if (m && ['c', 'x', 's', 'p', 'u'].indexOf(k) >= 0) { e.preventDefault(); pop(k === 'p' ? 'print' : 'copy'); }
    if (m && e.shiftKey && ['i', 'j', 'c'].indexOf(k) >= 0) { e.preventDefault(); pop('copy'); }
    if (k === 'f12') { e.preventDefault(); pop('copy'); }
  }, true);
  window.addEventListener('beforeprint', function () { pop('print'); });

  if (!TOP) return;                       // 워터마크·가림막은 맨 위 문서에만

  /* ── 팝업 ── */
  var pop_el, blur_el, timer = 0;
  var MSG = {
    copy:  ['복사할 수 없습니다', '이 자료는 초대받은 분만 열람할 수 있습니다. 복사 · 저장 · 개발자도구는 막혀 있습니다.'],
    print: ['인쇄할 수 없습니다', '인쇄와 PDF 저장은 막혀 있습니다. 자료가 필요하시면 담당자에게 요청해 주십시오.'],
    shot:  ['화면 촬영은 기록됩니다', '화면에 계정 정보가 함께 찍힙니다. 촬영본이 외부로 나가면 누구의 화면인지 드러납니다.']
  };
  function pop(kind) {
    if (!pop_el) return;
    var m = MSG[kind] || MSG.copy;
    pop_el.querySelector('b').textContent = m[0];
    pop_el.querySelector('p').textContent = m[1];
    pop_el.classList.add('on');
    clearTimeout(timer); timer = setTimeout(function () { pop_el.classList.remove('on'); }, 6000);
  }

  function build(code) {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    var stamp = 'BIBLO ' + code + ' · ' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());

    pop_el = document.createElement('div'); pop_el.className = 'gd-pop-2q';
    pop_el.innerHTML = '<div class="gd-box-2q"><u>BIBLO · PROTECTED</u><b></b><p></p>' +
      '<s>' + stamp + '</s><button type="button">확인</button></div>';
    pop_el.querySelector('button').addEventListener('click', function () { pop_el.classList.remove('on'); });
    document.body.appendChild(pop_el);

    blur_el = document.createElement('div'); blur_el.className = 'gd-blur-2q';
    blur_el.textContent = '다른 창으로 이동했습니다. 이 창을 다시 누르면 자료가 보입니다.';
    document.body.appendChild(blur_el);
    addEventListener('blur', function () { blur_el.classList.add('on'); });
    addEventListener('focus', function () { blur_el.classList.remove('on'); });

  }

  fetch('/api/auth/me').then(function (r) { return r.json(); })
    .then(function (j) { build(j && j.code ? j.code : '------'); })
    .catch(function () { build('------'); });
})();
