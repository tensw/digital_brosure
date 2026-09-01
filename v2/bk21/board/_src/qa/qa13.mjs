import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const SP='/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1100}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exp"]'); await p.waitForTimeout(2400);
await p.evaluate(()=>document.querySelector('[data-xf],.xrow,[data-fid]')?.click()); await p.waitForTimeout(1700);
const pins=await p.$$('[data-pin]'); await pins[0].click(); await p.waitForTimeout(1600);
// 다크
await p.evaluate(()=>{try{localStorage.setItem('bk21-theme','dark')}catch(e){};window.paintTheme&&window.paintTheme();});
await p.waitForTimeout(400);
console.log('1 다크 '+await p.evaluate(()=>{const n=document.querySelector('.prnb.on'),v=document.querySelector('.prview');
  return '메뉴선택 '+getComputedStyle(n).backgroundColor+' · 뷰 '+getComputedStyle(v).backgroundColor
   +' · 배지 '+getComputedStyle(document.querySelector('.bkb')).backgroundColor;}));
await p.locator('.prbox').screenshot({path:SP+'/qa13-dark.png'});
await p.evaluate(()=>{try{localStorage.removeItem('bk21-theme')}catch(e){};window.paintTheme&&window.paintTheme();});
await p.waitForTimeout(350);
// 좁은 화면
await p.setViewportSize({width:780,height:1000}); await p.waitForTimeout(600);
console.log('2 780px 메뉴 '+await p.evaluate(()=>
  getComputedStyle(document.querySelector('.prtabs')).gridTemplateColumns.split(' ').length)+'열 · 팝업 가로스크롤 '
  +(await p.evaluate(()=>{const b=document.querySelector('.prbox');return b.scrollWidth>b.clientWidth+2;})?'있음 ❌':'없음 ✅'));
await p.locator('.prbox').screenshot({path:SP+'/qa13-narrow.png'});
await p.setViewportSize({width:1500,height:1100}); await p.waitForTimeout(500);
// 탭 유지 → 닫고 다시 열면 01 로
await p.evaluate(()=>document.querySelector('[data-prtab="5"]').click()); await p.waitForTimeout(300);
await p.evaluate(()=>document.querySelector('[data-mclose]')?.click()); await p.waitForTimeout(400);
await pins[1].click(); await p.waitForTimeout(1400);
console.log('3 재오픈 시 첫 탭 '+await p.evaluate(()=>document.querySelector('.prvh .no')?.textContent)
  +' '+((await p.evaluate(()=>document.querySelector('.prvh .no')?.textContent))==='01'?'✅':'❌'));
console.log('4 오류 '+(errs.length?'❌ '+errs.slice(0,2).join(' / '):'✅ 없음'));
await b.close();
