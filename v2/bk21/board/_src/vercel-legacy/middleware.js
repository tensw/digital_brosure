/* 로그인 관문 — 요청이 파일에 닿기 전에 여기서 막는다.
   쿠키가 없거나 위조되면 로그인 화면으로 보낸다. */
export const config = { matcher: '/((?!_next|favicon.ico).*)' };

const OPEN = new Set(['/login', '/login.html', '/api/login', '/api/logout', '/robots.txt']);

function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const bin = atob(s + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function verify(token, secret) {
  /* 위조·손상된 값이 오면 예외가 아니라 '통과 안 됨'으로 끝나야 한다 */
  try {
    if (!token || token.indexOf('.') < 0) return null;
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('HMAC', key, b64urlToBytes(sig), new TextEncoder().encode(body));
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(b64urlToBytes(body)));
    if (!p.exp || Date.now() > p.exp) return null;      // 만료
    return p;
  } catch (_) { return null; }
}

export default async function middleware(req) {
  const url = new URL(req.url);
  if (OPEN.has(url.pathname)) return;

  const secret = process.env.AUTH_SECRET;
  if (!secret) return;                                   // 비밀키가 없으면 관문을 걸지 않는다(설정 누락 시 잠김 방지)

  let user = null;
  try {
    const raw = (req.headers.get('cookie') || '')
      .split(';').map(s => s.trim()).find(s => s.startsWith('bk21_s='));
    if (raw) user = await verify(decodeURIComponent(raw.slice(7)), secret);
  } catch (_) { user = null; }

  if (!user) {
    const to = new URL('/login', url);
    to.searchParams.set('next', url.pathname + url.search);
    return Response.redirect(to, 302);
  }
}
