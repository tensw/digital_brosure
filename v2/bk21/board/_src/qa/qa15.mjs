import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const SP='/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1600,height:1150}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exp"]'); await p.waitForTimeout(2400);
await p.evaluate(()=>document.querySelector('[data-xf],.xrow,[data-fid]')?.click()); await p.waitForTimeout(1700);
const pins=await p.$$('[data-pin]');
// BK21 참여자 찾기
let idx=-1;
for(let i=0;i<Math.min(pins.length,10);i++){
  await pins[i].click(); await p.waitForTimeout(800);
  const bk=await p.evaluate(()=>document.querySelector('.bkb')?.textContent.includes('참여')&&!document.querySelector('.bkb')?.textContent.includes('미참여'));
  await p.evaluate(()=>document.querySelector('[data-mclose]')?.click()); await p.waitForTimeout(300);
  if(bk){idx=i;break;}
}
console.log('1 BK21 참여자 '+(idx>=0?`${idx+1}번째`:'없음'));
if(idx<0){await b.close();process.exit(0);}
await pins[idx].click(); await p.waitForTimeout(2000);
const r=await p.evaluate(()=>{const c=document.querySelector('.prcard');
 return {name:c.querySelector('h3').textContent, gy:c.querySelector('.pcGy')?.textContent,
  sub:c.querySelector('.pcSub').textContent,
  score:c.querySelector('.pcScore').textContent.replace(/\s+/g,' ').trim(),
  chips:[...c.querySelectorAll('.pcChip')].map(x=>x.textContent.trim()).join(' | '),
  mets:[...c.querySelectorAll('.pcMet > div')].map(x=>x.textContent.replace(/\s+/g,' ').trim()),
  works:[...c.querySelectorAll('.pcW')].map(w=>w.className+' '+w.querySelector('.t').textContent.slice(0,32)),
  navf:document.querySelector('.prnf').textContent.replace(/\s+/g,' ').trim()};});
console.log('2 좌측 카드');
console.log('   '+r.name+' ['+r.gy+']  '+r.sub);
console.log('   '+r.score);
console.log('   '+r.chips);
r.mets.forEach(m=>console.log('   '+m));
console.log('   대표작 '+r.works.length+'편');
r.works.forEach(w=>console.log('     '+w));
console.log('3 중간 푸터  '+r.navf);
await p.locator('.prbox').screenshot({path:SP+'/qa15-bk.png'});
// 탭 순회 회귀
for(let i=1;i<=11;i++){
  await p.evaluate(x=>document.querySelector(`[data-prtab="${x}"]`).click(), i);
  await p.waitForTimeout(240);
}
console.log('4 11탭 순회 완료 · 마지막 '+await p.evaluate(()=>document.querySelector('.prvt')?.textContent));
// 다크
await p.evaluate(()=>{try{localStorage.setItem('bk21-theme','dark')}catch(e){};window.paintTheme&&window.paintTheme();});
await p.waitForTimeout(400);
await p.evaluate(()=>document.querySelector('[data-prtab="1"]').click()); await p.waitForTimeout(350);
console.log('5 다크 카드 '+await p.evaluate(()=>getComputedStyle(document.querySelector('.pcTop')).background.slice(0,46)));
await p.locator('.prbox').screenshot({path:SP+'/qa15-dark.png'});
console.log('6 오류 '+(errs.length?'❌ '+errs.slice(0,2).join(' / '):'✅ 없음'));
await b.close();
