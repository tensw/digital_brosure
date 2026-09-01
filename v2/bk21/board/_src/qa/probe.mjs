import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000}});
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="tree"]'); await p.waitForTimeout(1500);
console.log('학과카드', (await p.$$('.dcard')).length);
await p.click('.dcard'); await p.waitForTimeout(1500);
console.log(await p.evaluate(()=>{
  const tb=document.getElementById('tb');
  const kids=[...(tb?tb.children:[])].slice(0,3).map(e=>e.tagName+'.'+e.className);
  const withSid=[...document.querySelectorAll('[data-sid]')].length;
  const rows=[...document.querySelectorAll('#tb .row,#tb .tw,#tb .th')].length;
  const clickable=[...document.querySelectorAll('#tb [onclick],#tb button,#tb .nmw')].length;
  const sample=tb? tb.innerHTML.slice(0,420):'(tb 없음)';
  return {kids,withSid,rows,clickable,sample};
}));
await b.close();
