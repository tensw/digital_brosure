import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1900,height:1250}});
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exp"]'); await p.waitForTimeout(2400);
await p.evaluate(()=>document.querySelector('[data-xf],.xrow,[data-fid]')?.click()); await p.waitForTimeout(1800);
const pins=await p.$$('[data-pin]'); await pins[0].click(); await p.waitForTimeout(3000);
console.log(await p.evaluate(()=>{
 const w=document.querySelector('.rpwrap'), mn=w.querySelector('.menu'), ml=w.querySelector('.mlist');
 const mr=mn.getBoundingClientRect(), lr=ml.getBoundingClientRect();
 const items=[...ml.querySelectorAll('.mi')].map(e=>{const r=e.getBoundingClientRect();
   return {i:+e.dataset.i, h:Math.round(r.height), top:Math.round(r.top-lr.top),
     vis:r.bottom<=lr.bottom+1 && r.top>=lr.top-1};});
 return {menuH:Math.round(mr.height), listH:Math.round(lr.height), listScroll:Math.round(ml.scrollHeight),
  overflow:ml.scrollHeight-ml.clientHeight,
  h3:Math.round(w.querySelector('.menu h3').getBoundingClientRect().height),
  search:Math.round(w.querySelector('.menu .rpsearch').getBoundingClientRect().height),
  mfoot:Math.round(w.querySelector('.mfoot').getBoundingClientRect().height),
  divs:ml.querySelectorAll('.mdiv').length,
  visible:items.filter(x=>x.vis).length, total:items.length,
  itemH:[...new Set(items.map(x=>x.h))],
  cut:items.filter(x=>!x.vis).map(x=>x.i)};}));
await b.close();
