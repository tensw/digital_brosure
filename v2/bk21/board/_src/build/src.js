/* ══════════ 데이터 근거 ══════════
   화면마다 «어떤 표에서 어떻게 세었는지»를 같은 형식으로 적는다.
   숫자만 있고 출처가 없으면 그 숫자는 검증할 수 없다. */
const SRCC={adm:'--s-amber',rims:'--s-blue',ext:'--s-violet',gen:'--s-green'};
let SRCOPEN={};

function srcCard(key){
 const P=(SRC.pages||{})[key]; if(!P) return '';
 const open=!!SRCOPEN[key];
 return `<div class="ecard srcc" data-srck="${esc(key)}">
  <h3><i class="si">◧</i>이 화면의 데이터 근거
   <span class="pill off">${esc(P.t)}</span>
   <button class="fbtn srctog" data-srctog="${esc(key)}" style="margin-left:auto">${open?'접기':'자세히'}</button></h3>
  <div class="insight"><span class="ic">→</span><div class="tx">
   이 화면의 숫자가 <b>어느 자료에서 나왔는지</b> 밝히는 칸입니다.
   출처와 집계 단위가 다르면 같은 이름의 숫자라도 값이 달라집니다.
   다른 자료와 숫자가 안 맞을 때 여기를 먼저 맞춰 보십시오.</div></div>
  <div class="srcrow">
   <div><span class="k">원천</span><b>${P.src.map(x=>esc(x.split(' — ')[0])).join(' · ')}</b></div>
   <div><span class="k">집계 단위</span><b>${P.unit}</b></div>
  </div>
  ${open?`<div class="srcdet">
   <div class="sd"><div class="h">쓰는 표·API</div><ul>${P.src.map(x=>{
     const [a,b]=x.split(' — '); return `<li><code>${esc(a)}</code>${b?`<span>${esc(b)}</span>`:''}</li>`;}).join('')}</ul></div>
   <div class="sd"><div class="h">만드는 순서</div><ol>${P.steps.map(s=>`<li>${s}</li>`).join('')}</ol></div>
   <div class="sd wide"><div class="h warn">읽을 때 주의</div><p>${P.limit}</p></div>
  </div>`:''}</div>`;
}

/* 관계망은 만드는 과정 자체가 근거다 — 단계로 편다 */
function srcNetCard(){
 const N=SRC.net;
 return `<div class="ecard srcnet"><h3><i class="si">◨</i>${esc(N.t)}</h3>
  ${ins(`앞의 그림들이 <b>어떤 규칙으로 그려졌는지</b> 단계별로 적었습니다.
   선을 잇는 기준을 알아야 그림을 믿을 수 있습니다.
   특히 <b>같은 이름의 다른 사람</b>을 어떻게 갈랐는지가 관계망의 신뢰도를 좌우합니다.`)}
  <div class="d">${N.d}</div>
  <div class="nsteps">${N.steps.map(s=>`<div class="ns">
    <div class="no">${esc(s.n)}</div>
    <div class="nb"><div class="nt">${esc(s.t)}</div><div class="nd">${s.d}</div></div>
    <div class="nv">${esc(s.v)}</div></div>`).join('')}</div>
  <div class="nfact">${N.facts.map(([k,v,d])=>`<div><span class="k">${esc(k)}</span><b>${esc(v)}</b><span class="s">${esc(d)}</span></div>`).join('')}</div>
  <div class="d warn2">${N.limit}</div></div>`;
}

/* 네 갈래 전체 — 데이터풀 화면 아래에 한 번만 편다 */
function srcAllCard(){
 return `<div class="ecard srcall"><h3><i class="si">◫</i>이 대시보드가 쓰는 데이터 전부</h3>${ins(`이 화면들이 <b>어떤 자료 위에 서 있는지</b> 모아 놓았습니다. 숫자를 밖에 낼 때 <b>출처를 함께 밝히는 데</b> 쓰십시오.`)}
  <div class="d">${SRC.meta.intro}</div>
  <div class="slayers">${SRC.layers.map(L=>`<div class="sl" style="--sc:var(${SRCC[L.k]||'--s-blue'})">
    <div class="lt">${esc(L.t)}</div><div class="ld">${L.d}</div>
    <table class="slt"><tbody>${L.rows.map(([a,b,c])=>`<tr>
      <td class="a"><code>${esc(a)}</code></td><td class="b">${esc(b)}</td><td class="c">${c}</td></tr>`).join('')}</tbody></table>
   </div>`).join('')}</div>
  ${SRC.terms?`<div class="sterm"><div class="lt">${esc(SRC.terms.t)}</div>
   <div class="ld">${esc(SRC.terms.d)}</div>
   <div class="tg">${SRC.terms.rows.map(([k,v])=>`<div><b>${esc(k)}</b><span>${v}</span></div>`).join('')}</div></div>`:''}
  <div class="d" style="margin-top:12px">기준일 <b>${esc(SRC.meta.measured)}</b>.
   숫자는 자료를 하나씩 세어 낸 값입니다. 다만 <b>세계 논문 색인 사본 두 개</b>는 1억 건이 넘어 세는 데 오래 걸리므로,
   데이터베이스가 알려 주는 대략치를 적었습니다.</div></div>`;
}

function srcWire(root){
 (root||document).querySelectorAll('[data-srctog]').forEach(b=>b.onclick=()=>{
  const k=b.dataset.srctog; SRCOPEN[k]=!SRCOPEN[k];
  const boards={sheet:'sheetBoard',univ:'univBoard',exec:'execBoard',net:'netBoard',
                glob:'globBoard',exp:'exploreBoard',pool:'poolBoard'};
  if(k==='tree'&&typeof window.treeSrcFill==='function'){ window.treeSrcFill(); return; }
  const fn=window[boards[k]]; if(typeof fn==='function'){ fn(); }
 });
}
