import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1900,height:1250}});
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exp"]'); await p.waitForTimeout(2400);
await p.evaluate(()=>document.querySelector('[data-xf],.xrow,[data-fid]')?.click()); await p.waitForTimeout(1800);
const pins=await p.$$('[data-pin]'); await pins[0].click(); await p.waitForTimeout(3000);
console.log(await p.evaluate(()=>{
 const s=document.querySelector('.rpwrap .menu .search'), c=getComputedStyle(s);
 const hits=[];
 for(const sh of document.styleSheets){let rs;try{rs=sh.cssRules}catch(e){continue}
  const walk=l=>{for(const x of l){ if(x.type===4){if(matchMedia(x.conditionText).matches) walk(x.cssRules);}
   else if(x.selectorText&&/(^|[\s,])\.search([\s,.:{]|$)/.test(x.selectorText))
     hits.push(x.selectorText+' → '+(x.style.cssText||'').slice(0,110));}};
  walk(rs);}
 return {h:Math.round(s.getBoundingClientRect().height),
   flex:c.flex, flexGrow:c.flexGrow, padding:c.padding, minHeight:c.minHeight, display:c.display,
   rules:hits};}));
await b.close();
