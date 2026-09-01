/* ── OpenAlex 실시간 조회 ──
   공개 API(무료·키 없음·CORS 허용). 미리 만든 표가 아니라 누를 때마다 실제로 받아 온다.
   polite pool 규칙에 따라 mailto를 붙인다. */
const OAM='mystar0928@gmail.com';
const oaCache=new Map();
async function oaGet(path){
 if(oaCache.has(path)) return oaCache.get(path);
 const u='https://api.openalex.org/'+path+(path.includes('?')?'&':'?')+'mailto='+OAM;
 const r=await fetch(u);
 if(!r.ok) throw new Error('OpenAlex '+r.status);
 const j=await r.json(); oaCache.set(path,j); return j;
}
const oaInst=a=>((a.last_known_institutions||[])[0]||{}).display_name||'';
const oaTop=a=>((a.topics||[])[0]||{}).display_name||'';

/* ── 학교별 피인용 상위 연구자 ── */
let OAU=null, OAROWS=null, OABUSY=false, OAERR='';
async function oaAuthors(u){
 OAU=u; OABUSY=true; OAERR=''; OAROWS=null; oaRender();
 try{
  const d=await oaGet(`authors?filter=last_known_institutions.id:${u.oid}&sort=cited_by_count:desc&per-page=100`
   +`&select=id,display_name,cited_by_count,works_count,summary_stats,topics,orcid`);
  OAROWS=d.results||[];
 }catch(e){ OAERR=e.message; }
 OABUSY=false; oaRender();
}
function oaPanel(){
 return `<div class="ecard" id="oaC"><h3>학교별 피인용 상위 연구자 <span class="pill off">OpenAlex 실시간</span></h3>
  <div class="d">학교를 누르면 그 학교 소속으로 <b>판별된 연구자</b>를 피인용 많은 순으로 100명까지 받아 옵니다. 미리 만든 표가 아니라 누를 때마다 실제로 조회합니다.
   <br><b>소속 기준</b> · OpenAlex의 <code>last_known_institutions</code>(마지막으로 확인된 소속)입니다.
   겸직·방문·이직 이력이 그대로 잡히므로 <b>현직 전임교원 명단이 아닙니다.</b></div>
  <div class="fl" id="oaf"></div><div id="oab"></div></div>`;
}
function oaInit(){ oaFilter(); oaRender(); }
function oaFilter(){
 const F=document.getElementById('oaf'); if(!F) return;
 F.innerHTML=shU().map(u=>`<button class="fbtn ${OAU&&OAU.nm===u.nm?'on':''} ${u.nm===SME?'meb':''}" data-oa="${esc(u.nm)}">${esc(u.nm)}</button>`).join('')
  +`<span class="flab">${OABUSY?'OpenAlex에서 받는 중…':OAROWS?`${esc(OAU.nm)} · 상위 ${OAROWS.length}명`:'학교를 누르면 조회합니다'}</span>`;
 F.querySelectorAll('[data-oa]').forEach(b=>b.onclick=()=>{const u=shU().find(x=>x.nm===b.dataset.oa);oaAuthors(u);oaFilter();});
}
function oaRender(){
 const B=document.getElementById('oab'); if(!B) return;
 oaFilter();
 if(OAERR){B.innerHTML=`<div class="empty" style="padding:20px">OpenAlex에 연결하지 못했습니다 — ${esc(OAERR)}</div>`;return;}
 if(OABUSY){B.innerHTML=`<div class="empty" style="padding:22px">받는 중…</div>`;return;}
 if(!OAROWS){B.innerHTML=`<div class="empty" style="padding:22px">위에서 학교를 누르십시오.</div>`;return;}
 const mx=OAROWS[0]?OAROWS[0].cited_by_count:1;
 B.innerHTML=`<table class="mtx rtab"><colgroup><col style="width:5%"><col style="width:20%"><col style="width:18%"><col style="width:9%"><col style="width:8%"><col style="width:9%"><col style="width:31%"></colgroup>
  <thead><tr><th style="text-align:right">순위</th><th class="l">연구자</th><th>피인용</th><th style="text-align:right">논문</th>
   <th style="text-align:right">h-index</th><th style="text-align:right">2년 피인용</th><th class="l">대표 주제</th></tr></thead><tbody>
  ${OAROWS.map((a,i)=>{const ss=a.summary_stats||{};
   return `<tr><td class="num">${i+1}</td>
    <td class="l"><span class="dn">${esc(a.display_name)}</span>${a.orcid?'<span class="xb id">ORCID</span>':''}</td>
    <td><div class="pcell"><span class="pb"><i style="width:${(a.cited_by_count/mx*100).toFixed(0)}%;background:var(--navy)"></i></span><b style="font:700 12px var(--num)">${N(a.cited_by_count)}</b></div></td>
    <td class="num">${N(a.works_count)}</td><td class="num">${N(ss.h_index)}</td>
    <td class="num">${(ss['2yr_mean_citedness']||0).toFixed(1)}</td>
    <td class="l"><span class="aff" title="${esc(oaTop(a))}">${esc(oaTop(a))||'—'}</span></td></tr>`;}).join('')}
  </tbody></table>
  <div class="d" style="margin:10px 0 0"><b>읽는 법</b> · 피인용은 <b>경력 전체 누적</b>이라 오래 연구한 사람이 위로 옵니다. 최근 활동은 <b>2년 피인용</b>으로 봅니다.
   대량공저 분야(입자물리·의학 컨소시엄)는 개인 기여와 무관하게 누적이 커집니다. 개인 평가에 그대로 쓰지 마십시오.</div>`;
}

/* ── 세계 공저자 후보 ──
   두 가지로 찾는다.
   ① 주제 : 그 분야 주제를 연구하는 세계 연구자 (접점 무관)
   ② 관계망 : 우리 공저자와 함께 쓴 사람 중 성균관대와 아직 안 쓴 사람 (소개받을 수 있는 상대)
   ②가 실제 성사 가능성이 높다. ①은 분야 최상위를 보는 용도. */
const SKKU_OA='I848706';
let WCF=null, WCROWS=null, WCBUSY=false, WCERR='', WCN=0, WCLOC='all', WCSORT='cited_by_count', WCMODE='topic';
let WC1=null, WC2=null;                              // 1단계(성대와 공저) · 2단계(그 사람들의 공저자)
const WCSORTS=[['cited_by_count','누적 피인용'],['summary_stats.h_index','h-index'],['works_count','논문 수']];
const WCLOCS=[['all','전체'],['exkr','해외만'],['kr','국내']];
const wcMap=code=>(typeof FT!=='undefined'&&FT.map)?FT.map[code]:null;
const oaId=u=>String(u||'').split('/').pop();

/* 관계망 두 겹을 받아 둔다 — 분야가 바뀔 때만 다시 받는다 */
async function wcNet(ids){
 if(WC1&&WC1.code===WCF) return;
 WC1={code:WCF,map:new Map()}; WC2={code:WCF,map:new Map()};
 try{
  const d1=await oaGet('works?filter='+encodeURIComponent('institutions.id:'+SKKU_OA+',topics.id:'+ids)
   +'&group_by=authorships.author.id&per-page=200');
  (d1.group_by||[]).forEach(x=>WC1.map.set(oaId(x.key),{n:x.key_display_name,c:x.count}));
  const seed=[...WC1.map.keys()].slice(0,15).join('|');
  if(seed){
   const d2=await oaGet('works?filter='+encodeURIComponent('authorships.author.id:'+seed+',topics.id:'+ids)
    +'&group_by=authorships.author.id&per-page=200');
   (d2.group_by||[]).forEach(x=>WC2.map.set(oaId(x.key),{n:x.key_display_name,c:x.count}));
  }
 }catch(e){ /* 관계망은 보조 신호라 실패해도 목록은 낸다 */ }
}

async function wcLoad(code){
 WCF=code; WCROWS=null; WCERR=''; WCN=0;
 const m=wcMap(code);
 if(!m||!(m.t||[]).length){ WCBUSY=false; wcRender(); return; }
 WCBUSY=true; wcRender();
 const ids=m.t.map(t=>t.id).join('|');
 try{
  await wcNet(ids);
  const SEL='&select=id,display_name,cited_by_count,works_count,summary_stats,last_known_institutions,topics,orcid';
  if(WCMODE==='net'){
   /* 우리 공저자와 함께 썼지만 성균관대와는 아직 안 쓴 사람 */
   const fresh=[...WC2.map.entries()].filter(([id])=>!WC1.map.has(id));
   WCN=fresh.length;
   const pick=fresh.slice(0,40).map(([id])=>id).join('|');
   if(!pick){ WCROWS=[]; }
   else{
    const d=await oaGet('authors?filter='+encodeURIComponent('openalex:'+pick)+'&per-page=40'+SEL);
    let rows=(d.results||[]);
    if(WCLOC!=='all') rows=rows.filter(a=>{const cc=((a.last_known_institutions||[])[0]||{}).country_code||'';
      return WCLOC==='kr'?cc==='KR':cc!=='KR';});
    const key=WCSORT==='works_count'?'works_count':WCSORT==='cited_by_count'?'cited_by_count':'h';
    rows.sort((x,y)=>{const v=a=>key==='h'?((a.summary_stats||{}).h_index||0):a[key]; return v(y)-v(x);});
    WCROWS=rows.slice(0,25);
   }
  }else{
   let f='topics.id:'+ids+',last_known_institutions.id:!'+SKKU_OA;
   if(WCLOC==='exkr') f+=',last_known_institutions.country_code:!kr';
   if(WCLOC==='kr')   f+=',last_known_institutions.country_code:kr';
   const d=await oaGet('authors?filter='+encodeURIComponent(f)+'&sort='+WCSORT+':desc&per-page=25'+SEL);
   WCROWS=d.results||[]; WCN=(d.meta||{}).count||0;
  }
 }catch(e){ WCERR=e.message; }
 WCBUSY=false; wcRender();
}

/* 우리와의 거리 — 1단계(직접 공저) · 2단계(공저자의 공저자) · 접점 없음 */
function wcTie(a){
 const id=oaId(a.id);
 if(WC1&&WC1.map.has(id)) return {k:1,c:WC1.map.get(id).c};
 if(WC2&&WC2.map.has(id)) return {k:2,c:WC2.map.get(id).c};
 return {k:0};
}
function wcTieBadge(t){
 if(t.k===1) return `<span class="xb tie1" title="이 분야에서 성균관대 논문에 함께 이름을 올렸습니다">성대 공저 ${N(t.c)}편</span>`;
 if(t.k===2) return `<span class="xb tie2" title="우리 공저자와 함께 쓴 사람입니다 — 소개받을 수 있습니다">2단계 ${N(t.c)}편</span>`;
 return `<span class="xb tie0" title="우리 관계망에 접점이 없습니다">접점 없음</span>`;
}

function wcPanel(code){
 const m=wcMap(code);
 return `<div class="xpanel wcp"><div class="xph"><h4>세계 공저자 후보</h4>
   <span>OpenAlex 실시간 · 우리와의 접점을 <b>1단계·2단계</b>로 표시합니다</span></div>
  <div class="fl" id="wcf"></div><div id="wcb"></div>
  <div class="d" style="margin:9px 0 0">
   <b>주제 기준</b>은 이 분야 주제를 연구하는 세계 연구자를 인용 많은 순으로 봅니다 — 분야 최상위가 위로 옵니다.
   <b>관계망 기준</b>은 <b>우리 공저자와 함께 쓴 사람 중 성균관대와는 아직 안 쓴 사람</b>입니다. 사이에 사람이 있어 연락이 닿습니다.
   ${m?`분야 대응 주제 <b>${m.t.length}개</b> — ${m.t.slice(0,3).map(t=>esc(t.n)).join(' · ')}${m.t.length>3?' 외':''}.`:''}
   <br><b>소속 표기 주의</b> · 소속은 OpenAlex가 <b>마지막으로 확인한 기관</b>입니다. 겸직·방문·공동연구가 그대로 잡혀 <b>본 소속과 다르게 보일 수 있습니다</b>.
   누적 피인용은 경력이 길수록 커지므로 <b>신진 연구자는 위로 오지 않습니다.</b></div></div>`;
}

function wcRender(){
 const B=document.getElementById('wcb'), F=document.getElementById('wcf'); if(!B||!F) return;
 F.innerHTML=`<span class="flab">찾는 법</span>`
  +[['topic','주제 기준'],['net','관계망 기준']].map(([k,l])=>`<button class="fbtn ${WCMODE===k?'on':''}" data-wm="${k}">${l}</button>`).join('')
  +`<span class="flab">지역</span>`
  +WCLOCS.map(([k,l])=>`<button class="fbtn ${WCLOC===k?'on':''}" data-wl="${k}">${l}</button>`).join('')
  +`<span class="flab">정렬</span>`
  +WCSORTS.map(([k,l])=>`<button class="fbtn ${WCSORT===k?'on':''}" data-ws="${k}">${l}</button>`).join('')
  +`<span class="flab">${WCBUSY?'OpenAlex에서 받는 중…':WCN?(WCMODE==='net'
     ?`소개 가능한 후보 ${N(WCN)}명 중 상위 ${(WCROWS||[]).length}명`
     :`해당 연구자 ${N(WCN)}명 중 상위 ${(WCROWS||[]).length}명`):''}</span>`;
 F.querySelectorAll('[data-wm]').forEach(b=>b.onclick=()=>{WCMODE=b.dataset.wm;wcLoad(WCF);});
 F.querySelectorAll('[data-wl]').forEach(b=>b.onclick=()=>{WCLOC=b.dataset.wl;wcLoad(WCF);});
 F.querySelectorAll('[data-ws]').forEach(b=>b.onclick=()=>{WCSORT=b.dataset.ws;wcLoad(WCF);});
 if(!wcMap(WCF)){B.innerHTML=`<div class="empty" style="padding:18px">이 분야에 대응하는 OpenAlex 주제를 아직 붙이지 못했습니다.</div>`;return;}
 if(WCERR){B.innerHTML=`<div class="empty" style="padding:18px">OpenAlex에 연결하지 못했습니다 — ${esc(WCERR)}</div>`;return;}
 if(WCBUSY){B.innerHTML=`<div class="empty" style="padding:20px">받는 중…</div>`;return;}
 if(!WCROWS){B.innerHTML=`<div class="empty" style="padding:20px">조회를 기다리는 중입니다.</div>`;return;}
 if(!WCROWS.length){B.innerHTML=`<div class="empty" style="padding:18px">${WCMODE==='net'
   ?'이 분야에서는 소개 가능한 2단계 후보를 찾지 못했습니다. 주제 기준으로 보십시오.'
   :'조건에 맞는 연구자가 없습니다.'}</div>`;return;}
 const key=WCSORT==='works_count'?'works_count':WCSORT==='cited_by_count'?'cited_by_count':'h';
 const val=a=>key==='h'?((a.summary_stats||{}).h_index||0):a[key];
 const mx=val(WCROWS[0])||1;
 B.innerHTML=`<div class="xlst">${WCROWS.map((a,i)=>{const ss=a.summary_stats||{};
  const inst=(a.last_known_institutions||[])[0]||{}, cc=inst.country_code||'', tie=wcTie(a);
  return `<div class="xrow"><div class="xrk">${i+1}</div>${xAv(a.display_name,'#3b82f6')}
   <div class="xwho"><div class="n"><button class="prn" data-pw="${esc(oaId(a.id))}">${esc(a.display_name)}</button>${cc?`<span class="xb ${cc==='KR'?'kr':'il'}">${esc(cc)}</span>`:''}${wcTieBadge(tie)}${a.orcid?'<span class="xb id">ORCID</span>':''}</div>
    <div class="m">${esc(inst.display_name||'소속 미상')} · ${esc(oaTop(a))||'주제 미상'}</div>
    <div class="wcb"><i style="width:${(val(a)/mx*100).toFixed(0)}%"></i></div></div>
   <div class="xmets"><div><b>${N(a.cited_by_count)}</b><span>피인용</span></div>
    <div><b>${N(a.works_count)}</b><span>논문</span></div>
    <div><b>${N(ss.h_index)}</b><span>h-index</span></div>
    <div><b>${(ss['2yr_mean_citedness']||0).toFixed(1)}</b><span>2년 피인용</span></div></div></div>`;}).join('')}</div>`;
 B.querySelectorAll('[data-pw]').forEach(b=>b.onclick=()=>{
  const a=WCROWS.find(x=>oaId(x.id)===b.dataset.pw); if(!a) return;
  const inst=(a.last_known_institutions||[])[0]||{};
  prOpen({kind:'world',key:'w'+b.dataset.pw,aid:b.dataset.pw,name:a.display_name,
   aff:inst.display_name,cc:inst.country_code,c:a.cited_by_count,t:a.works_count,tie:wcTie(a)});});
}

/* ── 연구자 카드 ──
   이름을 누르면 연락처 → 소속 → 연구력 → 논문(인용 상위·최신) 순으로 편다.
   메일은 인코딩해 실어 두고 화면에서만 푼다(정적 소스만 긁는 수집기 대비).
   논문은 OpenAlex에서 그 자리에 받는다 — 8천 명 분을 미리 실으면 파일이 감당되지 않는다. */
let PR=null, PRA=null, PRTOP=null, PRNEW=null, PRBUSY=false, PRERR='';
let PRMAIL=null, PRMBUSY=false;              // 논문에서 찾아낸 이메일

/* ── 논문 교신주소에서 이메일 ──
   Europe PMC(무료·키 없음)는 저자 소속 문자열 안에 교신저자 주소를 담아 준다.
   다만 한 논문의 주소가 그 논문 모든 저자 줄에 복제돼 나오므로, 그대로 쓰면 남의 주소를 붙이게 된다.
   이름(성 또는 이름)이 주소 앞부분에 들어 있는 것만 취한다. */
/* Grätzel → gratzel / graetzel 둘 다 만든다. 독일어권은 ä를 ae로 적은 주소를 쓴다 */
const pmcBare=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const pmcNorm=s=>pmcBare(s).toLowerCase().replace(/[^a-z]/g,'');
const pmcNorm2=s=>String(s||'').toLowerCase()
 .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
 .replace(/å/g,'aa').replace(/ø/g,'oe').replace(/æ/g,'ae')
 .replace(/[^a-z]/g,'');
function pmcPick(name,pool){
 const words=(name||'').trim().split(/[\s,.]+/).filter(Boolean);
 const cand=new Set();
 [words[words.length-1], words[0]].filter(Boolean).forEach(w=>{
  [pmcNorm(w),pmcNorm2(w)].forEach(v=>{ if(v&&v.length>=3) cand.add(v); });});
 if(!cand.size) return [];
 const hit=[];
 pool.forEach(m=>{ const lp=pmcNorm(m.split('@')[0]);
  if([...cand].some(c=>lp.includes(c))) hit.push(m); });
 return [...new Set(hit)];
}
async function pmcMail(name){
 const q='AUTH:"'+pmcBare(String(name)).replace(/"/g,'')+'"';
 const u='https://www.ebi.ac.uk/europepmc/webservices/rest/search?query='+encodeURIComponent(q)
  +'&format=json&pageSize=25&resultType=core';
 const r=await fetch(u); if(!r.ok) throw new Error('Europe PMC '+r.status);
 const j=await r.json(), pool=new Set();
 ((j.resultList||{}).result||[]).forEach(x=>{
  const t=JSON.stringify(x.authorList||{});
  (t.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)||[]).forEach(m=>pool.add(m.toLowerCase()));});
 return {hit:j.hitCount||0, pool:[...pool], mails:pmcPick(name,[...pool])};
}
/* 이름이 흔하면 동명이인 주소가 섞인다(스탠퍼드 Yi Cui에 중국 연구소 주소).
   소속 이름의 낱말이 메일 도메인에 들어 있으면 '소속과 일치'로 올려 준다. */
const PMC_STOP=new Set(['university','universite','universitat','universiteit','institute','institut',
 'college','school','national','the','of','and','for','center','centre','research','laboratory','lab',
 'department','dept','state','technology','technical','science','sciences','academy','hospital','univ']);
function pmcTrust(mail,aff){
 const dom=(mail.split('@')[1]||'').toLowerCase();
 const words=pmcBare(String(aff||'')).toLowerCase().split(/[^a-z]+/).filter(w=>w.length>=3&&!PMC_STOP.has(w));
 if(words.some(w=>w.length>=4&&dom.includes(w))) return true;
 /* 기관 도메인은 약어인 경우가 많다 — Seoul National University → snu.ac.kr */
 const all=pmcBare(String(aff||'')).toLowerCase().split(/[^a-z]+/).filter(Boolean);
 const ini=all.map(w=>w[0]).join(''), ini2=words.map(w=>w[0]).join('');
 return (ini.length>=2&&dom.includes(ini))||(ini2.length>=2&&dom.includes(ini2));
}
async function prFindMail(o){
 PRMBUSY=true; PRMAIL=null; prRender();
 try{
  let r=await pmcMail(o.name);
  if(!r.mails.length && o.en && o.en!==o.name) r=await pmcMail(o.en);
  const aff=o.kind==='in'?'Sungkyunkwan':(o.aff||'');
  r.mails=r.mails.map(m=>({m,ok:pmcTrust(m,aff)})).sort((a,b)=>(b.ok?1:0)-(a.ok?1:0));
  PRMAIL=r;
 }catch(e){ PRMAIL={err:e.message}; }
 PRMBUSY=false; prRender();
}
const CT=(typeof CONTACT!=='undefined'&&CONTACT.m)?CONTACT.m:{};
const deMail=v=>{ try{ return atob(v).split('').reverse().join(''); }catch(e){ return ''; } };

function prClose(){ const el=document.getElementById('prmodal'); if(el){el.classList.remove('on'); el.innerHTML='';}
 document.removeEventListener('keydown',prEsc); PR=null; }
function prEsc(e){ if(e.key==='Escape') prClose(); }


/* 원본 fit() 과 같은 일 — 무대를 폭에 맞춰 줄이고 래퍼 높이를 그만큼 잡는다.
   높이를 안 잡으면 absolute 무대라 래퍼가 0 높이가 된다. */
const RPW=1718, RPH=812;
function rpFit(){
 const w=document.querySelector('.rpwrap'); if(!w) return;
 const bd=w.querySelector('.rpboard'); if(!bd) return;
 const aw=w.clientWidth||w.getBoundingClientRect().width; if(!aw) return;
 /* 배율이 0.62 밑으로 내려가면 본문이 9px 아래가 된다. 그 밑은 쌓기로 바꾼다. */
 const k=Math.min(aw/RPW, 1);
 if(k < 0.62){ w.classList.add('stack'); bd.style.transform='none'; w.style.height=''; return; }
 w.classList.remove('stack');
 bd.style.transform=`scale(${k.toFixed(4)})`;
 w.style.height=Math.round(RPH*k)+'px';
}
addEventListener('resize',()=>{try{rpFit();}catch(e){}});

async function prOpen(o){
 PR=o; PRA=null; PRTOP=null; PRNEW=null; PRERR=''; PRBUSY=true; PRMAIL=null; PRMBUSY=false; PRTAB=1;
 prRender();
 if(!(CT[o.key]||{}).e) prFindMail(o);        // 인사DB에 없는 사람만 논문에서 찾는다
 try{
  let aid=o.aid;
  if(!aid){
   /* 이름으로 찾으면 동명이인이 섞인다(전자전기 교수에게 척추수술 논문이 붙었다).
      ORCID → Scopus 저자ID → 이름 순으로, 확실한 식별자부터 쓴다. */
   const c=CT[o.key]||{}, SEL='&select=id,display_name,works_count,cited_by_count,summary_stats,last_known_institutions,orcid,counts_by_year,topics';
   const pick=d=>((d&&d.results)||[])[0]||null;
   if(c.o){ try{ PRA=pick(await oaGet('authors?filter=orcid:'+encodeURIComponent(c.o)+'&per-page=1'+SEL)); o.by='ORCID'; }catch(_){} }
   if(!PRA&&c.s){ for(const sid of String(c.s).split(';').filter(Boolean)){
     try{ PRA=pick(await oaGet('authors?filter=scopus:'+encodeURIComponent(sid.trim())+'&per-page=1'+SEL)); }catch(_){}
     if(PRA){ o.by='Scopus 저자ID'; break; } } }
   if(!PRA){
    const q=o.en||o.name;
    const f=o.kind==='in'?'&filter='+encodeURIComponent('last_known_institutions.id:I848706'):'';
    try{ PRA=pick(await oaGet('authors?search='+encodeURIComponent(q)+f+'&per-page=1'+SEL)); }catch(_){}
    if(!PRA&&f){ try{ PRA=pick(await oaGet('authors?search='+encodeURIComponent(q)+'&per-page=1'+SEL)); }catch(_){} }
    if(PRA) o.by='이름';
   }
   aid=PRA&&PRA.id.split('/').pop();
  } else o.by='OpenAlex 저자ID';
  if(aid){
   if(!PRA){ try{ PRA=await oaGet('authors/'+aid+'?select=id,display_name,works_count,cited_by_count,summary_stats,last_known_institutions,orcid,counts_by_year,topics'); }catch(_){} }
   const sel='&select=id,doi,display_name,publication_year,cited_by_count,primary_location,type,authorships';
   const [t,n]=await Promise.all([
    oaGet('works?filter=author.id:'+aid+'&sort=cited_by_count:desc&per-page=5'+sel),
    oaGet('works?filter=author.id:'+aid+'&sort=publication_date:desc&per-page=5'+sel)]);
   PRTOP=t.results||[]; PRNEW=n.results||[];
  }
 }catch(e){ PRERR=e.message; }
 PRBUSY=false; prRender();
}

function prCopy(v,btn){
 const t=v.indexOf('@')<0?deMail(v):v;
 const done=()=>{ if(!btn) return; const o=btn.textContent; btn.textContent='복사됨'; btn.classList.add('ok');
  setTimeout(()=>{btn.textContent=o; btn.classList.remove('ok');},1400); };
 if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done,()=>fb());
 else fb();
 function fb(){ const ta=document.createElement('textarea'); ta.value=t; ta.style.position='fixed'; ta.style.opacity=0;
  document.body.appendChild(ta); ta.select(); try{document.execCommand('copy'); done();}catch(_){} ta.remove(); }
}

const prJnl=w=>((w.primary_location||{}).source||{}).display_name||'';
function prWork(w){
 const doi=(w.doi||'').replace('https://doi.org/','');
 const t=esc(w.display_name||'제목 없음');
 const meta=`${w.publication_year||'—'}${prJnl(w)?' · '+esc(prJnl(w)):''}`;
 return doi
  ? `<a class="prw" href="https://doi.org/${encodeURI(doi)}" target="_blank" rel="noopener noreferrer" title="DOI로 논문 보기 (새 창)">
      <span class="tt">${t}</span><span class="mt">${meta} · <code>${esc(doi)}</code> ↗</span>
      <span class="cc">${N(w.cited_by_count)}<em>인용</em></span></a>`
  : `<div class="prw nodoi"><span class="tt">${t}</span><span class="mt">${meta} · DOI 없음</span>
      <span class="cc">${N(w.cited_by_count)}<em>인용</em></span></div>`;
}

function prRender(){
 let el=document.getElementById('prmodal');
 if(!el){ el=document.createElement('div'); el.id='prmodal'; el.className='modal'; document.body.appendChild(el); }
 if(!PR){ el.classList.remove('on'); el.innerHTML=''; return; }
 const o=PR, c=CT[o.key]||{};
 const mail=c.e?deMail(c.e):'';
 const orcid=c.o||(PRA&&PRA.orcid?PRA.orcid.replace('https://orcid.org/',''):'');
 const inst=PRA?((PRA.last_known_institutions||[])[0]||{}).display_name:'';
 const ss=(PRA&&PRA.summary_stats)||{};
 const kindLab={in:'교내 공저자',ext:'교외 공저자',world:'세계 공저자 후보'}[o.kind]||'';

 const found=((PRMAIL&&PRMAIL.mails)||[]).map(x=>typeof x==='string'?{m:x,ok:false}:x);
 const mailRow=(v,src,warn)=>`<div class="prmail ${warn?'chk':''}"><span class="lb">이메일</span>
   <span class="ml">${esc(v)}</span>
   <button class="cp" data-cp="${esc(v)}">복사</button>
   <a class="cp go" href="mailto:${esc(v)}">메일 쓰기</a>
   <span class="hint">${src}</span></div>`;
 const contact = mail ? mailRow(mail,'출처 · 교내 인사DB')
  : PRMBUSY ? `<div class="prmail wait"><span class="lb">이메일</span>
      <span class="ml">논문 교신주소를 찾는 중…</span></div>`
  : found.length ? found.map(x=>mailRow(x.m, x.ok
      ? '출처 · 논문 교신주소(Europe PMC) · <b>소속 기관과 도메인이 맞습니다</b>'
      : '출처 · 논문 교신주소(Europe PMC) · 이름은 맞지만 소속과 도메인이 다릅니다. 겸직·이직이거나 <b>동명이인일 수 있어 확인이 필요합니다</b>', !x.ok)).join('')
  : `<div class="prmail none"><span class="lb">이메일</span>
      <span class="ml">찾지 못했습니다</span>
      <span class="hint">${o.kind==='in'?'인사DB에 주소가 없고, ':''}논문 교신주소(Europe PMC)에서도 이 이름과 맞는 주소가 나오지 않았습니다${PRMAIL&&PRMAIL.err?' — '+esc(PRMAIL.err):(PRMAIL&&PRMAIL.hit?` (관련 논문 ${N(PRMAIL.hit)}편 확인)`:'')}. PubMed·PMC에 실리지 않는 분야는 이 경로로 나오지 않습니다.</span></div>`;

 const links=[
  orcid?`<a class="prlink" href="https://orcid.org/${esc(orcid)}" target="_blank" rel="noopener noreferrer">ORCID ↗</a>`:'',
  PRA?`<a class="prlink" href="${esc(PRA.id)}" target="_blank" rel="noopener noreferrer">OpenAlex 프로필 ↗</a>`:'',
  o.sid?`<span class="prlink off">Scopus 등재</span>`:''].filter(Boolean).join('');

 const mets=[];                              // 세계 후보는 우리 쪽 실적이 없다 — OpenAlex 줄만 낸다
 if(o.kind!=='world'){
  if(o.f!=null) mets.push(['이 분야 논문',N(o.f)+'편']);
  if(o.t!=null) mets.push([o.kind==='in'?'총 논문':'우리와 공저',N(o.t)+'편']);
  if(o.c!=null) mets.push(['인용',N(o.c)+'회']);
  if(o.w!=null&&o.w!=='') mets.push(['FWCI',(+o.w).toFixed(2)]);
 }
 const oam=PRA?[['논문 수',N(PRA.works_count)+'편'],['누적 피인용',N(PRA.cited_by_count)+'회'],
   ['h-index',N(ss.h_index)],['2년 피인용',(ss['2yr_mean_citedness']||0).toFixed(1)]]:[];

 const B=prBK(o);
 const bkBadge = B
   ? `<span class="bkb">BK21 ${esc(B.kind)}</span>`
   : (o.kind==='in'?`<span class="bkb off">BK21 미참여</span>`:'');
 el.innerHTML=`<div class="mbox prbox prwide"><button class="mx" data-mclose="1" aria-label="닫기">×</button>
  <div class="prhead slim">
   <div><h4>${esc(o.name)}${bkBadge}${o.cc?`<span class="xb ${o.cc==='KR'?'kr':'il'}">${esc(o.cc)}</span>`:''}</h4>
    <div class="sub">${kindLab}${o.en&&o.en!==o.name?' · '+esc(o.en):''}</div></div></div>

  ${contact}

  ${(!B && !PRA && !PRBUSY) ? `<div class="prfn" style="border-left:3px solid var(--s-amber)">
   <b>이 사람은 BK21 참여자가 아니고, 지금 외부 조회가 막혀 있습니다.</b>
   ${PRERR?esc(String(PRERR).slice(0,80))+' · ':''}아래 화면은
   <b>보드가 이미 가진 값</b>만 보여 줍니다. 전체 경력 수치는 조회가 열리면 채워집니다.
   ${o.f!=null?`이 분야 논문 <b>${N(o.f)}편</b> · `:''}${o.t!=null?`우리와 공저 <b>${N(o.t)}편</b> · `:''}
   ${o.c!=null?`인용 <b>${N(o.c)}회</b>`:''}${(o.w!=null&&o.w!=='')?` · FWCI <b>${(+o.w).toFixed(2)}</b>`:''}
  </div>`:''}
  <div class="rpwrap">
   <div class="board rpboard">
    <div class="bgfx"><canvas id="rp-bok"></canvas></div>
    <aside class="glass phone" id="rp-phone"></aside>
    <nav class="glass menu">
     <h3>개인성과 <span>11 VIEWS</span></h3>
     <div class="rpsearch">어떤 연구를, 얼마나, 어떤 역할로</div>
     <div class="mlist" id="rp-mlist"></div>
     <div class="mfoot" id="rp-mfoot"></div>
    </nav>
    <main class="glass panel" id="rp-panel"></main>
   </div>
  </div>
  <div class="prfoot">논문 목록과 경력 수치는 <b>OpenAlex</b>에서 지금 받아 온 것입니다${PRA?'':' (프로필을 찾지 못했습니다)'}.
   ${B?'환산점수·등급·역할은 <b>BIBLO Scholar</b> 원장 기준입니다.':''}
   ${o.by==='이름'?'이름으로 찾은 프로필이라 <b>동명이인이 섞일 수 있습니다.</b>':''}</div>
 </div>`;
 el.classList.add('on');
 el.onclick=e=>{ if(e.target===el||e.target.closest('[data-mclose]')) prClose(); };
 el.querySelectorAll('[data-cp]').forEach(b=>b.onclick=e=>{e.stopPropagation();prCopy(b.dataset.cp,b);});
 /* 원본(슬라이드 16) 그리기 — P 를 어댑터로 만들어 넣고 세 칸을 그린다.
    메뉴 클릭은 원본 drawMenu 가 자기 안에서 건다(data-i). 여기서 다시 걸지 않는다. */
 try{
  RP.set(toPerfShape(o,B)); RP.tab(PRTAB-1);
  RP.bg(); RP.drawPhone(); RP.drawMenu(); RP.drawPanel();
  rpFit();
  const ml=el.querySelector('#rp-mlist');
  if(ml) ml.querySelectorAll('[data-i]').forEach(b=>b.addEventListener('click',ev=>{
    ev.stopPropagation(); PRTAB=(+b.dataset.i)+1; prRender(); }));
 }catch(err){ const pn=el.querySelector('#rp-panel');
  if(pn) pn.innerHTML='<div class="prempty"><b>화면을 그리지 못했습니다</b><span>'
    +String(err).slice(0,120)+'</span></div>'; }
 document.addEventListener('keydown',prEsc);
}

/* ══════════════════════════════════════════════════════════════════
   연구자 팝업 — 개인성과 11개 메뉴
   좌측 메뉴를 누르면 우측이 바뀐다. BK21 참여자는 우리 데이터로 채우고,
   아닌 사람은 OpenAlex 만으로 채운다. 없는 칸은 «미수집» 으로 남긴다.
   ══════════════════════════════════════════════════════════════════ */
let PRTAB=1;
const PRMENU=[
 [ 1,'연구자 · 소속 · 식별자','무엇으로 이 사람을 식별하는가','▤','IDENTITY'],
 [ 2,'최근 5년 핵심 성과','평가 대상 구간의 실적','▦','PERFORMANCE'],
 [ 3,'대표 연구성과 5편','가장 강한 논문과 그 근거','★','TOP WORKS'],
 [ 4,'연도별 생산량과 지속성','끊긴 해가 있는가','◈','CONTINUITY'],
 [ 5,'저자역할과 환산기여량','주도인가 참여인가','◑','AUTHOR ROLE'],
 [ 6,'FWCI · 피인용 영향력','세계 평균 대비 몇 배','◍','IMPACT'],
 [ 7,'연구분야 지문과 변화','분야가 옮겨갔는가','◎','FIELD SHIFT'],
 [ 8,'학술지 포트폴리오','어디에 싣는가','▩','PORTFOLIO'],
 [ 9,'협력 연구와 공저 관계망','누구와 반복하는가','◇','COLLABORATION'],
 [10,'동일 계열 · 학과 비교','같은 조건에서 어디쯤','⚖','BENCHMARK'],
 [11,'데이터 신뢰도와 확인필요','이 수치를 믿어도 되는가','◐','RELIABILITY'],
];

/* 좌측 — 스마트폰 메인화면처럼 «이 사람이 누구인가» 를 한 장으로.
   숫자를 늘어놓지 않고 신원 → 점수 → 식별자 → 지표 → 대표작 순으로 좁혀 간다. */
function prCard(o,B){
 const R=B?B.rec:null, P=B?B.ps:null;
 const init=(o.name||'?').slice(0,1);
 const ss2=(PRA&&PRA.summary_stats)||{};
 const cite=B?P.reduce((a,x)=>a+(x.c||0),0):(o.c||0);
 const pct=R&&R.Spct!=null?R.Spct:null;
 const band=pct==null?null:(pct<10?'학과 상위 10%':pct<25?'학과 상위 25%':pct<50?'학과 상위 50%':'학과 50% 밖');
 const ids=[['ORCID',!!(PRA&&PRA.orcid)],['SCOPUS',!!o.sid],['WOS',false]];
 const top=B?P.slice().sort((a,b)=>(b.sc||0)-(a.sc||0)).slice(0,3):[];
 const yrs=B?P.map(x=>+x.y).filter(Boolean):[];
 const span=yrs.length?`${Math.min(...yrs)}–${Math.max(...yrs)}`:'';
 return `<aside class="prcard">
  <div class="pcTop">
   <div class="pcAv">${esc(init)}</div>
   ${B&&B.gy?`<span class="pcGy">${esc(B.gy)} 계열</span>`:''}
   <h3>${esc(o.name)}</h3>
   <div class="pcSub">${esc(B?B.dept:(o.dept||o.aff||'소속 미상'))}${o.job?' · '+esc(o.job):(B?' · '+esc(B.kind):'')}${span?` · ${span}`:''}</div>
  </div>
  ${R&&R.RQ!=null?`<div class="pcScore">
    <span class="a">S ${N(Math.round(R.RQ))}</span>
    <span class="b">${band||'구간 미산출'}</span></div>`
   :`<div class="pcScore off"><span class="a">OpenAlex</span>
      <span class="b">${esc(oaInst(PRA||{})||o.aff||'경력 전체 기준')}</span></div>`}
  <div class="pcChips">
   ${ids.map(([k,ok])=>`<span class="pcChip${ok?' ok':''}">${k} ${ok?'✓':'—'}</span>`).join('')}
   ${B?`<span class="pcChip n">확정 ${N(P.length)}편</span>`:''}
  </div>
  <div class="pcMet">
   <div><b>${B?N(P.length):(o.t!=null?N(o.t):'—')}</b><span>논문</span>
    <em>${PRA?'경력 '+N(PRA.works_count):'2020–2025'}</em></div>
   ${R&&R.RQ!=null
    ? `<div><b>${N(Math.round(R.RQ))}</b><span>환산점수</span>
       <em>환산 ${(R.Sn||0).toFixed(1)}편</em></div>`
    : `<div><b>${ss2.h_index!=null?N(ss2.h_index):'—'}</b><span>h-index</span>
       <em>${ss2['2yr_mean_citedness']!=null?'2년 '+(+ss2['2yr_mean_citedness']).toFixed(1):'OpenAlex'}</em></div>`}
   <div><b>${N(cite)}</b><span>피인용</span>
    <em>${PRA?'경력 '+N(PRA.cited_by_count):'우리 기준'}</em></div>
  </div>
  ${top.length?`<div class="pcSec">대표 연구성과</div>
   ${top.map(x=>`<div class="pcW g${x.gs==null?0:x.gs}">
     <div class="t">${esc(x.t||'')}</div>
     <div class="m">${esc(x.y)} <i>${esc((x.j||'').slice(0,34))}</i></div>
     <div class="k">피인용 <b>${N(x.c||0)}</b> · 등급 <b>${x.gs==null?'—':x.gs}</b>
      · ${esc(x.r||'')} · 기여 <b>${(x.gw||0)===1?'1':'0.5'}</b></div></div>`).join('')}`
   : (PRTOP&&PRTOP.length)?`<div class="pcSec">인용 많은 논문 <em>OpenAlex</em></div>
      ${PRTOP.slice(0,3).map(w=>{const j=((w.primary_location||{}).source||{}).display_name||'';
        return `<div class="pcW"><div class="t">${esc(w.display_name||'')}</div>
        <div class="m">${esc(String(w.publication_year||''))} <i>${esc(j.slice(0,34))}</i></div>
        <div class="k">피인용 <b>${N(w.cited_by_count||0)}</b></div></div>`;}).join('')}`
   : PRBUSY?`<div class="pcSec">대표 연구성과</div>
      <div class="pcLoad">OpenAlex 에서 받는 중…</div>`
   : `<div class="pcSec">대표 연구성과</div>
      <div class="pcLoad">논문을 찾지 못했습니다.</div>`}
 </aside>`;
}
/* 팝업 대상 → 우리 데이터. 교내 공저자라도 BK21 참여자가 아니면 null 이다. */
function prBK(o){
 const key=String(o.key||'');
 const sid=key.charAt(0)==='s'?key.slice(1):null;
 if(!sid||typeof DATA==='undefined'||!DATA.papers) return null;
 const ps=DATA.papers[sid]; if(!ps) return null;
 let rec=null,dept=null,kind='',gy='';
 for(const d in DATA.depts){ const D=DATA.depts[d];
  for(const p of (D.profs||[])){
   if(p.sid===sid){rec=p;dept=d;kind='참여교수';break;}
   for(const k of (p.kids||[])) if(k.sid===sid){rec=k;dept=d;kind='대학원생';break;}
   if(rec) break; }
  if(!rec) for(const u of (D.unassigned||[])) if(u.sid===sid){rec=u;dept=d;kind='참여자';break;}
  if(rec){ gy=(DATA.stats[d]||{}).gy||''; break; } }
 if(!rec) return null;
 return {sid,ps,rec,dept,kind,gy};
}
const prNone=(t,why)=>`<div class="prempty"><b>${esc(t)}</b><span>${why}</span></div>`;
const prKV=(rows)=>`<div class="prgrid">${rows.map(([k,v,s])=>
  `<div class="prcell"><div class="k">${esc(k)}</div><div class="v">${v}</div>
   ${s?`<div class="s">${s}</div>`:''}</div>`).join('')}</div>`;

function prTabBody(o,B){
 const P=B?B.ps:null, R=B?B.rec:null;
 const yrs=['2020','2021','2022','2023','2024','2025'];
 switch(PRTAB){

 case 1: {
  const ids=[['ORCID',PRA&&PRA.orcid?'확보':'없음'],['SCOPUS AUID',o.sid?'확보':'없음'],
            ['OpenAlex',PRA?'확보':'없음']];
  const got=ids.filter(x=>x[1]==='확보').length;
  return `${ins(`식별자는 <b>동명이인 오귀속을 막는 최소 장치</b>입니다.
   ORCID·Scopus·OpenAlex가 모두 없으면 이름만으로 논문을 붙이게 되어 확정률이 떨어집니다.`)}
  ${prKV([['소속',`<b>${esc(B?B.dept:(o.dept||o.aff||'미상'))}</b>`,esc(o.job||(B?B.kind:''))],
    ['식별자',`${got}<span class="u">/3</span>`,'ORCID · SCOPUS · OpenAlex'],
    B?['확정 논문',`${N(P.length)}<span class="u">편</span>`,'BIBLO Scholar 기준']
     :['논문',PRA?`${N(PRA.works_count)}<span class="u">편</span>`:'—','OpenAlex 경력 전체']])}
  <div class="prlist">${ids.map(([k,v])=>`<div class="prrow ${v==='확보'?'ok':'no'}">
    <span class="d"></span><b>${k}</b><span class="r">${v}</span></div>`).join('')}</div>
  ${B?'':`<div class="prfn">BK21 참여자가 아닙니다. 환산점수·등급은 사업 참여자만 산출하므로
   아래 화면은 <b>OpenAlex 기준</b>으로 채웁니다.</div>`}
  ${(()=>{const ev=B?P.slice().sort((a,b)=>(b.sc||0)-(a.sc||0)).slice(0,4)
     .map(x=>({t:x.t,y:x.y,j:x.j,c:x.c,g:x.gs,r:x.r}))
    :((PRTOP||[]).slice(0,4).map(w=>({t:w.display_name,y:w.publication_year,
      j:((w.primary_location||{}).source||{}).display_name||'',c:w.cited_by_count,g:null,r:''})));
   if(!ev.length) return '';
   return `<div class="prsub">근거 논문 <em>${B?'환산점수 상위':'인용 상위'}</em></div>
    <div class="prev">${ev.map(x=>`<div class="prevw">
      <div class="t">${esc(x.t||'')}</div>
      <div class="j">${esc((x.j||'').slice(0,44))}</div>
      <div class="tg"><span>${esc(String(x.y||''))}</span>
       ${x.g!=null?`<span class="gtag g${x.g}">${x.g}</span>`:''}
       <span>피인용 ${N(x.c||0)}</span>${x.r?`<span>${esc(x.r)}</span>`:''}</div></div>`).join('')}</div>`;})()}`;
 }

 case 2: {
  if(!B){
   const cy=((PRA&&PRA.counts_by_year)||[]).slice().sort((a,b)=>b.year-a.year);
   const r5=cy.slice(0,5);
   const w5=r5.reduce((a,x)=>a+(x.works_count||0),0), c5=r5.reduce((a,x)=>a+(x.cited_by_count||0),0);
   if(!cy.length&&o.t==null) return prNone('실적을 낼 자료가 없습니다','우리 원장에도 OpenAlex 에도 이 사람의 값이 없습니다.');
   return `${ins(cy.length
    ? `<b>OpenAlex 기준</b> 최근 5년입니다. BK21 참여자가 아니라 우리 환산점수는 없지만,
       발표량과 피인용은 그대로 볼 수 있습니다. 최근 5년에 <b>${N(w5)}편</b>을 냈고
       그 사이 <b>${N(c5)}회</b> 인용됐습니다.`
    : `OpenAlex 연도별 자료가 없어 우리 원장에서 잡힌 값만 보여 드립니다.`)}
   ${prKV([['최근 5년 논문',cy.length?`${N(w5)}<span class="u">편</span>`:'—',cy.length?`${r5[r5.length-1].year}–${r5[0].year}`:'OpenAlex 자료 없음'],
     ['최근 5년 피인용',cy.length?`${N(c5)}<span class="u">회</span>`:'—','같은 기간'],
     ['전체 논문',PRA?`${N(PRA.works_count)}<span class="u">편</span>`:'—','경력 전체'],
     ['전체 피인용',PRA?`${N(PRA.cited_by_count)}<span class="u">회</span>`:'—','경력 전체']])}
   ${prKV([['우리와의 접점',o.t!=null?`${N(o.t)}<span class="u">편</span>`:'—',o.kind==='ext'?'공저 편수':'BIBLO Scholar'],
     ['이 분야 논문',o.f!=null?`${N(o.f)}<span class="u">편</span>`:'—','선택한 분야'],
     ['FWCI',o.w!=null&&o.w!==''?(+o.w).toFixed(2):'—','세계 평균 1.0'],
     ['환산점수','—','BK21 참여자만 산출']])}`;
  }
  const S=R.RQ||0, ai=R.n_ai||0;
  return `${ins(`평가 대상 구간(2020~2025)의 실적입니다.
   <b>환산점수</b>는 학술지 등급에 저자 역할 가중을 곱해 더한 값입니다 —
   많이 쓰는 것과 주도해서 쓰는 것을 갈라 봅니다.`)}
  ${prKV([['환산점수 RQ',`${N(Math.round(S))}`,'학술지+학술대회+AI'],
    ['환산편수',`${(R.Sn||0).toFixed(1)}<span class="u">편</span>`,'주저자 1 · 공저자 1/2'],
    ['논문',`${N(P.length)}<span class="u">편</span>`,'2020~2025'],
    ['AI 관련 논문',`${N(ai)}<span class="u">편</span>`,'환산점수와 별도']])}
  ${prKV([['IQ 소통역량',`${N(Math.round(R.IQ||0))}`,`해외공동연구 ${N(R.n_intl||0)}편`],
    ['SQ 사회기여',`${N(Math.round(R.SQ||0))}`,`산업계 협업 ${N(R.n_ind||0)}편`],
    ['LQ 교육역량','—','미수집 · 학사 시스템 자료']])}`;
 }

 case 3: {
  if(!B) return PRTOP&&PRTOP.length?`${ins('OpenAlex 기준 인용 상위 논문입니다.')}${PRTOP.map(prWork).join('')}`
    :prNone('대표 성과를 못 찾았습니다','OpenAlex 프로필이 없습니다.');
  const top=P.slice().sort((a,b)=>(b.sc||0)-(a.sc||0)||(b.c||0)-(a.c||0)).slice(0,5);
  return `${ins(`<b>점수가 높은 순</b>입니다. 인용이 아니라 <b>학술지 급과 저자 역할</b>로 매긴 값이라
   「이 사람이 어디에 주도해서 실었나」가 보입니다.`)}
  ${top.map(x=>`<div class="prw"><div class="t">${esc(x.t||'')}</div>
    <div class="m">${esc(x.y)} · ${esc(x.j||'')}</div>
    <div class="tags"><span class="gtag g${x.gs==null?0:x.gs}">${x.gs==null?'—':x.gs}</span>
     <span class="tg">${esc(x.why||'')}</span><span class="tg">${esc(x.r||'')}</span>
     <span class="tg sc">${(x.sc||0).toFixed(1)}점</span>
     ${x.ai===1?'<span class="tg ai">AI</span>':''}</div></div>`).join('')}`;
 }

 case 4: {
  if(!B){
   const cy=((PRA&&PRA.counts_by_year)||[]).slice().sort((a,b)=>a.year-b.year).slice(-10);
   if(!cy.length) return prNone('연도별 자료가 없습니다','OpenAlex 프로필에 연도별 값이 없습니다.');
   const mx=Math.max(...cy.map(x=>x.works_count||0),1);
   const gap=cy.filter(x=>!x.works_count).map(x=>x.year);
   return `${ins(gap.length
    ? `<b>${gap.join('·')}년에 논문이 없습니다.</b> 안식년·이직·과제 종료처럼 이유가 있을 수 있어
       숫자만으로 판단하지 마십시오. <b>OpenAlex 기준</b>입니다.`
    : `최근 ${cy.length}년 모두 논문이 있습니다. <b>끊긴 해가 없습니다.</b> OpenAlex 기준입니다.`)}
   <div class="prbars">${cy.map(x=>`<div class="prbar">
     <i style="height:${Math.max(3,(x.works_count||0)/mx*92)}px"></i>
     <b>${x.works_count||0}</b><span>${String(x.year).slice(2)}</span></div>`).join('')}</div>`;
  }
  const c={}; yrs.forEach(y=>c[y]=P.filter(x=>x.y===y).length);
  const mx=Math.max(...Object.values(c),1);
  const gap=yrs.filter(y=>!c[y]);
  return `${ins(gap.length
   ? `<b>${gap.join('·')}년에 논문이 없습니다.</b> 안식년·이직·과제 종료처럼 이유가 있을 수 있어
      숫자만으로 판단하지 마십시오.`
   : `여섯 해 모두 논문이 있습니다. <b>끊긴 해가 없다</b>는 것은 연구가 이어졌다는 신호입니다.`)}
  <div class="prbars">${yrs.map(y=>`<div class="prbar"><i style="height:${Math.max(3,c[y]/mx*92)}px"></i>
    <b>${c[y]}</b><span>${y.slice(2)}</span></div>`).join('')}</div>`;
 }

 case 5: {
  if(!B){
   /* OpenAlex 는 «제1·중간·마지막» 과 교신 여부를 준다. 우리 원장의 역할 코드와 뜻이 다르지만
      «주도인가 참여인가» 라는 물음에는 답할 수 있다. 기준이 다르다는 것을 화면에 밝힌다. */
   const ws=[...(PRTOP||[]),...(PRNEW||[])];
   const seen=new Set(), rows=[];
   ws.forEach(w=>{ if(seen.has(w.id)) return; seen.add(w.id);
    const a=(w.authorships||[]).find(x=>x.author&&PRA&&oaId(x.author.id)===oaId(PRA.id));
    if(a) rows.push({pos:a.author_position,corr:!!a.is_corresponding}); });
   if(!rows.length) return prNone('역할을 낼 자료가 없습니다',
     'OpenAlex 논문에서 이 사람의 저자 위치를 찾지 못했습니다.');
   const first=rows.filter(x=>x.pos==='first').length;
   const last=rows.filter(x=>x.pos==='last').length;
   const corr=rows.filter(x=>x.corr).length;
   const mid=rows.length-first-last;
   const lead=rows.filter(x=>x.pos==='first'||x.corr).length;
   return `${ins(`표본 <b>${rows.length}편</b>(OpenAlex 인용상위·최신) 기준으로
     <b>제1저자 또는 교신저자가 ${lead}편</b>입니다.
     우리 원장의 역할 코드와 기준이 달라 환산점수에는 쓰지 않습니다.`,'warn')}
   <div class="prsplit"><i class="a" style="width:${lead/rows.length*100}%"></i>
    <i class="b" style="width:${(rows.length-lead)/rows.length*100}%"></i></div>
   <div class="prlg"><span><em class="a"></em>주도 ${N(lead)}편</span>
    <span><em class="b"></em>참여 ${N(rows.length-lead)}편</span></div>
   <div class="prlist">
    <div class="prrow"><b>제1저자</b><span class="r">${N(first)}편</span></div>
    <div class="prrow"><b>교신저자</b><span class="r">${N(corr)}편</span></div>
    <div class="prrow"><b>마지막 저자</b><span class="r">${N(last)}편</span></div>
    <div class="prrow"><b>중간 저자</b><span class="r">${N(mid)}편</span></div></div>`;
  }
  const MAINR=['단독','제1','교신','제1+교신'];
  const cnt={}; P.forEach(x=>cnt[x.r]=(cnt[x.r]||0)+1);
  const main=MAINR.reduce((a,k)=>a+(cnt[k]||0),0), co=(cnt['공저']||0);
  const tot=main+co||1;
  return `${ins(`<b>주저자</b>는 그 논문을 이끈 사람(제1·교신·단독), <b>공저자</b>는 참여한 사람입니다.
   환산할 때 주저자는 점수를 다 받고 공저자는 절반을 받습니다.
   주저자 비중이 <b>${Math.round(main/tot*100)}%</b>입니다.`)}
  <div class="prsplit"><i class="a" style="width:${main/tot*100}%"></i><i class="b" style="width:${co/tot*100}%"></i></div>
  <div class="prlg"><span><em class="a"></em>주저자 ${N(main)}편</span><span><em class="b"></em>공저자 ${N(co)}편</span></div>
  <div class="prlist">${Object.entries(cnt).sort((a,b)=>b[1]-a[1]).map(([k,v])=>
    `<div class="prrow"><b>${esc(k)}</b><span class="r">${N(v)}편</span></div>`).join('')}</div>`;
 }

 case 6: {
  const ss=(PRA&&PRA.summary_stats)||{};
  const fw=o.w!=null&&o.w!==''?(+o.w):null;
  return `${ins(`<b>FWCI</b>는 같은 분야·같은 해 논문의 세계 평균을 1.0으로 놓았을 때 몇 배로 인용되는가입니다.
   ${fw!=null?`이 사람은 <b>${fw.toFixed(2)}배</b>입니다.`:''}
   편수가 적으면 한두 편이 값을 크게 흔듭니다.`)}
  ${prKV([['FWCI',fw!=null?fw.toFixed(2):'—','세계 평균 1.0'],
    ['인용 (우리 기준)',o.c!=null?N(o.c)+'<span class="u">회</span>':'—','BIBLO Scholar'],
    ['누적 피인용',PRA?N(PRA.cited_by_count)+'<span class="u">회</span>':'—','OpenAlex 경력 전체'],
    ['h-index',ss.h_index!=null?N(ss.h_index):'—','OpenAlex']])}`;
 }

 case 7: {
  if(!B) return PRA&&(PRA.topics||[]).length
    ? `${ins('OpenAlex가 매긴 연구 주제입니다.')}<div class="prlist">${(PRA.topics||[]).slice(0,8).map(t=>
        `<div class="prrow"><b>${esc(t.display_name)}</b><span class="r">${N(t.count||0)}</span></div>`).join('')}</div>`
    : prNone('분야 자료가 없습니다','OpenAlex 프로필을 찾지 못했습니다.');
  const c={}; P.forEach(x=>{const f=x.f||'(미분류)'; c[f]=(c[f]||0)+1;});
  /* 우리 원장의 분야 칸이 비어 있는 사람이 많다. 그럴 때 «(미분류) 339편» 만 띄우면
     아무 말도 안 하는 화면이 된다. OpenAlex 가 매긴 주제로 넘어간다. */
  const onlyU=Object.keys(c).length===1&&c['(미분류)'];
  if(onlyU){
   const tp=(PRA&&PRA.topics)||[];
   return `${ins(tp.length
     ? `우리 원장에는 <b>분야 값이 비어 있어</b> OpenAlex 가 매긴 주제로 대신 보여 드립니다.
        상위 주제가 <b>${esc(tp[0].display_name)}</b>입니다.`
     : `우리 원장에 분야 값이 없고 OpenAlex 주제도 못 찾았습니다.`, 'warn')}
    ${tp.length?`<div class="prlist">${tp.slice(0,8).map(t=>
      `<div class="prrow"><b>${esc(t.display_name)}</b><span class="r">${N(t.count||0)}</span></div>`).join('')}</div>`
     :prNone('분야를 낼 수 없습니다','원장의 분야 칸이 비어 있고 OpenAlex 프로필도 없습니다.')}`;
  }
  const top=Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const half=Math.ceil(P.length/2), early={},late={};
  P.forEach(x=>{const t=+x.y<=2022?early:late; const f=x.f||'(미분류)'; t[f]=(t[f]||0)+1;});
  const e1=Object.entries(early).sort((a,b)=>b[1]-a[1])[0], l1=Object.entries(late).sort((a,b)=>b[1]-a[1])[0];
  return `${ins(e1&&l1&&e1[0]!==l1[0]
   ? `전반기 주력은 <b>${esc(e1[0])}</b>, 후반기는 <b>${esc(l1[0])}</b>입니다. <b>분야가 옮겨갔습니다.</b>`
   : `주력 분야가 전·후반기 모두 같습니다. <b>한 분야를 이어서 파고 있습니다.</b>`)}
  <div class="prlist">${top.map(([f,v])=>`<div class="prrow"><b>${esc(f)}</b>
    <span class="r">${N(v)}편</span></div>`).join('')||prNone('분야 표기가 없습니다','원천에 분야 값이 비어 있습니다.')}</div>`;
 }

 case 8: {
  if(!B){
   const ws=[...(PRTOP||[]),...(PRNEW||[])], seen=new Set(), c2={};
   ws.forEach(w=>{ if(seen.has(w.id)) return; seen.add(w.id);
    const j=((w.primary_location||{}).source||{}).display_name; if(j) c2[j]=(c2[j]||0)+1; });
   const t2=Object.entries(c2).sort((a,b)=>b[1]-a[1]);
   if(!t2.length) return prNone('게재지를 낼 자료가 없습니다','OpenAlex 논문에 게재지 정보가 없습니다.');
   return `${ins(`<b>OpenAlex 인용상위·최신 ${seen.size}편</b>에서 뽑은 게재지입니다.
     전체 논문이 아니라 표본이라 비중이 아니라 <b>어떤 학술지에 싣는지</b>를 보는 용도입니다.
     등급은 BK21 참여자만 매깁니다.`,'warn')}
   <div class="prlist">${t2.map(([j,v])=>`<div class="prrow"><b>${esc(j)}</b>
     <span class="r">${N(v)}편</span></div>`).join('')}</div>`;
  }
  const c={}; P.forEach(x=>c[x.j]=(c[x.j]||0)+1);
  const top=Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const g={}; P.forEach(x=>{const k=x.gs==null?0:x.gs; g[k]=(g[k]||0)+1;});
  const hi=(g[6]||0)+(g[5]||0);
  return `${ins(`<b>상위 등급(6·5)에 실은 논문이 ${N(hi)}편</b>, 전체의 ${Math.round(hi/P.length*100)}%입니다.
   같은 편수라도 어디에 실었는지에 따라 평가가 갈립니다.`)}
  ${gradeBand(P)}
  <div class="prlist">${top.map(([j,v])=>`<div class="prrow"><b>${esc(j)}</b>
    <span class="r">${N(v)}편</span></div>`).join('')}</div>`;
 }

 case 9: {
  const w=(o.with_||[]);
  if(!B){
   /* 우리 원장에 관계가 없으면 OpenAlex 논문의 공저자로 만든다.
      «같은 사람과 반복해서 쓰는가» 는 표본으로도 보인다. */
   const ws=[...(PRTOP||[]),...(PRNEW||[])], seen=new Set(), co={}, inst={};
   ws.forEach(x=>{ if(seen.has(x.id)) return; seen.add(x.id);
    (x.authorships||[]).forEach(a=>{
     const nm=a.author&&a.author.display_name; if(!nm||nm===o.name) return;
     co[nm]=(co[nm]||0)+1;
     (a.institutions||[]).forEach(i=>{ if(i.display_name) inst[i.display_name]=(inst[i.display_name]||0)+1; });});});
   const top=Object.entries(co).sort((a,b)=>b[1]-a[1]).slice(0,16);
   const it=Object.entries(inst).sort((a,b)=>b[1]-a[1]).slice(0,10);
   if(!top.length) return prNone('공저자를 찾지 못했습니다','OpenAlex 논문에 저자 정보가 없습니다.');
   const rep=top.filter(([,v])=>v>=2).length;
   return `${ins(`표본 <b>${seen.size}편</b>에서 공저자 <b>${N(Object.keys(co).length)}명</b>이 잡혔고,
     그중 <b>${rep}명</b>과는 두 편 이상 함께 썼습니다.
     <b>반복해서 쓰는 상대</b>가 그 사람의 실제 연구 파트너입니다. OpenAlex 표본 기준입니다.`,'warn')}
   <div class="prsub">자주 함께 쓴 사람</div>
   <div class="prchips">${top.map(([n2,v])=>`<span class="prchip${v>=2?' hot':''}">${esc(n2)}${v>=2?` ·${v}`:''}</span>`).join('')}</div>
   ${it.length?`<div class="prsub">공저 기관</div>
    <div class="prchips">${it.map(([n2,v])=>`<span class="prchip">${esc(n2)} ·${v}</span>`).join('')}</div>`:''}`;
  }
  const kids=(R&&R.kids)||[];
  return `${ins(`<b>같은 사람과 반복해서 쓰는지</b>가 협업의 깊이입니다.
   한 사람에게 몰려 있으면 그 관계가 끊길 때 실적도 함께 흔들립니다.`)}
  ${w.length?`<div class="prsub">함께 쓴 학과 ${w.length}곳</div>
   <div class="prchips">${w.map(x=>`<span class="prchip">${esc(x)}</span>`).join('')}</div>`:''}
  ${kids.length?`<div class="prsub">공저 중심 연결학생 ${kids.length}명</div>
   <div class="prchips">${kids.slice(0,14).map(k=>`<span class="prchip">${esc(k.name||'')}</span>`).join('')}</div>`:''}
  ${!w.length&&!kids.length?prNone('연결이 잡히지 않았습니다','공저 관계가 원장에 기록되지 않았습니다.'):''}`;
 }

 case 10: {
  if(!B){
   const d=o.dept||'', st2=(typeof DATA!=='undefined'&&DATA.stats)?DATA.stats[d]:null;
   const gy2=st2?st2.gy:null, gyo2=gy2?((DATA.gyo||{})[gy2]||{}):null;
   if(!st2) return prNone('비교할 기준이 없습니다',
     '이 사람의 소속 학과가 BK21 사업단에 없어 견줄 기준선이 없습니다.');
   return `${ins(`이 사람은 BK21 참여자가 아니라 <b>본인 환산점수가 없습니다.</b>
     대신 <b>소속 학과의 참여교수 기준선</b>을 보여 드립니다.
     같은 학과에서 사업에 참여한 교수들이 어느 수준인지 가늠하는 용도입니다.`,'warn')}
   ${prKV([['본인 환산점수','—','BK21 미참여'],
     ['학과 1인당',st2.Savg!=null?N(Math.round(st2.Savg)):'—',esc(d)],
     ['계열 1인당',gyo2&&gyo2.Savg!=null?N(Math.round(gyo2.Savg)):'—',esc(gy2||'')],
     ['학과 참여교수',st2.prof!=null?`${N(st2.prof)}<span class="u">명</span>`:'—','사업 참여 인원']])}`;
  }
  const st=DATA.stats[B.dept]||{}, gyo=(DATA.gyo||{})[B.gy]||{};
  const pct=R.Spct;
  return `${ins(pct!=null
   ? `같은 학과 안에서 <b>상위 ${pct<10?'10':pct<25?'25':pct<50?'50':'50 밖'}%</b> 구간입니다.
      <b>등수는 매기지 않습니다</b> — 미판정 논문이 남아 있어 등수가 자료 정비 순서가 되기 쉽습니다.`
   : `학과 안 위치는 아직 내지 않습니다.`)}
  ${prKV([['본인 환산점수',N(Math.round(R.RQ||0)),''],
    ['학과 1인당',st.Savg!=null?N(Math.round(st.Savg)):'—',esc(B.dept)],
    ['계열 1인당',gyo.Savg!=null?N(Math.round(gyo.Savg)):'—',esc(B.gy)],
    ['학과 내 구간',pct!=null?(pct<10?'상위 10%':pct<25?'상위 25%':pct<50?'상위 50%':'50% 밖'):'—','순위 아님']])}`;
 }

 case 11: {
  const flags=[];
  if(B&&R.need) flags.push(['매칭 신뢰도',R.conf||'—','0.7 미만이면 다른 사람이 섞였을 수 있습니다']);
  if(B) flags.push(['미판정 논문',`${N(R.undet||0)}편`,'등급을 못 붙인 논문. 실적이 없는 게 아닙니다']);
  if(o.active===0) flags.push(['재직 상태','현직 아님','인사DB 기준']);
  if(o.by==='이름') flags.push(['프로필 매칭','이름으로 찾음','동명이인이 섞일 수 있습니다']);
  if(!PRA) flags.push(['OpenAlex','프로필 없음','경력 전체 수치를 낼 수 없습니다']);
  return `${ins(`<b>이 수치를 믿어도 되는지</b>를 따지는 칸입니다.
   숫자가 낮은 것과 자료가 덜 붙은 것은 다릅니다. 아래에 걸린 항목이 있으면 먼저 확인하십시오.`,
   flags.length?'warn':null)}
  ${flags.length?`<div class="prlist">${flags.map(([k,v,s])=>
    `<div class="prrow warn"><b>${esc(k)}</b><span class="r">${esc(v)}</span>
     <div class="s">${esc(s)}</div></div>`).join('')}</div>`
   :prNone('걸린 항목이 없습니다','식별자·매칭·재직 상태에 이상이 없습니다.')}`;
 }
 }
 return '';
}


/* ══════════════════════════════════════════════════════════════════
   어댑터 — 우리 데이터(bk21_tree + OpenAlex)를 원본 P 모양으로 바꾼다.
   원본 차트 코드를 고치지 않기 위한 유일한 접점이다. 원본이 개정되면
   여기만 손보면 된다.
   ══════════════════════════════════════════════════════════════════ */
const RP_MAIN=new Set(['단독','제1','교신','제1+교신']);
/* 우리 등급(0~6) → 원본 등급(0~4). 원본 GN=['등급없음','KCI','SCI','상위','최상위'] */
function rpGrade(gs){ if(gs==null||gs===0) return 0; if(gs<=2) return 1; if(gs===3) return 2;
  if(gs<=5) return 3; return 4; }
function rpWorks(){ const seen=new Set(),out=[];
  for(const w of [...(PRTOP||[]),...(PRNEW||[])]){ if(seen.has(w.id)) continue; seen.add(w.id);
    out.push({t:w.display_name||'', j:((w.primary_location||{}).source||{}).display_name||'',
      y:w.publication_year||0, c:w.cited_by_count||0, g:0, f:null, cn:null, pe:null,
      n:(w.authorships||[]).length||1,
      L:!!(w.authorships||[]).find(a=>a.author&&PRA&&oaId(a.author.id)===oaId(PRA.id)
          &&(a.author_position==='first'||a.is_corresponding)),
      w:1/Math.max((w.authorships||[]).length,1), mc:null}); }
  return out; }

function toPerfShape(o,B){
 const ss=(PRA&&PRA.summary_stats)||{};
 const cy=((PRA&&PRA.counts_by_year)||[]).slice().sort((a,b)=>a.year-b.year);
 const P=B?B.ps:[];
 const now=2026, y5=now-4;

 /* 논문 → 원본 레코드 */
 const rec=x=>({t:x.t||'', j:x.j||'', y:+x.y||0, c:x.c||0, g:rpGrade(x.gs),
   f:(x.if!=null&&x.if!=='')?+x.if:null, cn:null, pe:x.pct!=null?x.pct:null,
   n:1, L:RP_MAIN.has(x.r), w:x.gw||0, mc:null});
 const rows=B?P.map(rec):rpWorks();
 const r5rows=rows.filter(r=>r.y>=y5);

 const agg=list=>{
  const lead=list.filter(r=>r.L).length;
  const C=list.reduce((a,r)=>a+(r.c||0),0);
  const S=B?list.reduce((a,r,i)=>a+((P[i]&&P[i].sc)||0),0):0;
  const fws=list.map(r=>r.f).filter(v=>v!=null);
  return {p:list.length, S:+S.toFixed(1), E:+list.reduce((a,r)=>a+(r.w||0),0).toFixed(2),
   C, fw:fws.length?+(fws.reduce((a,b)=>a+b,0)/fws.length).toFixed(2):(o.w!=null&&o.w!==''?+(+o.w).toFixed(2):null),
   cn:null, lead, q1:list.filter(r=>r.g>=3).length, oa:list.filter(r=>r.pe!=null&&r.pe<=25).length};
 };
 const all=agg(rows), r5=agg(r5rows);
 /* 외부 조회가 막히면 rows 가 비어 모든 칸이 0 이 된다.
    보드가 이미 가진 값(이 분야 편수·공저 편수·인용·FWCI)이라도 넣어 «아무것도 없음» 을 면한다. */
 if(!B&&!PRA){
  if(o.t!=null&&!all.p) all.p=+o.t||0;
  if(o.c!=null&&!all.C) all.C=+o.c||0;
  if(o.w!=null&&o.w!==''&&all.fw==null) all.fw=+(+o.w).toFixed(2);
  if(o.f!=null&&!r5.p) r5.p=+o.f||0;
 }
 if(!B&&PRA){ all.p=PRA.works_count||rows.length; all.C=PRA.cited_by_count||all.C;
   const t5=cy.slice(-5); r5.p=t5.reduce((a,x)=>a+(x.works_count||0),0)||r5.p;
   r5.C=t5.reduce((a,x)=>a+(x.cited_by_count||0),0)||r5.C; }

 /* 연도별 [연,편수] */
 const yr = B ? (()=>{const c={}; P.forEach(x=>{const y=+x.y; if(y) c[y]=(c[y]||0)+1;});
     return Object.keys(c).map(Number).sort().map(y=>[y,c[y]]);})()
   : cy.map(x=>[x.year, x.works_count||0]);
 const ys=yr.map(r=>r[0]);
 const gaps=yr.filter(r=>!r[1]).length;
 let run=0,best=0; yr.forEach(r=>{ if(r[1]){run++; best=Math.max(best,run);} else run=0; });

 /* 역할 */
 const role = B ? (()=>{const c={first:0,corr:0,both:0,co:0,unk:0};
     P.forEach(x=>{ const r=x.r;
       if(r==='제1') c.first++; else if(r==='교신') c.corr++;
       else if(r==='제1+교신'||r==='단독') c.both++;
       else if(r==='공저') c.co++; else c.unk++; });
     return c;})()
   : (()=>{const c={first:0,corr:0,both:0,co:0,unk:0};
     [...(PRTOP||[]),...(PRNEW||[])].forEach(w=>{
       const a=(w.authorships||[]).find(x=>x.author&&PRA&&oaId(x.author.id)===oaId(PRA.id));
       if(!a){c.unk++;return;}
       const f=a.author_position==='first', k=!!a.is_corresponding;
       if(f&&k) c.both++; else if(f) c.first++; else if(k) c.corr++; else c.co++; });
     return c;})();

 /* 분야·게재지·공저자 */
 const cnt=(arr,key)=>{const c={}; arr.forEach(x=>{const k=key(x); if(k) c[k]=(c[k]||0)+1;}); return c;};
 const jrC = B ? cnt(P,x=>x.j) : cnt([...(PRTOP||[]),...(PRNEW||[])],
   w=>((w.primary_location||{}).source||{}).display_name);
 const subjC = B ? cnt(P,x=>x.f) : cnt((PRA&&PRA.topics)||[], t=>t.display_name);
 let subj=Object.entries(subjC).sort((a,b)=>b[1]-a[1]).slice(0,8);
 if(!subj.length&&PRA&&(PRA.topics||[]).length)
   subj=(PRA.topics||[]).slice(0,8).map(t=>[t.display_name,t.count||1]);
 /* 원장의 분야 칸이 비는 사람이 많다. 그럴 때 게재지 상위로 대신 그린다 —
    «분야» 는 아니지만 «무엇을 하는 사람인가» 는 그것으로도 보인다. */
 if(!subj.length) subj=Object.entries(jrC).sort((a,b)=>b[1]-a[1]).slice(0,8)
   .map(([j,n])=>[j.length>34?j.slice(0,32)+'…':j, n]);
 const jrs=Object.entries(jrC).sort((a,b)=>b[1]-a[1]).slice(0,7)
   .map(([j,n])=>{const sub=rows.filter(r=>r.j===j);
     return [j,n,Math.max(...sub.map(r=>r.g),0), sub.reduce((a,r)=>a+(r.c||0),0)];});
 const coaC={}; if(!B) [...(PRTOP||[]),...(PRNEW||[])].forEach(w=>(w.authorships||[]).forEach(a=>{
   const n2=a.author&&a.author.display_name; if(n2&&n2!==o.name) coaC[n2]=(coaC[n2]||0)+1;}));
 const coa = B
   ? [].concat(
       (o.with_||[]).map(d=>[d,'학과',1,0,0]),
       (B.rec.kids||[]).map(k=>[k.name||'', '지도학생', k.np||1, 0, 0])
     ).slice(0,14)
   : Object.entries(coaC).sort((a,b)=>b[1]-a[1]).slice(0,14).map(([n2,v])=>[n2,'교외',v,0,0]);

 /* 대표 5편 · 근거 논문 */
 const rep=rows.slice().sort((a,b)=>(b.g-a.g)||(b.c-a.c)).slice(0,5);
 const byC=rows.slice().sort((a,b)=>b.c-a.c);
 const ev={cited:byC.slice(0,6), recent:rows.slice().sort((a,b)=>b.y-a.y).slice(0,6),
   rep:rep, lead:rows.filter(r=>r.L).slice(0,6), jr:rows.slice(0,6),
   top:byC.slice(0,6), risk:rows.filter(r=>r.g===0).slice(0,6), old:rows.slice(0,6)};

 /* 신뢰도 */
 const trust={total:all.p, conf:B?P.length:(PRA?PRA.works_count:0), pend:0, excl:0,
   orcid:!!(PRA&&PRA.orcid), auid:!!o.sid, wos:false, conflict:0,
   nograde:rows.filter(r=>r.g===0).length, nofwci:rows.filter(r=>r.f==null).length,
   lowmatch:(B&&B.rec.need)?1:0, confp:B?1:0, pending:0};

 /* 비교군 백분위 — 학과 참여교수 안에서 잡는다. 없으면 null 로 두어 «미수집» 이 그려진다. */
 let peer={n:0,nf:0,S:null,p:null,C:null,fw:null,lead:null,q1:null,h:null,E:null,Sf:null};
 if(B&&DATA.stats[B.dept]){
  const arr=(DATA.depts[B.dept].profs||[]).map(x=>x.RQ||0).sort((a,b)=>a-b);
  const me=B.rec.RQ||0, r=arr.filter(v=>v<=me).length;
  const pc=arr.length?Math.round(r/arr.length*100):null;
  const gyo=(DATA.gyo||{})[B.gy]||{};
  peer={n:arr.length, nf:gyo.prof||0, S:pc, p:pc, C:null, fw:null, lead:null,
        q1:null, h:null, E:pc, Sf:pc};
 }

 return {dept:(B?B.dept:(o.dept||o.aff||'소속 미상')), pos:(o.job||(B?B.kind:'교외 연구자')),
  y0:ys.length?Math.min(...ys):0, y1:ys.length?Math.max(...ys):0,
  career:ys.length?(Math.max(...ys)-Math.min(...ys)+1):0,
  all, r5, yr, active:yr.filter(r=>r[1]).length, gaps, run:best, role,
  imp:{cmax:Math.max(...rows.map(r=>r.c||0),0), cmed:(()=>{const v=rows.map(r=>r.c||0).sort((a,b)=>a-b);
        return v.length?v[Math.floor(v.length/2)]:0;})(),
    czero:rows.filter(r=>!r.c).length, h:ss.h_index||0,
    fwhi:rows.filter(r=>r.f!=null&&r.f>=2).length, fwn:rows.filter(r=>r.f!=null).length,
    top10:rows.filter(r=>r.pe!=null&&r.pe<=10).length,
    top25:rows.filter(r=>r.pe!=null&&r.pe<=25).length},
  subj, kw:[],
  /* 저널 집중도(HHI) — 한 저널에 몰릴수록 높다. 0 으로 두면 화면이 «지금은 0» 이라 적는다. */
  /* 원본 화면이 hhi*1000 으로 그린다 — 즉 0~10 스케일의 «비율» 을 기대한다.
     여기서는 점유율 제곱합(0~1)을 넘긴다. 곱하면 0~1000 이 되어 원본 문구
     «1000 이상이면 편중» 과 맞는다. */
  hhi:(()=>{const v=Object.values(jrC), t=v.reduce((a,n)=>a+n,0)||1;
    return +v.reduce((a,n)=>a+Math.pow(n/t,2),0).toFixed(4);})(),
  jrs, coa, nco:B?(coa.length):Object.keys(coaC).length,
  rep, ev, trust, shift:subj.slice(0,7).map(([f,n])=>[f,n,n]), mid:0,
  field:(B?B.gy:'교외'), band:(B?B.kind:'교외'), peer,
  code:(o.name||''), _bk:!!B};
}

/* ══════════════════════════════════════════════════════════════════
   개인성과 대시보드 — biblo.ai/2026/#16 (biblo-researcher-perf.html) 이식
   원본 코드를 고치지 않는다. 이름 충돌(D·CUR·esc·svg·bars)을 피하려고
   전체를 IIFE 로 감싸고 필요한 것만 내보낸다.
   DOM 은 팝업 루트(.rpwrap) 안에서만 찾는다.
   ══════════════════════════════════════════════════════════════════ */
window.RP=(function(){
const RPQ=s=>document.querySelector('.rpwrap '+s);

const NOW=2026;
const GC=['#64748b','#2dd4bf','#38bdf8','#a78bfa','#f472b6'];
const GN=['등급없음','KCI','SCI/SCOPUS','상위25%','상위10%'];
const nf=n=>(n==null?'—':(+n).toLocaleString('ko-KR'));
const f1=n=>(n==null?'—':(+n).toFixed(1));
const f2=n=>(n==null?'—':(+n).toFixed(2));
const NS='http://www.w3.org/2000/svg';
function E(t,a,p){const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);
  if(p)p.appendChild(e);return e;}
function TX(p,x,y,s,o={}){const t=E('text',Object.assign({x,y,fill:o.f||'#93a6cc',
  'font-size':o.s||10,'font-weight':o.w||600,'text-anchor':o.a||'start',
  'font-family':o.m?'ui-monospace,Menlo,monospace':'inherit'},o.tr?{transform:o.tr}:{}),p);
  t.textContent=s;return t;}
function svg(box,vw,vh){box.innerHTML='';const s=E('svg',{viewBox:`0 0 ${vw} ${vh}`,
  preserveAspectRatio:'xMidYMid meet'},box);return s;}
function grad(s,id,c1,c2,vert){const d=E('defs',{},s);
  const g=E('linearGradient',{id,x1:0,y1:vert?0:0,x2:vert?0:1,y2:vert?1:0},d);
  E('stop',{offset:0,'stop-color':c1},g);E('stop',{offset:1,'stop-color':c2},g);return id;}

/* ── 섹션 정의 ── */
const ICON={
 id:'M7 4h10v3H7zM5 8h14v11H5z', y5:'M4 15h4v5H4zM10 9h4v11h-4zM16 4h4v16h-4z',
 star:'M12 3l2.6 5.6L21 9.4l-4.6 4.3 1.2 6.3L12 17l-5.6 3 1.2-6.3L3 9.4l6.4-.8z',
 line:'M3 17l5-6 4 3 5-8 4 4', pie:'M12 3v9h9a9 9 0 11-9-9z',
 imp:'M12 3l9 6-9 6-9-6z M3 15l9 6 9-6', shift:'M4 18l6-6 4 3 6-9',
 book:'M5 4h9a3 3 0 013 3v13H8a3 3 0 01-3-3z', net:'M12 5v6m0 0l-6 5m6-5l6 5',
 rank:'M4 20V9h4v11zM10 20V4h4v16zM16 20v-7h4v7z', shield:'M12 3l8 3v6c0 5-3.4 8.3-8 9-4.6-.7-8-4-8-9V6z'};
const SEC=[
 {n:'01',k:'IDENTITY',t:'연구자 · 소속 · 식별자',sub:'무엇으로 이 사람을 식별하는가',ic:'id',ev:'old'},
 {n:'02',k:'RECENT 5Y',t:'최근 5년 핵심 성과',sub:'평가 대상 구간의 실적',ic:'y5',ev:'recent'},
 {n:'03',k:'FLAGSHIP',t:'대표 연구성과 5편',sub:'가장 강한 논문과 그 근거',ic:'star',ev:'rep'},
 {n:'04',k:'CONTINUITY',t:'연도별 생산량과 지속성',sub:'끊긴 해가 있는가',ic:'line',ev:'old'},
 {n:'05',k:'ROLE & SHARE',t:'저자역할과 환산기여량',sub:'주도인가 참여인가',ic:'pie',ev:'lead'},
 {n:'06',k:'IMPACT',t:'FWCI · CNCI · 피인용 영향력',sub:'세계 평균 대비 몇 배',ic:'imp',ev:'cited'},
 {n:'07',k:'FIELD SHIFT',t:'연구분야 지문과 변화',sub:'분야가 옮겨갔는가',ic:'shift',ev:'recent'},
 {n:'08',k:'VENUES',t:'학술지 포트폴리오',sub:'어디에 싣는가',ic:'book',ev:'jr'},
 {n:'09',k:'COLLABORATION',t:'협력 연구와 공저 관계망',sub:'누구와 반복하는가',ic:'net',ev:'cited'},
 {n:'10',k:'PEER RANK',t:'동일 분야 · 경력구간 비교',sub:'같은 조건에서 어디쯤',ic:'rank',ev:'top'},
 {n:'11',k:'DATA TRUST',t:'데이터 신뢰도와 확인필요',sub:'이 수치를 믿어도 되는가',ic:'shield',ev:'risk'}];

let CUR=0, P=null, MODE='band';

/* ── 근거 논문 카드 ── */
function evCards(list,cap){
  return dedupe(list).slice(0,cap||4).map(r=>{
    const g=r.g||0, m=[];
    m.push(`<em>${r.y}</em>`);
    m.push(`<em class="${g>=3?'hi':''}">${GN[g]}</em>`);
    m.push(`<em>피인용 ${nf(r.c)}</em>`);
    if(r.f!=null) m.push(`<em class="${r.f>=2?'hi':''}">FWCI ${f2(r.f)}</em>`);
    if(r.pe!=null) m.push(`<em class="${r.pe<=25?'hi':''}">상위 ${f1(r.pe)}%</em>`);
    m.push(`<em class="${r.L?'led':''}">${r.L?'주도':'공동'} · ${r.n}인</em>`);
    m.push(`<em>기여 ${f2(r.w)}</em>`);
    if(r.mc!=null&&r.mc<0.7) m.push(`<em class="wr">매칭 ${f2(r.mc)}</em>`);
    return `<article class="ec"><span class="rpbar" style="background:${GC[g]}"></span>
      <h5>${esc(r.t)}</h5><div class="j">${esc(r.j||'게재처 미상')}</div>
      <div class="m">${m.join('')}</div></article>`;}).join('');
}
function dedupe(list){
  const seen=new Set(),out=[];
  for(const r of (list||[])){
    const k=(r.t||'').toLowerCase().replace(/[^a-z0-9가-힣]/g,'').slice(0,60);
    if(k&&seen.has(k))continue; seen.add(k); out.push(r);}
  return out;
}
function esc(s){return (s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}


/* ══ 차트 ══ 각 함수 → {title, note, draw(svgBox,w,h)} */
let W=490, H=300;

function bars(s,items,o={}){ // items:[{l,v,c,r}]
  const L=o.L??96, R=o.R??44, T=o.T??8, B=o.B??6;
  const n=items.length, gh=(H-T-B), bh=Math.min(o.bh||26, gh/n-6), gap=(gh-bh*n)/(n-1||1);
  const mx=Math.max(...items.map(d=>d.v),o.min||1);
  items.forEach((d,i)=>{
    const y=T+i*(bh+gap), bw=Math.max(2,(W-L-R)*d.v/mx);
    E('rect',{x:L,y,width:W-L-R,height:bh,rx:5,fill:'rgba(140,160,230,.08)'},s);
    E('rect',{x:L,y,width:bw,height:bh,rx:5,fill:d.c||'#818cf8',opacity:d.o??.92},s);
    TX(s,L-8,y+bh/2+3.6,d.l,{a:'end',s:o.ls||10.5,f:'#b6c4e6',w:700});
    TX(s,L+bw+7,y+bh/2+3.6,d.r??nf(d.v),{s:10,m:1,f:'#8fa2c9',w:700});
    if(d.s)TX(s,L+6,y+bh/2+3.6,d.s,{s:9.5,m:1,f:'rgba(255,255,255,.82)',w:700});
  });
}
function axis(s,x0,y0,x1,y1){E('line',{x1:x0,y1:y0,x2:x1,y2:y1,stroke:'rgba(140,160,230,.22)','stroke-width':1},s);}

/* ①  식별자 */
function c_id(p){const t=p.trust;
 return {ttl:'식별자 확보 상태와 논문 귀속',note:`식별자는 <b>동명이인 오귀속을 막는 최소 장치</b>다.
   ORCID·Scopus AUID·WoS RID가 모두 없으면 이름만으로 논문을 붙이게 되므로 확정률이 떨어진다.
   현재 확정 <b>${nf(t.conf)}편</b>, 보류 <b>${nf(t.pend)}편</b>.`,
  draw(box){const s=svg(box,W,H);
   const A=H*0.44, Bs=H*0.30;               // 구획 높이
   const ids=[['ORCID',t.orcid],['SCOPUS AUID',t.auid],['WOS RID',t.wos]];
   const rh=Math.min(46,(A-16)/3), gp=(A-16-rh*3)/2;
   ids.forEach((d,i)=>{const y=8+i*(rh+gp);
     E('rect',{x:0,y,width:W,height:rh,rx:11,fill:d[1]?'rgba(52,211,153,.11)':'rgba(100,116,139,.1)',
       stroke:d[1]?'rgba(52,211,153,.34)':'rgba(120,135,170,.24)'},s);
     E('circle',{cx:21,cy:y+rh/2,r:6.5,fill:d[1]?'#34d399':'#5d7099'},s);
     TX(s,38,y+rh/2+4,d[0],{s:11.5,m:1,w:700,f:d[1]?'#8df0c8':'#7e8fb4'});
     TX(s,W-13,y+rh/2+4,d[1]?'확보':'미확보',{a:'end',s:11,w:700,f:d[1]?'#34d399':'#5d7099'});});
   const y0=A+6; TX(s,0,y0,'논문 귀속 상태',{s:10,m:1,w:700,f:'#5d7099'});
   const tot=Math.max(t.total||1,1), bh=Math.min(34,Bs*.42);
   let x=0; [['확정',t.conf,'#38bdf8'],['보류',t.pend,'#fbbf24'],['제외',t.excl,'#64748b']]
    .forEach(d=>{const w=W*(d[1]||0)/tot; if(w>0){
     E('rect',{x,y:y0+13,width:Math.max(w-2,1),height:bh,rx:6,fill:d[2],opacity:.9},s);
     if(w>60)TX(s,x+9,y0+13+bh/2+4,`${d[0]} ${nf(d[1])}`,{s:10.5,m:1,w:700,f:'rgba(6,10,24,.85)'});x+=w;}});
   TX(s,0,y0+bh+30,`확정률 ${Math.round(100*t.conf/tot)}%`,{s:10,m:1,w:700,f:'#8fa2c9'});
   const y1=A+Bs+14; TX(s,0,y1,'활동 기간',{s:10,m:1,w:700,f:'#5d7099'});
   const ly=y1+30;
   E('line',{x1:5,y1:ly,x2:W-5,y2:ly,stroke:'rgba(140,160,230,.3)','stroke-width':2},s);
   E('circle',{cx:5,cy:ly,r:5.5,fill:'#38bdf8'},s);E('circle',{cx:W-5,cy:ly,r:5.5,fill:'#a78bfa'},s);
   TX(s,0,ly+22,`${p.y0}년 첫 논문`,{s:10,m:1,w:700,f:'#8fa2c9'});
   TX(s,W,ly+22,`${p.y1}년 최근`,{a:'end',s:10,m:1,w:700,f:'#8fa2c9'});
   TX(s,W/2,ly-11,`${p.career}년 · 활동 ${p.active}년`,{a:'middle',s:12.5,w:800,f:'#e9eefb'});}};
}
/* ②  최근 5년 */
function c_r5(p){const A=p.all,B=p.r5,sh=v=>A[v]?Math.round(100*B[v]/A[v]):0;
 return {ttl:'최근 5년이 전체에서 차지하는 비중',note:`막대는 <b>전체 대비 최근 5년(2021~2026)이 차지하는 비율</b>.
   100%에 가까울수록 최근에 집중된 연구자, 낮을수록 과거 실적이 큰 연구자다.
   BK21 평가는 최근 구간을 본다.`,
  draw(box){const s=svg(box,W,H);
   const it=[['논문 편수','p','#38bdf8'],['성과점수 S','S','#818cf8'],['환산기여 E','E','#a78bfa'],
             ['피인용','C','#f472b6'],['주도 논문','lead','#34d399'],['상위25% 논문','q1','#fbbf24']];
   bars(s,it.map(d=>({l:d[0],v:sh(d[1]),c:d[2],
     r:`${sh(d[1])}%  (${d[1]==='S'||d[1]==='E'?f1(B[d[1]]):nf(B[d[1]])} / ${d[1]==='S'||d[1]==='E'?f1(A[d[1]]):nf(A[d[1]])})`})),
     {L:96,R:162,min:100,bh:28,B:12});}};
}
/* ③  대표 논문 */
function c_rep(p){const R=dedupe(p.rep).slice(0,5);
 return {ttl:'대표 논문의 피인용과 세계 평균 대비',note:`막대 길이는 <b>피인용 수</b>, 오른쪽 원 크기는 <b>FWCI</b>(1.0=세계 평균).
   흰 테두리 원은 <b>제1저자 또는 교신저자</b>로 참여한 논문. 막대 색은 게재지 등급이다.
   피인용은 오래된 논문이 유리하므로, 연도가 다른 논문은 FWCI로 견주는 편이 맞다.`,
  draw(box){const s=svg(box,W,H);
   if(!R.length)return;
   const L=8, BR=W-96, T=10, rowH=(H-T-6)/R.length;
   const mx=Math.max(...R.map(r=>r.c),1);
   R.forEach((r,i)=>{
     const yT=T+i*rowH, bh=Math.min(13,rowH*.26), yB=yT+rowH*.62;
     TX(s,L,yT+13,esc(r.t).slice(0,58),{s:11,w:700,f:'#dde5ff'});
     TX(s,L,yT+29,`${r.y} · ${esc(r.j).slice(0,40)}`,{s:9,m:1,f:'#7286ad',w:600});
     const bw=Math.max(3,(BR-L)*Math.sqrt(r.c/mx));
     E('rect',{x:L,y:yB,width:BR-L,height:bh,rx:bh/2,fill:'rgba(140,160,230,.08)'},s);
     E('rect',{x:L,y:yB,width:bw,height:bh,rx:bh/2,fill:GC[r.g||0],opacity:.9},s);
     const lbl=`피인용 ${nf(r.c)}`, need=lbl.length*5.9;
     if(L+bw+7+need<BR-4) TX(s,L+bw+7,yB+bh-2,lbl,{s:9,m:1,w:700,f:'#93a6cc'});
     else TX(s,L+bw-7,yB+bh-2,lbl,{a:'end',s:9,m:1,w:700,f:'rgba(255,255,255,.9)'});
     TX(s,BR,yT+29,`${r.L?'주도':'공동'} · ${r.n}인 · 기여 ${f2(r.w)}`,{a:'end',s:9,m:1,f:'#7286ad',w:600});
     const cx=W-46, cy=yT+rowH*.46, rad=7+Math.min(r.f==null?0:r.f,7)*2.9;
     E('circle',{cx,cy,r:rad,fill:GC[r.g||0],opacity:.4,
       stroke:r.L?'rgba(233,238,251,.9)':'rgba(190,205,255,.35)','stroke-width':r.L?2.2:1},s);
     TX(s,cx,cy+3.5,r.f==null?'—':f2(r.f),{a:'middle',s:10,m:1,w:800,f:'#eef2ff'});
     TX(s,cx,yT+rowH*.46+rad+13,r.pe!=null?`상위 ${f1(r.pe)}%`:GN[r.g||0],
        {a:'middle',s:8.5,m:1,f:'#7286ad',w:600});});
   TX(s,W-46,T-1,'FWCI',{a:'middle',s:8.5,m:1,f:'#5d7099',w:700});}};
}
/* ④  연도별 */
function c_yr(p){const Y=p.yr,mx=Math.max(...Y.map(d=>d[1]),1);
 return {ttl:'연도별 발표 편수와 연속성',note:`막대는 <b>해당 연도 발표 편수</b>, 선은 누적. 회색 막대는 <b>발표가 없던 해</b>다.
   활동 ${p.active}년 / 공백 ${p.gaps}년 / 최장 연속 <b>${p.run}년</b>.
   지속성은 편수보다 <b>끊기지 않았는가</b>가 중요하다.`,
  draw(box){const s=svg(box,W,H);
   const L=30,B=34,T=14,n=Y.length,bw=(W-L-8)/n;
   [0,.25,.5,.75,1].forEach(f=>{const y=T+(H-T-B)*(1-f);
     E('line',{x1:L,y1:y,x2:W,y2:y,stroke:'rgba(140,160,230,.13)','stroke-width':1},s);
     TX(s,L-6,y+3.5,Math.round(mx*f),{a:'end',s:9,m:1,f:'#5d7099'});});
   let cum=0,tot=Y.reduce((a,d)=>a+d[1],0),pts=[];
   Y.forEach((d,i)=>{const x=L+i*bw+bw*.16,w=bw*.68,h=(H-T-B)*d[1]/mx,y=H-B-h;
     E('rect',{x,y:d[1]?y:H-B-3,width:w,height:d[1]?h:3,rx:3,
       fill:d[1]?'url(#gy)':'rgba(100,116,139,.5)'},s);
     if(d[1])TX(s,x+w/2,y-5,d[1],{a:'middle',s:9,m:1,w:700,f:'#a9bbe4'});
     TX(s,x+w/2,H-B+15,String(d[0]).slice(2),{a:'middle',s:8.5,m:1,f:'#5d7099'});
     cum+=d[1];pts.push([x+w/2,T+(H-T-B)*(1-cum/tot)]);});
   grad(s,'gy','#38bdf8','#a78bfa',1);
   E('polyline',{points:pts.map(q=>q.join(',')).join(' '),fill:'none',
     stroke:'rgba(251,191,36,.75)','stroke-width':1.8,'stroke-dasharray':'4 3'},s);
   TX(s,W,T+10,'누적',{a:'end',s:9,m:1,f:'rgba(251,191,36,.8)',w:700});}};
}
/* ⑤  역할 */
function c_role(p){const r=p.role,A=p.all,tot=Math.max(A.p,1);
 const seg=[['제1저자',r.first-r.both,'#38bdf8'],['교신저자',r.corr-r.both,'#a78bfa'],
            ['제1 및 교신',r.both,'#f472b6'],['공동참여',r.co,'#64748b']].filter(d=>d[1]>0);
 return {ttl:'역할 구성과 환산기여량',note:`환산기여 <b>E</b>는 저자 수와 역할로 나눈 실제 몫이다.
   주도(제1·교신)는 <b>2/(n+1)</b>, 공동참여는 <b>1/(n+1)</b>.
   ${nf(A.p)}편에 이름을 올렸지만 환산하면 <b>${f1(A.E)}편</b>어치이며, 그중 주도는 ${nf(A.lead)}편이다.`
   +(r.unk>0?` 다만 <b>${nf(r.unk)}편은 역할이 아직 판정되지 않았고</b> 산식에서 공동참여로 계산된다.
   따라서 위 환산기여와 주도 비율은 <b>하한값</b>이다.`:''),
  draw(box){const s=svg(box,W,H);
   const DH=H*0.62, cx=W*0.27, cy=DH*0.5+6, ro=Math.min(cx-14,DH*0.44), ri=ro*0.6;
   let a0=-Math.PI/2;
   seg.forEach(d=>{const a1=a0+2*Math.PI*d[1]/tot,la=(a1-a0)>Math.PI?1:0;
     const P0=[cx+ro*Math.cos(a0),cy+ro*Math.sin(a0)],P1=[cx+ro*Math.cos(a1),cy+ro*Math.sin(a1)];
     const Q1=[cx+ri*Math.cos(a1),cy+ri*Math.sin(a1)],Q0=[cx+ri*Math.cos(a0),cy+ri*Math.sin(a0)];
     E('path',{d:`M${P0} A${ro} ${ro} 0 ${la} 1 ${P1} L${Q1} A${ri} ${ri} 0 ${la} 0 ${Q0}Z`,
       fill:d[2],opacity:.88,stroke:'rgba(6,10,24,.55)','stroke-width':1.5},s);a0=a1;});
   TX(s,cx,cy-2,f1(A.E),{a:'middle',s:31,w:800,f:'#f0f4ff'});
   TX(s,cx,cy+19,'환산기여 편수',{a:'middle',s:9.5,m:1,f:'#5d7099',w:700});
   TX(s,cx,cy+37,`실제 ${nf(A.p)}편`,{a:'middle',s:9.5,m:1,f:'#8fa2c9',w:700});
   const LX=W*0.55, sp=Math.min(34,(DH-30)/seg.length);
   seg.forEach((d,i)=>{const y=26+i*sp;
     E('rect',{x:LX,y:y-9,width:12,height:12,rx:3,fill:d[2]},s);
     TX(s,LX+20,y+1.5,d[0],{s:11.5,w:700,f:'#cfd9f5'});
     TX(s,W,y+1.5,`${nf(d[1])}편 · ${Math.round(100*d[1]/tot)}%`,{a:'end',s:10,m:1,f:'#8fa2c9',w:700});});
   const yb=DH+18, pr=A.lead/tot;
   TX(s,0,yb,'주도 비율 (제1 · 교신 · 제1및교신)',{s:10,m:1,w:700,f:'#5d7099'});
   E('rect',{x:0,y:yb+13,width:W,height:20,rx:10,fill:'rgba(140,160,230,.1)'},s);
   E('rect',{x:0,y:yb+13,width:W*pr,height:20,rx:10,fill:'#34d399',opacity:.85},s);
   TX(s,10,yb+27,`${Math.round(pr*100)}%`,{s:11,m:1,w:800,f:'rgba(6,10,24,.85)'});
   TX(s,W,yb+52,`주도 ${nf(A.lead)}편 / 전체 ${nf(A.p)}편`,{a:'end',s:10.5,m:1,f:'#8fa2c9',w:700});
   TX(s,0,yb+52,r.unk>0?`역할 미판정 ${nf(r.unk)}편 (${Math.round(100*r.unk/tot)}%) — 공동참여로 계산됨`
      :'역할 전부 확정',{s:10.5,m:1,f:r.unk>0?'#fbbf24':'#34d399',w:700});
   const ye=yb+76;
   if(ye<H-10){TX(s,0,ye,'최근 5년 주도',{s:10,m:1,w:700,f:'#5d7099'});
     const p5=p.r5.p?p.r5.lead/p.r5.p:0;
     E('rect',{x:0,y:ye+13,width:W,height:14,rx:7,fill:'rgba(140,160,230,.1)'},s);
     E('rect',{x:0,y:ye+13,width:W*p5,height:14,rx:7,fill:'#38bdf8',opacity:.85},s);
     TX(s,W,ye+40,`${nf(p.r5.lead)}편 / ${nf(p.r5.p)}편 · ${Math.round(p5*100)}%`,
        {a:'end',s:10,m:1,f:'#8fa2c9',w:700});}}};
}


/* ⑥  영향력 */
function c_imp(p){const I=p.imp,A=p.all;
 return {ttl:'피인용 분포와 세계 평균 대비 위치',note:`<b>FWCI 1.0 = 같은 분야·같은 연도 논문의 세계 평균</b>.
   2.0이면 평균의 두 배로 인용됐다는 뜻이다. h-지수 <b>${I.h}</b>는 "${I.h}회 이상 인용된 논문이 ${I.h}편"을 의미한다.
   무인용 ${nf(I.czero)}편은 아직 인용이 붙지 않은 논문(최근 발표 포함)이다.`,
  draw(box){const s=svg(box,W,H);
   bars(s,[
    {l:'h-지수',v:I.h,c:'#a78bfa',r:`${I.h}`},
    {l:'최다 피인용',v:I.cmax,c:'#f472b6',r:`${nf(I.cmax)}회`},
    {l:'피인용 중앙값',v:I.cmed,c:'#38bdf8',r:`${nf(I.cmed)}회`},
    {l:'FWCI ≥ 2.0',v:I.fwhi,c:'#34d399',r:`${nf(I.fwhi)}편 / ${nf(I.fwn)}편 측정`},
    {l:'상위 10% 저널',v:I.top10,c:'#f472b6',r:`${nf(I.top10)}편`},
    {l:'상위 25% 저널',v:I.top25,c:'#a78bfa',r:`${nf(I.top25)}편`},
    {l:'무인용',v:I.czero,c:'#64748b',r:`${nf(I.czero)}편 (${Math.round(100*I.czero/Math.max(A.p,1))}%)`}
   ],{L:100,R:132,bh:24,B:30});
   const y=H-6;
   TX(s,100,y,`평균 FWCI ${f2(A.fw)}`,{s:11,m:1,w:800,f:A.fw>=1?'#34d399':'#fbbf24'});
   TX(s,232,y,`평균 CNCI ${f2(A.cn)}`,{s:11,m:1,w:800,f:A.cn>=1?'#34d399':'#fbbf24'});
   TX(s,W,y,`누적 피인용 ${nf(A.C)}회`,{a:'end',s:11,m:1,w:800,f:'#e9eefb'});}};
}
/* ⑦  분야 변화 */
function c_shift(p){const S_=p.shift.filter(d=>d[1]>0||d[2]>0).slice(0,7);
 return {ttl:`분야 구성 변화 · 전반(~${p.mid}) → 후반(${p.mid+1}~)`,
  note:`같은 연구자라도 <b>분야는 옮겨간다</b>. 왼쪽은 초기 절반, 오른쪽은 후기 절반의 분야 비중.
   선이 위로 향하면 <b>비중이 커진 분야</b>, 아래로 향하면 줄어든 분야다. 학술지 주제분류(WoS·Scopus) 기준.`,
  draw(box){const s=svg(box,W,H);
   if(!S_.length){TX(s,W/2,H/2,'분야 분류 데이터 없음',{a:'middle',s:12,f:'#5d7099',w:700});return;}
   const L=W*0.31,R=W-72,T=24,B=56,mx=Math.max(...S_.flatMap(d=>[d[1],d[2]]),5);
   const yy=v=>T+(H-T-B)*(1-v/mx);
   // 라벨 겹침 회피: 최소 간격으로 밀어냄
   function spread(vals){const MIN=15,n=vals.length;
     const a=vals.map((v,i)=>({i,y:yy(v)})).sort((x,y)=>x.y-y.y);
     for(let k2=1;k2<n;k2++) if(a[k2].y-a[k2-1].y<MIN) a[k2].y=a[k2-1].y+MIN;
     const over=a[n-1].y-(H-B); if(over>0) for(const o of a) o.y-=over;
     const out=[]; a.forEach(o=>out[o.i]=o.y); return out;}
   const LY=spread(S_.map(d=>d[1])), RY=spread(S_.map(d=>d[2]));
   E('line',{x1:L,y1:T,x2:L,y2:H-B,stroke:'rgba(140,160,230,.25)'},s);
   E('line',{x1:R,y1:T,x2:R,y2:H-B,stroke:'rgba(140,160,230,.25)'},s);
   TX(s,L,H-B+18,`전반 ~${p.mid}`,{a:'middle',s:9.5,m:1,f:'#5d7099',w:700});
   TX(s,R,H-B+18,`후반 ${p.mid+1}~`,{a:'middle',s:9.5,m:1,f:'#5d7099',w:700});
   const CC=['#38bdf8','#a78bfa','#f472b6','#34d399','#fbbf24','#818cf8','#2dd4bf'];
   S_.forEach((d,i)=>{const c=CC[i%7],y1=yy(d[1]),y2=yy(d[2]),up=d[2]>=d[1];
     E('line',{x1:L,y1,x2:R,y2,stroke:c,'stroke-width':up?2.4:1.5,opacity:up?.9:.5},s);
     E('circle',{cx:L,cy:y1,r:4.5,fill:c,opacity:.9},s);
     E('circle',{cx:R,cy:y2,r:up?6:4.5,fill:c,opacity:.95},s);
     // 라벨은 밀어낸 위치, 리더선으로 점과 연결
     if(Math.abs(LY[i]-y1)>2)E('line',{x1:L-5,y1,x2:L-11,y2:LY[i],stroke:c,opacity:.35},s);
     if(Math.abs(RY[i]-y2)>2)E('line',{x1:R+5,y1:y2,x2:R+11,y2:RY[i],stroke:c,opacity:.35},s);
     TX(s,L-14,LY[i]+3.5,`${d[0].slice(0,22)}  ${d[1]}%`,{a:'end',s:9.5,w:700,f:'#b6c4e6'});
     TX(s,R+14,RY[i]+3.5,`${d[2]}%`,{s:9.5,m:1,w:800,f:c});});
   TX(s,L-14,T-9,'비중 %',{a:'end',s:9,m:1,f:'#5d7099'});
   const kw=(p.kw||[]).slice(0,7).map(k2=>k2[0]).join(' · ');
   TX(s,0,H-16,'키워드 지문',{s:9,m:1,f:'#5d7099',w:700});
   TX(s,0,H-3,kw.slice(0,88),{s:9.5,m:1,f:'#8fa2c9',w:600});}};
}
/* ⑧  학술지 */
function c_jr(p){const J=p.jrs,A=p.all,con=Math.round(p.hhi*1000);
 return {ttl:'상위 게재 학술지와 집중도',note:`한 저널에 몰릴수록 <b>집중도(HHI)</b>가 높다. 지금은 <b>${con}</b>
   (1000 이상이면 특정 저널 편중). 색은 그 저널에서 받은 최고 등급이다.
   전체 ${nf(A.p)}편이 서로 다른 게재처에 흩어진 정도를 본다.`,
  draw(box){const s=svg(box,W,H);
   bars(s,J.map(d=>({l:d[0].slice(0,23),v:d[1],c:GC[d[2]],
     r:`${d[1]}편 · 피인용 ${nf(d[3])}`,s:GN[d[2]]})),{L:180,R:118,bh:26,B:40,ls:9.5});
   const y=H-4;
   E('rect',{x:180,y:y-16,width:W-180-118,height:9,rx:5,fill:'rgba(140,160,230,.1)'},s);
   E('rect',{x:180,y:y-16,width:(W-180-118)*Math.min(con/1500,1),height:9,rx:5,
     fill:con>=1000?'#fbbf24':'#34d399'},s);
   TX(s,0,y-8,'집중도 HHI',{s:9.5,m:1,w:700,f:'#5d7099'});
   TX(s,W,y-8,`${con} / 1500`,{a:'end',s:9.5,m:1,w:700,f:con>=1000?'#fbbf24':'#34d399'});}};
}
/* ⑨  공저 */
function c_co(p){const C=p.coa.slice(0,8),mx=Math.max(...C.map(d=>d[2]),1);
 const IN=p.coa.filter(d=>/교내|INTERNAL/i.test(d[1]||'')).length;
 return {ttl:'반복 협력 상대와 협력 기간',note:`누적 공저자 <b>${nf(p.nco)}명</b> 중 상위 8명.
   막대 길이는 <b>함께 쓴 논문 수</b>, 오른쪽 가로선은 <b>첫 공저부터 최근 공저까지의 기간</b>이다.
   한 사람과 오래 반복될수록 우연한 공저가 아니라 <b>지속되는 연구 관계</b>다.`,
  draw(box){const s=svg(box,W,H);
   if(!C.length){TX(s,W/2,H/2,'공저 관계 데이터 없음',{a:'middle',s:12,f:'#5d7099',w:700});return;}
   const L=88,MID=W*0.52,T=10,gap=Math.min(11,(H-46)/C.length*.28);
   const bh=Math.min(30,(H-46-gap*(C.length-1))/C.length);
   const ys=C.map((d,i)=>T+i*(bh+gap));
   C.forEach((d,i)=>{const y=ys[i],w=(MID-L)*d[2]/mx,inn=/교내|INTERNAL/i.test(d[1]||'');
     E('rect',{x:L,y,width:MID-L,height:bh,rx:5,fill:'rgba(140,160,230,.07)'},s);
     E('rect',{x:L,y,width:Math.max(w,3),height:bh,rx:5,fill:inn?'#38bdf8':'#a78bfa',opacity:.88},s);
     TX(s,L-8,y+bh/2+3.6,d[0],{a:'end',s:10,m:1,w:700,f:'#b6c4e6'});
     TX(s,L+6,y+bh/2+3.6,`${d[2]}편`,{s:9.5,m:1,w:700,f:'rgba(255,255,255,.85)'});
     const y0=p.y0,y1=p.y1,sp=Math.max(y1-y0,1),X0=MID+22,X1=W-46;
     E('line',{x1:X0,y1:y+bh/2,x2:X1,y2:y+bh/2,stroke:'rgba(140,160,230,.15)','stroke-width':1},s);
     const a=X0+(X1-X0)*Math.max(0,(d[3]-y0))/sp, b=X0+(X1-X0)*Math.min(1,(d[4]-y0)/sp);
     E('line',{x1:a,y1:y+bh/2,x2:Math.max(b,a+3),y2:y+bh/2,stroke:inn?'#38bdf8':'#a78bfa',
       'stroke-width':4,'stroke-linecap':'round',opacity:.85},s);
     TX(s,W-40,y+bh/2+3.6,`${d[3]}–${d[4]}`,{s:8.5,m:1,f:'#5d7099',w:600});});
   const yb=H-6;
   E('rect',{x:L,y:yb-11,width:11,height:11,rx:3,fill:'#38bdf8'},s);
   TX(s,L+17,yb-2,`교내 ${IN}명`,{s:10,m:1,w:700,f:'#8fa2c9'});
   E('rect',{x:L+96,y:yb-11,width:11,height:11,rx:3,fill:'#a78bfa'},s);
   TX(s,L+113,yb-2,`교외 ${p.coa.length-IN}명`,{s:10,m:1,w:700,f:'#8fa2c9'});
   TX(s,W,yb-2,`전체 공저자 ${nf(p.nco)}명`,{a:'end',s:10,m:1,w:700,f:'#8fa2c9'});}};
}
/* ⑩  동료 비교 */
function c_peer(p){const q=p.peer,pool=MODE==='band'?q.n:q.nf;
 const it=[['성과점수 S',MODE==='band'?q.S:q.Sf],['논문 편수',q.p],['환산기여 E',q.E],
           ['누적 피인용',q.C],['평균 FWCI',q.fw],['h-지수',q.h],['주도 비율',q.lead],['상위25% 비율',q.q1]];
 return {ttl:`${p.field} 계열 · ${MODE==='band'?p.band+' 경력':'전체 경력'} 안에서의 위치`,
  note:`값이 아니라 <b>같은 조건의 동료 중 몇 %보다 앞서는가</b>로 읽는다.
   비교 대상은 ${p.field} 계열 ${MODE==='band'?p.band+' ':''}<b>${nf(pool)}명</b>.
   분야마다 인용 관행이 달라 절대 수치 비교는 왜곡되므로, 계열 안에서 본다.`,
  draw(box){const s=svg(box,W,H);
   const rank=v=>Math.max(1,Math.round(pool*(100-v)/100)||1);
   bars(s,it.map(d=>({l:d[0],v:d[1],c:d[1]>=90?'#f472b6':d[1]>=70?'#a78bfa':d[1]>=40?'#38bdf8':'#64748b',
     r:`${nf(pool)}명 중 ${nf(rank(d[1]))}위`})),{L:100,R:96,min:100,bh:24,B:28});
   [25,50,75].forEach(f=>{const x=100+(W-100-96)*f/100;
     E('line',{x1:x,y1:4,x2:x,y2:H-30,stroke:'rgba(140,160,230,.16)','stroke-dasharray':'3 3'},s);
     TX(s,x,H-10,`${f}`,{a:'middle',s:8.5,m:1,f:'#5d7099'});});
   TX(s,100,H-10,'0',{a:'middle',s:8.5,m:1,f:'#5d7099'});
   TX(s,W-96,H-10,'100 백분위',{a:'middle',s:8.5,m:1,f:'#5d7099'});}};
}
/* ⑪  신뢰도 */
function c_trust(p){const t=p.trust,A=p.all;
 const risk=[['역할 미판정',p.role.unk,'#fbbf24'],['FWCI 미측정',t.nofwci,'#a78bfa'],
   ['등급 판정 불가',t.nograde,'#fbbf24'],['저신뢰 매칭(0.7↓)',t.lowmatch,'#fb7185'],
   ['미해결 충돌',t.conflict,'#fb7185'],['보류 논문',t.pend,'#fbbf24'],
   ['학술대회(실적 별도)',t.confp,'#64748b']];
 const bad=p.role.unk+t.nograde+t.lowmatch+t.conflict+t.pend;
 return {ttl:'확인이 필요한 항목',note:`위 10개 화면의 수치는 <b>확정 ${nf(t.conf)}편</b>을 근거로 계산했다.
   아래 항목은 <b>사람이 확인해야 값이 확정되는 부분</b>이다. 특히 저신뢰 매칭과 미해결 충돌은
   다른 사람의 논문이 섞였을 수 있어 <b>먼저 확인</b>해야 한다. 현재 확인 대상 <b>${nf(bad)}건</b>.`,
  draw(box){const s=svg(box,W,H);
   bars(s,risk.map(d=>({l:d[0],v:d[1],c:d[2],r:d[1]?`${nf(d[1])}건`:'없음',o:d[1]?.9:.25})),
     {L:150,R:76,bh:24,B:38,min:Math.max(...risk.map(d=>d[1]),1)});
   const y=H-8, ok=Math.round(100*t.conf/Math.max(t.total,1));
   E('rect',{x:150,y:y-18,width:W-150-76,height:10,rx:5,fill:'rgba(140,160,230,.1)'},s);
   E('rect',{x:150,y:y-18,width:(W-150-76)*ok/100,height:10,rx:5,fill:ok>=95?'#34d399':'#fbbf24'},s);
   TX(s,0,y-9,'논문 확정률',{s:9.5,m:1,w:700,f:'#5d7099'});
   TX(s,W,y-9,`${ok}%  (${nf(t.conf)}/${nf(t.total)})`,{a:'end',s:9.5,m:1,w:700,
     f:ok>=95?'#34d399':'#fbbf24'});}};
}
const CH=[c_id,c_r5,c_rep,c_yr,c_role,c_imp,c_shift,c_jr,c_co,c_peer,c_trust];


/* ── 스마트폰: ①정체성 ②최근5년 ③대표논문 ── */
function drawPhone(){
 const A=P.all,B=P.r5,t=P.trust,q=P.peer;
 const ids=[['ORCID',t.orcid],['SCOPUS',t.auid],['WOS',t.wos]]
   .map(d=>`<span class="rptag ${d[1]?'on':'off'}">${d[0]} ${d[1]?'✓':'—'}</span>`).join('');
 const kv=[['최근 5년','편수',nf(B.p),`전체 ${nf(A.p)}`],
           ['성과점수','S',f1(B.S),`전체 ${f1(A.S)}`],
           ['피인용','회',nf(B.C),`전체 ${nf(A.C)}`]]
   .map(d=>`<div class="kv"><b>${d[2]}</b><u>${d[0]}</u><s>${d[3]}</s></div>`).join('');
 const rep=dedupe(P.rep).slice(0,3).map(r=>`<article class="rp">
   <span class="rpbar" style="background:${GC[r.g||0]}"></span>
   <h4>${esc(r.t)}</h4>
   <p><b>${r.y}</b><span>${esc(r.j).slice(0,26)}</span></p>
   <p><b>피인용 ${nf(r.c)}</b>${r.f!=null?`<em>FWCI ${f2(r.f)}</em>`:''}
      <span>${r.L?'주도':'공동'}·${r.n}인</span><span>기여 ${f2(r.w)}</span></p></article>`).join('');
 RPQ('#rp-phone').innerHTML=`
  <div class="ph-hero"><div class="ph-clip"><canvas id="rp-phc"></canvas></div>
   <div class="ph-top"><div class="avatar">${P.code.slice(-1)}</div>
     <span class="rpchip">${esc(P.field)} 계열</span></div>
   <div class="ph-name"><h2>${esc(P.code)}</h2>
     <p>${esc(P.dept)} · ${esc(P.pos)} · ${P.y0}–${P.y1} (${P.career}년)</p></div>
   <div class="ph-pill"><i>S ${f1(A.S)}</i><i>${esc(P.field)} 계열 ${nf(q.nf)}명 중 ${nf(Math.max(1,Math.round(q.nf*(100-q.Sf)/100)||1))}위</i></div>
  </div>
  <div class="ph-body">
   <div class="ph-tags">${ids}<span class="rptag">확정 ${nf(t.conf)}편</span></div>
   <div class="ph-kv">${kv}</div>
   <div class="ph-sec">대표 연구성과</div>
   <div class="rep">${rep}</div>
  </div>`;
 phBokeh();
}
function phBokeh(){
 const c=RPQ('#rp-phc');if(!c)return;
 const w=c.width=360*2,h=c.height=236*2,x=c.getContext('2d');
 const cols=['rgba(56,189,248,.5)','rgba(167,139,250,.45)','rgba(244,114,182,.4)','rgba(45,212,191,.4)'];
 let sd=(P.code.charCodeAt(4)*97)%9973;const rnd=()=>((sd=(sd*1103515245+12345)&0x7fffffff)/0x7fffffff);
 for(let i=0;i<26;i++){const r=(10+rnd()*54)*2;
   x.globalAlpha=.16+rnd()*.3;x.fillStyle=cols[(rnd()*4)|0];
   x.beginPath();x.arc(rnd()*w,rnd()*h,r,0,7);x.fill();}
 x.globalAlpha=1;
}
/* ── 메뉴 ── */
function drawMenu(){
 RPQ('#rp-mlist').innerHTML=SEC.map((d,i)=>`
  ${i===3||i===6||i===9?'<div class="mdiv"></div>':''}
  <div class="mi ${i===CUR?'on':''}" data-i="${i}">
   <span class="ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"
     stroke="${i===CUR?'#dfe6ff':'#93a6cc'}" stroke-width="1.9" stroke-linecap="round"
     stroke-linejoin="round"><path d="${ICON[d.ic]}"/></svg></span>
   <span class="tx"><b>${d.t}</b><u>${d.sub}</u></span>
   <span class="no">${d.n}</span></div>`).join('');
 RPQ('#rp-mlist').querySelectorAll('.mi').forEach(el=>el.onclick=()=>{CUR=+el.dataset.i;drawMenu();drawPanel();});
 RPQ('#rp-mfoot').innerHTML=`비교군 ${esc(P.field)} 계열 · ${esc(P.band)}<br>동일조건 ${nf(P.peer.n)}명 / 계열 ${nf(P.peer.nf)}명`;
}
/* ── 우측 패널 ── */
function drawPanel(){
 const d=SEC[CUR],c=CH[CUR](P),A=P.all,B=P.r5,t=P.trust,q=P.peer;
 const ST={
  0:[['활동 기간',P.career,'년',`${P.y0}–${P.y1}`],['확정 논문',nf(t.conf),'편',`보류 ${nf(t.pend)}편`],
     ['식별자',[t.orcid,t.auid,t.wos].filter(Boolean).length,'/3',`${t.orcid?'ORCID ':''}${t.auid?'AUID ':''}${t.wos?'WOS':''}`||'없음']],
  1:[['최근 5년 편수',nf(B.p),'편',`전체의 ${Math.round(100*B.p/Math.max(A.p,1))}%`],
     ['최근 5년 S',f1(B.S),'',`전체 ${f1(A.S)}`],
     ['최근 5년 주도',nf(B.lead),'편',`${Math.round(100*B.lead/Math.max(B.p,1))}%`]],
  2:[['대표 최다 피인용',nf(P.rep[0]?.c),'회',esc(P.rep[0]?.j||'').slice(0,26)],
     ['상위25% 게재',nf(A.q1),'편',`전체 ${nf(A.p)}편 중`],
     ['최고 FWCI',f2(Math.max(...P.rep.map(r=>r.f||0))),'',`세계평균 대비`]],
  3:[['활동 연수',P.active,'년',`공백 ${P.gaps}년`],['최장 연속',P.run,'년','끊김 없이'],
     ['연평균',f1(A.p/Math.max(P.career,1)),'편','전 구간 평균']],
  4:[['환산기여',f1(A.E),'편',P.role.unk>0?`하한값 · 실제 ${nf(A.p)}편`:`실제 ${nf(A.p)}편`],
     ['주도 논문',nf(A.lead),'편',`${Math.round(100*A.lead/Math.max(A.p,1))}%`],
     ['제1 및 교신',nf(P.role.both),'편','두 역할 동시']],
  5:[['평균 FWCI',f2(A.fw),'',A.fw>=1?'세계평균 이상':'세계평균 미만'],
     ['h-지수',P.imp.h,'',`최다 ${nf(P.imp.cmax)}회`],
     ['누적 피인용',nf(A.C),'회',`무인용 ${nf(P.imp.czero)}편`]],
  6:[['주요 분야',P.subj[0]?esc(P.subj[0][0]).slice(0,28):'—','',P.subj[0]?nf(P.subj[0][1])+'편':''],
     ['분야 수',P.subj.length,'개','상위 8개 기준'],
     ['전·후반 경계',P.mid,'년',`${P.y0}–${P.mid} / ${P.mid+1}–${P.y1}`]],
  7:[['상위 저널',P.jrs[0]?esc(P.jrs[0][0]).slice(0,30):'—','',P.jrs[0]?P.jrs[0][1]+'편':''],
     ['집중도 HHI',Math.round(P.hhi*1000),'',P.hhi*1000>=1000?'특정 저널 편중':'분산'],
     ['오픈액세스',nf(A.oa),'편',`${Math.round(100*A.oa/Math.max(A.p,1))}%`]],
  8:[['공저자',nf(P.nco),'명','누적 고유 인물'],
     ['최다 협력',P.coa[0]?P.coa[0][2]:0,'편',P.coa[0]?`${P.coa[0][3]}–${P.coa[0][4]}`:''],
     ['국제·교외',nf(P.coa.filter(d=>!/교내|INTERNAL/i.test(d[1]||'')).length),'명','상위 14명 중']],
  9:[['성과점수 백분위',MODE==='band'?q.S:q.Sf,'','상위 '+Math.max(100-(MODE==='band'?q.S:q.Sf),1)+'%'],
     ['비교 대상',nf(MODE==='band'?q.n:q.nf),'명',`${esc(P.field)} 계열`],
     ['경력 구간',esc(P.band),'',`${P.career}년차`]],
  10:[['확정률',Math.round(100*t.conf/Math.max(t.total,1)),'%',`${nf(t.conf)}/${nf(t.total)}`],
     ['확인 필요',nf(P.role.unk+t.nograde+t.lowmatch+t.conflict+t.pend),'건','사람 검토 대상'],
     ['역할 미판정',nf(P.role.unk),'편',`전체의 ${Math.round(100*P.role.unk/Math.max(A.p,1))}%`]]
 }[CUR];
 RPQ('#rp-panel').innerHTML=`
  <div class="rppk">
   <span class="badge"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dfe6ff"
     stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON[d.ic]}"/></svg></span>
   <span class="no">${d.n} · ${d.k}</span>
   <span class="dots"><i></i><i></i><i></i></span></div>
  <h2 class="rppt">${esc(d.t).replace(/^(\S+)/,'<em>$1</em>')}</h2>
  <p class="pd">${c.note}</p>
  <div class="stats">${ST.map(x=>`<div class="rpst${String(x[1]).length>9?' tx':''}"><u>${x[0]}</u>
     <b>${x[1]}<i>${x[2]||''}</i></b><s>${x[3]||''}</s></div>`).join('')}</div>
  <div class="body">
   <div class="chartbox"><div class="cttl">${esc(c.ttl)}<span>실데이터 · 확정 ${nf(t.conf)}편 기준</span></div>
     <div id="rp-cbx" style="flex:1;min-height:0"></div></div>
   <div class="ev"><div class="evh">근거 논문</div>
     <div class="evl">${evCards(d.ev==='rep'?P.rep:(P.ev||{})[d.ev],5)}</div></div>
  </div>`;
 const bx=RPQ('#rp-cbx');
 const bw=bx.clientWidth||470, bh=bx.clientHeight||330;
 W=520; H=Math.round(520*bh/bw);
 c.draw(bx);
}
/* ── 배경 보케 ── */
function bg(){
 const c=RPQ('#rp-bok'); if(!c) return;
 const w=c.width=(1520+120)*.7,h=c.height=(912+120)*.7,x=c.getContext('2d');
 const cols=['rgba(56,189,248,.16)','rgba(167,139,250,.16)','rgba(244,114,182,.11)'];
 for(let i=0;i<34;i++){const r=30+Math.random()*140;
  const g=x.createRadialGradient(Math.random()*w,Math.random()*h,0,0,0,1);
  x.globalAlpha=.5;x.fillStyle=cols[(Math.random()*3)|0];
  x.beginPath();x.arc(Math.random()*w,Math.random()*h,r,0,7);x.fill();}
 x.globalAlpha=.14;x.strokeStyle='rgba(140,160,230,.55)';x.lineWidth=1;
 for(let y=h*.62;y<h;y+=16){x.beginPath();x.moveTo(0,y);x.lineTo(w,y);x.stroke();}
 for(let i=-20;i<40;i++){x.beginPath();x.moveTo(w/2+i*30,h*.62);x.lineTo(w/2+i*180,h);x.stroke();}
}

return { SEC, CH, ICON, GC, GN, nf, f1, f2, bg,
  set(p){ P=p; }, tab(i){ CUR=i; }, cur(){ return CUR; }, get(){ return P; },
  drawPhone, drawMenu, drawPanel, phBokeh };
})();
