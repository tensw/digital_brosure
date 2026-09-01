
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
 const subjC = B ? cnt(P,x=>x.f) : cnt((PRA&&PRA.topics)||[], t=>t.display_name);
 let subj=Object.entries(subjC).sort((a,b)=>b[1]-a[1]).slice(0,8);
 if(!subj.length&&PRA&&(PRA.topics||[]).length)
   subj=(PRA.topics||[]).slice(0,8).map(t=>[t.display_name,t.count||1]);
 const jrC = B ? cnt(P,x=>x.j) : cnt([...(PRTOP||[]),...(PRNEW||[])],
   w=>((w.primary_location||{}).source||{}).display_name);
 const jrs=Object.entries(jrC).sort((a,b)=>b[1]-a[1]).slice(0,7)
   .map(([j,n])=>{const sub=rows.filter(r=>r.j===j);
     return [j,n,Math.max(...sub.map(r=>r.g),0), sub.reduce((a,r)=>a+(r.c||0),0)];});
 const coaC={}; if(!B) [...(PRTOP||[]),...(PRNEW||[])].forEach(w=>(w.authorships||[]).forEach(a=>{
   const n2=a.author&&a.author.display_name; if(n2&&n2!==o.name) coaC[n2]=(coaC[n2]||0)+1;}));
 const coa = B ? ((B.rec.kids||[]).slice(0,14).map(k=>[k.name||'', '교내', k.np||1, 0, 0]))
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
  subj, kw:[], hhi:0, jrs, coa, nco:B?((B.rec.kids||[]).length):Object.keys(coaC).length,
  rep, ev, trust, shift:subj.slice(0,7).map(([f,n])=>[f,n,n]), mid:0,
  field:(B?B.gy:'교외'), band:(B?B.kind:'교외'), peer,
  code:(o.name||''), _bk:!!B};
}
