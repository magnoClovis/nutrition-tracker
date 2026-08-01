'use strict';

const DEFAULT_ATTEMPTS = 12;
const DEFAULT_DELAY_MS = 5000;

function sleep(delayMs) {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

function extractAsset(html, pattern, label) {
  const match = html.match(pattern);
  if (!match) throw new Error(`deployed index.html is missing a relative hashed ${label} asset`);
  return match[1];
}

async function verifyResponse(fetchRequest, url, expectedContentType) {
  const response = await fetchRequest(url, { redirect: 'follow', cache: 'no-store' });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  if (!expectedContentType.test(contentType)) {
    throw new Error(`${url} returned unexpected Content-Type: ${contentType || '(missing)'}`);
  }
  return response;
}

async function verifyPagesDeployment(
  pageUrl,
  {
    fetchRequest = globalThis.fetch,
    attempts = DEFAULT_ATTEMPTS,
    delayMs = DEFAULT_DELAY_MS,
  } = {},
) {
  if (!pageUrl) throw new Error('Pages URL is required');
  const normalizedPageUrl = new URL('./', pageUrl).href;
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const htmlResponse = await verifyResponse(fetchRequest, normalizedPageUrl, /text\/html/i);
      const html = await htmlResponse.text();

      if (/\/src\/main\.jsx|index\.vite\.html/i.test(html)) {
        throw new Error('source Vite entry detected in deployed index.html');
      }
      if (/<script\b[^>]*\bsrc=["'][^"']*(?:vendor\/|app\.js|nutrition-tracker-controller\.js)[^"']*["']/i.test(html)) {
        throw new Error('legacy runtime reference detected in deployed index.html');
      }
      if (/\?v=/i.test(html)) {
        throw new Error('manual cache-busting query detected in deployed index.html');
      }

      const scriptPath = extractAsset(
        html,
        /<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["'](\.\/assets\/[^"']+-[A-Za-z0-9_-]+\.js)["'][^>]*>/i,
        'JavaScript',
      );
      const stylePath = extractAsset(
        html,
        /<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["'](\.\/assets\/[^"']+-[A-Za-z0-9_-]+\.css)["'][^>]*>/i,
        'CSS',
      );

      await verifyResponse(fetchRequest, new URL(scriptPath, normalizedPageUrl), /(?:java|ecma)script/i);
      await verifyResponse(fetchRequest, new URL(stylePath, normalizedPageUrl), /text\/css/i);

      const privacyUrl = new URL('privacy/', normalizedPageUrl).href;
      const privacyResponse = await verifyResponse(fetchRequest, privacyUrl, /text\/html/i);
      const privacyHtml = await privacyResponse.text();
      for (const language of ['pt', 'en', 'es']) {
        if (!new RegExp(`data-policy=["']${language}["']`, 'i').test(privacyHtml)) {
          throw new Error(`deployed privacy page is missing the ${language.toUpperCase()} policy`);
        }
      }
      if (!/data-language-selector/i.test(privacyHtml)) {
        throw new Error('deployed privacy page is missing its language selector');
      }

      return {
        pageUrl: normalizedPageUrl,
        scriptUrl: new URL(scriptPath, normalizedPageUrl).href,
        styleUrl: new URL(stylePath, normalizedPageUrl).href,
        privacyUrl,
      };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(delayMs);
    }
  }

  throw new Error(
    `Pages deployment verification failed after ${attempts} attempt(s): ${lastError?.message || lastError}`,
  );
}

if (require.main === module) {
  const requestedUrl = process.argv[2] || process.env.PAGES_BASE_URL;
  verifyPagesDeployment(requestedUrl)
    .then(result => {
      console.log(`Verified Pages deployment: ${result.pageUrl}`);
      console.log(`JavaScript: ${result.scriptUrl}`);
      console.log(`CSS: ${result.styleUrl}`);
      console.log(`Privacy: ${result.privacyUrl}`);
    })
    .catch(error => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = {
  verifyPagesDeployment,
};
