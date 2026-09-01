# -*- coding: utf-8 -*-
# 하는 일: 슬라이드 16 원본에서 CSS·JS 를 떼어낸다
import re
SP="/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad"
js=open(f"{SP}/perf.js",encoding='utf-8').read()
i=js.index('/* ── 부팅 ── */'); js=js[:i]
js=js.replace("const D=DATA.people, NOW=2026;","const NOW=2026;",1)
js=js.replace("let CUR=0, P=D[0], MODE='band';","let CUR=0, P=null, MODE='band';",1)
js=js.replace("document.getElementById('phc')","RPQ('#rp-phc')")
js=js.replace("document.getElementById('cbx')","RPQ('#rp-cbx')")
head = """/* ══════════════════════════════════════════════════════════════════
   개인성과 대시보드 — biblo.ai/2026/#16 (biblo-researcher-perf.html) 이식
   원본 코드를 고치지 않는다. 이름 충돌(D·CUR·esc·svg·bars)을 피하려고
   전체를 IIFE 로 감싸고 필요한 것만 내보낸다.
   DOM 은 팝업 루트(.rpwrap) 안에서만 찾는다.
   ══════════════════════════════════════════════════════════════════ */
window.RP=(function(){
const RPQ=s=>document.querySelector('.rpwrap '+s);
"""
tail = """
return { SEC, CH, ICON, GC, GN, nf, f1, f2,
  set(p){ P=p; }, tab(i){ CUR=i; }, cur(){ return CUR; }, get(){ return P; },
  drawPhone, drawMenu, drawPanel, phBokeh };
})();
"""
open(f"{SP}/perf.port.js","w",encoding='utf-8').write(head+js+tail)
fns=re.findall(r'^function ([A-Za-z_$][\w$]*)', js, re.M)
print("  감싸기 완료 %d자" % len(head+js+tail))
print("  함수:", ", ".join(fns))
