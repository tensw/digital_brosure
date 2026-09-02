import { chromium } from '/Users/karis/dev/scraper/node_modules/playwright/index.mjs';
import fs from 'fs';
const D='/Users/karis/dev/bibloai-homepage/v2/bk21/board/_src/spec/';
const SK=JSON.parse(fs.readFileSync(D+'skins.json','utf8'));
const MAP=JSON.parse(fs.readFileSync(D+'skinmap.json','utf8'));
const used=new Set(Object.values(MAP.map).map(v=>v.skin));
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000}});
await p.goto('about:blank');
const out={built:new Date().toISOString().slice(0,10),tpl:{}};
const rep=[];
for(const s of SK.skins){
  if(!used.has(s.id)) continue;
  const r=await p.evaluate(({html,css})=>{
    document.head.innerHTML=`<style>${css}</style>`; document.body.innerHTML=html;
    const root=document.body.firstElementChild;
    const sig=e=>e.tagName+'.'+(e.getAttribute('class')||'');
    // ① 표가 있으면 tbody 를 행 컨테이너로 삼는다
    let box=null;
    const tb=[...root.querySelectorAll('tbody')].sort((a,b)=>b.children.length-a.children.length)[0];
    if(tb && tb.children.length>=2) box=tb;
    // ② 아니면 같은 서명 자식이 2개 이상인 곳
    if(!box){ let bn=0;
      root.querySelectorAll('*').forEach(e=>{const ch=[...e.children]; if(ch.length<2) return;
        if(e.closest('svg')) return;
        const s0=sig(ch[0]); const same=ch.filter(c=>sig(c)===s0).length;
        if(same<2||same/ch.length<0.7) return;
        if(!/\d/.test(ch[0].textContent||'')) return;
        if(same>bn){bn=same;box=e;} }); }
    const svgN=root.querySelectorAll('svg').length;
    if(!box) return {mode: svgN?'svg':'manual', svg:svgN};
    // 행 하나만 남기고 슬롯을 뚫는다
    const rows=box.children.length;
    while(box.children.length>1) box.removeChild(box.lastElementChild);
    const row=box.firstElementChild;
    box.setAttribute('data-rows','');
    let i=0; const hints=[];
    const walk=n=>{ for(const c of [...n.children]){ if(c.children.length) walk(c);
      else { const t=(c.textContent||'').trim();
        if(t){ c.setAttribute('data-slot',String(i));
          hints.push({i, cls:c.getAttribute('class')||c.tagName, was:t.slice(0,20),
                      num:/^[\d,.\-+%]+$/.test(t)}); i++; } } } };
    walk(row);
    if(!i){ const t=(row.textContent||'').trim();
      if(t){ row.setAttribute('data-slot','0'); hints.push({i:0,cls:'(행)',was:t.slice(0,20),num:false}); i=1; } }
    // 제목 슬롯
    const h=root.querySelector('h2,h3,h4,.ttl,.hd,.cap');
    if(h) h.setAttribute('data-title','');
    return {mode:'rows', rows, slots:i, hints, svg:svgN, html:root.outerHTML};
  },{html:s.html,css:SK.css});
  out.tpl[s.id]={mode:r.mode, rows:r.rows||0, slots:r.slots||0, hints:r.hints||[],
                 svg:r.svg||0, html:r.html||null, t:s.t};
  rep.push({id:s.id,mode:r.mode,rows:r.rows||0,slots:r.slots||0,t:s.t});
}
const by=m=>rep.filter(x=>x.mode===m);
console.log(`답변 스킨 ${rep.length}`);
console.log(`  행 치환 ${by('rows').length} · SVG 재계산 ${by('svg').length} · 손질 필요 ${by('manual').length}`);
console.log('\nSVG 재계산:', by('svg').map(x=>x.id+'('+x.t.slice(0,12)+')').join(' · '));
console.log('손질 필요:', by('manual').map(x=>x.id+'('+x.t.slice(0,12)+')').join(' · '));
console.log('\n슬롯 수 분포:', JSON.stringify(by('rows').reduce((a,x)=>{a[x.slots]=(a[x.slots]||0)+1;return a;},{})));
fs.writeFileSync(D+'punched.json',JSON.stringify(out));
console.log('punched.json', (fs.statSync(D+'punched.json').size/1024).toFixed(0)+'KB');
await b.close();
