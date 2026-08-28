const http = require('http');
const fs = require('fs');
const path = require('path');

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

const server = http.createServer((req, res) => {
  const rawPath = req.url === '/' ? DEFAULT_DOC : req.url.split('?')[0];
  let urlPath;
  try { urlPath = decodeURIComponent(rawPath); }
  catch (e) { res.writeHead(400, { 'Content-Type': 'text/plain' }); res.end('Bad Request'); return; }
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
        if (!err && st.isFile()) { sendFile(res, candidates[i]); }
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
