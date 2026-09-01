const N=n=>(n||0).toLocaleString();
const esc=s=>(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ini=s=>(s||'?').trim().slice(-2);
const MAIN=new Set(['제1','교신','단독','제1+교신']);
const TIER=['S','A','B','C','K','U'];
const TNAME={S:'IF 10+',A:'IF 5~10',B:'IF 2~5',C:'IF 2 미만',K:'KCI 국내',U:'IF 미부여'};
const TFULL={S:'최상위',A:'상위',B:'중위',C:'일반',K:'국내',U:'등급 미확정'};
const LEAD=new Set(['연구단장','부단장','연구팀장','실무(책임)교수']);
const posBadge=p=>{const t=p.pos||(p.part=='신진'?'신진':'참여교수');
 const c=LEAD.has(t)?'l':((p.kind=='jr'||p.part=='신진')?'j':'p');
 return `<span class="bd ${c}">${esc(t)}</span>`;};
const degBadge=k=>`<span class="bd s">${esc(k.deg||'대학원생')}</span>`;
const noPaper=p=>p.np===0?'<span class="bd n">논문 0편</span>':'';
const RC={'제1':'#ef4444','교신':'#6366f1','공저':'var(--c3)','단독':'#10b981','제1+교신':'#a855f7'};
const gsum=g=>TIER.reduce((s,t)=>s+(g?.[t]||0),0);
const gmerge=(a,b)=>{const o={};TIER.forEach(t=>o[t]=(a?.[t]||0)+(b?.[t]||0));return o;};
function tbar(g){
 const tot=gsum(g);
 const inner=tot?TIER.map(t=>g[t]?`<i class="${t==='U'?'u':''}" style="width:${g[t]/tot*100}%;background:var(--${t})" title="${TFULL[t]} ${TNAME[t]} · ${N(g[t])}편"></i>`:'').join('')
                :'<i style="width:100%;background:var(--line2)"></i>';
 return `<div class="tb-w"><div class="tbar">${inner}</div><div class="lab">${N(tot)}편</div></div>`;
}
const legend=()=>'<div class="lgd">'+TIER.map(t=>`<span class="li"><em class="${t==='U'?'u':''}" style="background:var(--${t})"></em>${TFULL[t]} <span class="sub">${TNAME[t]}</span></span>`).join('')+'</div>';
let CUR=null, GY='전체', SRT='score', Q='', OPEN=new Set();

const D=DATA.dept_list.map(d=>({d,...DATA.stats[d]}));
const PIDX={};
DATA.dept_list.forEach(d=>{const n=DATA.depts[d];
 n.profs.forEach(p=>{PIDX[p.sid]=p; p.kids.forEach(k=>PIDX[k.sid]=k);});
 n.unassigned.forEach(k=>PIDX[k.sid]=k);});
const T={dept:D.length,total:0,prof:0,jr:0,stu:0,papers:0,cite:0,review:0,zero:0,nolink:0,sci:0,kci:0,pc:0,sh:0};
D.forEach(x=>['total','prof','jr','stu','papers','cite','review','zero','nolink','sci','kci','pc','sh'].forEach(k=>T[k]+=x[k]||0));

document.getElementById('sub').innerHTML =
 `참여자 ${N(T.total)}명 · 논문 ${N(T.papers)}편(2020~2025) · 학과 › 교수 › 학생 폴더 구조 · 지도관계는 <b>공저 논문 역산</b> 추정치`;

/* KPI */
const K=[['학과',T.dept,'개',`이공 ${D.filter(x=>x.gy=='이공').length} · 의약생명 ${D.filter(x=>x.gy=='의약생명').length} · 인문사회 ${D.filter(x=>x.gy=='인문사회').length}`,'#3b82f6'],
 ['참여자',T.total,'명',`교수 ${N(T.prof)} · 신진 ${N(T.jr)} · 학생 ${N(T.stu)}`,'var(--navy)'],
 ['논문',T.papers,'편',`SCI ${N(T.sci)} · KCI ${N(T.kci)}`,'#0369a1'],
 ['총 인용',T.cite,'회',`편당 평균 ${(T.cite/T.papers).toFixed(1)}회`,'#34c38f'],
 ['검토필요',T.review,'명',`전체의 ${(T.review/T.total*100).toFixed(1)}%`,'#e11d48'],
 ['실적 없음',T.zero,'명',`논문 0편 · ${(T.zero/T.total*100).toFixed(1)}%`,'#f5a623']];
const KST={'검토필요':'k-alert','실적 없음':'k-warn'};
document.getElementById('kpis').innerHTML=K.map(([l,v,u,d,c])=>
 `<div class="kpi ${KST[l]||''}" style="--c:${c}"><div class="lb">${l}</div><div class="vl">${N(v)}<small>${u}</small></div><div class="dt">${d}</div></div>`).join('');

/* 계열 필터 */
document.getElementById('gyseg').innerHTML=['전체','이공','의약생명','인문사회']
 .map(g=>`<button data-g="${g}" class="${g=='전체'?'on':''}">${g}</button>`).join('');
document.getElementById('gyseg').onclick=e=>{const b=e.target.closest('button');if(!b)return;
 GY=b.dataset.g;[...e.currentTarget.children].forEach(x=>x.classList.toggle('on',x===b));deptList();};
document.getElementById('srtseg').onclick=e=>{const b=e.target.closest('button');if(!b)return;
 SRT=b.dataset.s;[...e.currentTarget.children].forEach(x=>x.classList.toggle('on',x===b));deptList();};
document.getElementById('q').oninput=e=>{Q=e.target.value.trim().toLowerCase();deptList();if(CUR)tree();};
document.getElementById('expAll').onclick=()=>{
 const n=DATA.depts[CUR]; const all=[...n.profs.map(p=>p.sid),'__un'];
 const allOpen=all.every(s=>OPEN.has(s));
 all.forEach(s=>allOpen?OPEN.delete(s):OPEN.add(s)); tree();};

/* 학과 리스트 */
function deptList(){
 let L=D.filter(x=>GY=='전체'||x.gy==GY);
 if(Q) L=L.filter(x=>x.d.toLowerCase().includes(Q)||hasHit(x.d));
 L.sort(SRT=='name'?(a,b)=>a.d.localeCompare(b.d)
   :SRT=='review'?(a,b)=>b.review/b.total-a.review/a.total
   :(a,b)=>b.papers-a.papers);
 document.getElementById('dcnt').textContent=`${L.length}개`;
 document.getElementById('dlist').innerHTML=L.map(x=>{
  const done=Math.round((x.total-x.review)/x.total*100);
  return `<div class="dcard g${x.gy} ${x.d==CUR?'on':''}" data-d="${esc(x.d)}">
   ${x.review?`<span class="rv">검토 ${x.review}</span>`:''}
   <div class="nm">${esc(x.d)}</div>
   <div style="margin-top:5px"><span class="gy">${x.gy}</span></div>
   <div class="mt"><span>참여 <b>${N(x.total)}</b></span><span>논문 <b>${N(x.papers)}</b></span><span>인용 <b>${N(x.cite)}</b></span></div>
   <div class="bar"><i style="width:${done}%"></i></div>
   <div class="mt" style="margin-top:5px;font-size:12px"><span>검증 완료 ${done}%</span><span>1인당 ${(x.papers/x.total).toFixed(1)}편</span></div>
  </div>`}).join('')||'<div class="empty">해당 학과 없음</div>';
 document.querySelectorAll('.dcard').forEach(c=>c.onclick=()=>{CUR=c.dataset.d;OPEN.clear();deptList();detail();});
}
function hasHit(d){ if(!Q)return true; const n=DATA.depts[d];
 return [...n.profs,...n.profs.flatMap(p=>p.kids),...n.unassigned].some(p=>match(p)); }
function match(p){ if(!Q)return true;
 if((p.name||'').toLowerCase().includes(Q)||(p.nen||'').toLowerCase().includes(Q)||p.sid.includes(Q))return true;
 return (DATA.papers[p.sid]||[]).some(x=>(x.t||'').toLowerCase().includes(Q)||(x.j||'').toLowerCase().includes(Q)); }

/* 통계 스트립 */
function detail(){ stat(); tree(); }
function stat(){
 const s=DATA.stats[CUR], ys=Object.entries(s.yr), vs=ys.map(y=>y[1]), mx=Math.max(...vs,1);
 const RL=Object.entries(s.roles||{}).sort((a,b)=>b[1]-a[1]);
 const rtot=RL.reduce((a,x)=>a+x[1],0)||1;
 const mainN=RL.filter(([k])=>MAIN.has(k)).reduce((a,x)=>a+x[1],0);
 const LOWY=ys.map(([y])=>y).filter(y=>(s.yrIF?.[y]??100)<20);
 const tot=s.papers||1, oth=s.papers-s.sci-s.kci;
 const P=[['SCI',s.sci,'#3b82f6'],['KCI',s.kci,'#7c3aed'],['기타',oth,'#c3cbd9']];
 const QL=TIER.map(t=>[`${TFULL[t]} ${TNAME[t]}`, s.G[t]||0, `var(--${t})`]);
 const qm=Math.max(...QL.map(x=>x[1]),1);
 const tot5=gsum(s.G)||1, ppl=s.prof+s.jr+s.stu;
 const DK=[
  ['교수 논문', N(s.PN), '편', `인용 ${N(s.PC)}`, '', 'var(--navy)'],
  ['학생 논문', N(s.SN), '편', `인용 ${N(s.SC)}`, '', '#3b82f6'],
  ['최상위 (IF 10+)', N(s.G.S), '편', `전체의 ${(s.G.S/tot5*100).toFixed(1)}%`, 'var(--S)', 'var(--S)'],
  ['국내 KCI', N(s.G.K), '편', `전체의 ${(s.G.K/tot5*100).toFixed(1)}%`, 'var(--K)', 'var(--K)'],
  ['인원', N(ppl), '명', `교수 ${s.prof}·신진 ${s.jr}·학생 ${N(s.stu)}`, '', '#34c38f'],
  ['검토필요', N(s.review), '명', `교수 ${s.needF}·학생 ${s.needS}`, '#e11d48', '#e11d48'],
 ];
 document.getElementById('dcap').innerHTML=
  `<div class="dcap"><b>${esc(CUR)}</b> 학과 집계<i></i></div>`;
 document.getElementById('dkpi').innerHTML=
  `<div class="dkpis">`+DK.map(([l,v,u,d,vc,c])=>
   `<div class="kpi" style="--c:${c}"><div class="lb">${l}</div>`+
   `<div class="vl"${vc?` style="color:${vc}"`:''}>${v}<small>${u}</small></div><div class="dt">${d}</div></div>`).join('')+`</div>`;

 document.getElementById('stat').innerHTML=`
 <div class="sc"><h4>연도별 논문 · 등급 구성 · 2020~2025</h4><div class="ybar">
  ${ys.map(([y,v])=>{
    const g=s.yrT[y]||{}, cov=s.yrIF?.[y]??null, low=cov!==null&&cov<20;
    const tip=`${y} · 총 ${N(v)}편\n`+TIER.map(t=>`${TFULL[t]} ${TNAME[t]} ${N(g[t]||0)}`).join('\n');
    return `<div title="${tip}"><i style="height:${Math.max(3,v/mx*70)}px">`+
      TIER.map(t=>g[t]?`<em class="${t==='U'?'u':''}" style="height:${g[t]/v*100}%;background:var(--${t})"></em>`:'').join('')+
      `</i><span>${y.slice(2)}${low?'<u>등급 미확정</u>':''}</span></div>`}).join('')}
 </div>
 <div class="rlg" style="margin-top:10px">${TIER.map(t=>`<span><i class="${t==='U'?'u':''}" style="background:var(--${t})"></i>${TFULL[t]} ${N(s.G[t]||0)}</span>`).join('')}</div>
 <div class="ymeta">${LOWY.length?`<b>${LOWY.join('·')}년은 IF가 아직 부여되지 않아 등급 미확정</b>으로 분류합니다(IF 보유율 ${LOWY.map(y=>s.yrIF[y]+'%').join(' / ')}). 낮은 등급으로 내리지 않으며 환산점수 산출에서도 제외합니다.`:'등급은 논문의 IF 실측값 기준입니다.'}</div></div>
 <div class="sc"><h4>저자 역할 분포</h4>
  <div class="rsb">${RL.map(([k,v])=>`<i style="width:${v/rtot*100}%;background:${RC[k]||'var(--c2)'}" title="${k} ${N(v)}편"></i>`).join('')}</div>
  <div class="rlg">${RL.map(([k,v])=>`<span><i style="background:${RC[k]||'var(--c2)'}"></i>${k} ${N(v)}</span>`).join('')}</div>
  <div class="rsum">
   <div><div class="l">주저자 논문</div><div class="n">${N(mainN)}<small> 편 · ${(mainN/rtot*100).toFixed(0)}%</small></div></div>
   <div><div class="l">공저 연결 학생</div><div class="n">${N(s.linkedStu)}<small> / ${N(s.stu)}명</small></div></div>
  </div></div>
 <div class="sc"><h4>집계 주의</h4>
  <div class="qrow"><div class="ql"><b>평균 IF</b><i>IF 보유 논문 기준</i></div><div class="qv">${s.ifavg||'-'}</div></div>
  <div class="qrow ${s.pc?'q-warn':''}"><div class="ql"><b>프로시딩</b><i>학술지가 아닌 학회 발표</i></div><div class="qv">${N(s.pc)}<small>편</small></div></div>
  <div class="qrow ${s.sh?'q-warn':''}"><div class="ql"><b>교내 중복계상</b><i>같은 논문이 3인 이상에게 계상</i></div><div class="qv">${N(s.sh)}<small>편</small></div></div>
  <div class="qrow ${s.dp?'q-warn':''}"><div class="ql"><b>동일논문 중복등재</b><i>한 사람에게 같은 논문이 2번</i></div><div class="qv">${N(s.dp||0)}<small>편</small></div></div>
  <div class="qrow ${(s.G.U||0)?'q-warn':''}"><div class="ql"><b>등급 미확정</b><i>IF 미부여 · 환산점수 산출 제외</i></div><div class="qv">${N(s.G.U||0)}<small>편</small></div></div></div>
 <div class="sc"><h4>저널 IF 등급 · ${N(gsum(s.G))}편</h4>
  ${QL.map(([l,v,c])=>`<div class="ifrow"><span style="width:96px;color:#5b6478">${l}</span><span class="mini"><i style="width:${v/qm*100}%;background:${c}"></i></span><b>${N(v)}</b></div>`).join('')}
 </div>`;
}

/* 트리 */
function tree(){
 const n=DATA.depts[CUR], s=DATA.stats[CUR];
 const linked=n.profs.reduce((a,p)=>a+p.nkid,0);
 document.getElementById('th').innerHTML=
  `<b>${esc(CUR)}</b><span class="chip">${s.gy}</span>
   <span class="chip">교수·신진 ${n.profs.length}</span>
   <span class="chip">연결학생 ${N(linked)}</span>
   ${n.unassigned.length?`<span class="chip">연결 없음 ${N(n.unassigned.length)}</span>`:''}
   ${s.review?`<span class="chip" style="background:#ffe9ee;color:#e11d48;border-color:#ffd0da">검토필요 ${s.review}</span>`:''}
   <span style="flex:1"></span>${legend()}`;
 document.getElementById('note').innerHTML=
  `<b>폴더 규칙</b> · 이 트리는 <b>공식 지도관계가 아닙니다</b>. 학생은 같은 학과 교수와 <b>공저한 논문 수</b>가 가장 많은 교수 아래로 배치한 <b>공저 중심 연결(추정)</b>이며, 공저 이력이 없으면 <b>연결 없음</b>. `+
  `막대는 <b>IF 등급 구성</b>(최상위 IF10+ · 상위 5~10 · 중위 2~5 · 일반 IF 2 미만 · 국내 KCI · <b>빗금은 등급 미확정</b>). `+
  `교수 행의 논문·인용·막대는 본인과 연결학생을 합산. ⚠는 신뢰도 0.7 미만 또는 재직·재학 기간 전후 논문 보유(기간전·기간후).`;

 let h='';
 n.profs.forEach(p=>{ if(Q && !match(p) && !p.kids.some(match)) return; h+=prof(p); });
 if(n.unassigned.length){
  const vis=n.unassigned.filter(match);
  if(!Q||vis.length){
   const op=OPEN.has('__un');
   const UNP=vis.reduce((a,x)=>a+x.np,0), UNC=vis.reduce((a,x)=>a+x.cite,0);
   const UNG=vis.reduce((a,x)=>gmerge(a,x.g),{});
   h+=`<div class="row lv1 ${op?'open':''}" data-t="f" data-k="__un">
    <span class="tw ${op?'op':''}">▶</span>
    <div class="av" style="background:linear-gradient(140deg,#aab4c6,#8892a6)">?</div>
    <div class="nmw"><div class="n1">연결 없음<span class="bd s">학생 ${vis.length}</span></div>
    <div class="n2">같은 학과 교수와 공저 이력이 없어 연결할 교수를 정할 수 없음</div></div>
    <div class="mx">
    <div class="m"><div class="v ${UNP?'':'z'}">${N(UNP)}</div><div class="k">논문</div></div>
    <div class="m"><div class="v ${UNC?'':'z'}">${N(UNC)}</div><div class="k">인용</div></div>
    ${tbar(UNG)}</div></div>`;
   if(op) h+=vis.map(k=>stu(k,false)).join('')||'<div class="empty">해당 없음</div>';
  }
 }
 document.getElementById('tb').innerHTML=h||'<div class="empty">검색 결과 없음</div>';
 bind();
}
function gbar(main,np){ const co=np-main; if(!np) return '<div class="gbar"></div>';
 return `<div class="gbar" title="주저자 ${main} / 공저 ${co}"><i style="width:${main/np*100}%;background:var(--accent)"></i><i style="width:${co/np*100}%;background:#dbe2ee"></i></div>`; }
function flags(p){ let h='';
 if(p.low) h+=`<span class="wbadge">신뢰도 ${p.conf}</span>`;
 if(p.nb) h+=`<span class="wbadge">기간전 ${p.nb}</span>`;
 if(p.na) h+=`<span class="wbadge">기간후 ${p.na}</span>`;
 return h; }
function prof(p){
 const op=OPEN.has(p.sid), cls=p.part=='신진'?'j':'p';
 const G=gmerge(p.g,p.sg);
 return `<div class="row lv1 ${op?'open':''}" data-t="f" data-k="${p.sid}">
  <span class="tw ${op?'op':''}">▶</span>
  <div class="av ${cls}">${esc(ini(p.name))}</div>
  <div class="nmw"><div class="n1"><span class="pn" data-p="${p.sid}">${esc(p.name)}</span>${posBadge(p)}${noPaper(p)}${flags(p)}</div>
   <div class="n2">${esc(p.jik||'')} · ${esc(p.nen||'')}${p.major?' · '+esc(p.major):''} · 연결학생 ${p.nkid}명 · 재직 ${fmt(p.st)}~${p.en?fmt(p.en):'재직중'}</div></div>
  <div class="mx">
   <div class="m"><div class="v ${p.np?'':'z'}">${N(p.np)}</div><div class="k">본인논문</div></div>
   <div class="m ${p.snp?'':'mut'}"><div class="v ${p.snp?'':'z'}">${N(p.snp)}</div><div class="k">연결학생 논문</div></div>
   <div class="m"><div class="v ${p.cite+p.scite?'':'z'}">${N(p.cite+p.scite)}</div><div class="k">인용</div></div>
   <div class="m s10" style="min-width:40px"><div class="v ${G.S?'':'z'}">${N(G.S)}</div><div class="k">IF10+</div></div>
   ${tbar(G)}
  </div></div>${op?kids(p):''}`;
}
function kids(p){
 let h=`<div class="row lv2" data-t="p" data-k="${p.sid}" style="background:var(--c1)">
  <span class="tw ${OPEN.has('P'+p.sid)?'op':''}">▶</span>
  <div class="nmw"><div class="n1" style="font-size:13px;color:#5b6478">${esc(p.name)} 교수 본인 논문 ${N(p.np)}편</div></div></div>`;
 if(OPEN.has('P'+p.sid)) h+=plist(p.sid);
 const ks=p.kids.filter(match);
 h+=ks.map(k=>stu(k,true)).join('');
 if(!ks.length&&!p.np) h+='<div class="empty" style="padding:14px">연결된 학생·논문 없음</div>';
 return h;
}
function stu(k,ind){
 const op=OPEN.has('P'+k.sid);
 return `<div class="row lv2 ${op?'open':''}" data-t="p" data-k="${k.sid}">
  <span class="tw ${op?'op':''}">▶</span>
  <div class="av s">${esc(ini(k.name))}</div>
  <div class="nmw"><div class="n1"><span class="pn" data-p="${k.sid}">${esc(k.name)}</span>${degBadge(k)}${noPaper(k)}${k.via?`<span class="via">공저 ${k.via}편</span>`:''}${flags(k)}</div>
   <div class="n2">${esc(k.sid)} · ${esc(k.nen||'')}${k.tp?' · '+esc(k.tp):''}${k.y0?' · 참여 '+(k.y0===k.y1?k.y0:k.y0+'~'+k.y1):''} · 재학 ${fmt(k.st)}~${k.en?fmt(k.en):'재학중'}</div></div>
  <div class="mx">
   <div class="m"><div class="v ${k.np?'':'z'}">${N(k.np)}</div><div class="k">논문</div></div>
   <div class="m ${k.main?'':'mut'}"><div class="v ${k.main?'':'z'}">${N(k.main)}</div><div class="k">주저자</div></div>
   <div class="m"><div class="v ${k.cite?'':'z'}">${N(k.cite)}</div><div class="k">인용</div></div>
   <div class="m s10" style="min-width:40px"><div class="v ${k.g.S?'':'z'}">${N(k.g.S)}</div><div class="k">IF10+</div></div>
   ${tbar(k.g)}
  </div></div>${op?plist(k.sid):''}`;
}
function fmt(s){ return s&&s.length>=8?`${s.slice(0,4)}.${s.slice(4,6)}`:'-'; }
function plist(sid){
 let ps=DATA.papers[sid]||[], all=ps.length;
 if(Q){
  const P=PIDX[sid];
  const self=P&&((P.name||'').toLowerCase().includes(Q)||(P.nen||'').toLowerCase().includes(Q)||String(sid).includes(Q));
  if(!self){ const f=ps.filter(x=>(x.t||'').toLowerCase().includes(Q)||(x.j||'').toLowerCase().includes(Q)); if(f.length) ps=f; }
 }
 if(!ps.length) return `<div class="plist"><div class="empty" style="padding:12px">논문 없음 (2020~2025)</div></div>`;
 const filtered=ps.length<all;
 const g={}; ps.forEach(p=>(g[p.j]=g[p.j]||[]).push(p));
 const js=Object.keys(g).sort((a,b)=>g[b].length-g[a].length||a.localeCompare(b));
 return `<div class="plist">${filtered?`<div style="font-size:12px;color:var(--ink3);padding:6px 2px 0">검색어와 일치하는 ${N(ps.length)}편만 표시 · 전체 ${N(all)}편</div>`:''}`+js.map(j=>{
  const arr=g[j].slice().sort((a,b)=>(b.y||'').localeCompare(a.y||''));
  const ci=arr.reduce((s,p)=>s+p.c,0);
  const ifs=arr.filter(p=>/^\d+(\.\d+)?$/.test(p.if)).map(p=>+p.if);
  return `<div class="jg"><div class="jh"><b>${esc(j)}</b>
   <span class="jm">${arr.length}편 · 인용 ${N(ci)}${ifs.length?` · IF ${Math.max(...ifs)}`:''}</span></div>
   ${arr.map(p=>`<div class="pr">
    <span class="yy">${esc(p.y)}</span>
    <span class="tag g-${esc(p.g)}">${esc(p.g)}</span>
    <span class="tag ${MAIN.has(p.r)?'r-main':'r-co'}">${esc(p.r)}</span>
    <span class="tt" title="${esc(p.t)}">${p.doi?`<a href="https://doi.org/${encodeURI(p.doi)}" target="_blank" rel="noopener noreferrer" title="DOI 열기 · ${esc(p.doi)}">${esc(p.t)}</a>`:esc(p.t)}</span>
    ${p.c?`<span class="tag t-c">인용 ${N(p.c)}</span>`:''}
    ${/^\d+(\.\d+)?$/.test(p.if)?`<span class="tag t-if">IF ${p.if}</span>`:''}
    ${p.pc?`<span class="tag t-pc">프로시딩</span>`:''}
    ${p.sh>=3?`<span class="tag t-sh">교내 ${p.sh}인 공유</span>`:''}
    ${p.dp?`<span class="tag t-dp">중복 등재</span>`:''}${p.f==='before'?`<span class="tag t-bf">기간전</span>`:''}${p.f==='after'?`<span class="tag t-af">기간후</span>`:''}
   </div>`).join('')}</div>`}).join('')+`</div>`;
}

/* ── 연구자 상세 패널 ── */
const maskMail=e=>{if(!e)return'';const [a,b]=String(e).split('@');if(!b)return esc(e);
 return esc(a.slice(0,2))+'···@'+esc(b);};
function personDept(sid){for(const d of DATA.dept_list){const n=DATA.depts[d];
 if(n.profs.some(p=>p.sid==sid)||n.profs.some(p=>p.kids.some(k=>k.sid==sid))||n.unassigned.some(k=>k.sid==sid))return d;}return CUR;}

/* 등급 구성 누적 막대 + 범례. screen-design.md §3-3(나).
   미판정을 접어 두지 않는다 — 46% 가 미판정인 사람이 있고, 그 사실이 점수 옆에 있어야 한다. */
const GLB={6:'6',5:'5',4:'4',3:'3',2:'2',1:'1',0:'미판정'};
function gradeBand(ps){
 const c={}; ps.forEach(x=>{const g=x.gs==null?0:x.gs; c[g]=(c[g]||0)+1;});
 const order=[6,5,4,3,2,1,0].filter(g=>c[g]);
 if(!order.length) return '';
 const tot=ps.length, un=c[0]||0;
 const ai=ps.filter(x=>x.ai===1).length;
 return `<div class="dsec"><h4>등급 구성</h4>
  <div class="insight"><span class="ic">→</span><div class="tx">
   이 사람의 논문을 <b>실린 학술지의 급</b>으로 나눈 것입니다. 왼쪽(6)이 분야 상위 5%,
   오른쪽으로 갈수록 아래입니다. <b>회색은 아직 등급을 못 붙인 논문</b>이지 낮은 논문이 아닙니다.
  </div></div>
  <div class="gband">${order.map(g=>`<i class="g${g}" style="flex:${c[g]}" title="${GLB[g]} · ${N(c[g])}편"></i>`).join('')}</div>
  <div class="gkey">${order.map(g=>`<span><em class="${g?'':'z'}" style="background:${g?`var(--g${g}s)`:'var(--c3)'}"></em>${GLB[g]} ${N(c[g])}</span>`).join('')}
   ${un/tot>=.2?`<span class="w">미판정 ${(un/tot*100).toFixed(0)}%</span>`:''}</div>
  ${ai?`<div class="gkey" style="margin-top:6px">AI 관련 논문 ${N(ai)}편 · 환산점수에는 더하지 않습니다</div>`:''}
 </div>`;
}

/* 논문별 산출 내역. screen-design.md §3-3(다) — 이 화면이 개편의 중심이다.
   교수가 «내 점수가 왜 이 값인가» 를 물으면 답할 근거가 여기 있어야 한다.
   · 등급 옆에 판정 근거(why)를 같이 적는다. [6] 만 있으면 왜 6인지 모른다.
   · 미판정 행을 숨기지 않는다. 빠뜨린 게 아니라 못 매긴 것임이 보여야 이의제기가 우리에게 온다.
   · 기본 정렬은 점수 내림차순. «내 대표 실적이 무엇으로 잡혔나» 가 첫 화면이어야 한다.
   · 339편짜리 사람이 있다. 한 번에 그리면 드로어가 멈춘다 → 30행 + 더 보기. */
const BRK_STEP=30;
function scoreBreakdown(ps){
 if(!ps.length) return '';
 const rows=ps.slice().sort((a,b)=>(b.sc||0)-(a.sc||0)||(b.y||'').localeCompare(a.y||''));
 const S=rows.reduce((a,x)=>a+(x.sc||0),0), Sn=rows.reduce((a,x)=>a+(x.gw||0),0);
 return `<div class="dsec" id="brkSec"><h4>논문별 산출 내역</h4>
  <div class="insight"><span class="ic">→</span><div class="tx">
   <b>점수가 어느 논문에서 나왔는지 한 줄씩 보여줍니다.</b>
   「내 점수가 왜 이 값이냐」는 물음에 답하는 자리입니다.
   등급 옆의 작은 글씨가 판정 근거이고, 주저자면 점수를 다 받고 공저자면 절반을 받습니다.
   높은 점수 순으로 놓았으니 맨 위가 이 사람의 대표 실적입니다.</div></div>
  <div class="ymeta" style="margin:0 0 8px;padding:0;border:0">저널등급 g × 역할가중 w.
   주저자 1 · 공저자 1/2. 미판정은 0.0 으로 두고 감추지 않습니다.</div>
  <div style="overflow:auto"><table class="mtx pbreak" id="brkT"></table></div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
   <button class="btn-a" id="brkMore" hidden>더 보기</button>
   <div style="margin-left:auto;font-size:12px;color:var(--ink3);font-variant-numeric:tabular-nums">
    합계 · 환산편수 <b>${Sn.toFixed(1)}</b> · 환산점수 <b>${S.toFixed(1)}</b></div>
  </div></div>`;
}
function paintBreakdown(ps,shown){
 const t=document.getElementById('brkT'); if(!t) return;
 const rows=ps.slice().sort((a,b)=>(b.sc||0)-(a.sc||0)||(b.y||'').localeCompare(a.y||''));
 const vis=rows.slice(0,shown);
 t.innerHTML=`<thead><tr><th class="l">연도</th><th class="l">논문 · 게재지</th>
   <th>등급</th><th>역할</th><th>가중</th><th>점수</th></tr></thead><tbody>`+
  vis.map(x=>{const g=x.gs==null?0:x.gs;
   return `<tr${g?'':' style="color:var(--ink3)"'}>
    <td class="l">${esc(x.y||'')}</td>
    <td class="l"><div class="bt">${esc(x.t||'')}${x.ai===1?' <span class="pill px">AI</span>':''}</div>
     <div class="bj">${esc(x.j||'')}${x.tr==='P'?' <span class="pill in">학회</span>':''}</div></td>
    <td><span class="gtag g${g}">${g||'—'}</span><div class="bw">${esc(x.why||'')}</div></td>
    <td>${esc(x.r||'')}</td><td>${x.gw===1?'1':'1/2'}</td>
    <td><b>${(x.sc||0).toFixed(1)}</b></td></tr>`;}).join('')+`</tbody>`;
 const more=document.getElementById('brkMore');
 if(more){ more.hidden = shown>=rows.length;
  more.textContent=`더 보기 (${Math.min(BRK_STEP,rows.length-shown)}편 · 남은 ${rows.length-shown})`; }
}
function openPerson(sid){
 const P=PIDX[sid]; if(!P) return;
 const ps=DATA.papers[sid]||[], dp=personDept(sid);
 const cite=ps.reduce((a,x)=>a+x.c,0);
 const sci=ps.filter(x=>x.g==='SCI').length, kci=ps.filter(x=>x.g==='KCI').length;
 const ifs=ps.filter(x=>/^\d+(\.\d+)?$/.test(x.if)).map(x=>+x.if);
 const yr={}; ['2020','2021','2022','2023','2024','2025'].forEach(y=>yr[y]=ps.filter(x=>x.y===y).length);
 const my=Math.max(...Object.values(yr),1);
 const rr=Object.entries(ps.reduce((m,x)=>(x.r&&(m[x.r]=(m[x.r]||0)+1),m),{})).sort((a,b)=>b[1]-a[1]);
 const rt=rr.reduce((a,x)=>a+x[1],0)||1;
 const jj=Object.entries(ps.reduce((m,x)=>((m[x.j]=(m[x.j]||0)+1),m),{})).sort((a,b)=>b[1]-a[1]).slice(0,6);
 const jm=jj[0]?jj[0][1]:1;
 const top=ps.slice().sort((a,b)=>b.c-a.c).slice(0,3);
 const isStu=P.part==='대학원생';
 const role=P.pos||P.deg||(isStu?'대학원생':'참여교수');
 let h=`<div class="dh"><button class="x" id="drwX" aria-label="닫기">✕</button>
  <h2>${esc(P.name)}</h2>
  <div class="sub">${esc(role)} · ${esc(dp)}${P.major?' · '+esc(P.major):''} · 교번 ${esc(P.sid)}<br>
   <em>${esc(P.nen||'')}${P.em?' · '+maskMail(P.em):''}</em></div></div>
  <div class="db">`;
 if(P.need){
  const rs=[]; if(P.low)rs.push(`매칭 신뢰도 ${P.conf} (0.7 미만)`);
  if(P.nb)rs.push(`기간전 논문 ${P.nb}편`); if(P.na)rs.push(`기간후 논문 ${P.na}편`);
  h+=`<div class="alert"><b>⚠ 검토필요</b><i>${rs.join(' · ')}</i></div>`;
 }
 const pS=ps.reduce((a,x)=>a+(x.sc||0),0), pSn=ps.reduce((a,x)=>a+(x.gw||0),0);
 h+=`<div class="dgrid">
   <div class="dbox"><div class="l">논문</div><div class="n">${N(ps.length)}</div></div>
   <div class="dbox"><div class="l">총 인용</div><div class="n">${N(cite)}</div></div>
   <div class="dbox"><div class="l">환산점수</div><div class="n">${pS.toFixed(1)}</div></div>
   <div class="dbox"><div class="l">환산편수</div><div class="n">${pSn.toFixed(1)}</div></div>
   <div class="dbox"><div class="l">SCI / KCI</div><div class="n" style="font-size:17px">${N(sci)} / ${N(kci)}</div></div>
   <div class="dbox"><div class="l">평균 IF</div><div class="n" style="font-size:17px">${ifs.length?(ifs.reduce((a,b)=>a+b,0)/ifs.length).toFixed(1):'-'}</div></div>
  </div>`;
 if(!ps.length){ h+='<div class="empty">2020~2025년 논문 없음</div></div>'; }
 else{
  // ── 등급 구성 띠 + AI 편수. 미판정 비율이 점수와 같은 화면에 있어야 한다.
  h+=gradeBand(ps);
  h+=`<div class="dsec"><h4>연도별 논문</h4><div class="ybar">
   ${Object.entries(yr).map(([y,v])=>`<div title="${y} · ${N(v)}편"><i style="height:${Math.max(3,v/my*56)}px"><em style="height:100%;background:linear-gradient(180deg,#93c5fd,#3b82f6)"></em></i><span>${y.slice(2)}</span></div>`).join('')}
   </div></div>
   <div class="dsec"><h4>저자 역할</h4>
    <div class="rsb">${rr.map(([k,v])=>`<i style="width:${v/rt*100}%;background:${RC[k]||'var(--c2)'}" title="${k} ${N(v)}"></i>`).join('')}</div>
    <div class="rlg">${rr.map(([k,v])=>`<span><i style="background:${RC[k]||'var(--c2)'}"></i>${esc(k)} ${N(v)}</span>`).join('')}</div></div>
   <div class="dsec"><h4>주요 게재 저널</h4>
    ${jj.map(([n2,c])=>`<div class="jl"><div class="t" title="${esc(n2)}">${esc(n2)}</div><div class="b"><i style="width:${c/jm*100}%"></i></div><div class="c">${N(c)}</div></div>`).join('')}</div>
   <div class="dsec"><h4>최다 인용 논문</h4>
    ${top.map(p=>`<div class="tp">${p.doi?`<a href="https://doi.org/${encodeURI(p.doi)}" target="_blank" rel="noopener noreferrer">${esc(p.t)}</a>`:`<span class="nt">${esc(p.t)}</span>`}
     <div class="m">${esc(p.y)} · ${esc(p.j)} · 인용 <b>${N(p.c)}</b>${p.doi?'':' · DOI 없음'}</div></div>`).join('')}</div>`;
  h+=scoreBreakdown(ps);
  const prof=DATA.depts[dp].profs.find(x=>x.sid===sid);
  if(prof) h+=`<div class="dsec"><h4>공저 중심 연결학생 ${prof.nkid}명</h4><div class="ymeta" style="margin:0;padding:0;border:0">공저 논문 수 기준으로 연결한 추정값입니다. <b>공식 지도관계가 아닙니다.</b></div></div>`;
  else if(isStu&&P.via) h+=`<div class="dsec"><h4>연결 교수(추정)</h4><div class="ymeta" style="margin:0;padding:0;border:0">같은 학과 교수와 공저 <b>${P.via}편</b> 기준으로 연결했습니다. 공식 지도관계가 아닙니다.</div></div>`;
  h+='</div>';
 }
 const drw=document.getElementById('drw');
 drw.innerHTML=h; drw.classList.add('on'); document.getElementById('scrim').classList.add('on');
 document.getElementById('drwX').onclick=closePerson;
 if(ps.length){ let shown=BRK_STEP; paintBreakdown(ps,shown);
  const mb=document.getElementById('brkMore');
  if(mb) mb.onclick=()=>{ shown+=BRK_STEP; paintBreakdown(ps,shown); }; }
 drw.querySelector('.x').focus();
}
function closePerson(){document.getElementById('drw').classList.remove('on');
 document.getElementById('scrim').classList.remove('on');}
document.getElementById('scrim').onclick=closePerson;
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePerson();});

function bind(){
 document.querySelectorAll('#tb .pn').forEach(el=>el.onclick=e=>{
  e.stopPropagation(); openPerson(el.dataset.p);});
 document.querySelectorAll('#tb .row').forEach(r=>r.onclick=e=>{
  if(e.target.closest('.pn')||e.target.closest('a')) return;
  e.stopPropagation();
  const k=(r.dataset.t=='p'?'P':'')+r.dataset.k;
  OPEN.has(k)?OPEN.delete(k):OPEN.add(k); tree();
  const el=document.querySelector(`#tb .row[data-k="${CSS.escape(r.dataset.k)}"][data-t="${r.dataset.t}"]`);
  if(el) el.scrollIntoView({block:'nearest'});
 });
}
CUR=D.slice().sort((a,b)=>b.papers-a.papers)[0].d;
deptList(); detail();
