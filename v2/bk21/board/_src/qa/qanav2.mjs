import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const SP=process.env.SP;
const p=await b.newPage({viewport:{width:1600,height:1000}});
p.on('pageerror',()=>{});
await p.goto('file:///Users/karis/dev/bibloai-homepage/v2/bk21/board/index.html',
  {waitUntil:'domcontentloaded',timeout:60000});
await p.waitForTimeout(3500);
for(const k of ['sheet','univ','tree','exec','net','glob','pool','exp']){
  await p.evaluate(k=>{const b=document.querySelector(`[data-v="${k}"]`); if(b) b.click();},k);
  await p.waitForTimeout(1400);
  const r=await p.evaluate(()=>{
    const vis=[...document.querySelectorAll('h1,h2,h3')]
      .filter(e=>e.getBoundingClientRect().height>0)
      .map(e=>e.tagName+' '+e.textContent.replace(/\s+/g,' ').trim().slice(0,46));
    return vis.slice(0,14);
  });
  console.log(`\n── ${k}`);
  r.forEach(x=>console.log('   ',x));
}
await b.close();
