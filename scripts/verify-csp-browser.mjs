import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createReadStream, existsSync, statSync} from 'node:fs';
import {resolve, relative, extname, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';

const root = resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const mime = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png'};
const server = createServer((request, response) => {
  const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
  const target = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  const rel = relative(root, target);
  if (rel.startsWith('..') || isAbsolute(rel) || !existsSync(target) || statSync(target).isDirectory()) {
    response.writeHead(404).end();
    return;
  }
  response.setHeader('Content-Type', mime[extname(target)] || 'application/octet-stream');
  createReadStream(target).pipe(response);
});

let browser;
try {
  await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
  browser = await chromium.launch({headless: true});
  const page = await browser.newPage();
  const violations = [];
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', event => {
      let blocked = event.blockedURI === 'inline' ? 'inline' : 'other';
      if (blocked !== 'inline') {
        try { blocked = new URL(event.blockedURI).origin; } catch { /* no URL contents in logs */ }
      }
      window.__cspViolations.push({directive: event.effectiveDirective, blocked});
    });
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, {waitUntil: 'domcontentloaded'});
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
  assert.match(await page.locator('#app-version-footer').innerText(), /Trofia/);
  await page.evaluate(() => {
    const injection = document.createElement('script');
    injection.textContent = 'window.__cspInjected = true';
    document.body.appendChild(injection);
  });
  assert.equal(await page.evaluate(() => window.__cspInjected), undefined);
  violations.push(...await page.evaluate(() => window.__cspViolations));
  assert.ok(violations.some(item => item.directive === 'script-src-elem' || item.directive === 'script-src'));
  const unexpected = violations.filter(item => item.blocked !== 'inline');
  assert.deepEqual(unexpected, [], `Unexpected CSP violations: ${JSON.stringify(unexpected)}`);
  console.log('CSP browser check passed: bootstrap ran; injected inline script was blocked.');
} finally {
  await browser?.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
