import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1700,height:1150}});
await p.route('**://api.openalex.org/**', r=>r.fulfill({status:429,body:'{"error":"Rate limit"}'}));
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html#field=Oncology',{waitUntil:'load',timeout:120000});
await p.waitForTimeout(4000);
const pins=await p.$$('[data-pin]');
console.log('연구자 버튼 '+pins.length+'개');
for(const [lab,want] of [['BK21 참여자',true],['미참여자',false]]){
  let idx=-1;
  for(let i=0;i<Math.min(pins.length,10);i++){
    await pins[i].click(); await p.waitForTimeout(1100);
    const isBk=await p.evaluate(()=>{const t=document.querySelector('.bkb')?.textContent||'';
      return t.includes('참여')&&!t.includes('미참여');});
    if(isBk===want){idx=i;break;}
    await p.evaluate(()=>document.querySelector('[data-mclose]')?.click()); await p.waitForTimeout(250);
  }
  if(idx<0){console.log(`\n═══ ${lab}: 표본에 없음`);continue;}
  await p.waitForTimeout(1500);
  console.log(`\n═══ ${lab} — ${await p.evaluate(()=>document.querySelector('.prcard h3,.rpwrap h3')?.textContent?.trim()||document.querySelector('.prhead h4')?.firstChild?.textContent?.trim())}`);
  for(let i=1;i<=11;i++){
    await p.evaluate(x=>{const e=document.querySelector(`.rpwrap [data-i="${x-1}"]`); if(e)e.click();}, i);
    await p.waitForTimeout(260);
    const v=await p.evaluate(()=>{const pn=document.querySelector('#rp-panel');
      if(!pn) return {none:true};
      const t=pn.innerText.replace(/\s+/g,' ').trim();
      return {len:t.length, svg:pn.querySelectorAll('svg').length,
        shapes:pn.querySelectorAll('svg rect,svg path,svg circle,svg line').length,
        zeros:(t.match(/\b0\b/g)||[]).length, head:t.slice(0,64)};});
    console.log(`  ${String(i).padStart(2,'0')} ${String(v.len).padStart(4)}자 도형${String(v.shapes).padStart(3)} 0의개수${String(v.zeros).padStart(3)}  ${v.head}`);
  }
  await p.evaluate(()=>document.querySelector('[data-mclose]')?.click()); await p.waitForTimeout(300);
}
await b.close();
