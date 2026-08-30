const http = require('http');
const fs = require('fs');
const path = require('path');
const auth = require('./auth');

const PORT = 3000;
const ROOT = path.resolve(path.join(__dirname, 'v2'));
const DEFAULT_DOC = '/index.html';

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
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

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
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
    res.writeHead(200, headers);
    res.end(data);
  });
}

/* ── 로그인 게이트 ────────────────────────────────────────────
   /2026 아래 전부를 막는다. 파일을 직접 부르는 주소도 함께 막히도록
   경로 단위로 판단한다(클라이언트 스크립트로 가리는 방식은 소용없다). */
const GATED = ['/2026', '/admin'];
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
      if (b.op === 'list')   return json(res, 200, { ok: true, allow: auth.allowList(), users: auth.listUsers() });
      if (b.op === 'invite') return json(res, 200, { ok: true, allow: auth.setAllow({ add: b.emails || [] }) });
      if (b.op === 'revoke') return json(res, 200, { ok: true, allow: auth.setAllow({ remove: b.emails || [] }) });
      if (b.op === 'reset')  return json(res, 200, auth.resetPw(b.email));
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

function sendGate(res, name) {
  fs.readFile(path.join(ROOT, name, 'index.html'), (err, data) => {
    if (err) { res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
               res.end('로그인 화면을 불러오지 못했습니다.'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8',
                         'Cache-Control': 'no-store' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const rawPath = req.url === '/' ? DEFAULT_DOC : req.url.split('?')[0];
  let urlPath;
  try { urlPath = decodeURIComponent(rawPath); }
  catch (e) { res.writeHead(400, { 'Content-Type': 'text/plain' }); res.end('Bad Request'); return; }
  if (urlPath.startsWith('/api/auth/')) return handleAuthApi(req, res, urlPath);

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
      if (i >= candidates.length) { sendFile(res, filePath); return; }
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
          sendFile(res, candidates[i]);
        }
        else { tryNext(i + 1); }
      });
    };
    tryNext(0);
    return;
  }

  sendFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
