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
  if (!db.admins || !db.admins.length) db.admins = [ADMIN];   // 최초 관리자
  return db;
}
function save() {
  fs.writeFileSync(STORE, JSON.stringify(db, null, 2), { mode: 0o600 });
}

const norm = (e) => String(e || '').trim().toLowerCase();
const isAdmin = (e) => load().admins.indexOf(norm(e)) >= 0;
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
    admin: isAdmin(e), updatedAt: new Date().toISOString(),
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
  const now = new Date().toISOString();
  u.admin = isAdmin(e);                       // 관리자 지정은 로그인 때 반영된다
  u.loginCount = (u.loginCount || 0) + 1;
  u.firstLoginAt = u.firstLoginAt || now;
  u.lastLoginAt = now;
  d.users[e] = u; save();
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


/* ── 초대 목록 ──
   목록이 비어 있으면 누구나 초기 비밀번호로 들어온다.
   한 명이라도 넣으면 그때부터 목록에 있는 이메일만 새로 가입된다.
   이메일은 공개 저장소에 남기지 않는다(서버의 .auth-store.json 에만 있다). */
function allowList() { return load().allow.slice(); }
function setAllow(opt) {
  const d = load();
  const set = new Set(d.allow);
  (opt.add || []).forEach(e => { const n = norm(e); if (n) set.add(n); });
  (opt.remove || []).forEach(e => set.delete(norm(e)));
  d.allow = Array.from(set).sort();
  save();
  return d.allow.slice();
}
function adminList() { return load().admins.slice(); }
function setAdmin(email, on) {
  const d = load(), e = norm(email);
  const set = new Set(d.admins);
  if (on) { set.add(e); if (d.allow.length) setAllow({ add: [e] }); }
  else {
    if (set.size <= 1) return { ok: false, msg: '관리자를 모두 없앨 수는 없습니다.' };
    set.delete(e);
  }
  d.admins = Array.from(set).sort();
  if (d.users[e]) { d.users[e].admin = d.admins.indexOf(e) >= 0; }
  save();
  return { ok: true, admins: d.admins.slice() };
}

/* 워터마크용 계정 코드 — 이메일을 화면에 그대로 쓰지 않으면서 누구 화면인지 남긴다 */
function codeOf(email) {
  const d = load();
  return crypto.createHmac('sha256', d.secret).update(norm(email)).digest('hex')
    .slice(0, 6).toUpperCase();
}
function listUsers() {
  const d = load();
  return Object.keys(d.users).sort().map(e => ({
    email: e, admin: isAdmin(e), mustChange: !!d.users[e].mustChange,
    createdAt: d.users[e].createdAt, updatedAt: d.users[e].updatedAt,
    loginCount: d.users[e].loginCount || 0,
    firstLoginAt: d.users[e].firstLoginAt || null,
    lastLoginAt: d.users[e].lastLoginAt || null }));
}
function resetPw(email) {
  const d = load(), e = norm(email);
  if (!d.users[e]) return { ok: false, msg: '계정이 없습니다.' };
  setPw(e, INIT_PW, true);
  return { ok: true };
}

module.exports = { load, session, login, changePw, cookieHeader, COOKIE, ADMIN, norm,
                   allowList, setAllow, listUsers, resetPw, adminList, setAdmin, isAdmin, codeOf };
