import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const SP='/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1100}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,170)));
p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('api/config'))errs.push(m.text().slice(0,140));});
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exec"]'); await p.waitForTimeout(3000);

const r=await p.evaluate(()=>{
 const svg=document.querySelector('#radarCard svg.radar');
 const polys=[...svg.querySelectorAll('polygon')].filter(x=>x.getAttribute('fill')!=='none');
 const seg=[...svg.querySelectorAll('line')].filter(l=>l.getAttribute('stroke-width')==='3');
 const dashed=[...svg.querySelectorAll('line[stroke-dasharray]')];
 const rows=[...document.querySelectorAll('#radarCard .areat tbody tr')];
 const items=rows.filter(t=>!t.classList.contains('ah'));
 const heads=rows.filter(t=>t.classList.contains('ah')).map(t=>t.textContent.replace(/\s+/g,' ').trim());
 return {series:polys.length, seg:seg.length, dashedAxes:dashed.length,
  n:items.length, ok:items.filter(t=>t.querySelector('.ok')).length,
  okRows:items.filter(t=>t.querySelector('.ok')).map(t=>t.cells[0].textContent.trim()+' = '+t.cells[1].textContent.trim()),
  heads, cards:[...document.querySelectorAll('#sgcpiCard .gycard')].map(c=>
    c.querySelector('.lb').textContent+' '+[...c.querySelectorAll('.rqx')].map(x=>x.textContent.replace(/\s+/g,' ').trim()).join(' // '))};
});
console.log('1 레이더 계열 폴리곤 '+r.series+'개 '+(r.series===3?'✅':'❌')+'  단축선 '+r.seg+'  점선축 '+r.dashedAxes+' (LQ 하나만이어야 함) '+(r.dashedAxes===1?'✅':'❌'));
console.log('2 영역 헤더  '+r.heads.join(' | '));
console.log('3 지표 '+r.n+'개 · 산출 '+r.ok+'개 '+(r.n===29&&r.ok===7?'✅':'❌'));
r.okRows.forEach(x=>console.log('   '+x));
console.log('4 계열 카드');
r.cards.forEach(x=>console.log('   '+x));
await p.locator('#radarCard').screenshot({path:SP+'/qa6-radar.png'});
await p.locator('#sgcpiCard').screenshot({path:SP+'/qa6-cards.png'});
// 아코디언 · 이동 회귀
const cards=await p.$$('#sgcpiCard .gycard');
await cards[0].click(); await p.waitForTimeout(500);
console.log('5 펼침 학과 '+(await p.$$('#gyOpen .gyrow-r')).length+'행');
await p.click('#gyOpen .gyrow-r'); await p.waitForTimeout(1600);
console.log('6 학과 이동 '+await p.evaluate(()=>{const v=document.querySelector('[data-v].on');
  const c=document.querySelector('.dcard.on'); return (v&&v.dataset.v)+' / '+(c&&c.dataset.d);}));
// 다크 + 좁은 화면
await p.click('[data-v="exec"]'); await p.waitForTimeout(1800);
await p.evaluate(()=>{try{localStorage.setItem('bk21-theme','dark')}catch(e){};window.paintTheme&&window.paintTheme();});
await p.waitForTimeout(400);
await p.locator('#radarCard').screenshot({path:SP+'/qa6-radar-dark.png'});
console.log('7 다크 폴리곤 stroke '+await p.evaluate(()=>{
  const q=[...document.querySelectorAll('#radarCard polygon')].filter(x=>x.getAttribute('fill')!=='none')[0];
  return q?getComputedStyle(q).stroke:'없음';}));
await p.evaluate(()=>{try{localStorage.removeItem('bk21-theme')}catch(e){};window.paintTheme&&window.paintTheme();});
await p.setViewportSize({width:820,height:1000}); await p.waitForTimeout(600);
console.log('8 820px 가로스크롤 '+(await p.evaluate(()=>document.body.scrollWidth>document.body.clientWidth+2)?'있음 ❌':'없음 ✅'));
console.log('9 오류 '+(errs.length?'❌ '+errs.slice(0,3).join(' / '):'✅ 없음'));
await b.close();
