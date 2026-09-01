import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1600,height:1150}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,180)));
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exp"]'); await p.waitForTimeout(2400);
await p.evaluate(()=>document.querySelector('[data-xf],.xrow,[data-fid]')?.click()); await p.waitForTimeout(1800);
const pins=await p.$$('[data-pin]');
await pins[0].click(); await p.waitForTimeout(2600);
const r=await p.evaluate(()=>{const c=document.querySelector('.prcard'),v=document.querySelector('.prview');
 const H=e=>[Math.round(e.getBoundingClientRect().height),Math.round(e.scrollHeight)];
 return {bk:document.querySelector('.bkb')?.textContent.trim(),
  pill:c.querySelector('.pcScore')?.textContent.replace(/\s+/g,' ').trim(),
  mets:[...c.querySelectorAll('.pcMet > div')].map(x=>x.textContent.replace(/\s+/g,' ').trim()),
  card:H(c), view:H(v), ev:v.querySelectorAll('.prevw').length,
  evT:[...v.querySelectorAll('.prevw')].slice(0,2).map(x=>x.querySelector('.t').textContent.slice(0,30)+' | '+x.querySelector('.tg').textContent.replace(/\s+/g,' ').trim())};});
console.log('BK21 참여자');
console.log('  배지 '+r.bk+'  pill '+r.pill);
r.mets.forEach(m=>console.log('  지표 '+m));
console.log('  카드 '+r.card.join('/')+'  우측 '+r.view.join('/'));
console.log('  근거논문 '+r.ev+'편');
r.evT.forEach(x=>console.log('    '+x));
// 탭 순회 + 여백 점검
let thin=[];
for(let i=1;i<=11;i++){
  await p.evaluate(x=>document.querySelector(`[data-prtab="${x}"]`).click(), i);
  await p.waitForTimeout(280);
  const h=await p.evaluate(()=>{const v=document.querySelector('.prview');
    return [Math.round(v.getBoundingClientRect().height),Math.round(v.scrollHeight)];});
  if(h[1] < h[0]*0.55) thin.push(`${i}(${h[1]}/${h[0]})`);
}
console.log('  내용이 얇은 탭 '+(thin.length?thin.join(' '):'없음 ✅'));
for(const w of [1600,1240,860]){
  await p.setViewportSize({width:w,height:1150}); await p.waitForTimeout(600);
  const g=await p.evaluate(()=>({n:getComputedStyle(document.querySelector('.prtabs')).gridTemplateColumns.split(' ').length,
    hs:document.querySelector('.prbox').scrollWidth>document.querySelector('.prbox').clientWidth+2}));
  console.log(`  ${w}px → ${g.n}열 · 가로스크롤 ${g.hs?'있음 ❌':'없음 ✅'}`);
}
console.log('  오류 '+(errs.length?'❌ '+errs.slice(0,2).join(' / '):'✅ 없음'));
await b.close();
