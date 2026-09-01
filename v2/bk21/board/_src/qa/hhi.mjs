import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1700,height:1100}});
await p.route('**://api.openalex.org/**', r=>r.fulfill({status:429,body:'{}'}));
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html#field=Oncology',{waitUntil:'load',timeout:120000});
await p.waitForTimeout(3500);
const pins=await p.$$('[data-pin]');
for(let i=0;i<8;i++){await pins[i].click();await p.waitForTimeout(900);
 if(await p.evaluate(()=>{const t=document.querySelector('.bkb')?.textContent||'';return t.includes('참여')&&!t.includes('미참여');})) break;
 await p.evaluate(()=>document.querySelector('[data-mclose]')?.click());await p.waitForTimeout(250);}
await p.waitForTimeout(1200);
console.log(await p.evaluate(()=>{const P=RP.get();
 const j=P.jrs||[];
 const tot=P.all.p;
 const sum=j.reduce((a,r)=>a+r[1],0);
 return {hhi:P.hhi, 논문:tot, jrs상위:j.slice(0,5).map(r=>r[0].slice(0,22)+':'+r[1]),
  jrs합:sum, jrs개수:j.length,
  '정확한HHI(상위7만)':Math.round(j.reduce((a,r)=>a+Math.pow(r[1]/tot*100,2),0))};}));
await b.close();
