const {createHash} = require('node:crypto');

const CSP_META_PATTERN = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/?\s*>/i;
const PRODUCTION_CSP_DESTINATIONS = Object.freeze({
  worker: 'https://trofia-ai-proxy.cmagno-dev.workers.dev',
  callable: 'https://europe-southwest1-nutrition-tracker-780b3.cloudfunctions.net',
  auth: 'https://nutrition-tracker-780b3.firebaseapp.com',
});

function replaceExactlyOnce(policy, source, replacement) {
  if (policy.split(source).length !== 2) throw new Error('CSP baseline destination missing or repeated');
  return policy.replace(source, replacement);
}

function stagingCspDestinations(manifest) {
  const worker = manifest?.worker?.origin;
  const callableUrl = manifest?.callable?.url;
  const authDomain = manifest?.firebase?.authDomain;
  if (!worker || !callableUrl || !authDomain) throw new Error('Staging CSP destinations are incomplete');
  let callable;
  try {
    callable = new URL(callableUrl).origin;
  } catch {
    throw new Error('Staging CSP callable URL is invalid');
  }
  const auth = `https://${authDomain}`;
  for (const value of [worker, callable, auth]) {
    let parsed;
    try { parsed = new URL(value); } catch { throw new Error('Staging CSP destination is invalid'); }
    if (parsed.protocol !== 'https:' || parsed.origin !== value || parsed.username || parsed.password) {
      throw new Error('Staging CSP destination must be an exact HTTPS origin');
    }
    if (Object.values(PRODUCTION_CSP_DESTINATIONS).includes(value)) {
      throw new Error('Staging CSP contains a production destination');
    }
  }
  if (authDomain !== 'trofia-staging.firebaseapp.com'
      || callable !== 'https://europe-southwest1-trofia-staging.cloudfunctions.net') {
    throw new Error('Staging CSP Firebase destination belongs to another project');
  }
  return {worker, callable, auth};
}

function renderStagingCspHtml(html, manifest) {
  verifyCspPolicy(html);
  const match = html.match(CSP_META_PATTERN);
  const destinations = stagingCspDestinations(manifest);
  let policy = match[1];
  for (const kind of ['worker', 'callable', 'auth']) {
    policy = replaceExactlyOnce(policy, PRODUCTION_CSP_DESTINATIONS[kind], destinations[kind]);
  }
  const result = html.replace(match[0], match[0].replace(match[1], policy));
  verifyStagingCspPolicy(result, manifest);
  return result;
}

function verifyStagingCspPolicy(html, manifest) {
  const policy = verifyCspPolicy(html);
  const destinations = stagingCspDestinations(manifest);
  const directives = new Map(policy.split(';').map(part => {
    const [name, ...values] = part.trim().split(/\s+/);
    return [name, values];
  }));
  for (const kind of ['worker', 'callable']) {
    if (!(directives.get('connect-src') || []).includes(destinations[kind])) {
      throw new Error(`Staging CSP lacks ${kind} destination`);
    }
  }
  if (!(directives.get('frame-src') || []).includes(destinations.auth)) {
    throw new Error('Staging CSP lacks Auth destination');
  }
  for (const destination of Object.values(PRODUCTION_CSP_DESTINATIONS)) {
    if (policy.includes(destination)) throw new Error('Staging CSP contains a production destination');
  }
  if (policy.includes('*.firebaseapp.com') || policy.includes('*.workers.dev')) {
    throw new Error('Staging CSP contains a wildcard destination');
  }
  return policy;
}

function verifyCspPolicy(html) {
  const policyMatch = html.match(CSP_META_PATTERN);
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

module.exports = {renderStagingCspHtml, verifyCspPolicy, verifyStagingCspPolicy};
