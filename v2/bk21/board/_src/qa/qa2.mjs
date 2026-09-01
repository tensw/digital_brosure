import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const SP='/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,160)));
p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('api/config'))errs.push(m.text().slice(0,140));});
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exec"]'); await p.waitForTimeout(2500);

console.log('1 배지 ', await p.$$eval('.ehead .pill',n=>n.map(x=>x.textContent.trim()).join(' | ')));
const cards=await p.$$('#sgcpiCard .gycard');
console.log('2 계열 카드 '+cards.length+'장  '+(cards.length===3?'✅':'❌'));
console.log(await p.$$eval('#sgcpiCard .gycard',n=>n.map(c=>
 '   '+c.querySelector('.lb').textContent+'  '+c.querySelector('.vl').textContent+
 '  ['+[...c.querySelectorAll('.dt')].map(d=>d.textContent.trim()).join(' · ')+']'+
 '  띠'+c.querySelectorAll('.gband i').length+'칸').join('\n')));

// 3 아코디언
await cards[0].click(); await p.waitForTimeout(500);
let r=await p.evaluate(()=>({rows:document.querySelectorAll('#gyOpen .gyrow-r').length,
  on:[...document.querySelectorAll('#sgcpiCard .gycard.on')].map(x=>x.dataset.gy)}));
console.log('3 카드1 펼침 → 학과 '+r.rows+'행, on='+r.on.join(',')+'  '+(r.rows>0&&r.on.length===1?'✅':'❌'));
await cards[1].click(); await p.waitForTimeout(500);
r=await p.evaluate(()=>({rows:document.querySelectorAll('#gyOpen .gyrow-r').length,
  on:[...document.querySelectorAll('#sgcpiCard .gycard.on')].map(x=>x.dataset.gy)}));
console.log('4 카드2 클릭 → '+r.rows+'행, on='+r.on.join(',')+'  '+(r.on.length===1?'✅ 하나만 열림':'❌'));
await cards[1].click(); await p.waitForTimeout(400);
r=await p.evaluate(()=>document.querySelectorAll('#gyOpen .gyrow-r').length);
console.log('5 같은 카드 재클릭 → '+r+'행  '+(r===0?'✅ 접힘':'❌'));

// 6 학과 행 클릭 → tree 이동
await cards[0].click(); await p.waitForTimeout(500);
await p.click('#gyOpen .gyrow-r'); await p.waitForTimeout(1600);
const view=await p.evaluate(()=>{
  const on=document.querySelector('[data-v].on'); const c=document.querySelector('.dcard.on');
  return {v:on&&on.dataset.v, dept:c&&c.dataset.d};});
console.log('6 학과 행 클릭 → 화면='+view.v+' 학과='+view.dept+'  '+(view.v==='tree'&&view.dept?'✅':'❌'));

// 7 다크 (pool)
await p.click('[data-v="pool"]'); await p.waitForTimeout(1200);
const th=await p.evaluate(()=>document.documentElement.getAttribute('data-theme'));
await p.click('[data-v="exec"]'); await p.waitForTimeout(1500);
await p.evaluate(()=>{try{localStorage.setItem('bk21-theme','dark')}catch(e){};window.paintTheme&&window.paintTheme();});
await p.waitForTimeout(400);
const dk=await p.evaluate(()=>{
 const g=document.querySelector('#sgcpiCard .gband i'); const cs=getComputedStyle(g);
 const card=document.querySelector('.gycard');
 return {theme:document.documentElement.getAttribute('data-theme'),
         band:cs.backgroundColor, cardBg:getComputedStyle(card).backgroundColor,
         lbl:getComputedStyle(card.querySelector('.lb')).color};});
console.log('7 pool 기본 테마='+th+' / 다크 강제='+dk.theme);
console.log('   등급띠 '+dk.band+'  카드배경 '+dk.cardBg+'  라벨 '+dk.lbl);
await p.screenshot({path:SP+'/qa-exec-dark.png'});
await p.evaluate(()=>{try{localStorage.removeItem('bk21-theme')}catch(e){};window.paintTheme&&window.paintTheme();});
await p.waitForTimeout(400); await p.screenshot({path:SP+'/qa-exec.png'});

// 8 좁은 화면
await p.setViewportSize({width:760,height:1000}); await p.waitForTimeout(500);
const narrow=await p.evaluate(()=>{
 const r=document.querySelector('.gyrow'); const b=document.body;
 return {cols:getComputedStyle(r).gridTemplateColumns.split(' ').length,
         hscroll:b.scrollWidth>b.clientWidth+2};});
console.log('8 760px → 계열카드 '+narrow.cols+'열, 가로스크롤 '+(narrow.hscroll?'있음 ❌':'없음 ✅'));
console.log('9 오류 '+(errs.length?'❌ '+errs.slice(0,3).join(' / '):'✅ 없음'));
await b.close();
