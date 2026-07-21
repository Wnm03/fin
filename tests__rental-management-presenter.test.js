'use strict';
// tests/rental-management-presenter.test.js — RentalManagementPresenter
// (modules/asset/rental-management-presenter.js). Sesi 132 (Batch 10
// lanjutan) — audit menemukan RentalManagementAPI (S103) belum pernah
// dipanggil dari UI manapun. UI hanya presenter, 100% reuse
// RentalManagementAPI.summary(). Pola sama persis
// tests/debt-optimizer-presenter.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ rentalManagementGrid: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/asset/rental-management-presenter.js'], {
    escapeHtml: (s) => String(s ?? ''),
    fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    ...rest,
    document: fakeDocument,
  }, ['RentalManagementPresenter']);
  return { RentalManagementPresenter: ctx.RentalManagementPresenter, fakeDocument };
}

function fullSummary(overrides = {}) {
  return Object.assign({
    ok: true,
    income: { ok: true, unitCount: 1, totalIncome: 5000000, totalExpense: 500000, netIncome: 4500000 },
    units: { ok: true, count: 1, units: [{ assetId: 'a1', name: 'Rumah Kontrakan', netIncome: 4500000 }] },
    unmanaged: { ok: true, count: 0, properties: [] },
    portfolio: { ok: true, count: 2, totalValue: 800000000 },
  }, overrides);
}

test('rental-management-presenter.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #rentalManagementGrid tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { RentalManagementPresenter } = makeCtx({ document: emptyDoc, RentalManagementAPI: { summary: () => fullSummary() } });
  assert.doesNotThrow(() => RentalManagementPresenter.render());
});

test('render() — RentalManagementAPI belum dimuat: pesan kosong, tidak throw', () => {
  const { RentalManagementPresenter, fakeDocument } = makeCtx({ RentalManagementAPI: undefined });
  assert.doesNotThrow(() => RentalManagementPresenter.render());
  assert.match(fakeDocument.getElementById('rentalManagementGrid').innerHTML, /belum tersedia/);
});

test('render() — summary() ok:false: pesan kosong ditampilkan', () => {
  const RentalManagementAPI = { summary: () => ({ ok: false, reason: 'x' }) };
  const { RentalManagementPresenter, fakeDocument } = makeCtx({ RentalManagementAPI });
  RentalManagementPresenter.render();
  assert.match(fakeDocument.getElementById('rentalManagementGrid').innerHTML, /belum tersedia/);
});

test('render() — ok: 3 kartu (Pendapatan/Unit/Belum Ditautkan) ditampilkan dari summary() apa adanya', () => {
  const summary = fullSummary();
  const RentalManagementAPI = { summary: () => summary };
  const { RentalManagementPresenter, fakeDocument } = makeCtx({ RentalManagementAPI });
  RentalManagementPresenter.render();
  const html = fakeDocument.getElementById('rentalManagementGrid').innerHTML;
  assert.match(html, /Pendapatan Sewa Bersih/);
  assert.match(html, /Unit Sewa/);
  assert.match(html, /Properti Belum Ditautkan/);
});

// ================= _incomeCard =================

test('_incomeCard(i) — i ok:false: value "—", sub = reason', () => {
  const { RentalManagementPresenter } = makeCtx();
  const c = RentalManagementPresenter._incomeCard({ ok: false, reason: 'x' });
  assert.equal(c.value, '—');
  assert.equal(c.sub, 'x');
});

test('_incomeCard(i) — unitCount 0: "Belum ada unit sewa"', () => {
  const { RentalManagementPresenter } = makeCtx();
  const c = RentalManagementPresenter._incomeCard({ ok: true, unitCount: 0, totalIncome: 0, totalExpense: 0, netIncome: 0 });
  assert.match(c.value, /Belum ada unit sewa/);
});

test('_incomeCard(i) — netIncome negatif: cls red', () => {
  const { RentalManagementPresenter } = makeCtx();
  const c = RentalManagementPresenter._incomeCard({ ok: true, unitCount: 1, totalIncome: 100000, totalExpense: 500000, netIncome: -400000 });
  assert.equal(c.cls, 'red');
});

test('_incomeCard(i) — netIncome positif: cls green', () => {
  const { RentalManagementPresenter } = makeCtx();
  const c = RentalManagementPresenter._incomeCard({ ok: true, unitCount: 1, totalIncome: 5000000, totalExpense: 500000, netIncome: 4500000 });
  assert.equal(c.cls, 'green');
});

// ================= _unitsCard =================

test('_unitsCard(u) — count 0: "Belum ada unit"', () => {
  const { RentalManagementPresenter } = makeCtx();
  const c = RentalManagementPresenter._unitsCard({ ok: true, count: 0, units: [] });
  assert.match(c.value, /Belum ada unit/);
});

test('_unitsCard(u) — highlight unit dgn netIncome tertinggi', () => {
  const { RentalManagementPresenter } = makeCtx();
  const c = RentalManagementPresenter._unitsCard({ ok: true, count: 2, units: [
    { name: 'Kios A', netIncome: 1000000 },
    { name: 'Kios B', netIncome: 3000000 },
  ] });
  assert.match(c.sub, /Kios B/);
});

// ================= _unmanagedCard =================

test('_unmanagedCard(m) — count 0: "Semua sudah ditautkan", cls green', () => {
  const { RentalManagementPresenter } = makeCtx();
  const c = RentalManagementPresenter._unmanagedCard({ ok: true, count: 0, properties: [] });
  assert.match(c.value, /Semua sudah ditautkan/);
  assert.equal(c.cls, 'green');
});

test('_unmanagedCard(m) — count>0: sebut nama properti', () => {
  const { RentalManagementPresenter } = makeCtx();
  const c = RentalManagementPresenter._unmanagedCard({ ok: true, count: 1, properties: [{ name: 'Ruko Kosong' }] });
  assert.match(c.sub, /Ruko Kosong/);
});
