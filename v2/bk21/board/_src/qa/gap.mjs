import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000}});
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
for(const v of ['sheet','glob','pool','exp']){
  await p.click(`[data-v="${v}"]`); await p.waitForTimeout(1800);
  const miss=await p.evaluate(vv=>{const root=document.getElementById('v-'+vv);
    if(!root) return ['(root 없음)'];
    return [...root.querySelectorAll('.ecard')].filter(c=>!c.querySelector(':scope > .insight'))
      .map(c=>{const h=c.querySelector('h3')||c.querySelector('.h');
        return (h?h.textContent.replace(/\s+/g,' ').trim().slice(0,34):'(제목없음) '+c.className.slice(0,24));});},v);
  console.log(`  ${v}: 미덮 ${miss.length}  ${miss.join(' | ')}`);
}
await b.close();
