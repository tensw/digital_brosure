import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const SP='/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1100}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exp"]'); await p.waitForTimeout(2500);
await p.evaluate(()=>document.querySelector('[data-xf],.xrow,[data-fid]')?.click());
await p.waitForTimeout(1800);
const pins=await p.$$('[data-pin]');
// 배지 종류 훑기
const badges=[];
for(let i=0;i<Math.min(pins.length,8);i++){
  await pins[i].click(); await p.waitForTimeout(900);
  const r=await p.evaluate(()=>({b:document.querySelector('.bkb')?.textContent.trim()||'(없음)',
    n:document.querySelector('.prhead h4')?.firstChild?.textContent?.trim(),
    s:document.querySelector('.prscore b')?.textContent||'—'}));
  badges.push(`${r.n} · ${r.b} · ${r.s}`);
  await p.evaluate(()=>document.querySelector('[data-mclose]')?.click()); await p.waitForTimeout(350);
}
console.log('1 배지 표본 8명');
badges.forEach(x=>console.log('   '+x));
// 미참여자 골라 탭 순회
const idx=badges.findIndex(x=>x.includes('미참여'));
console.log('2 미참여자 '+(idx>=0?`발견 (${idx+1}번째)`:'표본에 없음'));
if(idx>=0){
  await pins[idx].click(); await p.waitForTimeout(1600);
  const out=[];
  for(let i=1;i<=11;i++){
    await p.evaluate(x=>document.querySelector(`[data-prtab="${x}"]`).click(), i);
    await p.waitForTimeout(260);
    out.push(String(i).padStart(2,'0')+' '+(await p.evaluate(()=>{
      const e=document.querySelector('.prview .prempty b');
      return e?'미수집 — '+e.textContent.trim():'내용 있음';})));
  }
  out.forEach(x=>console.log('   '+x));
  await p.locator('.prbox').screenshot({path:SP+'/qa12-nonbk.png'});
  await p.evaluate(()=>document.querySelector('[data-mclose]')?.click()); await p.waitForTimeout(300);
}
// BK 참여자 07번 탭 내용
await pins[0].click(); await p.waitForTimeout(1400);
await p.evaluate(()=>document.querySelector('[data-prtab="7"]').click()); await p.waitForTimeout(400);
console.log('3 07 연구분야 탭: '+await p.evaluate(()=>
  document.querySelector('.prview')?.textContent.replace(/\s+/g,' ').trim().slice(0,150)));
console.log('4 오류 '+(errs.length?'❌ '+errs.slice(0,2).join(' / '):'✅ 없음'));
await b.close();
