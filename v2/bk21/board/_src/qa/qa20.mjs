import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const SP='/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1600,height:1150}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,220)));
p.on('console',m=>{if(m.type()==='error'&&!/api\/config|net::|Failed to fetch/i.test(m.text()))errs.push(m.text().slice(0,160));});
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exp"]'); await p.waitForTimeout(2400);
await p.evaluate(()=>document.querySelector('[data-xf],.xrow,[data-fid]')?.click()); await p.waitForTimeout(1800);
const pins=await p.$$('[data-pin]'); await pins[0].click(); await p.waitForTimeout(2800);
const r=await p.evaluate(()=>{
 const w=document.querySelector('.rpwrap'); if(!w) return {no:true};
 return {phone:(w.querySelector('#rp-phone')?.innerHTML||'').length,
  menu:w.querySelectorAll('#rp-mlist .mi').length,
  panel:(w.querySelector('#rp-panel')?.innerHTML||'').length,
  svgs:w.querySelectorAll('#rp-panel svg').length,
  cols:getComputedStyle(w.querySelector('.rpboard')).gridTemplateColumns.split(' ').length,
  err:w.querySelector('.prempty b')?.textContent};});
console.log('1 rpwrap '+(r.no?'❌ 없음':'✅'));
if(!r.no){
 console.log('  폰 '+r.phone+'자 · 메뉴 '+r.menu+'개 '+(r.menu===11?'✅':'❌')+' · 패널 '+r.panel+'자 · SVG '+r.svgs+'개');
 console.log('  3단 '+r.cols+'열 '+(r.cols===3?'✅':'❌')+(r.err?'  ⚠ '+r.err:''));
}
console.log('2 오류 '+(errs.length?'❌ '+errs.slice(0,2).join(' / '):'✅ 없음'));
await b.close();
