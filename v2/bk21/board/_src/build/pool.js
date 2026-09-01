
/* 산출에서 빠진 것. screen-design.md §3-4.
   점수가 낮은 것과 판정을 못 한 것은 다르다. 여기는 후자만 센다.
   마지막 줄이 이 카드의 핵심이다 — 미판정이 왜 생겼는지를 적어 두면
   «데이터가 부실하다» 가 아니라 «추출에서 빠졌고 되찾았다» 로 읽힌다. 사실이 그렇다. */
function missingCard(){
 const G=DATA&&DATA.gyo, S=DATA&&DATA.stats; if(!G||!S) return '';
 const ks=Object.keys(G);
 const undet=ks.reduce((a,k)=>a+G[k].undet,0);
 const conf =ks.reduce((a,k)=>a+G[k].conf,0);
 const papers=ks.reduce((a,k)=>a+G[k].papers,0);
 const bar=(n,max)=>`<i style="width:${Math.max(2,Math.round(n/max*100))}%"></i>`;
 const mx=Math.max(undet,conf,1);
 const rows=Object.entries(S).filter(([,v])=>v.undet).sort((a,b)=>b[1].undet-a[1].undet);
 return `<div class="ecard" id="missCard"><h3>산출에서 빠진 것</h3>
  <div class="insight"><span class="ic">→</span><div class="tx">
   <b>「미판정」은 실적이 없다는 뜻이 아닙니다.</b> 논문은 있는데 등급을 못 붙였다는 뜻입니다.
   처음에는 논문의 <b>42%</b>가 등급 없이 0점 처리되고 있었고,
   그 안에 Nature Communications 같은 최상위 학술지가 들어 있었습니다.
   저널 단위로 순위를 다시 붙여 <b>5.5%</b>까지 줄였습니다.
   남은 칸이 얼마나 되는지가 아래 막대입니다.</div></div>
  <div class="d">점수가 낮은 것과 판정을 못 한 것은 다릅니다. 아래는 후자이며,
   <b>참여교수 기준</b>입니다(대학원생 실적은 따로 셉니다).</div>
  <div class="misg">
   <div class="misr"><div class="k">미판정 잔존</div><div class="b">${bar(undet,mx)}</div>
    <div class="v">${N(undet)}건</div></div>
   <div class="misr"><div class="k">학회발표</div><div class="b">${bar(conf,mx)}</div>
    <div class="v">${N(conf)}건 <em>최상위 215건 제외</em></div></div>
   <div class="misr"><div class="k">타 대학 환산점수</div><div class="b"></div>
    <div class="v">— <em>산출 불가</em></div></div>
  </div>
  <div class="misn">JCR 백분위가 논문 단위로만 붙어 있어 42.3%가 미판정이었습니다.
   저널 단위(ISSN)로 전파해 <b>5.5%</b>까지 내렸습니다(전체 31,076건 기준). 남은 것은 JCR 등재 이력이 없는 게재지입니다.</div>
  <details class="misd"><summary>학과별 미판정 (${rows.length}개 학과)</summary>
   <div style="overflow:auto;margin-top:8px"><table class="mtx">
    <thead><tr><th class="l">학과 · 전공</th><th>미판정</th><th>학회</th><th>참여교수 논문</th></tr></thead>
    <tbody>${rows.map(([d,v])=>`<tr><td class="l">${esc(d)}</td>
     <td><b>${N(v.undet)}</b></td><td>${N(v.conf||0)}</td><td>${N(v.papers)}</td></tr>`).join('')}
    </tbody></table></div></details>
 </div>`;
}
/* ══════════ BIBLO 데이터 풀 구조도 ══════════
   원장 6종을 아이소메트릭 큐브로 세우고, 가운데 풀로 흐르는 선을 잇는다.
   색은 화면 토큰을 쓰므로 라이트·다크 모두에서 선다. */
const PNS='http://www.w3.org/2000/svg';
const pel=(t,a={})=>{const e=document.createElementNS(PNS,t);for(const k in a)e.setAttribute(k,a[k]);return e;};
let pseed=20260825; const prnd=()=>((pseed=pseed*1103515245+12345&0x7fffffff)/0x7fffffff);
let PCUR=null;

function pCube(cx,cy,w,h,kf){const k=w*(kf==null?0.5:kf);
 return {tt:[cx,cy-h/2-k],tr:[cx+w,cy-h/2],tb:[cx,cy-h/2+k],tl:[cx-w,cy-h/2],
         bt:[cx,cy+h/2-k],br:[cx+w,cy+h/2],bb:[cx,cy+h/2+k],bl:[cx-w,cy+h/2]};}
const pP=a=>a.map(p=>p.join(',')).join(' ');

/* 원장 성격을 형태로 — 흩어진 점 / 격자 / 궤도 / 그물 / 층 / 작은 큐브 */
function pShape(g,kind,cx,cy,w,h,kf){
 const R=w*0.52, col='var(--pl-dot)', K=(kf==null?0.5:kf);
 const dot=(x,y,r,o)=>g.appendChild(pel('circle',{cx:x,cy:y,r:r,fill:col,'fill-opacity':o}));
 const iso=(a,r)=>[cx+Math.cos(a)*r, cy+Math.sin(a)*r*K*2];
 if(kind==='burst'){
  for(let i=0;i<58;i++){const a=prnd()*Math.PI*2, r=Math.pow(prnd(),.62)*R;
   const [x,y]=iso(a,r); dot(x,y,prnd()*1.5+.7,.35+prnd()*.5);}
  g.appendChild(pel('circle',{cx,cy,r:4.6,fill:'var(--pl-hot)','fill-opacity':.95,filter:'url(#pglow)'}));
 } else if(kind==='grid'){
  for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++)for(let k=-1;k<=1;k++){
   const x=cx+(i-j)*R*0.30, y=cy+(i+j)*R*0.155+k*R*0.34; dot(x,y,1.5,k===0?.85:.4);}
 } else if(kind==='orbit'){
  /* 원자 모형 — 궤도를 상자 윗면만큼 눕히고, 점이 그 선 위를 돈다.
     안쪽 궤도가 빠르고 바깥으로 갈수록 느리다. */
  const slow=matchMedia('(prefers-reduced-motion: reduce)').matches;
  [1,.72,.46,.24].forEach((f,i)=>{
   const rx=R*f, ry=R*f*K;                       // 상자 윗면과 같은 기울기로 눕힌다
   const id='porb'+i+'-'+Math.round(cx)+'-'+Math.round(cy);
   const d=`M${cx-rx},${cy} A${rx},${ry} 0 1,0 ${cx+rx},${cy} A${rx},${ry} 0 1,0 ${cx-rx},${cy}`;
   g.appendChild(pel('path',{id:id,d:d,fill:'none',stroke:col,'stroke-opacity':.30+i*.06,'stroke-width':.9}));
   const n=[10,8,6,4][i], T=4+(f-0.24)/0.76*10, dur=T.toFixed(1)+'s';
   for(let sIdx=0;sIdx<n;sIdx++){
    const t0=sIdx/n;
    if(slow){                                    // 움직임을 줄이는 설정이면 제자리에 놓는다
     const a=t0*Math.PI*2+i*.5;
     g.appendChild(pel('circle',{cx:cx+Math.cos(a)*rx,cy:cy+Math.sin(a)*ry,r:1.8,fill:col,'fill-opacity':.8}));
     continue; }
    const c=pel('circle',{r:1.8,fill:col,'fill-opacity':.85});
    /* 출발 위치는 시작 시각을 앞당겨 흩는다 (keyPoints는 0~1을 넘으면 무시된다) */
    const m=pel('animateMotion',{dur:dur,repeatCount:'indefinite',rotate:'0',
     begin:(-(T*t0)).toFixed(2)+'s'});
    const mp=pel('mpath',{});
    mp.setAttributeNS('http://www.w3.org/1999/xlink','href','#'+id);
    mp.setAttribute('href','#'+id);
    m.appendChild(mp);
    c.appendChild(m); g.appendChild(c);
   }});
  g.appendChild(pel('circle',{cx,cy,r:4.2,fill:'var(--pl-hot)','fill-opacity':.95,filter:'url(#pglow)'}));
 } else if(kind==='graph'){
  const N=15,pts=[];
  for(let i=0;i<N;i++){const a=prnd()*Math.PI*2, r=Math.pow(prnd(),.5)*R*0.92; pts.push(iso(a,r));}
  for(let i=0;i<N;i++)for(let j=i+1;j<N;j++){
   const d=Math.hypot(pts[i][0]-pts[j][0],pts[i][1]-pts[j][1]);
   if(d<R*0.60) g.appendChild(pel('line',{x1:pts[i][0],y1:pts[i][1],x2:pts[j][0],y2:pts[j][1],
    stroke:col,'stroke-opacity':.26,'stroke-width':.75}));}
  pts.forEach(p=>dot(p[0],p[1],2.1,.9));
 } else if(kind==='layers'){
  [-1.5,-0.5,0.5,1.5].forEach(k=>{const y=cy+k*h*0.19, rr=R*(0.94-Math.abs(k)*0.07);
   g.appendChild(pel('polygon',{points:pP([[cx,y-rr*K],[cx+rr,y],[cx,y+rr*K],[cx-rr,y]]),
    fill:col,'fill-opacity':.055,stroke:col,'stroke-opacity':.42,'stroke-width':.9}));});
 } else if(kind==='cubes'){
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(let k=-1;k<=1;k++){
   const x=cx+(i-j)*R*0.34, y=cy+(i+j)*R*0.175+k*R*0.36, s=R*0.155, q=pCube(x,y,s,s*1.15,K);
   g.appendChild(pel('polygon',{points:pP([q.tt,q.tr,q.tb,q.tl]),fill:col,'fill-opacity':.10,stroke:col,'stroke-opacity':.45,'stroke-width':.6}));
   g.appendChild(pel('polygon',{points:pP([q.tl,q.tb,q.bb,q.bl]),fill:'var(--pl-lf)','fill-opacity':.22,stroke:col,'stroke-opacity':.30,'stroke-width':.6}));
   g.appendChild(pel('polygon',{points:pP([q.tb,q.tr,q.br,q.bb]),fill:'var(--pl-rt)','fill-opacity':.34,stroke:col,'stroke-opacity':.30,'stroke-width':.6}));}
 }
}

/* 뒤쪽 상자는 윗면이 덜 보이고 앞쪽 상자는 더 열린다. 크기도 뒤가 조금 작다 */
const KF_BACK=0.32, KF_FRONT=0.47, Y_BACK=310, Y_FRONT=630;
const kfAt=y=>KF_BACK+(y-Y_BACK)/(Y_FRONT-Y_BACK)*(KF_FRONT-KF_BACK);
const scAt=y=>0.95+(y-Y_BACK)/(Y_FRONT-Y_BACK)*0.10;
const PHUB={x:670,y:470}, PPOS=[{x:392,y:310},{x:948,y:310},{x:180,y:470},{x:1160,y:470},{x:430,y:630},{x:910,y:630}];
/* 상자는 가운데 허브(반너비 86)보다 조금만 크게. 안의 도형은 크기를 그대로 둔다 */
const PW=104, PH=118;          // 도형 기준 크기 (바꾸지 않는다)
const BW=93,  BH=105;          // 상자 겉면 크기

function pDraw(){
 const S=document.getElementById('pscene'); if(!S) return;
 const L=POOL.pool; pseed=20260825; S.innerHTML='';
 const defs=pel('defs');
 defs.innerHTML=`<filter id="pglow" x="-160%" y="-160%" width="420%" height="420%">
   <feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <radialGradient id="phubg"><stop offset="0" stop-color="var(--pl-hot)" stop-opacity="1"/>
   <stop offset="45%" stop-color="var(--pl-ac)" stop-opacity=".55"/>
   <stop offset="100%" stop-color="var(--pl-ac)" stop-opacity="0"/></radialGradient>`;
 S.appendChild(defs);
 S.appendChild(pel('ellipse',{cx:PHUB.x,cy:PHUB.y+70,rx:430,ry:120,fill:'url(#phubg)','fill-opacity':.22}));

 const lg=pel('g'); S.appendChild(lg);
 const slow=matchMedia('(prefers-reduced-motion: reduce)').matches;
 L.forEach((p,i)=>{const q=PPOS[i];
  const d=`M${q.x},${q.y+PH*0.30} Q${(q.x+PHUB.x)/2},${(q.y+PHUB.y)/2+34} ${PHUB.x},${PHUB.y+6}`;
  lg.appendChild(pel('path',{class:'plink',id:'plk-'+p.id,d}));
  if(!slow){ const pl=pel('path',{class:'ppulse',d}); lg.appendChild(pl);
   pl.appendChild(pel('animate',{attributeName:'stroke-dashoffset',from:'316',to:'0',
    dur:(3.4+i*0.42)+'s',repeatCount:'indefinite'})); }});

 const hg=pel('g');
 hg.appendChild(pel('circle',{cx:PHUB.x,cy:PHUB.y,r:96,fill:'url(#phubg)','fill-opacity':.5}));
 const HKF=kfAt(PHUB.y);
 const hq=pCube(PHUB.x,PHUB.y,86,96,HKF);
 hg.appendChild(pel('polygon',{points:pP([hq.bl,hq.bb,hq.br,[PHUB.x,PHUB.y+96/2-86*HKF]]),class:'pplate'}));
 hg.appendChild(pel('polygon',{points:pP([hq.tl,hq.tb,hq.bb,hq.bl]),class:'pface pf-l'}));
 hg.appendChild(pel('polygon',{points:pP([hq.tb,hq.tr,hq.br,hq.bb]),class:'pface pf-r'}));
 pShape(hg,'burst',PHUB.x,PHUB.y,86,96,HKF);
 hg.appendChild(pel('polygon',{points:pP([hq.tt,hq.tr,hq.tb,hq.tl]),class:'pface pf-top'}));
 hg.appendChild(pel('circle',{cx:PHUB.x,cy:PHUB.y,r:7,fill:'var(--pl-hot)',filter:'url(#pglow)'}));
 const t1=pel('text',{x:PHUB.x,y:PHUB.y+118,'text-anchor':'middle',class:'phub-t'}); t1.textContent=POOL.meta.hub.t;
 const t2=pel('text',{x:PHUB.x,y:PHUB.y+138,'text-anchor':'middle',class:'phub-s'}); t2.textContent=POOL.meta.hub.s;
 hg.appendChild(t1); hg.appendChild(t2); S.appendChild(hg);

 L.forEach((p,i)=>{const q=PPOS[i], g=pel('g',{class:'pnode',id:'pnd-'+p.id,tabindex:'0',role:'button','aria-label':p.t});
  const kf=kfAt(q.y), sc=scAt(q.y), w=BW*sc, h=BH*sc;
  const fw=PW*sc, fh=PH*sc;                     // 도형은 예전 크기 그대로
  const c=pCube(q.x,q.y,w,h,kf);
  const pw=w*1.12, ph=pw*kf;
  g.appendChild(pel('polygon',{points:pP([[q.x-pw,q.y+h/2+8],[q.x,q.y+h/2+8+ph],
   [q.x+pw,q.y+h/2+8],[q.x,q.y+h/2+8-ph]]),class:'pplate'}));
  g.appendChild(pel('polygon',{points:pP([c.tl,c.tb,c.bb,c.bl]),class:'pface pf-l'}));
  g.appendChild(pel('polygon',{points:pP([c.tb,c.tr,c.br,c.bb]),class:'pface pf-r'}));
  pShape(g,p.shape,q.x,q.y,fw,fh,kf);
  g.appendChild(pel('polygon',{points:pP([c.tt,c.tr,c.tb,c.tl]),class:'pface pf-top'}));
  [[c.tt,c.tr],[c.tr,c.tb],[c.tb,c.tl],[c.tl,c.tt],[c.tl,c.bl],[c.tb,c.bb],[c.tr,c.br],[c.bl,c.bb],[c.bb,c.br]]
   .forEach(([a,b])=>g.appendChild(pel('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],class:'pface'})));
  g.appendChild(pel('circle',{cx:c.tt[0],cy:c.tt[1],r:2.6,fill:'var(--pl-hot)',filter:'url(#pglow)'}));
  const left=q.x<PHUB.x, lx=left?q.x-w*1.16:q.x+w*1.16, anc=left?'end':'start', ly=q.y-h*0.30;
  const mk=(y,cls,txt)=>{const t=pel('text',{x:lx,y:y,'text-anchor':anc,class:cls});t.textContent=txt;g.appendChild(t);};
  mk(ly,'pnum',p.n); mk(ly+22,'pttl',p.t); mk(ly+42,'pcnt',p.main.v); mk(ly+60,'pdsc',p.main.k);
  S.appendChild(g);
  const go=()=>pSelect(p.id);
  g.addEventListener('click',go);
  g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});
  g.addEventListener('mouseenter',()=>document.getElementById('plk-'+p.id)?.classList.add('on'));
  g.addEventListener('mouseleave',()=>{if(PCUR!==p.id)document.getElementById('plk-'+p.id)?.classList.remove('on');});
 });
}

function pSelect(id){
 PCUR=id;
 POOL.pool.forEach(p=>{
  document.getElementById('pnd-'+p.id)?.classList.toggle('on',p.id===id);
  document.getElementById('plk-'+p.id)?.classList.toggle('on',p.id===id);});
 const p=POOL.pool.find(x=>x.id===id), el=document.getElementById('ppanel'); if(!el) return;
 el.innerHTML=`<div class="ppn"><span class="ix">${esc(p.n)}</span><h3>${esc(p.t)}</h3><span class="ptag">${esc(p.tag)}</span></div>
  ${p.ins?ins(p.ins):''}
  <div class="ppgrid">
   <div class="ppit main"><div class="k">${esc(p.main.k)}</div><div class="v">${esc(p.main.v)}</div><div class="s">${esc(p.main.s)}</div></div>
   ${p.items.map(i=>`<div class="ppit"><div class="k">${esc(i.k)}</div><div class="v">${esc(i.v)}</div><div class="s">${esc(i.s||'')}</div></div>`).join('')}
  </div><div class="ppd">${p.d}</div>`;
}

function poolBoard(){
 const M=POOL.meta;
 document.getElementById('v-pool').innerHTML=`
 <div class="ehead poolhd"><h2>흩어진 기록이 <span>하나의 풀</span>이 되기까지</h2>
  <span class="n">원장 ${M.ledgers}종 · 총 레코드 ${esc(M.records)} · BK 태그 ${M.bk_units}연구단 ${esc(M.bk_people)}명</span>
  <span class="pill off">실측 ${esc(M.measured)}</span>
  <div class="ex">${M.lead}</div></div>
 <div class="ecard poolc">${ins(`<b>동그라미를 누르면 그 층의 설명이 아래에 뜹니다.</b>
   왼쪽에서 오른쪽으로 갈수록 <b>원자료에서 쓸 수 있는 값으로 다듬어지는 과정</b>입니다.
   숫자가 이상할 때 어느 층에서 어긋났는지 여기서 짚습니다.`)}<div class="poolwrap">
   <svg class="pscene" id="pscene" viewBox="-52 198 1432 582" role="img" aria-label="데이터 풀 구조도"></svg></div></div>
 <div class="ecard ppanel" id="ppanel"></div>
 ${ins(`아래 두 장은 <b>흩어진 기록이 하나로 합쳐지는 과정</b>입니다.
   원장마다 논문을 적는 방식이 달라 그대로 더하면 같은 논문이 여러 번 세어집니다.
   DOI 로 같은 논문을 묶어 하나로 만든 뒤에야 숫자를 믿을 수 있습니다.`)}
 <div class="erow n2 players">${M.layers.map(l=>`<div class="ecard play">
   <div class="h">${esc(l.h)}</div><div class="t">${esc(l.t)}</div>
   ${l.ins?ins(l.ins):''}<div class="d">${l.d}</div></div>`).join('')}</div>
 <div class="ecard"><h3>이 수치의 근거</h3>${ins(`위 숫자들이 <b>어떻게 계산됐는지</b>입니다. 집계 단위가 다르면 같은 이름의 숫자도 값이 달라집니다.`)}<div class="d">${M.foot}</div></div>
 ${missingCard()}
 ${srcCard('pool')}
 ${srcAllCard()}`;
 pDraw(); pSelect(POOL.pool[0].id); srcWire(document.getElementById('v-pool'));
}
