import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1700,height:1200}});
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exp"]'); await p.waitForTimeout(2400);
await p.evaluate(()=>document.querySelector('[data-xf],.xrow,[data-fid]')?.click()); await p.waitForTimeout(1800);
const pins=await p.$$('[data-pin]');
for(let i=0;i<10;i++){await pins[i].click();await p.waitForTimeout(900);
 if(await p.evaluate(()=>(document.querySelector('.bkb')?.textContent||'').includes('미참여'))) break;
 await p.evaluate(()=>document.querySelector('[data-mclose]')?.click());await p.waitForTimeout(250);}
await p.waitForTimeout(2600);
console.log(await p.evaluate(()=>{
 const P=RP.get();
 return {career:P.career, y0:P.y0, y1:P.y1, yrLen:P.yr.length,
  yrFirst:P.yr.slice(0,3), yrLast:P.yr.slice(-3),
  cyLen:((PRA&&PRA.counts_by_year)||[]).length,
  cyRange:((PRA&&PRA.counts_by_year)||[]).map(x=>x.year).sort()};}));
// 시각 속성
console.log(await p.evaluate(()=>{const w=document.querySelector('.rpwrap');
 const bd=w.querySelector('.rpboard'), ph=w.querySelector('.phone'), pn=w.querySelector('#rp-panel');
 const R=e=>{const r=e.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)];};
 return {board:R(bd), phone:R(ph), panel:R(pn),
  boardBg:getComputedStyle(bd).backgroundColor,
  phoneBg:getComputedStyle(ph).backgroundColor,
  panelColor:getComputedStyle(pn).color,
  overflow:bd.scrollWidth>bd.clientWidth+2};}));
await b.close();
