/* biblo.ai/skku/future_research_pool — 성균관대 THE 최상위 예비군 관리 풀
   ─ 관리 풀(상위 10~15% · 성대 주저자 · 재학 대학원생 참여) 논문을 관리한다.
     관리 풀 → (관리자 선택) 홍보영상 제작 리스트 → (업체 제작 · 보고) 생성 완료 → (데이터 갱신 때 경계 FWCI 도달) 승격 완료(누적)
   ─ DB 엔진: node:sqlite(Node 22.13+) 또는 vendor/sqljs(sql.js WASM) — 아래 SqlJsDb 참고
   ─ 데이터 갱신은 2주에 한 번 수동: 분석 저장소의 tools/export_pool_snapshot.py 가 만든 JSON 을 「데이터 갱신」 탭에 올린다.

   저장소가 공개라서 데이터와 비밀은 모두 깃 밖에 둔다.
     .skku-pool/pool.db       SQLite 파일. 학번·성명이 들어 있다.
     .skku-pool/secrets.json  {"admin_id":"...","admin_pw":"..."} — 처음 한 번 관리자 계정을 만들 때만 읽는다(배포 시 GitHub 시크릿에서 씀)
   git reset --hard 는 추적하지 않는 파일을 지우지 않으므로 배포해도 남는다. 둘 다 .gitignore 에 있다.

   이 경로는 biblo.ai 의 다른 로그인과 따로 논다(자체 아이디·비밀번호 · 쿠키 경로도 이 아래로 한정). */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE = '/skku/future_research_pool';
const DIR = path.join(__dirname, '.skku-pool');
const DBFILE = path.join(DIR, 'pool.db');
const SECFILE = path.join(DIR, 'secrets.json');
const PAGE = path.join(__dirname, 'skku_pool', 'app.html');
const COOKIE = 'fp_s';
const TTL = 8 * 60 * 60 * 1000;                 // 8시간
const UPDATE_DAYS = 14;                         // 갱신 주기 정책

let db = null, dbErr = null, engine = null;

/* SQLite 엔진: Node 22.13+ 이면 내장 node:sqlite, 아니면 저장소에 함께 둔 sql.js(WASM · MIT, vendor/sqljs).
   서버가 Node 20 이라 sql.js 로 돈다. 둘 다 같은 SQLite 파일을 쓴다.
   sql.js 는 DB 를 메모리에 올리고, 쓰기(트랜잭션 커밋)마다 파일 전체를 임시 파일로 쓴 뒤 바꿔 끼운다(원자적). 이 규모(수 MB)에서 충분하다. */
class SqlJsDb {
  constructor(SQL, file) {
    this.file = file; this.inTx = false;
    this.d = new SQL.Database(fs.existsSync(file) ? fs.readFileSync(file) : undefined);
  }
  persist() {
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, Buffer.from(this.d.export()), { mode: 0o600 });
    fs.renameSync(tmp, this.file);
  }
  exec(sql) {
    const head = sql.trim().slice(0, 8).toUpperCase();
    this.d.exec(sql);
    if (head.startsWith('BEGIN')) this.inTx = true;
    else if (head.startsWith('ROLLBACK')) this.inTx = false;
    else if (head.startsWith('COMMIT')) { this.inTx = false; this.persist(); }
    else if (!this.inTx) this.persist();
  }
  prepare(sql) {
    const self = this;
    const rows = (a) => { const st = self.d.prepare(sql); try { st.bind(a.map(v => v === undefined ? null : v)); const out = [];
      while (st.step()) out.push(st.getAsObject()); return out; } finally { st.free(); } };
    return {
      all: (...a) => rows(a),
      get: (...a) => rows(a)[0],
      run: (...a) => {
        self.d.run(sql, a.map(v => v === undefined ? null : v));
        const changes = self.d.getRowsModified();
        const lastInsertRowid = self.d.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];
        if (!self.inTx) self.persist();
        return { changes, lastInsertRowid };
      },
    };
  }
}
let readyP = null;
function ready() {
  if (readyP) return readyP;
  readyP = (async () => {
    fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
    let Native = null;
    if (process.env.SKKU_POOL_ENGINE !== 'sqljs') { try { Native = require('node:sqlite').DatabaseSync; } catch (e) {} }   // 시험용으로 sql.js 를 강제할 수 있다
    if (Native) { db = new Native(DBFILE); engine = 'node:sqlite'; }
    else {
      const VEN = path.join(__dirname, 'vendor', 'sqljs');
      const SQL = await require(path.join(VEN, 'sql-wasm.js'))({ locateFile: (f) => path.join(VEN, f) });
      db = new SqlJsDb(SQL, DBFILE); engine = 'sql.js';
    }
    try { fs.chmodSync(DBFILE, 0o600); } catch (e) {}
    open();
  })().catch((e) => { dbErr = String(e && e.message || e); db = null; console.error('[future_research_pool] DB 엔진을 올리지 못했다:', dbErr); });
  return readyP;
}

/* ── DB ─────────────────────────────────────────────────────────── */
let schemaDone = false;
function open() {
  if (!db || dbErr) return null;
  if (schemaDone) return db;
  try {
    if (engine === 'node:sqlite') db.exec('PRAGMA journal_mode = WAL;');
    db.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, salt TEXT NOT NULL, hash TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT, uploaded_at TEXT NOT NULL, uploaded_by TEXT NOT NULL,
        generated_at TEXT, rims_db_time TEXT, n_papers INTEGER, n_new INTEGER, n_left INTEGER,
        n_promoted INTEGER, sha256 TEXT, note TEXT);
      CREATE TABLE IF NOT EXISTS papers (
        eid TEXT PRIMARY KEY, tier INTEGER NOT NULL DEFAULT 10, doi TEXT, title TEXT, journal TEXT, year INTEGER, doctype TEXT,
        main_authors TEXT, main_role TEXT, college TEXT,
        fwci REAL, fwci_date TEXT, cites INTEGER, cites_date TEXT, pct_census REAL, fwci_census REAL,
        target_fwci REAL, need INTEGER, cond_cur INTEGER, cond_pub INTEGER,
        report_rank_a INTEGER, report_rank_b INTEGER, grad_json TEXT,
        in_latest INTEGER NOT NULL DEFAULT 1, first_snapshot INTEGER, last_snapshot INTEGER);
      CREATE TABLE IF NOT EXISTS fwci_history (
        eid TEXT NOT NULL REFERENCES papers(eid), snapshot_id INTEGER NOT NULL REFERENCES snapshots(id),
        fwci REAL, cites INTEGER, PRIMARY KEY (eid, snapshot_id));
      CREATE TABLE IF NOT EXISTS video (
        eid TEXT PRIMARY KEY REFERENCES papers(eid),
        status TEXT NOT NULL CHECK (status IN ('requested','in_production','done')),
        requested_at TEXT NOT NULL, requested_by TEXT, started_at TEXT, done_at TEXT,
        video_url TEXT, note TEXT, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS promotion (                -- 누적: 한 번 승격하면 지우지 않는다. tier = 진입한 등급(상위 10% / 25%)
        eid TEXT NOT NULL REFERENCES papers(eid), tier INTEGER NOT NULL, promoted_on TEXT NOT NULL,
        snapshot_id INTEGER REFERENCES snapshots(id), fwci REAL, target_fwci REAL, PRIMARY KEY (eid, tier));
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, who TEXT, eid TEXT, action TEXT NOT NULL, detail TEXT);
      CREATE INDEX IF NOT EXISTS ix_events_at ON events(at);
    `);
    if (!get('SELECT v FROM meta WHERE k = ?', 'secret'))
      run('INSERT INTO meta (k, v) VALUES (?, ?)', 'secret', crypto.randomBytes(32).toString('hex'));
    bootstrapAdmin();
    schemaDone = true;
  } catch (e) {
    dbErr = String(e && e.message || e);
    db = null;
    console.error('[future_research_pool] DB 를 열지 못했다:', dbErr);
  }
  return db;
}
const all = (sql, ...a) => db.prepare(sql).all(...a);
const get = (sql, ...a) => db.prepare(sql).get(...a);
const run = (sql, ...a) => db.prepare(sql).run(...a);
function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { try { db.exec('ROLLBACK'); } catch (e2) {} throw e; }
}
const now = () => new Date().toISOString();
const today = () => {   // 한국 날짜
  const d = new Date(Date.now() + 9 * 3600 * 1000); return d.toISOString().slice(0, 10);
};
function log(who, eid, action, detail) {
  run('INSERT INTO events (at, who, eid, action, detail) VALUES (?, ?, ?, ?, ?)',
      now(), who || null, eid || null, action, detail ? String(detail).slice(0, 500) : null);
}

/* ── 계정 ───────────────────────────────────────────────────────── */
const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString('hex');
function setPw(id, pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  run(`INSERT INTO users (id, salt, hash, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET salt = excluded.salt, hash = excluded.hash, updated_at = excluded.updated_at`,
      id, salt, hashPw(pw, salt), now());
}
function bootstrapAdmin() {
  if (get('SELECT COUNT(*) AS n FROM users').n > 0) return;
  let s = {};
  try { s = JSON.parse(fs.readFileSync(SECFILE, 'utf8')); } catch (e) {}
  const id = s.admin_id || process.env.SKKU_POOL_ADMIN_ID;
  const pw = s.admin_pw || process.env.SKKU_POOL_ADMIN_PW;
  if (id && pw) { setPw(String(id).trim(), String(pw)); log('system', null, 'admin_created', id); }
}
function verify(id, pw) {
  const u = get('SELECT * FROM users WHERE id = ?', String(id || '').trim());
  if (!u) { hashPw(pw, 'x'.repeat(32)); return false; }   // 시간 차이로 아이디 유무가 드러나지 않게
  const a = Buffer.from(hashPw(pw, u.salt), 'hex'), b = Buffer.from(u.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const secret = () => get('SELECT v FROM meta WHERE k = ?', 'secret').v;
function sign(p) {
  const body = Buffer.from(JSON.stringify(p)).toString('base64url');
  return body + '.' + crypto.createHmac('sha256', secret()).update(body).digest('base64url');
}
function session(req) {
  const raw = req.headers.cookie || '';
  let tok = null;
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === COOKIE) tok = decodeURIComponent(part.slice(i + 1));
  }
  if (!tok || tok.indexOf('.') < 0) return null;
  const [body, mac] = tok.split('.');
  const want = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  if (!mac || mac.length !== want.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return null;
  let p; try { p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch (e) { return null; }
  if (!p || !p.u || Date.now() > p.x) return null;
  const u = get('SELECT updated_at FROM users WHERE id = ?', p.u);
  if (!u || u.updated_at !== p.v) return null;               // 비밀번호를 바꾸면 이전 세션은 끊긴다
  return p;
}
function cookie(tok, maxAge, secure) {
  const bits = [COOKIE + '=' + encodeURIComponent(tok), 'Path=' + BASE, 'HttpOnly', 'SameSite=Strict',
                'Max-Age=' + Math.floor(maxAge / 1000)];
  if (secure) bits.push('Secure');
  return bits.join('; ');
}
const isHttps = (req) => (req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';

/* 로그인 시도 제한 — IP 당 10분에 10회 */
const TRY = new Map();
function tryOk(ip) {
  const t = Date.now(), a = (TRY.get(ip) || []).filter(x => t - x < 600000);
  TRY.set(ip, a); if (TRY.size > 5000) TRY.clear();
  return a.length < 10;
}
const noteTry = (ip) => { const a = TRY.get(ip) || []; a.push(Date.now()); TRY.set(ip, a); };
const ipOf = (req) => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '?';

/* ── HTTP 도우미 ─────────────────────────────────────────────────── */
function json(res, code, obj, extra) {
  res.writeHead(code, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow, noarchive' }, extra || {}));
  res.end(JSON.stringify(obj));
}
function body(req, limit, cb) {
  let n = 0, dead = false; const chunks = [];
  req.on('data', d => { if (dead) return; n += d.length;
    if (n > limit) { dead = true; cb(null, 'too_large'); req.destroy(); return; } chunks.push(d); });
  req.on('end', () => { if (dead) return;
    try { cb(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { cb(null, 'bad_json'); } });
}
/* 쓰기 요청은 같은 출처에서 온 것만 받는다(SameSite 쿠키에 더한 이중 확인) */
function sameOrigin(req) {
  const o = req.headers.origin; if (!o) return true;
  try { return new URL(o).host === req.headers.host; } catch (e) { return false; }
}

/* ── 조회 ───────────────────────────────────────────────────────── */
const PAPER_SQL = `
  SELECT p.*, v.status AS video_status, v.requested_at, v.started_at, v.done_at, v.video_url, v.note AS video_note,
         pr.promoted_on, pr.fwci AS promoted_fwci
  FROM papers p LEFT JOIN video v ON v.eid = p.eid LEFT JOIN promotion pr ON pr.eid = p.eid AND pr.tier = p.tier`;
function rowOut(r) {
  let grad = []; try { grad = JSON.parse(r.grad_json || '[]'); } catch (e) {}
  const o = Object.assign({}, r, { grad, cond_cur: !!r.cond_cur, cond_pub: !!r.cond_pub, in_latest: !!r.in_latest });
  delete o.grad_json; return o;
}
function state() {
  const last = get('SELECT * FROM snapshots ORDER BY id DESC LIMIT 1') || null;
  const papers = all(PAPER_SQL + ' ORDER BY p.year, p.fwci DESC').map(rowOut);
  const c = (f) => papers.filter(f).length;
  let due = null;
  if (last) { const d = new Date(last.uploaded_at); d.setDate(d.getDate() + UPDATE_DAYS); due = d.toISOString().slice(0, 10); }
  return {
    papers,
    counts: { pool: c(p => p.in_latest && !p.promoted_on), requested: c(p => p.video_status === 'requested'),
              in_production: c(p => p.video_status === 'in_production'), done: c(p => p.video_status === 'done'),
              promoted: c(p => !!p.promoted_on) },
    promotions: all('SELECT * FROM promotion ORDER BY promoted_on DESC'),
    last, due, policy_days: UPDATE_DAYS,
    snapshots: all('SELECT * FROM snapshots ORDER BY id DESC LIMIT 30'),
    events: all('SELECT * FROM events ORDER BY id DESC LIMIT 200'),
  };
}

/* ── 데이터 갱신 ─────────────────────────────────────────────────── */
function importSnapshot(snap, who, raw) {
  if (!snap || snap.kind !== 'skku_future_research_pool' || !Array.isArray(snap.papers))
    return { ok: false, msg: '관리 풀 스냅샷 파일이 아닙니다 (export_pool_snapshot.py 결과를 올려 주세요).' };
  if (!snap.papers.length) return { ok: false, msg: '논문이 없는 스냅샷입니다.' };
  const sha = crypto.createHash('sha256').update(raw).digest('hex');
  if (get('SELECT id FROM snapshots WHERE sha256 = ?', sha)) return { ok: false, msg: '이미 올린 파일입니다.' };
  for (const p of snap.papers) {
    if (!p || typeof p.eid !== 'string' || !/^2-s2\.0-\d+$/.test(p.eid) || !Number.isFinite(+p.year) || !Number.isFinite(+p.fwci) || !Number.isFinite(+p.target_fwci))
      return { ok: false, msg: '형식이 맞지 않는 논문 행이 있습니다: ' + String(p && p.eid).slice(0, 40) };
  }
  return tx(() => {
    const sid = Number(run(`INSERT INTO snapshots (uploaded_at, uploaded_by, generated_at, rims_db_time, n_papers, sha256)
                             VALUES (?, ?, ?, ?, ?, ?)`, now(), who, snap.generated_at || null, snap.rims_db_time || null,
                           snap.papers.length, sha).lastInsertRowid);
    const asOf = String(snap.rims_db_time || snap.generated_at || today()).slice(0, 10);
    const before = new Set(all('SELECT eid FROM papers WHERE in_latest = 1').map(r => r.eid));
    const known = new Set(all('SELECT eid FROM papers').map(r => r.eid));
    run('UPDATE papers SET in_latest = 0');
    const up = db.prepare(`INSERT INTO papers (eid, tier, doi, title, journal, year, doctype, main_authors, main_role, college, fwci, fwci_date,
        cites, cites_date, pct_census, fwci_census, target_fwci, need, cond_cur, cond_pub, report_rank_a, report_rank_b, grad_json,
        in_latest, first_snapshot, last_snapshot)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)
      ON CONFLICT(eid) DO UPDATE SET tier=excluded.tier, doi=excluded.doi, title=excluded.title, journal=excluded.journal, year=excluded.year,
        doctype=excluded.doctype, main_authors=excluded.main_authors, main_role=excluded.main_role, college=excluded.college,
        fwci=excluded.fwci, fwci_date=excluded.fwci_date, cites=excluded.cites, cites_date=excluded.cites_date,
        pct_census=excluded.pct_census, fwci_census=excluded.fwci_census, target_fwci=excluded.target_fwci, need=excluded.need,
        cond_cur=excluded.cond_cur, cond_pub=excluded.cond_pub, report_rank_a=excluded.report_rank_a, report_rank_b=excluded.report_rank_b,
        grad_json=excluded.grad_json, in_latest=1, last_snapshot=excluded.last_snapshot`);
    const hist = db.prepare('INSERT OR REPLACE INTO fwci_history (eid, snapshot_id, fwci, cites) VALUES (?, ?, ?, ?)');
    const promo = db.prepare('INSERT OR IGNORE INTO promotion (eid, tier, promoted_on, snapshot_id, fwci, target_fwci) VALUES (?, ?, ?, ?, ?, ?)');
    let nNew = 0, nPromo = 0;
    const s = (v) => (v === undefined || v === null) ? null : String(v);
    const n = (v) => (v === undefined || v === null || v === '') ? null : Number(v);
    for (const p of snap.papers) {
      if (!known.has(p.eid)) nNew++;
      const tier = Number(p.tier) === 25 ? 25 : 10;
      up.run(p.eid, tier, s(p.doi), s(p.title), s(p.journal), n(p.year), s(p.doctype), s(p.main_authors), s(p.main_role), s(p.college),
             n(p.fwci), s(p.fwci_date), n(p.cites), s(p.cites_date), n(p.pct_census), n(p.fwci_census), n(p.target_fwci), n(p.need),
             p.cond_cur ? 1 : 0, p.cond_pub ? 1 : 0, n(p.report_rank_a), n(p.report_rank_b), JSON.stringify(p.grad || []), sid, sid);
      hist.run(p.eid, sid, n(p.fwci), n(p.cites));
      /* 승격: 최신 FWCI 가 그 등급·출판연도의 경계 FWCI(상위 10% 또는 25%) 이상. 한 번 승격하면 누적으로 남는다. */
      if (Number(p.fwci) >= Number(p.target_fwci)) {
        const r = promo.run(p.eid, tier, asOf, sid, n(p.fwci), n(p.target_fwci));
        if (r.changes) { nPromo++; log(who, p.eid, 'promoted', `상위 ${tier}% 진입 · FWCI ${p.fwci} ≥ 경계 ${p.target_fwci}`); }
      }
    }
    const inSnap = new Set(snap.papers.map(p => p.eid));
    const nLeft = [...before].filter(e => !inSnap.has(e)).length;
    run('UPDATE snapshots SET n_new = ?, n_left = ?, n_promoted = ? WHERE id = ?', nNew, nLeft, nPromo, sid);
    log(who, null, 'snapshot_import', `#${sid} 논문 ${snap.papers.length} · 신규 ${nNew} · 이탈 ${nLeft} · 승격 ${nPromo}`);
    return { ok: true, id: sid, n: snap.papers.length, n_new: nNew, n_left: nLeft, n_promoted: nPromo };
  });
}

/* ── 영상 ───────────────────────────────────────────────────────── */
const DATE = /^\d{4}-\d{2}-\d{2}$/;
function videoOp(b, who) {
  const eids = (Array.isArray(b.eids) ? b.eids : []).filter(e => typeof e === 'string').slice(0, 500);
  if (!eids.length) return { ok: false, msg: '논문을 고르세요.' };
  const op = b.op;
  const url = b.url ? String(b.url).trim().slice(0, 500) : null;
  if (url && !/^https?:\/\//i.test(url)) return { ok: false, msg: '영상 주소는 http(s):// 로 시작해야 합니다.' };
  const date = b.date ? String(b.date) : today();
  if (!DATE.test(date)) return { ok: false, msg: '날짜 형식은 YYYY-MM-DD 입니다.' };
  const note = b.note ? String(b.note).slice(0, 300) : null;
  return tx(() => {
    let n = 0;
    for (const eid of eids) {
      if (!get('SELECT eid FROM papers WHERE eid = ?', eid)) continue;
      const v = get('SELECT * FROM video WHERE eid = ?', eid);
      if (op === 'request') {
        if (v) continue;
        run(`INSERT INTO video (eid, status, requested_at, requested_by, note, updated_at) VALUES (?, 'requested', ?, ?, ?, ?)`,
            eid, date, who, note, now());
      } else if (op === 'start') {
        if (!v || v.status === 'done') continue;
        run(`UPDATE video SET status = 'in_production', started_at = ?, updated_at = ? WHERE eid = ?`, date, now(), eid);
      } else if (op === 'done') {
        if (!v) continue;
        run(`UPDATE video SET status = 'done', done_at = ?, video_url = COALESCE(?, video_url), note = COALESCE(?, note),
             started_at = COALESCE(started_at, ?), updated_at = ? WHERE eid = ?`, date, url, note, date, now(), eid);
      } else if (op === 'reopen') {
        if (!v || v.status !== 'done') continue;
        run(`UPDATE video SET status = 'in_production', done_at = NULL, updated_at = ? WHERE eid = ?`, now(), eid);
      } else if (op === 'cancel') {
        if (!v || v.status === 'done') continue;
        run('DELETE FROM video WHERE eid = ?', eid);
      } else if (op === 'edit') {
        if (!v) continue;
        if (b.date && v.status === 'done') run('UPDATE video SET done_at = ? WHERE eid = ?', date, eid);
        run('UPDATE video SET video_url = ?, note = ?, updated_at = ? WHERE eid = ?', url, note, now(), eid);
      } else return { ok: false, msg: '알 수 없는 명령' };
      log(who, eid, 'video_' + op, [date, url, note].filter(Boolean).join(' · '));
      n++;
    }
    return { ok: true, changed: n };
  });
}

/* 업체 전달용 CSV — 학생 학번·성명은 넣지 않는다 */
function csvVendor() {
  const rows = all(PAPER_SQL + ` WHERE v.status IN ('requested','in_production') ORDER BY v.requested_at, p.year, p.fwci DESC`);
  const q = (x) => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"';
  const head = ['요청일', '상태', '관리 등급', '출판연도', '제목', '저널', 'DOI', 'EID', '성대 주저자(Scopus)', '단과대학', '메모'];
  const lines = [head.map(q).join(',')].concat(rows.map(r => [r.requested_at, r.video_status === 'requested' ? '요청' : '제작 중',
    '상위 ' + r.tier + '% 후보', r.year, r.title, r.journal, r.doi, r.eid, r.main_authors, r.college, r.video_note].map(q).join(',')));
  return '﻿' + lines.join('\r\n');
}

/* ── 라우팅 ─────────────────────────────────────────────────────── */
function handle(req, res, urlPath) {
  ready().then(() => route(req, res, urlPath)).catch((e) => {
    console.error('[future_research_pool]', e); try { json(res, 500, { ok: false, msg: '서버 오류' }); } catch (e2) {}
  });
}
function route(req, res, urlPath) {
  if (urlPath === BASE) { res.writeHead(301, { Location: BASE + '/' }); res.end(); return; }
  const sub = urlPath.slice(BASE.length);              // '/', '/api/...'

  if (sub === '/' || sub === '/index.html') {
    return fs.readFile(PAGE, (err, data) => {
      if (err) { res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('화면 파일이 없습니다.'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow, noarchive', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin' });
      res.end(data);
    });
  }
  if (sub === '/skkulib_logo.png') {
    return fs.readFile(path.join(__dirname, 'skku_pool', 'skkulib_logo.png'), (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' }); res.end(data);
    });
  }
  if (!sub.startsWith('/api/')) return json(res, 404, { ok: false, msg: '없는 경로' });

  if (sub === '/api/health') {
    open();
    return json(res, 200, { ok: !!db, db: db ? engine : 'unavailable', node: process.version,
      reason: dbErr || undefined,
      has_admin: db ? get('SELECT COUNT(*) AS n FROM users').n > 0 : false });
  }
  if (!open()) return json(res, 503, { ok: false, msg: '관리 풀 DB 를 열 수 없습니다.' });

  if (sub === '/api/login') {
    if (req.method !== 'POST') return json(res, 405, { ok: false, msg: 'POST 만 허용' });
    const ip = ipOf(req);
    if (!tryOk(ip)) return json(res, 429, { ok: false, msg: '로그인 시도가 너무 많습니다. 10분 뒤 다시 하세요.' });
    return body(req, 4096, (b) => {
      if (!b) return json(res, 400, { ok: false, msg: '요청을 읽지 못했습니다.' });
      if (!verify(b.id, b.password)) { noteTry(ip); return json(res, 401, { ok: false, msg: '아이디 또는 비밀번호가 맞지 않습니다.' }); }
      const id = String(b.id).trim();
      const u = get('SELECT updated_at FROM users WHERE id = ?', id);
      log(id, null, 'login', ip);
      json(res, 200, { ok: true, id }, { 'Set-Cookie': cookie(sign({ u: id, v: u.updated_at, x: Date.now() + TTL }), TTL, isHttps(req)) });
    });
  }
  if (sub === '/api/logout') return json(res, 200, { ok: true }, { 'Set-Cookie': cookie('', 0, isHttps(req)) });

  const s = session(req);
  if (!s) return json(res, 401, { ok: false, msg: '로그인이 필요합니다.' });
  if (sub === '/api/me') return json(res, 200, { ok: true, id: s.u });
  if (sub === '/api/state') return json(res, 200, Object.assign({ ok: true, me: s.u }, state()));
  if (sub === '/api/export/vendor.csv') {
    log(s.u, null, 'vendor_csv', '');
    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="video_requests_${today()}.csv"` });
    return res.end(csvVendor());
  }

  if (req.method !== 'POST') return json(res, 405, { ok: false, msg: 'POST 만 허용' });
  if (!sameOrigin(req)) return json(res, 403, { ok: false, msg: '허용되지 않은 출처' });

  if (sub === '/api/video') return body(req, 65536, (b) => {
    if (!b) return json(res, 400, { ok: false, msg: '요청을 읽지 못했습니다.' });
    try { const r = videoOp(b, s.u); json(res, r.ok ? 200 : 400, r); }
    catch (e) { json(res, 500, { ok: false, msg: '저장하지 못했습니다.' }); }
  });
  if (sub === '/api/snapshot') {
    const chunks = []; let n = 0, dead = false;
    req.on('data', d => { if (dead) return; n += d.length; if (n > 20 * 1024 * 1024) { dead = true; json(res, 413, { ok: false, msg: '파일이 너무 큽니다(20MB).' }); req.destroy(); return; } chunks.push(d); });
    req.on('end', () => {
      if (dead) return;
      let raw = Buffer.concat(chunks);
      /* nginx 가 본문을 1MB 로 자른다(413). 스냅샷은 gzip 으로 압축해 보낸다. sha256 은 풀린 본문으로 잰다. */
      if ((req.headers['content-encoding'] || '').toLowerCase() === 'gzip') {
        try { raw = require('zlib').gunzipSync(raw, { maxOutputLength: 100 * 1024 * 1024 }); }
        catch (e) { return json(res, 400, { ok: false, msg: '압축을 풀지 못했습니다.' }); }
      }
      let snap; try { snap = JSON.parse(raw.toString('utf8')); } catch (e) { return json(res, 400, { ok: false, msg: 'JSON 파일이 아닙니다.' }); }
      try { const r = importSnapshot(snap, s.u, raw); json(res, r.ok ? 200 : 400, r); }
      catch (e) { console.error('[future_research_pool] import', e); json(res, 500, { ok: false, msg: '반영하지 못했습니다: ' + String(e.message || e).slice(0, 120) }); }
    });
    return;
  }
  if (sub === '/api/password') return body(req, 4096, (b) => {
    if (!b) return json(res, 400, { ok: false, msg: '요청을 읽지 못했습니다.' });
    if (!verify(s.u, b.current)) return json(res, 400, { ok: false, msg: '현재 비밀번호가 맞지 않습니다.' });
    const p = String(b.next || '');
    if (p.length < 10) return json(res, 400, { ok: false, msg: '새 비밀번호는 10자 이상이어야 합니다.' });
    setPw(s.u, p); log(s.u, null, 'password_changed', '');
    const u = get('SELECT updated_at FROM users WHERE id = ?', s.u);
    json(res, 200, { ok: true }, { 'Set-Cookie': cookie(sign({ u: s.u, v: u.updated_at, x: Date.now() + TTL }), TTL, isHttps(req)) });
  });
  return json(res, 404, { ok: false, msg: '없는 경로' });
}

const matches = (p) => p === BASE || p.startsWith(BASE + '/');
module.exports = { matches, handle, BASE };
