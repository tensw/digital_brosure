import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1700,height:1100}});
await p.route('**://api.openalex.org/**', r=>r.fulfill({status:429,body:'{}'}));
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html#field=Oncology',{waitUntil:'load',timeout:120000});
await p.waitForTimeout(3500);
const pins=await p.$$('[data-pin]');
let n=0;
for(let i=0;i<12 && n<4;i++){
  await pins[i].click(); await p.waitForTimeout(1000);
  const r=await p.evaluate(()=>{const t=document.querySelector('.bkb')?.textContent||'';
    if(!(t.includes('참여')&&!t.includes('미참여'))) return null;
    const P=RP.get(); const v=Object.values(P.jrs||[]);
    return {nm:document.querySelector('.prcard h3')?.textContent||document.querySelector('.prhead h4')?.firstChild?.textContent?.trim(),
      hhi:P.hhi, 논문:P.all.p, 저널:v.length, 상위:(P.jrs[0]||[])[1]||0, 공저:P.coa.length};});
  if(r){n++; console.log(`  ${r.nm} · 논문 ${r.논문} · 저널 ${r.저널} · HHI ${r.hhi} ${r.hhi<=10000?'✅':'❌'} · 공저 ${r.공저}`);}
  await p.evaluate(()=>document.querySelector('[data-mclose]')?.click()); await p.waitForTimeout(280);
}
await b.close();
