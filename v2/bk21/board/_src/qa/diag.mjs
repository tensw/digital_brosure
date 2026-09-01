import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000}});
await p.goto('file:///Users/karis/dev/biblo_rims_aws/bk21-board/index.html',{waitUntil:'load',timeout:120000});
await p.waitForSelector('[data-v]',{timeout:60000});
await p.click('[data-v="exec"]'); await p.waitForTimeout(2500);
console.log(await p.evaluate(()=>{
 const R=getComputedStyle(document.documentElement);
 const i=document.querySelector('#sgcpiCard .gband i');
 const cs=i?getComputedStyle(i):null;
 return {g6s:R.getPropertyValue('--g6s').trim(), sviolet:R.getPropertyValue('--s-violet').trim(),
   firstClass:i&&i.className, bg:cs&&cs.backgroundColor, flex:cs&&cs.flexGrow,
   w:i&&i.getBoundingClientRect().width, h:i&&i.getBoundingClientRect().height,
   bandH:document.querySelector('#sgcpiCard .gband')?.getBoundingClientRect().height};
}));
// 좁은 화면에서 어떤 규칙이 이기나
await p.setViewportSize({width:760,height:1000}); await p.waitForTimeout(400);
console.log(await p.evaluate(()=>{
 const r=document.querySelector('.gyrow');
 const hits=[];
 for(const sh of document.styleSheets){ let rs; try{rs=sh.cssRules}catch(e){continue;}
  const walk=(list,med)=>{for(const x of list){
    if(x.type===4){ if(matchMedia(x.conditionText).matches) walk(x.cssRules,x.conditionText); }
    else if(x.selectorText&&/\.kpis|\.gyrow/.test(x.selectorText)&&x.style.gridTemplateColumns)
      hits.push((med?'@'+med+' ':'')+x.selectorText+' → '+x.style.gridTemplateColumns);}};
  walk(rs,null);}
 return {computed:getComputedStyle(r).gridTemplateColumns, rules:hits};
}));
await b.close();
