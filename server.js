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
      // SPA fallback to the brochure index
      fs.readFile(path.join(ROOT, DEFAULT_DOC), (e, d) => {
        if (e) { res.writeHead(500); res.end('Server Error'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(d);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
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
