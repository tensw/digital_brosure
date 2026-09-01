import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const SP='/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1600,height:1150}});
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exp"]'); await p.waitForTimeout(2400);
await p.evaluate(()=>document.querySelector('[data-xf],.xrow,[data-fid]')?.click()); await p.waitForTimeout(1800);
const pins=await p.$$('[data-pin]');
let idx=-1;
for(let i=0;i<Math.min(pins.length,10);i++){
  await pins[i].click(); await p.waitForTimeout(1400);
  if(await p.evaluate(()=>(document.querySelector('.bkb')?.textContent||'').includes('미참여'))){idx=i;break;}
  await p.evaluate(()=>document.querySelector('[data-mclose]')?.click()); await p.waitForTimeout(300);
}
await p.waitForTimeout(2800);
const r=await p.evaluate(()=>{
 const c=document.querySelector('.prcard'), n=document.querySelector('.prnav'), v=document.querySelector('.prview');
 const R=e=>Math.round(e.getBoundingClientRect().height);
 return {name:c.querySelector('h3').textContent,
  cardH:R(c), cardContentH:Math.round(c.scrollHeight), fill:Math.round(c.scrollHeight/R(c)*100),
  navH:R(n), navContent:Math.round(n.scrollHeight), navCut:n.scrollHeight>n.clientHeight+2,
  viewH:R(v), viewContent:Math.round(v.scrollHeight),
  mets:[...c.querySelectorAll('.pcMet > div')].map(x=>x.textContent.replace(/\s+/g,' ').trim()),
  sec:c.querySelector('.pcSec')?.textContent.replace(/\s+/g,' ').trim(),
  works:c.querySelectorAll('.pcW').length,
  ident:[...v.querySelectorAll('.prcell')].map(x=>x.textContent.replace(/\s+/g,' ').trim()),
  fn:!!v.querySelector('.prfn'), empty:v.querySelectorAll('.prempty').length};});
console.log('대상: '+r.name);
console.log('1 좌측 카드  높이 '+r.cardH+' / 내용 '+r.cardContentH+' → 채움 '+r.fill+'% '+(r.fill>=88?'✅':'❌'));
r.mets.forEach(m=>console.log('   지표 '+m));
console.log('   섹션 '+r.sec+' · 논문 '+r.works+'편 '+(r.works>0?'✅':'❌'));
console.log('2 중간 메뉴  높이 '+r.navH+' / 내용 '+r.navContent+' · 잘림 '+(r.navCut?'있음 ❌':'없음 ✅'));
console.log('3 우측  높이 '+r.viewH+' / 내용 '+r.viewContent);
r.ident.forEach(x=>console.log('   '+x));
console.log('   각주 '+(r.fn?'✅':'❌')+' · 점선상자 '+r.empty+(r.empty?' ❌':' ✅'));
await p.locator('.prbox').screenshot({path:SP+'/qa17.png'});
await b.close();
