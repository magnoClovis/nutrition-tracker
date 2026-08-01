'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  PUBLIC_PRIVACY_URL,
  markdownToHtml,
  renderPrivacyPage,
} = require('../../scripts/render-privacy-page.js');

test('renders the approved PT, EN, and ES policies into one stable public page', t => {
  const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'trofia-privacy-page-'));
  t.after(() => fs.rmSync(outputDirectory, { recursive: true, force: true }));

  const destination = renderPrivacyPage({
    projectRoot: path.resolve(__dirname, '..', '..'),
    outputDirectory,
  });
  const html = fs.readFileSync(destination, 'utf8');

  assert.equal(destination, path.join(outputDirectory, 'privacy', 'index.html'));
  assert.match(html, new RegExp(`<link rel="canonical" href="${PUBLIC_PRIVACY_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">`));
  assert.match(html, /data-language-selector/);
  assert.match(html, /data-policy="pt" lang="pt-BR"/);
  assert.match(html, /data-policy="en" lang="en"/);
  assert.match(html, /data-policy="es" lang="es"/);
  assert.match(html, /europe-southwest1/);
  assert.match(html, /Madrid, Espanha, União Europeia/);
  assert.match(html, /Account and data deletion/);
  assert.match(html, /Eliminación de cuenta y datos/);
  assert.doesNotMatch(html, /URL pública planejada|Planned public URL|URL pública prevista/);
});

test('escapes policy text before applying the supported inline Markdown subset', () => {
  const html = markdownToHtml('# Title\n\n<script>alert(1)</script> **safe** `code`', 'en');
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /<strong>safe<\/strong>/);
  assert.match(html, /<code>code<\/code>/);
});
