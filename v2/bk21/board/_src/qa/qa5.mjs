import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const SP='/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1100}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,170)));
p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('api/config'))errs.push(m.text().slice(0,140));});
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exec"]'); await p.waitForTimeout(2800);

const r=await p.evaluate(()=>{
 const svg=document.querySelector('#radarCard svg.radar');
 const thick=[...svg.querySelectorAll('line')].filter(l=>l.getAttribute('stroke-width')==='3');
 const rows=[...document.querySelectorAll('#radarCard .areat tbody tr')];
 const items=rows.filter(t=>!t.classList.contains('ah'));
 return {axisLines:thick.length, colors:thick.map(l=>l.getAttribute('stroke')),
   n:items.length, ok:items.filter(t=>t.querySelector('.ok')).length,
   foot:document.querySelector('#radarCard .radtb .radn').textContent.replace(/\s+/g,' ').trim(),
   rqRows:items.filter(t=>t.querySelector('.ok'))
     .map(t=>t.cells[0].textContent.trim()+' = '+t.cells[1].textContent.trim())};
});
console.log('1 레이더 계열 축선 '+r.axisLines+'개 '+(r.axisLines===3?'✅':'❌')+'  '+r.colors.join(' '));
console.log('2 지표 '+r.n+'개 · 산출 '+r.ok+'개  '+(r.n===29&&r.ok===5?'✅':'❌'));
console.log('3 산출 지표 값');
r.rqRows.forEach(x=>console.log('   '+x));
console.log('4 각주  '+r.foot);

// 개인창 — AI 배지가 실제로 렌더되는 사람을 찾는다
await p.click('[data-v="tree"]'); await p.waitForTimeout(1500);
await p.click('.dcard'); await p.waitForTimeout(1400);
const found=await p.evaluate(async()=>{
 const btns=[...document.querySelectorAll('.pn[data-p]')].slice(0,14);
 for(const btn of btns){
  btn.click(); await new Promise(r=>setTimeout(r,420));
  const badges=document.querySelectorAll('#drw .pbreak .pill.px').length;
  const conf=[...document.querySelectorAll('#drw .pbreak tbody tr')]
    .filter(t=>/학술대회/.test(t.textContent));
  if(badges||conf.length) return {name:document.querySelector('#drw h2').textContent,
    badges, conf:conf.length,
    confRow:conf.length?conf[0].textContent.replace(/\s+/g,' ').trim().slice(0,84):'',
    aiRow:[...document.querySelectorAll('#drw .pbreak tbody tr')]
      .filter(t=>t.querySelector('.pill.px')).slice(0,1)
      .map(t=>t.textContent.replace(/\s+/g,' ').trim().slice(0,84))[0]||''};
 }
 return null;
});
console.log('5 개인창 AI 배지·학회 행  '+(found?`✅ ${found.name} — AI배지 ${found.badges} · 학회행 ${found.conf}`:'❌ 14명 안에서 못 찾음'));
if(found){ if(found.aiRow) console.log('   AI  '+found.aiRow);
           if(found.confRow) console.log('   학회 '+found.confRow); }
await p.screenshot({path:SP+'/qa5-person.png'});
console.log('6 오류 '+(errs.length?'❌ '+errs.slice(0,3).join(' / '):'✅ 없음'));
await b.close();
