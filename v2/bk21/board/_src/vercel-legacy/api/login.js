/* 아이디·비밀번호 확인 — 계정은 환경변수에만 둔다(파일에 넣지 않는다) */
export const config = { runtime: 'edge' };

const b64url = b => btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');

async function sign(payload, secret) {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return body + '.' + b64url(new Uint8Array(sig));
}

/* AUTH_USERS 형식: "아이디:비번:역할,아이디:비번:역할" */
function findUser(id, pw) {
  const rows = (process.env.AUTH_USERS || '').split(',').map(s => s.trim()).filter(Boolean);
  for (const r of rows) {
    const [u, p, role] = r.split(':');
    if (u === id && p === pw) return { u, role: role || 'user' };
  }
  return null;
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  const secret = process.env.AUTH_SECRET;
  if (!secret) return Response.json({ ok:false, msg:'서버 설정이 끝나지 않았습니다' }, { status:500 });

  let id = '', pw = '';
  try { const b = await req.json(); id = (b.id||'').trim(); pw = b.pw||''; } catch(_) {}

  const hit = findUser(id, pw);
  if (!hit) {
    await new Promise(r => setTimeout(r, 600));          // 무차별 대입을 늦춘다
    return Response.json({ ok:false, msg:'아이디 또는 비밀번호가 맞지 않습니다' }, { status:401 });
  }

  const days = 7;
  const token = await sign({ u: hit.u, role: hit.role, exp: Date.now() + days*864e5 }, secret);
  const age = days * 86400;
  const h = new Headers({ 'content-type': 'application/json' });
  /* 관문용 쿠키는 스크립트가 못 읽게(HttpOnly), 화면 표시용은 읽을 수 있게 따로 둔다 */
  h.append('set-cookie', `bk21_s=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`);
  h.append('set-cookie', `bk21_u=${encodeURIComponent(JSON.stringify({u:hit.u, role:hit.role}))}; Path=/; Secure; SameSite=Lax; Max-Age=${age}`);
  return new Response(JSON.stringify({ ok:true, user:hit.u, role:hit.role }), { status:200, headers:h });
}
