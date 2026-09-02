const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const auth = require('./auth');
/* ── AI 크롤러 차단 ──
   로그인 게이트가 이미 대부분을 막지만, 학습 수집은 명시적으로 거절한다. */
const AI_UA = /(GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-Web|anthropic-ai|CCBot|Google-Extended|PerplexityBot|Applebot-Extended|Bytespider|Amazonbot|meta-externalagent|cohere-ai|Diffbot|ImagesiftBot|Omgili|Timpibot|YouBot|Scrapy|python-requests|node-fetch)/i;
const NOAI = 'noai, noimageai, noindex, nofollow, noarchive, nosnippet';



/* 비밀은 깃 밖 파일에서만 읽는다. 없으면 그 기능만 꺼진다.
   {"GEMINI_API_KEY":"..."} · 권한 600 · .gitignore 에 등록돼 있다 */
const SECRETS = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '.bk21-secrets.json'), 'utf8')); }
  catch (e) { return {}; }
})();
const SECFILE = path.join(__dirname, '.bk21-secrets.json');
let GKEY = SECRETS.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

/* 키는 관리자 화면에서 넣는다. 파일은 깃 밖이라 git reset --hard 에 지워지지 않는다.
   화면으로 되돌려 주지 않는다. 있는지와 뒷자리 넉 자만 알려 준다. */
function keyMask(k) { return k ? '••••••••' + k.slice(-4) : ''; }
function keySave(k) {
  const d = (() => { try { return JSON.parse(fs.readFileSync(SECFILE, 'utf8')); } catch (e) { return {}; } })();
  if (k) d.GEMINI_API_KEY = k; else delete d.GEMINI_API_KEY;
  fs.writeFileSync(SECFILE, JSON.stringify(d, null, 2), { mode: 0o600 });
  GKEY = k || '';
}

/* 남용 방어 — 로그인한 사람이라도 창을 연타하면 외부 API 가 소진된다.
   IP 당 1분에 20회. 넘으면 429 로 끊고 낱말 매칭으로 돌아가게 한다. */
const RL = new Map();
function rateOk(ip, lim = 20, win = 60000) {
  const now = Date.now();
  const a = (RL.get(ip) || []).filter(t => now - t < win);
  if (a.length >= lim) { RL.set(ip, a); return false; }
  a.push(now); RL.set(ip, a);
  if (RL.size > 5000) RL.clear();
  return true;
}

const PORT = 3000;
const ROOT = path.resolve(path.join(__dirname, 'v2'));
const DEFAULT_DOC = '/index.html';

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
};

// 텍스트류는 charset 을 명시한다. 없으면 브라우저가 인코딩을 추측해
// meta charset 없는 문서의 한글이 깨진다 (kks/ptu_dashboard 사고).
const TEXT_EXT = new Set(['.html', '.css', '.js', '.json', '.svg']);

function sendFile(res, filePath, guard) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = (MIME[ext] || 'application/octet-stream')
    + (TEXT_EXT.has(ext) ? '; charset=utf-8' : '');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // 없는 경로는 404 로 끝낸다. 예전에는 대문(브로슈어)을 대신 내보내서,
      // 오타난 주소나 미배포 경로가 전부 브로슈어로 보이고 새로 올린 페이지와 헷갈렸다.
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<meta charset="utf-8"><title>404</title>'
        + '<body style="margin:0;display:grid;place-items:center;height:100vh;'
        + 'background:#0b1226;color:#93a6cc;font:15px/1.7 -apple-system,system-ui,sans-serif">'
        + '<div style="text-align:center"><div style="font:800 44px/1 ui-monospace,Menlo,monospace;'
        + 'color:#e9eefb;letter-spacing:-1px">404</div>'
        + '<p style="margin-top:14px">요청하신 경로가 없습니다.</p>'
        + '<p style="margin-top:6px"><a href="/" style="color:#7fa9e0">biblo.ai 로 이동</a></p></div>');
      return;
    }
    // HTML 은 브라우저가 임의로 캐시하지 않게 한다 (배포 직후 옛 화면이 뜨던 문제)
    const headers = { 'Content-Type': contentType };
    if (ext === '.html') headers['Cache-Control'] = 'no-cache, must-revalidate';
    if (guard) {
      headers['X-Robots-Tag'] = NOAI;
      // 보호 스크립트와 문서는 캐시하지 않는다. 옛 파일이 남아 있으면 보호가 헐거워진다.
      if (ext === '.html' || ext === '.js') headers['Cache-Control'] = 'no-store, must-revalidate';
      if (ext === '.html') {
        const out = Buffer.from(injectGuard(data.toString('utf8')), 'utf8');
        res.writeHead(200, headers); res.end(out); return;
      }
    }
    res.writeHead(200, headers);
    res.end(data);
  });
}

/* ── 로그인 게이트 ────────────────────────────────────────────
   /2026 아래 전부를 막는다. 파일을 직접 부르는 주소도 함께 막히도록
   경로 단위로 판단한다(클라이언트 스크립트로 가리는 방식은 소용없다). */
const GATED = ['/2026', '/admin', '/bk21'];
const isGated = (p) => GATED.some(g => p === g || p.startsWith(g + '/'));

function readBody(req, cb) {
  let n = 0; const chunks = [];
  req.on('data', d => { n += d.length; if (n > 8192) { req.destroy(); return; } chunks.push(d); });
  req.on('end', () => { try { cb(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
                        catch (e) { cb(null); } });
}
function json(res, code, obj, extra) {
  const h = Object.assign({ 'Content-Type': 'application/json; charset=utf-8',
                            'Cache-Control': 'no-store' }, extra || {});
  res.writeHead(code, h); res.end(JSON.stringify(obj));
}

function handleAuthApi(req, res, urlPath) {
  if (urlPath === '/api/auth/me') {
    const s = auth.session(req);
    const d = auth.load();
    const u = s ? d.users[s.e] : null;
    return json(res, 200, { ok: !!s, email: s ? s.e : null,
      code: s ? auth.codeOf(s.e) : null,
      admin: !!(s && s.a), mustChange: !!(u && u.mustChange) });
  }
  if (req.method !== 'POST') return json(res, 405, { ok: false, msg: 'POST 만 허용' });

  if (urlPath === '/api/auth/login') {
    return readBody(req, (b) => {
      if (!b) return json(res, 400, { ok: false, msg: '요청을 읽지 못했습니다.' });
      const r = auth.login(b.email, b.password);
      if (!r.ok) return json(res, 401, { ok: false, msg: r.msg });
      json(res, 200, { ok: true, mustChange: r.mustChange, admin: r.admin },
           { 'Set-Cookie': auth.cookieHeader(r.token, r.maxAge) });
    });
  }
  if (urlPath === '/api/auth/logout') {
    return json(res, 200, { ok: true }, { 'Set-Cookie': auth.cookieHeader('', 0) });
  }
  if (urlPath === '/api/auth/admin') {
    const s2 = auth.session(req);
    if (!s2 || !s2.a) return json(res, 403, { ok: false, msg: '관리자만 쓸 수 있습니다.' });
    return readBody(req, (b) => {
      if (!b) return json(res, 400, { ok: false, msg: '요청을 읽지 못했습니다.' });
      if (b.op === 'list')   return json(res, 200, { ok: true, allow: auth.allowList(),
                                                     users: auth.listUsers(), admins: auth.adminList() });
      if (b.op === 'promote') return json(res, 200, auth.setAdmin(b.email, true));
      if (b.op === 'demote')  return json(res, 200, auth.setAdmin(b.email, false));
      if (b.op === 'invite') return json(res, 200, { ok: true, allow: auth.setAllow({ add: b.emails || [] }) });
      if (b.op === 'revoke') return json(res, 200, { ok: true, allow: auth.setAllow({ remove: b.emails || [] }) });
      if (b.op === 'reset')  return json(res, 200, auth.resetPw(b.email));
      if (b.op === 'keyStatus') return json(res, 200, { ok: true, set: !!GKEY, masked: keyMask(GKEY) });
      if (b.op === 'keySet') {
        const k = String(b.key || '').trim();
        if (!/^[A-Za-z0-9._-]{20,120}$/.test(k))
          return json(res, 400, { ok: false, msg: '키 형태가 아닙니다.' });
        try { keySave(k); } catch (e) { return json(res, 500, { ok: false, msg: '저장하지 못했습니다.' }); }
        return json(res, 200, { ok: true, set: true, masked: keyMask(GKEY) });
      }
      if (b.op === 'keyClear') {
        try { keySave(''); } catch (e) { return json(res, 500, { ok: false, msg: '지우지 못했습니다.' }); }
        return json(res, 200, { ok: true, set: false, masked: '' });
      }
      json(res, 400, { ok: false, msg: '알 수 없는 명령' });
    });
  }
  if (urlPath === '/api/auth/password') {
    const s = auth.session(req);
    if (!s) return json(res, 401, { ok: false, msg: '로그인이 필요합니다.' });
    return readBody(req, (b) => {
      if (!b) return json(res, 400, { ok: false, msg: '요청을 읽지 못했습니다.' });
      const r = auth.changePw(s.e, b.current, b.next);
      json(res, r.ok ? 200 : 400, r);
    });
  }
  return json(res, 404, { ok: false, msg: '없는 경로' });
}

/* 보호 스크립트 주소에 파일 갱신시각을 붙인다.
   nginx 가 immutable 로 일주일 캐시하기 때문에, 주소가 그대로면 옛 파일이 계속 나간다. */
let GUARD_V = '0';
try { GUARD_V = String(Math.floor(fs.statSync(path.join(ROOT, '2026', '_guard.js')).mtimeMs)); }
catch (e) {}
function injectGuard(html) {
  const tag = '<script src="/2026/_guard.js?v=' + GUARD_V + '"></script>';
  const i = html.lastIndexOf('</body>');
  return i < 0 ? html + tag : html.slice(0, i) + tag + html.slice(i);
}
function sendGate(res, name) {
  fs.readFile(path.join(ROOT, name, 'index.html'), (err, data) => {
    if (err) { res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
               res.end('로그인 화면을 불러오지 못했습니다.'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8',
                         'Cache-Control': 'no-store' });
    res.end(data);
  });
}

/* 제미나이 한 번 부르기. 모델과 프롬프트만 갈아 끼운다.
   2.5 계열은 답 전에 «생각 토큰» 을 쓴다. 끄지 않으면 빈 답이 온다(실측). */
/* 값은 1M 토큰당 달러. 생각 토큰은 출력으로 친다.
   라우팅은 기계적이라 flash 로 충분하다(실측 0.9초·정확). 리포트만 pro 로 쓴다. */
const PRICE = {
  'gemini-2.5-flash': { in: 0.30, out: 2.50 },
  'gemini-2.5-pro':   { in: 1.25, out: 10.00 },
};
const FX = 1380;  // 원/달러
function costOf(model, u) {
  const p = PRICE[model] || PRICE['gemini-2.5-flash'];
  const i = u.in || 0, o = (u.out || 0) + (u.think || 0);
  const usd = i / 1e6 * p.in + o / 1e6 * p.out;
  return { model, in: i, out: u.out || 0, think: u.think || 0,
           usd: +usd.toFixed(6), krw: Math.round(usd * FX * 10) / 10 };
}

function gemini(model, prompt, maxTok, cb) {
  /* flash 는 사고를 끌 수 있어 빠르고 싸다.
     pro 는 «Budget 0 is invalid. This model only works in thinking mode» 로 거절하므로
     끄지 않고, 생각 토큰이 출력 상한에 들어가는 만큼 넉넉히 준다. 실측으로 확인했다. */
  const gc = { temperature: 0, maxOutputTokens: maxTok };
  if (model.indexOf('flash') >= 0) gc.thinkingConfig = { thinkingBudget: 0 };
  const payload = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: gc,
  });
  const r2 = https.request({
    hostname: 'generativelanguage.googleapis.com',
    path: '/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(GKEY),
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    timeout: 20000,
  }, (up) => {
    let buf = '';
    up.on('data', d => { buf += d; if (buf.length > 200000) up.destroy(); });
    up.on('end', () => {
      try {
        const o = JSON.parse(buf);
        const t = ((((o.candidates || [])[0] || {}).content || {}).parts || [])
                  .map(x => x.text || '').join('').trim();
        const m = o.usageMetadata || {};
        cb(null, t, costOf(model, { in: m.promptTokenCount, out: m.candidatesTokenCount,
                                    think: m.thoughtsTokenCount }));
      } catch (e) { cb('parse_failed'); }
    });
  });
  r2.on('timeout', () => { r2.destroy(); cb('timeout'); });
  r2.on('error', () => cb('upstream_error'));
  r2.write(payload); r2.end();
}
/* 답 자체는 미리 계산해 둔 표와 스킨으로 만든다. 여기 값이 드는 것은 두 가지뿐이다.
     라우팅  질문을 레시피로 옮긴다. 규칙으로는 안 되는 일이라 부른다 (약 0.6원)
     해설    사람이 눌렀을 때만 문장으로 풀어 쓴다 (flash 약 1원 · pro 약 27원)
   결론 문장은 화면이 데이터로 만든다. 그걸 LLM 에게 다시 쓰게 하면 같은 것을 두 번 만드는 것이다. */
const ROUTE_MODEL   = 'gemini-2.5-flash';
const WRITE_MODEL   = 'gemini-2.5-flash';  // 해설 기본
const WRITE_DEEP    = 'gemini-2.5-pro';    // «더 깊게» 를 누를 때만

/* 답 안에서 첫 JSON 덩어리만 꺼낸다. 모델이 설명을 덧붙여도 견딘다. */
function firstJson(t) {
  const i = t.indexOf('{'), j = t.lastIndexOf('}');
  if (i < 0 || j <= i) return null;
  try { return JSON.parse(t.slice(i, j + 1)); } catch (e) { return null; }
}

function guard(req, res) {
  if (req.method !== 'POST') { json(res, 405, { ok: false, reason: 'post_only' }); return false; }
  if (!auth.session(req))    { json(res, 401, { ok: false, reason: 'login_required' }); return false; }
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
           || req.socket.remoteAddress || '?';
  if (!rateOk(ip))           { json(res, 429, { ok: false, reason: 'rate_limited' }); return false; }
  if (!GKEY)                 { json(res, 200, { ok: false, reason: 'no_key' }); return false; }
  return true;
}

/* 리포트를 쓴다. 숫자는 화면이 데이터에서 만들고, 여기서는 «읽는 법» 만 쓴다. */
function handleReport(req, res) {
  if (!guard(req, res)) return;
  readBody(req, (b) => {
    if (!b || !b.q || !b.data) return json(res, 400, { ok: false, reason: 'bad_request' });
    const prompt =
      '너는 대학 연구성과 보고서를 쓰는 분석가다. 아래 표만 근거로 한국어 보고서를 쓴다.\n' +
      '표에 없는 숫자를 지어내지 마라. 표에 있는 값만 인용하라.\n' +
      '예측·전망·추정을 쓰지 마라. 표는 이미 일어난 집계이며 미래값이 아니다.\n' +
      '아래 [한계] 를 어기는 문장을 쓰지 마라.\n' +
      '아래 JSON 한 덩어리만 출력하라. 다른 말은 쓰지 마라.\n' +
      '{"headline":"결론 한 문장","points":["근거 문장",".."],"caution":"이 답으로 하면 안 되는 것 한 줄"}\n' +
      'headline 은 25자 안팎. points 는 2~4개, 각 40자 안팎이며 반드시 표의 숫자를 넣는다.\n\n' +
      '[질문]\n' + String(b.q).slice(0, 200) + '\n\n' +
      (b.focus && b.focus.length ? '[주목 대상] ' + b.focus.join(', ') + '\n\n' : '') +
      '[표]\n' + String(b.data).slice(0, 6000) + '\n\n' +
      (b.caveats ? '[이미 알려진 한계]\n' + String(b.caveats).slice(0, 800) + '\n\n' : '') +
      '[출력]';
    /* pro 는 사고를 끌 수 없다(Budget 0 is invalid). 생각 토큰이 출력 상한에 들어가므로
       넉넉히 준다. 1500 으로는 잘려 빈 답이 온다(실측). */
    const deep = !!b.deep;
    gemini(deep ? WRITE_DEEP : WRITE_MODEL, prompt, deep ? 3000 : 900, (err, t, cost) => {
      if (err) return json(res, 200, { ok: false, reason: err });
      const o = firstJson(t || '');
      if (!o || !o.headline) return json(res, 200, { ok: false, reason: 'no_report', cost });
      json(res, 200, { ok: true, cost, headline: String(o.headline).slice(0, 120),
        points: (Array.isArray(o.points) ? o.points : []).slice(0, 4).map(x => String(x).slice(0, 160)),
        caution: String(o.caution || '').slice(0, 200) });
    });
  });
}

/* 보고서를 대화로 고친다. 값은 미리 계산해 둔 표에서만 오고,
   여기서 받는 것은 «어느 표를 어떻게 놓을지» 뿐이다. 숫자를 만들게 하지 않는다.
   고르는 일이라 pro 로 쓴다(대표 지시). 한 번 약 20~30원. */
const EDIT_MODEL = 'gemini-2.5-pro';

function handleEdit(req, res) {
  if (!guard(req, res)) return;
  readBody(req, (b) => {
    const q = (b && typeof b.q === 'string') ? b.q.slice(0, 300) : '';
    const menu = (b && Array.isArray(b.menu)) ? b.menu.slice(0, 140) : [];
    const sel = (b && b.sel) || null;
    if (!q || !menu.length) return json(res, 400, { ok: false, reason: 'bad_request' });

    const list = menu.map(m => `${m.id}\t${String(m.q).slice(0, 70)}`).join('\n');
    const cur = sel ? [
      'id: ' + sel.rid,
      '제목: ' + String(sel.head || '').slice(0, 60),
      '축: ' + String(sel.cols || '').slice(0, 60),
      '측정: ' + String(sel.measures || '').slice(0, 60),
      '행 예시: ' + String(sel.sample || '').slice(0, 300),
      '현재 상태: ' + String(sel.state || '').slice(0, 200),
    ].join('\n') : '(고른 표 없음 — 보고서의 첫 표가 대상이다)';

    const prompt =
      '너는 대학 연구성과 보고서를 대화로 고치는 편집기다.\n' +
      '사용자의 말을 아래 조작 명령으로 옮긴다. 숫자를 지어내지 마라. 표는 이미 계산돼 있고 너는 고르고 거를 뿐이다.\n' +
      '아래 JSON 한 덩어리만 출력하라. 다른 말은 쓰지 마라.\n' +
      '{"ops":[...],"say":"무엇을 했는지 한 문장"}\n\n' +
      '[쓸 수 있는 조작]\n' +
      '{"op":"years","from":2021,"to":2025}  기간 한정 (해제는 from,to 를 null)\n' +
      '{"op":"top","n":10}  상위 n개만. n 이 0 이면 해제\n' +
      '{"op":"only","name":"의학과"}  이름이 든 행만. name 이 "" 이면 해제\n' +
      '{"op":"sort","asc":true}  낮은 순. false 면 높은 순\n' +
      '{"op":"view","v":"table"}  표로 본다. "chart" 면 그림으로\n' +
      '{"op":"widget","w":"bar_h"}  그림 종류 — bar_h bar_v line stack100 scatter heat pareto bar_group\n' +
      '{"op":"swap","rid":"..."}  고른 자리의 데이터를 목록의 다른 표로 갈아 끼운다\n' +
      '{"op":"add","rid":"..."}  목록의 표를 보고서에 새로 넣는다\n' +
      '{"op":"remove"} {"op":"restore"}  고른 섹션을 빼거나 되살린다\n' +
      '{"op":"title","text":"..."}  고른 섹션 제목을 바꾼다\n' +
      '{"op":"reset"}  고른 섹션의 편집을 처음으로\n\n' +
      '[규칙]\n' +
      '1. 사용자가 다른 데이터를 달라고 하면 목록에서 골라 swap 또는 add 를 쓴다. "대신·바꿔"는 swap, "같이·추가·하나 더"는 add.\n' +
      '2. 목록에 맞는 표가 없으면 ops 를 빈 배열로 두고 say 에 없다고 적는다. 비슷한 표를 억지로 고르지 마라.\n' +
      '3. 한 말에 조작이 여럿이면 순서대로 여러 개 넣는다.\n' +
      '4. say 는 40자 안팎. 표에 없는 수치를 쓰지 마라.\n\n' +
      '[지금 고른 표]\n' + cur + '\n\n' +
      '[쓸 수 있는 표 목록]\n' + list + '\n\n' +
      '[사용자 말]\n' + q + '\n\n[출력]';

    gemini(EDIT_MODEL, prompt, 3000, (err, t, cost) => {
      if (err) return json(res, 200, { ok: false, reason: err });
      const o = firstJson(t || '');
      if (!o || !Array.isArray(o.ops)) return json(res, 200, { ok: false, reason: 'no_plan', cost });
      const ids = new Set(menu.map(m => m.id));
      const ops = o.ops.slice(0, 6).filter(x => x && typeof x.op === 'string')
        .filter(x => (x.op !== 'swap' && x.op !== 'add') || ids.has(x.rid));
      json(res, 200, { ok: true, cost, ops, say: String(o.say || '').slice(0, 160) });
    });
  });
}

function handleAsk(req, res) {
  if (!guard(req, res)) return;
  readBody(req, (b) => {
    const q = (b && typeof b.q === 'string') ? b.q.slice(0, 300) : '';
    const menu = (b && Array.isArray(b.menu)) ? b.menu.slice(0, 120) : [];
    if (!q || !menu.length) return json(res, 400, { ok: false, reason: 'bad_request' });

    const list = menu.map(m => `${m.id}\t${String(m.q).slice(0, 80)}`).join('\n');
    const prompt =
      '사용자 질문에 맞는 항목을 목록에서 하나 고르고, 질문에 나온 «주목 대상» 을 뽑아라.\n' +
      '주목 대상은 대학명·학과명·연도·사람 이름처럼 질문이 콕 집은 것이다. 없으면 빈 배열.\n' +
      '아래 JSON 한 덩어리만 출력하라. 다른 말은 쓰지 마라.\n' +
      '{"id":"항목id 또는 NONE","focus":["대상",".."]}\n\n' +
      '[목록]\n' + list + '\n\n[질문]\n' + q + '\n\n[출력]';

    gemini(ROUTE_MODEL, prompt, 300, (err, t, cost) => {
      if (err) return json(res, 200, { ok: false, reason: err });
      const o = firstJson(t || '') || {};
      const hit = menu.find(m => m.id === o.id);
      if (!hit) return json(res, 200, { ok: false, reason: 'no_match', cost });
      json(res, 200, { ok: true, id: hit.id, cost,
        focus: (Array.isArray(o.focus) ? o.focus : []).slice(0, 5).map(x => String(x).slice(0, 40)) });
    });
  });
}

const server = http.createServer((req, res) => {
  const rawPath = req.url === '/' ? DEFAULT_DOC : req.url.split('?')[0];
  let urlPath;
  try { urlPath = decodeURIComponent(rawPath); }
  catch (e) { res.writeHead(400, { 'Content-Type': 'text/plain' }); res.end('Bad Request'); return; }
  if (AI_UA.test(req.headers['user-agent'] || '')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': NOAI });
    res.end('이 자료는 자동 수집을 허용하지 않습니다.');
    return;
  }
  if (urlPath.startsWith('/api/auth/')) return handleAuthApi(req, res, urlPath);

  /* BK21 질문 라우팅. 로그인한 사람만 부른다.
     LLM 은 «레시피 id 하나 고르기» 만 한다. 숫자와 문장은 화면이 데이터로 만든다.
     그래야 같은 질문에 늘 같은 답이 나오고 없는 것을 지어내지 않는다. */
  if (urlPath === '/api/bk21/ask')    return handleAsk(req, res);
  if (urlPath === '/api/bk21/report') return handleReport(req, res);
  if (urlPath === '/api/bk21/edit')   return handleEdit(req, res);

  // 잠긴 구간은 세션이 있어야 지나간다.
  // 주소를 바꾸지 않는다 — biblo.ai/2026 그 자리에서 로그인 화면을 그대로 낸다.
  if (isGated(urlPath)) {
    const s = auth.session(req);
    const ext = path.extname(urlPath).toLowerCase();
    const isDoc = !ext || ext === '.html';
    if (!s) {
      if (!isDoc) { res.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store' }); res.end('로그인이 필요합니다.'); return; }
      return sendGate(res, 'login');
    }
    if (urlPath.indexOf('/admin') === 0 && !s.a) {
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end('<meta charset="utf-8"><body style="margin:0;display:grid;place-items:center;height:100vh;'
        + 'background:#05070f;color:#93a6cc;font:15px/1.7 -apple-system,system-ui,sans-serif">'
        + '<div>관리자만 볼 수 있습니다. <a href="/2026/" style="color:#7fa9e0">자료로 가기</a></div>');
      return;
    }
    const u = auth.load().users[s.e];
    if (u && u.mustChange) {
      if (!isDoc) { res.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store' }); res.end('비밀번호 변경이 필요합니다.'); return; }
      return sendGate(res, 'account');
    }
  }

  const filePath = path.join(ROOT, urlPath);

  // Defense-in-depth: never serve outside the web root (path traversal guard).
  const resolved = path.resolve(filePath);
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Extensionless routes (e.g. /ceo) → try /ceo/index.html then /ceo.html
  if (!path.extname(filePath)) {
    const candidates = [
      path.join(filePath, 'index.html'),
      `${filePath}.html`,
    ];
    const tryNext = (i) => {
      if (i >= candidates.length) { sendFile(res, filePath, isGated(urlPath)); return; }
      fs.stat(candidates[i], (err, st) => {
        if (!err && st.isFile()) {
          // 폴더의 index.html 을 줄 때는 주소 끝에 / 를 붙여 리다이렉트한다.
          // / 가 없으면 그 문서 안의 상대경로(iframe·이미지)가 상위 폴더 기준으로 잡혀 깨진다.
          if (i === 0 && !urlPath.endsWith('/')) {
            const qs = req.url.includes('?') ? '?' + req.url.split('?').slice(1).join('?') : '';
            res.writeHead(301, { Location: encodeURI(urlPath) + '/' + qs });
            res.end();
            return;
          }
          sendFile(res, candidates[i], isGated(urlPath));
        }
        else { tryNext(i + 1); }
      });
    };
    tryNext(0);
    return;
  }

  sendFile(res, filePath, isGated(urlPath));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
