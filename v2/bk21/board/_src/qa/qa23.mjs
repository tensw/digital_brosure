import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const SP='/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1900,height:1250}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exp"]'); await p.waitForTimeout(2400);
await p.evaluate(()=>document.querySelector('[data-xf],.xrow,[data-fid]')?.click()); await p.waitForTimeout(1800);
const pins=await p.$$('[data-pin]'); await pins[0].click(); await p.waitForTimeout(3000);
for(const w of [1900,1500,1240,900,700]){
  await p.setViewportSize({width:w,height:1250}); await p.waitForTimeout(700);
  const r=await p.evaluate(()=>{const wr=document.querySelector('.rpwrap'),bd=wr.querySelector('.rpboard');
    const m=(getComputedStyle(bd).transform.match(/matrix\(([\d.]+)/)||[])[1];
    return {k:+(+m).toFixed(3), wrapW:Math.round(wr.clientWidth), wrapH:Math.round(wr.clientHeight),
      cut:bd.getBoundingClientRect().width>wr.clientWidth+2,
      hs:document.querySelector('.prbox').scrollWidth>document.querySelector('.prbox').clientWidth+2,
      menu:wr.querySelectorAll('.mi').length, stack:wr.classList.contains('stack')};});
  console.log(`${String(w).padStart(4)}px → 배율 ${r.k} · 래퍼 ${r.wrapW}×${r.wrapH} · 잘림 ${r.cut?'❌':'✅'} · 가로스크롤 ${r.hs?'❌':'✅'} · 메뉴 ${r.menu} ${r.stack?'· 쌓기':''}`);
  if(w===1900||w===700) try{await p.screenshot({path:`${SP}/qa23-${w}.png`});}catch(e){}
}
await p.setViewportSize({width:1900,height:1250}); await p.waitForTimeout(600);
// 탭 클릭 회귀
let ok=0;
for(let i=0;i<11;i++){
  await p.evaluate(x=>document.querySelector(`.rpwrap [data-i="${x}"]`)?.click(), i);
  await p.waitForTimeout(300);
  const on=await p.evaluate(()=>{const m=document.querySelector('.rpwrap .mi.on');
    return m?+m.dataset.i:-1;});
  if(on===i) ok++;
}
console.log('탭 클릭 '+ok+'/11 '+(ok===11?'✅':'❌'));
console.log('오류 '+(errs.length?'❌ '+errs.slice(0,2).join(' / '):'✅ 없음'));
await b.close();
