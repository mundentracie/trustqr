// TrustQR popup logic — every byte of QR generation happens in this window.
// No fetch, no XHR, no telemetry. The e2e test asserts that at runtime.
// v0.2.0: Pro features (Wi-Fi / vCard / batch) gated by an offline license.
'use strict';

const $ = (sel) => document.querySelector(sel);

const input = $('#input');
const pageUrl = $('#page-url');
const canvas = $('#qr');
const ctx = canvas.getContext('2d');
const placeholder = $('#placeholder');
const errorEl = $('#error');
const btnDownload = $('#download');
const btnCopy = $('#copy');

const INK = '#0d1117';
const PAPER = '#ffffff'; // QR is always rendered on white for scan reliability
const BATCH_SIZE = 256;  // per-item pixel size for batch thumbnails/exports

let mode = 'text'; // 'text' | 'page' | 'wifi' | 'vcard' | 'batch'
let pageUrlText = '';
let proId = null; // license id when Pro is active
let batchItems = []; // [{text, dataUrl}]

// qrcode-generator defaults to a latin-1 byte map; force UTF-8 so 中文/emoji encode.
if (window.qrcode && qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
}

function setError(msg) {
  if (msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
  } else {
    errorEl.classList.add('hidden');
  }
}

// ---- shared single-QR renderer ----
function renderSingle(text) {
  if (!text) {
    canvas.classList.remove('visible');
    placeholder.classList.remove('hidden');
    btnDownload.disabled = true;
    btnCopy.disabled = true;
    setError('');
    return true;
  }
  try {
    const qr = qrcode(0, $('#ecc').value); // typeNumber 0 = auto-size
    qr.addData(text, 'Byte');
    qr.make();

    const count = qr.getModuleCount();
    const quiet = 4; // standard quiet zone, in modules
    const cells = count + quiet * 2;
    const px = Math.floor(232 / cells);
    const offset = Math.floor((232 - cells * px) / 2);

    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, 232, 232);
    ctx.fillStyle = INK;
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) {
          ctx.fillRect(offset + (col + quiet) * px, offset + (row + quiet) * px, px, px);
        }
      }
    }

    canvas.classList.add('visible');
    placeholder.classList.add('hidden');
    btnDownload.disabled = false;
    btnCopy.disabled = false;
    setError('');
    return true;
  } catch (err) {
    canvas.classList.remove('visible');
    placeholder.classList.add('hidden');
    btnDownload.disabled = true;
    btnCopy.disabled = true;
    setError('Text too long for a QR code at this error-correction level.');
    return false;
  }
}

function activeText() {
  if (mode === 'page') return pageUrlText;
  if (mode === 'wifi') return wifiText();
  if (mode === 'vcard') return vcardText();
  return input.value.trim();
}

function render() {
  if (mode === 'batch') { renderBatch(); return; }
  renderSingle(activeText());
}

// ---- payload builders (Pro) ----
function wifiEscape(s) {
  return String(s).replace(/([\\;,:"])/g, '\\$1');
}

function wifiText() {
  const ssid = $('#wifi-ssid').value.trim();
  if (!ssid) return '';
  const sec = $('#wifi-security').value;
  const pass = $('#wifi-pass').value;
  const T = sec === 'nopass' ? 'nopass' : sec;
  const P = sec === 'nopass' ? '' : 'P:' + wifiEscape(pass) + ';';
  return `WIFI:T:${T};S:${wifiEscape(ssid)};${P};`;
}

function vcardText() {
  const name = $('#vc-name').value.trim();
  const org = $('#vc-org').value.trim();
  const phone = $('#vc-phone').value.trim();
  const email = $('#vc-email').value.trim();
  const url = $('#vc-url').value.trim();
  if (!name && !phone && !email) return '';
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  const firstLast = name.includes(',') ? name.split(',').reverse() : name.split(/\s+/);
  lines.push('N:' + (firstLast.length > 1 ? firstLast.slice(1).join(' ') + ';' + firstLast[0] : name + ';;;'));
  lines.push('FN:' + name);
  if (org) lines.push('ORG:' + org);
  if (phone) lines.push('TEL;TYPE=CELL:' + phone);
  if (email) lines.push('EMAIL:' + email);
  if (url) lines.push('URL:' + url);
  lines.push('END:VCARD');
  return lines.join('\n');
}

// ---- batch (Pro) ----
function renderBatch() {
  const list = $('#batch-list');
  list.textContent = '';
  batchItems = [];
  const lines = [...new Set($('#batch-input').value.split('\n').map((l) => l.trim()).filter(Boolean))].slice(0, 50);

  for (const text of lines) {
    try {
      const qr = qrcode(0, $('#ecc').value);
      qr.addData(text, 'Byte');
      qr.make();
      const count = qr.getModuleCount();
      const quiet = 4;
      const cells = count + quiet * 2;
      const px = Math.max(1, Math.floor(BATCH_SIZE / cells));
      const dim = px * cells;
      const off = Math.floor((dim - cells * px) / 2);

      const c = document.createElement('canvas');
      c.width = dim; c.height = dim;
      const g = c.getContext('2d');
      g.fillStyle = PAPER; g.fillRect(0, 0, dim, dim);
      g.fillStyle = INK;
      for (let r = 0; r < count; r++) {
        for (let col = 0; col < count; col++) {
          if (qr.isDark(r, col)) g.fillRect(off + (col + quiet) * px, off + (r + quiet) * px, px, px);
        }
      }
      batchItems.push({ text, dataUrl: c.toDataURL('image/png') });
    } catch (err) {
      batchItems.push({ text, dataUrl: null }); // overflow / invalid — shown as error row
    }
  }

  for (const item of batchItems) {
    const row = document.createElement('div');
    row.className = 'tq-batch-row';
    if (item.dataUrl) {
      const img = document.createElement('img');
      img.src = item.dataUrl;
      row.appendChild(img);
      const span = document.createElement('span');
      span.className = 'tq-batch-text';
      span.textContent = item.text;
      span.title = item.text;
      row.appendChild(span);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = '⭳';
      btn.title = 'Download this PNG';
      btn.addEventListener('click', () => downloadDataUrl(item.dataUrl, batchFileName(item.text)));
      row.appendChild(btn);
    } else {
      const span = document.createElement('span');
      span.className = 'tq-batch-text tq-batch-err';
      span.textContent = '✗ too long: ' + item.text;
      row.appendChild(span);
    }
    list.appendChild(row);
  }

  const okCount = batchItems.filter((i) => i.dataUrl).length;
  $('#batch-download').classList.toggle('hidden', okCount === 0);
  canvas.classList.remove('visible');
  placeholder.classList.add('hidden');
  btnDownload.disabled = true;
  btnCopy.disabled = true;
  setError(lines.length > 50 ? 'Batch is capped at 50 rows per run.' : '');
}

function batchFileName(text) {
  const slug = text.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'qr';
  return 'trustqr-' + slug + '.png';
}

function downloadDataUrl(dataUrl, name) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = name;
  a.click();
}

function downloadAll() {
  // sequential clicks with a small gap so the browser queues them all
  batchItems.filter((i) => i.dataUrl).forEach((item, i) => {
    setTimeout(() => downloadDataUrl(item.dataUrl, batchFileName(item.text)), i * 250);
  });
}

// ---- single download / copy ----
function scaledCanvas(size) {
  const out = document.createElement('canvas');
  out.width = size;
  out.height = size;
  out.getContext('2d').drawImage(canvas, 0, 0, size, size);
  return out;
}

function downloadPng() {
  const size = parseInt($('#size').value, 10);
  scaledCanvas(size).toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'trustqr.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

async function copyPng() {
  const size = parseInt($('#size').value, 10);
  const blob = await new Promise((res) => scaledCanvas(size).toBlob(res, 'image/png'));
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

// ---- tabs & visibility ----
const PANELS = {
  text: () => input,
  page: () => pageUrl,
  wifi: () => $('#panel-wifi'),
  vcard: () => $('#panel-vcard'),
  batch: () => $('#panel-batch'),
};

function showMode(next) {
  mode = next;
  for (const [key, getEl] of Object.entries(PANELS)) {
    getEl().classList.toggle('hidden', mode !== key);
  }
  const isBatch = mode === 'batch';
  $('#single-options').classList.toggle('hidden', isBatch);
  $('#single-actions').classList.toggle('hidden', isBatch);
  render();
}

async function currentTabUrl() {
  // activeTab is granted by the very click that opened this popup, so the
  // active tab's URL is readable without the broad "tabs" permission.
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab && tab.url ? tab.url : '';
}

// ---- Pro license ----
function paintProState() {
  const badge = $('#pro-badge');
  const status = $('#pro-status');
  badge.classList.toggle('hidden', !proId);
  for (const tab of document.querySelectorAll('.tq-pro-tab')) {
    const lock = tab.querySelector('.tq-lock');
    if (lock) lock.classList.toggle('hidden', !!proId);
  }
  if (proId) {
    status.textContent = '✓ Pro active — ' + proId;
    status.className = 'tq-pro-status ok';
  } else {
    status.textContent = 'Free edition — Pro features are locked.';
    status.className = 'tq-pro-status';
  }
}

async function applyLicense() {
  const text = $('#license-input').value;
  const id = await window.verifyLicenseKey(text);
  if (id) {
    proId = id;
    await chrome.storage.local.set({ pro_license: text.trim() });
    setError('');
    paintProState();
    showMode(mode); // re-render unlocked tab
  } else {
    setError('That license key is not valid. Check for typos — verification is local and instant.');
  }
}

function toggleSettings(focus) {
  const el = $('#settings');
  const willShow = el.classList.contains('hidden');
  el.classList.toggle('hidden', !willShow);
  if (willShow && focus) $('#license-input').focus();
}

function openSettings(focus) {
  $('#settings').classList.remove('hidden');
  if (focus) $('#license-input').focus();
}

async function initPro() {
  const stored = await chrome.storage.local.get('pro_license');
  if (stored.pro_license) {
    proId = await window.verifyLicenseKey(stored.pro_license);
  }
  paintProState();
}

// ---- events ----
$('#tab-text').addEventListener('click', () => setTab('text'));
$('#tab-page').addEventListener('click', async () => {
  pageUrlText = await currentTabUrl();
  pageUrl.textContent = pageUrlText || '(this page has no URL)';
  setTab('page');
});
$('#tab-wifi').addEventListener('click', () => tryProTab('wifi'));
$('#tab-vcard').addEventListener('click', () => tryProTab('vcard'));
$('#tab-batch').addEventListener('click', () => tryProTab('batch'));

function setTab(next) {
  document.querySelectorAll('.tq-tab').forEach((t) => t.classList.remove('active'));
  $('#tab-' + next).classList.add('active');
  showMode(next);
}

function tryProTab(next) {
  if (!proId) { openSettings(true); return; }
  setTab(next);
}

input.addEventListener('input', render);
$('#ecc').addEventListener('change', render);
$('#size').addEventListener('change', render);
$('#wifi-ssid').addEventListener('input', render);
$('#wifi-pass').addEventListener('input', render);
$('#wifi-security').addEventListener('change', render);
for (const id of ['vc-name', 'vc-org', 'vc-phone', 'vc-email', 'vc-url']) {
  $('#' + id).addEventListener('input', render);
}
$('#batch-input').addEventListener('input', render);
$('#batch-download').addEventListener('click', downloadAll);
btnDownload.addEventListener('click', downloadPng);
btnCopy.addEventListener('click', () => copyPng().catch(() => setError('Copy failed — your browser blocked clipboard access.')));
$('#settings-btn').addEventListener('click', () => toggleSettings(false));
$('#license-apply').addEventListener('click', () => applyLicense());
$('#license-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') applyLicense(); });

initPro();
showMode('text');
