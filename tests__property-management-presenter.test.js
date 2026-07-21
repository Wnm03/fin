'use strict';
// tests/property-management-presenter.test.js — PropertyManagementPresenter
// (modules/asset/property-management-presenter.js). Sesi 132 (Batch 10
// lanjutan) — audit menemukan PropertyManagementAPI (S102) belum pernah
// dipanggil dari UI manapun. UI hanya presenter, 100% reuse
// PropertyManagementAPI.summary(). Pola sama persis
// tests/debt-optimizer-presenter.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ propertyManagementGrid: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/asset/property-management-presenter.js'], {
    escapeHtml: (s) => String(s ?? ''),
    fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    ...rest,
    document: fakeDocument,
  }, ['PropertyManagementPresenter']);
  return { PropertyManagementPresenter: ctx.PropertyManagementPresenter, fakeDocument };
}

function fullSummary(overrides = {}) {
  return Object.assign({
    ok: true,
    portfolio: { ok: true, count: 2, totalValue: 800000000, breakdown: [{ jenis: 'Rumah/Bangunan', count: 1, nilai: 600000000, pct: 75 }, { jenis: 'Tanah', count: 1, nilai: 200000000, pct: 25 }] },
    tax: { ok: true, count: 2, totalPBB: 1200000, items: [] },
    depreciation: { ok: true, jumlahAktif: 1, totalAkumulasi: 5000000, totalNilaiBuku: 595000000, belumLengkap: 0 },
  }, overrides);
}

test('property-management-presenter.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #propertyManagementGrid tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { PropertyManagementPresenter } = makeCtx({ document: emptyDoc, PropertyManagementAPI: { summary: () => fullSummary() } });
  assert.doesNotThrow(() => PropertyManagementPresenter.render());
});

test('render() — PropertyManagementAPI belum dimuat: pesan kosong, tidak throw', () => {
  const { PropertyManagementPresenter, fakeDocument } = makeCtx({ PropertyManagementAPI: undefined });
  assert.doesNotThrow(() => PropertyManagementPresenter.render());
  assert.match(fakeDocument.getElementById('propertyManagementGrid').innerHTML, /belum tersedia/);
});

test('render() — summary() ok:false: pesan kosong ditampilkan', () => {
  const PropertyManagementAPI = { summary: () => ({ ok: false, reason: 'x' }) };
  const { PropertyManagementPresenter, fakeDocument } = makeCtx({ PropertyManagementAPI });
  PropertyManagementPresenter.render();
  assert.match(fakeDocument.getElementById('propertyManagementGrid').innerHTML, /belum tersedia/);
});

test('render() — ok: 3 kartu (Portofolio/PBB/Penyusutan) ditampilkan dari summary() apa adanya', () => {
  const summary = fullSummary();
  const PropertyManagementAPI = { summary: () => summary };
  const { PropertyManagementPresenter, fakeDocument } = makeCtx({ PropertyManagementAPI });
  PropertyManagementPresenter.render();
  const html = fakeDocument.getElementById('propertyManagementGrid').innerHTML;
  assert.match(html, /Portofolio Properti/);
  assert.match(html, /Estimasi PBB/);
  assert.match(html, /Penyusutan Properti/);
});

// ================= _portfolioCard =================

test('_portfolioCard(p) — p ok:false: value "—", sub = reason', () => {
  const { PropertyManagementPresenter } = makeCtx();
  const c = PropertyManagementPresenter._portfolioCard({ ok: false, reason: 'x' });
  assert.equal(c.value, '—');
  assert.equal(c.sub, 'x');
});

test('_portfolioCard(p) — count 0: pesan "Belum ada properti tercatat"', () => {
  const { PropertyManagementPresenter } = makeCtx();
  const c = PropertyManagementPresenter._portfolioCard({ ok: true, count: 0, totalValue: 0, breakdown: [] });
  assert.match(c.value, /Belum ada properti tercatat/);
});

test('_portfolioCard(p) — count>0: value = totalValue, sub sebut jenis terbesar', () => {
  const { PropertyManagementPresenter } = makeCtx();
  const c = PropertyManagementPresenter._portfolioCard({ ok: true, count: 2, totalValue: 800000000, breakdown: [{ jenis: 'Rumah/Bangunan', count: 1, nilai: 600000000, pct: 75 }] });
  assert.match(c.sub, /2 properti/);
  assert.match(c.sub, /Rumah\/Bangunan/);
});

// ================= _taxCard =================

test('_taxCard(t) — t ok:false: value "—"', () => {
  const { PropertyManagementPresenter } = makeCtx();
  const c = PropertyManagementPresenter._taxCard({ ok: false, reason: 'y' });
  assert.equal(c.value, '—');
});

test('_taxCard(t) — count 0: "Belum ada properti"', () => {
  const { PropertyManagementPresenter } = makeCtx();
  const c = PropertyManagementPresenter._taxCard({ ok: true, count: 0, totalPBB: 0 });
  assert.match(c.value, /Belum ada properti/);
});

test('_taxCard(t) — totalPBB>0: cls red', () => {
  const { PropertyManagementPresenter } = makeCtx();
  const c = PropertyManagementPresenter._taxCard({ ok: true, count: 2, totalPBB: 1200000 });
  assert.equal(c.cls, 'red');
});

// ================= _depreciationCard =================

test('_depreciationCard(d) — d ok:false: value "—"', () => {
  const { PropertyManagementPresenter } = makeCtx();
  const c = PropertyManagementPresenter._depreciationCard({ ok: false, reason: 'z' });
  assert.equal(c.value, '—');
});

test('_depreciationCard(d) — jumlahAktif 0: "Belum ada yang dilacak"', () => {
  const { PropertyManagementPresenter } = makeCtx();
  const c = PropertyManagementPresenter._depreciationCard({ ok: true, jumlahAktif: 0, totalAkumulasi: 0, totalNilaiBuku: 0, belumLengkap: 0 });
  assert.match(c.value, /Belum ada yang dilacak/);
});

test('_depreciationCard(d) — jumlahAktif>0: value = totalNilaiBuku, sub sebut akumulasi', () => {
  const { PropertyManagementPresenter } = makeCtx();
  const c = PropertyManagementPresenter._depreciationCard({ ok: true, jumlahAktif: 1, totalAkumulasi: 5000000, totalNilaiBuku: 595000000, belumLengkap: 0 });
  assert.match(c.sub, /1 properti dilacak/);
});
