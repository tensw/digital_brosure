/* ── 공저자 관계망 ── */
let NSEL=null;
const NGY={'이공':'#3b82f6','의약생명':'#0f9c6d','인문사회':'#7c3aed'};
function nOrder(){
 const D=NET.depts, gy=['이공','의약생명','인문사회'];
 return Object.keys(D).sort((a,b)=>gy.indexOf(D[a].gy)-gy.indexOf(D[b].gy)||(D[b].in+D[b].out)-(D[a].in+D[a].out));
}
function netGraph(){
 const D=NET.depts, M=NET.mtx, ord=nOrder(), n=ord.length;
 const W=680,H=620,cx=W/2,cy=H/2,R=214;
 const pos={}; ord.forEach((d,i)=>{const a=-Math.PI/2+i/n*Math.PI*2;pos[d]={x:cx+Math.cos(a)*R,y:cy+Math.sin(a)*R,a};});
 const mxL=Math.max(...Object.values(M).flatMap(o=>Object.values(o)),1);
 const mxP=Math.max(...ord.map(d=>D[d].ppl),1);
 let e='',seen=new Set();
 ord.forEach(a=>Object.entries(M[a]||{}).forEach(([b,v])=>{
  const k=[a,b].sort().join('|'); if(seen.has(k))return; seen.add(k);
  const A=pos[a],B=pos[b]; if(!A||!B)return;
  const on=!NSEL||NSEL===a||NSEL===b;
  const w=Math.max(.6,Math.sqrt(v/mxL)*7);
  e+=`<path d="M${A.x.toFixed(1)} ${A.y.toFixed(1)}Q${cx} ${cy} ${B.x.toFixed(1)} ${B.y.toFixed(1)}"
   fill="none" stroke="${NSEL&&on?'var(--navy)':'var(--c4)'}" stroke-width="${w.toFixed(1)}"
   stroke-opacity="${on?(NSEL?.5:.26):.05}" stroke-linecap="round"><title>${esc(a)} ↔ ${esc(b)} · ${v}쌍</title></path>`;}));
 let nd='';
 ord.forEach(d=>{const p=pos[d],v=D[d],r=6+Math.sqrt(v.ppl/mxP)*13;
  const on=!NSEL||NSEL===d||(M[NSEL]&&M[NSEL][d]);
  const lx=p.x+Math.cos(p.a)*(r+7), ly=p.y+Math.sin(p.a)*(r+7);
  const anc=Math.cos(p.a)>.12?'start':Math.cos(p.a)<-.12?'end':'middle';
  nd+=`<g class="nn ${NSEL===d?'pk':''}" data-d="${esc(d)}" opacity="${on?1:.24}">
   <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${NGY[v.gy]||'var(--c4)'}" fill-opacity=".72" stroke="${NGY[v.gy]||'var(--c4)'}"/>
   <text x="${lx.toFixed(1)}" y="${(ly+3).toFixed(1)}" text-anchor="${anc}">${esc(d.length>11?d.slice(0,10)+'…':d)}</text>
   <title>${esc(d)} · ${v.gy}\n관계망 보유 ${N(v.ppl)}명 · 학과 내 ${N(v.in)}쌍 · 학과 간 ${N(v.out)}쌍 · 연결 ${v.part}개 학과</title></g>`;});
 return `<svg class="netsvg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="학과 간 공저 관계망">${e}${nd}</svg>`;
}
function netSide(){
 const D=NET.depts, M=NET.mtx;
 if(NSEL){
  const v=D[NSEL], ps=Object.entries(M[NSEL]||{}).sort((a,b)=>b[1]-a[1]);
  const mx=ps.length?ps[0][1]:1;
  return `<div class="fl" style="margin-bottom:11px"><button class="fbtn" data-nback="1">← 전체 학과</button></div>
   <div class="dvk"><div><div class="d">관계망 보유</div><div class="num">${N(v.ppl)}<span> / ${N(v.nAll)}명</span></div></div>
    <div><div class="d">학과 내 협업</div><div class="num">${N(v.in)}<span> 쌍</span></div></div>
    <div><div class="d">학과 간 협업</div><div class="num">${N(v.out)}<span> 쌍</span></div></div>
    <div><div class="d">타 학과 협력자</div><div class="num">${N(v.ext)}<span> 명</span></div></div></div>
   <div class="sub-t">협업 상대 학과 ${ps.length}개</div><div class="dev">${
    ps.slice(0,12).map(([d,c])=>`<div class="dl"><div class="n" data-nd="${esc(d)}">${esc(d)}</div>
     <div class="bar"><i style="width:${(c/mx*100).toFixed(0)}%;background:${NGY[D[d].gy]||'var(--c4)'}"></i></div>
     <div class="v">${N(c)}</div></div>`).join('')}</div>
   ${ps.length?'':'<div class="empty" style="padding:14px 0">다른 학과와의 공저 관계가 없습니다.</div>'}
   ${relList(NET.rel[NSEL]||[], NSEL)}`;}
 const T=NET.top, mx=T[0]?T[0].n:1;
 return `<div class="sub-t">협업이 가장 많은 학과쌍</div><div class="dev wide">${
  T.map(t=>`<div class="dl"><div class="n" data-nd="${esc(t.a)}" title="${esc(t.a)} ↔ ${esc(t.b)}">${esc(t.a)}<span class="ar"> ↔ </span>${esc(t.b)}</div>
   <div class="bar"><i style="width:${(t.n/mx*100).toFixed(0)}%;background:var(--navy)"></i></div>
   <div class="v">${N(t.n)}</div></div>`).join('')}</div>
  <div class="d" style="margin:9px 0 0">원을 누르면 그 학과의 협업 상대만 봅니다.</div>
  ${relList(NET.trel||[], null)}`;
}
/* 개인 단위 협업 상세 — 누구와, 몇 편, 언제, 어느 저널 */
function relList(rows,dept){
 if(!rows.length) return '';
 return `<div class="sub-t">협업 상세 · 누구와 몇 편, 언제, 어느 저널${dept?'':' (전 학과 상위)'}</div>`+
  rows.map(r=>{
   const od=dept? (r.ad===dept?r.bd:r.ad) : null;
   return `<div class="rel"><div class="p"><b>${esc(r.a)}</b><span class="jk ${r.aj==='대학원생'?'st':''}">${esc(r.aj)}</span>
    <span class="ar">↔</span><b>${esc(r.b)}</b><span class="jk ${r.bj==='대학원생'?'st':''}">${esc(r.bj)}</span>
    ${dept? (r.ad!==r.bd?`<span class="od" data-nd="${esc(od)}">${esc(od)}</span>`:'')
          : `<span class="od" data-nd="${esc(r.ad)}">${esc(r.ad)}${r.ad!==r.bd?' ↔ '+esc(r.bd):''}</span>`}</div>
    <div class="m">공저 ${N(r.n)}편${r.y0?` · ${r.y0}${r.y1&&r.y1!==r.y0?'~'+r.y1:''}`:''}${r.j.length?` · ${r.j.map(esc).join(', ')}`:''}</div></div>`;
  }).join('')+
  `<div class="d" style="margin:8px 0 0">개인 값은 학과 내부 관리용입니다. 순위표로 배포하지 않습니다.</div>`;
}
function netBoard(){
 const S=NET.sum, K=NET.kind, SC=NET.scope, D=NET.depts;
 const kt=Object.values(K).reduce((a,b)=>a+b,0)||1;
 const KC={'교수-학생':'var(--navy)','학생-학생':'#3b82f6','교수-교수':'#8fb0e4'};
 let h=`<div class="ehead"><h2>SKKU BK21(교내) 공저자 관계망</h2>
  <span class="n">BK21 참여자 ${N(S.tot)}명 · 성과기간 2020~2025 · 학과·전공 28개</span>
  <span class="pill in">내부 관리기준</span>
  <div class="ex"><b>관계 정의</b> · 같은 논문에 BK21 참여자가 둘 이상 이름을 올리면 그 둘을 협업 관계 한 쌍으로 셉니다.
   같은 쌍이 여러 편을 함께 썼어도 <b>관계는 한 쌍</b>이고, 편수는 따로 집계합니다.
   저자 60명이 넘는 대량공저 논문은 협업으로 보지 않고 제외했습니다.
   <br>이 화면의 수치는 <b>사업단 참여자끼리의 교내 관계망</b>입니다. 타기관·해외 공저자를 포함한 전체 관계망과 분야 검색은 좌측 <b>SKKU 글로벌 공저자 관계망</b>에서 봅니다.</div></div>`;

 h+=`<div class="kpis">
  <div class="kpi" style="--c:var(--navy)"><div class="lb">협업 관계쌍</div><div class="vl">${N(S.pair)}<small>쌍</small></div><div class="dt">공저 논문 ${N(S.pap)}편</div></div>
  <div class="kpi" style="--c:#3b82f6"><div class="lb">관계망 보유 참여자</div><div class="vl">${N(S.ppl)}<small>명</small></div><div class="dt">전체 ${N(S.tot)}명의 ${(S.ppl/S.tot*100).toFixed(0)}%</div></div>
  <div class="kpi" style="--c:#0f9c6d"><div class="lb">1인당 협력자</div><div class="vl">${S.avg}<small>명</small></div><div class="dt">중앙값 ${S.med}명 · 최대 ${S.max}명</div></div>
  <div class="kpi" style="--c:#f5a623"><div class="lb">학과 간 협업</div><div class="vl">${N(SC['학과 간']||0)}<small>쌍</small></div><div class="dt">전체 관계의 ${((SC['학과 간']||0)/S.pair*100).toFixed(0)}%</div></div>
  <div class="kpi" style="--c:#7c3aed"><div class="lb">교수 ↔ 학생 협업</div><div class="vl">${N(K['교수-학생']||0)}<small>쌍</small></div><div class="dt">전체 관계의 ${((K['교수-학생']||0)/S.pair*100).toFixed(0)}%</div></div>
  <div class="kpi k-warn" style="--c:#64708a"><div class="lb">관계 없는 참여자</div><div class="vl">${N(S.tot-S.ppl)}<small>명</small></div><div class="dt">참여자 간 공저 이력 없음</div></div>
 </div>`;

 h+=`<div class="erow n2">
  <div class="ncol">
   <div class="ecard"><h3>학과 간 협업 지도</h3>${ins(`선이 굵을수록 두 학과가 <b>함께 쓴 논문이 많다</b>는 뜻입니다. 홀로 떨어진 학과는 교내 협업이 적다는 신호입니다.`)}
    <div class="d">원 하나가 학과·전공입니다. <b>원 크기</b>는 관계망을 가진 참여자 수, <b>선 굵기</b>는 두 학과 사이 협업 관계쌍 수입니다.
     같은 계열끼리 붙여 배치해, 계열 안의 협업과 계열을 넘는 협업이 구분되어 보입니다.</div>
    <div id="ngraph">${netGraph()}</div>
    <div class="mxlg">${Object.entries(NGY).map(([g,c])=>`<span><i style="background:${c}"></i>${g}</span>`).join('')}
     <span style="margin-left:auto">원을 누르면 그 학과의 협업만 남습니다</span></div></div>
   <div class="ecard"><h3>협업 매트릭스</h3>${ins(`어느 학과끼리 붙어 있는지 격자로 봅니다. <b>빈 줄이 길게 이어지는 학과</b>가 협업이 끊긴 곳입니다.`)}
    <div class="d">같은 내용을 격자로 봅니다. 칸이 진할수록 두 학과가 맺은 협업 관계쌍이 많습니다.
     <b>테두리 친 대각선</b>은 학과 안에서의 협업이고, 나머지는 학과를 넘는 협업입니다. 원형 지도에서 겹쳐 보이던 관계를 하나씩 짚어볼 수 있습니다.</div>
    <div class="nmw" id="nmx">${netMatrix()}</div></div>
  </div>
  <div class="ecard" id="nsideC"><h3 id="nsideT">협업 상대</h3>${ins(`그 학과가 <b>주로 누구와 일하는지</b>입니다. 상대가 한두 곳에 몰려 있으면 관계가 좁다는 뜻입니다.`)}<div id="nside">${netSide()}</div></div></div>`;

 h+=`<div class="erow e2">
  <div class="ecard"><h3>관계 구성</h3>${ins(`교내·교외·해외 중 <b>어디에 기대고 있는지</b>의 구성입니다.`)}
   <div class="d">누가 누구와 협업하는지의 구성비입니다. 교수↔학생 비중은 지도 기반 공동연구가 실제로 논문으로 이어지는 정도를 보여줍니다.</div>
   <div class="sbar">${Object.entries(K).sort((a,b)=>b[1]-a[1]).map(([k,v])=>
     `<i style="width:${(v/kt*100).toFixed(1)}%;background:${KC[k]}" title="${k} ${N(v)}쌍"></i>`).join('')}</div>
   <div class="mxlg">${Object.entries(K).sort((a,b)=>b[1]-a[1]).map(([k,v])=>
     `<span><i style="background:${KC[k]}"></i>${k} ${N(v)}쌍 · ${(v/kt*100).toFixed(0)}%</span>`).join('')}</div>
   <div class="sub-t">협업 범위</div>
   <div class="sbar">${['학과 내','학과 간'].map((k,i)=>
     `<i style="width:${((SC[k]||0)/S.pair*100).toFixed(1)}%;background:${i?'#f5a623':'var(--navy)'}" title="${k} ${N(SC[k]||0)}쌍"></i>`).join('')}</div>
   <div class="mxlg">${['학과 내','학과 간'].map((k,i)=>
     `<span><i style="background:${i?'#f5a623':'var(--navy)'}"></i>${k} ${N(SC[k]||0)}쌍 · ${((SC[k]||0)/S.pair*100).toFixed(0)}%</span>`).join('')}</div></div>
  <div class="ecard"><h3>협력자 수 분포</h3>${ins(`몇 사람이 협업을 떠받치는지 봅니다. <b>한쪽에 몰려 있으면 그 사람이 빠질 때 관계가 끊깁니다.</b>`)}
   <div class="d">참여자 한 명이 몇 명과 함께 썼는지의 분포입니다. 소수에게 협업이 몰려 있는지, 넓게 퍼져 있는지를 봅니다.</div>
   <div class="dev">${(()=>{const mx=Math.max(...NET.hist.map(x=>x[1]),1);
    return NET.hist.map(([k,v])=>`<div class="dl"><div class="n">${k}명과 협업</div>
     <div class="bar"><i style="width:${(v/mx*100).toFixed(0)}%;background:#3b82f6"></i></div>
     <div class="v">${N(v)}<span class="pc" style="color:var(--ink3)">명</span></div></div>`).join('');})()}</div>
   <div class="d" style="margin:9px 0 0">관계망을 가진 ${N(S.ppl)}명 기준. 평균 ${S.avg}명, 중앙값 ${S.med}명으로 평균이 소수의 넓은 관계망에 끌려 올라갑니다.</div></div></div>`;

 const ord=nOrder();
 h+=`<div class="ecard"><h3>학과별 협업 프로필</h3>${ins(`학과마다 협업 성향이 다릅니다. <b>많이·넓게·깊게</b> 중 어느 쪽인지 보십시오.`)}
  <div class="d">학과 안에서만 협업하는지, 다른 학과로 뻗는지를 봅니다. <b>연결 학과</b>가 많을수록 학제 협업이 넓습니다.</div>
  <div style="overflow:auto;max-height:520px"><table class="mtx netx">
  <colgroup>${['24%','9%','11%','13%','12%','12%','12%','11%'].map(w=>`<col style="width:${w}">`).join('')}</colgroup>
  <thead><tr><th class="l">학과·전공</th><th>계열</th><th style="text-align:right">참여자</th>
   <th style="text-align:right">관계망 보유</th><th style="text-align:right">학과 내 쌍</th>
   <th style="text-align:right">학과 간 쌍</th><th style="text-align:right">타 학과 협력자</th><th style="text-align:right">연결 학과</th></tr></thead><tbody>`;
 ord.forEach(d=>{const v=D[d];
  h+=`<tr data-nd="${esc(d)}" class="${NSEL===d?'sel':''}"><td class="l"><span class="dn">${esc(d)}</span></td>
   <td><span class="gys" style="background:${NGY[v.gy]||'var(--c4)'}">${v.gy||'—'}</span></td>
   <td class="num">${N(v.nAll)}</td>
   <td class="num">${N(v.ppl)}<span class="dg"> ${v.nAll?Math.round(v.ppl/v.nAll*100):0}%</span></td>
   <td class="num">${N(v.in)}</td><td class="num">${N(v.out)}</td>
   <td class="num">${N(v.ext)}<span class="dg"> 명</span></td>
   <td class="num">${v.part}<span class="dg"> /27</span></td></tr>`;});
 h+=`</tbody></table></div>
  <div class="lgs"><span style="margin-left:auto">행을 누르면 위 지도에서 그 학과만 남습니다</span></div></div>`;

 h+=srcCard('net');
 document.getElementById('v-net').innerHTML=h;
 wireNet();
 srcWire(document.getElementById('v-net'));
}
function wireNet(){
 document.querySelectorAll('#v-net .netsvg .nn').forEach(g=>g.onclick=()=>pickNet(g.dataset.d));
 document.querySelectorAll('#v-net [data-nd]').forEach(el=>el.onclick=e=>{e.stopPropagation();pickNet(el.dataset.nd);});
 const bk=document.querySelector('#v-net [data-nback]'); if(bk) bk.onclick=()=>pickNet(NSEL);
}
function pickNet(d){
 NSEL=(NSEL===d?null:d);
 document.getElementById('ngraph').innerHTML=netGraph();
 const mw=document.getElementById('nmx'); if(mw) mw.innerHTML=netMatrix();
 document.getElementById('nsideT').textContent=NSEL?NSEL+' 협업':'협업 상대';
 document.getElementById('nside').innerHTML=netSide();
 document.querySelectorAll('#v-net .netx tr[data-nd]').forEach(r=>r.classList.toggle('sel',r.dataset.nd===NSEL));
 wireNet();
}


/* ── 협업 매트릭스 (히트맵) ── */
function netMtxMax(){
 const M=NET.mtx; let mx=1;
 Object.values(M).forEach(o=>Object.values(o).forEach(v=>{if(v>mx)mx=v;}));
 return mx;
}
function ncol(v,mx){
 if(!v) return 'var(--line2)';
 const t=Math.log(1+v)/Math.log(1+mx);
 return `rgba(46,58,89,${(0.10+t*0.85).toFixed(3)})`;
}
function netMatrix(){
 const D=NET.depts, M=NET.mtx, ord=nOrder(), mx=netMtxMax();
 const ab=d=>d.length>9?d.slice(0,8)+'…':d;
 let h=`<table class="nmx"><tr><th></th>${ord.map(d=>`<th class="ch"><div title="${esc(d)}">${esc(ab(d))}</div></th>`).join('')}</tr>`;
 ord.forEach(a=>{
  h+=`<tr class="${NSEL===a?'on':''}"><th class="rh" title="${esc(a)}" data-nd="${esc(a)}">${esc(a)}</th>`;
  ord.forEach(b=>{const v=(M[a]||{})[b]||0;
   h+=`<td class="${a===b?'dg':''}" style="background:${ncol(v,mx)}" data-nd="${esc(a===b?a:b)}"
    title="${esc(a)} ↔ ${esc(b)} · ${N(v)}쌍${a===b?' (학과 내)':''}"></td>`;});
  h+='</tr>';});
 const steps=[0,1,4,16,64,mx];
 return h+'</table>'+
  `<div class="nmlg"><span>협업쌍</span>${steps.map(s=>`<i style="background:${ncol(s,mx)}"></i>`).join('')}<span>0 → ${N(mx)}</span>
   <span style="margin-left:auto">테두리 친 대각선은 학과 내 협업 · 칸을 누르면 그 학과로 이동</span></div>`;
}

/* ── 분야 검색 → 글로벌 공저자 추천 ── */
let RQ='', RT=null, RF={k:'all',d:'all',gap:false};
const RIDX=()=>RECO.terms;
function recoCard(){
 const M=RECO.meta;
 return `<div class="ecard" id="recoC"><h3>분야로 찾는 협력 후보 <span class="pill in">교외 · 전 세계</span></h3>${ins(`주제를 골라 <b>같이 일할 만한 사람</b>을 찾는 칸입니다.`)}
  <div class="d">보유 논문 <b>${N(M.papers)}편</b>에 이름을 올린 <b>교외 저자 ${N(M.ext)}명</b>(소속기관 ${N(M.aff)}곳)에서, 찾는 분야로 실제 논문을 낸 사람을 꺼내 옵니다.
   분야 용어는 저널 제목에서 뽑은 <b>${N(M.vocab)}개</b> 중 논문 40편 이상인 <b>${N(RECO.terms.length)}개</b>입니다.
   저자 ${M.maxa}명이 넘는 대량공저 논문은 제외했습니다 — 넣으면 대형 실험 컨소시엄이 모든 분야의 추천을 덮습니다.</div>
  <div class="srch"><input id="rq" type="search" placeholder="분야를 입력하세요 — polymer, cancer, artificial intelligence, 반도체 …" autocomplete="off">
   <div class="fl" id="rfl"></div></div>
  <div id="rbody"></div></div>`;
}
function recoTerms(q){
 const t=RECO.terms;
 if(!q) return t.slice(0,28);
 const s=q.toLowerCase().trim();
 return t.filter(x=>x.t.includes(s)).sort((a,b)=>
   (a.t===s?-2:0)-(b.t===s?-2:0) || (a.t.startsWith(s)?-1:0)-(b.t.startsWith(s)?-1:0) || b.n-a.n).slice(0,28);
}
function recoBody(){
 const B=document.getElementById('rbody'); if(!B) return;
 const hits=recoTerms(RQ);
 if(!RT||!hits.some(x=>x.t===RT)){ RT=hits.length?hits[0].t:null; }
 let h='';
 if(!hits.length){
  B.innerHTML=`<div class="empty" style="padding:22px">"${esc(RQ)}"에 해당하는 분야가 없습니다. 저널 제목에서 뽑은 용어만 검색됩니다 — 아래 예시를 눌러 보세요.
   <div class="chips" style="margin-top:11px">${['polymer','cancer','artificial intelligence','energy','semiconductor','neuroscience','catalysis','robotics'].map(t=>`<button class="chip" data-rt="${t}">${t}</button>`).join('')}</div></div>`;
  wireReco(); return; }
 h+=`<div class="chips">${hits.map(x=>`<button class="chip ${RT===x.t?'on':''}" data-rt="${esc(x.t)}">${esc(x.t)}<em>${N(x.n)}</em></button>`).join('')}</div>`;
 const T=RECO.terms.find(x=>x.t===RT), R=(RECO.reco[RT]||[]);
 const dept=RF.d, kind=RF.k;
 // 학과 선택은 표시 기준(그 학과와의 공저 여부). 걸러내는 것은 '아직 공저 없는 후보만' 토글 하나뿐이다.
 const rows=R.filter(r=>(kind==='all'||r.k===kind)&&(!RF.gap||dept==='all'||!r.d.includes(dept)));
 const ko=R.filter(r=>r.k==='국내').length, ov=R.length-ko;
 h+=`<div class="rhead"><div><b>${esc(RT)}</b><span> 논문 ${N(T.n)}편 · 후보 ${R.length}명 (해외 ${ov} · 국내 ${ko})</span></div>
  <div class="d" style="margin:5px 0 0">대표 저널 ${T.j.map(j=>esc(j)).join(' · ')}</div></div>`;
 if(!rows.length) h+=`<div class="empty" style="padding:18px">조건에 맞는 후보가 없습니다.</div>`;
 else{
  const mx=Math.max(...rows.map(r=>r.p),1);
  h+=`<table class="mtx rtab"><colgroup><col style="width:22%"><col style="width:26%"><col style="width:8%"><col style="width:20%"><col style="width:24%"></colgroup>
   <thead><tr><th class="l">연구자</th><th class="l">소속기관</th><th>구분</th><th style="text-align:right">이 분야 논문</th><th class="l">협력 이력</th></tr></thead><tbody>`;
  rows.forEach(r=>{
   const nw=dept!=='all'&&!r.d.includes(dept);
   h+=`<tr><td class="l"><span class="dn">${esc(r.n)}</span></td>
    <td class="l"><span class="aff">${esc(r.g)}</span></td>
    <td><span class="gys" style="background:${r.k==='해외'?'#3b82f6':'#0f9c6d'}">${r.k}</span></td>
    <td><div class="pcell"><span class="pb"><i style="width:${(r.p/mx*100).toFixed(0)}%;background:var(--navy)"></i></span><b style="font:700 12px var(--num)">${N(r.p)}</b></div></td>
    <td class="l">${nw?`<span class="ac ac-w">${esc(dept)}와 신규</span>`
      : r.d.length ? `<span class="ac ac-k" title="${r.d.map(esc).join(' · ')}">${esc(r.d[0])}${r.d.length>1?` 외 ${r.d.length-1}`:''}</span>`
      : `<span class="ac ac-p">BK21 공저 없음</span>`}</td></tr>`;});
  h+='</tbody></table>';
 }
 h+=`<div class="d" style="margin:11px 0 0"><b>읽는 법</b> · <b>협력 이력</b>은 이 후보가 함께 논문을 낸 BK21 학과입니다.
  <b>BK21 공저 없음</b>은 우리 논문에 이름은 있으나 BK21 참여자와는 겹치지 않은 경우로, 새로 트일 여지가 큰 쪽입니다. 학과를 고르면 그 학과와 아직 공저가 없는 후보에 <b>신규</b> 표시가 붙습니다.
  <br><b>한계</b> · 원천에 저자 국적이 없어 <b>국내·해외는 소속기관 표기로 추정</b>했습니다. 같은 이름은 한 사람으로 묶고 소속은 가장 많이 나온 표기를 씁니다. 흔한 이름은 다른 사람이 합쳐질 수 있습니다. 저자명 칸에 들어온 기관·부서 문자열과 성+이니셜만 있는 이름은 후보에서 뺐습니다.</div>`;
 B.innerHTML=h; wireReco();
}
function recoFilters(){
 const F=document.getElementById('rfl'); if(!F) return;
 const ds=Object.keys(NET.depts).sort();
 F.innerHTML=`<button class="fbtn ${RF.k==='all'?'on':''}" data-rk="all">전체</button>
  <button class="fbtn ${RF.k==='해외'?'on':''}" data-rk="해외">해외</button>
  <button class="fbtn ${RF.k==='국내'?'on':''}" data-rk="국내">국내</button>
  <select class="rsel" id="rd"><option value="all">학과 기준 없음</option>${
   ds.map(d=>`<option value="${esc(d)}" ${RF.d===d?'selected':''}>${esc(d)}</option>`).join('')}</select>
  <button class="fbtn ${RF.gap?'on':''} ${RF.d==='all'?'off':''}" data-rgap="1" ${RF.d==='all'?'disabled':''}>아직 공저 없는 후보만</button>`;
 F.querySelectorAll('[data-rk]').forEach(b=>b.onclick=()=>{RF.k=b.dataset.rk;recoFilters();recoBody();});
 const sel=document.getElementById('rd');
 if(sel) sel.onchange=()=>{RF.d=sel.value; if(sel.value==='all')RF.gap=false; recoFilters(); recoBody();};
 const g=F.querySelector('[data-rgap]'); if(g&&!g.disabled) g.onclick=()=>{RF.gap=!RF.gap;recoFilters();recoBody();};
}
function wireReco(){
 document.querySelectorAll('#rbody [data-rt]').forEach(b=>b.onclick=()=>{RT=b.dataset.rt;recoBody();});
}
function recoInit(){
 const i=document.getElementById('rq'); if(!i) return;
 let t; i.oninput=()=>{clearTimeout(t);t=setTimeout(()=>{RQ=i.value;RT=null;recoBody();},160);};
 recoFilters(); recoBody();
}
