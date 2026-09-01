import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1700,height:1150}});
await p.route('**://api.openalex.org/**', r=>r.fulfill({status:429,body:'{}'}));
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exp"]'); await p.waitForTimeout(2500);
await p.evaluate(()=>document.querySelector('[data-xf],.xrow,[data-fid]')?.click()); await p.waitForTimeout(1800);
const pins=await p.$$('[data-pin]');
console.log('버튼 '+pins.length);
await pins[0].click(); await p.waitForTimeout(2500);
console.log('팝업 '+(await p.$('.rpwrap')?'✅':'❌'));
const r=await p.evaluate(()=>{
 const out={};
 const meas=(sel)=>{const root=document.querySelector(sel); if(!root) return null;
   const ks=[...root.children].filter(e=>e.getBoundingClientRect().height>2);
   return {pad:getComputedStyle(root).padding, gap:getComputedStyle(root).rowGap,
     kids:ks.map((e,i)=>{const rc=e.getBoundingClientRect(), cs=getComputedStyle(e);
       return {c:(''+(e.className||e.tagName)).slice(0,22), h:Math.round(rc.height),
         mt:cs.marginTop, mb:cs.marginBottom,
         g:i?Math.round(rc.top-ks[i-1].getBoundingClientRect().bottom):null};})};};
 out.panel=meas('#rp-panel');
 out.body=meas('#rp-panel .body');
 out.phone=meas('.rpwrap .phone');
 return out;});
for(const [k,v] of Object.entries(r)){
 console.log(`\n══ ${k}${v?'':' — 없음'}`);
 if(!v) continue;
 console.log(`   padding ${v.pad} · row-gap ${v.gap}`);
 v.kids.forEach(x=>console.log(`   ${String(x.g==null?'-':x.g).padStart(4)}px  ${x.c.padEnd(22)} h${String(x.h).padStart(4)} mt${x.mt} mb${x.mb}`));
}
await b.close();
