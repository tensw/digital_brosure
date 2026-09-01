import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const SP='/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1100}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('api/config'))errs.push(m.text().slice(0,150));});
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exec"]'); await p.waitForTimeout(3000);
const r=await p.evaluate(()=>({
 ins:[...document.querySelectorAll('#v-exec .insight')].map(x=>
   (x.classList.contains('warn')?'[!] ':'[→] ')+x.querySelector('.tx').textContent.replace(/\s+/g,' ').trim()),
 cards:[...document.querySelectorAll('.areacard')].map(c=>
   c.querySelector('h4').textContent.replace(/\s+/g,' ').trim()+'  '+c.querySelector('.sc').textContent
   +'  행'+c.querySelectorAll('.arow').length+' (미수집 '+c.querySelectorAll('.arow.off').length+')'),
 rows:document.querySelectorAll('.areacard .arow').length,
}));
console.log('1 인사이트 '+r.ins.length+'개');
r.ins.forEach(x=>console.log('   '+x+'\n'));
console.log('2 영역 카드 '+r.cards.length+'장 · 지표행 '+r.rows+' '+(r.rows===29?'✅':'❌'));
r.cards.forEach(x=>console.log('   '+x));
await p.locator('#radarCard').screenshot({path:SP+'/qa7-radar.png'});
console.log('3 오류 '+(errs.length?'❌ '+errs.slice(0,3).join(' / '):'✅ 없음'));
await b.close();
