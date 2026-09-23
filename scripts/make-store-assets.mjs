// Generates store promo assets for TrustQR (same pipeline as TrustJSON/TrustDownload).
// Output: store/promo-small.png (440x280), store/promo-marquee.png (1400x560),
//         store/screenshots/store-{light,dark}.png (1280x800)
// All screenshots are RGB PNG (no alpha) — store requirement.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const WS = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const shot = async (page, html, w, h, out) => {
  const tmp = out.replace(/\.png$/, '.html');
  writeFileSync(tmp, html);
  await page.setViewportSize({ width: w, height: h });
  await page.goto('file:///' + tmp.replace(/\\/g, '/'));
  await page.waitForTimeout(250);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h } });
  console.log('written', out);
};

const BASE_CSS = (w, h) => `*{margin:0;padding:0;box-sizing:border-box}
body{width:${w}px;height:${h}px;overflow:hidden;font-family:'Segoe UI',Helvetica,Arial,sans-serif}`;

/* ---------- TrustQR icon (SVG, matches the PNG icons) ---------- */

const qrIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="#0d1117"/>
  <g fill="#e6edf3">
    <path d="M14 14 h36 v6 h-30 v30 h-6 z"/>
    <path d="M14 14 h6 v30 h30 v6 h-36 z"/>
    <rect x="26" y="26" width="12" height="12"/>
    <path d="M78 14 h36 v6 h-30 v30 h-6 z"/>
    <path d="M78 14 h6 v30 h30 v6 h-36 z"/>
    <rect x="90" y="26" width="12" height="12"/>
    <path d="M14 78 h6 v30 h30 v6 h-36 z"/>
    <path d="M14 108 h36 v6 h-36 z"/>
    <rect x="26" y="90" width="12" height="12"/>
  </g>
  <g fill="#2ea043">
    <rect x="70" y="70" width="44" height="8"/>
    <rect x="70" y="70" width="8" height="44"/>
    <rect x="96" y="96" width="18" height="18"/>
    <rect x="14" y="62" width="100" height="4"/>
  </g>
</svg>`;

/* ---------- fake QR pattern (deterministic, looks like a real code) ---------- */

const qrMock = (size) => {
  let cells = '';
  let s = 12345;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let r = 0; r < 21; r++) {
    for (let c = 0; c < 21; c++) {
      const inFinder = (r < 8 && c < 8) || (r < 8 && c > 12) || (r > 12 && c < 8);
      if (inFinder) continue;
      if (rnd() > 0.52) cells += `<rect x="${c}" y="${r}" width="1" height="1"/>`;
    }
  }
  const finder = (ox, oy) => `
    <rect x="${ox}" y="${oy}" width="7" height="7" fill="#0d1117"/>
    <rect x="${ox + 1}" y="${oy + 1}" width="5" height="5" fill="#ffffff"/>
    <rect x="${ox + 2}" y="${oy + 2}" width="3" height="3" fill="#0d1117"/>`;
  return `
  <div style="background:#ffffff;border:1px solid #d0d7de;border-radius:12px;padding:${Math.round(size * 0.07)}px;box-shadow:0 14px 44px rgba(0,0,0,.4);display:inline-block">
    <svg width="${size}" height="${size}" viewBox="0 0 21 21" shape-rendering="crispEdges">
      <rect width="21" height="21" fill="#ffffff"/>
      <g fill="#0d1117">${cells}</g>
      ${finder(0, 0)}${finder(14, 0)}${finder(0, 14)}
      <rect x="0" y="9.2" width="21" height="1.1" fill="#2ea043" opacity="0.85"/>
    </svg>
  </div>`;
};

const qrChecks = (fs) => `
<div style="display:flex;flex-direction:column;gap:${Math.round(fs * 0.5)}px;font-size:${fs}px;color:#c9d1d9">
  <div><span style="color:#2ea043;font-weight:700">✓</span>&nbsp; Codes never expire or redirect</div>
  <div><span style="color:#2ea043;font-weight:700">✓</span>&nbsp; Generated on-device, nothing uploaded</div>
  <div><span style="color:#2ea043;font-weight:700">✓</span>&nbsp; Zero network requests — proven by tests</div>
</div>`;

(async () => {
  const out = join(WS, 'trustqr', 'store');
  mkdirSync(join(out, 'screenshots'), { recursive: true });

  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    viewport: { width: 1400, height: 560 },
    args: [],
  });
  const page = await context.newPage();

  // ---- marquee 1400x560 ----
  await shot(page, `<!doctype html><html><head><style>${BASE_CSS(1400, 560)}
  body{background:linear-gradient(135deg,#0d1117 55%,#0f1a17);display:flex;align-items:center;justify-content:space-between;padding:0 90px;position:relative}
  .wrap{position:relative;display:flex;align-items:center;gap:70px;width:100%;justify-content:space-between}
  .left{display:flex;flex-direction:column;gap:26px}
  .name{font-size:64px;font-weight:800;color:#e6edf3}
  .sub{font-size:26px;color:#8b949e}
  </style></head><body><div class="wrap">
  <div class="left">
    <div style="display:flex;align-items:center;gap:24px">${qrIcon(110)}<div><div class="name">TrustQR</div><div class="sub">Open-source QR code generator for Chrome</div></div></div>
    ${qrChecks(24)}
  </div>
  ${qrMock(300)}
  </div></body></html>`, 1400, 560, join(out, 'promo-marquee.png'));

  // ---- small 440x280 ----
  await shot(page, `<!doctype html><html><head><style>${BASE_CSS(440, 280)}
  body{background:#0d1117;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}
  .brand{display:flex;align-items:center;gap:14px}
  .name{font-size:32px;font-weight:800;color:#e6edf3}
  .sub{font-size:15px;color:#2ea043}
  </style></head><body>
  <div class="brand">${qrIcon(72)}<div class="name">TrustQR</div></div>
  <div class="sub">✓ no expiry &nbsp; ✓ no redirects &nbsp; ✓ zero requests</div>
  <div style="font-size:13px;color:#8b949e">Open-source QR code generator</div>
  </body></html>`, 440, 280, join(out, 'promo-small.png'));

  // ---- screenshots 1280x800 (light + dark) ----
  const shotPage = (theme) => {
    const dark = theme === 'dark';
    const c = dark
      ? { bg1: '#0d1117', bg2: '#101827', card: '#161b22', border: '#30363d', fg: '#e6edf3', dim: '#8b949e', sub: '#161b22', inputBg: '#0d1117' }
      : { bg1: '#f6f8fa', bg2: '#eef2f7', card: '#ffffff', border: '#d0d7de', fg: '#1f2328', dim: '#59636e', sub: '#f6f8fa', inputBg: '#f6f8fa' };
    return `<!doctype html><html><head><style>${BASE_CSS(1280, 800)}
    body{background:linear-gradient(135deg,${c.bg1},${c.bg2});display:flex;align-items:center;justify-content:center;gap:80px}
    .panel{width:400px;background:${c.card};border:1px solid ${c.border};border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,${dark ? '.5' : '.12'})}
    .hdr{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid ${c.border}}
    .tabs{display:flex;gap:4px;padding:10px 14px 0}
    .tab{flex:1;text-align:center;font-size:13px;padding:6px 0;border:1px solid ${c.border};border-radius:6px;color:${c.dim};background:${c.inputBg}}
    .tab.on{color:${c.fg};border-color:#2ea043;font-weight:600}
    .in{margin:12px 14px 0;padding:9px 11px;background:${c.inputBg};border:1px solid ${c.border};border-radius:6px;font-family:Consolas,monospace;font-size:13px;color:${c.fg}}
    .qrwrap{display:flex;justify-content:center;margin:16px 0 6px}
    .acts{display:flex;gap:8px;padding:12px 14px 16px}
    .btn{flex:1;text-align:center;font-size:13px;padding:7px 0;border:1px solid ${c.border};border-radius:6px;color:${c.fg};background:${c.inputBg}}
    .side{max-width:380px}
    </style></head><body>
    <div class="panel">
      <div class="hdr"><span style="font-weight:700;color:${c.fg}">TrustQR</span><span style="flex:1"></span><span style="font-size:12px;color:${c.dim}">⚙</span></div>
      <div class="tabs"><span class="tab on">Text</span><span class="tab">Page</span><span class="tab">Wi-Fi 🔒</span></div>
      <div class="in">https://github.com/mundentracie/trustqr</div>
      <div class="qrwrap">${qrMock(190)}</div>
      <div class="acts"><span class="btn">⭳ PNG</span><span class="btn">⧉ Copy</span></div>
    </div>
    <div class="side">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:18px">${qrIcon(56)}<span style="font-size:30px;font-weight:800;color:${c.fg}">TrustQR</span></div>
      <div style="font-size:17px;color:${c.dim};line-height:1.7;margin-bottom:14px">A privacy-first QR code generator.<br><b style="color:${c.fg}">Codes never expire, never redirect</b> — they encode your text forever, generated entirely inside your browser.</div>
      <div style="font-size:14px;color:${c.dim};line-height:1.8">
        <span style="color:#2ea043;font-weight:700">✓</span> Zero network requests — verified by automated tests<br>
        <span style="color:#2ea043;font-weight:700">✓</span> UTF-8 safe · error correction L/M/Q/H · 256–1024 px PNG<br>
        <span style="color:#2ea043;font-weight:700">✓</span> 2 permissions only · open source · MIT
      </div>
    </div>
    </body></html>`;
  };
  await shot(page, shotPage('light'), 1280, 800, join(out, 'screenshots', 'store-light.png'));
  await shot(page, shotPage('dark'), 1280, 800, join(out, 'screenshots', 'store-dark.png'));

  await context.close();

  // verify: no alpha in every PNG we just wrote
  const all = [
    'trustqr/store/promo-marquee.png', 'trustqr/store/promo-small.png',
    'trustqr/store/screenshots/store-light.png', 'trustqr/store/screenshots/store-dark.png',
  ];
  for (const p of all) {
    const b = readFileSync(join(WS, p));
    const ct = b[25];
    console.log(p, b.readUInt32BE(16) + 'x' + b.readUInt32BE(20), 'colorType=' + ct, ct === 6 ? 'FAIL: HAS ALPHA' : 'OK no-alpha');
  }
})();
