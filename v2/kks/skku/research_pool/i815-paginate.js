/* ==========================================================================
   I815 문서표준 — 자동 쪽나눔
   근거 : 문서표준 지침서 I815_PM_121 v1.0

   본문을 A4 쪽 크기에 맞춰 자동으로 나눈다. 쪽을 손으로 자르지 않으므로
   내용을 고쳐도 조판이 깨지지 않는다.

   사용법
     <div class="i815-flow" data-start="1">
       <template class="i815-header-tpl"> … 머리말 … </template>   (선택)
       <template class="i815-footer-tpl"> … 꼬리말 … </template>   (선택)
       <div class="i815-blocks">
          … 본문 블록을 순서대로 나열 …
       </div>
     </div>

   머리말 template 을 넣지 않으면 머리말 없는 쪽(고객 제출용·간이 문서)으로
   조판되고 본문 영역이 30mm 넓어진다.

   항목 번호(1. 가. 1) …)는 쪽을 넘어가도 이어진다. 쪽마다 counter-reset 을
   손으로 적을 필요가 없다.
   ========================================================================== */
(function () {
  'use strict';

  var MM = 96 / 25.4;

  function varMM(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    var n = parseFloat(v);
    return (isNaN(n) ? fallback : n) * MM;
  }

  var KEEP_WITH_NEXT = /(^|\s)(d[1-6]|i815-title|tbl-caption)(\s|$)/;

  function paginate(flow) {
    var headerTpl = flow.querySelector('template.i815-header-tpl');
    var footerTpl = flow.querySelector('template.i815-footer-tpl');
    var blocksHost = flow.querySelector('.i815-blocks');
    if (!blocksHost) return;

    var useHeader = !!headerTpl;
    var useFooter = !!footerTpl;

    var pageH = 297 * MM;
    var top = varMM('--i815-margin-top', 10) + (useHeader ? varMM('--i815-header-h', 30) : 0);
    var bottom = varMM('--i815-margin-bottom', 20) + varMM('--i815-footer-h', 15);
    var avail = pageH - top - bottom;

    var host = document.createElement('div');
    host.className = 'i815-pages';
    flow.parentNode.insertBefore(host, flow);

    var blocks = [].slice.call(blocksHost.children);
    var sheet = null, body = null;

    function newSheet() {
      sheet = document.createElement('div');
      sheet.className = 'sheet numbered' + (useHeader ? '' : ' no-header');
      if (useHeader) sheet.appendChild(headerTpl.content.cloneNode(true));
      body = document.createElement('div');
      body.className = 'i815-body';
      sheet.appendChild(body);
      if (useFooter) sheet.appendChild(footerTpl.content.cloneNode(true));
      host.appendChild(sheet);
    }

    /* scrollHeight 는 정수로 반올림되므로 소수점 높이를 놓친다.
       용지를 넘기지 않도록 4px(약 1mm) 안전여유를 둔다. */
    function fits() { return body.scrollHeight <= avail - 4; }

    /* 표를 현재 쪽의 남은 공간부터 채우고, 남은 행은 다음 쪽에 표머리와 함께 이어 쓴다.
       최소 2행은 남아야 쪼갠다. 한 쪽에 한 행만 덩그러니 남는 조판을 막기 위함이다.
       쪼갤 수 없으면 false 를 돌려주어 호출한 쪽이 표를 통째로 넘기게 한다. */
    function splitTable(table) {
      var tbody = table.tBodies[0];
      if (!tbody) return false;

      var stash = [];
      while (!fits() && tbody.rows.length > 2) {
        var row = tbody.rows[tbody.rows.length - 1];
        tbody.removeChild(row);
        stash.unshift(row);
      }
      if (!fits() || !stash.length) {           /* 남은 공간이 두 행도 못 담는다 */
        stash.forEach(function (r) { tbody.appendChild(r); });
        return false;
      }

      var cont = table.cloneNode(false);
      /* colgroup 을 먼저 복제한다. 빠뜨리면 table-layout:fixed 가 열 너비를 잃고
         균등분할로 되돌아가 이어지는 쪽의 행 높이가 몇 배로 커진다. */
      var cg = table.querySelector('colgroup');
      if (cg) cont.appendChild(cg.cloneNode(true));
      var thead = table.tHead;
      if (thead) cont.appendChild(thead.cloneNode(true));
      var contBody = document.createElement('tbody');
      stash.forEach(function (r) { contBody.appendChild(r); });
      cont.appendChild(contBody);

      newSheet();
      var note = document.createElement('p');
      note.className = 'tbl-caption';
      note.textContent = '(표 계속)';
      body.appendChild(note);
      body.appendChild(cont);
      if (!fits()) splitTable(cont);
      return true;
    }

    newSheet();

    blocks.forEach(function (blk) {
      body.appendChild(blk);
      if (fits()) return;

      var alone = body.children.length === 1;

      /* 표는 쪽을 넘기기 전에 먼저 쪼개 본다 — 앞 쪽에 빈 공간을 남기지 않는다 */
      if (blk.tagName === 'TABLE' && splitTable(blk)) return;

      if (alone) {
        console.warn('[i815] 한 쪽을 넘는 블록이 있습니다. 내용을 나누어 주세요.', blk);
        return;
      }

      body.removeChild(blk);

      /* 제목이 쪽 끝에 혼자 남지 않도록 함께 넘긴다 */
      var trailing = [];
      while (body.lastElementChild && KEEP_WITH_NEXT.test(body.lastElementChild.className)) {
        trailing.unshift(body.removeChild(body.lastElementChild));
      }

      newSheet();
      trailing.forEach(function (t) { body.appendChild(t); });
      body.appendChild(blk);

      if (!fits() && blk.tagName === 'TABLE') splitTable(blk);
    });

    flow.parentNode.removeChild(flow);
  }

  function run() {
    [].slice.call(document.querySelectorAll('.i815-flow')).forEach(paginate);
    document.documentElement.setAttribute('data-i815-paginated', 'true');
  }

  /* 글꼴이 바뀌면 줄 수가 달라지므로 글꼴 적재 후에 조판한다 */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(run);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
