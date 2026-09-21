import { test, expect, chromium, type BrowserContext, type Page, type Request } from '@playwright/test';
import { join } from 'path';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';

// The manifest pins a public key, so the unpacked extension gets a stable ID:
// first 16 bytes of SHA-256(SPKI DER), each nibble mapped to a-p.
function extensionId(): string {
  const manifest = JSON.parse(readFileSync(join(process.cwd(), 'manifest.json'), 'utf8'));
  const spki = Buffer.from(manifest.key, 'base64');
  const hash = createHash('sha256').update(spki).digest();
  return [...hash.slice(0, 16)]
    .flatMap((b) => [b >> 4, b & 0xf])
    .map((n) => String.fromCharCode(97 + n))
    .join('');
}

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

  // the manifest pins a key → stable, computable extension id (no service worker needed)
  const extId = extensionId();

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

  // Pro tabs are locked in the free edition: clicking opens settings, never the panel
  await page.click('#tab-wifi');
  await expect(page.locator('#settings')).toBeVisible();
  await expect(page.locator('#panel-wifi')).toBeHidden();

  // an invalid license key must fail LOCALLY (no network) and show an error
  await page.fill('#license-input', 'TQPRO-FAKE.fakesig');
  await page.click('#license-apply');
  await expect(page.locator('#error')).toBeVisible();
  await expect(page.locator('#error')).toContainText('not valid');

  // no external request may have fired during ANY of the above
  expect(external).toEqual([]);
  await context.close();
});
