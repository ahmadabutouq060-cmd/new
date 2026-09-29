/* Naseej — zero-dependency static dev server.
   Backs `npm run dev` / `npm run preview`.
   Serves the repository root, which IS the published site. */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PORT = parseInt(process.env.PORT || '8443', 10);
const HOST = process.env.FIGMA_DEV_SERVER_HOST || '0.0.0.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

/* Resolve a URL path inside ROOT, or null if it escapes the root. */
function resolveSafe(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const target = path.resolve(ROOT, '.' + path.posix.normalize(decoded));
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) return null;
  return target;
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end('Method Not Allowed');
  }

  let file = resolveSafe(req.url || '/');
  if (!file) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');

  /* Single-page app with hash routing: every view lives at "/", so unknown
     extensionless paths fall back to the document shell. */
  if (!fs.existsSync(file)) {
    if (path.extname(file)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found: ' + req.url);
    }
    file = path.join(ROOT, 'index.html');
  }

  const ext = path.extname(file).toLowerCase();
  const headers = {
    'Content-Type': TYPES[ext] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  };

  if (req.method === 'HEAD') {
    res.writeHead(200, headers);
    return res.end();
  }
  fs.createReadStream(file)
    .on('error', () => {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500 Internal Server Error');
    })
    .once('open', () => res.writeHead(200, headers))
    .pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log('Naseej static server on http://' + HOST + ':' + PORT + ' (root: ' + ROOT + ')');
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
