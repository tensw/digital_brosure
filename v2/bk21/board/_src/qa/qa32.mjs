import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const SP='/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad';
const F='file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1600,height:1100}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
p.on('console',m=>{if(m.type()==='error'&&!/api\/config/.test(m.text()))errs.push(m.text().slice(0,150));});
// ① 해시 딥링크
await p.goto(F+'#field=Oncology',{waitUntil:'load',timeout:120000});
await p.waitForTimeout(4500);
const h=await p.evaluate(()=>{const on=document.querySelector('[data-v].on');
 const e=document.getElementById('v-exp');
 const r=e.getBoundingClientRect();
 return {tab:on?on.dataset.v:null, vis:r.width>50&&r.height>50,
   hash:location.hash, sel:document.querySelector('#xbody')?document.querySelector('#xbody').textContent.slice(0,42):''};});
console.log('1 #field=Oncology → 탭 '+h.tab+' · 화면 보임 '+(h.vis?'✅':'❌'));
console.log('   상세 '+(h.sel?'"'+h.sel.replace(/\s+/g,' ').trim()+'…"':'(없음)'));
// ② 9개 화면이 실제로 보이나 (DOM 이 아니라 크기로)
console.log('2 화면별 «실제로 보이는가»');
for(const v of ['sheet','univ','tree','exec','net','glob','pool','ucmp','exp']){
  await p.evaluate(x=>document.querySelector(`[data-v="${x}"]`).click(), v);
  await p.waitForTimeout(1700);
  const r=await p.evaluate(x=>{const e=document.getElementById('v-'+x);
    const b2=e.getBoundingClientRect(); const cs=getComputedStyle(e);
    return {w:Math.round(b2.width),h:Math.round(b2.height),disp:cs.display,
      hidden:e.classList.contains('hidden'),
      txt:e.innerText.replace(/\s+/g,' ').trim().length};},v);
  const ok=r.w>200&&r.h>200&&!r.hidden&&r.txt>100;
  console.log(`   ${v.padEnd(6)} ${ok?'✅':'❌'} ${r.w}×${r.h} hidden=${r.hidden?'Y':'N'} 글자 ${r.txt}`);
}
console.log('3 오류 '+(errs.length?'❌ '+errs.slice(0,2).join(' / '):'✅ 없음'));
await b.close();
