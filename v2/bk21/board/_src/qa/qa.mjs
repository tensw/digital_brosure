import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const SP='/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad';
const URL='file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000}});
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,140));});
p.on('pageerror',e=>errs.push('PAGEERROR '+String(e).slice(0,180)));
await p.goto(URL,{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
console.log('1 로딩  ✅  탭', await p.$$eval('[data-v]',n=>n.map(x=>x.dataset.v).join(' ')));

// tree 화면 → 학과 → 교수 개인창
await p.click('[data-v="tree"]'); await p.waitForTimeout(1500);
const dcard=await p.$('.dcard'); if(dcard){await dcard.click(); await p.waitForTimeout(1200);}
const opened=await p.evaluate(()=>{
  const el=document.querySelector('.pn[data-p]'); if(!el) return null;
  el.click(); return true;
});
await p.waitForTimeout(1500);
const drw=await p.$('#drw.on');
console.log('2 개인창 열림 ', drw?'✅':'❌ (클릭 대상 못 찾음)');
if(drw){
  const r=await p.evaluate(()=>{
    const q=s=>document.querySelector(s);
    const boxes=[...document.querySelectorAll('#drw .dbox')].map(b=>
      b.querySelector('.l').textContent+'='+b.querySelector('.n').textContent.trim());
    const band=[...document.querySelectorAll('#drw .gband i')].map(i=>i.className);
    const rows=document.querySelectorAll('#drw .pbreak tbody tr').length;
    const more=q('#brkMore');
    const foot=q('#brkSec')?q('#brkSec').textContent.match(/환산점수\s*([\d.]+)/):null;
    let sum=0; document.querySelectorAll('#drw .pbreak tbody tr td:last-child b')
      .forEach(b=>sum+=parseFloat(b.textContent));
    const gtags=[...document.querySelectorAll('#drw .pbreak .gtag')].slice(0,4)
      .map(g=>g.textContent+'/'+g.className);
    const whys=[...document.querySelectorAll('#drw .pbreak .bw')].slice(0,4).map(w=>w.textContent);
    return {name:q('#drw h2')?.textContent, sub:q('#drw .sub')?.textContent.split('\n')[0].trim(),
            boxes,band,rows,more:more&&!more.hidden?more.textContent:'(없음/전부표시)',
            footS:foot&&foot[1],visibleSum:sum.toFixed(1),gtags,whys};
  });
  console.log('3 지표박스 '+r.boxes.length+'개  '+(r.boxes.length===6?'✅':'❌'));
  r.boxes.forEach(x=>console.log('    '+x));
  console.log('4 소속표기  '+r.sub);
  console.log('5 등급 띠  '+(r.band.length?'✅ '+r.band.join(' '):'❌ 없음'));
  console.log('6 내역 표 행수 '+r.rows+'  '+(r.rows<=30?'✅ 30행 이하':'❌')+'   더보기: '+r.more);
  console.log('7 등급배지  '+r.gtags.join('  '));
  console.log('  판정근거  '+r.whys.join(' | '));
  console.log('8 합계 표기 '+r.footS+' (화면 표시분 합 '+r.visibleSum+' — 페이징이라 작아야 정상)');
  await p.screenshot({path:SP+'/qa-person.png',fullPage:false});
}
console.log('9 콘솔 오류 '+(errs.length?'❌ '+errs.slice(0,4).join(' / '):'✅ 없음'));
await b.close();
