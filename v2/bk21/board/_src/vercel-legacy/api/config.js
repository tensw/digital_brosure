/* 화면 구성 저장 — 관리자가 고른 «일반 사용자에게 숨길 것» 목록.
   읽기는 누구나(로그인한 사람), 쓰기는 관리자만. 비밀키는 환경변수에만 둔다. */
export const config = { runtime: 'edge' };

const SB = () => ({ url: process.env.SB_URL, key: process.env.SB_SERVICE_KEY });
const TBL = 'bk21_ui_visibility';

function b64urlToBytes(s){
  s = s.replace(/-/g,'+').replace(/_/g,'/');
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const bin = atob(s + pad); const out = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function whoami(req){
  try{
    const secret = process.env.AUTH_SECRET; if(!secret) return null;
    const raw = (req.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('bk21_s='));
    if(!raw) return null;
    const token = decodeURIComponent(raw.slice(7));
    const [body, sig] = token.split('.'); if(!body||!sig) return null;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
      {name:'HMAC',hash:'SHA-256'}, false, ['verify']);
    const ok = await crypto.subtle.verify('HMAC', key, b64urlToBytes(sig), new TextEncoder().encode(body));
    if(!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(b64urlToBytes(body)));
    if(!p.exp || Date.now() > p.exp) return null;
    return p;
  }catch(_){ return null; }
}

async function load(){
  const {url,key} = SB(); if(!url||!key) return [];
  const r = await fetch(`${url}/rest/v1/${TBL}?id=eq.1&select=hidden`,
    { headers:{ apikey:key, Authorization:'Bearer '+key } });
  if(!r.ok) return [];
  const rows = await r.json();
  return Array.isArray(rows) && rows[0] && Array.isArray(rows[0].hidden) ? rows[0].hidden : [];
}

export default async function handler(req){
  const me = await whoami(req);
  if(!me) return Response.json({ ok:false, msg:'로그인이 필요합니다' }, { status:401 });

  if(req.method === 'GET'){
    return new Response(JSON.stringify({ ok:true, hidden: await load(), role: me.role }), {
      status:200, headers:{ 'content-type':'application/json', 'cache-control':'no-store' } });
  }

  if(req.method === 'POST'){
    if(me.role !== 'admin') return Response.json({ ok:false, msg:'관리자만 저장할 수 있습니다' }, { status:403 });
    const {url,key} = SB();
    if(!url||!key) return Response.json({ ok:false, msg:'저장소 설정이 끝나지 않았습니다' }, { status:500 });
    let hidden = [];
    try{ const b = await req.json(); if(Array.isArray(b.hidden)) hidden = b.hidden.filter(x=>typeof x==='string').slice(0,500); }
    catch(_){ return Response.json({ ok:false, msg:'요청 형식이 올바르지 않습니다' }, { status:400 }); }
    const r = await fetch(`${url}/rest/v1/${TBL}?id=eq.1`, {
      method:'PATCH',
      headers:{ apikey:key, Authorization:'Bearer '+key, 'content-type':'application/json', Prefer:'return=representation' },
      body: JSON.stringify({ hidden, updated_at:new Date().toISOString(), updated_by: me.u })
    });
    if(!r.ok) return Response.json({ ok:false, msg:'저장하지 못했습니다 ('+r.status+')' }, { status:502 });
    return Response.json({ ok:true, n: hidden.length });
  }

  return new Response('Method Not Allowed', { status:405 });
}
