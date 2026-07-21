'use strict';
// tests/eie-watchlist-card.test.js — EIEDashboard._renderWatchlistCard()
// (ui/eie-dashboard.js). Kartu "Daftar pantauan" IHSG + USD/IDR bergaya
// widget watchlist saham (angka besar + panah tren + sparkline), murni
// presenter dari MacroDataAdapter.getLatest()/getHistory() — tidak pernah
// tulis balik ke store.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function loadDashboard({ latest, history = [], hasContainer = true } = {}) {
  const fakeDocument = createFakeDocument(hasContainer ? { eieWatchlistCard: {} } : {});
  const ctx = loadSource(
    ['economic-intelligence/ui/eie-dashboard.js'],
    {
      document: fakeDocument,
      MacroDataAdapter: {
        getLatest: () => latest,
        getHistory: () => history,
      },
      STATUS_META: {},
    },
    ['EIEDashboard'],
  );
  return { EIEDashboard: ctx.EIEDashboard, fakeDocument };
}

const BASE_LATEST = {
  ihsg: { value: 7284.32, prevValue: 7200, changePct: 1.17, trend: 'up' },
  usdidr: { value: 16250, prevValue: 16300, changePct: -0.31, trend: 'down' },
};

test('_renderWatchlistCard() — render nilai IHSG besar + label IDX + persen perubahan', () => {
  const { EIEDashboard, fakeDocument } = loadDashboard({ latest: BASE_LATEST });
  EIEDashboard._renderWatchlistCard();
  const html = fakeDocument.getElementById('eieWatchlistCard').innerHTML;
  assert.match(html, /Daftar pantauan Anda/);
  assert.match(html, /7\.284,32/);
  assert.match(html, /IHSG · IDX/);
  assert.match(html, /\+1\.17%/);
});

test('_renderWatchlistCard() — kartu kecil USD\\/IDR ikut tampil di grid bawah', () => {
  const { EIEDashboard, fakeDocument } = loadDashboard({ latest: BASE_LATEST });
  EIEDashboard._renderWatchlistCard();
  const html = fakeDocument.getElementById('eieWatchlistCard').innerHTML;
  assert.match(html, /16\.250/);
  assert.match(html, /USD\/IDR/);
  assert.match(html, /-0\.31%/);
});

test('_renderWatchlistCard() — trend "up" pakai warna/panah hijau, "down" pakai panah turun', () => {
  const { EIEDashboard, fakeDocument } = loadDashboard({ latest: BASE_LATEST });
  EIEDashboard._renderWatchlistCard();
  const html = fakeDocument.getElementById('eieWatchlistCard').innerHTML;
  assert.match(html, /var\(--accent3\)/, 'IHSG naik harus pakai warna accent3 (hijau)');
  assert.match(html, />↑</, 'panah lingkaran atas harus naik utk IHSG trend up');
});

test('_renderWatchlistCard() — histori >=2 titik menghasilkan sparkline SVG', () => {
  const { EIEDashboard, fakeDocument } = loadDashboard({
    latest: BASE_LATEST,
    history: [{ value: 7100 }, { value: 7200 }, { value: 7284.32 }],
  });
  EIEDashboard._renderWatchlistCard();
  const html = fakeDocument.getElementById('eieWatchlistCard').innerHTML;
  assert.match(html, /<svg/);
  assert.match(html, /<polyline/);
});

test('_renderWatchlistCard() — histori kosong/<2 titik: tidak render sparkline, tidak error', () => {
  const { EIEDashboard, fakeDocument } = loadDashboard({ latest: BASE_LATEST, history: [] });
  assert.doesNotThrow(() => EIEDashboard._renderWatchlistCard());
  const html = fakeDocument.getElementById('eieWatchlistCard').innerHTML;
  assert.doesNotMatch(html, /<svg/);
});

test('_renderWatchlistCard() — data ihsg/usdidr belum ada (undefined): tidak error, tidak menimpa innerHTML', () => {
  const { EIEDashboard, fakeDocument } = loadDashboard({ latest: {} });
  assert.doesNotThrow(() => EIEDashboard._renderWatchlistCard());
  assert.equal(fakeDocument.getElementById('eieWatchlistCard').innerHTML, '');
});

test('_renderWatchlistCard() — panah tren adalah <button> dgn data-action (bisa ditap, bukan cuma dekorasi)', () => {
  const { EIEDashboard, fakeDocument } = loadDashboard({ latest: BASE_LATEST });
  EIEDashboard._renderWatchlistCard();
  const html = fakeDocument.getElementById('eieWatchlistCard').innerHTML;
  assert.match(html, /<button data-action="eieToggleWatchlistDetail"[^>]*>↑<\/button>/);
});

test('_renderWatchlistCard() — default tertutup: tombol "Lihat Chart & Analisa AI" tampil, panel analisa BELUM tampil', () => {
  const { EIEDashboard, fakeDocument } = loadDashboard({ latest: BASE_LATEST });
  EIEDashboard._renderWatchlistCard();
  const html = fakeDocument.getElementById('eieWatchlistCard').innerHTML;
  assert.match(html, /Lihat Chart & Analisa AI/);
  assert.doesNotMatch(html, /Analisa & Rekomendasi AI/);
});

test('_renderWatchlistCard() — _watchlistExpanded=true: panel "Analisa & Rekomendasi AI" tampil dgn catatan IHSG & USD', () => {
  const { EIEDashboard, fakeDocument } = loadDashboard({ latest: BASE_LATEST });
  EIEDashboard._watchlistExpanded = true;
  EIEDashboard._renderWatchlistCard();
  const html = fakeDocument.getElementById('eieWatchlistCard').innerHTML;
  assert.match(html, /Analisa & Rekomendasi AI/);
  assert.match(html, /IHSG naik/);
  assert.match(html, /Rupiah menguat/);
  assert.match(html, /Sembunyikan Chart & Analisa/);
});

test('eieToggleWatchlistDetail() — toggle _watchlistExpanded lalu render ulang kartu watchlist', () => {
  const fakeDocument = createFakeDocument({ eieWatchlistCard: {} });
  const ctx = loadSource(
    ['economic-intelligence/ui/eie-dashboard.js'],
    {
      document: fakeDocument,
      MacroDataAdapter: { getLatest: () => BASE_LATEST, getHistory: () => [] },
      STATUS_META: {},
    },
    ['EIEDashboard', 'eieToggleWatchlistDetail'],
  );
  assert.equal(ctx.EIEDashboard._watchlistExpanded, false);
  ctx.eieToggleWatchlistDetail();
  assert.equal(ctx.EIEDashboard._watchlistExpanded, true);
  assert.match(fakeDocument.getElementById('eieWatchlistCard').innerHTML, /Analisa & Rekomendasi AI/);
  ctx.eieToggleWatchlistDetail();
  assert.equal(ctx.EIEDashboard._watchlistExpanded, false);
  assert.doesNotMatch(fakeDocument.getElementById('eieWatchlistCard').innerHTML, /Analisa & Rekomendasi AI/);
});


test('_renderWatchlistCard() — elemen #eieWatchlistCard tidak ada di DOM: tidak throw', () => {
  const { EIEDashboard } = loadDashboard({ latest: BASE_LATEST, hasContainer: false });
  assert.doesNotThrow(() => EIEDashboard._renderWatchlistCard());
});
