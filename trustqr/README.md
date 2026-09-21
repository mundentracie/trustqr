# TrustQR — Open Source QR Code Generator

A privacy-first QR code generator browser extension. **Codes never expire, never redirect, and never leave your device.**

Live on Edge Add-ons and Chrome Web Store: *(submission-ready; review not yet submitted)*.

## Why another QR extension?

The most popular QR extensions have a pattern worth knowing about:

- Some route generated codes through the developer's own website — your URL is trackable, and "free" codes can stop resolving when the account lapses
- Several advertise "free for everyone" while reviews report being asked to pay days later
- Feature checklists grow faster than permission checklists shrink

TrustQR does one thing: turns text or a URL into a QR code image, entirely inside your browser window.

## The trust claims are checkable, not promises

- **MIT licensed**, full source on GitHub — a few hundred lines of auditable code
- **Zero network requests.** Not "we respect your privacy" — an automated Playwright e2e test in this repo launches the extension, generates QR codes, and asserts that **no external request fired**
- **2 permissions, both low-risk:**
  - `activeTab` — reads the current tab's URL only when *you* click "Current page"
  - `storage` — saves your size/error-correction preferences locally
  - Explicitly NOT requested: `tabs`, `host_permissions`, `downloads`, `history`, `cookies`
- **No redirects, no expiry.** The PNG you download encodes your original text, forever, offline

## Features

- Generate from typed text/URL, or from the current page in one click
- UTF-8 safe (中文, emoji, any language)
- Error correction L/M/Q/H, export at 256/512/1024 px
- Download PNG or copy image to clipboard
- Scoped dark mode — only the popup is themed, never your page

## Pro ($2.9 one-time, lifetime)

- **Wi-Fi QR** — share your network: guests scan and connect, password never leaves the popup
- **vCard QR** — your contact card as a code for business cards and events
- **Batch mode** — paste up to 50 lines, get one QR per line with a download-all button
- License keys are verified **100% offline** (ECDSA P-256 signature checked on-device with WebCrypto) — even Pro cannot phone home. No account, no activation server, no subscription.

Buy: see the [Pro section](#pro-29-one-time-lifetime) — payment link in the store listing and README badge.

## Development

```bash
npm install
npm run icons          # regenerate icons (pure-Python PNG writer, no image libs)
npm run e2e            # zero-network proof test
```

Load unpacked from the repo root (`chrome://extensions` → Developer mode → Load unpacked).

## License

MIT. The bundled QR encoder is [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko Arase (MIT).
"QR Code" is a registered trademark of DENSO WAVE INCORPORATED.
