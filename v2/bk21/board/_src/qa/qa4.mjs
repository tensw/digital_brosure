import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const SP='/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1100}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,170)));
p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('api/config'))errs.push(m.text().slice(0,140));});
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exec"]'); await p.waitForTimeout(2800);

console.log('1 배지  '+await p.$$eval('.ehead .pill',n=>n.map(x=>x.textContent.trim()).join(' | ')));
console.log('2 카드 제목  '+await p.$eval('#sgcpiCard h3',n=>n.textContent.replace(/\s+/g,' ').trim()));
console.log('3 RQ 3분해  '+await p.$$eval('#sgcpiCard .rqx',n=>n.map(x=>x.textContent.replace(/\s+/g,' ').trim()).join('  /  ')));

const r=await p.evaluate(()=>{
 const c=document.getElementById('radarCard'); if(!c) return null;
 const svg=c.querySelector('svg.radar');
 const polys=[...svg.querySelectorAll('polygon')].length;
 const dashed=[...svg.querySelectorAll('line[stroke-dasharray]')].length;
 const labels=[...svg.querySelectorAll('text')].map(t=>t.textContent);
 const rows=[...c.querySelectorAll('.areat tbody tr')];
 const heads=rows.filter(t=>t.classList.contains('ah')).map(t=>t.textContent.replace(/\s+/g,' ').trim());
 const okN=rows.filter(t=>t.querySelector('.ok')).length;
 const noN=rows.filter(t=>t.querySelector('.no')).length;
 return {polys,dashed,labels,heads,okN,noN,w:svg.getBoundingClientRect().width};
});
console.log('4 레이더  '+(r?'✅':'❌ 없음'));
if(r){
 console.log('   폴리곤(링4+계열3='+r.polys+')  미수집축 점선 '+r.dashed+'개  폭 '+Math.round(r.w)+'px');
 console.log('   축 라벨  '+r.labels.join(' '));
 console.log('5 영역 헤더  '+r.heads.join(' | '));
 console.log('6 지표 산출 '+r.okN+'개 · 미수집 '+r.noN+'개  (합 '+(r.okN+r.noN)+' = 25 '+((r.okN+r.noN)===25?'✅':'❌')+')');
}
const ai=await p.evaluate(()=>{
 const c=document.getElementById('aiCard'); if(!c) return null;
 return {rows:c.querySelectorAll('.areat tbody tr').length,
  bars:c.querySelectorAll('.aibar').length,
  aidept:[...c.querySelectorAll('.aibar .pill')].length,
  top:[...c.querySelectorAll('.aibar')].slice(0,3).map(x=>
    x.querySelector('.k').textContent.trim()+' '+x.querySelector('.v').textContent)};
});
console.log('7 AI 단면  '+(ai?`✅ 지표 ${ai.rows}행 · 학과막대 ${ai.bars}개 · AI관련학과 배지 ${ai.aidept}개`:'❌'));
if(ai) console.log('   상위  '+ai.top.join('  |  '));

// 다크
await p.evaluate(()=>{try{localStorage.setItem('bk21-theme','dark')}catch(e){};window.paintTheme&&window.paintTheme();});
await p.waitForTimeout(400);
const dk=await p.evaluate(()=>{const g=document.querySelector('#radarCard polygon[fill^="var"],#radarCard polygon:not([fill="none"])');
 return {ring:getComputedStyle(document.querySelector('#radarCard polygon')).stroke,
   bar:getComputedStyle(document.querySelector('#aiCard .aibar .b i')).backgroundColor};});
console.log('8 다크  링 '+dk.ring+'  AI막대 '+dk.bar);
await p.screenshot({path:SP+'/qa4-dark.png',fullPage:false});
await p.evaluate(()=>{try{localStorage.removeItem('bk21-theme')}catch(e){};window.paintTheme&&window.paintTheme();});
await p.waitForTimeout(400);
await p.locator('#radarCard').screenshot({path:SP+'/qa4-radar.png'});
await p.locator('#aiCard').screenshot({path:SP+'/qa4-ai.png'});

// 개인창 회귀 — AI 배지가 이제 떠야 한다
await p.click('[data-v="tree"]'); await p.waitForTimeout(1500);
await p.click('.dcard'); await p.waitForTimeout(1400);
await p.evaluate(()=>document.querySelector('.pn[data-p]').click()); await p.waitForTimeout(1500);
const pr=await p.evaluate(()=>({
 boxes:document.querySelectorAll('#drw .dbox').length,
 aiBadge:document.querySelectorAll('#drw .pbreak .pill.px').length,
 aiLine:(document.querySelector('#drw .gkey + .gkey')||{}).textContent||'',
 confRow:[...document.querySelectorAll('#drw .pbreak tbody tr')]
   .filter(t=>/학술대회/.test(t.textContent)).slice(0,1)
   .map(t=>t.textContent.replace(/\s+/g,' ').trim().slice(0,90))}));
console.log('9 개인창 박스 '+pr.boxes+' · AI 배지 '+pr.aiBadge+'개');
console.log('   AI 줄  '+pr.aiLine.trim());
if(pr.confRow.length) console.log('   학회 행  '+pr.confRow[0]);
await p.screenshot({path:SP+'/qa4-person.png'});
// 좁은 화면
await p.setViewportSize({width:820,height:1000}); await p.waitForTimeout(500);
console.log('10 820px 가로스크롤 '+(await p.evaluate(()=>document.body.scrollWidth>document.body.clientWidth+2)?'있음 ❌':'없음 ✅'));
console.log('11 오류 '+(errs.length?'❌ '+errs.slice(0,3).join(' / '):'✅ 없음'));
await b.close();
