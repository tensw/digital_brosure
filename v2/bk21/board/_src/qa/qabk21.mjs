import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const SP=process.env.SP;
const p=await b.newPage({viewport:{width:1100,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('file:///Users/karis/dev/bibloai-homepage/v2/bk21/index.html',{waitUntil:'load'});
await p.waitForTimeout(400);
const r=await p.evaluate(()=>({제목:document.title,
  링크:[...document.querySelectorAll('a.card')].map(a=>a.getAttribute('href')),
  가로스크롤:document.documentElement.scrollWidth>innerWidth+1}));
console.log(JSON.stringify(r,null,1));
console.log('에러:',errs.length?errs:'없음');
await p.screenshot({path:`${SP}/bk21-index.png`,fullPage:true});
await b.close();
