/* ── SKKU 글로벌 공저자 관계망 ── */
let GSEL=null, GQ='';
const GTOP=[['Materials','재료'],['Physics','물리'],['Chemistry','화학'],['Engineering','공학'],
 ['Computer','컴퓨터'],['Medicine|Medical|Clinical|Surgery|Oncology|Cardiac|Neurology|Radiology|Pathology|Anesthes|Pediatr|Ophthal|Dermat|Urology|Respiratory|Transplant|Critical|Rheumat|Orthoped|Obstetric|Hematology|Gastro|Endocrin|Peripheral|Allergy|Rehabilitation|Integrative|Psychiatry|Nursing','의학·임상'],
 ['Bio|Cell|Genet|Micro|Immun|Neuro|Physiol|Virol|Plant|Zoo|Marine|Evolution|Food|Toxic|Nutrition','생명'],
 ['Pharmacology|Chemistry, Medicinal','약학'],
 ['Economics|Business|Management|Finance|Operations|Public Administration|Social|Psychology|Education|Communication|Information Science|Asian|History|Philosophy|Religion|Family|Regional|Environmental Studies|Hospitality|Sport|Ergonomics|Health Policy|Health Care|Transportation','인문사회·경영'],
 ['Nanoscience|Optics|Energy|Electrochem|Metallurgy|Instruments|Crystal|Acoustics|Thermodynamics|Mechanics|Robotics|Automation|Water|Remote|Geoscience|Meteor|Astronomy|Nuclear|Green|Construction|Agricultural|Polymer|Statistics|Mathemat|Multidisciplinary Sciences|Biophysics|Imaging|Medical Informatics|Medical Laboratory|Biochemical','기타 이공']];
function gGroup(code){
 for(const [re,ko] of GTOP) if(new RegExp('^(?:'+re+')','i').test(code)||new RegExp(re,'i').test(code)) return ko;
 return '기타';
}
const GC2={'재료':'#5b7cb8','물리':'#3b82f6','화학':'#0ea5b7','공학':'#6366f1','컴퓨터':'#8b5cf6',
 '의학·임상':'#0f9c6d','생명':'#22a06b','약학':'#14b8a6','인문사회·경영':'#7c3aed','기타 이공':'#5d7286','기타':'#7b8b9c'};

function globBoard(){
 const S=GL.sum, M=GL.meta;
 let h=`<div class="ehead"><h2>SKKU 글로벌 공저자 관계망</h2>
  <span class="n">저자매칭 엔진 정제 · 교내 ${N(S.res)}명 · 연결 공저자 ${N(S.coa)}명</span>
  <span class="pill off">원천 실측</span>
  <div class="ex"><b>이 화면의 숫자는 우리 데이터베이스 BIBLO Scholar에서 직접 세었습니다.</b> 어디선가 옮겨 적은 값이 아닙니다.
   <br><b>연결선을 세는 법</b> · 「A가 B와」와 「B가 A와」를 따로 세기 때문에, 서로 다른 사람 쌍의 수는 아래 숫자의 절반쯤입니다.
   대외 자료에 쓸 때는 어느 쪽을 말하는지 밝혀 주십시오. 만드는 과정은 화면 아래 «관계망을 만드는 법»에 단계별로 적었습니다.</div></div>`;

 h+=`<div class="kpis">
  <div class="kpi" style="--c:var(--navy)"><div class="lb">전체 공저 관계</div><div class="vl">${N(S.edge)}<small>연결선</small></div><div class="dt">공저 논문 누계 ${N(S.pap)}편</div></div>
  <div class="kpi" style="--c:#3b82f6"><div class="lb">관계망 보유 연구자</div><div class="vl">${N(S.res)}<small>명</small></div><div class="dt">연결된 공저자 ${N(S.coa)}명</div></div>
  <div class="kpi" style="--c:#0f9c6d"><div class="lb">교외 관계</div><div class="vl">${N(S.ext)}<small>연결선</small></div><div class="dt">전체의 ${(S.ext/S.edge*100).toFixed(0)}% · 타기관·국제·산학</div></div>
  <div class="kpi" style="--c:#f5a623"><div class="lb">BK21 참여자 관계</div><div class="vl">${N(S.bkEdge)}<small>연결선</small></div><div class="dt">교외 ${N(S.bkExt)} · 교내 ${N(S.bkInt)}</div></div>
  <div class="kpi" style="--c:#7c3aed"><div class="lb">양쪽 다 BK21</div><div class="vl">${N(S.bothBK)}<small>연결선</small></div><div class="dt">고유쌍 ${N(Math.round(S.bothBK/2))} · 사업단 내부 협업</div></div>
  <div class="kpi" style="--c:#0ea5b7"><div class="lb">WoS 분야 분류</div><div class="vl">${N(S.wosField)}<small>개 분야</small></div><div class="dt">논문 ${N(S.wosPap)}편 분류 (${(S.wosPap/S.allPap*100).toFixed(0)}%)</div></div>
 </div>`;

 /* 분야 체계 */
 const grp={};
 GL.fields.forEach(([c,p,ppl,d])=>{const g=gGroup(c);(grp[g]=grp[g]||{n:0,pap:0,f:[]});grp[g].n++;grp[g].pap+=p;grp[g].f.push([c,p,ppl,d]);});
 const gk=Object.keys(grp).sort((a,b)=>grp[b].pap-grp[a].pap);
 const tp=gk.reduce((a,k)=>a+grp[k].pap,0);
 h+=`<div class="ecard"><h3>분야 체계 <span class="pill off">WoS 분류</span></h3>${ins(`논문을 국제 분류 체계로 묶은 것입니다. <b>학과 이름과 연구 분야는 일치하지 않습니다.</b>`)}
  <div class="d">논문마다 붙은 <b>WoS 분야 코드</b>를 상위 갈래로 묶었습니다. 칸 넓이가 그 분야의 논문 수입니다.
   BK21 참여자가 이름을 올린 논문 기준이며, 분야가 여러 개인 논문은 각 분야에 모두 계상됩니다.
   눌러서 그 갈래의 분야 목록을 봅니다.</div>
  <div class="tmap">${gk.map(k=>`<div class="tm ${GSEL===k?'on':''}" data-g="${esc(k)}" style="flex:${grp[k].pap};background:${GC2[k]||'#7b8b9c'}">
    <b>${esc(k)}</b><span>${N(grp[k].pap)}편 · ${grp[k].n}개 분야</span></div>`).join('')}</div>
  <div id="gflist">${gFieldList(grp)}</div></div>`;

 /* 분야별 표 + 학과별 */
 h+=`<div class="erow n2">
  <div class="ecard"><h3>학과별 관계망 규모</h3>${ins(`바깥과 <b>얼마나 넓게 연결돼 있는지</b>입니다. 규모가 작아도 좋은 상대와 닿아 있으면 값어치가 큽니다.`)}
   <div class="d">학과가 실제로 몇 명과, 얼마나 넓게 연결돼 있는지입니다. <b>교외</b>가 클수록 타기관·국제 협업이 넓습니다.</div>
   <div style="overflow:auto;max-height:470px"><table class="mtx globx">
   <colgroup>${['30%','12%','12%','16%','15%','15%'].map(w=>`<col style="width:${w}">`).join('')}</colgroup>
   <thead><tr><th class="l">학과·전공</th><th style="text-align:right">참여</th><th style="text-align:right">관계망 보유</th>
    <th style="text-align:right">연결선</th><th style="text-align:right">교외</th><th style="text-align:right">공저자</th></tr></thead><tbody>
   ${GL.dept.map(([d,tot,ppl,e,ex,ins,coa])=>`<tr data-gd="${esc(d)}" class="${GSEL===d?'sel':''}">
     <td class="l"><span class="dn">${esc(d)}</span></td><td class="num">${N(tot)}</td>
     <td class="num">${N(ppl)}<span class="dg"> ${Math.round(ppl/tot*100)}%</span></td>
     <td class="num">${N(e)}</td><td class="num">${N(ex)}<span class="dg"> ${Math.round(ex/e*100)}%</span></td>
     <td class="num">${N(coa)}</td></tr>`).join('')}
   </tbody></table></div></div>
  <div class="ecard" id="gsideC"><h3 id="gsideT">학과 분야 프로필</h3>${ins(`그 학과가 <b>어느 분야에 걸쳐 있는지</b>입니다. 한 분야에 몰리면 전문성, 여러 분야에 걸치면 확장성입니다.`)}<div id="gside">${gSide()}</div></div></div>`;

 /* 교외 협력 구조 */
 const E=GL.ext, ys=E.year, mxy=Math.max(...ys.map(x=>x[1]));
 const st=E.strength, mxs=Math.max(...st.map(x=>x[1]));
 h+=`<div class="erow e2">
  <div class="ecard"><h3>교외 협력 구조</h3>${ins(`학교 밖과의 연결입니다. <b>해외 기관이 섞여 있으면 국제공동연구</b>로 잡힙니다.`)}
   <div class="d">BK21 참여자의 교외 관계 <b>${N(E.tot)}건</b>, 상대 <b>${N(E.anchors)}명</b>입니다.
    교외 상대의 식별자는 해시라 이름·소속은 알 수 없고, <b>몇 편을 언제 어느 저널에서</b> 함께 냈는지만 남습니다.</div>
   <div class="sub-t">협업 강도 · 한 상대와 함께 낸 편수</div>
   <div class="dev">${st.map(([k,v])=>`<div class="dl"><div class="n">${k}</div>
     <div class="bar"><i style="width:${(v/mxs*100).toFixed(1)}%;background:var(--navy)"></i></div>
     <div class="v">${N(v)}</div></div>`).join('')}</div>
   <div class="d" style="margin:7px 0 0">${(E.strength[0][1]/E.tot*100).toFixed(0)}%가 단 1편입니다. 교외 관계의 대부분은 일회성 공저이고, 반복 협업으로 이어진 관계는 소수입니다.</div>
   <div class="sub-t">협업 지속 기간</div>
   <div class="dev">${E.dur.map(([k,v])=>`<div class="dl"><div class="n">${k}</div>
     <div class="bar"><i style="width:${(v/E.dur[0][1]*100).toFixed(1)}%;background:#8fb0e4"></i></div>
     <div class="v">${N(v)}</div></div>`).join('')}</div></div>
  <div class="ecard"><h3>교외 관계가 트인 해</h3>${ins(`바깥 관계가 <b>언제 늘었는지</b>입니다. 사업 시작 시점과 견줘 보십시오.`)}
   <div class="d">그 해에 처음 맺어진 교외 관계 수입니다. 사업 4단계(2020~) 이후 신규 관계가 어떻게 움직였는지 봅니다.</div>
   <div class="ybar2">${ys.map(([y,v])=>`<div class="yb2 ${y>=2020?'on':''}" style="height:${(v/mxy*100).toFixed(1)}%" title="${y}년 ${N(v)}건"><em>${N(v)}</em><span>${String(y).slice(2)}</span></div>`).join('')}</div>
   <div class="d" style="margin:9px 0 0">진한 막대가 4단계 기간입니다. 2026년은 연중이라 아직 덜 찹니다.</div>
   <div class="sub-t">교외 협업이 많은 저널</div>
   <div class="dev">${E.journal.slice(0,8).map(([j,v])=>`<div class="dl"><div class="n" title="${esc(j)}">${esc(j)}</div>
     <div class="bar"><i style="width:${(v/E.journal[0][1]*100).toFixed(1)}%;background:#0f9c6d"></i></div>
     <div class="v">${N(v)}</div></div>`).join('')}</div></div></div>`;

 /* 교내 잠재 파트너 */
 h+=`<div class="ecard" id="grecoC"><h3>교내 잠재 파트너 <span class="pill in">분야 벡터 유사도</span></h3>${ins(`아직 같이 안 썼지만 <b>주제가 가까운 교내 연구자</b>입니다. 붙일 수 있는 관계를 미리 찾는 칸입니다.`)}
  <div class="d">각 연구자의 <b>WoS 분야 프로필</b>(어느 분야에 몇 편을 냈는가)을 ${N(GL.sum.wosField)}차원 벡터로 만들어 코사인 유사도를 계산했습니다.
   그중 <b>아직 한 번도 함께 쓰지 않았고</b> 소속 학과가 다른 조합만 남겼습니다 — 분야는 맞는데 접점이 없던 쌍입니다.
   참여교수·신진 대상, 겹치는 분야 4개 이상 조건으로 <b>${N(GL.reco.n)}쌍</b>이 나왔습니다.
   <br>지문 뜻 비교(문장 벡터)은 이 DB에 없어 분야 벡터로 산출했습니다. 뜻 비교이 붙으면 정밀도가 올라갑니다.</div>
  <div class="fl" id="gfl"></div>
  <div id="grbody"></div></div>`;

 h+=recoCard();
 h+=srcNetCard()+srcCard('glob');
 document.getElementById('v-glob').innerHTML=h;
 wireGlob(); gRecoFilters(); gRecoBody(); recoInit();
 srcWire(document.getElementById('v-glob'));
}
function gFieldList(grp){
 if(!GSEL||!grp[GSEL]) return `<div class="d" style="margin:11px 0 0">갈래를 누르면 그 안의 WoS 분야가 논문 수 순으로 펼쳐집니다. 전체 ${N(GL.fields.length)}개 분야가 논문 30편 이상입니다.</div>`;
 const f=grp[GSEL].f.slice(0,18), mx=f[0][1];
 return `<div class="sub-t">${esc(GSEL)} · ${grp[GSEL].n}개 분야</div><div class="dev">${
  f.map(([c,p,ppl,d])=>`<div class="dl"><div class="n" title="${esc(c)}" style="flex:0 0 300px">${esc(c)}</div>
   <div class="bar"><i style="width:${(p/mx*100).toFixed(0)}%;background:${GC2[GSEL]||'var(--c4)'}"></i></div>
   <div class="v">${N(p)}<span class="pc" style="color:var(--ink3)">${ppl}명·${d}과</span></div></div>`).join('')}</div>`;
}
function gSide(){
 const DF=GL.deptfield;
 if(!GSEL||!DF[GSEL]){
  const all={};
  Object.values(DF).forEach(a=>a.forEach(([c,n])=>all[c]=(all[c]||0)+n));
  const t=Object.entries(all).sort((a,b)=>b[1]-a[1]).slice(0,12), mx=t[0][1];
  return `<div class="d" style="margin-bottom:9px">학과를 누르면 그 학과가 어느 분야에 논문을 내는지 봅니다. 아래는 전 학과 합산 상위 분야입니다.</div>
   <div class="dev">${t.map(([c,n])=>`<div class="dl"><div class="n" title="${esc(c)}" style="flex:0 0 250px">${esc(c)}</div>
    <div class="bar"><i style="width:${(n/mx*100).toFixed(0)}%;background:var(--navy)"></i></div><div class="v">${N(n)}</div></div>`).join('')}</div>`;}
 const f=DF[GSEL], mx=f[0][1];
 const row=GL.dept.find(x=>x[0]===GSEL)||[];
 const rc=(GL.reco.bydept||{})[GSEL]||[];
 return `<div class="fl" style="margin-bottom:11px"><button class="fbtn" data-gback="1">← 전체</button></div>
  <div class="dvk"><div><div class="d">참여자</div><div class="num">${N(row[1]||0)}<span> 명</span></div></div>
   <div><div class="d">관계망 연결선</div><div class="num">${N(row[3]||0)}</div></div>
   <div><div class="d">교외 비중</div><div class="num">${row[3]?Math.round(row[4]/row[3]*100):0}<span>%</span></div></div></div>
  <div class="sub-t">주력 분야 (WoS)</div><div class="dev">${
   f.map(([c,n])=>`<div class="dl"><div class="n" title="${esc(c)}" style="flex:0 0 250px">${esc(c)}</div>
    <div class="bar"><i style="width:${(n/mx*100).toFixed(0)}%;background:${GC2[gGroup(c)]||'var(--c4)'}"></i></div>
    <div class="v">${N(n)}</div></div>`).join('')}</div>
  ${rc.length?`<div class="sub-t">이 학과의 잠재 파트너 (아직 공저 없음)</div>${
   rc.map(([a,b,bd,sim,sh,tp])=>`<div class="rel"><div class="p"><b>${esc(a)}</b><span class="ar">↔</span><b>${esc(b)}</b>
    <span class="od" data-gd="${esc(bd)}">${esc(bd)}</span></div>
    <div class="m">분야 유사도 ${(sim*100).toFixed(0)}% · 겹치는 분야 ${sh}개 · ${tp.slice(0,2).map(esc).join(', ')}</div></div>`).join('')}`:''}`;
}
let GRF='all';
function gRecoFilters(){
 const F=document.getElementById('gfl'); if(!F) return;
 const ds=Object.keys(GL.reco.bydept).sort();
 F.innerHTML=`<button class="fbtn ${GRF==='all'?'on':''}" data-gr="all">유사도 상위 전체</button>
  <select class="rsel" id="grd"><option value="all">학과별로 보기</option>${
   ds.map(d=>`<option value="${esc(d)}" ${GRF===d?'selected':''}>${esc(d)}</option>`).join('')}</select>`;
 F.querySelector('[data-gr]').onclick=()=>{GRF='all';gRecoFilters();gRecoBody();};
 const s=document.getElementById('grd'); if(s) s.onchange=()=>{GRF=s.value;gRecoFilters();gRecoBody();};
}
function gRecoBody(){
 const B=document.getElementById('grbody'); if(!B) return;
 const rows = GRF==='all' ? GL.reco.top.map(r=>({a:r[0],ad:r[1],b:r[2],bd:r[3],sim:r[4],sh:r[5],tp:r[6]}))
   : (GL.reco.bydept[GRF]||[]).map(r=>({a:r[0],ad:GRF,b:r[1],bd:r[2],sim:r[3],sh:r[4],tp:r[5]}));
 if(!rows.length){B.innerHTML=`<div class="empty" style="padding:18px">해당 학과의 잠재 파트너가 없습니다.</div>`;return;}
 B.innerHTML=`<table class="mtx rtab"><colgroup><col style="width:15%"><col style="width:19%"><col style="width:15%"><col style="width:19%"><col style="width:14%"><col style="width:18%"></colgroup>
  <thead><tr><th class="l">연구자 A</th><th class="l">소속</th><th class="l">연구자 B</th><th class="l">소속</th><th>분야 유사도</th><th class="l">겹치는 주요 분야</th></tr></thead><tbody>
  ${rows.map(r=>`<tr><td class="l"><span class="dn">${esc(r.a)}</span></td><td class="l"><span class="aff" data-gd="${esc(r.ad)}">${esc(r.ad)}</span></td>
   <td class="l"><span class="dn">${esc(r.b)}</span></td><td class="l"><span class="aff" data-gd="${esc(r.bd)}">${esc(r.bd)}</span></td>
   <td><div class="pcell"><span class="pb"><i style="width:${(r.sim*100).toFixed(0)}%;background:var(--navy)"></i></span><b style="font:700 12px var(--num)">${(r.sim*100).toFixed(0)}%</b></div></td>
   <td class="l"><span class="aff" title="${r.tp.map(esc).join(' · ')}">${esc(r.tp[0])}${r.tp.length>1?` 외 ${r.tp.length-1}`:''}</span></td></tr>`).join('')}
  </tbody></table>
  <div class="d" style="margin:10px 0 0"><b>읽는 법</b> · 유사도가 높을수록 두 사람이 같은 분야에 논문을 내고 있다는 뜻입니다. 여기 있는 쌍은 <b>전부 아직 공저가 없습니다.</b>
   생산성·상보성 가중은 넣지 않았고, 분야 겹침만으로 정렬했습니다. 개인 값은 학과 내부 관리용입니다.</div>`;
 wireGlob();
}
function wireGlob(){
 document.querySelectorAll('#v-glob [data-g]').forEach(e=>e.onclick=()=>{GSEL=(GSEL===e.dataset.g?null:e.dataset.g);globBoard();});
 document.querySelectorAll('#v-glob [data-gd]').forEach(e=>e.onclick=ev=>{ev.stopPropagation();pickGlob(e.dataset.gd);});
 const b=document.querySelector('#v-glob [data-gback]'); if(b) b.onclick=()=>pickGlob(GSEL);
}
function pickGlob(d){
 GSEL=(GSEL===d?null:d);
 document.getElementById('gsideT').textContent=GSEL?GSEL+' 분야 프로필':'학과 분야 프로필';
 document.getElementById('gside').innerHTML=gSide();
 document.querySelectorAll('#v-glob .globx tr[data-gd]').forEach(r=>r.classList.toggle('sel',r.dataset.gd===GSEL));
 wireGlob();
 document.getElementById('gsideC')?.scrollIntoView({block:'nearest',behavior:'smooth'});
}
