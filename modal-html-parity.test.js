'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/loadSource.js');

// Kenapa test ini penting: modals.js punya komentar "Urutan array WAJIB sama
// dengan urutan pemanggilan document.write(MODAL_HTML[i]) di
// app_production.html -- jangan diubah manual." — tapi invariant itu tidak
// pernah divalidasi otomatis. Kalau MODAL_HTML nambah/kurang satu elemen
// tanpa nambah/kurang document.write(MODAL_HTML[i]) yang sepadan di HTML
// (atau sebaliknya), modal ke-N ke atas akan geser (render HTML modal yang
// SALAH ke overlay id yang salah) atau modal paling akhir tidak ke-render
// sama sekali (document.getElementById(id) balik null saat openModal()
// dipanggil) — bug yang baru ketahuan pas testing manual tiap modal satu-
// satu. Test ini menjaga 2 invariant sekaligus tanpa perlu browser:
//   1. Jumlah elemen MODAL_HTML[] === jumlah document.write(MODAL_HTML[i])
//      di tiap file HTML.
//   2. Index i yang dipanggil di document.write(MODAL_HTML[i]) itu SEQUENTIAL
//      0..N-1 (bukan cuma jumlahnya sama, tapi urutannya juga tidak geser/
//      kececer/kebalik).

const ROOT = path.join(__dirname, '..');
const HTML_FILES = ['index.html', 'app_production.html'];

function getModalHtmlLength() {
  // Load modals.js asli via vm (bukan re-implement/copy-paste), MODAL_HTML
  // dideklarasikan `const` jadi perlu diminta eksplisit lewat `expose`.
  const ctx = loadSource(['modals.js'], {}, ['MODAL_HTML', 'MODAL_VERSION']);
  assert.ok(Array.isArray(ctx.MODAL_HTML), 'MODAL_HTML harus berupa array di modals.js');
  return ctx.MODAL_HTML.length;
}

function getDocumentWriteIndices(htmlFile) {
  const src = fs.readFileSync(path.join(ROOT, htmlFile), 'utf8');
  const matches = [...src.matchAll(/document\.write\(MODAL_HTML\[(\d+)\]\)/g)];
  return matches.map((m) => Number(m[1]));
}

test('jumlah elemen MODAL_HTML[] di modals.js sama dengan jumlah document.write(MODAL_HTML[i]) di tiap HTML', () => {
  const modalCount = getModalHtmlLength();
  assert.ok(modalCount > 0, 'MODAL_HTML tidak boleh kosong');

  for (const htmlFile of HTML_FILES) {
    const indices = getDocumentWriteIndices(htmlFile);
    assert.equal(
      indices.length,
      modalCount,
      `${htmlFile}: jumlah document.write(MODAL_HTML[i]) (${indices.length}) tidak sama dengan ` +
        `jumlah elemen MODAL_HTML[] di modals.js (${modalCount}) — ada modal yang ketinggalan ` +
        `ditambahkan/dihapus di salah satu sisi (modals.js vs ${htmlFile}).`
    );
  }
});

test('index document.write(MODAL_HTML[i]) di tiap HTML berurutan 0..N-1 tanpa lompat/duplikat/kebalik', () => {
  const modalCount = getModalHtmlLength();

  for (const htmlFile of HTML_FILES) {
    const indices = getDocumentWriteIndices(htmlFile);
    const expected = Array.from({ length: modalCount }, (_, i) => i);
    assert.deepEqual(
      indices,
      expected,
      `${htmlFile}: urutan index di document.write(MODAL_HTML[i]) harus persis 0,1,2,...,${modalCount - 1} ` +
        `sesuai urutan MODAL_HTML[] di modals.js (lihat catatan di baris atas modals.js) — ` +
        `urutan aktual: ${JSON.stringify(indices)}`
    );
  }
});

test('kedua HTML (index.html & app_production.html) manggil document.write(MODAL_HTML[i]) dengan urutan index yang PERSIS SAMA satu sama lain', () => {
  const [a, b] = HTML_FILES.map(getDocumentWriteIndices);
  assert.deepEqual(
    a,
    b,
    `Urutan document.write(MODAL_HTML[i]) di ${HTML_FILES[0]} dan ${HTML_FILES[1]} berbeda — ` +
      `kedua file ini seharusnya identik (lihat catatan build.js poin 6: app_production.html ` +
      `SELALU ditulis ulang jadi salinan persis index.html).`
  );
});
