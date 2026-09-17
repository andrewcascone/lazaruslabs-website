// Minimal static file server for previewing the Lazarus Labs site.
// Uses __dirname (resolved at load, no process.cwd()) so it works inside
// the preview sandbox where getcwd() is blocked.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 4399;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
};

// Mirrors Cloudflare Pages routing: /foo serves foo.html, /foo.html redirects
// to /foo, /dir/ serves dir/index.html, and anything else gets 404.html (404).
function send(res, status, filePath) {
  fs.readFile(filePath, (e, data) => {
    if (e) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(status, { 'Content-Type': TYPES[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

function isFile(p) {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);

  // Resolve safely within ROOT (prevent path traversal)
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  if (urlPath.endsWith('.html') && isFile(filePath)) {
    let pretty = urlPath.slice(0, -5);
    if (pretty.endsWith('/index')) pretty = pretty.slice(0, -5);
    res.writeHead(308, { Location: pretty || '/' }); res.end(); return;
  }

  const candidates = urlPath.endsWith('/')
    ? [path.join(filePath, 'index.html')]
    : [filePath, filePath + '.html'];
  const hit = candidates.find(isFile);
  if (hit) { send(res, 200, hit); return; }

  if (!urlPath.endsWith('/') && isFile(path.join(filePath, 'index.html'))) {
    res.writeHead(308, { Location: urlPath + '/' }); res.end(); return;
  }

  send(res, 404, path.join(ROOT, '404.html'));
}).listen(PORT, () => console.log('Preview server on http://localhost:' + PORT));
