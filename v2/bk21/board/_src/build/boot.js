/* 화면 테마
   기본은 라이트, 데이터 풀만 다크로 연다(유리 큐브는 어두운 바탕에서 보인다).
   사용자가 버튼으로 고르면 그 선택이 모든 화면에 우선한다. */
(function(){
 const R=document.documentElement, B=document.getElementById('thmb');
 const KEY='bk21-theme';
 const get=()=>{try{return localStorage.getItem(KEY)}catch(e){return null}};
 const DARK_VIEWS=new Set(['pool']);
 let VIEW='sheet';
 function paint(v){
  if(v) VIEW=v;
  const pick=get();                                   // 'light' | 'dark' | null(기본)
  const eff=pick || (DARK_VIEWS.has(VIEW)?'dark':'light');
  R.setAttribute('data-theme',eff);
  const i=document.getElementById('thmi'), s=document.getElementById('thmt');
  if(i&&s&&B){
   i.textContent=pick==='dark'?'☾':pick==='light'?'☀':'◐';
   s.textContent=pick==='dark'?'다크':pick==='light'?'라이트':'자동';
   B.title='화면 테마 — '+(pick?(pick==='dark'?'다크 고정':'라이트 고정')
     :'자동 (기본은 밝게, 데이터 풀만 어둡게)')+' · 눌러서 전환';
  }
 }
 if(B) B.onclick=()=>{
  const nx={null:'light', light:'dark', dark:null}[String(get())];
  try{ nx?localStorage.setItem(KEY,nx):localStorage.removeItem(KEY); }catch(e){}
  paint();
 };
 window.paintTheme=paint;
 paint();
})();

/* 로그인한 사람 표시와 로그아웃 */
(function(){
 const B=document.getElementById('lgob'); if(!B) return;
 const who=(()=>{ const c=(document.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('bk21_u='));
  if(!c) return null; try{ return JSON.parse(decodeURIComponent(c.slice(7))); }catch(e){ return null; } })();
 const t=document.getElementById('lgot');
 if(who&&t){ t.textContent=who.u; B.title='로그아웃 · '+who.u+(who.role==='admin'?' (관리자)':' (일반)');
  if(who.role==='admin') B.classList.add('adm'); }
 B.onclick=async()=>{
  B.disabled=true;
  try{ await fetch('/api/auth/logout',{method:'POST'}); }catch(_){}
  document.cookie='bk21_u=; Path=/; Max-Age=0';
  location.replace('/login/');
 };
})();

/* 첫 화면 — 모든 모듈이 정의된 뒤 실행한다 */
(function(){ const t=document.getElementById('treesrc');
 if(t){ const fill=()=>{ t.innerHTML=srcCard('tree'); srcWire(t); };
  window.treeSrcFill=fill; fill(); } })();
if(!(typeof routeHash==='function' && routeHash())) setView('sheet');
visInit();
