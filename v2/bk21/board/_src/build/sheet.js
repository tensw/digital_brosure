/* ── 대학별 성과표 ── */
const SME='성균관대';
let SHSEL=null;
const shU=()=>UV.unis, shN=()=>UV.unis.length;
const SHMX={};
function shInit(){['works','period','cites','authors','h','c2','cpw','wpa','kci','kr']
 .forEach(k=>SHMX[k]=Math.max(...shU().map(u=>u[k])));}

function sheetBoard(){
 shInit();
 const M=UV.meta;
 let h=`<div class="ehead"><h2 id="shtitle" class="xclick" title="누르면 전체 목록으로 돌아갑니다">대학별 성과표</h2>
  <span class="n">7개교 · OpenAlex 실측 ${esc(M.measured)} · 국내는 KCI 논문 모음</span>
  <span class="pill off">원천 실측</span>
  <div class="ex">각 대학을 <b>규모 · 파급력 · 국내성과 · 측정한계</b> 네 칸으로 봅니다.
   모든 순위는 <b>이 7개교 안에서의 상대 순위</b>이고 전국·세계 순위가 아닙니다.
   없는 값은 추정해 채우지 않고 <b>미측정</b>으로 둡니다.</div></div>`;
 h+=`<div id="shwrap"></div>`;
 document.getElementById('v-sheet').innerHTML=h;
 document.getElementById('shtitle').onclick=()=>shBack();
 shView();
}
/* 목록 ↔ 학교 상세 */
function shOpen(nm){
 if(SHSEL===nm) return;
 SHSEL=nm;
 try{ history.pushState({sheet:nm},'', '#univ='+encodeURIComponent(nm)); }catch(_){}
 shView();
 const u=shU().find(x=>x.nm===nm); if(u) oaAuthors(u);
 toTop(true);
}
function shBack(push){
 if(!SHSEL) return;
 SHSEL=null;
 if(push!==false){ try{ history.pushState({sheet:null},'', location.pathname+location.search); }catch(_){} }
 shView();
 toTop(true);
}
addEventListener('popstate',ev=>{
 if(document.getElementById('v-sheet')?.classList.contains('hidden')) return;
 const nm=ev.state&&ev.state.sheet; SHSEL=nm||null; shView();
 if(SHSEL){const u=shU().find(x=>x.nm===SHSEL); if(u) oaAuthors(u);}
});
function shView(){
 const W=document.getElementById('shwrap'); if(!W) return;
 if(SHSEL){
  const u=shU().find(x=>x.nm===SHSEL);
  W.innerHTML=`<div class="fl" style="margin-bottom:2px"><button class="fbtn" id="shback">← 전체 7개교</button>
    ${shU().map(x=>`<button class="fbtn ${x.nm===SHSEL?'on':''} ${x.nm===SME?'meb':''}" data-sh="${esc(x.nm)}">${esc(x.nm)}</button>`).join('')}</div>
   ${shCard(u)}${oaPanel()}
   <div class="ecard"><h3>이 표의 근거</h3>${ins(`이 표의 숫자가 <b>어느 자료에서 왔는지</b>입니다. 다른 자료와 값이 다를 때 여기부터 맞춰 보십시오.`)}${ins(`이 표의 숫자가 <b>어느 자료에서 왔는지</b>입니다. 다른 자료와 값이 다를 때 여기부터 맞춰 보십시오.`)}<div class="d" id="shfoot"></div></div>`;
  document.getElementById('shback').onclick=()=>shBack();
  W.querySelectorAll('[data-sh]').forEach(b=>b.onclick=()=>shOpen(b.dataset.sh));
  oaInit(); shFoot(); return;
 }
 W.innerHTML=shRankBox()+shAG('asia')+shAG('world')
  +`<div class="d" style="margin:2px 0 8px">학교 이름을 누르면 그 학교만 펼치고 <b>피인용 상위 연구자 100명</b>까지 봅니다.</div>`
  +shU().slice().sort((a,b)=>a.scaleR-b.scaleR).map(shCard).join('')
  +`<div class="ecard"><h3>이 표의 근거</h3>${ins(`이 표의 숫자가 <b>어느 자료에서 왔는지</b>입니다. 다른 자료와 값이 다를 때 여기부터 맞춰 보십시오.`)}<div class="d" id="shfoot"></div></div>`
  +srcCard('sheet');
 W.querySelectorAll('[data-sh]').forEach(b=>b.onclick=()=>shOpen(b.dataset.sh));
 W.querySelectorAll('[data-ik]').forEach(th=>th.onclick=e=>{e.stopPropagation();
   shInfo(th.dataset.ik, th.closest('table').classList.contains('agx')
     ? (th.closest('.ecard').querySelector('h3').textContent.includes('아시아')?'asia':'world') : 'unis');});
 shFoot(); srcWire(W);
}

/* 종합 순위 = 규모 순위 + 파급력 순위의 합이 작은 순. 합이 같으면 공동 순위. */
function totBadge(list,u){
 return `<span class="totr ${u.totR===1?'g':u.totR<=3?'s':''}" title="종합점수 ${u.totS} (규모 ${u.scaleS} · 질 ${u.qualS})">
  ${u.totR}<em>위</em></span>`;
}
/* 규모·파급력 순위 비교 */
const SHCOL=[['works','논문','sc'],['period','20~25','sc'],['authors','연구자','sc'],['wpa','연구자당','sc'],
 ['c2','2년 피인용','im'],['cpw','논문당 인용','im'],['cites','누적 인용','im'],['h','h-index','im'],
 ['kci','KCI','dm'],['kr','KCI 비중','dm']];
function shRankBox(){
 const U=shU().slice().sort((a,b)=>a.totR-b.totR);
 const rc=r=>r===1?'r1':r===2?'r2':r>=shN()-1?'rl':'';
 return `<div class="ecard"><h3>국내 7개 대학 순위비교 <span class="pill in">규모 · 파급력 상세</span></h3>${ins(`같은 잣대로 <b>일곱 대학을 나란히</b> 놓은 표입니다. 우리 순위 자체보다 <b>어느 항목에서 밀리는가</b>를 보십시오. SGCPI+ 환산점수 칸은 성균관대만 채워집니다 — 다른 대학은 그 기준으로 계산할 자료가 우리에게 없습니다.`)}
  <div class="d">지표마다 7개교 중 몇 위인지입니다. <b>1위는 진한 색, 2위는 옅은 색, 하위 2개는 회색</b>입니다.
   왼쪽 파란 묶음이 <b>규모</b>, 가운데 초록이 <b>파급력</b>, 오른쪽 보라가 <b>국내</b>입니다.
   <b>규모와 파급력의 순위가 갈리는 학교</b>가 이 표의 요점입니다.</div>
  <div style="overflow:auto"><table class="mtx rkx">
  <colgroup><col style="width:7%"><col style="width:12%"><col style="width:7%"><col style="width:6%"><col style="width:6%">${SHCOL.map(()=>'<col style="width:6.2%">').join('')}</colgroup>
  <thead>
   <tr class="g"><th></th><th></th><th colspan="3" class="hgs">종합 순위 근거</th>
    <th colspan="4" class="hga">규모</th><th colspan="4" class="hgb">파급력</th><th colspan="2" class="hgd">국내</th></tr>
   <tr><th class="ih" data-ik="totR">종합<i>?</i></th><th class="l">학교</th>
    <th class="ih" data-ik="totS">점수<i>?</i></th>
    <th class="ih" data-ik="scaleR">규모<i>?</i></th><th class="ih" data-ik="qualR">질<i>?</i></th>
    ${SHCOL.map(([k,l])=>`<th class="ih" data-ik="${k}">${l}<i>?</i></th>`).join('')}</tr>
  </thead><tbody>
  ${U.map(u=>`<tr data-sh="${esc(u.nm)}" class="${u.nm===SME?'me':''}">
    <td>${totBadge(U,u)}</td>
    <td class="l"><span class="udot" style="background:${u.col}"></span><span class="dn">${esc(u.nm)}</span></td>
    <td><span class="sco">${u.totS}</span></td>
    <td><span class="rkb ${rc(u.scaleR)}">${u.scaleR}</span></td>
    <td><span class="rkb ${rc(u.qualR)} t-im">${u.qualR}</span></td>
    ${SHCOL.map(([k,l,t])=>`<td><span class="rkb ${rc(u.rk[k])} t-${t}">${u.rk[k]}</span></td>`).join('')}
   </tr>`).join('')}
  </tbody></table></div>
  <div class="d" style="margin:11px 0 0">${(()=>{const me=shU().find(u=>u.nm===SME);
    const q=shU().slice().sort((a,b)=>a.qualR-b.qualR);
    return `<b>종합 순위는 점수로 매깁니다</b> — 규모(논문·피인용)와 질(2년 피인용강도·논문당 피인용·h-index)을 각각 이 표 안 최고값 대비 100점으로 환산해 반반 평균한 값입니다.
     순위끼리 더하는 방식은 크기 차이를 지워 <b>3위와 1위가 같아지는 착시</b>가 생겨 쓰지 않습니다.
     <br><b>성균관대</b>는 종합 <b>${me.totR}위</b>(${me.totS}점) — 규모 ${me.scaleR}위(${me.scaleS}점)인데 <b>질은 ${me.qualR}위(${me.qualS}점)</b>입니다.
     질만 보면 ${esc(q[0].nm)}가 1위입니다.`;})()}</div></div>`;
}
const shRk=r=>r<=2?'top':r>=shN()-1?'bot':'';
function shMetric(u,k,l,fmt,tone){
 const v=u[k], r=u.rk[k];
 return `<div class="shm"><div class="l">${l}</div><div class="v">${fmt(v)}</div>
  <div class="b"><i style="width:${(v/SHMX[k]*100).toFixed(1)}%;background:var(--${tone})"></i></div>
  <div class="r ${shRk(r)}">${r}위 / ${shN()}</div></div>`;
}
const shLi=(t,v,r)=>`<li><span class="dot"></span><span class="t">${t}</span><span class="n">${v}</span><span class="rr">${r?r+'위':''}</span></li>`;
const shNa=(t,why)=>`<li class="na"><span class="dot"></span><span class="t">${t}</span><span class="n">미측정</span><span class="rr"></span></li>`;

function shCard(u){
 const me=u.nm===SME, n=shN();
 const gap = u.gap>=2 ? `<b>파급력이 규모보다 앞섭니다.</b> 규모 ${u.scaleR}위인데 파급력은 ${u.impactR}위입니다`
   : u.gap<=-2 ? `<b>규모가 파급력보다 앞섭니다.</b> 규모 ${u.scaleR}위인데 파급력은 ${u.impactR}위입니다`
   : `<b>규모와 파급력이 비슷한 자리입니다.</b> 규모 ${u.scaleR}위 · 파급력 ${u.impactR}위`;
 const dom = u.kr>=30 ? '국내 학술지 비중이 큽니다.' : u.kr<=10 ? '국제 학술지에 집중합니다.' : '국내와 국제가 섞여 있습니다.';
 const S=UV.meta.sk;
 return `<div class="uc ${me?'me':''}">
  <div class="uh"><h4 class="uclick" data-sh="${esc(u.nm)}" title="누르면 이 학교만 펼치고 상위 연구자를 봅니다">${esc(u.nm)}</h4><span class="oid">${esc(u.en||'')} · OpenAlex ${esc(u.oid||u.id||"")}</span>
   <span class="pos">규모 <b>${u.scaleR}위</b> · 파급력 <b>${u.impactR}위</b></span></div>
  <div class="lead">${gap}. ${dom}</div>
  <div class="shstrip">
   ${shMetric(u,'works','논문 (전체)',N,'sc')}${shMetric(u,'period','논문 20~25',N,'sc')}
   ${shMetric(u,'authors','판별 연구자',N,'sc')}${shMetric(u,'cites','누적 피인용',N,'im')}
   ${shMetric(u,'c2','2년 피인용강도',v=>v.toFixed(2),'im')}${shMetric(u,'cpw','논문당 피인용',v=>v.toFixed(1),'im')}
   ${shMetric(u,'kci','KCI 주도논문',N,'dm')}${shMetric(u,'kr','KCI 비중 %',v=>v.toFixed(1),'dm')}
  </div>
  <div class="quad">
   <div class="q sc"><span class="cap">규모</span><ul>
    ${shLi('논문 (전체)',N(u.works)+'편',u.rk.works)}
    ${shLi('논문 2020~2025',N(u.period)+'편',u.rk.period)}
    ${shLi('판별 연구자',N(u.authors)+'명',u.rk.authors)}
    ${shLi('연구자당 논문',u.wpa.toFixed(2)+'편',u.rk.wpa)}
   </ul><div class="note">연구자 수는 OpenAlex가 저자를 판별해 센 값이라 동명이인이 섞이지 않습니다.</div></div>

   <div class="q im"><span class="cap">파급력</span><ul>
    ${shLi('2년 피인용강도',u.c2.toFixed(2),u.rk.c2)}
    ${shLi('논문당 누적 피인용',u.cpw.toFixed(1)+'회',u.rk.cpw)}
    ${shLi('누적 피인용',N(u.cites)+'회',u.rk.cites)}
    ${shLi('h-index',N(u.h),u.rk.h)}
   </ul><div class="note">h-index는 오래되고 큰 학교가 자동으로 유리해 순위 근거로 쓰지 않습니다. 참고값입니다.</div></div>

   <div class="q dm"><span class="cap">국내</span><ul>
    ${shLi('KCI 주도논문',N(u.kci)+'편',u.rk.kci)}
    ${shLi('전체 논문 대비 비중',u.kr.toFixed(1)+'%',u.rk.kr)}
    ${shLi('논문 1편당 KCI 주도',(u.kci/u.works).toFixed(2)+'편',null)}
    ${shLi('국제 → 국내 순위',`${u.rk.works}위 → ${u.rk.kci}위${u.rk.kci===u.rk.works?' (유지)':u.rk.kci<u.rk.works?' (상승)':' (하락)'}`,null)}
   </ul><div class="note">KCI는 논문당 저자행이 대개 1개(주저자)라 그 학교가 <b>주도한</b> 국내 논문 수입니다. 공저 참여는 빠져 있습니다.</div></div>

   ${me
   ? `<div class="q lm"><span class="cap">내부 실측 (BIBLO Scholar)</span><ul>
      ${shLi('PP (top 10%)',S.pp10+'%',null)}
      ${shLi('FWCI 중앙값',S.fwMed.toFixed(2),null)}
      ${shLi('교수 대표논문 3편 FWCI',S.f3.toFixed(2),null)}
      ${shLi('JCR 상위 25% 논문',N(S.jcrQ1)+'편',null)}
     </ul><div class="note">BIBLO Scholar <code>dev.paper_citation_metric</code> + <code>paper_category</code>에서 BK 참여자 논문을 분야·연도 보정해 산출했습니다.
      FWCI 평균은 ${S.fwAvg}이지만 <b>중앙값은 ${S.fwMed}</b>입니다 — 소수 논문이 평균을 끌어올립니다.
      이 칸은 로스터가 있는 성균관대에서만 냅니다.</div></div>`
   : `<div class="q lm"><span class="cap">측정 한계</span><ul>
      ${shNa('PP (top 10%)')}${shNa('FWCI')}${shNa('국제공저율')}${shNa('학과별 비교')}
     </ul><div class="note">이 학교는 OpenAlex 기관 통계와 KCI 주도논문까지만 있습니다.
      분야 보정 지표와 학과 단위 비교는 논문 단위 원천이나 연구자 로스터가 있어야 냅니다. <b>없는 값을 추정해 채우지 않았습니다.</b></div></div>`}
  </div></div>`;
}
function shFoot(){
 const el=document.getElementById('shfoot'); if(!el) return;
 el.innerHTML=`<b>OpenAlex</b> · 기관 통계 <code>GET /institutions/{id}</code> · 기간 논문 <code>GET /works?filter=institutions.id,publication_year:2020-2025</code> ·
  연구자수 <code>GET /authors?filter=last_known_institutions.id</code>. 측정일 ${esc(UV.meta.measured)}.
  <br><b>KCI</b> · biblo_aws <code>paper.paper_author.affiliation_raw</code> 정규식 매칭. 주도논문 수이며 공저 참여는 미집계.
  <br><b>계산값</b> · 논문당 피인용 · 연구자당 논문 · KCI 비중은 위 실측치에서 계산했습니다.
  <b>규모 순위</b>는 논문·연구자 순위의 평균, <b>파급력 순위</b>는 2년 피인용강도·논문당 피인용 순위의 평균입니다.
  <br><b>순위의 범위</b> · 모든 순위는 이 7개교 안에서의 상대 순위입니다.`;
}


/* ── 아시아 · 글로벌 순위 비교 ── */
const AGCOL=[['works','논문'],['cites','누적 인용'],['c2','2년 피인용'],['cpw','논문당 인용'],['h','h-index']];
const AGDEF={asia:{t:'아시아 대학 순위비교',s:'아시아',
  d:'아시아 대학 <b>50곳</b>(누적 피인용 상위)에 <b>국내 7개교</b>를 더해 매긴 순위입니다.'},
 world:{t:'글로벌 대학 순위비교',s:'세계',
  d:'전 세계 대학 <b>110곳</b>(누적 피인용 상위)에 <b>국내 7개교</b>를 더해 매긴 순위입니다.'}};
function shAG(g){
 const L=(UV[g]||[]); if(!L.length) return '';
 const D=AGDEF[g], n=L.length;
 const rc=r=>r===1?'r1':r<=3?'r2':r>n-3?'rl':'';
 const S=L.slice().sort((a,b)=>a.totR-b.totR);
 const TOP=S.slice(0,20), inTop=new Set(TOP.map(u=>u.oid));
 const KR=S.filter(u=>u.kr&&!inTop.has(u.oid));     // 상위 20 밖의 국내 대학은 아래에 붙인다
 const U=TOP.concat(KR), cut=TOP.length;
 const me=L.find(u=>u.me)||{}, KA=S.filter(u=>u.kr);
 return `<div class="ecard"><h3>${D.t} <span class="pill off">OpenAlex 실측</span></h3>${ins(D.s==='세계'?`세계 상위권과 견줍니다. 격차가 큰 것은 당연하고, <b>어느 항목의 격차가 좁혀지고 있는지</b>를 보십시오.`:`아시아권과 견줍니다. <b>같은 지역·비슷한 규모</b>의 대학이라 우리 위치를 가늠하기에 국내 비교보다 낫습니다.`)}
  <div class="d">${D.d} 순위는 <b>이 ${n}곳 안에서만</b>의 상대 순위이고, 표에는 <b>상위 20곳</b>이 보입니다.
   20위 밖의 <b>국내 대학은 맨 아래에 함께</b> 붙였습니다. 지표 정의는 열 이름을 눌러 보십시오.</div>
  <div style="overflow:auto"><table class="mtx rkx agx">
  <colgroup><col style="width:7%"><col style="width:16%"><col style="width:5%"><col style="width:7%"><col style="width:6%"><col style="width:6%">${AGCOL.map(()=>'<col style="width:6.4%">').join('')}</colgroup>
  <thead>
   <tr class="g"><th></th><th></th><th></th><th colspan="3" class="hgs">종합 순위 근거</th>
    <th colspan="4" class="hga">규모</th><th colspan="4" class="hgb">파급력</th></tr>
   <tr><th class="ih" data-ik="totR">종합<i>?</i></th><th class="l">대학</th><th>국가</th>
    <th class="ih" data-ik="totS">점수<i>?</i></th>
    <th class="ih" data-ik="scaleR">규모<i>?</i></th><th class="ih" data-ik="qualR">질<i>?</i></th>
    ${AGCOL.map(([k,l])=>`<th class="ih" data-ik="${k}">${l}<i>?</i></th>`).join('')}</tr>
  </thead><tbody>
  ${U.map((u,i)=>`<tr class="${u.me?'me':u.kr?'krr':''} ${i===cut?'sep':''}">
    <td>${totBadge(U,u)}</td>
    <td class="l"><span class="udot" style="background:${u.col||(u.kr?'var(--navy)':'var(--c4)')}"></span><span class="dn" title="${esc(u.en||'')}">${esc(u.nm)}</span></td>
    <td><span class="cc">${esc(u.cc||'')}</span></td>
    <td><span class="sco">${u.totS}</span></td>
    <td><span class="rkb ${rc(u.scaleR)}">${u.scaleR}</span></td>
    <td><span class="rkb ${rc(u.qualR)} t-im">${u.qualR}</span></td>
    ${AGCOL.map(([k],i2)=>`<td><span class="rkb ${rc(u.rk[k])} ${i2>=2?'t-im':''}">${u.rk[k]}</span></td>`).join('')}
   </tr>`).join('')}
  </tbody></table></div>
  <div class="d" style="margin:11px 0 0"><b>국내 7개교</b>의 ${D.s} ${n}곳 안 종합 순위 —
   ${KA.map(u=>`${u.me?'<b>':''}${esc(u.nm)} ${u.totR}위${u.me?'</b>':''}`).join(' · ')}.
   <br><b>성균관대</b>는 종합 ${me.totR}위(${me.totS}점), 규모 ${me.scaleR}위, <b>질 ${me.qualR}위</b>로
   <b>질 순위가 규모 순위보다 ${me.scaleR-me.qualR}칸 앞섭니다.</b> 이 목록은 세계 최상위 대형 대학만 모은 것이라 규모에서 밀립니다.
   <br>2년 피인용강도가 중앙값의 4배를 넘는 대학은 OpenAlex 원천의 이상치로 보고 <b>그 값에서 잘라</b> 점수에 넣었습니다${(()=>{const c=L.filter(x=>x.c2capped);return c.length?` (${c.length}곳: ${c.slice(0,3).map(x=>esc(x.nm)).join(', ')})`:'';})()}.</div></div>`;
}

/* ── 지표 설명 팝업 ── */
const SHDEF={
 totR:{t:'종합 순위',w:'규모 점수와 질 점수를 반반 섞은 종합 점수의 순위',
  h:'각 지표를 <b>이 표 안 최고값 대비 100점</b>으로 환산합니다. 규모 = 논문·누적 피인용의 평균, 질 = 2년 피인용강도·논문당 피인용·h-index의 평균. 둘을 <b>50:50</b>으로 섞습니다.',
  c:'세계 대학 랭킹(QS·THE 등)이 아닙니다. 이 표의 대학들 안에서 이 지표들로만 매긴 내부 기준이고, 연구비·교육·평판은 들어 있지 않습니다. 순위끼리 더하는 방식은 크기 차이를 지워 쓰지 않습니다.',k:null,tot:1},
 totS:{t:'종합 점수',w:'규모 점수와 질 점수의 평균 (100점 만점)',
  h:'이 표 안 최고값을 100으로 놓고 환산한 뒤 규모·질을 반반 평균합니다.',
  c:'표가 바뀌면(국내 7곳 / 아시아 52곳 / 글로벌 116곳) 기준 최고값이 바뀌어 점수도 달라집니다.',k:'totS',f:v=>v+'점'},
 qualR:{t:'질 (순위)',w:'2년 피인용강도 · 논문당 피인용 · h-index를 평균한 점수의 순위',
  h:'세 지표를 각각 100점 환산해 평균합니다.',
  c:'논문 한 편이 얼마나 읽히는지입니다. 학교 크기와 무관합니다.',k:'qualS',f:v=>v+'점'},

 scaleR:{t:'규모 (순위)',w:'논문 수와 누적 피인용을 평균한 점수의 순위',
  h:'두 지표를 각각 이 표 안 최고값 대비 100점으로 환산해 평균합니다.',
  c:'생산량의 크기만 봅니다. 질은 들어 있지 않습니다.',k:'scaleS',f:v=>v+'점'},
 works:{t:'논문 (전체)',w:'그 기관 소속으로 OpenAlex에 잡힌 논문 총수',
  h:'OpenAlex 기관 통계의 works_count. 연도 제한 없이 전 기간입니다.',
  c:'오래된 학교가 유리합니다. 최근 실적은 20~25 칸으로 보십시오.',k:'works',f:v=>N(v)+'편'},
 period:{t:'논문 2020~2025',w:'BK21 4단계 기간의 논문 수',
  h:'OpenAlex works 검색에 publication_year:2020-2025 조건을 걸어 센 값입니다.',
  c:'최근 연도는 색인이 계속 붙어 나중에 올라갑니다.',k:'period',f:v=>N(v)+'편'},
 authors:{t:'판별 연구자',w:'그 기관을 마지막 소속으로 둔 연구자 수',
  h:'OpenAlex authors 검색의 last_known_institutions 조건. 저자를 판별한 뒤 센 값이라 동명이인이 섞이지 않습니다.',
  c:'현직 전임교원 명단이 아닙니다. 겸직·방문·졸업생·이직 이력이 모두 들어갑니다.',k:'authors',f:v=>N(v)+'명'},
 wpa:{t:'연구자당 논문',w:'논문 수 ÷ 판별 연구자 수',
  h:'위 두 값을 나눈 계산값입니다.',
  c:'연구자 판별 기준이 넓어 분모가 커지므로 절대값보다 학교 간 비교로 보십시오.',k:'wpa',f:v=>v.toFixed(2)+'편'},
 c2:{t:'2년 피인용강도',w:'최근 2년 논문이 평균 몇 번 인용됐는가',
  h:'OpenAlex 기관 통계의 2yr_mean_citedness.',
  c:'규모와 무관한 최근 파급력입니다. 이 표에서 질을 대표하는 값입니다.',k:'c2',f:v=>v.toFixed(2)},
 cpw:{t:'논문당 누적 피인용',w:'누적 피인용 ÷ 전체 논문 수',
  h:'두 실측값을 나눈 계산값입니다.',
  c:'전 기간 누적이라 오래된 논문이 많은 학교가 유리합니다.',k:'cpw',f:v=>v.toFixed(1)+'회'},
 cites:{t:'누적 피인용',w:'그 기관 논문이 지금까지 받은 인용 총합',
  h:'OpenAlex 기관 통계의 cited_by_count.',
  c:'규모 지표에 가깝습니다. 논문이 많으면 자동으로 커집니다.',k:'cites',f:v=>N(v)+'회'},
 h:{t:'h-index',w:'h편 이상의 논문이 각각 h회 이상 인용된 상태',
  h:'OpenAlex 기관 통계의 summary_stats.h_index.',
  c:'오래되고 큰 학교가 자동으로 유리합니다. 순위 근거로 쓰지 않고 참고값으로만 둡니다.',k:'h',f:v=>N(v)},
 kci:{t:'KCI 주도논문',w:'그 학교가 주도한 국내 등재지 논문 수',
  h:'biblo_aws 논문 모음의 KCI 논문에서 저자 소속 표기를 정규식으로 매칭했습니다.',
  c:'KCI는 논문당 저자행이 대개 1개(주저자)라 공저 참여는 빠져 있습니다.',k:'kci',f:v=>N(v)+'편'},
 kr:{t:'KCI 비중',w:'KCI 주도논문 ÷ 전체 논문 × 100',
  h:'두 값을 나눈 계산값입니다.',
  c:'국내 학술지 중심인지 국제 학술지 중심인지를 봅니다. 높다·낮다가 우열이 아닙니다.',k:'kr',f:v=>v.toFixed(1)+'%'}};

const AGNM={asia:'아시아',world:'글로벌'};
/* 팝업 목록: 국내 7곳은 전부, 아시아·글로벌은 상위 12곳 + 국내 7개교만 (순위 번호는 원래 자리를 유지) */
const RANKOF={totS:'totR',qualS:'qualR',scaleS:'scaleR'};
function shRankOf(u,k,i){ const r=(u.rk||{})[k]; return r!=null?r:(RANKOF[k]&&u[RANKOF[k]]!=null?u[RANKOF[k]]:i+1); }
function shPick(sorted,grp,k){
 const R=sorted.map((u,i)=>[u,k?shRankOf(u,k,i):i+1]);
 if(!AGNM[grp]) return {L:R,lab:`국내 ${sorted.length}개교 값`};
 return {L:R.filter(([u],i)=>i<12||u.kr),
         lab:`${AGNM[grp]} ${sorted.length}곳 중 상위 12곳 + 국내 7개교`};
}
function isSK(u){ return !!(u.me||u.nm===SME); }
function shBarCol(u){ return u.col || (isSK(u)?'var(--accent)':u.kr?'var(--navy)':'var(--c3)'); }
function shInfo(key,grp){
 const d=SHDEF[key]; if(!d) return;
 const U=(grp&&UV[grp])?UV[grp]:shU();
 let rows='';
 if(d.k){
  const s=U.slice().sort((a,b)=>b[d.k]-a[d.k]), mx=s[0][d.k], P=shPick(s,grp,d.k);
  rows=`<div class="sub-t">${P.lab}</div><div class="dev">${P.L.map(([u,r],i)=>
   `<div class="dl ${isSK(u)?'me':''} ${i===12?'gapx':''}"><div class="n" title="${esc(u.en||u.nm)}">${r}. ${esc(u.nm)}</div>
    <div class="bar"><i style="width:${(u[d.k]/mx*100).toFixed(0)}%;background:${shBarCol(u)}"></i></div>
    <div class="v">${d.f(u[d.k])}</div></div>`).join('')}</div>`;
 }else{
  const n=U.length, s=U.slice().sort((a,b)=>a[key]-b[key]), P=shPick(s,grp);
  rows=`<div class="sub-t">${grp?P.lab:n+'곳 순위'}</div><div class="dev">${P.L.map(([u,_],i)=>
   `<div class="dl ${isSK(u)?'me':''} ${i===12?'gapx':''}"><div class="n" title="${esc(u.en||u.nm)}">${esc(u.nm)}</div>
    <div class="bar"><i style="width:${(((n+1)-u[key])/n*100).toFixed(0)}%;background:${shBarCol(u)}"></i></div>
    <div class="v">${u[key]}위</div></div>`).join('')}</div>`;
 }
 const el=document.getElementById('shmodal');
 el.innerHTML=`<div class="mbox"><button class="mx" data-mclose="1" aria-label="닫기">×</button>
  <h4>${esc(d.t)}</h4><p class="what">${d.w}</p>
  <div class="mrow"><b>어떻게 구했나</b><span>${d.h}</span></div>
  <div class="mrow warn"><b>읽을 때 주의</b><span>${d.c}</span></div>
  ${rows}</div>`;
 el.classList.add('on');
 el.onclick=e=>{if(e.target===el||e.target.closest('[data-mclose]')) shInfoClose();};
 document.addEventListener('keydown',shEsc);
}
function shEsc(e){ if(e.key==='Escape') shInfoClose(); }
function shInfoClose(){
 const el=document.getElementById('shmodal'); if(!el) return;
 el.classList.remove('on'); el.innerHTML='';
 document.removeEventListener('keydown',shEsc);
}
