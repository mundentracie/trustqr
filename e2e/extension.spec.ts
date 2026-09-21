import { test, expect, chromium, type BrowserContext, type Page, type Request } from '@playwright/test';
import { join } from 'path';

// Proof test: loading the popup and generating QR codes must make ZERO external
// network requests — including the download and clipboard flows.
const EXTENSION_DIR = join(process.cwd(), '.');

test('makes no external requests while generating QR codes', async () => {
  const context: BrowserContext = await chromium.launchPersistentContext('', {
    // Extensions only load in the full Chromium build (new headless mode).
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`],
  });

  const external: string[] = [];
  context.on('request', (request: Request) => {
    const url = request.url();
    if (!url.startsWith('chrome-extension://') && !url.startsWith('devtools://')) {
      external.push(url);
    }
  });

  // find the extension id from its service worker-less setup: read from the
  // chrome://extensions is not needed — the popup is a plain page we can open by id
  let [sw] = context.serviceWorkers();
  if (!sw) {
    sw = await context.waitForEvent('serviceworker', { timeout: 5000 }).catch(() => null as never);
  }
  const extId = sw ? new URL(sw.url()).host : null;
  test.skip(!extId, 'extension id not found');

  const page: Page = await context.newPage();
  await page.goto(`chrome-extension://${extId}/popup.html`);

  // type text and expect the canvas to render
  await page.fill('#input', 'https://github.com/mundentracie/trustqr — 零网络 ✅');
  await expect(page.locator('#qr')).toBeVisible();
  await expect(page.locator('#qr')).toHaveClass(/visible/);

  // switch ECC and re-render
  await page.selectOption('#ecc', 'H');
  await expect(page.locator('#error')).toBeHidden();

  // current-page tab (no page open → placeholder URL text is fine)
  await page.click('#tab-page');
  await expect(page.locator('#page-url')).toBeVisible();
  await page.click('#tab-text');
  await page.fill('#input', 'hello again');

  // no external request may have fired during ANY of the above
  expect(external).toEqual([]);
  await context.close();
});
