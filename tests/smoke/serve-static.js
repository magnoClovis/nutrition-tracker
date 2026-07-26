const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const HOST = '127.0.0.1';
const PORT = Number(process.argv[3] || 8765);
const ROOT_DIR = path.resolve(__dirname, '..', '..', process.argv[2] || '.');
const ENTRY_FILE = String(process.argv[4] || 'index.html').replaceAll('\\', '/').replace(/^\/+/, '');
const IDLE_TIMEOUT_MS = Number(process.env.SMOKE_SERVER_IDLE_MS || 60000);

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

/**
 * Resolves browser request paths inside the repository root.
 *
 * The smoke suite only needs a tiny static server. Keeping it in Node avoids
 * relying on Python being installed on every Windows machine that runs tests.
 */
function resolveRequestPath(requestUrl) {
  const parsedUrl = new URL(requestUrl, `http://${HOST}:${PORT}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);
  const requestedPath = pathname === '/' || pathname === '/index.html'
    ? `/${ENTRY_FILE}`
    : pathname;
  const absolutePath = path.resolve(ROOT_DIR, `.${requestedPath}`);
  const relativePath = path.relative(ROOT_DIR, absolutePath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  return absolutePath;
}

function sendNotFound(response) {
  response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('Not found');
}

const server = http.createServer((request, response) => {
  scheduleIdleShutdown();

  if (!request.url || !['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Method not allowed');
    return;
  }

  const filePath = resolveRequestPath(request.url);

  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendNotFound(response);
    return;
  }

  const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  response.writeHead(200, {
    'Connection': 'close',
    'Content-Type': contentType
  });

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  fs.createReadStream(filePath).pipe(response);
});

server.listen(PORT, HOST, () => {
  console.log(`Smoke test server running at http://${HOST}:${PORT}/index.html (${ENTRY_FILE})`);
  scheduleIdleShutdown();
});

let idleTimer = null;

/**
 * Stops the helper if Playwright does not terminate it itself.
 *
 * On some Windows shells the runner can leave the spawned Node server alive,
 * which keeps `npm.cmd run test:smoke` hanging after all tests have finished.
 * The default is intentionally long enough for authenticated Firebase flows.
 */
function scheduleIdleShutdown() {
  if (idleTimer) {
    clearTimeout(idleTimer);
  }

  idleTimer = setTimeout(shutdown, IDLE_TIMEOUT_MS);
  idleTimer.unref();
}

function shutdown() {
  if (typeof server.closeAllConnections === 'function') {
    server.closeAllConnections();
  }

  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGHUP', shutdown);
process.on('SIGBREAK', shutdown);
process.on('SIGTERM', shutdown);
