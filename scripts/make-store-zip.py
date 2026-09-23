#!/usr/bin/env python3
# Build TrustQR store zip. Strips the "key" field from manifest.json
# (Edge Add-ons rejects manifests containing "key"; it exists only to pin
# the extension ID for local e2e tests and must never ship to stores).
import json, os, zipfile

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERSION = json.load(open(os.path.join(BASE, 'manifest.json')))['version']
OUT = os.path.join(BASE, f'trustqr-v{VERSION}-store.zip')

FILES = ['popup.html', 'popup.css', 'popup.js', 'lib/qrcode.js', 'src/license.js',
         'icons/icon16.png', 'icons/icon32.png', 'icons/icon48.png', 'icons/icon128.png']

manifest = json.load(open(os.path.join(BASE, 'manifest.json'), encoding='utf-8'))
manifest.pop('key', None)
manifest_clean = json.dumps(manifest, indent=2, ensure_ascii=False) + '\n'

with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('manifest.json', manifest_clean)
    print('added manifest.json (key stripped)')
    for f in FILES:
        z.write(os.path.join(BASE, f), f)
        print('added', f)

print('zip:', OUT, os.path.getsize(OUT), 'bytes (v%s)' % VERSION)
