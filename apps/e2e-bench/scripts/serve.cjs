/**
 * Minimal static server for Playwright e2e/bench. Serves / and /bench as bench.html.
 * Uses only http/fs/path (no os.networkInterfaces) so it works in sandboxed environments.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const PUBLIC = path.join(__dirname, '..', 'public');

const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  const pathname = (req.url || '/').split('?')[0].split('#')[0] || '/';

  const isBench =
    pathname === '' || pathname === '/' || pathname === '/bench' || pathname.startsWith('/bench?');

  const filePath = isBench
    ? path.join(PUBLIC, 'bench.html')
    : path.join(PUBLIC, path.normalize(pathname));

  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(PUBLIC))) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  fs.readFile(resolved, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(resolved);
    res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Serving at http://127.0.0.1:${PORT}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
