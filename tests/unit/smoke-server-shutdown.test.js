const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const test = require('node:test');

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

function requestShutdown(port) {
  return new Promise((resolve, reject) => {
    const request = http.request({
      hostname: '127.0.0.1',
      port,
      path: '/__smoke_shutdown__',
      method: 'POST'
    }, response => {
      response.resume();
      response.once('end', () => resolve(response.statusCode));
    });
    request.once('error', reject);
    request.end();
  });
}

test('static smoke server exits after the explicit Playwright teardown request', async t => {
  const port = await reservePort();
  const child = spawn(process.execPath, [
    path.resolve('tests/smoke/serve-static.js'),
    '.',
    String(port),
    'tests/fixtures/index.legacy.html'
  ], { cwd: path.resolve('.'), stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => child.kill());

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('smoke server did not start')), 5000);
    child.once('error', reject);
    child.stdout.on('data', chunk => {
      if (!String(chunk).includes('Smoke test server running')) return;
      clearTimeout(timer);
      resolve();
    });
  });

  assert.equal(await requestShutdown(port), 204);
  const exit = await Promise.race([
    new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal }))),
    new Promise((_, reject) => setTimeout(() => reject(new Error('smoke server did not exit')), 3000))
  ]);
  assert.deepEqual(exit, { code: 0, signal: null });
});
