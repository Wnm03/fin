'use strict';
// tests/asset-maintenance-presenter.test.js — AssetMaintenancePresenter
// (modules/asset/asset-maintenance-presenter.js). Sesi 132 (Batch 10
// lanjutan) — audit menemukan AssetMaintenanceAPI (S104) belum pernah
// dipanggil dari UI manapun. UI hanya presenter, 100% reuse
// AssetMaintenanceAPI.summary(). Pola sama persis
// tests/debt-optimizer-presenter.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ assetMaintenanceGrid: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/asset/asset-maintenance-presenter.js'], {
    escapeHtml: (s) => String(s ?? ''),
    fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    ...rest,
    document: fakeDocument,
  }, ['AssetMaintenancePresenter']);
  return { AssetMaintenancePresenter: ctx.AssetMaintenancePresenter, fakeDocument };
}

function fullSummary(overrides = {}) {
  return Object.assign({
    ok: true,
    stats: { ok: true, totalAssets: 3, trackedCount: 2, untrackedCount: 1, needsAttentionCount: 1 },
    needsAttention: { ok: true, count: 1, items: [{ id: 'a1', name: 'Motor Lama' }] },
  }, overrides);
}

test('asset-maintenance-presenter.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #assetMaintenanceGrid tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { AssetMaintenancePresenter } = makeCtx({ document: emptyDoc, AssetMaintenanceAPI: { summary: () => fullSummary() } });
  assert.doesNotThrow(() => AssetMaintenancePresenter.render());
});

test('render() — AssetMaintenanceAPI belum dimuat: pesan kosong, tidak throw', () => {
  const { AssetMaintenancePresenter, fakeDocument } = makeCtx({ AssetMaintenanceAPI: undefined });
  assert.doesNotThrow(() => AssetMaintenancePresenter.render());
  assert.match(fakeDocument.getElementById('assetMaintenanceGrid').innerHTML, /belum tersedia/);
});

test('render() — summary() ok:false: pesan kosong ditampilkan', () => {
  const AssetMaintenanceAPI = { summary: () => ({ ok: false, reason: 'x' }) };
  const { AssetMaintenancePresenter, fakeDocument } = makeCtx({ AssetMaintenanceAPI });
  AssetMaintenancePresenter.render();
  assert.match(fakeDocument.getElementById('assetMaintenanceGrid').innerHTML, /belum tersedia/);
});

test('render() — ok: 2 kartu (Ringkasan/Perlu Ditinjau) ditampilkan dari summary() apa adanya', () => {
  const summary = fullSummary();
  const AssetMaintenanceAPI = { summary: () => summary };
  const { AssetMaintenancePresenter, fakeDocument } = makeCtx({ AssetMaintenanceAPI });
  AssetMaintenancePresenter.render();
  const html = fakeDocument.getElementById('assetMaintenanceGrid').innerHTML;
  assert.match(html, /Ringkasan Perawatan Aset/);
  assert.match(html, /Perlu Ditinjau/);
});

// ================= _overviewCard =================

test('_overviewCard(s) — s ok:false: value "—"', () => {
  const { AssetMaintenancePresenter } = makeCtx();
  const c = AssetMaintenancePresenter._overviewCard({ ok: false, reason: 'x' });
  assert.equal(c.value, '—');
});

test('_overviewCard(s) — totalAssets 0: "Belum ada aset tercatat"', () => {
  const { AssetMaintenancePresenter } = makeCtx();
  const c = AssetMaintenancePresenter._overviewCard({ ok: true, totalAssets: 0, trackedCount: 0, untrackedCount: 0, needsAttentionCount: 0 });
  assert.match(c.value, /Belum ada aset tercatat/);
});

test('_overviewCard(s) — totalAssets>0: value sebut trackedCount dari totalAssets', () => {
  const { AssetMaintenancePresenter } = makeCtx();
  const c = AssetMaintenancePresenter._overviewCard({ ok: true, totalAssets: 3, trackedCount: 2, untrackedCount: 1, needsAttentionCount: 1 });
  assert.match(c.value, /2 dari 3 dilacak/);
});

// ================= _attentionCard =================

test('_attentionCard(a) — a ok:false: value "—"', () => {
  const { AssetMaintenancePresenter } = makeCtx();
  const c = AssetMaintenancePresenter._attentionCard({ ok: false, reason: 'y' });
  assert.equal(c.value, '—');
});

test('_attentionCard(a) — count 0: "Tidak ada", cls green', () => {
  const { AssetMaintenancePresenter } = makeCtx();
  const c = AssetMaintenancePresenter._attentionCard({ ok: true, count: 0, items: [] });
  assert.match(c.value, /Tidak ada/);
  assert.equal(c.cls, 'green');
});

test('_attentionCard(a) — count>0: cls red, sub sebut nama aset', () => {
  const { AssetMaintenancePresenter } = makeCtx();
  const c = AssetMaintenancePresenter._attentionCard({ ok: true, count: 1, items: [{ id: 'a1', name: 'Motor Lama' }] });
  assert.equal(c.cls, 'red');
  assert.match(c.sub, /Motor Lama/);
});
