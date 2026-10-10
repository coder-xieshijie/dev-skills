// Example helper for web entries: opens one page the way a user does and reports what is on it. The
// HTTP example's `page` tool (`verify.mjs do page`) and `capture` use it. It needs Playwright
// (`playwright` or `playwright-core`) installed in the repository and a Chromium it can launch
// (`npx playwright install chromium`). The browser is headless, so it never takes the user's focus.
// Called inside ctx.read, its errors make the evidence unreadable.

import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Playwright as the repository resolves it.
export async function loadPlaywright(root) {
  const require = createRequire(path.join(root, 'package.json'));
  for (const name of ['playwright', 'playwright-core']) {
    try {
      const module = await import(pathToFileURL(require.resolve(name)).href);
      return module.chromium ? module : module.default;
    } catch {
      // try the next name
    }
  }
  throw new Error(
    `Playwright is not installed in ${root}: add it as a dev dependency (and npx playwright install chromium), or drive the page with your host's browser tool`,
  );
}

// Opens `url`, waits for `waitText` (up to `timeout` seconds) and then `seconds` more, and saves the
// visible text and a full-page screenshot as <outDir>/<name>.txt and .png. A page that does not load
// (no response, non-2xx) throws; text that never appears is `ok: false` with why.
// `headers` go with every request the page makes (a token the app requires, say).
export async function openPage({ url, root, outDir, name = 'page', waitText, timeout = 30, seconds = 0, headers }) {
  const { chromium } = await loadPlaywright(root);
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext(headers ? { extraHTTPHeaders: headers } : {});
    const page = await context.newPage();
    let response;
    try {
      response = await page.goto(url, { waitUntil: 'load', timeout: timeout * 1000 });
    } catch (error) {
      throw new Error(`page ${url}: ${error.message.split('\n')[0]}`);
    }
    if (!response || !response.ok()) throw new Error(`page ${url} returned ${response ? `HTTP ${response.status()}` : 'no response'}`);
    let found;
    if (waitText !== undefined) {
      found = await page
        .getByText(waitText)
        .first()
        .waitFor({ timeout: timeout * 1000 })
        .then(() => true, () => false);
    }
    if (seconds > 0) await page.waitForTimeout(seconds * 1000);
    const text = await page.locator('body').innerText();
    const textFile = path.join(outDir, `${name}.txt`);
    const screenshot = path.join(outDir, `${name}.png`);
    writeFileSync(textFile, text);
    await page.screenshot({ path: screenshot, fullPage: true });
    return {
      ok: found !== false,
      url,
      status: response.status(),
      ...(found === false ? { why: `"${waitText}" did not appear within ${timeout}s` } : {}),
      text: text.length > 4000 ? `${text.slice(0, 4000)}…` : text,
      textFile,
      screenshot,
    };
  } finally {
    await browser.close();
  }
}
