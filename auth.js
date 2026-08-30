/* biblo.ai/2026 로그인 게이트
   - 사용자 저장소는 저장소(git) 밖의 파일. 공개 레포에 비밀번호가 남지 않는다.
   - git reset --hard 는 추적하지 않는 파일을 지우지 않으므로 배포해도 유지된다.
   - 비밀번호는 scrypt 해시. 세션은 HMAC 서명 쿠키. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORE = path.join(__dirname, '.auth-store.json');
const ADMIN = 'ch.kim@tsw.im';
const INIT_PW = '1234';
const COOKIE = 'bx_s';
const TTL = 12 * 60 * 60 * 1000;               // 12시간

let db = null;

function load() {
  if (db) return db;
  try { db = JSON.parse(fs.readFileSync(STORE, 'utf8')); }
  catch (e) { db = { secret: crypto.randomBytes(32).toString('hex'), users: {}, allow: [] }; save(); }
  if (!db.secret) { db.secret = crypto.randomBytes(32).toString('hex'); save(); }
  if (!db.users) db.users = {};
  if (!db.allow) db.allow = [];
  return db;
}
function save() {
  fs.writeFileSync(STORE, JSON.stringify(db, null, 2), { mode: 0o600 });
}

const norm = (e) => String(e || '').trim().toLowerCase();
const hash = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString('hex');

function verify(pw, u) {
  const h = hash(pw, u.salt);
  const a = Buffer.from(h, 'hex'), b = Buffer.from(u.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function setPw(email, pw, mustChange) {
  const d = load(), e = norm(email);
  const salt = crypto.randomBytes(16).toString('hex');
  d.users[e] = Object.assign({}, d.users[e], {
    salt, hash: hash(pw, salt), mustChange: !!mustChange,
    admin: e === ADMIN, updatedAt: new Date().toISOString(),
    createdAt: (d.users[e] && d.users[e].createdAt) || new Date().toISOString(),
  });
  save();
  return d.users[e];
}

/* ── 세션 ── */
function sign(payload) {
  const d = load();
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', d.secret).update(body).digest('base64url');
  return body + '.' + mac;
}
function read(tok) {
  if (!tok || tok.indexOf('.') < 0) return null;
  const d = load(), [body, mac] = tok.split('.');
  const want = crypto.createHmac('sha256', d.secret).update(body).digest('base64url');
  if (mac.length !== want.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return null;
  let p; try { p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch (e) { return null; }
  if (!p || !p.e || !p.x || Date.now() > p.x) return null;
  return p;
}
function cookieOf(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1));
  }
  return null;
}
function session(req) { return read(cookieOf(req, COOKIE)); }

function cookieHeader(tok, maxAgeMs) {
  const bits = [COOKIE + '=' + encodeURIComponent(tok), 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Secure'];
  bits.push('Max-Age=' + Math.floor((maxAgeMs || 0) / 1000));
  return bits.join('; ');
}

/* ── 로그인 ── */
function login(email, pw) {
  const d = load(), e = norm(email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return { ok: false, msg: '이메일 형식이 아닙니다.' };
  let u = d.users[e];
  if (!u) {
    if (d.allow.length && d.allow.indexOf(e) < 0) return { ok: false, msg: '접근 권한이 없는 계정입니다.' };
    if (String(pw) !== INIT_PW) return { ok: false, msg: '이메일 또는 비밀번호가 맞지 않습니다.' };
    u = setPw(e, INIT_PW, true);                 // 첫 로그인 → 비밀번호 변경 필요
  } else if (!verify(pw, u)) {
    return { ok: false, msg: '이메일 또는 비밀번호가 맞지 않습니다.' };
  }
  const tok = sign({ e, a: !!u.admin, x: Date.now() + TTL });
  return { ok: true, token: tok, maxAge: TTL, mustChange: !!u.mustChange, admin: !!u.admin };
}

function changePw(email, curPw, newPw) {
  const d = load(), e = norm(email), u = d.users[e];
  if (!u) return { ok: false, msg: '계정을 찾을 수 없습니다.' };
  if (!verify(curPw, u)) return { ok: false, msg: '현재 비밀번호가 맞지 않습니다.' };
  const p = String(newPw || '');
  if (p.length < 8) return { ok: false, msg: '새 비밀번호는 8자 이상이어야 합니다.' };
  if (p === INIT_PW) return { ok: false, msg: '초기 비밀번호는 쓸 수 없습니다.' };
  setPw(e, p, false);
  return { ok: true };
}

module.exports = { load, session, login, changePw, cookieHeader, COOKIE, ADMIN, norm };
