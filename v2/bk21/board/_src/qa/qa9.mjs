import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,180)));
p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('api/config'))errs.push(m.text().slice(0,140));});
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
for(const v of ['sheet','univ','tree','exec','net','glob','pool','ucmp','exp']){
  await p.click(`[data-v="${v}"]`); await p.waitForTimeout(1600);
  const r=await p.evaluate(vv=>{const root=document.getElementById('v-'+vv)||document.querySelector('.main');
    return {ins:root?root.querySelectorAll('.insight').length:0,
            cards:root?root.querySelectorAll('.ecard').length:0};},v);
  console.log(`  ${v.padEnd(6)} 카드 ${String(r.cards).padStart(2)} · 인사이트 ${r.ins}`);
}
console.log('오류 '+(errs.length?'❌ '+errs.slice(0,4).join(' / '):'✅ 없음'));
await b.close();
