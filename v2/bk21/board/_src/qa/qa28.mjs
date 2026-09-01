import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1900,height:1250}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exp"]'); await p.waitForTimeout(2400);
await p.evaluate(()=>document.querySelector('[data-xf],.xrow,[data-fid]')?.click()); await p.waitForTimeout(1800);
const pins=await p.$$('[data-pin]'); await pins[0].click(); await p.waitForTimeout(3000);
for(const [w,h] of [[1900,1250],[1500,1000],[1240,900],[900,900],[700,900]]){
  await p.setViewportSize({width:w,height:h}); await p.waitForTimeout(700);
  const r=await p.evaluate(()=>{const wr=document.querySelector('.rpwrap'),ml=wr.querySelector('.mlist');
    const lr=ml.getBoundingClientRect();
    const vis=[...ml.querySelectorAll('.mi')].filter(e=>{const q=e.getBoundingClientRect();
      return q.bottom<=lr.bottom+1&&q.top>=lr.top-1&&q.width>4;}).length;
    return {stack:wr.classList.contains('stack'), vis, tot:ml.querySelectorAll('.mi').length,
      ov:ml.scrollHeight-ml.clientHeight};});
  console.log(`${String(w).padStart(4)}×${String(h).padStart(4)} ${r.stack?'쌓기 ':'배율 '} 메뉴 ${r.vis}/${r.tot} ${r.vis===r.tot?'✅':'❌'} 넘침 ${r.ov}px`);
}
// 다른 사람들도
await p.setViewportSize({width:1900,height:1250}); await p.waitForTimeout(500);
await p.evaluate(()=>document.querySelector('[data-mclose]')?.click()); await p.waitForTimeout(400);
let bad=0;
for(let i=0;i<6;i++){
  await pins[i].click(); await p.waitForTimeout(1800);
  const v=await p.evaluate(()=>{const ml=document.querySelector('.rpwrap .mlist'); if(!ml) return -1;
    const lr=ml.getBoundingClientRect();
    return [...ml.querySelectorAll('.mi')].filter(e=>{const q=e.getBoundingClientRect();
      return q.bottom<=lr.bottom+1&&q.top>=lr.top-1;}).length;});
  if(v!==11) bad++;
  await p.evaluate(()=>document.querySelector('[data-mclose]')?.click()); await p.waitForTimeout(300);
}
console.log('연구자 6명 표본 · 메뉴 11개 아닌 경우 '+bad+(bad?' ❌':' ✅'));
console.log('오류 '+(errs.length?'❌ '+errs.slice(0,2).join(' / '):'✅ 없음'));
await b.close();
