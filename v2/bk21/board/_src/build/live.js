/* ── BIBLO 논문 검색엔진 연결 ──
   biblo_aws의 정본 검색 함수 search_papers_exact / search_papers_count 를 그대로 호출한다.
   이 함수들은 SECURITY DEFINER + anon 실행 허용으로 이미 공개된 것이라 공개키만 쓴다(비밀키 없음). */
const BB={url:'https://zghartrwhjfqydlbhigs.supabase.co',
 key:'sb_publishable_jQss-PJslDLf3vQtkyS7Tw_urBy3qTy'};
async function bbRpc(fn,body){
 const r=await fetch(`${BB.url}/rest/v1/rpc/${fn}`,{method:'POST',
  headers:{'apikey':BB.key,'Authorization':'Bearer '+BB.key,'Content-Type':'application/json'},
  body:JSON.stringify(body)});
 if(!r.ok) throw new Error('검색 실패 '+r.status);
 return r.json();
}
let LVQ='', LVROWS=null, LVBUSY=false, LVCNT=null, LVERR='';
const lvSplit=s=>String(s||'').split(/[,;]/).map(x=>x.trim()).filter(x=>x.length>1);

async function lvSearch(q){
 LVQ=q; LVBUSY=true; LVERR=''; LVROWS=null; LVCNT=null; lvRender();
 try{
  const [rows,cnt]=await Promise.all([
   bbRpc('search_papers_exact',{q,lim:300,offs:0,strict:true}),
   bbRpc('search_papers_count',{q,strict:true}).catch(()=>null)]);
  LVROWS=Array.isArray(rows)?rows:[];
  LVCNT=(typeof cnt==='number')?cnt:(Array.isArray(cnt)&&cnt[0]?Object.values(cnt[0])[0]:null);
 }catch(e){ LVERR=e.message||'검색 실패'; }
 LVBUSY=false; lvRender();
}
function lvAuthors(rows){
 const m=new Map();
 rows.forEach(p=>{
  const seen=new Set();
  lvSplit(p.authors).forEach(n=>{
   if(seen.has(n)) return; seen.add(n);
   const a=m.get(n)||{n,p:0,c:0,y0:9999,y1:0,jr:new Map(),src:new Set()};
   a.p++; a.c+=(p.citations||0);
   if(p.pub_year){a.y0=Math.min(a.y0,p.pub_year);a.y1=Math.max(a.y1,p.pub_year);}
   if(p.journal_name) a.jr.set(p.journal_name,(a.jr.get(p.journal_name)||0)+1);
   if(p.source) a.src.add(p.source);
   m.set(n,a);});});
 return [...m.values()].sort((x,y)=>y.p-x.p||y.c-x.c);
}
function lvCard(){
 return `<div class="ecard" id="lvC"><h3>주제로 논문 저자 찾기 <span class="pill off">BIBLO 논문 검색엔진</span></h3>${ins(`주제어를 넣으면 <b>그 주제로 논문을 쓴 사람</b>을 찾아 줍니다. 과제 팀을 짤 때 쓰는 칸입니다.`)}
  <div class="d">치신 말이 <b>제목·초록에 그대로 들어간 논문</b>을 BIBLO 검색엔진에서 실시간으로 찾아, 그 논문의 저자를 많이 쓴 순으로 모읍니다.
   위의 분야 목록이 미리 만든 사전이라면, 이쪽은 <b>매번 실제로 검색</b>합니다. 국내(KCI)·국제 논문이 함께 나옵니다.</div>
  <div class="srch"><input id="lvq" type="search" placeholder="주제를 치세요 — 이차전지, 마이크로바이옴, 자율주행, 고령화 …" autocomplete="off">
   <div class="fl" id="lvf"></div></div>
  <div id="lvb"></div></div>`;
}
function lvInit(){
 const i=document.getElementById('lvq'); if(!i) return;
 const go=()=>{const v=i.value.trim(); if(v.length>=2) lvSearch(v); else {LVROWS=null;LVQ='';lvRender();}};
 i.onkeydown=e=>{if(e.key==='Enter')go();};
 let t; i.oninput=()=>{clearTimeout(t);t=setTimeout(go,520);};
 lvRender();
}
let LVTAB='author';
function lvRender(){
 const B=document.getElementById('lvb'), F=document.getElementById('lvf'); if(!B) return;
 F.innerHTML=`<button class="fbtn ${LVTAB==='author'?'on':''}" data-lt="author">저자</button>
  <button class="fbtn ${LVTAB==='paper'?'on':''}" data-lt="paper">논문</button>
  <span class="flab">${LVBUSY?'검색 중…':LVROWS?`논문 ${N(LVROWS.length)}건${LVCNT&&LVCNT>LVROWS.length?` (전체 ${N(LVCNT)}건 중 상위)`:''} · 저자 ${N(lvAuthors(LVROWS).length)}명`:'엔터를 치거나 잠시 기다리면 검색합니다'}</span>`;
 F.querySelectorAll('[data-lt]').forEach(b=>b.onclick=()=>{LVTAB=b.dataset.lt;lvRender();});
 if(LVERR){B.innerHTML=`<div class="empty" style="padding:20px">검색엔진에 연결하지 못했습니다 — ${esc(LVERR)}</div>`;return;}
 if(LVBUSY){B.innerHTML=`<div class="empty" style="padding:22px">BIBLO 검색엔진에서 찾는 중…</div>`;return;}
 if(!LVROWS){B.innerHTML=`<div class="empty" style="padding:22px">주제를 입력하면 그 주제로 논문을 낸 저자를 찾습니다.
   <div class="chips" style="margin-top:12px;justify-content:center">${['이차전지','마이크로바이옴','자율주행','고령화','메타표면','디지털전환'].map(t=>`<button class="chip" data-lq="${t}">${t}</button>`).join('')}</div></div>`;
  B.querySelectorAll('[data-lq]').forEach(b=>b.onclick=()=>{const i=document.getElementById('lvq');i.value=b.dataset.lq;lvSearch(b.dataset.lq);});
  return;}
 if(!LVROWS.length){B.innerHTML=`<div class="empty" style="padding:22px">"${esc(LVQ)}"가 제목·초록에 그대로 든 논문이 없습니다. 다른 말로 쳐 보십시오.</div>`;return;}

 if(LVTAB==='author'){
  const A=lvAuthors(LVROWS).slice(0,40), mx=A[0].p;
  B.innerHTML=`<table class="mtx rtab"><colgroup><col style="width:20%"><col style="width:8%"><col style="width:10%"><col style="width:14%"><col style="width:14%"><col style="width:34%"></colgroup>
   <thead><tr><th class="l">저자</th><th style="text-align:right">이 주제 논문</th><th style="text-align:right">피인용</th><th>활동 기간</th><th>구분</th><th class="l">주요 저널</th></tr></thead><tbody>
   ${A.map(a=>{const j=[...a.jr.entries()].sort((x,y)=>y[1]-x[1])[0];
    return `<tr><td class="l"><span class="dn">${esc(a.n)}</span></td>
     <td><div class="pcell"><span class="pb"><i style="width:${(a.p/mx*100).toFixed(0)}%;background:var(--navy)"></i></span><b style="font:700 12px var(--num)">${a.p}</b></div></td>
     <td class="num">${N(a.c)}</td>
     <td class="num">${a.y1?`${a.y0}~${a.y1}`:'—'}</td>
     <td>${[...a.src].map(s=>`<span class="xb ${s==='kci'?'kr':'il'}">${s==='kci'?'국내':'국제'}</span>`).join(' ')}</td>
     <td class="l"><span class="aff" title="${esc(j?j[0]:'')}">${esc(j?j[0]:'—')}</span></td></tr>`;}).join('')}
   </tbody></table>
   <div class="d" style="margin:10px 0 0"><b>읽는 법</b> · <b>이 주제 논문</b>은 검색된 논문 중 그 저자가 이름을 올린 편수입니다.
    저자 식별은 <b>표기된 이름 문자열</b> 기준이라 동명이인이 섞일 수 있습니다.
    소속은 이 검색 결과에 담기지 않아 표시하지 않습니다.</div>`;
 }else{
  const P=LVROWS.slice(0,60);
  B.innerHTML=`<table class="mtx rtab"><colgroup><col style="width:44%"><col style="width:20%"><col style="width:7%"><col style="width:8%"><col style="width:21%"></colgroup>
   <thead><tr><th class="l">제목</th><th class="l">저자</th><th style="text-align:right">연도</th><th style="text-align:right">피인용</th><th class="l">저널</th></tr></thead><tbody>
   ${P.map(p=>`<tr><td class="l"><span class="dn" title="${esc(p.title)}">${p.doi?`<a href="https://doi.org/${encodeURI(p.doi)}" target="_blank" rel="noopener noreferrer">${esc(p.title)}</a>`:esc(p.title)}</span></td>
    <td class="l"><span class="aff" title="${esc(p.authors)}">${esc(p.authors||'—')}</span></td>
    <td class="num">${p.pub_year||'—'}</td><td class="num">${N(p.citations||0)}</td>
    <td class="l"><span class="aff" title="${esc(p.journal_name)}">${esc(p.journal_name||'—')}</span></td></tr>`).join('')}
   </tbody></table>
   <div class="d" style="margin:10px 0 0">제목을 누르면 DOI로 넘어갑니다. 상위 ${P.length}건만 표시합니다.</div>`;
 }
}
