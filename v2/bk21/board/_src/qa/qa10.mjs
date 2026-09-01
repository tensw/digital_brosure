import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const SP='/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,180)));
p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('api/config'))errs.push(m.text().slice(0,140));});
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
let tot=0, cards=0;
for(const v of ['sheet','univ','tree','exec','net','glob','pool','exp']){
  await p.click(`[data-v="${v}"]`); await p.waitForTimeout(1700);
  const r=await p.evaluate(vv=>{const root=document.getElementById('v-'+vv);
    if(!root) return {ins:0,cards:0,miss:0};
    const cs=[...root.querySelectorAll('.ecard')];
    return {ins:root.querySelectorAll('.insight').length, cards:cs.length,
      miss:cs.filter(c=>!c.querySelector(':scope > .insight')).length};},v);
  tot+=r.ins; cards+=r.cards;
  console.log(`  ${v.padEnd(6)} 카드 ${String(r.cards).padStart(2)} · 인사이트 ${String(r.ins).padStart(2)} · 미덮 ${r.miss} ${r.miss?'❌':'✅'}`);
}
console.log(`  ─ 합계 카드 ${cards} · 인사이트 ${tot}`);
// pool 노드 클릭 — 노드별 인사이트가 바뀌나
await p.click('[data-v="pool"]'); await p.waitForTimeout(2000);
const ids=await p.evaluate(()=>[...document.querySelectorAll('#pscene g[id]')].map(n=>n.id));
const txts=[];
for(const id of ids.slice(0,3)){
  await p.evaluate(x=>document.querySelector(`#pscene g[id="${x}"]`).dispatchEvent(new MouseEvent('click',{bubbles:true})), id);
  await p.waitForTimeout(450);
  txts.push(id+' → '+(await p.evaluate(()=>{const t=document.querySelector('#ppanel .insight .tx');
    return t?t.textContent.replace(/\s+/g,' ').trim().slice(0,40):'(없음)';})));
}
console.log('  pool 노드별 인사이트 '+(ids.length?'노드 '+ids.length+'개':'노드 선택자 못 찾음'));
txts.forEach(x=>console.log('    '+x+'…'));
// 다크
await p.evaluate(()=>{try{localStorage.setItem('bk21-theme','dark')}catch(e){};window.paintTheme&&window.paintTheme();});
await p.waitForTimeout(500);
console.log('  다크 pool 인사이트 '+await p.evaluate(()=>{
  const i=document.querySelector('#v-pool .insight');
  return i?getComputedStyle(i).backgroundColor+' / 글자 '+getComputedStyle(i.querySelector('.tx')).color:'없음';}));
await p.screenshot({path:SP+'/qa10-pool-dark.png'});
await p.evaluate(()=>{try{localStorage.removeItem('bk21-theme')}catch(e){};window.paintTheme&&window.paintTheme();});
await p.setViewportSize({width:820,height:1000}); await p.waitForTimeout(700);
console.log('  820px 가로스크롤 '+(await p.evaluate(()=>document.body.scrollWidth>document.body.clientWidth+2)?'있음 ❌':'없음 ✅'));
console.log('  오류 '+(errs.length?'❌ '+errs.slice(0,3).join(' / '):'✅ 없음'));
await b.close();
