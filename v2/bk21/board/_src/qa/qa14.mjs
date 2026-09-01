import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const SP='/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1600,height:1150}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
// 사용자가 준 URL 경로: exp 화면 → Oncology
await p.click('[data-v="exp"]'); await p.waitForTimeout(2500);
await p.evaluate(()=>{const els=[...document.querySelectorAll('[data-xf],.xrow,[data-fid]')];
  const t=els.find(e=>/Oncology/i.test(e.textContent))||els[0]; t&&t.click();});
await p.waitForTimeout(1900);
const pins=await p.$$('[data-pin]');
console.log('1 연구자 버튼 '+pins.length+'개');
await pins[0].click(); await p.waitForTimeout(2200);
const r=await p.evaluate(()=>{
 const g=getComputedStyle(document.querySelector('.prtabs')).gridTemplateColumns.split(' ');
 const c=document.querySelector('.prcard');
 return {cols:g.length, widths:g.map(x=>Math.round(parseFloat(x))),
  card:!!c, name:c?.querySelector('h3')?.textContent,
  sub:c?.querySelector('.pcSub')?.textContent,
  score:c?.querySelector('.pcScore')?.textContent.replace(/\s+/g,' ').trim(),
  chips:[...(c?.querySelectorAll('.pcChip')||[])].map(x=>x.textContent.trim()).join(' '),
  mets:[...(c?.querySelectorAll('.pcMet > div')||[])].map(x=>x.textContent.replace(/\s+/g,' ').trim()),
  works:c?.querySelectorAll('.pcW').length,
  navq:!!document.querySelector('.prnq'), navf:document.querySelector('.prnf')?.textContent.replace(/\s+/g,' ').trim(),
  vh:document.querySelector('.prvh .no')?.textContent, vt:document.querySelector('.prvt')?.textContent};
});
console.log('2 3단 '+r.cols+'열 '+r.widths.join(' / ')+'  '+(r.cols===3?'✅':'❌'));
console.log('3 좌측 카드  '+r.name+' | '+r.sub);
console.log('   점수 '+r.score);
console.log('   칩 '+r.chips);
r.mets.forEach(m=>console.log('   지표 '+m));
console.log('   대표작 '+r.works+'편');
console.log('4 중간  검색줄 '+(r.navq?'✅':'❌')+' · 푸터 '+r.navf);
console.log('5 우측  '+r.vh+' → '+r.vt);
await p.locator('.prbox').screenshot({path:SP+'/qa14-3col.png'});
// 반응형
for(const w of [1600,1200,820]){
  await p.setViewportSize({width:w,height:1150}); await p.waitForTimeout(600);
  const g=await p.evaluate(()=>{const t=document.querySelector('.prtabs');
    const c=document.querySelector('.prcard');
    return {n:getComputedStyle(t).gridTemplateColumns.split(' ').length,
      order:c?getComputedStyle(c).order:'?',
      hs:document.querySelector('.prbox').scrollWidth>document.querySelector('.prbox').clientWidth+2};});
  console.log(`6 ${w}px → ${g.n}열 · 카드 order ${g.order} · 가로스크롤 ${g.hs?'있음 ❌':'없음 ✅'}`);
  await p.locator('.prbox').screenshot({path:`${SP}/qa14-${w}.png`});
}
console.log('7 오류 '+(errs.length?'❌ '+errs.slice(0,2).join(' / '):'✅ 없음'));
await b.close();
