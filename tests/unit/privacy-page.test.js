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
  assert.match(html, /europe-west1/);
  assert.match(html, /Madrid, Espanha, União Europeia/);
  assert.match(html, /Firebase App Check/);
  assert.match(html, /Play Integrity/);
  assert.match(html, /reCAPTCHA Enterprise/);
  assert.match(html, /Exclusão iniciada/);
  assert.match(html, /Deletion started/);
  assert.match(html, /Eliminación iniciada/);
  assert.match(html, /dados nutricionais atuais e históricos/);
  assert.match(html, /current and historical nutrition data/);
  assert.match(html, /datos nutricionales actuales e históricos/);
  assert.match(html, /expirar em sete dias/);
  assert.match(html, /expire after seven days/);
  assert.match(html, /expirar a los siete días/);
  assert.match(html, /Hermegas · Trofia 0\.9\.0 Beta/);
  assert.match(html, /Account and data deletion/);
  assert.match(html, /Eliminación de cuenta y datos/);
  assert.match(html, /fotos de refeição enviadas voluntariamente/);
  assert.match(html, /meal photos voluntarily submitted/);
  assert.match(html, /fotos de comidas enviadas voluntariamente/);
  assert.match(html, /Fotos de refeição não são incluídas nos backups/);
  assert.match(html, /Meal photos are not included in backups/);
  assert.match(html, /Las fotos de comidas no se incluyen en las copias de seguridad/);
  assert.doesNotMatch(html, /A câmera é acessada somente quando o usuário inicia o scanner/);
  assert.doesNotMatch(html, /The camera is accessed only when the user starts the scanner/);
  assert.doesNotMatch(html, /La cámara se utiliza únicamente cuando el usuario inicia el escáner/);
  assert.doesNotMatch(html, /exclusão pode ter sido parcial/);
  assert.doesNotMatch(html, /deletion may have been partial/);
  assert.doesNotMatch(html, /eliminación puede haber sido parcial/);
  assert.doesNotMatch(html, /URL pública planejada|Planned public URL|URL pública prevista/);
});

test('keeps the administrative-deletion policy structure aligned across all languages', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const policies = [
    fs.readFileSync(path.join(projectRoot, 'PRIVACY_POLICY_PT-BR.md'), 'utf8'),
    fs.readFileSync(path.join(projectRoot, 'PRIVACY_POLICY_EN.md'), 'utf8'),
    fs.readFileSync(path.join(projectRoot, 'PRIVACY_POLICY_ES.md'), 'utf8'),
  ];

  for (const policy of policies) {
    assert.equal((policy.match(/^## \d+\./gm) || []).length, 17);
    assert.match(policy, /0\.9\.0 Beta/);
    assert.match(policy, /Firebase App Check/);
    assert.match(policy, /Play Integrity/);
    assert.match(policy, /reCAPTCHA Enterprise/);
    assert.match(policy, /europe-southwest1/);
    assert.match(policy, /europe-west1/);
    assert.match(policy, /seven days|sete dias|siete días/);
  }
});

test('escapes policy text before applying the supported inline Markdown subset', () => {
  const html = markdownToHtml('# Title\n\n<script>alert(1)</script> **safe** `code`', 'en');
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /<strong>safe<\/strong>/);
  assert.match(html, /<code>code<\/code>/);
});
