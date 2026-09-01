import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const SP=process.env.SP;
const p=await b.newPage({viewport:{width:1600,height:1000}});
const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+String(e).slice(0,120)));
p.on('console',m=>{if(m.type()==='error')errs.push(String(m.text()).slice(0,120))});
const failed=[]; p.on('requestfailed',r=>failed.push(r.url().slice(0,70)));
await p.goto('file:///Users/karis/dev/bibloai-homepage/v2/bk21/board/index.html',
  {waitUntil:'domcontentloaded', timeout:60000});
await p.waitForTimeout(4000);
const r=await p.evaluate(()=>({
  제목:document.title,
  본문글자:document.body.innerText.length,
  화면수:document.querySelectorAll('[data-cid]').length,
  h1:[...document.querySelectorAll('h1')].map(h=>h.textContent.trim().slice(0,40)).slice(0,4)
}));
console.log(JSON.stringify(r,null,1));
console.log('실패한 요청:', failed.length?failed.slice(0,5):'없음');
console.log('에러:', errs.length?errs.slice(0,5):'없음');
await p.screenshot({path:`${SP}/board.png`});
await b.close();
