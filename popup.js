// TrustQR popup logic — every byte of QR generation happens in this window.
// No fetch, no XHR, no telemetry. The e2e test asserts that at runtime.
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

let mode = 'text'; // 'text' | 'page'
let pageUrlText = '';

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

function render() {
  const text = mode === 'page' ? pageUrlText : input.value.trim();
  if (!text) {
    canvas.classList.remove('visible');
    placeholder.classList.remove('hidden');
    btnDownload.disabled = true;
    btnCopy.disabled = true;
    setError('');
    return;
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
  } catch (err) {
    // qrcode-generator throws on data overflow; suggest higher EC headroom via smaller input
    canvas.classList.remove('visible');
    placeholder.classList.add('hidden');
    btnDownload.disabled = true;
    btnCopy.disabled = true;
    setError('Text too long for a QR code at this error-correction level.');
  }
}

async function currentTabUrl() {
  // activeTab is granted by the very click that opened this popup, so the
  // active tab's URL is readable without the broad "tabs" permission.
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab && tab.url ? tab.url : '';
}

function downloadPng() {
  const size = parseInt($('#size').value, 10);
  const out = document.createElement('canvas');
  out.width = size;
  out.height = size;
  out.getContext('2d').drawImage(canvas, 0, 0, size, size);
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'trustqr.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

async function copyPng() {
  const size = parseInt($('#size').value, 10);
  const out = document.createElement('canvas');
  out.width = size;
  out.height = size;
  out.getContext('2d').drawImage(canvas, 0, 0, size, size);
  const blob = await new Promise((res) => out.toBlob(res, 'image/png'));
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

// ---- events ----
$('#tab-text').addEventListener('click', () => {
  mode = 'text';
  $('#tab-text').classList.add('active');
  $('#tab-page').classList.remove('active');
  pageUrl.classList.add('hidden');
  input.classList.remove('hidden');
  render();
});

$('#tab-page').addEventListener('click', async () => {
  mode = 'page';
  $('#tab-page').classList.add('active');
  $('#tab-text').classList.remove('active');
  input.classList.add('hidden');
  pageUrlText = await currentTabUrl();
  pageUrl.textContent = pageUrlText || '(this page has no URL)';
  pageUrl.classList.remove('hidden');
  render();
});

input.addEventListener('input', render);
$('#ecc').addEventListener('change', render);
$('#size').addEventListener('change', render);
btnDownload.addEventListener('click', downloadPng);
btnCopy.addEventListener('click', () => copyPng().catch(() => setError('Copy failed — your browser blocked clipboard access.')));

render();
