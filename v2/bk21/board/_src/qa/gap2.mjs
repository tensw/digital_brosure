import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1700,height:1150}});
await p.route('**://api.openalex.org/**', r=>r.fulfill({status:429,body:'{}'}));
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html#field=Oncology',{waitUntil:'load',timeout:120000});
await p.waitForTimeout(3500);
const pins=await p.$$('[data-pin]');
for(let i=0;i<8;i++){await pins[i].click();await p.waitForTimeout(950);
 if(await p.evaluate(()=>{const t=document.querySelector('.bkb')?.textContent||'';return t.includes('참여')&&!t.includes('미참여');})) break;
 await p.evaluate(()=>document.querySelector('[data-mclose]')?.click());await p.waitForTimeout(250);}
await p.waitForTimeout(1200);
const gaps=(sel,label)=>p.evaluate(([s,l])=>{
  const root=document.querySelector(s); if(!root) return {l,none:true};
  const ks=[...root.children].filter(e=>e.getBoundingClientRect().height>2);
  const out=[];
  for(let i=0;i<ks.length;i++){
    const r=ks[i].getBoundingClientRect();
    const cs=getComputedStyle(ks[i]);
    out.push({cls:(ks[i].className||ks[i].tagName).toString().slice(0,20),
      h:Math.round(r.height), mt:cs.marginTop, mb:cs.marginBottom,
      gap:i? Math.round(r.top-(ks[i-1].getBoundingClientRect().bottom)):null});
  }
  return {l, pad:getComputedStyle(root).padding, gap:getComputedStyle(root).rowGap, kids:out};
},[sel,label]);
for(const [s,l] of [['#rp-panel','우측 패널 직계'],['#rp-panel .body','패널 본문(.body)'],['.rpwrap .phone','폰 카드']]){
  const r=await gaps(s,l);
  console.log(`\n══ ${l}${r.none?' — 없음':''}`);
  if(r.none) continue;
  console.log(`   padding ${r.pad} · row-gap ${r.gap}`);
  r.kids.forEach(k=>console.log(`   ${String(k.gap==null?'-':k.gap).padStart(4)}px  ${k.cls.padEnd(20)} h${String(k.h).padStart(4)} mt${k.mt} mb${k.mb}`));
}
await b.close();
