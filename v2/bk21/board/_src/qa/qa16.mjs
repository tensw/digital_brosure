import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const SP='/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1600,height:1150}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exp"]'); await p.waitForTimeout(2400);
await p.evaluate(()=>document.querySelector('[data-xf],.xrow,[data-fid]')?.click()); await p.waitForTimeout(1800);
const pins=await p.$$('[data-pin]');
// 비참여자 찾기
let idx=-1, nm='';
for(let i=0;i<Math.min(pins.length,10);i++){
  await pins[i].click(); await p.waitForTimeout(1500);
  const r=await p.evaluate(()=>({b:document.querySelector('.bkb')?.textContent||'',
    n:document.querySelector('.prcard h3')?.textContent}));
  if(r.b.includes('미참여')){idx=i;nm=r.n;break;}
  await p.evaluate(()=>document.querySelector('[data-mclose]')?.click()); await p.waitForTimeout(300);
}
console.log('비참여자: '+nm+' ('+(idx+1)+'번째)');
await p.waitForTimeout(2600);   // OpenAlex 수신 대기
for(let i=1;i<=11;i++){
  await p.evaluate(x=>document.querySelector(`[data-prtab="${x}"]`).click(), i);
  await p.waitForTimeout(340);
  const v=await p.evaluate(()=>{const b=document.querySelector('.prview');
    const e=b.querySelector('.prempty b');
    const t=b.textContent.replace(/\s+/g,' ').trim();
    return {t:document.querySelector('.prvt')?.textContent, empty:e?e.textContent.trim():null,
      len:t.length, head:t.slice(t.indexOf('→')+1,t.indexOf('→')+95)};});
  console.log(`${String(i).padStart(2,'0')} ${v.t}`);
  console.log(`   ${v.empty?'❌ 미수집 — '+v.empty:'✅ '+v.len+'자'}`);
  if(!v.empty&&v.head) console.log(`   ${v.head.trim()}…`);
}
await p.evaluate(()=>document.querySelector('[data-prtab="2"]').click()); await p.waitForTimeout(400);
await p.locator('.prbox').screenshot({path:SP+'/qa16-nonbk.png'});
console.log('오류 '+(errs.length?'❌ '+errs.slice(0,2).join(' / '):'✅ 없음'));
await b.close();
