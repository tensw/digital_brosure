
/* 인사이트 — 데이터에서 뽑은 수치를 문장에 끼워 넣는다. 고정 문구만 쓰면
   값이 바뀌어도 문장이 그대로라 거짓말이 된다. */
function ins(txt, kind){ return `<div class="insight${kind?' '+kind:''}">
 <span class="ic">${kind==='warn'?'!':'→'}</span><div class="tx">${txt}</div></div>`; }
const NF=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:0});

/* 미수집 지표까지 자리를 만들어 세운다. 자료가 오면 이 칸에 값만 들어간다.
   비어 있는 칸을 표에서 지우면 무엇을 못 받았는지 아무도 모른다. */
const AMETA={
 '학술지 (인문·사회·예체능) 6/3/2':['6/3/2','대학원생'],
 '학술지 (이공·의약학) 6/5/4/3':['6~3','대학원생'],
 '국제학술대회 발표 2':['2','대학원생'],'국내학술대회 발표 1':['1','대학원생'],
 '국제학술대회·학술지 수상 1':['1','대학원생'],'국내학술대회·학술지 수상 0.5':['0.5','대학원생'],
 '연구조교(RA) 활동 1':['1','관리자'],'AI 관련 논문 1':['1','대학원생'],'AI 관련 수상 1':['1','대학원생'],
 '국내외 강의 제공(특강 등) 3':['3','대학원생'],'교육조교(TA) 활동 1':['1','관리자'],
 'URP 지도대학원생 1':['1','관리자'],'도전학기 프로그램(교과) 참여 · 일반 1':['1','관리자'],
 '도전학기 프로그램(교과) 참여 · AI 1.5':['1.5','관리자'],
 'AI 교과 이수(정규학기) · 일반 1':['1','대학원생'],
 'AI 교과 이수(정규학기) · AI관련학과 0.5':['0.5','대학원생'],'학점 4.0 이상 2':['2','관리자'],
 '해외공동연구를 통한 논문발표 2':['2','대학원생'],'교환학생 1':['1','관리자'],'해외연수 1':['1','대학원생'],
 '팀연구프로젝트 과목 참여 1':['1','관리자'],'비교과 프로그램 참여 · 일반 1':['1','관리자'],
 '비교과 프로그램 참여 · AI 1.5':['1.5','관리자'],'AI 역량개발 활동 참여 1':['1','대학원생'],
 'SDG 분야 국제논문 연구 2':['2','관리자'],'산업계 협업 공동연구 1':['1','관리자'],
 '지역사회 연계 프로젝트 참여 1':['1','관리자'],'특허 출원 4':['4','대학원생'],'특허 등록 2':['2','대학원생'],
};
function areaCards(){
 const A=DATA.areas, G=DATA.gyo;
 const pick=(k,gys)=>Object.entries(G).filter(([g])=>!gys||gys.indexOf(g)>=0)
   .reduce((a,[,v])=>a+((v.RQ&&v.RQ[k])||0),0);
 const val=k=> k==='RQ_jr'? pick('RQ_jr',['인문사회'])
            : k==='RQ_jr2'? pick('RQ_jr',['이공','의약생명'])
            : k==='RQ_cfd'? 0 : pick(k,null);
 return `<div class="areagrid">${AXES.map(ax=>{const a=A[ax];
  const sum=a.items.reduce((t,[,key,have])=>t+(have&&key?val(key):0),0);
  const okN=a.items.filter(i=>i[2]).length;
  return `<div class="areacard${a.have?'':' dim'}">
   <h4>${ax} · ${esc(a.label)}
    ${a.have?`<span class="pill off">${okN}/${a.items.length} 산출</span>`
            :'<span class="pill prov">전부 미수집</span>'}</h4>
   <div class="sc">${a.have?NF(sum):'—'}</div>
   <div class="cap">${a.have?'산출된 지표의 점수 합 (참여교수)'
     :'자료를 받으면 이 자리에 점수가 들어갑니다'}</div>
   ${a.items.map(([lab,key,have])=>{const m=AMETA[lab]||['',''];
     const nm=lab.replace(/\s*[\d.\/~]+$/,'');
     return `<div class="arow${have?'':' off'}">
      <div class="nm">${esc(nm)}<i>${esc(m[1])}</i></div>
      <div class="pt">${m[0]}</div>
      <div class="vl">${have?(key?NF(val(key)):'0'):'미수집'}</div></div>`;}).join('')}
  </div>`;}).join('')}</div>`;
}

/* AI 역량 단면 — 이번 개정 신설 9개 중 6개가 AI 지표다.
   학교가 무엇을 밀고 있는지가 배점표에 그대로 드러난다. 따로 모아 본다. */
const AI_IDX=[
 ['RQ','AI 관련 논문',1,'RQ_ai',true,'학술지 구분 없이 전체 인정 · 주저자/공저자 구분 없음 · 기존 학술지 지표와 중복 인정'],
 ['RQ','AI 관련 수상',1,null,false,'연구 및 연구 외 AI 관련 수상이력'],
 ['LQ','도전학기 프로그램(교과) 참여(AI)',1.5,null,false,'관리자 입력'],
 ['LQ','AI 교과 이수(정규학기) · 일반',1,null,false,'AI 기술·방법론·활용 교육'],
 ['LQ','AI 교과 이수(정규학기) · AI관련학과',0.5,null,false,'AI관련학과 소속은 0.5'],
 ['IQ','비교과 프로그램 참여(AI)',1.5,null,false,'관리자 입력'],
 ['IQ','AI 역량개발 활동 참여',1,null,false,'AI 경진대회·해커톤·공모전·특강 등'],
];
const AI_DEPT=['데이터사이언스융합학과','인공지능학과','소프트웨어학과','인공지능융합학과',
 '인간AI인터랙션융합전공','지능형소프트웨어학과','AI시스템공학과','전자전기컴퓨터공학과',
 'DMC공학과','지능형로봇학과','지능형정밀헬스케어융합전공'];
function aiCard(){
 const G=DATA.gyo, S=DATA.stats; if(!G) return '';
 const tot=Object.values(G).reduce((a,v)=>a+((v.RQ&&v.RQ.RQ_ai)||0),0);
 const rows=Object.entries(S).filter(([,v])=>v.RQ&&v.RQ.RQ_ai)
   .sort((a,b)=>b[1].RQ.RQ_ai-a[1].RQ.RQ_ai);
 const mx=rows.length?rows[0][1].RQ.RQ_ai:1;
 const inAI=d=>AI_DEPT.indexOf(d)>=0;
 return `<div class="ecard" id="aiCard"><h3>AI 역량 단면
   <span class="pill px">신설 9개 중 6개가 AI 지표</span></h3>
  ${ins(`학교가 이번에 새로 만든 배점 9개 중 <b>6개가 AI</b>입니다.
    AI 실적을 보겠다는 뜻입니다. 우리 논문에서 AI로 판정된 것은 <em>${NF(tot)}편</em>이고,
    ${rows.length?`<em>${esc(rows[0][0])}</em>가 ${NF(rows[0][1].RQ.RQ_ai)}편으로 가장 많습니다.`:''}
    나머지 5개 AI 지표는 교과·비교과·수상 기록이라 학사 시스템에서 받아야 채워집니다.`)}
  <div class="d">이번 개정에서 새로 들어간 지표 9개 가운데 <b>6개</b>가 AI 관련입니다.
   배점표에 학교의 방향이 그대로 드러납니다. 우리가 산출한 것은 그중 <b>AI 관련 논문</b> 하나입니다.</div>
  <div class="erow e2" style="margin-top:12px">
   <div><table class="mtx areat"><thead><tr><th class="l">영역 · AI 지표</th>
     <th>배점</th><th>산출</th></tr></thead><tbody>
     ${AI_IDX.map(([ar,lab,pt,key,have,note])=>`<tr${have?'':' class="off"'}>
      <td class="l"><b>${ar}</b> ${esc(lab)}<div class="bw2">${esc(note)}</div></td>
      <td>${pt}</td>
      <td>${have?`<b>${N(Math.round(tot))}</b>`:'<span class="no">미수집</span>'}</td></tr>`).join('')}
    </tbody></table></div>
   <div><div class="ymeta" style="margin:0 0 8px;padding:0;border:0">
     AI 관련 논문 <b>${N(Math.round(tot))}편</b> · 학과별 (상위 12)</div>
    ${rows.slice(0,12).map(([d,v])=>`<div class="aibar">
      <div class="k">${esc(d)}${inAI(d)?'<span class="pill px">AI관련학과</span>':''}</div>
      <div class="b"><i style="width:${Math.max(3,v.RQ.RQ_ai/mx*100)}%"></i></div>
      <div class="v">${N(v.RQ.RQ_ai)}</div></div>`).join('')}
    <div class="radn">AI관련학과는 매뉴얼에 명시된 11개 학과입니다 —
     AI 교과 이수 배점이 0.5 로 낮게 적용됩니다.</div></div>
  </div></div>`;
}

/* 역량 레이더 — 이 지수의 본체. 매뉴얼 9쪽 결과조회 화면과 같은 문법.
   총점이 몇 점인가가 아니라 «네 방향 중 어디가 눌려 있는가» 를 보는 물건이다.
   비어 있는 영역을 0 으로 그리지 않는다 — «사회기여를 안 한다» 로 읽히는데
   사실은 «우리가 안 받았다» 다. 미수집은 축을 회색으로 두고 점을 찍지 않는다. */
const AXES=['RQ','LQ','IQ','SQ'];
function radarPoints(cx,cy,R,vals){
 return AXES.map((k,i)=>{
  const a=-Math.PI/2 + i*Math.PI/2, v=vals[k];
  const r = v==null? null : R*Math.max(.04,Math.min(1,v));
  return r==null? null : [cx+r*Math.cos(a), cy+r*Math.sin(a)];
 });
}
function radarSVG(series, size){
 const R=size/2-30, cx=size/2, cy=size/2, A=DATA.areas;
 const ring=[.25,.5,.75,1].map(f=>`<polygon points="${
   AXES.map((k,i)=>{const a=-Math.PI/2+i*Math.PI/2;
     return `${cx+R*f*Math.cos(a)},${cy+R*f*Math.sin(a)}`;}).join(' ')}"
   fill="none" stroke="var(--line)" stroke-width="1"/>`).join('');
 const spokes=AXES.map((k,i)=>{const a=-Math.PI/2+i*Math.PI/2;
   const on=A[k].have;
   return `<line x1="${cx}" y1="${cy}" x2="${cx+R*Math.cos(a)}" y2="${cy+R*Math.sin(a)}"
     stroke="${on?'var(--c3)':'var(--line)'}" stroke-width="1"
     ${on?'':'stroke-dasharray="3 3"'}/>`;}).join('');
 const labels=AXES.map((k,i)=>{const a=-Math.PI/2+i*Math.PI/2;
   const x=cx+(R+18)*Math.cos(a), y=cy+(R+18)*Math.sin(a), on=A[k].have;
   return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle"
     font-size="11" font-weight="700"
     fill="${on?'var(--ink2)':'var(--ink3)'}">${k}</text>
    <text x="${x}" y="${y+13}" text-anchor="middle" dominant-baseline="middle"
     font-size="9" fill="var(--ink3)">${on?esc(A[k].label):'미수집'}</text>`;}).join('');
 const polys=series.map(sr=>{
   const pts=radarPoints(cx,cy,R,sr.vals).filter(Boolean);
   if(pts.length<2) return pts.length===1
     ? `<circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="4" fill="${sr.color}"/>`:'';
   return `<polygon points="${pts.map(p=>p.join(',')).join(' ')}"
     fill="${sr.color}" fill-opacity="${sr.fill==null?0.14:sr.fill}"
     stroke="${sr.color}" stroke-width="2" stroke-linejoin="round"/>`+
    pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${sr.color}"/>`).join('');
 }).join('');
 /* 값이 있는 축이 하나뿐이면 폴리곤이 만들어지지 않는다. 중심에서 그 축까지 선분으로
    그려야 «한 방향만 채워졌다» 가 보인다. 점 하나만 찍으면 아무 말도 안 하는 그림이 된다. */
 const single=series.map(sr=>{
   const pts=radarPoints(cx,cy,R,sr.vals).filter(Boolean);
   if(pts.length!==1) return '';
   return `<line x1="${cx}" y1="${cy}" x2="${pts[0][0]}" y2="${pts[0][1]}"
     stroke="${sr.color}" stroke-width="3" stroke-linecap="round"/>`;
 }).join('');
 return `<svg viewBox="0 0 ${size} ${size}" class="radar" role="img"
   aria-label="역량 레이더">${ring}${spokes}${single}${polys}${labels}</svg>`;
}
function radarCard(){
 const G=DATA.gyo, A=DATA.areas; if(!G||!A) return '';
 const ks=Object.keys(G).sort((a,b)=>G[b].Savg-G[a].Savg);
 /* 축마다 스케일이 다르다(RQ 수만점 · SQ 수백점). 축별 최대 계열을 1 로 두고 정규화한다.
    한 스케일로 그리면 SQ 가 원점에 붙어 «사회기여가 0» 처럼 보인다. */
 const per=k=>ks.map(g=>(G[g].prof?((G[g].RQ&&G[g].RQ[k])||0)/G[g].prof:0));
 const nz=k=>{const v=per(k), m=Math.max(...v)||1; return v.map(x=>x/m);};
 const vRQ=nz('RQ'), vIQ=nz('IQ'), vSQ=nz('SQ');
 const CO={'이공':'var(--s-blue)','의약생명':'var(--s-green)','인문사회':'var(--s-violet)'};
 const series=ks.map((k,i)=>({name:k,color:CO[k]||'var(--s-teal)',
   vals:{RQ:vRQ[i], LQ:null, IQ:vIQ[i], SQ:vSQ[i]}}));
 const missing=AXES.filter(k=>!A[k].have);
 return `<div class="ecard" id="radarCard"><h3>역량 레이더 — 4개 영역
   <span class="pill in">매뉴얼 결과조회 화면과 같은 구성</span></h3>
  ${(()=>{const miss=AXES.filter(k=>!A[k].have).map(k=>`${k}(${A[k].label})`);
    const lo=Object.keys(G).slice().sort((a,b)=>
      ((G[a].RQ.SQ||0)/(G[a].prof||1))-((G[b].RQ.SQ||0)/(G[b].prof||1)))[0];
    return ins(`도형이 넓을수록 그 방향의 실적이 많습니다. 세 계열 모두
      <b>연구(RQ) 쪽으로 길게 뻗고</b> 사회기여(SQ) 쪽이 짧습니다.
      가장 짧은 곳은 <em>${esc(lo)}</em>(산학협력 ${NF(G[lo].RQ.n_ind)}편)입니다.
      ${miss.length?`<b>${miss.join('·')}</b> 축이 비어 있는 것은 실적이 없다는 뜻이 아니라
      <b>자료를 아직 받지 못했다</b>는 뜻입니다.`:''}`);})()}
  <div class="d">SGCPI+ 는 총점이 아니라 <b>네 방향 중 어디가 눌려 있는가</b>를 보는 지수입니다.
   값이 없는 축은 0 이 아니라 <b>미수집</b>으로 둡니다 — 실적이 없는 것과 자료를 안 받은 것은 다릅니다.</div>
  <div class="radwrap">
   <div class="radbox">${radarSVG(series, 300)}
    <div class="radlg">${series.map(x=>
      `<span><i style="background:${x.color}"></i>${esc(x.name)}</span>`).join('')}</div>
    <div class="radn">축별로 1인당 값을 최고 계열 기준(1.0)으로 정규화했습니다.
     축마다 점수 규모가 달라 한 자로 재면 작은 축이 원점에 붙습니다.</div></div>
   <div class="radtb">${areaTable()}</div>
  </div>
  ${(()=>{const n=AXES.reduce((a,k)=>a+A[k].items.length,0);
    const ok=AXES.reduce((a,k)=>a+A[k].items.filter(i=>i[2]).length,0);
    const dim=AXES.filter(k=>!A[k].have).map(k=>A[k].label);
    return ins(`아래 네 상자가 학교 배점표의 전부입니다. 지표 <b>${n}개</b> 중
      <em>${ok}개</em>만 우리 논문 자료로 채워집니다.
      <b>흐리게 보이는 칸이 아직 못 받은 자료</b>입니다 —
      ${dim.length?`${dim.join('·')}은 통째로 비어 있습니다. `:''}
      강의·조교·수상·특허처럼 논문이 아닌 기록이라 학사 시스템에서 넘겨받아야 합니다.
      자리는 미리 만들어 두었으므로 자료가 오면 그 칸에 숫자가 들어갑니다.`,'warn');})()}
  ${areaCards()}</div>`;
}
/* 영역별 세부지표 분해표 — 25개 지표를 다 세우고, 못 낸 것은 «미수집» 으로 남긴다.
   빠진 지표를 표에서 지우면 무엇이 빠졌는지 아무도 모른다. */
function areaTable(){
 const A=DATA.areas, G=DATA.gyo;
 const pick=(k,gys)=>Object.entries(G).filter(([g])=>!gys||gys.indexOf(g)>=0)
   .reduce((a,[,v])=>a+((v.RQ&&v.RQ[k])||0),0);
 const tot=k=> k==='RQ_jr'  ? pick('RQ_jr',['인문사회'])
            : k==='RQ_jr2' ? pick('RQ_jr',['이공','의약생명'])
            : k==='RQ_cfd' ? 0
            : pick(k,null);
 return `<table class="mtx areat"><thead><tr>
   <th class="l">영역 · 지표</th><th>점수</th><th>상태</th></tr></thead><tbody>`+
  AXES.map(k=>{const a=A[k];
   return `<tr class="ah"><td class="l" colspan="3">${k} · ${esc(a.label)}
     ${a.have?'':'<span class="pill prov">미수집</span>'}</td></tr>`+
    a.items.map(([lab,key,have])=>`<tr${have?'':' class="off"'}>
      <td class="l">${esc(lab)}</td>
      <td>${have?N(Math.round(tot(key))):'—'}</td>
      <td>${have?'<span class="ok">산출</span>':'<span class="no">미수집</span>'}</td></tr>`).join('');
  }).join('')+`</tbody></table>
  <div class="radn">지표 <b>${AXES.reduce((a,k)=>a+A[k].items.length,0)}개</b> 중
   <b>${AXES.reduce((a,k)=>a+A[k].items.filter(i=>i[2]).length,0)}개</b> 산출.
   국내학술대회가 0 인 것은 실적이 없어서가 아니라 원천(Scopus·WoS)이 국내 학회를
   색인하지 않기 때문입니다. 나머지는 학사 시스템 자료라 아직 받지 않았습니다.</div>`;
}

/* SGCPI+ 환산점수 — 계열 3장. screen-design.md §3-2(나).
   합계와 1인당을 같은 카드에 둔다. 인문사회 5,264 는 이공 32,737 의 1/6 이지만
   1인당으로는 42.5 대 138.7 이다. 두 값이 붙어 있어야 규모 차이를 실력 차이로 오독하지 않는다.
   미판정 편수를 카드 안에 넣는다 — 그만큼 못 매긴 채 나온 점수라는 사실이 점수 옆에 있어야 한다. */
const GORD=[6,5,4,3,2,1,0];
function gbandHTML(Sg){
 const c=GORD.map(g=>[g, +(Sg&&Sg[g])||0]).filter(([,n])=>n);
 if(!c.length) return '';
 return `<div class="gband">${c.map(([g,n])=>
   `<i class="g${g}" style="flex:${n}" title="${g?'등급 '+g:'미판정'} · ${N(n)}편"></i>`).join('')}</div>`;
}
function sgcpiCard(){
 const G=DATA.gyo; if(!G) return '';
 const ks=Object.keys(G).sort((a,b)=>G[b].S-G[a].S);
 return `<div class="ecard" id="sgcpiCard"><h3>SGCPI+ 환산점수
   <span class="pill off">참여교수 적용</span></h3>
  ${(()=>{const ks=Object.keys(G);
    const bySum=ks.slice().sort((a,b)=>G[b].S-G[a].S)[0];
    const byAvg=ks.slice().sort((a,b)=>G[b].Savg-G[a].Savg)[0];
    return ins(bySum===byAvg
      ? `합계도 1인당도 <em>${esc(bySum)}</em>이 가장 높습니다. 규모와 밀도가 같이 앞선 경우입니다.`
      : `합계는 <em>${esc(bySum)}</em>이 가장 크지만, 교수 한 사람이 낸 점수로는
         <em>${esc(byAvg)}</em>(${G[byAvg].Savg.toFixed(0)}점)이 앞섭니다.
         합계는 교수가 많은 곳이 위로 올라오므로 <b>계열끼리 견줄 때는 1인당 값</b>을 보십시오.`);})()}
  <div class="d">큰 숫자는 <b>RQ(연구역량)</b>입니다 —
   학술지(저널등급 g × 역할가중 w) + 학술대회(국제 2점·주저자만) + AI 관련 논문(1편 1점).
   아래 줄의 IQ·SQ 는 저자 소속으로 판정한 해외공동연구(2점)·산업계 협업(1점)입니다.
   합계는 참여교수 기준이며 대학원생 실적은 따로 셉니다.
   교육(LQ)은 원천이 학사 시스템이라 아직 받지 않았습니다.</div>
  <div class="kpis gyrow">${ks.map(k=>{const v=G[k];
   return `<div class="kpi gycard" data-gy="${esc(k)}" style="--c:var(--g5s)">
    <div class="lb">${esc(k)}</div>
    <div class="vl">${v.S.toLocaleString(undefined,{minimumFractionDigits:1,maximumFractionDigits:1})}</div>
    <div class="dt">1인당 <b>${v.Savg.toFixed(1)}</b></div>
    ${gbandHTML(v.Sg)}
    <div class="dt rqx">학술지 <b>${N(Math.round(v.RQ.RQ_jr))}</b>
     · 학술대회 <b>${N(v.RQ.RQ_cf)}</b> · AI <b>${N(v.RQ.RQ_ai)}</b></div>
    <div class="dt rqx">IQ <b>${N(Math.round(v.RQ.IQ))}</b>
     <span class="sub2">국제공동 ${N(v.RQ.n_intl)}편</span>
     · SQ <b>${N(Math.round(v.RQ.SQ))}</b>
     <span class="sub2">산학 ${N(v.RQ.n_ind)}편</span></div>
    <div class="dt">학과 ${v.depts.length} · 교수 ${N(v.prof)}명 · 학생 ${N(v.nstu)}명</div>
    <div class="dt">미판정 ${N(v.undet)}${v.undet>=1000?' ⚠':''}</div>
   </div>`;}).join('')}</div>
  <div id="gyOpen"></div></div>`;
}
function paintGyOpen(gy){
 const box=document.getElementById('gyOpen'); if(!box) return;
 if(!gy){ box.innerHTML=''; return; }
 const G=DATA.gyo[gy], S=DATA.stats;
 const rows=G.depts.slice().sort((a,b)=>S[b].S-S[a].S);
 box.innerHTML=`<div style="overflow:auto;margin-top:12px"><table class="mtx">
  <thead><tr><th class="l">학과 · 전공</th><th>환산점수</th><th>1인당</th>
   <th>6</th><th>5</th><th>4</th><th>3</th><th>2</th><th>1</th><th>미판정</th></tr></thead>
  <tbody>${rows.map(d=>{const v=S[d], g=v.Sg||{};
   return `<tr class="gyrow-r" data-d="${esc(d)}" style="cursor:pointer">
    <td class="l">${esc(d)}</td>
    <td><b>${v.S.toLocaleString(undefined,{maximumFractionDigits:1})}</b></td>
    <td>${v.Savg.toFixed(1)}</td>
    ${[6,5,4,3,2,1].map(x=>`<td>${N(+g[x]||0)}</td>`).join('')}
    <td${v.undet>=500?' style="color:var(--s-amber);font-weight:700"':''}>${N(v.undet)}</td>
   </tr>`;}).join('')}</tbody></table></div>
  <div class="d" style="margin-top:8px">행을 누르면 성과관리 화면의 해당 학과로 갑니다.</div>`;
 box.querySelectorAll('.gyrow-r').forEach(tr=>tr.onclick=()=>{
  const d=tr.dataset.d;
  document.querySelector('[data-v="tree"]').click();
  setTimeout(()=>{const c=[...document.querySelectorAll('.dcard')]
    .find(x=>x.dataset.d===d); if(c) c.click();},260);
 });
}
/* ══════════ 경영자 KPI 보드 (문서 02/03 기준) ══════════ */
const KREG=[
 ['BK-A-01','교수 대표논문 질','교수 연구의 질','공식','잠정','A01','상위 1~3편의 g·FWCI·C',1],
 ['BK-A-02','교수 FWCI 평균','교수 연구의 질','대리','—','A02','논문 FWCI 평균 (1.0=세계평균)',1],
 ['BK-B-01','학생 주저자 건수','대학원생 성과','공식','잠정','B01pc','학생 1인당 주저자(제1·교신·단독) 건수',1],
 ['BK-B-02','학생 환산점수 S','대학원생 성과','대리','—','B02pc','학생 1인당 Σ(g×w)',1],
 ['BK-B-03','학생 환산편수 E','대학원생 성과','대리','—','B03','Σw (역할·저자수 보정)',1],
 ['BK-C-01','전후 성장률','공통','공식','잠정','C01','(2020~25 − 2015~19) ÷ 2015~19',1],
 ['BK-C-02','국제공저율','공통','대리','—','C02','국제협력 코드(wi·wn) ÷ 전체',1],
 ['BK-C-03','학위배출','대학원생 성과','공식','—',null,'석·박사 배출 수',0],
 ['BK-Q-01','매칭 신뢰도','내부','내부','—','Q01','tag.confidence 평균',1],
 ['BK-Q-02','검토필요율','내부','내부','—','Q02','검토필요 ÷ 참여자',1],
 ['BK-Q-03','회수 커버리지','내부','내부','—',null,'KCI/OpenAlex 회수 반영 편수',0],
 ['BK-Q-04','실측 비율','내부','내부','—','Q04','원천 논문DB 연결 ÷ 전체',1],
];
const MTX=[['A01','교수 대표논문 질'],['A02','교수 FWCI'],['B01pc','학생 주저자/인'],
 ['B02pc','학생 환산점수/인'],['B03','학생 환산편수'],['C01','전후 성장률'],['C02','국제공저율']];
const SIGC={'양호':'ok','관찰':'wt','개선 우선':'im','표본 부족':'sm'};
const GYC={'이공':'#3b82f6','의약생명':'#0f9c6d','인문사회':'#7c3aed'};
const fmtV=(k,v)=>v==null?'—':(k==='C01'?(v>0?'+':'')+v+'%':k==='C02'?v+'%':k==='A02'?v.toFixed(2):
 (k==='B01pc'||k==='B02pc')?v.toFixed(2):k==='B03'?Math.round(v):v);

function execBoard(){
 const K=KPI.depts, names=Object.keys(K);
 const risk=names.filter(d=>K[d].sig&&(K[d].sig.B01pc==='개선 우선'||K[d].sig.B02pc==='개선 우선'));
 const gate=names.filter(d=>K[d].Q02>=35||K[d].Q04<90||K[d].Ur>=30);
 const sum=names.reduce((a,d)=>{const v=K[d];a.P+=v.P;a.SP+=v.SP;a.B01+=v.B01;a.rev+=v.review;a.n+=v.nAll;return a;},
   {P:0,SP:0,B01:0,rev:0,n:0});
 const uAll=Math.round(names.reduce((a,d)=>a+K[d].P*(K[d].Ur||0)/100,0));
 const bs=names.map(d=>K[d].B01pc).filter(v=>v!=null);
 GAVG=bs.length?bs.reduce((a,b)=>a+b,0)/bs.length:0;
 const fw=names.map(d=>K[d].A02).filter(v=>v!=null);
 const fwm=names.map(d=>K[d].qFwMed).filter(v=>v!=null), fwa=names.map(d=>K[d].qFwAvg).filter(v=>v!=null);
 const fwM=fwm.length?med(fwm):0, fwA=fwa.length?fwa.reduce((a,b)=>a+b,0)/fwa.length:0;
 const pps=names.map(d=>K[d].qPp10).filter(v=>v!=null);
 const f3=names.map(d=>K[d].A01f3).filter(v=>v!=null); const f3M=f3.length?med(f3):0;
 const kciNone=names.filter(d=>!K[d].kciN).length;
 const gr=names.map(d=>K[d].C01).filter(v=>v!=null);

 let h=`<div class="ehead"><h2>SKKU BK21 KPI</h2>
  <span class="n">BK21 4단계 · 성과기간 2020~2025 · 학과·전공 ${names.length}개 · 참여자 ${N(sum.n)}명</span>
  <span class="pill off">SGCPI+ 배점 · 참여교수 적용</span><span class="pill in" title="SGCPI+ 는 대학원생 역량지수입니다(입력주체 대학원생·관리자). 배점표를 참여교수 논문 실적에 적용한 값이며 학생 지수와 다릅니다.">대학원생 지수를 교수에 적용</span><span class="pill prov" title="SGCPI+ 표에 칸이 없어 자체 기준을 세운 항목: JCR 50% 밖 2점 · 이공/의약 KCI 2점 · 기타 국제논문 3점 · 미판정 0점">자체 보완 4항</span>
  <div class="ex"><b>이 보드는 내부 관리용이며 공식 평가 결과가 아닙니다.</b> 판정 기준·배점은 BK21 공식 지침을 확보하지 못한 상태의 잠정값(<code>definition_version v0.1</code>)이고,
   신호는 <b>같은 계열 안에서의 상대위치</b>일 뿐 공식 합격·탈락 기준이 아닙니다.
   두 축은 <b>교수 연구의 질</b>(대표논문 1~3편의 수준)과 <b>대학원생 성과</b>(학생이 주저자로 낸 논문의 양과 질)입니다.
   <br><b>집계 단위 주의</b> · 이 화면의 단위는 <b>학과·전공 28개</b>입니다. BK21 평가 단위인 <b>교육연구단</b>과 1:1로 대응하지 않으며, 매핑이 확정되기 전에는 연구단 성과로 읽으면 안 됩니다.</div></div>`;

 /* 두 축 경보 */
 const hold=names.filter(d=>K[d].qLv!=='충분');
 const imp=names.filter(d=>totSig(K[d])==='개선 우선');
 h+=`<div class="alarm"><div class="ic">◆</div><div><b>개선 우선 ${imp.length}개 · 데이터 보완 ${hold.length}개 / 전체 ${names.length}개 학과</b>
   <p><b>성과 신호와 데이터 신뢰는 다른 축입니다.</b> 성과 신호는 모든 학과에 냅니다.
   데이터 보완이 필요한 학과는 신호 옆에 표시만 두고, 성과 조치보다 <b>데이터 정비</b>를 먼저 겁니다.
   품질 지표는 <b>FWCI ${(fwm.length/names.length*100).toFixed(0)}% · JCR 분야순위</b> 보유 논문에서만 산출합니다.</p></div></div>`;

 /* 요약 KPI */
 h+=ins(`맨 윗줄 여섯 칸은 사업 전체를 한눈에 보는 숫자입니다.
   논문이 몇 편인지(<b>${N(sum.P)}편</b>), 대학원생이 주저자로 쓴 논문이 몇 건인지,
   그 논문들이 세계 평균 대비 얼마나 인용되는지(FWCI, 1.0이 세계 평균)를 봅니다.
   <b>데이터 보완 필요</b> 칸은 실적이 나쁜 학과가 아니라 <b>기록이 덜 붙은 학과</b>입니다.`);
h+=`<div class="kpis">
  <div class="kpi" style="--c:var(--navy)"><div class="lb">전체 논문</div><div class="vl">${N(sum.P)}<small>편</small></div><div class="dt">학생 ${N(sum.SP)}편</div></div>
  <div class="kpi" style="--c:#3b82f6"><div class="lb">학생 주저자 (B-01)</div><div class="vl">${N(sum.B01)}<small>건</small></div><div class="dt">사업 전체 합</div></div>
  <div class="kpi" style="--c:#0f9c6d"><div class="lb">교수 대표논문 3편 FWCI</div><div class="vl">${f3M.toFixed(2)}<small>중앙값</small></div><div class="dt">전체 논문 FWCI 중앙값 ${fwM.toFixed(2)} · 평균 ${fwA.toFixed(2)}</div></div>
  <div class="kpi" style="--c:#f5a623"><div class="lb">성장률 중앙값 (C-01)</div><div class="vl">${gr.length?(med(gr)>0?'+':'')+med(gr).toFixed(0):'—'}<small>%</small></div><div class="dt">2015~19 대비</div></div>
  <div class="kpi k-warn" style="--c:#64708a"><div class="lb">데이터 보완 필요</div><div class="vl">${hold.length}<small>개 학과</small></div><div class="dt">원천DB 연결 · 동명이인 정제</div></div>
  <div class="kpi" style="--c:#0ea5b7"><div class="lb">PP (top 10%)</div><div class="vl">${(pps.length?med(pps):0).toFixed(1)}<small>%</small></div><div class="dt">분야·연도 상위 10% 논문 · 세계 기대값 10%</div></div>
 </div>`;

 h+=sgcpiCard();
 h+=radarCard();
 h+=aiCard();
 /* 신호등 테이블 */
 
h+=`<div class="ecard"><h3>연구단 신호등 <span class="pill in">내부 관리기준 · 계열 내 상대위치</span></h3>${ins(`학과를 같은 계열끼리만 견줍니다. 이공계와 인문사회를 같은 자로 재면
   논문 수가 많은 이공계가 늘 이기기 때문입니다. 초록은 계열 안에서 위쪽,
   빨강은 아래쪽이라는 뜻이고 <b>합격·탈락 기준이 아닙니다</b>.
   빨강이 뜬 학과는 먼저 <b>기록이 제대로 붙었는지</b>부터 보십시오.`)}
  <div class="trk">
   <div class="tk a"><b>트랙 A · 교수 연구의 질</b>
    <p>참여교수마다 <b>대표논문 3편</b>(FWCI 상위 3편)의 평균을 내고, 그 값의 <b>학과 중앙값</b>입니다.
     FWCI는 같은 분야·연도 평균을 1로 놓은 값입니다. 논문 수가 적어도 대표작으로 재기 때문에 <b>최소 편수 컷을 두지 않습니다</b>.</p></div>
   <div class="tk b"><b>트랙 B · 대학원생 성과</b>
    <p>대학원생이 <b>제1저자·교신저자로 낸 논문의 1인당 건수</b>. 학생이 스스로 실적을 내고 있는지 봅니다.</p></div>
   <div class="tk w"><b>종합은 낮은 쪽</b>
    <p>BK21은 두 트랙을 <b>따로</b> 채점합니다. 한쪽이 바닥이면 전체가 흔들리므로 종합 신호는 <b>두 트랙 중 낮은 쪽</b>을 씁니다.</p></div>
  </div>
  <div class="d"><b>공식 평가 등급이 아닙니다.</b> 지표는 <b>분야·연도 보정</b>을 거친 값(FWCI · PP top10% · JCR 분야순위)만 씁니다 —
   저널 IF로 개인·논문을 평가하지 않습니다(DORA). 같은 계열(인문사회·이공·의약생명) 안에서의 상대위치를
   <b>양호</b>(상위 50% 이상) · <b>관찰</b>(상위 50~75%) · <b>개선 우선</b>(하위 25%)으로 표시합니다. 분야 관행 차이를 흡수하기 위해 계열 안에서만 비교합니다.
   <b>데이터</b> 칸이 <b>보완 필요</b>인 학과는 수치가 아직 덜 모인 상태라 정비 후 신호가 바뀔 수 있습니다.</div>
  <div class="fl" id="fl" style="margin-bottom:10px"></div>
  <div style="overflow:auto;max-height:560px"><table class="mtx sigx" id="sigT"></table></div>
  <div class="lgs"><span><em style="background:#a7e8c8"></em>양호</span><span><em style="background:#fbd9a5"></em>관찰</span>
   <span><em style="background:#f5c3cd"></em>개선 우선</span><span><em style="background:var(--c2)"></em>표본 부족</span>
   <span style="margin-left:auto">행을 누르면 아래 <b>트랙 B 하위 학과·전공</b> 패널이 그 학과의 내부 편차로 바뀝니다</span></div></div>`;

 /* 분포 + 성장률 */
 h+=`<div class="erow e2">
  <div class="ecard"><h3>투 트랙 매트릭스</h3>
   ${ins(`가로는 교수의 연구 질, 세로는 대학원생의 성과입니다.
     <b>오른쪽 위</b>가 둘 다 좋은 학과, <b>왼쪽 아래</b>가 둘 다 약한 학과입니다.
     교수는 강한데 학생이 약한 <b>오른쪽 아래</b>가 눈여겨볼 자리입니다 —
     연구는 되는데 그 성과가 학생에게 넘어가지 않는다는 신호입니다.`)}
   <div class="d">가로 = <b>트랙 A</b>(교수 대표논문 질) 계열 내 백분위 · 세로 = <b>트랙 B</b>(학생 1인당 주저자 건수) 계열 내 백분위.
    두 축 모두 백분위라 인문사회와 이공을 절대비교하지 않습니다. 원 크기는 참여자 수, <b>회색 테두리</b>는 데이터 보완이 필요한 학과입니다(성과 신호는 그대로 냅니다).</div>
   ${matrix(K,names)}
   <div class="mxlg">${Object.entries(GYC).map(([g,c])=>`<span><i style="background:${c}"></i>${g}</span>`).join('')}
    <span style="color:var(--ink3)">· 아래쪽 붉은 띠 = 트랙 B 하위 25% 구간(내부 관리기준)</span>
    <span style="margin-left:auto">원을 누르면 우측 패널이 그 학과의 내부 편차로 바뀝니다</span></div></div>
  <div class="ecard" id="lowCard"><h3 id="lowT"></h3>
   ${ins(`왼쪽 매트릭스에서 <b>아래쪽에 놓인 학과</b>를 뽑아 놓은 목록입니다.
     순위표가 아니라 <b>먼저 들여다볼 곳</b>입니다.
     학생 수가 적은 학과는 한두 명의 실적으로 값이 크게 흔들리므로
     숫자보다 <b>사람 수</b>를 같이 보십시오.`)}
   <div class="d" id="lowD"></div>
   <div id="lowB"></div></div></div>
 <div class="erow e2"><div class="ecard"><h3>전후 성장률 (BK-C-01) <span class="pill off">공식</span><span class="pill prov">잠정</span></h3>
   ${ins(`사업 전과 후를 견줍니다. <b>+65%</b>는 사업 시작 뒤 논문이 그만큼 늘었다는 뜻입니다.
     대학원생은 사업 전에 재학 전이라 분모가 비어 성장률이 터집니다.
     그래서 <b>교수와 신진연구인력만</b> 세었습니다.`)}
   <div class="d">2015~2019 대비 2020~2025 논문 증감. <b>시점형 참여자(교수·신진)만</b> 집계합니다 — 대학원생은 2015~19년에 재학 전이라 분모가 비어 성장률이 폭발합니다.
    우측 숫자는 해당 학과·전공 교수의 원천DB 연결 커버리지입니다.</div>
   ${growth(K,names)}</div>
  <div class="ecard"><h3>연구단 내 편차</h3>
   ${ins(`평균은 소수의 뛰어난 사람이 끌어올립니다. 이 칸은 <b>평균 뒤에 가려진 격차</b>를 봅니다.
     막대가 한쪽으로 몰려 있으면 몇 사람이 학과 실적을 떠받치고 있다는 뜻이고,
     그 사람이 떠나면 숫자가 무너집니다.`)}
   <div class="d">평균 뒤에 가려진 편차를 봅니다. 소수 인원이 실적을 떠받치는 구조인지 확인합니다.</div>
   ${devPanel(K,names)}</div></div>`;

 /* 조치 */
 
h+=`<div class="ecard"><h3>조치 대상 <span class="pill in">신호 → 조치 → 책임</span></h3>${ins(`<b>개인을 지목하지 않습니다.</b> 학과·전공 단위로만 봅니다.
   그리고 조치 전에 구분해야 할 것이 있습니다 —
   <b>실적이 낮은 곳</b>과 <b>기록이 덜 붙은 곳</b>은 처방이 다릅니다.
   후자는 성과를 다그칠 일이 아니라 자료를 정비할 일입니다.`)}
  <div class="d">개인 순위표는 만들지 않으며 학과·전공 단위로만 표시합니다. 데이터 보완이 필요한 곳은 성과 조치보다 <b>정비</b>가 먼저입니다.</div>`;
 const actP=names.filter(d=>K[d].qLv==='충분'&&totSig(K[d])==='개선 우선')
   .sort((a,b)=>(K[a].pct?.B01pc??999)-(K[b].pct?.B01pc??999));
 const actQ=hold.slice().sort((a,b)=>K[b].Q02-K[a].Q02);
 const acts=[...actP.slice(0,5).map(d=>[d,'p']),...actQ.slice(0,5).map(d=>[d,'q'])];
 if(!acts.length) h+=`<div class="empty" style="padding:16px">조치 대상이 없습니다.</div>`;
 acts.forEach(([d,kind])=>{const v=K[d];
  if(kind==='p'){
   const why=[];
   if(v.sig?.B01pc==='개선 우선') why.push(`학생 주저자 1인당 ${v.B01pc.toFixed(2)}건 · 계열 내 하위 ${v.pct.B01pc}%`);
   if(v.sig?.A01==='개선 우선') why.push(`교수 대표논문 평균 인용 ${v.A01} · 계열 내 하위 ${v.pct.A01}%`);
   if(v.sig?.C01==='개선 우선') why.push(`전후 성장률 ${v.C01}%`);
   const bLow=v.sig?.B01pc==='개선 우선';
   h+=`<div class="act"><h5><span class="sg sg-im">개선 우선</span> ${esc(d)}
    <span class="dg" style="font-weight:600">${v.gy} · 교수 ${v.nProf}명 · 학생 ${N(v.nStu)}명 · 학생 주저자 0편 ${N(v.zeroStu)}명</span></h5>
    <p><b>근거</b> ${why.join(' · ')} <span class="pill in">내부 관리기준 · 공식 평가 결과 아님</span></p>
    <p><b>조치</b> ${bLow
      ? '학생 실적부터 봅니다. ① 미매칭 주저자 발굴(KCI·OpenAlex 회수) ② 졸업요건 미달자 확인 ③ 게재 예정자 독려 ④ 신규 학생·논문 확보 계획.'
      : '교수 축을 봅니다. ① 대표논문 재선정 ② 공동연구·국제공저 강화 ③ 후속 피인용 파급 모니터.'}</p>
    <div class="raci"><span>조치 <b>학과·전공 책임자</b></span><span>승인 <b>사업본부</b></span><span>주기 <b>분기 점검</b></span></div></div>`;
  }else{
   h+=`<div class="act q"><h5><span class="sg sg-sm">데이터 보완</span> ${esc(d)}
    <span class="dg" style="font-weight:600">${v.gy} · 참여 ${N(v.nAll)}명 · 현재 신호 ${totSig(v)}</span></h5>
    <p><b>보완 사유</b> ${esc(v.qWhy.join(' · '))}</p>
    <p><b>조치</b> ${v.qFix==='원천DB 연결'
      ? '학과 참여자의 논문이 원천DB에 아직 다 연결되지 않았습니다. 미연결 인원 재매칭 후 재집계합니다.'
      : v.qFix==='동명이인 정제'
      ? '동명이인 검토가 남아 실적이 과대·과소 계상될 수 있습니다. 검토필요 인원을 확정한 뒤 재집계합니다.'
      : '참여자 수가 적어 통계 신뢰도가 낮습니다. 범위로만 읽고 순위로 쓰지 않습니다.'}</p>
    <div class="raci"><span>조치 <b>데이터관리자</b></span><span>승인 <b>학과·전공 책임자</b></span><span>보고 <b>사업본부</b></span></div></div>`;}});
 h+=`</div>`;

 /* 레지스트리 */
 
 h+=`<div class="ecard"><h3>KPI 레지스트리 <span class="pill prov">definition_version v0.1 · 잠정</span></h3>${ins(`이 화면의 숫자가 <b>각각 어떤 규칙으로 계산됐는지</b> 적어 둔 목록입니다.
   「공식」은 BK21 지침에 있는 지표, 「잠정」은 지침을 못 구해 우리가 정한 규칙입니다.
   숫자를 의심할 때 여기부터 보시면 됩니다.`)}
  <div class="d"><b>주의</b> · g(저널등급)·w(역할가중)·환산점수·환산편수의 산식은 아직 기준문서에 수록되지 않았습니다. 현재는 <b>이 화면의 생성 로직이 사실상 정본</b>으로 동작하고 있어,
   기준문서에 산식을 옮겨 확정하기 전까지 이 수치를 대외 근거로 쓰면 안 됩니다.</div>
  <table class="reg"><thead><tr><th>kpi_id</th><th>명칭</th><th>평가 축</th><th>등급</th><th>상태</th><th>산식</th><th>산출</th></tr></thead><tbody>`;
 KREG.forEach(([id,nm,tr,gd,stv,key,f,ok])=>{
  h+=`<tr><td class="k">${id}</td><td>${nm}</td><td>${tr}</td>
   <td><span class="pill ${gd==='공식'?'off':gd==='대리'?'px':'in'}">${gd}</span></td>
   <td>${stv==='잠정'?'<span class="pill prov">잠정</span>':stv}</td><td class="dg">${f}</td>
   <td>${ok?'<span class="sg sg-정상">산출</span>':'<span class="no">산출불가</span>'}</td></tr>`;});
 h+=`</tbody></table>
  <div class="d" style="margin:12px 0 0">
   <b>산출불가 사유</b> · BK-C-03 학위배출: 원천에 학위수여 데이터 없음 · BK-Q-03 회수 커버리지: KCI/OpenAlex 회수 파이프라인 미연동.<br>
   <b>저널등급 교체 완료</b> · 저널 IF 절대값을 <b>JCR 분야순위 백분위</b>(<code>IF_PUB_RANK</code>, 순위/전체저널수)로 바꿨습니다.
   상위 10% 이내=4 · 25% 이내=3 · 50% 이내=2 · 그 외=1, 순위가 없으면 환산에서 제외합니다.
   트랙 A는 대표논문 평균 인용에서 <b>FWCI 중앙값 + PP(top 10%)</b>로 바꿨습니다. 저널 IF로 개인·논문을 평가하지 않습니다(DORA 권고).<br>
   <b>등급 미확정</b> · IF가 아직 부여되지 않은 SCI 논문은 '일반'으로 낮추지 않고 <b>미확정</b>으로 분리해 환산점수(BK-B-02)·대표논문 질(BK-A-01) 산출에서 제외합니다. 최근 연도 실적이 구조적으로 불리해지는 것을 막기 위함입니다.<br>
   <b>품질 벡터 Q</b> · 보강 커버리지: 원천DB 연결 ${KPI.meta.enrich.aid}% · FWCI ${KPI.meta.enrich.fw}% · 저자수 ${KPI.meta.enrich.n}% · 국제협력 ${KPI.meta.enrich.cp}% (${N(KPI.meta.papers)}편 기준)</div></div>`;

 h+=srcCard('exec');
 document.getElementById('v-exec').innerHTML=h;
 sigTable(); renderLow();
 /* 계열 카드 아코디언 — 하나만 열린다. 다시 누르면 접힌다. */
 let openGy=null;
 document.querySelectorAll('#sgcpiCard .gycard').forEach(c=>c.onclick=()=>{
  const gy=c.dataset.gy; openGy = (openGy===gy)? null : gy;
  document.querySelectorAll('#sgcpiCard .gycard')
   .forEach(x=>x.classList.toggle('on', x.dataset.gy===openGy));
  paintGyOpen(openGy);
 });
 document.querySelectorAll('#v-exec .mtxsvg circle').forEach(c=>c.onclick=()=>pickDept(c.dataset.d));
 srcWire(document.getElementById('v-exec'));
}
const med=a=>{const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};

function scatter(K,names){
 const W=560,H=330,P={t:16,r:16,b:34,l:44};
 const pts=names.filter(d=>K[d].A01!=null&&K[d].B02pc!=null).map(d=>({d,x:K[d].B02pc,y:K[d].A01,n:K[d].nAll,gy:K[d].gy,sig:K[d].sig?.B02pc}));
 if(!pts.length) return '<div class="empty">표시할 데이터가 없습니다.</div>';
 const xs=pts.map(p=>p.x), ys=pts.map(p=>p.y);
 const x0=0,x1=Math.max(...xs)*1.08, y0=0,y1=Math.max(...ys)*1.1;
 const X=v=>P.l+(v-x0)/(x1-x0)*(W-P.l-P.r), Y=v=>H-P.b-(v-y0)/(y1-y0)*(H-P.t-P.b);

 let s=`<svg class="scat" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="교수 연구의 질과 대학원생 성과 분포">`;

 for(let i=0;i<=4;i++){const gy=P.t+(H-P.t-P.b)*i/4; s+=`<line class="gr" x1="${P.l}" y1="${gy}" x2="${W-P.r}" y2="${gy}"/>`;}
 s+=`<line class="ax" x1="${P.l}" y1="${H-P.b}" x2="${W-P.r}" y2="${H-P.b}"/><line class="ax" x1="${P.l}" y1="${P.t}" x2="${P.l}" y2="${H-P.b}"/>`;
 for(let i=0;i<=4;i++){const v=y0+(y1-y0)*i/4; s+=`<text x="${P.l-7}" y="${Y(v)+3}" text-anchor="end">${v.toFixed(0)}</text>`;}
 for(let i=0;i<=4;i++){const v=x0+(x1-x0)*i/4; s+=`<text x="${X(v)}" y="${H-P.b+15}" text-anchor="middle">${v.toFixed(1)}</text>`;}
 s+=`<text x="${(P.l+W-P.r)/2}" y="${H-4}" text-anchor="middle">학생 1인당 환산점수 (BK-B-02)</text>
  <text x="12" y="${(P.t+H-P.b)/2}" text-anchor="middle" transform="rotate(-90 12 ${(P.t+H-P.b)/2})">교수 대표논문 질 (BK-A-01)</text>`;
 const rmax=Math.max(...pts.map(p=>p.n));
 pts.sort((a,b)=>b.n-a.n).forEach(p=>{
  const r=6+Math.sqrt(p.n/rmax)*13;
  s+=`<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${r.toFixed(1)}" data-d="${esc(p.d)}"
   fill="${GYC[p.gy]||'var(--c4)'}" fill-opacity="${p.sig==='개선 우선'?.8:.4}" stroke="${p.sig==='개선 우선'?'#b0344c':GYC[p.gy]}" stroke-width="${p.sig==='개선 우선'?2.5:1}" stroke-opacity="${p.sig==='개선 우선'?1:.7}"><title>${esc(p.d)}
B-02 ${p.x.toFixed(2)} · A-01 ${p.y.toFixed(2)} · 참여 ${p.n}명 · ${p.sig||''}</title></circle>`;});
 return s+'</svg>';
}
function growth(K,names){
 const rows=names.filter(d=>K[d].C01!=null).sort((a,b)=>K[b].C01-K[a].C01);
 if(!rows.length) return '<div class="empty">산출 가능한 학과·전공이 없습니다.</div>';
 const mx=Math.max(...rows.map(d=>Math.abs(K[d].C01)),10);
 let h='<div style="max-height:288px;overflow:auto;padding-right:4px">';
 rows.forEach(d=>{const v=K[d].C01, w=Math.abs(v)/mx*50;
  h+=`<div class="gb"><div class="nm" title="${esc(d)}">${esc(d)}</div>
   <div class="tr"><div class="zero" style="left:50%"></div>
    <i style="${v>=0?`left:50%;width:${w}%;background:#7ed3a5`:`right:50%;width:${w}%;background:#f9a8b8`}"></i></div>
   <div class="vv" style="color:${v>=0?'var(--s-green)':'var(--s-red)'}">${v>0?'+':''}${v}%</div>
   <div class="dg" style="width:44px;text-align:right" title="원천DB 연결 커버리지">${K[d].C01cov}%</div></div>`;});
 return h+'</div>';
}
/* 화면을 바꾸면 그 페이지 맨 위로 부드럽게 올린다 */
function toTop(smooth){
 const b=(smooth&&!matchMedia('(prefers-reduced-motion: reduce)').matches)?'smooth':'auto';
 try{ window.scrollTo({top:0,behavior:b}); }catch(e){ window.scrollTo(0,0); }
}
function setView(v,smooth){
 /* 새 화면을 추가하면 반드시 여기에도 넣는다. 빠지면 hidden 이 안 풀려 화면이 안 보인다. */
 ['tree','exec','net','glob','exp','univ','sheet','pool','ucmp'].forEach(k=>{
  const el=document.getElementById('v-'+k); if(el) el.classList.toggle('hidden', v!==k); });
 document.querySelectorAll('.rail button[data-v]').forEach(b=>b.classList.toggle('on', b.dataset.v===v));
 document.querySelector('.top').style.display = v==='tree'?'':'none';
 if(v==='exec'&&!document.getElementById('v-exec').innerHTML) execBoard();
 if(v==='net'&&!document.getElementById('v-net').innerHTML) netBoard();
 if(v==='glob'&&!document.getElementById('v-glob').innerHTML) globBoard();
 if(v==='univ'&&!document.getElementById('v-univ').innerHTML) univBoard();
 if(v==='sheet'&&!document.getElementById('v-sheet').innerHTML) sheetBoard();
 if(v==='pool'&&!document.getElementById('v-pool').innerHTML) poolBoard();
 if(v==='ucmp'&&!document.getElementById('v-ucmp').innerHTML) ucmpBoard();
 if(v==='exp'){ const el=document.getElementById('v-exp');
  if(!el.innerHTML) exploreBoard(); else if(typeof xReset==='function') xReset(); }
 const t=document.getElementById('v-'+v);
 if(t) t.querySelectorAll('.scroll').forEach(e=>{e.scrollTop=0;});
 if(window.paintTheme) window.paintTheme(v);
 if(typeof visApply==='function') visApply();
 toTop(smooth);
}
document.querySelectorAll('.rail button[data-v]').forEach(b=>b.onclick=()=>setView(b.dataset.v,true));

/* ── 투 트랙 매트릭스 (백분위 × 백분위) ── */
function matrix(K,names){
 const W=560,H=352,P={t:18,r:18,b:44,l:42}, iw=W-P.l-P.r, ih=H-P.t-P.b;
 const pts=names.filter(d=>K[d].pct?.A01!=null&&K[d].pct?.B01pc!=null)
   .map(d=>({d,a:K[d].pct.A01,b:K[d].pct.B01pc,n:K[d].nAll,gy:K[d].gy,hold:K[d].qLv!=='충분'}));
 if(!pts.length) return '<div class="empty">표시할 데이터가 없습니다.</div>';
 const x=v=>P.l+v/100*iw, y=v=>P.t+ih-v/100*ih;
 let s=`<svg class="mtxsvg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="투 트랙 매트릭스">`;
 s+=`<rect x="${P.l}" y="${y(25)}" width="${iw}" height="${ih*.25}" fill="var(--t-red)"/>`;
 s+=`<rect x="${P.l}" y="${y(50)}" width="${iw}" height="${ih*.25}" fill="#fff8ec" opacity=".7"/>`;
 [0,25,50,75,100].forEach(v=>{
  s+=`<line x1="${x(v)}" y1="${P.t}" x2="${x(v)}" y2="${P.t+ih}" stroke="var(--line2)"/>`;
  s+=`<line x1="${P.l}" y1="${y(v)}" x2="${P.l+iw}" y2="${y(v)}" stroke="var(--line2)"/>`;
  s+=`<text x="${x(v)}" y="${P.t+ih+15}" text-anchor="middle">${v}</text>`;
  s+=`<text x="${P.l-8}" y="${y(v)+3.5}" text-anchor="end">${v}</text>`;});
 s+=`<line x1="${x(50)}" y1="${P.t}" x2="${x(50)}" y2="${P.t+ih}" stroke="var(--c3)" stroke-dasharray="4 4"/>`;
 s+=`<line x1="${P.l}" y1="${y(50)}" x2="${P.l+iw}" y2="${y(50)}" stroke="var(--c3)" stroke-dasharray="4 4"/>`;
 s+=`<text x="${P.l+iw}" y="${P.t+ih+34}" text-anchor="end">트랙 A 백분위 (교수 대표논문 질) →</text>`;
 s+=`<text x="${P.l-8}" y="${P.t-6}" text-anchor="end">↑ 트랙 B</text>`;
 s+=`<text class="rl" x="${P.l+8}" y="${y(11)}">트랙 B 하위 25% · 개선 우선 구간</text>`;
 pts.sort((a,b)=>b.n-a.n).forEach(p=>{
  const r=Math.max(6,Math.min(21,Math.sqrt(p.n)*1.32));
  s+=`<circle cx="${x(p.a).toFixed(1)}" cy="${y(p.b).toFixed(1)}" r="${r.toFixed(1)}" data-d="${esc(p.d)}"
   fill="${GYC[p.gy]}" fill-opacity="${p.hold?.26:.6}" stroke="${p.hold?'var(--c4)':GYC[p.gy]}" stroke-width="${p.hold?2:1.2}"
   ><title>${esc(p.d)} (${p.gy})\n트랙A ${p.a}%ile · 트랙B ${p.b}%ile\n참여 ${p.n}명${p.hold?' · 데이터 보완 필요':''}</title></circle>`;});
 const hid=names.length-pts.length;
 return s+'</svg>'+(hid?`<div class="d" style="margin:7px 0 0">표본 부족 ${hid}개 학과는 표시하지 않았습니다.</div>`:'');
}
/* ── 트랙 B 하위 패널 ── */
function lowPanel(K,names){
 const has=names.filter(d=>K[d].B01pc!=null);
 const avg=has.reduce((a,d)=>a+K[d].B01pc,0)/Math.max(has.length,1)||1;
 const col=d=>SGB2[K[d].sig?.B01pc]||'var(--c3)';
 const row=d=>{const v=K[d];
  return `<div class="dl"><div class="n" data-go="${esc(d)}" title="${esc(d)} · ${v.gy}">${esc(d)}<span> 학생 ${N(v.nStu)}명</span></div>
   <div class="bar avg"><i style="width:${Math.min(100,Math.max(2,v.B01pc/avg*50)).toFixed(1)}%;background:${col(d)}"></i></div>
   <div class="v">${v.B01pc.toFixed(2)}<span class="pc" style="color:${col(d)}">${v.pct?.B01pc??'-'}%</span></div></div>`;};
 const worst=has.slice().sort((a,b)=>(K[a].pct?.B01pc??999)-(K[b].pct?.B01pc??999)).slice(0,6);
 const best=has.slice().sort((a,b)=>(K[b].pct?.B01pc??-1)-(K[a].pct?.B01pc??-1)).slice(0,4);
 const held=names.filter(d=>K[d].qLv!=='충분').sort((a,b)=>K[b].Q02-K[a].Q02).slice(0,6);
 let h=`<div class="sub-t">조치 우선순위 · 학생 1인당 주저자 건수가 낮은 순</div>${worst.map(row).join('')}`;
 h+=`<div class="sub-t">대비군 · 같은 지표 상위 <span style="color:var(--ink3)">백분위는 계열 안에서 매기므로 계열별 선두가 각각 100%입니다</span></div>${best.map(row).join('')}`;
 if(held.length) h+=`<div class="sub-t">데이터 보완 필요 · 성과 조치보다 정비가 먼저</div><div class="hold">${
   held.map(d=>`<div class="hl" data-go="${esc(d)}"><span>${esc(d)}</span><span class="n">${esc(K[d].qWhy[0]||'')}</span></div>`).join('')}</div>
   <div class="d" style="margin:8px 0 0">성과가 낮은 것인지 데이터가 빈 것인지 갈리므로, 이 학과들의 신호는 정비 후 바뀔 수 있습니다.</div>`;
 return h;
}
/* ── 연구단 내 편차 ── */
function devPanel(K,names){
 const conc=names.filter(d=>K[d].conc!=null).sort((a,b)=>K[b].conc-K[a].conc).slice(0,6);
 const zero=names.slice().sort((a,b)=>(K[b].zeroStu/Math.max(K[b].nStu,1))-(K[a].zeroStu/Math.max(K[a].nStu,1))).slice(0,6);
 let h=`<div class="sub-t">상위 3명 집중도 · 소수가 실적을 떠받치는 정도</div>`;
 conc.forEach(d=>{const v=K[d].conc, c=v>=50?'#b45309':'#8fb0e4';
  h+=`<div class="dl"><div class="n" data-go="${esc(d)}">${esc(d)}<span> 학생 ${N(K[d].nStu)}명</span></div>
   <div class="bar"><i style="width:${v}%;background:${c}"></i></div><div class="v" style="color:${c}">${v}%</div></div>`;});
 h+=`<div class="d" style="margin:7px 0 0">50% 이상이면 평균이 소수 인원에 의해 유지되는 구조입니다.</div>`;
 h+=`<div class="sub-t">학생 주저자 0편 비율</div>`;
 zero.forEach(d=>{const v=K[d], r=v.zeroStu/Math.max(v.nStu,1)*100;
  h+=`<div class="dl"><div class="n" data-go="${esc(d)}">${esc(d)}</div>
   <div class="bar"><i style="width:${r.toFixed(0)}%;background:var(--c3)"></i></div>
   <div class="v">${N(v.zeroStu)}<span class="pc" style="color:var(--ink3)">/${N(v.nStu)}명</span></div></div>`;});
 return h;
}
const SGB2={'양호':'#7ed3a5','관찰':'#f0b45f','개선 우선':'#e08196','표본 부족':'var(--c3)'};
/* 막대는 연한 색, 숫자는 같은 계열의 진한 색 — 흰 배경에서도 다크에서도 읽히게 */
const SGT={'양호':'var(--s-green)','관찰':'var(--s-amber)','개선 우선':'var(--s-red)','표본 부족':'var(--c4)'};
const RNK={'개선 우선':0,'관찰':1,'양호':2,'표본 부족':3};

/* ── 신호등 테이블 ── */
let FILT='all', SEL=null, GAVG=0;
function totSig(v){
 if(v.nAll<5) return '표본 부족';
 const a=v.sig?.A01f3??v.sig?.A01f??v.sig?.A01, b=v.sig?.B01pc;
 const c=[a,b].filter(Boolean);
 if(!c.length) return '표본 부족';
 return c.sort((x,y)=>RNK[x]-RNK[y])[0];
}
function pcell(p,sig){
 if(p==null) return '<span class="sg sg-na">—</span>';
 const c=SGB2[sig]||'var(--c3)';
 return `<span class="pcell"><span class="pb"><i style="width:${p}%;background:${c}"></i></span><b style="font:600 12px var(--num);color:${SGT[sig]||'var(--c4)'}">${p}%</b></span>`;
}
function nextAct(v){
 if(v.qLv!=='충분') return [v.qFix, 'q'];
 if(v.sig?.B01pc==='개선 우선') return ['학생 주저자 실적 회수','p'];
 if((v.sig?.A01f3??v.sig?.A01f)==='개선 우선') return ['대표논문 영향력 개선 · 공동연구 강화','p'];
 if(totSig(v)==='관찰') return ['추세 관찰','w'];
 if(totSig(v)==='표본 부족') return ['표본 확대','q'];
 return ['유지','k'];
}
function goDept(d){CUR=d;setView('tree');deptList();detail();document.querySelector('.dcard.on')?.scrollIntoView({block:'center'});}
function sigTable(){
 const K=KPI.depts, names=Object.keys(K);
 const cnt={}; names.forEach(d=>{const t=totSig(K[d]); cnt[t]=(cnt[t]||0)+1;});
 const nq=names.filter(d=>K[d].qLv!=='충분').length;
 const F=[['all','전체',names.length],['개선 우선','개선 우선',cnt['개선 우선']||0],
   ['관찰','관찰',cnt['관찰']||0],['양호','양호',cnt['양호']||0],['q','데이터 보완',nq]];
 const fl=document.getElementById('fl'); if(!fl) return;
 fl.innerHTML=F.map(([k,l,c])=>`<button class="fbtn ${FILT===k?'on':''}" data-f="${k}">${l} ${c}</button>`).join('');
 fl.querySelectorAll('button').forEach(b=>b.onclick=()=>{FILT=b.dataset.f;sigTable();});
 const rows=names.filter(d=>FILT==='all'||(FILT==='q'?K[d].qLv!=='충분':totSig(K[d])===FILT))
   .sort((a,b)=>RNK[totSig(K[a])]-RNK[totSig(K[b])]||((K[a].pct?.B01pc??999)-(K[b].pct?.B01pc??999)));
 let h=`<colgroup>${['17%','6%','8%','8%','7%','7%','6%','6%','7%','7%','6%','7%','8%'].map(w=>`<col style="width:${w}">`).join('')}</colgroup>
 <thead>
  <tr class="g"><th colspan="3"></th>
   <th colspan="3" class="hga">트랙 A · 교수 연구의 질</th>
   <th colspan="3" class="hgb">트랙 B · 대학원생 성과</th>
   <th colspan="4"></th></tr>
  <tr><th class="l">학과·전공</th><th>계열</th><th style="text-align:right">참여<br><span class="sm">교수/학생</span></th>
   <th style="text-align:right" class="ba">대표논문 3편<br><span class="sm">FWCI</span></th>
   <th style="text-align:right" class="ba">PP top10%<br><span class="sm">상위논문</span></th><th class="ba">계열 내 위치</th>
   <th style="text-align:right">주저자<br><span class="sm">논문 수</span></th><th style="text-align:right">1인당<br><span class="sm">건</span></th><th>계열 내 위치</th>
   <th style="text-align:right">국내<br><span class="sm">KCI</span></th><th>종합</th><th>데이터</th><th class="l">다음 조치</th></tr></thead><tbody>`;
 rows.forEach(d=>{const v=K[d], t=totSig(v), [act,ak]=nextAct(v), q=v.qLv!=='충분';
  h+=`<tr data-go="${esc(d)}" class="${SEL===d?'sel':''}"><td class="l"><span class="dn">${esc(d)}</span></td>
   <td><span class="gys" style="background:${GYC[v.gy]}">${v.gy}</span></td>
   <td class="num">${N(v.nAll)}<span class="dg"> (${v.nProf}/${N(v.nStu)})</span></td>
   <td class="num ba">${v.A01f3==null?'—':v.A01f3.toFixed(2)}<span class="dg"> ${v.A01n3||0}명</span></td>
   <td class="num ba">${v.A01p==null?'—':v.A01p.toFixed(1)+'%'}</td>
   <td class="ba">${pcell(v.pct?.A01f3,v.sig?.A01f3)}</td>
   <td class="num">${N(v.B01)}</td><td class="num">${v.B01pc==null?'—':v.B01pc.toFixed(2)}</td><td>${pcell(v.pct?.B01pc,v.sig?.B01pc)}</td>
   <td class="num">${v.kciN?N(v.kciN):'<span class="none">없음</span>'}</td>
   <td><span class="sg sg-${SIGC[t]}">${t}</span></td>
   <td><span class="qb ${q?'bad':'good'}" title="${esc(v.qWhy.join(' · ')||'원천DB 연결 '+v.Q04+'% · 검토필요 '+v.Q02+'%')}">${q?'보완 필요':'충분'}</span></td>
   <td class="l"><span class="ac ac-${ak}">${esc(act)}</span></td></tr>`;});
 document.getElementById('sigT').innerHTML=h+'</tbody>';
 document.querySelectorAll('#sigT tr[data-go]').forEach(r=>r.onclick=()=>pickDept(r.dataset.go));
 markSel();
}

/* ── 학과 선택 → 하위 패널 전환 ── */
function pickDept(d){ SEL=(SEL===d?null:d); renderLow(); markSel();
 const c=document.getElementById('lowCard'); if(SEL&&c) c.scrollIntoView({block:'nearest',behavior:'smooth'}); }
function markSel(){
 document.querySelectorAll('#sigT tr[data-go]').forEach(r=>r.classList.toggle('sel',r.dataset.go===SEL));
 document.querySelectorAll('#v-exec .mtxsvg circle').forEach(c=>{const on=c.dataset.d===SEL;
  c.classList.toggle('pk',on); if(on) c.parentNode.appendChild(c);});
}
function renderLow(){
 const K=KPI.depts, names=Object.keys(K);
 const T=document.getElementById('lowT'), D=document.getElementById('lowD'), B=document.getElementById('lowB');
 if(!T) return;
 if(!SEL){
  T.textContent='트랙 B 하위 학과·전공';
  D.innerHTML=`학생 1인당 주저자 건수가 낮은 순입니다. 가운데 점선은 사업 평균 <b>${GAVG.toFixed(2)}건</b>, 오른쪽 작은 값은 계열 내 백분위입니다.
   정렬은 백분위 기준이라 계열이 다르면 건수 순서와 어긋납니다. 이름·행·원을 누르면 그 학과의 내부 편차를 봅니다.`;
  B.innerHTML=lowPanel(K,names);
 }else{
  const v=K[SEL];
  T.textContent=SEL+' 내 편차';
  D.innerHTML=`평균 뒤에 가려진 개인 편차입니다. 참여 ${N(v.nAll)}명 (교수 ${v.nProf} / 학생 ${N(v.nStu)}) ·
   계열 ${v.gy} · 판정 <b>${totSig(v)}</b>.`;
  B.innerHTML=deptDev(v);
 }
 B.querySelectorAll('[data-go]').forEach(el=>el.onclick=e=>{e.stopPropagation();pickDept(el.dataset.go);});
 const bk=B.querySelector('[data-back]'); if(bk) bk.onclick=()=>pickDept(SEL);
 const dh=B.querySelector('[data-dash]'); if(dh) dh.onclick=()=>goDept(dh.dataset.dash);
}
function deptDev(v){
 const conc=v.conc, hot=conc!=null&&conc>=50;
 let h=`<div class="fl" style="margin-bottom:12px"><button class="fbtn" data-back="1">← 전체 목록</button>
  <button class="fbtn" data-dash="${esc(SEL)}">학과 대시보드 열기</button></div>
 <div class="dvk">
  <div><div class="d">학생 주저자 0편</div><div class="num">${N(v.zeroStu)}<span> / ${N(v.nStu)}명</span></div></div>
  <div><div class="d">상위 3명 집중도</div><div class="num" style="${hot?'color:#b45309':''}">${conc==null?'—':conc+'%'}</div></div>
  <div><div class="d">학생 1인당 주저자</div><div class="num">${v.B01pc==null?'—':v.B01pc.toFixed(2)}<span> 건</span></div></div>
 </div>`;
 if(hot) h+=`<div class="dvw">상위 3명이 학생 실적의 절반 이상을 냅니다. 평균이 소수 인원에 의해 유지되는 구조입니다.</div>`;
 const bt=v.bTop||[];
 if(!bt.length) h+=`<div class="empty" style="padding:14px 0">학생 주저자 실적이 있는 참여자가 없습니다.</div>`;
 else{ const mx=bt[0].v||1;
  h+=`<div class="sub-t">학생 주저자 건수 상위 ${bt.length}명</div>`+
   bt.map(x=>`<div class="dl"><div class="n">${esc(x.n)}</div>
    <div class="bar"><i style="width:${(x.v/mx*100).toFixed(0)}%;background:var(--navy)"></i></div>
    <div class="v">${x.v}</div></div>`).join('');}
 const at=v.aTop||[];
 if(at.length){ const mx=at[0].v||1;
  h+=`<div class="sub-t">교수 대표논문 질 · 상위 3편 평균 인용</div>`+
   at.map(x=>`<div class="dl"><div class="n">${esc(x.n)}</div>
    <div class="bar"><i style="width:${(x.v/mx*100).toFixed(0)}%;background:#3e6e9e"></i></div>
    <div class="v">${N(x.v)}</div></div>`).join('');}
 h+=`<div class="d" style="margin:10px 0 0">개인 값은 학과 내부 관리용입니다. 순위표로 배포하지 않습니다.</div>`;
 return `<div class="dev">${h}</div>`;
}

/* 해시로 바로 들어오는 경로. explore 는 #field= 를 쓰기만 하고 되읽지 않아
   링크를 공유해도 첫 화면으로 떨어졌다. 들어올 때와 뒤로가기 때 모두 반영한다. */
function routeHash(){
 const m=(location.hash||'').match(/^#field=(.+)$/);
 if(m){
  const code=decodeURIComponent(m[1]);
  setView('exp');
  setTimeout(()=>{ try{ if(typeof xPick==='function'){ XSEL=null; xPick(code); } }catch(e){} }, 60);
  return true;
 }
 const v=(location.hash||'').replace(/^#/,'');
 if(v && document.getElementById('v-'+v)){ setView(v); return true; }
 return false;
}
addEventListener('hashchange',()=>{try{routeHash();}catch(e){}});
