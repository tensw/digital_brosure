import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1900,height:1250}});
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exp"]'); await p.waitForTimeout(2400);
await p.evaluate(()=>document.querySelector('[data-xf],.xrow,[data-fid]')?.click()); await p.waitForTimeout(1800);
const pins=await p.$$('[data-pin]'); await pins[0].click(); await p.waitForTimeout(3000);
console.log(await p.evaluate(()=>{
 const w=document.querySelector('.rpwrap'), bd=w.querySelector('.rpboard');
 const g=s=>{const e=w.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect();
   const br=bd.getBoundingClientRect();
   return {L:Math.round(r.left-br.left),T:Math.round(r.top-br.top),
           W:Math.round(r.width),H:Math.round(r.height),R:Math.round(r.right-br.left),B:Math.round(r.bottom-br.top)};};
 const ph=g('.phone'), mn=g('.menu'), pn=g('.panel');
 const bg=w.querySelector('.bgfx');
 return {board:[Math.round(bd.getBoundingClientRect().width),Math.round(bd.getBoundingClientRect().height)],
  phone:ph, menu:mn, panel:pn,
  gap1:mn.L-ph.R, gap2:pn.L-mn.R,
  leftPad:ph.L, rightPad:Math.round(bd.getBoundingClientRect().width)-pn.R,
  topPad:ph.T, botPad:Math.round(bd.getBoundingClientRect().height)-ph.B,
  wrapBg:getComputedStyle(w).backgroundColor,
  bgfx:bg?getComputedStyle(bg).display:'없음'};}));
console.log('── 우측 패널 안 세로 간격');
console.log(await p.evaluate(()=>{
 const pn=document.querySelector('.rpwrap .panel');
 const kids=[...pn.children].map(e=>{const r=e.getBoundingClientRect();
   return {cls:e.className.slice(0,22), T:Math.round(r.top), H:Math.round(r.height)};});
 const gaps=[]; for(let i=1;i<kids.length;i++) gaps.push(kids[i].T-(kids[i-1].T+kids[i-1].H));
 return {kids, gaps, pad:getComputedStyle(pn).padding};}));
await b.close();
