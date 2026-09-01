/* ══════════════════════════════════════════════════════════════════
   대학 BK21 비교 — 8개 대학을 같은 자로 놓는다.
   논문·인용·FWCI 는 우리 DB(paper.oa_work, OpenAlex 적재분) 기관 소속 기준이고,
   참여 인원은 4단계 BK21 사업참여자 명단이다. 두 원천의 범위가 다르므로
   «대학 전체 연구성과» 와 «BK21 참여 규모» 를 섞어 읽지 않도록 화면에 적는다.
   ══════════════════════════════════════════════════════════════════ */
const UC_ME='성균관대';
const UC_YRS=[2020,2021,2022,2023,2024,2025];
let UCTAB='year';
const ucRank=(key,desc)=>{
 const v=UCMP.univ.filter(u=>UCMP.sum[u]).map(u=>[u,key(UCMP.sum[u])]);
 v.sort((a,b)=>desc?b[1]-a[1]:a[1]-b[1]);
 return {order:v, rank:v.findIndex(x=>x[0]===UC_ME)+1, n:v.length};
};
function ucBar(rows, fmt, hi){
 const mx=Math.max(...rows.map(r=>r[1]||0),1);
 return `<div class="ucbars">${rows.map(([u,v])=>`<div class="ucbar${u===UC_ME?' me':''}">
   <div class="k">${esc(u)}</div>
   <div class="b"><i style="width:${Math.max(2,(v||0)/mx*100)}%"></i></div>
   <div class="v">${fmt?fmt(v):N(v)}</div></div>`).join('')}</div>`;
}
function ucYearTable(){
 const Y=UCMP.yr;
 const rows=UCMP.univ.filter(u=>Y[u]);
 rows.sort((a,b)=>(Y[b][2025]?.n||0)-(Y[a][2025]?.n||0));
 return `<div style="overflow:auto"><table class="mtx">
  <thead><tr><th class="l">대학</th>${UC_YRS.map(y=>`<th>${y}</th>`).join('')}
   <th>증감<br><em style="font-weight:500">20→25</em></th></tr></thead>
  <tbody>${rows.map(u=>{const g=(Y[u][2025]?.n||0)/Math.max(Y[u][2020]?.n||1,1)-1;
   return `<tr${u===UC_ME?' class="me"':''}><td class="l"><b>${esc(u)}</b></td>
    ${UC_YRS.map(y=>`<td>${N(Y[u][y]?.n||0)}</td>`).join('')}
    <td class="${g>=0?'up':'dn'}">${g>=0?'+':''}${(g*100).toFixed(0)}%</td></tr>`;}).join('')}
  </tbody></table></div>`;
}
function ucFieldTable(){
 const F=UCMP.fld, tf=UCMP.topFields.slice(0,8);
 const get=(u,f)=>{const r=(F[u]||[]).find(x=>x[0]===f); return r?r[1]:0;};
 const us=UCMP.univ.filter(u=>F[u]);
 return `<div style="overflow:auto"><table class="mtx">
  <thead><tr><th class="l">분야</th>${us.map(u=>`<th${u===UC_ME?' class="me"':''}>${esc(u.replace('대',''))}</th>`).join('')}</tr></thead>
  <tbody>${tf.map(f=>{const vals=us.map(u=>get(u,f)); const mx=Math.max(...vals,1);
   return `<tr><td class="l">${esc(f)}</td>${us.map((u,i)=>{
     const v=vals[i], pct=v/mx;
     return `<td${u===UC_ME?' class="me"':''} style="background:rgba(47,93,168,${(pct*0.22).toFixed(3)})">${N(v)}</td>`;}).join('')}</tr>`;}).join('')}
  </tbody></table></div>
  <div class="radn">칸이 진할수록 그 분야에서 논문이 많습니다. 가로로 읽으면 <b>같은 분야에서 대학끼리</b> 견줍니다.</div>`;
}
function ucQuality(){
 const S=UCMP.sum;
 const us=UCMP.univ.filter(u=>S[u]);
 const R=[['논문 수',u=>S[u].n,null,true],
   ['FWCI 평균',u=>S[u].fw,v=>v.toFixed(2),true],
   ['FWCI 2배 이상',u=>S[u].fw2,null,true],
   ['인용 50회 이상',u=>S[u].c50,null,true],
   ['오픈액세스 비율',u=>S[u].oa/S[u].n*100,v=>v.toFixed(1)+'%',true]];
 return `<div class="erow e2">${R.map(([lab,f,fmt])=>{
   const rows=us.map(u=>[u,f(u)]).sort((a,b)=>b[1]-a[1]);
   const my=rows.findIndex(x=>x[0]===UC_ME)+1;
   return `<div class="ucq"><div class="h">${lab}
     <span class="rk">${UC_ME} ${my}위 / ${rows.length}</span></div>
    ${ucBar(rows, fmt)}</div>`;}).join('')}</div>`;
}
function ucRoster(){
 const R=UCMP.roster, us=UCMP.univ.filter(u=>R[u]);
 const rows=us.map(u=>[u,R[u].prof]).sort((a,b)=>b[1]-a[1]);
 return `${ucBar(rows)}
  <div style="overflow:auto;margin-top:12px"><table class="mtx">
   <thead><tr><th class="l">대학</th><th>참여교수</th><th>신진연구인력</th><th>학과</th>
    <th>이공</th><th>의약생명</th><th>인문사회</th></tr></thead>
   <tbody>${us.sort((a,b)=>R[b].prof-R[a].prof).map(u=>{const v=R[u], g=v.gy||{};
     return `<tr${u===UC_ME?' class="me"':''}><td class="l"><b>${esc(u)}</b></td>
      <td><b>${N(v.prof)}</b></td><td>${N(v.new)}</td><td>${N(v.dept)}</td>
      <td>${N(g['이공']||0)}</td><td>${N(g['의약생명']||0)}</td><td>${N(g['인문사회']||0)}</td></tr>`;}).join('')}
   </tbody></table></div>`;
}
function ucmpBoard(){
 if(typeof UCMP==='undefined'){ document.getElementById('v-ucmp').innerHTML=
   '<div class="empty" style="padding:20px">비교 자료를 불러오지 못했습니다.</div>'; return; }
 const S=UCMP.sum, R=UCMP.roster;
 const nR=ucRank(s=>s.n,true), fR=ucRank(s=>s.fw,true);
 const Y=UCMP.yr[UC_ME]||{};
 const gr=((Y[2025]?.n||0)/Math.max(Y[2020]?.n||1,1)-1)*100;
 const pr=Object.entries(R).map(([u,v])=>[u,v.prof]).sort((a,b)=>b[1]-a[1]);
 const prR=pr.findIndex(x=>x[0]===UC_ME)+1;
 document.getElementById('v-ucmp').innerHTML=`
 <div class="ehead"><h2>대학 BK21 비교</h2>
  <span class="n">8개 대학 · 논문 2020~2026 · 참여 인원 4단계 명단</span>
  <span class="pill off">우리 DB 실측</span>
  <div class="ex"><b>두 원천을 섞어 읽지 마십시오.</b>
   논문·인용·FWCI 는 <b>대학 전체</b>(기관 소속 기준)이고,
   참여교수·학과 수는 <b>BK21 사업 참여자</b>입니다.
   대학 전체 논문 안에서 BK21 참여자 몫만 갈라내는 것은 아직 못 합니다.</div></div>

 ${ins(`${UC_ME}는 논문 편수로 <em>${nR.rank}위</em>(${N(S[UC_ME].n)}편)이지만
   <b>FWCI 로는 ${fR.rank}위</b>(${S[UC_ME].fw.toFixed(2)}배)입니다.
   FWCI 는 같은 분야·같은 해 세계 평균을 1.0 으로 놓은 값이라
   <b>편수가 아니라 논문 한 편의 무게</b>를 봅니다.
   BK21 참여교수는 ${N(R[UC_ME].prof)}명으로 <b>${prR}위</b>이고,
   2020년 대비 논문은 <b>${gr>=0?'+':''}${gr.toFixed(0)}%</b> 입니다.`)}

 <div class="kpis">
  <div class="kpi" style="--c:var(--navy)"><div class="lb">논문 (2020~2026)</div>
   <div class="vl">${N(S[UC_ME].n)}<small>편</small></div><div class="dt">8개 대학 중 ${nR.rank}위</div></div>
  <div class="kpi" style="--c:#3b82f6"><div class="lb">FWCI 평균</div>
   <div class="vl">${S[UC_ME].fw.toFixed(2)}<small>배</small></div><div class="dt">세계 평균 1.0 · ${fR.rank}위</div></div>
  <div class="kpi" style="--c:#0f9c6d"><div class="lb">인용 50회 이상</div>
   <div class="vl">${N(S[UC_ME].c50)}<small>편</small></div><div class="dt">전체의 ${(S[UC_ME].c50/S[UC_ME].n*100).toFixed(1)}%</div></div>
  <div class="kpi" style="--c:#f5a623"><div class="lb">오픈액세스</div>
   <div class="vl">${(S[UC_ME].oa/S[UC_ME].n*100).toFixed(1)}<small>%</small></div>
   <div class="dt">${ucRank(s=>s.oa/s.n,true).rank}위 · 정책으로 올릴 수 있는 값</div></div>
  <div class="kpi" style="--c:#6b46c1"><div class="lb">BK21 참여교수</div>
   <div class="vl">${N(R[UC_ME].prof)}<small>명</small></div><div class="dt">신진 ${N(R[UC_ME].new)} · 학과 ${R[UC_ME].dept}</div></div>
  <div class="kpi" style="--c:#0ea5b7"><div class="lb">2020 대비 논문</div>
   <div class="vl">${gr>=0?'+':''}${gr.toFixed(0)}<small>%</small></div><div class="dt">2020 → 2025</div></div>
 </div>

 <div class="ecard"><h3>연도별 논문 <span class="pill in">대학 전체</span></h3>
  ${ins(`<b>한 해 값보다 방향</b>을 보십시오. 2026년은 아직 집계 중이라 낮게 나옵니다.
    편수는 대학 규모를 그대로 따라가므로, 규모가 다른 대학끼리는
    오른쪽 <b>증감률</b>로 견주는 편이 낫습니다.`)}
  ${ucYearTable()}</div>

 <div class="ecard"><h3>분야별 비교 <span class="pill in">2020~2026</span></h3>
  ${ins(`대학마다 <b>강한 분야가 다릅니다.</b> 총점으로 줄을 세우면 의대를 가진 대학이 늘 앞섭니다.
    <b>우리가 겨룰 분야에서만</b> 견주는 것이 실제 판단에 씁니다.`)}
  ${ucFieldTable()}</div>

 <div class="ecard"><h3>질 지표 <span class="pill in">항목별 순위</span></h3>
  ${ins(`<b>편수와 질은 다릅니다.</b> 아래 다섯 항목에서 ${UC_ME}의 자리가 각각 다릅니다.
    편수가 앞선다고 질이 앞서지 않고, 그 반대도 마찬가지입니다.`)}
  ${ucQuality()}</div>

 <div class="ecard"><h3>BK21 참여 규모 <span class="pill off">4단계 명단</span></h3>
  ${ins(`<b>여기부터는 BK21 사업 참여자만</b>입니다. 위의 논문 지표와 범위가 다릅니다.
    참여교수 ${N(R[UC_ME].prof)}명은 ${prR}위이고, 학과 ${R[UC_ME].dept}개에 걸쳐 있습니다.
    이름은 개인정보라 가렸습니다.`, 'warn')}
  ${ucRoster()}</div>

 <div class="ecard"><h3>이 화면의 데이터 근거</h3>
  ${ins(`숫자가 다른 자료와 안 맞을 때 여기부터 맞춰 보십시오.`)}
  <div class="d">${esc(UCMP.src)}<br>${esc(UCMP.note)}<br>
   집계일 <b>${esc(UCMP.built)}</b> · 논문 기간 2020~2026 · 기관 소속은 저자 소속 문자열로 판정</div></div>`;
}
