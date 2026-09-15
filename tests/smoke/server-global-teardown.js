const http = require('node:http');

/**
 * Explicitly stops the local static server after the last Playwright project.
 *
 * Playwright launches webServer commands through cmd.exe on Windows. Killing
 * that wrapper does not reliably terminate its Node child, so the child keeps
 * the reporter pipes open even after every test and browser has finished.
 */
module.exports = async function stopSmokeServer(config) {
  const baseURL = config.projects.find(project => project.use?.baseURL)?.use?.baseURL;
  if (!baseURL) return;

  const shutdownUrl = new URL('/__smoke_shutdown__', baseURL);
  await new Promise(resolve => {
    const request = http.request(shutdownUrl, { method: 'POST' }, response => {
      response.resume();
      response.once('end', resolve);
    });
    request.setTimeout(2000, () => {
      request.destroy();
      resolve();
    });
    request.once('error', resolve);
    request.end();
  });
};
