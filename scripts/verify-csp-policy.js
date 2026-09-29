const {createHash} = require('node:crypto');

function verifyCspPolicy(html) {
  const policyMatch = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/?\s*>/i);
  if (!policyMatch) throw new Error('CSP meta is missing');
  const firstScriptIndex = html.search(/<script\b/i);
  if (firstScriptIndex >= 0 && policyMatch.index > firstScriptIndex) {
    throw new Error('CSP meta must precede the first script');
  }

  const policy = policyMatch[1];
  const directives = new Map(policy.split(';').map(part => {
    const [name, ...values] = part.trim().split(/\s+/);
    return [name, values];
  }));
  const scripts = directives.get('script-src') || [];
  if (scripts.includes("'unsafe-inline'") || scripts.includes("'unsafe-eval'")) {
    throw new Error('script-src must not allow arbitrary inline code or eval');
  }
  for (const required of ['default-src', 'base-uri', 'object-src', 'script-src', 'connect-src', 'frame-src']) {
    if (!directives.has(required)) throw new Error(`CSP lacks ${required}`);
  }
  if (!(directives.get('object-src') || []).includes("'none'")) {
    throw new Error('CSP must disable plugin objects');
  }

  for (const kind of ['script', 'style']) {
    const directive = directives.get(kind === 'script' ? 'script-src' : 'style-src') || [];
    const pattern = new RegExp(`<${kind}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${kind}>`, 'gi');
    for (const match of html.matchAll(pattern)) {
      if (!match[1].trim()) continue;
      // HTML parsing normalizes CRLF to LF before CSP hashes the element text.
      const browserText = match[1].replace(/\r\n?/g, '\n');
      const hash = `'sha256-${createHash('sha256').update(browserText).digest('base64')}'`;
      if (!directive.includes(hash)) throw new Error(`CSP hash missing for inline ${kind}`);
    }
  }
  return policy;
}

module.exports = {verifyCspPolicy};
