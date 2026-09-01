import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const SP='/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1600,height:1200}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
p.on('console',m=>{if(m.type()==='error'&&!/api\/config/.test(m.text()))errs.push(m.text().slice(0,150));});
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
console.log('1 메뉴  '+await p.$$eval('[data-v]',n=>n.map(x=>x.dataset.v).join(' ')));
const btn=await p.$('[data-v="ucmp"]');
console.log('2 대학비교 버튼 '+(btn?'✅':'❌'));
if(!btn){console.log(errs.slice(0,2));await b.close();process.exit(0);}
await btn.click(); await p.waitForTimeout(2200);
const r=await p.evaluate(()=>{const v=document.getElementById('v-ucmp');
 return {len:v.textContent.replace(/\s+/g,' ').trim().length,
  cards:v.querySelectorAll('.ecard').length, ins:v.querySelectorAll('.insight').length,
  kpi:v.querySelectorAll('.kpi').length, tables:v.querySelectorAll('table.mtx').length,
  bars:v.querySelectorAll('.ucbar').length, me:v.querySelectorAll('.me').length,
  head:v.querySelector('.insight .tx')?.textContent.replace(/\s+/g,' ').trim(),
  kpis:[...v.querySelectorAll('.kpi')].map(k=>k.querySelector('.lb').textContent+' '+k.querySelector('.vl').textContent.trim()),
  nan:/NaN|undefined|Infinity/.test(v.textContent)};});
console.log('3 본문 '+r.len+'자 · 카드 '+r.cards+' · 인사이트 '+r.ins+' · KPI '+r.kpi+' · 표 '+r.tables+' · 막대 '+r.bars);
console.log('4 NaN/undefined '+(r.nan?'❌ 있음':'✅ 없음'));
console.log('5 인사이트  '+r.head);
r.kpis.forEach(k=>console.log('   '+k));
await p.screenshot({path:SP+'/qa30.png'});
await p.setViewportSize({width:860,height:1100}); await p.waitForTimeout(600);
console.log('6 860px 가로스크롤 '+(await p.evaluate(()=>document.body.scrollWidth>document.body.clientWidth+2)?'있음 ❌':'없음 ✅'));
await p.evaluate(()=>{try{localStorage.setItem('bk21-theme','dark')}catch(e){};window.paintTheme&&window.paintTheme();});
await p.waitForTimeout(400);
console.log('7 다크 막대 '+await p.evaluate(()=>getComputedStyle(document.querySelector('#v-ucmp .ucbar.me .b i')).backgroundColor));
console.log('8 오류 '+(errs.length?'❌ '+errs.slice(0,2).join(' / '):'✅ 없음'));
await b.close();
