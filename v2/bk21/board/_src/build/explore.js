/* ── 분야 공저자 탐색 ── */
/* 목록 ↔ 상세 이동 — 타이틀 클릭 · 좌측 메뉴 재클릭 · 브라우저 뒤로가기 모두 목록으로 */
function xPick(code){
 if(XSEL===code) return;
 XSEL=code;
 try{ history.pushState({exp:code},'', '#field='+encodeURIComponent(code)); }catch(_){}
 xBody(); wcLoad(code);
 document.getElementById('xbody')?.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function xBack(push){
 if(!XSEL) return;
 XSEL=null;
 if(push!==false){ try{ history.pushState({exp:null},'', location.pathname+location.search); }catch(_){} }
 xBody();
 toTop(true);
}
function xReset(){ XSEL=null; XGSEL='all'; XNEW=false; XLOC='all'; XALL=false;
 const i=document.getElementById('xq'); if(i){i.value='';XQ='';}
 xFilters(); xBody(); toTop(true); }
addEventListener('popstate',ev=>{
 if(document.getElementById('v-exp')?.classList.contains('hidden')) return;
 const c=ev.state&&ev.state.exp;
 XSEL=c||null; xBody(); if(c) wcLoad(c);
});

/* 대분야 그룹 — WoS 분야명을 사람이 훑을 수 있는 갈래로 묶는다 */
const XG=[['재료','#5b7cb8','Materials|Nanoscience|Nanotechnolog'],
 ['물리·광학','#3b82f6','Physics|Astronomy|Optics|Acoustics|Thermodynamics|Mechanics|Nuclear Science|Spectroscopy|Quantum|Microscopy'],
 ['화학·소재','#0ea5b7','Chemistry|Electrochem|Polymer|Crystallograph'],
 ['공학','#6366f1','Engineering|Robotics|Automation|Construction|Transportation|Metallurgy|Instruments|Energy|Mining|Remote Sensing|Water Resources'],
 ['컴퓨터·수리','#8b5cf6','Computer|Information Sys|Telecommunication|Imaging Science|Medical Informatics|Statistics|Mathemat|Logic|Operations Research'],
 ['의학·보건','#0f9c6d','Onco|Surg|Neurolog|Cardi|Radiolog|Patholog|Anesthes|Pediatr|Ophthal|Dermat|Urolog|Respiratory|Transplant|Critical|Rheumat|Orthoped|Obstetric|Hematolog|Gastro|Endocrin|Peripheral|Allerg|Rehabilit|Integrative|Psychiatry|Nursing|Medicine|Medical|Clinical|Emergency|Andrology|Audiolog|Tropical|Substance|Sport Sci|Geriatr|Gerontology|Primary Health|Health Care|Health Policy|Public, Env|Dentistry|Otorhino|Infectious|Virolog|Parasitolog|Immunolog|Microbiolog|Toxicolog|Nutrition|Physiolog|Anatom|Neuroimaging|Behavioral'],
 ['생명','#22a06b','Bio|Cell|Genet|Neuroscience|Plant|Zoo|Marine|Evolution|Food|Ecolog|Entomolog|Fisher|Forestry|Agron|Horticult|Veterin|Ornithol|Mycolog|Reproductive|Agriculture'],
 ['약학','#14b8a6','Pharmac'],
 ['환경·지구','#84a98c','Environmental|Green & Sustain|Geoscience|Meteorolog|Oceanograph|Geograph|Geolog'],
 ['인문사회·경영','#7c3aed','Econ|Business|Management|Finance|Public Admin|Social|Psycholog|Education|Communication|Information Science|Asian|History|Philosoph|Religion|Family|Regional|Hospitality|Ergonom|Law|Political|Sociolog|Anthropolog|Area Studies|Cultural|Literature|Linguist|Art|Music|Architect|Urban|Demograph|Ethics|Women|Industrial Relations|Criminolog|International Relations|Development Studies|Film|Humanities']];
function xGroup(code){ for(const [ko,,re] of XG) if(new RegExp(re,'i').test(code)) return ko; return '그 밖의 분야'; }
const XGC=Object.fromEntries(XG.map(([ko,c])=>[ko,c])); XGC['그 밖의 분야']='var(--c4)';
let XSORT='rel', XGSEL='all';

let XQ='', XSEL=null, XDEPT='', XNEW=false, XLOC='all', XALL=false;
/* 자주 찾는 주제어 — 분야명을 몰라도 여기서 시작한다 */
const XCHIP=['암','이차전지','반도체','나노','인공지능','로봇','치매','고분자','면역','신약','에너지','바이오소재'];
const xLabel=f=>(typeof FAI!=='undefined'&&FAI.map&&FAI.map[f.code]&&FAI.map[f.code].ko)||f.ko||f.code;
const xNew=x=>XDEPT ? !(x.with_||[]).includes(XDEPT) : !(x.with_||[]).length;
const xHue=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))%360;return h;};
const xAv=(n,c)=>`<span class="xav" style="background:${c||`hsl(${xHue(n||'?')} 52% 88%)`};color:${c?'#fff':`hsl(${xHue(n||'?')} 60% 30%)`}">${esc((n||'?').replace(/^[^가-힣A-Za-z]*/,'').slice(0,2))}</span>`;
/* 분야 매칭 — biblo_aws 분해 원칙: 정확 매칭이 바닥, 동의어 확장은 그 위에 얹는 보조.
   사전은 Gemini(gemini-2.5-flash)로 미리 만들어 캐시했다(FAI). 화면에서는 사전만 본다. */
const FA=(typeof FAI!=='undefined'&&FAI.map)?FAI.map:{};
const TM=(typeof TMAP!=='undefined'&&TMAP.map)?TMAP.map:{};
/* 주제어 → 분야 (Gemini가 짚은 매핑). 질의가 주제어면 그 분야를 최우선으로 올린다. */
function tmHit(s){
 const out={};
 for(const t in TM){
  const hit = t===s ? 3 : (t.includes(s)||s.includes(t)) ? 2 : 0;
  if(!hit) continue;
  TM[t].forEach((c,i)=>{const v=hit*70 - i*6; if(!out[c]||out[c]<v) out[c]=v;});
 }
 return out;
}
function xScore(f,s){
 if(!s) return 1;
 const a=FA[f.code]||{}, code=f.code.toLowerCase(), ko=(a.ko||f.ko||'');
 // ① 정확 매칭 (이름·소속 열쇠)
 if(ko===s||code===s) return 100;
 if(ko.includes(s)||code.includes(s)) return 60;
 // ② 동의어 확장 (보조)
 for(const w of (a.syn||[])){ if(w===s) return 40; if(w.includes(s)||s.includes(w)) return 30; }
 for(const w of (a.kw||[])){ if(w===s) return 22; if(w.includes(s)||s.includes(w)) return 16; }
 // ③ 여러 낱말 질의 — 하나라도 걸리면 약하게
 const parts=s.split(/[\s,·]+/).filter(x=>x.length>1);
 if(parts.length>1){
  let h=0; for(const p of parts){
   if(ko.includes(p)||code.includes(p)) h+=8;
   else if((a.syn||[]).some(w=>w.includes(p)||p.includes(w))) h+=5;
   else if((a.kw||[]).some(w=>w.includes(p)||p.includes(w))) h+=3;}
  return h;
 }
 return 0;
}
function xHits(){
 const s=XQ.trim().toLowerCase();
 if(!s) return EX.fields.map(f=>({f,sc:1}));
 const tm=tmHit(s);
 return EX.fields.map(f=>({f,sc:Math.max(xScore(f,s), tm[f.code]||0)}))
   .filter(x=>x.sc>0).sort((a,b)=>b.sc-a.sc||b.f.papers-a.f.papers);
}
function xWhy(f,s){
 if(!s) return '';
 const a=FA[f.code]||{}, ko=(a.ko||f.ko||''), code=f.code.toLowerCase();
 if(ko.includes(s)||code.includes(s)) return '';
 for(const t in TM){ if((t===s||t.includes(s)||s.includes(t)) && TM[t].includes(f.code)) return `주제어 ${t}`; }
 const m=(a.syn||[]).find(w=>w.includes(s)||s.includes(w))||(a.kw||[]).find(w=>w.includes(s)||s.includes(w));
 return m?`확장어 ${m}`:'';
}
const xLabelKo=f=>(FA[f.code]&&FA[f.code].ko)||f.ko||f.code;

function exploreBoard(){
 const S=EX.summary;
 let h=`<div class="ehead"><h2 id="xtitle" class="xclick" title="누르면 분야 목록으로 돌아갑니다">글로벌 분야 공저자 탐색</h2>
  <span class="n">WoS 분야 ${N(S.fields)}개 · 교내 연구자 ${N(S.skku_total)}명 · 교외 공저자 ${N(S.ext_total)}명 · 관계망 ${N(S.edges)} 연결선</span>
  <span class="pill off">원천 실측</span>
  <div class="ex">분야를 고르면 <b>교내 공저자</b>, <b>교외 공저자</b>, <b>세계 공저자 후보</b> 세 갈래가 함께 나옵니다.
   세계 공저자 후보는 우리와의 접점과 무관하게 <b>그 분야 주제를 연구하는 세계 연구자</b>를 OpenAlex에서 그 자리에서 받아 옵니다.
   <b>기준 학과</b>를 고르면 그 학과가 아직 함께 쓰지 않은 상대에 <b>신규</b> 표시가 붙습니다.
   <br><b>검색</b> · 분야명이 아닌 일상어로 쳐도 찾습니다. 분야마다 한국어 동의어·연구주제어를 미리 붙여 뒀습니다
   (<code>${esc((typeof FAI!=='undefined'&&FAI.meta&&FAI.meta.model)||'gemini')}</code>로 생성, ${N((typeof FAI!=='undefined'&&FAI.meta&&FAI.meta.fields)||0)}개 분야).
   정확히 맞는 분야를 먼저 올리고, 동의어로 걸린 분야는 <u>확장어</u>를 함께 표시합니다.</div></div>`;

 h+=`<div class="kpis">
  <div class="kpi" style="--c:var(--navy)"><div class="lb">WoS 분야</div><div class="vl" id="xkf">${N(S.fields)}</div><div class="dt">한글명 ${N(S.ko_matched)}개 대응 · 논문 ${N(S.papers)}편</div></div>
  <div class="kpi" style="--c:#3b82f6"><div class="lb">교내 연구자</div><div class="vl">${N(S.skku_total)}<small>명</small></div><div class="dt">분야 프로필 보유 · 사번 확정</div></div>
  <div class="kpi" style="--c:#0f9c6d"><div class="lb">교외 공저자</div><div class="vl">${N(S.ext_total)}<small>명</small></div><div class="dt">우리 논문에 함께 이름 올린 교외 연구자</div></div>
  <div class="kpi" style="--c:#f5a623"><div class="lb">BK21과 기존 공저</div><div class="vl">${N(S.already)}<small>명</small></div><div class="dt">나머지 ${N(S.ext_total-S.already)}명이 신규 후보</div></div>
 </div>`;

 h+=`<div class="ecard"><h3>분야 선택</h3>${ins(`주제를 골라 <b>그 분야에서 누가 일하는지</b> 찾습니다. 새 과제를 짤 때 사람을 모으는 자리입니다.`)}
  <div class="srch"><input id="xq" type="search" placeholder="찾는 분야를 한국어로 치세요 — 암, 이차전지, 반도체, 나노, 로봇, 치매 …" autocomplete="off">
   <div class="fl" id="xfl"></div></div>
  <div id="xbody"></div></div>`;

 h+=lvCard();
 h+=srcCard('exp');
 document.getElementById('v-exp').innerHTML=h;
 xFilters(); xBody(); lvInit(); srcWire(document.getElementById('v-exp'));
 document.getElementById('xtitle').onclick=()=>xBack();
 const i=document.getElementById('xq');
 let t; i.oninput=()=>{clearTimeout(t);t=setTimeout(()=>{XQ=i.value;XSEL=null;XGSEL='all';XALL=false;xBody();},160);};
}
function xFilters(){
 const F=document.getElementById('xfl'); if(!F) return;
 F.innerHTML=`<select class="rsel" id="xd"><option value="">기준 학과 (선택 안 함)</option>${
   EX.depts.map(d=>`<option value="${esc(d)}" ${XDEPT===d?'selected':''}>${esc(d)} 기준</option>`).join('')}</select>
  <button class="fbtn ${XNEW?'on':''}" data-xnew="1">신규 후보만</button>
  <span class="flab">소속</span>
  ${[['all','전체'],['intl','해외'],['kr','국내']].map(([k,l])=>`<button class="fbtn ${XLOC===k?'on':''}" data-xloc="${k}">${l}</button>`).join('')}`;
 const s=document.getElementById('xd'); if(s) s.onchange=()=>{XDEPT=s.value;xFilters();xBody();};
 F.querySelector('[data-xnew]').onclick=()=>{XNEW=!XNEW;xFilters();xBody();};
 F.querySelectorAll('[data-xloc]').forEach(b=>b.onclick=()=>{XLOC=b.dataset.xloc;xFilters();xBody();});
}
function xBody(){
 const B=document.getElementById('xbody'); if(!B) return;
 if(!XSEL){
  const S0=XQ.trim().toLowerCase();
  const scored=xHits(); const hit=scored.map(x=>x.f);
  document.getElementById('xkf').textContent=N(hit.length);
  const wireChips=()=>B.querySelectorAll('[data-xq]').forEach(el=>el.onclick=()=>{
    const i=document.getElementById('xq'); i.value=el.dataset.xq; XQ=el.dataset.xq; XSEL=null; XGSEL='all'; xBody();});
  if(!hit.length){B.innerHTML=`<div class="empty" style="padding:26px">"${esc(XQ)}"로는 분야를 찾지 못했습니다.<div class="chips" style="margin-top:12px;justify-content:center">${['암','이차전지','반도체','나노','로봇','치매','고분자','인공지능'].map(t=>`<button class="chip" data-xq="${t}">${t}</button>`).join('')}</div></div>`;wireChips();return;}
  const cnt={}; hit.forEach(f=>{const g=xGroup(f.code);cnt[g]=(cnt[g]||0)+1;});
  const order=XG.map(x=>x[0]).concat('그 밖의 분야').filter(g=>cnt[g]);
  const rel={}; scored.forEach((x,i)=>rel[x.f.code]=i);
  const sortKey=(S0&&XSORT==='rel')?'rel':(XSORT==='rel'?'papers':XSORT);
  let fs=hit.filter(f=>XGSEL==='all'||xGroup(f.code)===XGSEL)
    .sort((a,b)=>sortKey==='rel'?rel[a.code]-rel[b.code]
      :sortKey==='papers'?b.papers-a.papers:sortKey==='skku'?b.skku-a.skku:b.ext-a.ext);
  const lean=!S0&&XGSEL==='all'&&!XALL;      // 검색 전에는 논문 많은 분야만 보여 준다
  const total=fs.length; if(lean) fs=fs.slice(0,10);
  const barKey=(sortKey==='rel')?'papers':sortKey;
  const mx=Math.max(...fs.map(f=>f[barKey]),1);
  const lab={rel:'관련도',papers:'논문',skku:'교내 연구자',ext:'교외 공저자'};
  B.innerHTML=`${lean?`<div class="xstart">
    <div class="t">찾는 분야를 <b>한국어로</b> 치십시오</div>
    <div class="s">분야명이 아니어도 됩니다. 자주 찾는 주제어로 시작해 보십시오.</div>
    <div class="chips">${XCHIP.map(t=>`<button class="chip" data-xq="${t}">${esc(t)}</button>`).join('')}</div>
   </div>`:''}<div class="xbar">
    <div class="xgs"><button class="xg ${XGSEL==='all'?'on':''}" data-xg="all">전체 <em>${N(hit.length)}</em></button>${
     order.map(g=>`<button class="xg ${XGSEL===g?'on':''}" data-xg="${esc(g)}" style="--gc:${XGC[g]}"><i></i>${esc(g)} <em>${cnt[g]}</em></button>`).join('')}</div>
    <div class="xsort"><span>정렬</span>${(S0?['rel','papers','skku','ext']:['papers','skku','ext']).map(k=>
      `<button class="fbtn ${sortKey===k?'on':''}" data-xs="${k}">${lab[k]}</button>`).join('')}</div></div>
   <div class="flist">${fs.map((f,i)=>{const g=xGroup(f.code),c=XGC[g];
     return `<button class="frow" data-xf="${esc(f.code)}" style="--gc:${c}">
      <span class="rk">${i+1}</span>
      <span class="nm"><b>${esc(xLabel(f))}</b><em>${esc(f.code)}${(()=>{const w=xWhy(f,S0);return w?` · <u>${esc(w)}</u>`:'';})()}</em></span>
      <span class="gtag" style="background:${c}">${esc(g)}</span>
      <span class="bar"><i style="width:${(f[barKey]/mx*100).toFixed(1)}%;background:${c}"></i></span>
      <span class="mt"><b>${N(f.papers)}</b><em>논문</em></span>
      <span class="mt"><b>${N(f.skku)}</b><em>교내</em></span>
      <span class="mt"><b>${N(f.ext)}</b><em>교외</em></span>
      <span class="go">›</span></button>`;}).join('')}</div>
   ${lean?`<div class="xmore"><button class="fbtn" data-xall="1">전체 ${N(total)}개 분야 보기</button>
     <span>지금은 논문이 많은 <b>10개</b>만 보입니다.</span></div>`:''}
   <div class="d" style="margin:11px 0 0">${S0?`<b>${esc(XQ)}</b>로 ${N(hit.length)}개 분야가 걸렸습니다. `:''}막대는 <b>${lab[barKey]}</b> 기준입니다. 줄을 누르면 그 분야의 <b>교내 공저자 · 교외 공저자 · 세계 공저자 후보</b>가 나옵니다.</div>`;
  wireChips();
  B.querySelector('[data-xall]')?.addEventListener('click',()=>{XALL=true;xBody();});
  B.querySelectorAll('[data-xg]').forEach(el=>el.onclick=()=>{XGSEL=el.dataset.xg;xBody();});
  B.querySelectorAll('[data-xs]').forEach(el=>el.onclick=()=>{XSORT=el.dataset.xs;xBody();});
  B.querySelectorAll('[data-xf]').forEach(el=>el.onclick=()=>xPick(el.dataset.xf));
  return;
 }
 const f=EX.fields.find(x=>x.code===XSEL);
 let I=(f.I||[]).slice(), E=(f.E||[]).slice();
 if(XLOC!=='all') E=E.filter(x=>x.loc===XLOC);
 if(XNEW){I=I.filter(xNew);E=E.filter(xNew);}
 const badge=x=>`<span class="xb ${xNew(x)?'nw':'od'}">${xNew(x)?'신규':'기존 공저'}</span>`;
 B.innerHTML=`<div class="xhead"><b>${esc(xLabel(f))}</b>${f.ko?`<span class="xcode">${esc(f.code)}</span>`:''}
   <span>논문 ${N(f.papers)}편 · 교내 ${N(f.skku)}명 · 교외 ${N(f.ext)}명</span>
   <button class="fbtn" data-xback="1" style="margin-left:auto">← 분야 목록</button></div>
  ${XDEPT?`<div class="xhint">기준 <b>${esc(XDEPT)}</b> — 이 학과가 아직 함께 쓰지 않은 상대를 <span class="xb nw">신규</span>로 표시합니다.</div>`:''}
  ${wcPanel(f.code)}
  <div class="erow e2" style="margin-top:12px">
   <div class="xpanel"><div class="xph"><h4>교내 공저자</h4><span>${I.length}명 · 이 분야 논문 많은 순</span></div>
    <div class="xlst">${I.length?I.map((x,i)=>`<div class="xrow">
      <div class="xrk">${i+1}</div>${xAv(x.n)}
      <div class="xwho"><div class="n"><button class="prn" data-pin="${esc(x.id)}">${esc(x.n||x.id)}</button>${badge(x)}</div>
       <div class="m">${esc(x.d||'소속 미상')}${x.p?' · '+esc(x.p):''}${(x.with_||[]).length?' · 공저 '+x.with_.length+'개 학과':''}</div></div>
      <div class="xmets"><div><b>${N(x.f)}</b><span>이 분야</span></div><div><b>${N(x.t)}</b><span>총 논문</span></div>
       <div><b>${N(x.c)}</b><span>인용</span></div><div><b>${x.w??'—'}</b><span>FWCI</span></div></div></div>`).join('')
      :'<div class="empty" style="padding:18px">조건에 맞는 교내 연구자가 없습니다.</div>'}</div>
    <div class="d" style="margin:9px 0 0">교내 연구자는 사번 기준이라 동명이인 문제가 없습니다. FWCI 1.0이 세계평균입니다.</div></div>
   <div class="xpanel"><div class="xph"><h4>교외 공저자</h4><span>${E.length}명 · <b>기준</b> 이 분야에서 우리 논문에 함께 이름 올린 교외 연구자</span></div>
    <div class="xlst">${E.length?E.map((x,i)=>`<div class="xrow">
      <div class="xrk">${i+1}</div>${xAv(x.n, x.loc==='intl'?'#3b82f6':'#0f9c6d')}
      <div class="xwho"><div class="n"><button class="prn" data-pex="${esc(x.a)}">${esc(x.n)}</button><span class="xb ${x.loc==='intl'?'il':'kr'}">${x.loc==='intl'?'해외':'국내'}</span>${badge(x)}${x.orc?'<span class="xb id">ORCID</span>':''}${x.sid?'<span class="xb id">Scopus</span>':''}</div>
       <div class="m">${esc(x.o||'소속 미상')}${(x.with_||[]).length?' · 공저 '+x.with_.length+'개 학과':''}</div></div>
      <div class="xmets"><div><b>${N(x.f)}</b><span>이 분야</span></div><div><b>${N(x.t)}</b><span>공저</span></div>
       <div><b>${N(x.c)}</b><span>인용</span></div></div></div>`).join('')
      :'<div class="empty" style="padding:18px">조건에 맞는 후보가 없습니다.</div>'}</div>
    <div class="d" style="margin:9px 0 0"><b>이 명단의 기준</b> · 우리 논문에 함께 이름을 올린 사람만 나옵니다. 그래서 <b>전부 이미 접점이 있는 사람</b>이고, 접점이 아예 없는 세계 연구자는 없습니다.
     <b>공저</b>는 우리와 함께 쓴 편수이지 그 사람의 전체 실적이 아닙니다. <b>신규</b>는 <b>기준 학과</b>와 아직 안 썼다는 뜻이지 성균관대와 처음이라는 뜻이 아닙니다.</div></div></div>
  <div class="xfoot"><b>이 추천이 어떻게 나오나</b>
   분야는 <b>WoS 분류 ${N(EX.summary.fields)}개</b>입니다. 논문마다 붙은 분류를 연구자로 올려 <b>연구자 × 분야</b> 프로필을 만들고, 그 분야 논문이 많은 순으로 세웁니다.
   교내는 사번이 확정된 성균관대 연구자 ${N(EX.summary.skku_total)}명, 교외는 우리 논문에 함께 이름을 올린 연구자 ${N(EX.summary.ext_total)}명에서 뽑습니다.
   이미 접점이 있는 사람들이라 아무 관계 없는 명단보다 실제로 연락이 닿을 가능성이 높습니다.
   <br><b>세계 공저자 후보</b> · WoS 분야를 OpenAlex 주제(4,516개)에 대응시킨 색인을 빌드 때 만들어 실었습니다.
   화면에서는 그 주제 ID로 OpenAlex를 한 번 호출해 저자를 받습니다. 우리 논문에 이름이 있는지와 무관하므로 <b>한 번도 접점이 없던 연구자</b>가 나옵니다.
   주제 대응은 분야마다 <code>${esc((typeof FT!=='undefined'&&FT.meta&&FT.meta.model)||'gemini')}</code>가 후보 주제 중에서 골랐습니다.
   외부 연구자는 사번이 없어 이름·소속 이름·소속 열쇠로 묶어, 흔한 이름은 섞일 수 있습니다. 이니셜만 있는 이름은 후보에서 뺐습니다.
   국내·해외는 국적 정보가 원천에 없어 <b>소속기관 표기로 추정</b>했습니다.</div>`;
 B.querySelector('[data-xback]').onclick=()=>xBack();
 B.querySelectorAll('[data-pin]').forEach(b=>b.onclick=()=>{const x=(f.I||[]).find(y=>y.id===b.dataset.pin); if(!x) return;
  prOpen({kind:'in',key:'s'+x.id,name:x.n||x.id,en:(CT['s'+x.id]||{}).en,dept:x.d,job:x.p,
   f:x.f,t:x.t,c:x.c,w:x.w,sid:0,with_:x.with_||[],active:(CT['s'+x.id]||{}).a===1?1:0});});
 B.querySelectorAll('[data-pex]').forEach(b=>b.onclick=()=>{const x=(f.E||[]).find(y=>y.a===b.dataset.pex); if(!x) return;
  prOpen({kind:'ext',key:'x'+x.a,name:x.n,aff:x.o,cc:x.loc==='intl'?'':'KR',
   f:x.f,t:x.t,c:x.c,sid:x.sid});});
 wcRender();
}
