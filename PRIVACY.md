# Privacy Policy — TrustQR

**TL;DR: TrustQR collects nothing, sends nothing, stores nothing outside your browser.**

## What we collect

Nothing. The extension operates entirely on your device:

- Text you type is processed in the popup window's memory and never uploaded
- QR codes are rendered by your browser's own canvas — no server involvement
- No analytics, no telemetry, no logging, no third-party services

## What is stored locally

Only your UI preferences (export size, error-correction level), via `chrome.storage.local`. Removing the extension erases them.

## Permissions

- `activeTab` — grants temporary access to the current tab's URL **only when you switch to the "Current page" tab**. It cannot read other tabs or run in the background.
- `storage` — local preference persistence only.

No host permissions, no background scripts, no content scripts.

## Verification

The repo contains a Playwright e2e test (`e2e/extension.spec.ts`) that launches the extension, generates QR codes, and asserts that zero external network requests occur. You can run it yourself.

## Contact

https://github.com/mundentracie/trustqr/issues
