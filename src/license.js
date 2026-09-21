// TrustQR Pro — offline license verification.
// ZERO-NETWORK RULE: verification is a local WebCrypto signature check.
// No server is ever contacted; there is no way to phone home even by accident.
//
// License key format: <idB64url>.<sigB64url>
//   <idB64url>  : base64url of an ASCII license id, e.g. "TQPRO-7F3K-XXXX"
//   <sigB64url> : ECDSA P-256 / SHA-256 signature over <idB64url> ASCII bytes
//                 (ieee-p1363 encoding), produced by scripts/make-license.mjs.
// The public key below is the ONLY trusted key. Keys are generated offline.
// Loaded as a classic script (no modules in the popup) → defines window.verifyLicenseKey.

const PUBLIC_KEY_RAW_B64 =
  'BLRbHgtraYueEQa8+8xYcwMCqHOQ/8ujCjYpxwyi/HSyDoAyE0w7spKLZSYcQ9cc50fnrBn94Ua/kjlEDmlRSv4=';

function tqB64urlToBytes(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Verify a license key string. Resolves to the license id, or null if invalid. */
async function verifyLicenseKey(keyText) {
  try {
    const key = String(keyText || '').trim();
    const dot = key.indexOf('.');
    if (dot <= 0 || dot === key.length - 1) return null;
    const idPart = key.slice(0, dot);
    const sigPart = key.slice(dot + 1);
    const idBytes = tqB64urlToBytes(idPart);
    const idText = new TextDecoder().decode(idBytes);
    if (!idText.startsWith('TQPRO-')) return null;
    const sigBytes = tqB64urlToBytes(sigPart);
    const rawPub = tqB64urlToBytes(PUBLIC_KEY_RAW_B64);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      rawPub,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      sigBytes,
      idBytes,
    );
    if (!ok) return null;
    return idText;
  } catch {
    return null;
  }
}

window.verifyLicenseKey = verifyLicenseKey;
