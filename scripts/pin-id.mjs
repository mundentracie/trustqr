// Generates an RSA keypair, pins the public key into manifest.json ("key"),
// and prints the deterministic 32-char Chrome extension ID it produces.
// A pinned key gives the unpacked extension a stable ID (same ID for everyone
// who loads from the repo), which the e2e test relies on. Stores re-sign
// packages, so this field does not affect store submissions.
import { generateKeyPairSync, createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';

const manifestPath = new URL('../manifest.json', import.meta.url);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

if (manifest.key) {
  console.log('manifest already has a pinned key');
} else {
  const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const spki = publicKey.export({ type: 'spki', format: 'der' });
  manifest.key = spki.toString('base64');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log('key pinned into manifest.json');
}

const spki = Buffer.from(manifest.key, 'base64');
const hash = createHash('sha256').update(spki).digest();
const id = [...hash.slice(0, 16)]
  .flatMap((b) => [b >> 4, b & 0xf])
  .map((n) => String.fromCharCode(97 + n))
  .join('');
console.log('extension id:', id);
