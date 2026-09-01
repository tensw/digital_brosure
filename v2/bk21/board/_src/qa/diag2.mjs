import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:760,height:1000}});
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exec"]'); await p.waitForTimeout(2500);
console.log(await p.evaluate(()=>{
 const r=document.querySelector('.gyrow');
 return {cls:r.className, cols:getComputedStyle(r).gridTemplateColumns,
   matches900:matchMedia('(max-width:900px)').matches,
   cardW:document.querySelector('.gycard').getBoundingClientRect().width,
   vw:innerWidth};
}));
await b.close();
