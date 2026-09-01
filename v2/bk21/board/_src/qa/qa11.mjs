import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const SP='/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1100}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
p.on('console',m=>{if(m.type()==='error'&&!/api\/config|openalex|Failed to fetch|net::/i.test(m.text()))errs.push(m.text().slice(0,150));});
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exp"]'); await p.waitForTimeout(2500);
// 분야 하나 선택 → 교내 공저자 목록
const opened = await p.evaluate(async()=>{
  const f=document.querySelector('[data-xf],[data-fid],.xrow,.xitem'); if(f){f.click(); return 'field';}
  return null;});
await p.waitForTimeout(1800);
let n=await p.$$('[data-pin]');
if(!n.length){ // 다른 진입 경로
  const rows=await p.$$('.xrow,[data-xf]');
  if(rows.length){ await rows[0].click(); await p.waitForTimeout(1600); n=await p.$$('[data-pin]'); }
}
console.log('1 교내 공저자 버튼 '+n.length+'개 '+(n.length?'✅':'❌'));
if(!n.length){ console.log('   진입 실패 — 화면 구조 확인 필요'); await b.close(); process.exit(0); }
await n[0].click(); await p.waitForTimeout(2500);
const r=await p.evaluate(()=>{
 const box=document.querySelector('.prbox'); if(!box) return null;
 return {name:box.querySelector('.prhead h4')?.textContent.replace(/\s+/g,' ').trim(),
  badge:box.querySelector('.bkb')?.textContent.trim()||'(없음)',
  score:box.querySelector('.prscore b')?.textContent||'(없음)',
  menu:[...box.querySelectorAll('.prnb')].length,
  on:box.querySelector('.prnb.on b')?.textContent,
  view:box.querySelector('.prvh h5')?.textContent,
  wide:getComputedStyle(box).maxWidth};
});
console.log('2 팝업  '+(r?'✅':'❌'));
if(r){console.log('   이름 '+r.name+'  배지 '+r.badge+'  점수 '+r.score);
 console.log('   메뉴 '+r.menu+'개 '+(r.menu===11?'✅':'❌')+'  현재 '+r.on+' → '+r.view);}
// 11개 탭 순회
const seen=[];
for(let i=1;i<=11;i++){
  await p.evaluate(x=>document.querySelector(`[data-prtab="${x}"]`).click(), i);
  await p.waitForTimeout(320);
  const v=await p.evaluate(()=>{const b=document.querySelector('.prview');
    return {h:document.querySelector('.prvh h5')?.textContent,
      len:b?b.textContent.replace(/\s+/g,' ').trim().length:0,
      ins:b?b.querySelectorAll('.insight').length:0,
      empty:b?b.querySelectorAll('.prempty').length:0};});
  seen.push(`${String(i).padStart(2,'0')} ${v.h} · ${v.len}자 · 인사이트${v.ins}${v.empty?' · 미수집'+v.empty:''}`);
}
console.log('3 탭 11개 순회');
seen.forEach(x=>console.log('   '+x));
await p.screenshot({path:SP+'/qa11-popup.png'});
await p.evaluate(()=>document.querySelector('[data-prtab="2"]').click()); await p.waitForTimeout(400);
await p.locator('.prbox').screenshot({path:SP+'/qa11-tab2.png'});
console.log('4 오류 '+(errs.length?'❌ '+errs.slice(0,3).join(' / '):'✅ 없음'));
await b.close();
