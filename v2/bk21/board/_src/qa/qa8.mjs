import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const SP='/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1100}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('api/config'))errs.push(m.text().slice(0,150));});
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});

await p.click('[data-v="exec"]'); await p.waitForTimeout(3000);
const ex=await p.evaluate(()=>{
 const ins=[...document.querySelectorAll('#v-exec .insight')];
 const cards=[...document.querySelectorAll('#v-exec .ecard')];
 const covered=cards.filter(c=>c.querySelector(':scope > .insight')||
   (c.previousElementSibling&&c.previousElementSibling.classList.contains('insight'))).length;
 return {n:ins.length, cards:cards.length, covered,
  heads:cards.map(c=>{const h=c.querySelector('h3');
    const has=!!(c.querySelector(':scope > .insight')||
      (c.previousElementSibling&&c.previousElementSibling.classList.contains('insight')));
    return (has?'✅ ':'❌ ')+(h?h.textContent.replace(/\s+/g,' ').trim().slice(0,26):'(제목없음)');}),
  first:ins[0]?ins[0].querySelector('.tx').textContent.replace(/\s+/g,' ').trim().slice(0,60):''};
});
console.log('1 exec 인사이트 '+ex.n+'개 · 카드 '+ex.cards+'장 중 '+ex.covered+'장 덮음');
ex.heads.forEach(x=>console.log('   '+x));
await p.locator('#v-exec').screenshot({path:SP+'/qa8-exec.png'});

await p.click('[data-v="pool"]'); await p.waitForTimeout(2200);
console.log('2 pool 인사이트 '+(await p.$$('#missCard .insight')).length+'개  (다크 배경 '+
  await p.evaluate(()=>{const i=document.querySelector('#missCard .insight');
    return i?getComputedStyle(i).backgroundColor:'없음';})+')');

await p.click('[data-v="tree"]'); await p.waitForTimeout(1500);
await p.click('.dcard'); await p.waitForTimeout(1400);
await p.evaluate(()=>document.querySelector('.pn[data-p]').click()); await p.waitForTimeout(1600);
const pr=await p.evaluate(()=>({n:document.querySelectorAll('#drw .insight').length,
  txt:[...document.querySelectorAll('#drw .insight .tx')].map(x=>x.textContent.replace(/\s+/g,' ').trim().slice(0,48))}));
console.log('3 개인창 인사이트 '+pr.n+'개');
pr.txt.forEach(x=>console.log('   '+x+'…'));
await p.screenshot({path:SP+'/qa8-person.png'});
await p.evaluate(()=>{const x=document.getElementById('drwX'); if(x) x.click();});
await p.waitForTimeout(700);

await p.click('[data-v="exec"]'); await p.waitForTimeout(2000);
await p.evaluate(()=>{try{localStorage.setItem('bk21-theme','dark')}catch(e){};window.paintTheme&&window.paintTheme();});
await p.waitForTimeout(400);
console.log('4 다크 인사이트 배경 '+await p.evaluate(()=>{
  const i=document.querySelector('#v-exec .insight'), c=getComputedStyle(i);
  return c.backgroundColor+' 글자 '+getComputedStyle(i.querySelector('.tx')).color;}));
console.log('5 다크 미수집카드 '+await p.evaluate(()=>{
  const c=document.querySelector('.areacard.dim'); return c?getComputedStyle(c).backgroundColor:'없음';}));
await p.locator('#radarCard').screenshot({path:SP+'/qa8-radar-dark.png'});
await p.evaluate(()=>{try{localStorage.removeItem('bk21-theme')}catch(e){};window.paintTheme&&window.paintTheme();});
await p.setViewportSize({width:820,height:1000}); await p.waitForTimeout(700);
console.log('6 820px 가로스크롤 '+(await p.evaluate(()=>document.body.scrollWidth>document.body.clientWidth+2)?'있음 ❌':'없음 ✅')
  +' · 영역카드 '+await p.evaluate(()=>getComputedStyle(document.querySelector('.areagrid')).gridTemplateColumns.split(' ').length)+'열');
console.log('7 오류 '+(errs.length?'❌ '+errs.slice(0,3).join(' / '):'✅ 없음'));
await b.close();
