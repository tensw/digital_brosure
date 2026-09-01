import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000}});
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exec"]'); await p.waitForTimeout(2600);
console.log('exec 직계 인사이트 없는 카드:');
console.log(await p.evaluate(()=>[...document.querySelectorAll('#v-exec .ecard')]
 .filter(c=>!c.querySelector(':scope > .insight'))
 .map(c=>{const h=c.querySelector('h3');
  const prev=c.previousElementSibling;
  return (h?h.textContent.replace(/\s+/g,' ').trim().slice(0,24):'?')+
    '  ← 앞형제:'+(prev?prev.className.slice(0,22):'없음');})));
await p.click('[data-v="pool"]'); await p.waitForTimeout(2200);
console.log('pool 노드 선택자:');
console.log(await p.evaluate(()=>{
 const g=document.querySelectorAll('#pscene g, #pscene [data-id], #pscene [data-pid], #pscene [id^="pn"]');
 const s=new Set(); [...g].slice(0,40).forEach(n=>s.add(n.tagName+':'+
   [...n.attributes].map(a=>a.name).filter(a=>a.startsWith('data')||a==='id'||a==='class').join(',')));
 return [...s].slice(0,8);}));
await b.close();
