'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PUBLIC_PRIVACY_URL = 'https://magnoclovis.github.io/nutrition-tracker/privacy/';
const POLICY_SOURCES = [
  { code: 'pt', locale: 'pt-BR', label: 'Português', file: 'PRIVACY_POLICY_PT-BR.md' },
  { code: 'en', locale: 'en', label: 'English', file: 'PRIVACY_POLICY_EN.md' },
  { code: 'es', locale: 'es', label: 'Español', file: 'PRIVACY_POLICY_ES.md' },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderInline(value) {
  const tokenPattern = /(\*\*[^*]+\*\*|`[^`]+`|https?:\/\/[^\s<]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/g;
  let cursor = 0;
  let html = '';

  for (const match of value.matchAll(tokenPattern)) {
    html += escapeHtml(value.slice(cursor, match.index));
    const token = match[0];
    if (token.startsWith('**')) {
      html += `<strong>${escapeHtml(token.slice(2, -2))}</strong>`;
    } else if (token.startsWith('`')) {
      html += `<code>${escapeHtml(token.slice(1, -1))}</code>`;
    } else if (token.startsWith('http')) {
      const escapedUrl = escapeHtml(token);
      html += `<a href="${escapedUrl}">${escapedUrl}</a>`;
    } else {
      const escapedEmail = escapeHtml(token);
      html += `<a href="mailto:${escapedEmail}">${escapedEmail}</a>`;
    }
    cursor = match.index + token.length;
  }

  return html + escapeHtml(value.slice(cursor));
}

function renderParagraph(lines) {
  return lines.map((line, index) => {
    const hasHardBreak = / {2}$/.test(line);
    const rendered = renderInline(line.replace(/ {2}$/, ''));
    if (index === lines.length - 1) return rendered;
    return hasHardBreak ? `${rendered}<br>` : `${rendered} `;
  }).join('\n');
}

function markdownToHtml(markdown, languageCode) {
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];

  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,2})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const section = level === 2 ? heading[2].match(/^(\d+)\./)?.[1] : 'title';
      blocks.push(`<h${level} id="${languageCode}-${section}">${renderInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (line.startsWith('- ')) {
      const items = [];
      while (index < lines.length && lines[index].startsWith('- ')) {
        items.push(`  <li>${renderInline(lines[index].slice(2))}</li>`);
        index += 1;
      }
      blocks.push(`<ul>\n${items.join('\n')}\n</ul>`);
      continue;
    }

    const paragraph = [];
    while (
      index < lines.length
      && lines[index].trim()
      && !/^(#{1,2})\s+/.test(lines[index])
      && !lines[index].startsWith('- ')
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(`<p>${renderParagraph(paragraph)}</p>`);
  }

  return blocks.join('\n');
}

function buildPrivacyPageHtml(policies) {
  const articles = policies.map(({ code, locale, markdown }) => {
    const hidden = code === 'pt' ? '' : ' hidden';
    return `<article id="policy-${code}" data-policy="${code}" lang="${locale}"${hidden}>\n${markdownToHtml(markdown, code)}\n</article>`;
  }).join('\n');

  const languageButtons = POLICY_SOURCES.map(({ code, label }) => (
    `<button type="button" data-language="${code}" aria-controls="policy-${code}" aria-selected="${code === 'pt'}">${label}</button>`
  )).join('\n        ');

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Política de privacidade e exclusão de dados do Trofia em português, inglês e espanhol.">
  <link rel="canonical" href="${PUBLIC_PRIVACY_URL}">
  <title>Política de Privacidade — Trofia</title>
  <style>
    :root { color-scheme: dark; --bg:#101416; --surface:#182025; --text:#eef2f3; --muted:#aeb9bd; --accent:#d5ed63; --border:#344047; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:16px/1.65 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    header { border-bottom:1px solid var(--border); background:rgba(24,32,37,.96); position:sticky; top:0; z-index:2; }
    .bar { max-width:900px; margin:auto; padding:18px 22px; display:flex; align-items:center; justify-content:space-between; gap:18px; }
    .brand { color:var(--text); font-size:1.15rem; font-weight:800; letter-spacing:.04em; text-decoration:none; }
    nav { display:flex; gap:6px; padding:4px; border:1px solid var(--border); border-radius:999px; }
    nav button { border:0; border-radius:999px; padding:8px 12px; background:transparent; color:var(--muted); font:inherit; font-size:.8rem; font-weight:700; cursor:pointer; }
    nav button[aria-selected="true"] { background:var(--accent); color:#111; }
    main { max-width:900px; margin:auto; padding:42px 22px 70px; }
    article { background:var(--surface); border:1px solid var(--border); border-radius:18px; padding:clamp(22px,5vw,52px); box-shadow:0 18px 60px rgba(0,0,0,.22); }
    article[hidden] { display:none; }
    h1 { margin:0 0 28px; font-size:clamp(1.8rem,5vw,2.65rem); line-height:1.15; }
    h2 { margin:38px 0 12px; color:var(--accent); font-size:1.25rem; line-height:1.3; }
    p, li { color:var(--muted); }
    strong { color:var(--text); }
    a { color:var(--accent); overflow-wrap:anywhere; }
    code { color:var(--text); background:#0c1113; border:1px solid var(--border); border-radius:5px; padding:.1em .35em; }
    ul { padding-left:1.35rem; }
    footer { max-width:900px; margin:auto; padding:0 22px 36px; color:var(--muted); font-size:.8rem; text-align:center; }
    @media (max-width:600px) { .bar { align-items:flex-start; flex-direction:column; } header { position:static; } main { padding-top:22px; } nav { width:100%; } nav button { flex:1; } }
    @media print { header, footer { display:none; } body { background:#fff; color:#111; } main { max-width:none; padding:0; } article { border:0; box-shadow:none; padding:0; } p, li { color:#222; } h2, a { color:#111; } }
  </style>
</head>
<body>
  <header>
    <div class="bar">
      <a class="brand" href="../">TROFIA</a>
      <nav data-language-selector aria-label="Idioma / Language / Idioma">
        ${languageButtons}
      </nav>
    </div>
  </header>
  <main>${articles}</main>
  <footer>Hermegas · Trofia 0.8.1 Beta · nutritiontracker.beta@gmail.com</footer>
  <script>
    (() => {
      const supported = ['pt', 'en', 'es'];
      const locales = { pt:'pt-BR', en:'en', es:'es' };
      const titles = { pt:'Política de Privacidade — Trofia', en:'Privacy Policy — Trofia', es:'Política de Privacidad — Trofia' };
      const requested = new URLSearchParams(location.search).get('lang');
      const browserLanguage = (navigator.language || 'pt').slice(0, 2).toLowerCase();
      const initial = supported.includes(requested) ? requested : (supported.includes(browserLanguage) ? browserLanguage : 'pt');

      function selectLanguage(language, updateUrl) {
        document.querySelectorAll('[data-policy]').forEach(article => { article.hidden = article.dataset.policy !== language; });
        document.querySelectorAll('[data-language]').forEach(button => { button.setAttribute('aria-selected', String(button.dataset.language === language)); });
        document.documentElement.lang = locales[language];
        document.title = titles[language];
        if (updateUrl) {
          const url = new URL(location.href);
          url.searchParams.set('lang', language);
          history.replaceState(null, '', url);
        }
      }

      document.querySelectorAll('[data-language]').forEach(button => {
        button.addEventListener('click', () => selectLanguage(button.dataset.language, true));
      });
      selectLanguage(initial, false);
    })();
  </script>
</body>
</html>
`;
}

function renderPrivacyPage({ projectRoot, outputDirectory }) {
  const policies = POLICY_SOURCES.map(source => ({
    ...source,
    markdown: fs.readFileSync(path.join(projectRoot, source.file), 'utf8'),
  }));
  const destination = path.join(outputDirectory, 'privacy', 'index.html');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, buildPrivacyPageHtml(policies), 'utf8');
  return destination;
}

module.exports = {
  POLICY_SOURCES,
  PUBLIC_PRIVACY_URL,
  buildPrivacyPageHtml,
  markdownToHtml,
  renderPrivacyPage,
};
