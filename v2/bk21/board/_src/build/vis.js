/* ══════════ 화면 구성 (관리자) ══════════
   관리자가 «일반 사용자에게 숨길 것»을 화면에서 직접 고른다.
   좌측 메뉴를 누르면 그 화면 전체가, 카드를 누르면 그 카드만 숨겨진다. */
let VIS = { hidden: [], role: 'user', on: false, dirty: false, ready: false };

/* 카드마다 영문+숫자 고유 아이디를 붙인다 (sheet-c01 …).
   제목으로 식별하면 문구만 고쳐도 설정이 풀린다. */
const VIEWS = ['tree','exec','net','glob','exp','univ','sheet','pool','ucmp'];
function visStamp(){
 VIEWS.forEach(vid=>{
  const view = document.getElementById('v-'+vid); if(!view) return;
  let n = 0;
  view.querySelectorAll('.ecard,.xpanel,.pane').forEach(c=>{
   if(c.closest('.rail')) return;
   c.dataset.cid = vid + '-c' + String(++n).padStart(2,'0');
  });
 });
 document.querySelectorAll('.rail button[data-v]').forEach(b=>{ b.dataset.cid = 'm-' + b.dataset.v; });
}
const visKey = el => el.dataset.cid || '';
const visHas = k => VIS.hidden.indexOf(k) >= 0;

/* 일반 사용자에게 감춘다 — 관리자는 편집을 위해 반투명으로 남겨 둔다 */
function visApply(){
 if(!VIS.ready) return;
 visStamp();
 const admin = VIS.role === 'admin';
 /* 관리자는 평소에 전부 그대로 본다. 무엇이 숨겨졌는지는 설정을 눌렀을 때만 흐려진다. */
 const mark = admin && VIS.on;
 document.querySelectorAll('.rail button[data-v]').forEach(b=>{
  const off = visHas('m-' + b.dataset.v);
  b.classList.toggle('vis-off', off && mark);
  b.style.display = (off && !admin) ? 'none' : '';
 });
 document.querySelectorAll('[data-cid]').forEach(c=>{
  if(c.closest('.rail')) return;
  const off = visHas(c.dataset.cid);
  c.classList.toggle('vis-off', off && mark);
  c.style.display = (off && !admin) ? 'none' : '';
 });
 /* 숨긴 화면이 열려 있으면 보이는 첫 화면으로 옮긴다 */
 if(!admin){
  const cur=[...document.querySelectorAll('.rail button[data-v]')].find(b=>b.classList.contains('on'));
  if(cur && visHas('menu:'+cur.dataset.v)){
   const ok=[...document.querySelectorAll('.rail button[data-v]')].find(b=>!visHas('menu:'+b.dataset.v));
   if(ok) setView(ok.dataset.v);
  }
 }
}

function visBar(){
 let el=document.getElementById('visbar');
 if(!VIS.on){ el&&el.remove(); return; }
 if(!el){ el=document.createElement('div'); el.id='visbar'; el.className='visbar'; document.body.appendChild(el); }
 el.innerHTML=`<div class="vt"><b>화면 구성</b>
   <span>흐려진 것이 <b>일반 사용자에게 안 보이는 것</b>입니다. 눌러서 켜고 끕니다.</span></div>
  <div class="vn"><b>${VIS.hidden.length}</b>개 숨김</div>
  <button class="vb save" id="vsave"${VIS.dirty?'':' disabled'}>완료 저장</button>
  <button class="vb" id="vcancel">취소</button>`;
 el.querySelector('#vsave').onclick=visSave;
 el.querySelector('#vcancel').onclick=()=>visMode(false,true);
}

function visMode(on, revert){
 if(on && VIS.role!=='admin') return;
 if(revert && VIS.snapshot) VIS.hidden=VIS.snapshot.slice();
 VIS.on=on; VIS.dirty=false;
 if(on) VIS.snapshot=VIS.hidden.slice();
 document.body.classList.toggle('vis-edit',on);
 visApply(); visBar();
}

function visToggle(el, key){
 const i=VIS.hidden.indexOf(key);
 if(i>=0) VIS.hidden.splice(i,1); else VIS.hidden.push(key);
 VIS.dirty=true; visApply(); visBar();
}

async function visSave(){
 const b=document.getElementById('vsave'); if(b){b.disabled=true;b.textContent='저장 중…';}
 try{
  const r=await fetch('/api/config',{method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({hidden:VIS.hidden})});
  const d=await r.json();
  if(d.ok){ VIS.snapshot=VIS.hidden.slice(); VIS.dirty=false; visMode(false);
   visToast(`저장했습니다 · ${d.n}개 숨김`); }
  else visToast(d.msg||'저장하지 못했습니다', true);
 }catch(_){ visToast('저장하지 못했습니다', true); }
 if(b){b.disabled=false;b.textContent='완료 저장';}
 visBar();
}
function visToast(msg, bad){
 const t=document.createElement('div'); t.className='vistoast'+(bad?' bad':''); t.textContent=msg;
 document.body.appendChild(t); setTimeout(()=>t.remove(),2600);
}

/* 편집 중에는 클릭이 화면 이동이 아니라 «숨김 선택»이 되게 가로챈다 */
function visWire(){
 document.addEventListener('click', e=>{
  if(!VIS.on) return;
  if(e.target.closest('#visbar')||e.target.closest('#setb')) return;
  const menu=e.target.closest('.rail button[data-v]');
  if(menu){ e.preventDefault(); e.stopPropagation(); visToggle(menu,'m-'+menu.dataset.v); return; }
  /* 카드가 겹쳐 있어도 가장 안쪽 하나만 고른다 */
  const card=e.target.closest('[data-cid]');
  if(card && !card.closest('.rail')){ e.preventDefault(); e.stopPropagation(); visToggle(card, card.dataset.cid); }
 }, true);
}

async function visInit(){
 try{
  const r=await fetch('/api/config',{cache:'no-store'});
  if(r.ok){ const d=await r.json();
   if(d.ok){ VIS.hidden=Array.isArray(d.hidden)?d.hidden:[]; VIS.role=d.role||'user'; } }
 }catch(_){}
 VIS.ready=true;
 const S=document.getElementById('setb');
 if(S){
  if(VIS.role==='admin'){ S.hidden=false; S.disabled=false;
   S.onclick=()=>visMode(!VIS.on); }
  else S.remove();
 }
 visWire(); visApply();
}
