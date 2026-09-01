/* ── 대학 연구력 비교 ── */
const UME='성균관대';
let UMET='w', UHOT=null, USK='works', USD=-1;
const UU=()=>UV.unis, UM=()=>UV.meta;
const uMe=()=>UU().find(u=>u.nm===UME);
const uRank=(k)=>UU().slice().sort((a,b)=>b[k]-a[k]).findIndex(u=>u.nm===UME)+1;
const uCol=n=>(UU().find(u=>u.nm===n)||{}).col||'var(--c4)';

function univBoard(){
 const M=UM(), m=uMe();
 let h=`<div class="ehead"><h2>대학 연구력 비교</h2>
  <span class="n">7개 대학 · 국제는 OpenAlex · 국내는 KCI · 측정 ${esc(M.measured)}</span>
  <span class="pill off">원천 실측</span>
  <div class="ex"><b>서로 다른 두 목록을 나란히 놓고 봅니다. 더하지 않습니다.</b>
   <b>OpenAlex</b>는 전 세계 논문을 모은 목록으로, 국제 학술지 중심에 모든 분야가 들어 있고 저자가 누구인지까지 가려져 있습니다.
   <b>KCI</b>는 한국연구재단이 관리하는 국내 학술지 목록으로, 대개 주저자 한 명만 기록됩니다.
   같은 논문이 두 곳에 다 있을 수도 있어 <b>더하면 중복이 생깁니다.</b> 그래서 각각 따로 세어 나란히 보여 줍니다.
   한쪽이 다른 쪽을 깎는 계산이 아니라, <b>자가 두 개</b>라고 보시면 됩니다.</div></div>`;

 /* 성균관대 기준 KPI */
 const K=[['논문',N(m.works),'편','works',`2020~2025 ${N(m.period)}편`],
  ['피인용',(m.cites/1e6).toFixed(1),'M','cites',`총 ${N(m.cites)}회`],
  ['논문당 파급력',m.c2.toFixed(2),'','c2','2년 피인용 · 규모와 다른 축'],
  ['h-index',N(m.h),'','h',`i10 ${N(m.i10)}`],
  ['판별 연구자',N(m.authors),'명','authors','OpenAlex 저자 엔티티'],
  ['KCI 주도논문',N(m.kci),'편','kci',`2020~2025 ${N(m.kci2025)}편`]];
 h+=`<div class="kpis">${K.map(([l,v,u,k,d])=>`<div class="kpi" style="--c:${m.col}">
   <div class="lb">성균관대 ${esc(l)}</div><div class="vl">${v}${u?`<small>${u}</small>`:''}</div>
   <div class="dt"><i class="udot" style="background:${m.col}"></i><b>7개 대학 중 ${uRank(k)}위</b> · ${esc(d)}</div></div>`).join('')}</div>`;

 /* 규모×파급력 + 연도별 */
 h+=`<div class="erow e2">
  <div class="ecard"><h3>규모와 파급력</h3>${ins(`논문을 <b>얼마나 많이 쓰는가</b>(규모)와 <b>얼마나 읽히는가</b>(파급력)는 다른 이야기입니다. 둘을 같이 놓아야 「많이 쓰는데 안 읽히는지」, 「적게 쓰는데 크게 읽히는지」가 갈립니다.`)}
   <div class="d">가로는 논문 수, 세로는 논문당 2년 피인용입니다. <b>두 축은 따로 움직입니다</b> — 큰 학교가 반드시 파급력이 높지 않습니다.
    원 크기는 판별된 연구자 수입니다.</div>
   ${uScatter()}<div class="mxlg" id="ulg1"></div></div>
  <div class="ecard"><h3>연도별 추이</h3>${ins(`해마다 어떻게 움직였는지 봅니다. <b>한 해 값보다 방향</b>이 중요합니다. 최근 연도는 논문이 아직 다 집계되지 않아 낮게 보일 수 있습니다.`)}
   <div class="d">2015~2025년 변화입니다. 지표를 바꿔 보고, 범례에서 학교를 누르면 그 학교만 강조됩니다.</div>
   <div class="fl" id="umf"></div>
   <div id="ulines"></div></div></div>`;

 /* 비교 표 */
 h+=`<div class="ecard"><h3>대학 비교</h3>${ins(`대학마다 규모가 달라 <b>총량으로 견주면 큰 대학이 늘 이깁니다.</b> 1인당·비율 지표를 함께 보십시오.`)}
  <div class="d">열 이름을 누르면 그 지표로 정렬됩니다. 주황색 줄이 성균관대입니다.</div>
  <div style="overflow:auto"><table class="mtx uvx" id="utab"></table></div></div>`;

 /* 국제·국내 + BK */
 h+=`<div class="erow e2">
  <div class="ecard"><h3>국제 학술지와 국내 학술지는 다른 그림</h3>${ins(`국제지와 국내지는 <b>독자와 평가 방식이 다릅니다.</b> 둘을 합쳐 한 줄로 세우면 인문사회 분야가 실제보다 낮게 보입니다.`)}
   <div class="d">같은 학교인데 두 목록에서 순위가 뒤집힙니다. 어느 쪽에 논문을 내느냐가 다르기 때문입니다.</div>
   ${uDual()}
   <div class="d" style="margin:10px 0 0">카이스트·포스텍이 국내에서 낮게 나오는 것은 <b>연구를 못 해서가 아닙니다.</b>
    국내 학술지에 잘 내지 않고 국제 학술지에 집중하기 때문입니다. 실제로 OpenAlex에서 보면 이 두 학교의 논문 한 편당 파급력이 오히려 가장 높습니다.
    <b>한쪽만 보고 판단하면 이런 사실을 놓칩니다.</b></div></div>
  <div class="ecard"><h3>BK 학과 vs 그 외 학과 <span class="pill in">성균관대 한정</span></h3>${ins(`사업에 참여한 학과와 아닌 학과를 갈라 봅니다. <b>사업이 실제로 차이를 만들었는지</b> 확인하는 자리입니다.`)}
   <div class="d">BK 사업에 참여하는 <b>34개 학과</b>(연구자 ${N(M.bkYear.ppl.bk)}명)와 <b>그 외 학과</b>(${N(M.bkYear.ppl.non)}명)의 연구력을 해마다 견줍니다.
    인원이 두 배 가까이 차이나므로 <b>1인당</b>으로 봐야 공평합니다.</div>
   <div class="fl" id="ubf"></div>
   <div id="ubchart"></div></div></div>`;

 /* 강점 주제 */
 h+=`<div class="ecard"><h3>대학별 강점 주제 <span class="pill off">OpenAlex 주제</span></h3>${ins(`각 대학이 <b>어느 주제에 몰려 있는지</b>입니다. 우리와 겹치는 대학이 경쟁 상대이고, 안 겹치는 대학이 협력 상대입니다.`)}
  <div class="d">학교마다 논문이 가장 많이 쌓인 연구 주제입니다. OpenAlex에는 학과 구조가 없어, <b>학과 대신 주제로 학교의 색깔</b>을 봅니다.
   막대 길이는 그 학교 안에서의 상대 규모이고, 색은 상위 분야입니다.</div>
  <div class="fl" id="utf"></div>
  <div id="utopics"></div></div>`;

 /* 경쟁대학 측정 정보 유무 */
 const cs={ok:'ok',warn:'wt',no:'im',na:'sm'};
 h+=`<div class="ecard"><h3>경쟁대학 측정 정보 유무</h3>${ins(`비교가 안 되는 칸을 밝혀 둡니다. <b>빈칸은 실적이 없는 게 아니라 자료를 못 구한 것</b>입니다.`)}
  <div class="d">경쟁 대학에 대해 우리가 어떤 정보를 가지고 있는지입니다. <b>없는 정보를 있는 것처럼 쓰지 않기 위한 표</b>입니다.</div>
  <div style="overflow:auto"><table class="mtx uvc">
  <colgroup>${['16%','11%','11%','13%','49%'].map(w=>`<col style="width:${w}">`).join('')}</colgroup>
  <thead><tr><th class="l">측정 축</th><th>OpenAlex</th><th>KCI (우리)</th><th>BIBLO Scholar (성균관)</th><th class="l">근거와 한계</th></tr></thead><tbody>
  ${M.matrix.map(r=>`<tr><td class="l"><b>${esc(r.axis)}</b></td>
    <td><span class="sg sg-${cs[r.oa_s]}">${esc(r.oa)}</span></td>
    <td><span class="sg sg-${cs[r.kci_s]}">${esc(r.kci)}</span></td>
    <td><span class="sg sg-${cs[r.rims_s]}">${esc(r.rims)}</span></td>
    <td class="l dg">${esc(r.note)}</td></tr>`).join('')}
  </tbody></table></div>
  <div class="sub-t">어디서 가져온 자료인가</div>
  ${M.sources.map(s=>`<div class="usrc"><b>${esc(s.k)}</b><span>${esc(s.d)}</span><code>${esc(s.q)}</code></div>`).join('')}
  <div class="d" style="margin:11px 0 0"><b>권장 구성</b> · 학교 간 비교의 뼈대는 OpenAlex로 세우고 국내 실적은 KCI로 덧댑니다.
   학과·BK여부 세분은 성균관대 내부로 한정하거나, 다른 학교의 연구자 로스터를 확보한 뒤 넓힙니다.</div></div>`;

 h+=srcCard('univ');
 document.getElementById('v-univ').innerHTML=h;
 uMetricBar(); uLines(); uTable(); uTopics(); uLegend('ulg1'); uBKChart();
 srcWire(document.getElementById('v-univ'));
}
function uLegend(id){
 const el=document.getElementById(id); if(!el) return;
 el.innerHTML=UU().map(u=>`<span class="ulg ${UHOT===u.nm?'on':''}" data-uh="${esc(u.nm)}"><i style="background:${u.col}"></i>${esc(u.nm)}</span>`).join('')
  +`<span style="margin-left:auto;color:var(--ink3)">${UHOT?`${esc(UHOT)}만 강조 중 — 다시 누르면 해제`:'학교를 누르면 그 학교만 강조합니다'}</span>`;
 el.querySelectorAll('[data-uh]').forEach(b=>b.onclick=()=>{UHOT=(UHOT===b.dataset.uh?null:b.dataset.uh);
   document.getElementById('uscat').outerHTML=uScatter(); uLegend('ulg1'); uLines(); uTable();});
}
function uScatter(){
 const U=UU(), W=560,H=350,P={t:18,r:22,b:44,l:52},iw=W-P.l-P.r,ih=H-P.t-P.b;
 const mxW=Math.max(...U.map(u=>u.works))*1.08, mnC=Math.min(...U.map(u=>u.c2))*0.9, mxC=Math.max(...U.map(u=>u.c2))*1.06;
 const mxA=Math.max(...U.map(u=>u.authors));
 const x=v=>P.l+v/mxW*iw, y=v=>P.t+ih-(v-mnC)/(mxC-mnC)*ih;
 let s=`<svg class="uvsvg" id="uscat" viewBox="0 0 ${W} ${H}" role="img" aria-label="규모와 파급력">`;
 for(let i=0;i<=4;i++){const gx=P.l+iw*i/4, gy=P.t+ih*i/4;
  s+=`<line x1="${gx}" y1="${P.t}" x2="${gx}" y2="${P.t+ih}" stroke="var(--grid)"/>`;
  s+=`<line x1="${P.l}" y1="${gy}" x2="${P.l+iw}" y2="${gy}" stroke="var(--grid)"/>`;
  s+=`<text x="${gx}" y="${P.t+ih+15}" text-anchor="middle">${Math.round(mxW*i/4/1000)}천</text>`;
  s+=`<text x="${P.l-8}" y="${P.t+ih-ih*i/4+3.5}" text-anchor="end">${(mnC+(mxC-mnC)*i/4).toFixed(1)}</text>`;}
 s+=`<text x="${P.l+iw}" y="${P.t+ih+34}" text-anchor="end">논문 수 →</text>`;
 s+=`<text x="${P.l-8}" y="${P.t-6}" text-anchor="end">↑ 논문당 2년 피인용</text>`;
 U.slice().sort((a,b)=>b.authors-a.authors).forEach(u=>{
  const r=8+Math.sqrt(u.authors/mxA)*15, me=u.nm===UME, on=!UHOT||UHOT===u.nm;
  s+=`<circle cx="${x(u.works).toFixed(1)}" cy="${y(u.c2).toFixed(1)}" r="${r.toFixed(1)}" data-uh="${esc(u.nm)}"
    fill="${u.col}" fill-opacity="${on?(me?.85:.5):.1}" stroke="${u.col}" stroke-width="${me?3.2:1.8}" stroke-opacity="${on?1:.28}"
    ><title>${esc(u.nm)}\n논문 ${N(u.works)}편 · 논문당 2년 피인용 ${u.c2}\n연구자 ${N(u.authors)}명 · h-index ${u.h}</title></circle>`;
  s+=`<text class="ul ${me?'me':''}" x="${x(u.works).toFixed(1)}" y="${(y(u.c2)-r-6).toFixed(1)}" text-anchor="middle"
    opacity="${on?1:.18}">${esc(u.nm)}</text>`;});
 return s+'</svg>';
}
const UML={w:['논문 수','w'],c:['피인용','c'],oa:['오픈액세스','oa'],kci:['국내 KCI','kci']};
function uMetricBar(){
 const F=document.getElementById('umf'); if(!F) return;
 F.innerHTML=Object.entries(UML).map(([k,[l]])=>`<button class="fbtn ${UMET===k?'on':''}" data-um="${k}">${l}</button>`).join('')
  +`<span class="flab">${UMET==='kci'?'우리 논문 모음의 KCI 주도논문':'OpenAlex 연도별 집계'}</span>`;
 F.querySelectorAll('[data-um]').forEach(b=>b.onclick=()=>{UMET=b.dataset.um;uMetricBar();uLines();});
}
function uLines(){
 const box=document.getElementById('ulines'); if(!box) return;
 const U=UU(), yrs=[];for(let y=2015;y<=2025;y++)yrs.push(y);
 const val={};
 U.forEach(u=>{ val[u.nm]=yrs.map(y=>{
   if(UMET==='kci') return ((u.kciYear||[]).find(r=>r[0]===y)||[0,0])[1];
   const r=(u.years||[]).find(r=>r.y===y); return r?(r[UMET]||0):0; }); });
 const mx=Math.max(...Object.values(val).flat(),1);
 const W=560,H=310,P={t:16,r:64,b:32,l:52},iw=W-P.l-P.r,ih=H-P.t-P.b;
 const X=i=>P.l+iw*i/(yrs.length-1), Y=v=>P.t+ih-v/mx*ih;
 let s=`<svg class="uvsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="연도별 추이">`;
 for(let i=0;i<=4;i++){const gy=P.t+ih*i/4;
  s+=`<line x1="${P.l}" y1="${gy}" x2="${P.l+iw}" y2="${gy}" stroke="var(--grid)"/>`;
  s+=`<text x="${P.l-8}" y="${gy+3.5}" text-anchor="end">${mx>=10000?Math.round(mx*(4-i)/4/1000)+'천':N(Math.round(mx*(4-i)/4))}</text>`;}
 yrs.forEach((y,i)=>{ if(i%2===0) s+=`<text x="${X(i)}" y="${P.t+ih+15}" text-anchor="middle">${y}</text>`; });
 U.forEach(u=>{const on=!UHOT||UHOT===u.nm;
  const d=val[u.nm].map((v,i)=>`${i?'L':'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
  s+=`<path d="${d}" fill="none" stroke="${u.col}" stroke-width="${UHOT===u.nm?3.4:2.3}" stroke-opacity="${on?1:.18}"
    stroke-linejoin="round" stroke-linecap="round"/>`;
  val[u.nm].forEach((v,i)=>{s+=`<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="${UHOT===u.nm?3.4:2.2}"
    fill="${u.col}" fill-opacity="${on?1:.12}"><title>${esc(u.nm)} ${yrs[i]}년 ${N(v)}</title></circle>`;});
  const L=val[u.nm].length-1;
  s+=`<text class="ul ${UHOT===u.nm?'me':''}" x="${X(L)+6}" y="${Y(val[u.nm][L])+3.5}" text-anchor="start"
    fill="${u.col}" opacity="${on?1:.16}">${esc(u.nm)}</text>`;});
 box.innerHTML=s+'</svg>'+`<div class="d" style="margin:7px 0 0">${
  UMET==='c'?'피인용은 최근 연도일수록 쌓일 시간이 짧아 낮게 보입니다. 추세가 아니라 축적량입니다.'
  :UMET==='oa'?'오픈액세스 논문 수입니다. 모든 학교에서 꾸준히 늘고 있습니다.'
  :UMET==='kci'?'성균관대 2020년 급증은 KCI 적재 시점 차이로, 실제 생산 급증이 아닙니다.'
  :'최근 연도는 색인이 계속 붙어 나중에 올라갑니다.'}</div>`;
}
const UCOL=[['nm','학교','l'],['works','논문','n'],['period','2020~25','n'],['cites','피인용','n'],
 ['authors','연구자','n'],['h','h-index','n'],['c2','2년 피인용','n'],['kci','KCI 주도','n']];
function uTable(){
 const t=document.getElementById('utab'); if(!t) return;
 // USD = -1 이면 큰 값이 위(내림차순)
 const rows=UU().slice().sort((a,b)=>{const A=a[USK],B=b[USK];
   return (typeof A==='string')?A.localeCompare(B)*(USD<0?1:-1):(A-B)*USD;});
 t.innerHTML=`<colgroup>${['15%','13%','12%','15%','12%','10%','12%','11%'].map(w=>`<col style="width:${w}">`).join('')}</colgroup>
  <thead><tr>${UCOL.map(([k,l,a])=>`<th class="${a==='l'?'l':''} usort ${USK===k?'on':''}" data-uk="${k}"
    ${a==='n'?'style="text-align:right"':''}>${l}${USK===k?(USD<0?' ▾':' ▴'):''}</th>`).join('')}</tr></thead>
  <tbody>${rows.map(u=>`<tr class="${u.nm===UME?'me':''} ${UHOT===u.nm?'sel':''}" data-uh="${esc(u.nm)}">
    <td class="l"><span class="udot" style="background:${u.col}"></span><span class="dn">${esc(u.nm)}</span></td>
    <td class="num">${N(u.works)}</td><td class="num">${N(u.period)}</td><td class="num">${N(u.cites)}</td>
    <td class="num">${N(u.authors)}</td><td class="num">${N(u.h)}</td>
    <td class="num">${u.c2.toFixed(2)}</td><td class="num">${N(u.kci)}</td></tr>`).join('')}</tbody>`;
 t.querySelectorAll('[data-uk]').forEach(th=>th.onclick=()=>{
   const k=th.dataset.uk; if(USK===k) USD=-USD; else {USK=k;USD=-1;} uTable();});
 t.querySelectorAll('tbody [data-uh]').forEach(r=>r.onclick=()=>{UHOT=(UHOT===r.dataset.uh?null:r.dataset.uh);
   document.getElementById('uscat').outerHTML=uScatter(); uLegend('ulg1'); uLines(); uTable();});
}
function uDual(){
 const D=(UV.dom15&&UV.dom15.rows)||[];
 if(!D.length) return '<div class="empty" style="padding:18px">국내 대학 자료가 없습니다.</div>';
 const A=D.slice().sort((x,y)=>y.works-x.works);
 const B=D.slice().sort((x,y)=>y.kci-x.kci);
 const rkA={}, rkB={}; A.forEach((u,i)=>rkA[u.nm]=i+1); B.forEach((u,i)=>rkB[u.nm]=i+1);
 const mA=A[0].works, mB=B[0].kci, n=D.length;
 const RH=26;                                    /* CSS의 행 높이와 같아야 선이 맞는다 */
 const col=(arr,mx,key,rk)=>`<div class="udu">${arr.map(u=>`
   <div class="ur ${u.me?'me':''}" title="${esc(u.nm)} · 국제 ${rkA[u.nm]}위 ${N(u.works)}편 · 국내 ${rkB[u.nm]}위 ${N(u.kci)}편">
    <span class="rk">${rk[u.nm]}</span>
    <span class="nm">${esc(u.nm)}</span>
    <span class="bar"><i style="width:${(u[key]/mx*100).toFixed(0)}%;background:${u.me?'var(--accent)':u.col}"></i>
     <b>${N(u[key])}</b></span>
   </div>`).join('')}</div>`;
 /* 가운데 연결선 — 같은 학교가 두 목록에서 어디에 있는지 잇는다 */
 const LW=118, LH=RH*n;
 let sv=`<svg class="ulink" viewBox="0 0 ${LW} ${LH}" preserveAspectRatio="none" aria-hidden="true">`;
 D.forEach(u=>{const y1=(rkA[u.nm]-0.5)*RH, y2=(rkB[u.nm]-0.5)*RH;
  sv+=`<path d="M0,${y1} C${LW*0.5},${y1} ${LW*0.5},${y2} ${LW},${y2}" fill="none"
   stroke="${u.me?'var(--accent)':u.col}" stroke-opacity="${u.me?.95:.38}" stroke-width="${u.me?2.2:1.2}"
   vector-effect="non-scaling-stroke"/>`;});
 sv+='</svg>';
 const me=D.find(u=>u.me)||{};
 return `<div class="udual2">
   <div class="uduw"><div class="uduh">국제 <em>OpenAlex 논문</em></div>${col(A,mA,'works',rkA)}</div>
   <div class="ulinkw"><div class="uduh">&nbsp;</div>${sv}</div>
   <div class="uduw"><div class="uduh">국내 <em>KCI 주도논문</em></div>${col(B,mB,'kci',rkB)}</div>
  </div>
  <div class="d" style="margin:10px 0 0"><b>성균관대</b>는 국제 <b>${rkA[me.nm]}위</b>(${N(me.works)}편)인데 국내는 <b>${rkB[me.nm]}위</b>(${N(me.kci)}편)입니다.
   선이 아래로 크게 내려가는 학교일수록 국제 학술지에 몰려 있습니다.</div>`;
}
const UBM={p:['논문 수','편'],pc:['1인당 논문','편'],c:['피인용','회'],f:['FWCI','']};
let UBK='pc';
function uBKBar(){
 const F=document.getElementById('ubf'); if(!F) return;
 F.innerHTML=Object.entries(UBM).map(([k,[l]])=>`<button class="fbtn ${UBK===k?'on':''}" data-ub="${k}">${l}</button>`).join('')
  +`<span class="flab"><i class="ud" style="background:var(--accent)"></i>BK 34학과 <i class="ud" style="background:var(--c4)"></i>그 외 학과</span>`;
 F.querySelectorAll('[data-ub]').forEach(b=>b.onclick=()=>{UBK=b.dataset.ub;uBKBar();uBKChart();});
}
function uBKChart(){
 const box=document.getElementById('ubchart'); if(!box) return;
 uBKBar();
 const Y=UM().bkYear, PL=Y.ppl, yrs=Y.bk.map(r=>r[0]);
 const pick=(row,who)=>UBK==='p'?row[1]:UBK==='pc'?row[1]/PL[who]:UBK==='c'?row[2]:row[3];
 const A=Y.bk.map(r=>pick(r,'bk')), B=Y.non.map(r=>pick(r,'non'));
 const mx=Math.max(...A,...B)*1.12;
 const W=560,H=330,P={t:18,r:14,b:40,l:56},iw=W-P.l-P.r,ih=H-P.t-P.b;
 const bw=iw/yrs.length, gw=bw*0.34;
 const Y0=v=>P.t+ih-v/mx*ih;
 const fmt=v=>UBK==='pc'?v.toFixed(2):UBK==='f'?v.toFixed(2):N(Math.round(v));
 let s=`<svg class="uvsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="BK 학과와 그 외 학과 연도별 비교">`;
 for(let i=0;i<=4;i++){const gy=P.t+ih*i/4;
  s+=`<line x1="${P.l}" y1="${gy}" x2="${P.l+iw}" y2="${gy}" stroke="var(--grid)"/>`;
  s+=`<text x="${P.l-8}" y="${gy+3.5}" text-anchor="end">${fmt(mx*(4-i)/4)}</text>`;}
 yrs.forEach((y,i)=>{
  const cx=P.l+bw*i+bw/2;
  const a=A[i], b=B[i];
  s+=`<rect x="${(cx-gw-1).toFixed(1)}" y="${Y0(a).toFixed(1)}" width="${gw.toFixed(1)}" height="${(P.t+ih-Y0(a)).toFixed(1)}"
    rx="2.5" fill="var(--accent)"><title>${y}년 BK 34학과 ${fmt(a)}${UBM[UBK][1]}</title></rect>`;
  s+=`<rect x="${(cx+1).toFixed(1)}" y="${Y0(b).toFixed(1)}" width="${gw.toFixed(1)}" height="${(P.t+ih-Y0(b)).toFixed(1)}"
    rx="2.5" fill="var(--c4)"><title>${y}년 그 외 학과 ${fmt(b)}${UBM[UBK][1]}</title></rect>`;
  if(i%2===0) s+=`<text x="${cx.toFixed(1)}" y="${P.t+ih+15}" text-anchor="middle">${y}</text>`;});
 s+=`<line x1="${P.l}" y1="${P.t+ih}" x2="${P.l+iw}" y2="${P.t+ih}" stroke="var(--line)"/>`;
 const L=yrs.length-1, r0=A[0]/B[0], r1=A[L]/B[L];
 box.innerHTML=s+'</svg>'+
  `<div class="ubn"><b>${yrs[0]}년</b> BK ${fmt(A[0])} · 그 외 ${fmt(B[0])} <span>(${r0.toFixed(1)}배)</span>
    &nbsp;→&nbsp; <b>${yrs[L]}년</b> BK ${fmt(A[L])} · 그 외 ${fmt(B[L])} <span>(${r1.toFixed(1)}배)</span></div>
   <div class="d" style="margin:8px 0 0">${
    UBK==='pc'?'인원 차이를 지운 값입니다. BK 학과 연구자 한 사람이 해마다 몇 편을 냈는지입니다.'
    :UBK==='p'?'전체 편수입니다. BK 학과는 인원이 절반가량이라 편수만으로는 공평한 비교가 아닙니다.'
    :UBK==='c'?'그 해 논문이 지금까지 받은 피인용 합계입니다. 최근 연도는 쌓일 시간이 짧아 낮게 나옵니다.'
    :'FWCI는 같은 분야·같은 연도 평균을 1로 놓은 값입니다. 1을 넘으면 세계 평균 이상입니다.'}
   ${UBK==='f'?' <b>두 집단 모두 1을 넘습니다.</b>':''}</div>
   <div class="d" style="margin:7px 0 0"><b>주의</b> · BK 34학과에 이공·의약생명이 몰려 있어 분야 관행 차이가 섞여 있습니다.
    분야 보정 없이 우열로 읽으면 안 됩니다. 이 비교는 <b>성균관대 안에서만</b> 됩니다 — 다른 학교는 학과별 로스터도 BK 학과 명단도 없습니다.</div>`;
}
let UTF=UME;
function uTopics(){
 const F=document.getElementById('utf'), B=document.getElementById('utopics'); if(!F) return;
 F.innerHTML=UU().map(u=>`<button class="fbtn ${UTF===u.nm?'on':''}" data-ut="${esc(u.nm)}">${esc(u.nm)}</button>`).join('');
 F.querySelectorAll('[data-ut]').forEach(b=>b.onclick=()=>{UTF=b.dataset.ut;uTopics();});
 const u=UU().find(x=>x.nm===UTF)||uMe();
 const FC={'Physics and Astronomy':'#3b82f6','Engineering':'#6366f1','Materials Science':'var(--navy)',
  'Medicine':'#0f9c6d','Computer Science':'#8b5cf6','Energy':'#f5a623','Environmental Science':'#84a98c',
  'Biochemistry, Genetics and Molecular Biology':'#22a06b','Chemistry':'#0ea5b7'};
 const T=u.topics||[], mx=T.length?T[0].c:1;
 B.innerHTML=`<div class="dev">${T.map(t=>`<div class="dl"><div class="n" style="flex:0 0 320px" title="${esc(t.n)}">${esc(t.n)}</div>
   <div class="bar"><i style="width:${(t.c/mx*100).toFixed(0)}%;background:${FC[t.f]||'var(--c4)'}"></i></div>
   <div class="v">${N(t.c)}</div></div>`).join('')}</div>
  <div class="mxlg">${[...new Set(T.map(t=>t.f))].map(f=>`<span><i style="background:${FC[f]||'var(--c4)'}"></i>${esc(f)}</span>`).join('')}</div>`;
}
