import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const SP='/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,170)));
p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('api/config'))errs.push(m.text().slice(0,140));});
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="pool"]'); await p.waitForTimeout(2200);
const r=await p.evaluate(()=>{
 const c=document.getElementById('missCard'); if(!c) return null;
 const rows=[...c.querySelectorAll('.misr')].map(x=>
   x.querySelector('.k').textContent+' = '+x.querySelector('.v').textContent.trim());
 const d=c.querySelector('details');
 const barColor=getComputedStyle(c.querySelector('.misr .b i')).backgroundColor;
 return {rows, note:c.querySelector('.misn').textContent.replace(/\s+/g,' ').trim().slice(0,120),
  deptRows:c.querySelectorAll('tbody tr').length, open:d.open,
  theme:document.documentElement.getAttribute('data-theme'), barColor,
  noteBg:getComputedStyle(c.querySelector('.misn')).backgroundColor};
});
console.log('1 빠진 것 카드  '+(r?'✅':'❌ 없음'));
if(r){ r.rows.forEach(x=>console.log('   '+x));
 console.log('2 원인 문구  '+r.note);
 console.log('3 학과별 표 '+r.deptRows+'행 (기본 접힘 '+(!r.open?'✅':'❌')+')');
 console.log('4 다크 테마='+r.theme+'  막대 '+r.barColor+'  설명배경 '+r.noteBg);
 await p.click('#missCard summary'); await p.waitForTimeout(400);
 console.log('5 펼침 후 표 보임 '+(await p.evaluate(()=>document.querySelector('#missCard details').open)?'✅':'❌'));
 await p.screenshot({path:SP+'/qa-pool.png'});
}
// sheet 화면도 오류 없는지
await p.click('[data-v="sheet"]'); await p.waitForTimeout(1500);
await p.click('[data-v="univ"]'); await p.waitForTimeout(1200);
await p.click('[data-v="net"]'); await p.waitForTimeout(1500);
console.log('6 전체 오류 '+(errs.length?'❌ '+errs.slice(0,3).join(' / '):'✅ 없음'));
await b.close();
