import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const SP='/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1700,height:1200}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,220)));
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exp"]'); await p.waitForTimeout(2400);
await p.evaluate(()=>document.querySelector('[data-xf],.xrow,[data-fid]')?.click()); await p.waitForTimeout(1800);
const pins=await p.$$('[data-pin]');
for(const [label,pick] of [['참여자',async()=>{for(let i=0;i<10;i++){await pins[i].click();await p.waitForTimeout(900);
   if(await p.evaluate(()=>{const t=document.querySelector('.bkb')?.textContent||'';return t.includes('참여')&&!t.includes('미참여');})) return i;
   await p.evaluate(()=>document.querySelector('[data-mclose]')?.click());await p.waitForTimeout(250);} return -1;}],
  ['미참여자',async()=>{for(let i=0;i<10;i++){await pins[i].click();await p.waitForTimeout(900);
   if(await p.evaluate(()=>(document.querySelector('.bkb')?.textContent||'').includes('미참여'))) return i;
   await p.evaluate(()=>document.querySelector('[data-mclose]')?.click());await p.waitForTimeout(250);} return -1;}]]){
 const idx=await pick(); if(idx<0){console.log(label+' 없음');continue;}
 await p.waitForTimeout(2600);
 console.log('═══ '+label+' — '+await p.evaluate(()=>document.querySelector('.ph-name,.phone h3,.phone h2')?.textContent?.trim()||document.querySelector('.prhead h4')?.firstChild?.textContent?.trim()));
 for(let i=1;i<=11;i++){
  await p.evaluate(x=>{const b2=document.querySelector(`.rpwrap [data-i="${x-1}"]`); if(b2) b2.click();}, i);
  await p.waitForTimeout(320);
  const v=await p.evaluate(()=>{const pn=document.querySelector('#rp-panel');
    return {t:pn.querySelector('.pt,h3,.cttl')?.textContent?.trim().slice(0,26),
      len:pn.textContent.replace(/\s+/g,' ').trim().length,
      svg:pn.querySelectorAll('svg').length, rect:pn.querySelectorAll('svg rect,svg path,svg circle,svg line').length,
      ec:pn.querySelectorAll('.ec').length, nan:/NaN|undefined|Infinity/.test(pn.textContent)};});
  console.log(`  ${String(i).padStart(2,'0')} ${String(v.len).padStart(4)}자 · SVG ${v.svg} 도형 ${String(v.rect).padStart(3)} · 근거 ${v.ec}${v.nan?'  ❌ NaN/undefined':''}`);
 }
 try{await p.screenshot({path:`${SP}/qa21-${label}.png`});}catch(e){}
 await p.evaluate(()=>document.querySelector('[data-mclose]')?.click()); await p.waitForTimeout(400);
}
console.log('오류 '+(errs.length?'❌ '+errs.slice(0,3).join(' / '):'✅ 없음'));
await b.close();
