import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const SP='/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1600,height:1100}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,220)));
p.on('console',m=>{if(m.type()==='error'&&!/api\/config/.test(m.text()))errs.push('CONSOLE '+m.text().slice(0,180));});
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html#field=Oncology',{waitUntil:'load',timeout:120000});
await p.waitForTimeout(4000);
const r=await p.evaluate(()=>{
 const on=document.querySelector('[data-v].on');
 const views=[...document.querySelectorAll('[id^="v-"]')].map(v=>({
   id:v.id, hidden:v.classList.contains('hidden'),
   disp:getComputedStyle(v).display, len:v.innerHTML.length}));
 return {hash:location.hash, active:on?on.dataset.v:null,
   visible:views.filter(v=>v.disp!=='none'&&v.len>50).map(v=>v.id+':'+v.len),
   allEmpty:views.every(v=>v.len<50), views};});
console.log('1 해시 '+r.hash+' · 활성탭 '+r.active);
console.log('2 보이는 뷰 '+(r.visible.length?r.visible.join(' '):'❌ 없음'));
console.log('3 전 뷰 비었나 '+(r.allEmpty?'❌ 전부 빔':'아니오'));
r.views.forEach(v=>console.log(`   ${v.id.padEnd(9)} hidden=${v.hidden?'Y':'N'} display=${v.disp.padEnd(6)} html=${v.len}`));
console.log('4 오류 '+(errs.length?'❌\n   '+errs.slice(0,3).join('\n   '):'✅ 없음'));
await p.screenshot({path:SP+'/qa31.png'});
await b.close();
