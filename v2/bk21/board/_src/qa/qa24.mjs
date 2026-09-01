import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1900,height:1250}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exp"]'); await p.waitForTimeout(2400);
await p.evaluate(()=>document.querySelector('[data-xf],.xrow,[data-fid]')?.click()); await p.waitForTimeout(1800);
const pins=await p.$$('[data-pin]'); await pins[0].click(); await p.waitForTimeout(3000);
console.log(await p.evaluate(()=>{
 const w=document.querySelector('.rpwrap'), R=e=>{const r=e.getBoundingClientRect();
   return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)];};
 const q=s=>w.querySelector(s);
 const box=document.querySelector('.prbox');
 return {phone:R(q('.phone')), menu:R(q('.menu')), panel:R(q('.panel')),
  menuVisible:getComputedStyle(q('.menu')).display+'/'+getComputedStyle(q('.menu')).position,
  menuBg:getComputedStyle(q('.menu')).background.slice(0,40),
  h3:q('.menu h3')?.textContent.trim(), search:q('.menu .search')?.textContent.trim(),
  mi:w.querySelectorAll('.mi').length, mfoot:(q('.mfoot')?.textContent||'').trim().slice(0,40),
  boxScroll:box.scrollHeight>box.clientHeight+2, boxH:[Math.round(box.clientHeight),Math.round(box.scrollHeight)]};}));
console.log('오류 '+(errs.length?'❌ '+errs.slice(0,2).join(' / '):'✅ 없음'));
await b.close();
