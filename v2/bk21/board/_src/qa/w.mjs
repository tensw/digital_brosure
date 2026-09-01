import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1600,height:1100}});
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exp"]'); await p.waitForTimeout(2400);
await p.evaluate(()=>document.querySelector('[data-xf],.xrow,[data-fid]')?.click()); await p.waitForTimeout(1700);
await p.evaluate(()=>document.querySelector('[data-pin]')?.click()); await p.waitForTimeout(1800);
console.log(await p.evaluate(()=>{
 const b=document.querySelector('.prbox'), c=getComputedStyle(b);
 const hits=[];
 for(const sh of document.styleSheets){let rs;try{rs=sh.cssRules}catch(e){continue}
  const walk=l=>{for(const x of l){ if(x.type===4){ if(matchMedia(x.conditionText).matches) walk(x.cssRules);}
    else if(x.selectorText&&/prbox|\.mbox/.test(x.selectorText)&&(x.style.maxWidth||x.style.width))
      hits.push(x.selectorText+' → mw:'+x.style.maxWidth+' w:'+x.style.width);}};
  walk(rs);}
 return {cls:b.className, maxW:c.maxWidth, w:c.width, box:b.getBoundingClientRect().width, hits};
}));
await b.close();
