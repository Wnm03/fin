'use strict';
// tests/asset-portfolio-presenter.test.js — AssetPortfolioPresenter
// (modules/asset/asset-portfolio-presenter.js). Sesi 132 (Batch 10
// lanjutan) — audit menemukan AssetPortfolioAPI (S101) belum pernah
// dipanggil dari UI manapun. UI hanya presenter, 100% reuse
// AssetPortfolioAPI.summary(). Pola sama persis
// tests/debt-optimizer-presenter.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ assetPortfolioGrid: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/asset/asset-portfolio-presenter.js'], {
    escapeHtml: (s) => String(s ?? ''),
    fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    ...rest,
    document: fakeDocument,
  }, ['AssetPortfolioPresenter']);
  return { AssetPortfolioPresenter: ctx.AssetPortfolioPresenter, fakeDocument };
}

function fullSummary(overrides = {}) {
  return Object.assign({
    ok: true,
    composition: { ok: true, cashValue: 20000000, assetValue: 800000000, investmentValue: 50000000, totalValue: 870000000, assetCount: 2, investmentHoldingsCount: 3 },
    allocation: { ok: true, totalValue: 870000000, breakdown: [
      { category: 'Aset Fisik', value: 800000000, pct: 91.95 },
      { category: 'Investasi', value: 50000000, pct: 5.75 },
      { category: 'Kas / Akun', value: 20000000, pct: 2.30 },
    ] },
    investmentAllocation: { ok: true, breakdown: [] },
    netWorth: { ok: true, netWorth: 900000000, portfolioValue: 870000000 },
  }, overrides);
}

test('asset-portfolio-presenter.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #assetPortfolioGrid tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { AssetPortfolioPresenter } = makeCtx({ document: emptyDoc, AssetPortfolioAPI: { summary: () => fullSummary() } });
  assert.doesNotThrow(() => AssetPortfolioPresenter.render());
});

test('render() — AssetPortfolioAPI belum dimuat: pesan kosong, tidak throw', () => {
  const { AssetPortfolioPresenter, fakeDocument } = makeCtx({ AssetPortfolioAPI: undefined });
  assert.doesNotThrow(() => AssetPortfolioPresenter.render());
  assert.match(fakeDocument.getElementById('assetPortfolioGrid').innerHTML, /belum tersedia/);
});

test('render() — summary() ok:false: pesan kosong ditampilkan', () => {
  const AssetPortfolioAPI = { summary: () => ({ ok: false, reason: 'x' }) };
  const { AssetPortfolioPresenter, fakeDocument } = makeCtx({ AssetPortfolioAPI });
  AssetPortfolioPresenter.render();
  assert.match(fakeDocument.getElementById('assetPortfolioGrid').innerHTML, /belum tersedia/);
});

test('render() — ok: 3 kartu (Total/Alokasi/Kekayaan Bersih) ditampilkan dari summary() apa adanya', () => {
  const summary = fullSummary();
  const AssetPortfolioAPI = { summary: () => summary };
  const { AssetPortfolioPresenter, fakeDocument } = makeCtx({ AssetPortfolioAPI });
  AssetPortfolioPresenter.render();
  const html = fakeDocument.getElementById('assetPortfolioGrid').innerHTML;
  assert.match(html, /Total Portofolio/);
  assert.match(html, /Alokasi Portofolio/);
  assert.match(html, /Kekayaan Bersih/);
});

// ================= _compositionCard =================

test('_compositionCard(c) — c ok:false: value "—"', () => {
  const { AssetPortfolioPresenter } = makeCtx();
  const c = AssetPortfolioPresenter._compositionCard({ ok: false, reason: 'x' });
  assert.equal(c.value, '—');
});

test('_compositionCard(c) — totalValue 0: "Belum ada data"', () => {
  const { AssetPortfolioPresenter } = makeCtx();
  const c = AssetPortfolioPresenter._compositionCard({ ok: true, totalValue: 0, cashValue: 0, assetValue: 0, investmentValue: 0 });
  assert.match(c.value, /Belum ada data/);
});

test('_compositionCard(c) — totalValue>0: sub sebut breakdown kas/aset/investasi', () => {
  const { AssetPortfolioPresenter } = makeCtx();
  const c = AssetPortfolioPresenter._compositionCard({ ok: true, totalValue: 870000000, cashValue: 20000000, assetValue: 800000000, investmentValue: 50000000 });
  assert.match(c.sub, /Kas/);
  assert.match(c.sub, /Aset/);
  assert.match(c.sub, /Investasi/);
});

// ================= _allocationCard =================

test('_allocationCard(a) — breakdown kosong: "Belum cukup data"', () => {
  const { AssetPortfolioPresenter } = makeCtx();
  const c = AssetPortfolioPresenter._allocationCard({ ok: true, breakdown: [] });
  assert.match(c.value, /Belum cukup data/);
});

test('_allocationCard(a) — value = kategori terbesar, sub sisanya', () => {
  const { AssetPortfolioPresenter } = makeCtx();
  const c = AssetPortfolioPresenter._allocationCard({ ok: true, breakdown: [
    { category: 'Aset Fisik', value: 800000000, pct: 91.95 },
    { category: 'Investasi', value: 50000000, pct: 5.75 },
  ] });
  assert.match(c.value, /Aset Fisik/);
  assert.match(c.sub, /Investasi/);
});

// ================= _netWorthCard =================

test('_netWorthCard(n) — n ok:false: value "—"', () => {
  const { AssetPortfolioPresenter } = makeCtx();
  const c = AssetPortfolioPresenter._netWorthCard({ ok: false, reason: 'z' });
  assert.equal(c.value, '—');
});

test('_netWorthCard(n) — netWorth negatif: cls red', () => {
  const { AssetPortfolioPresenter } = makeCtx();
  const c = AssetPortfolioPresenter._netWorthCard({ ok: true, netWorth: -1000000, portfolioValue: 870000000 });
  assert.equal(c.cls, 'red');
});

test('_netWorthCard(n) — netWorth positif: cls green, sub sebut portfolioValue', () => {
  const { AssetPortfolioPresenter } = makeCtx();
  const c = AssetPortfolioPresenter._netWorthCard({ ok: true, netWorth: 900000000, portfolioValue: 870000000 });
  assert.equal(c.cls, 'green');
  assert.match(c.sub, /Portofolio/);
});
