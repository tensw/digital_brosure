import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1900,height:1250}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exp"]'); await p.waitForTimeout(2400);
await p.evaluate(()=>document.querySelector('[data-xf],.xrow,[data-fid]')?.click()); await p.waitForTimeout(1800);
const pins=await p.$$('[data-pin]'); await pins[0].click(); await p.waitForTimeout(3000);
for(const [w,h] of [[1900,1250],[1900,800],[1500,1000],[1240,900],[900,900],[700,900]]){
  await p.setViewportSize({width:w,height:h}); await p.waitForTimeout(700);
  const r=await p.evaluate(()=>{const wr=document.querySelector('.rpwrap'),bd=wr.querySelector('.rpboard');
    const box=document.querySelector('.prbox'), mn=wr.querySelector('.menu');
    const m=(getComputedStyle(bd).transform.match(/matrix\(([\d.]+)/)||[])[1];
    const mr=mn.getBoundingClientRect();
    return {k:m?+(+m).toFixed(2):null, stack:wr.classList.contains('stack'),
      menuW:Math.round(mr.width), menuVis:mr.width>10&&mr.height>10,
      scroll:box.scrollHeight>box.clientHeight+2,
      hs:box.scrollWidth>box.clientWidth+2, mi:wr.querySelectorAll('.mi').length};});
  console.log(`${String(w).padStart(4)}×${String(h).padStart(4)} → ${r.stack?'쌓기':'배율 '+r.k} · 메뉴 ${r.menuW}px ${r.menuVis?'✅':'❌'} · 항목 ${r.mi} · 세로스크롤 ${r.scroll?'있음':'없음'} · 가로 ${r.hs?'있음 ❌':'없음 ✅'}`);
}
console.log('오류 '+(errs.length?'❌ '+errs.slice(0,2).join(' / '):'✅ 없음'));
await b.close();
