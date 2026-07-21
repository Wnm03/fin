'use strict';
// tests/life-priority-panel.test.js — LifePriorityPanel (modules/cross/
// life-priority-panel.js). Sesi 89 (Batch 8) — Personal Life Dashboard
// Foundation: Priority Panel. Direfaktor Sesi 90 (Batch 8, Personal
// Decision Center Foundation): filter+urutan dipindah ke PriorityEngine
// (modules/cross/priority-engine.js, dites terpisah di
// tests/priority-engine.test.js) — file ini sekarang HANYA menguji
// presentasi (LifePriorityPanel jadi konsumen murni PriorityEngine.
// getItems()). Pola sama persis tests/vehicle-alert-panel.test.js —
// dependency di-mock lewat loadSource extraGlobals, UI (document) lewat
// fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ lifePriorityBody: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/cross/life-priority-panel.js'], {
    escapeHtml: (s) => String(s ?? ''),
    ...rest,
    document: fakeDocument,
  }, ['LifePriorityPanel']);
  return { LifePriorityPanel: ctx.LifePriorityPanel, fakeDocument };
}

test('life-priority-panel.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #lifePriorityBody tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { LifePriorityPanel } = makeCtx({ document: emptyDoc, PriorityEngine: { getItems: () => ({ ok: true, items: [], count: 0 }) } });
  assert.doesNotThrow(() => LifePriorityPanel.render());
});

test('render() — PriorityEngine belum dimuat: body dikosongkan, tidak throw', () => {
  const { LifePriorityPanel, fakeDocument } = makeCtx({ PriorityEngine: undefined });
  assert.doesNotThrow(() => LifePriorityPanel.render());
  assert.equal(fakeDocument.getElementById('lifePriorityBody').innerHTML, '');
});

test('render() — getItems() ok:false: body dikosongkan (silent), tidak throw', () => {
  const PriorityEngine = { getItems: () => ({ ok: false, items: [], count: 0 }) };
  const { LifePriorityPanel, fakeDocument } = makeCtx({ PriorityEngine });
  assert.doesNotThrow(() => LifePriorityPanel.render());
  assert.equal(fakeDocument.getElementById('lifePriorityBody').innerHTML, '');
});

test('render() — items kosong: body dikosongkan (silent)', () => {
  const PriorityEngine = { getItems: () => ({ ok: true, items: [], count: 0 }) };
  const { LifePriorityPanel, fakeDocument } = makeCtx({ PriorityEngine });
  LifePriorityPanel.render();
  assert.equal(fakeDocument.getElementById('lifePriorityBody').innerHTML, '');
});

test('render() — item finance: tampilkan nama anggaran apa adanya', () => {
  const PriorityEngine = { getItems: () => ({ ok: true, items: [{ kind: 'finance', severity: 'over', name: 'Makan' }], count: 1 }) };
  const { LifePriorityPanel, fakeDocument } = makeCtx({ PriorityEngine });
  LifePriorityPanel.render();
  const html = fakeDocument.getElementById('lifePriorityBody').innerHTML;
  assert.match(html, /Makan/);
  assert.match(html, /Prioritas Hidup Pribadi/);
});

test('render() — item vehicle overdue & due-soon: urut apa adanya dari PriorityEngine, ikon per type', () => {
  const items = [
    { kind: 'vehicle', severity: 'overdue', vehicleType: 'service', message: 'Servis lewat jatuh tempo' },
    { kind: 'vehicle', severity: 'due-soon', vehicleType: 'fuel', message: 'BBM segera perlu isi' },
  ];
  const PriorityEngine = { getItems: () => ({ ok: true, items, count: 2 }) };
  const { LifePriorityPanel, fakeDocument } = makeCtx({ PriorityEngine });
  LifePriorityPanel.render();
  const html = fakeDocument.getElementById('lifePriorityBody').innerHTML;
  assert.match(html, /Servis lewat jatuh tempo/);
  assert.match(html, /BBM segera perlu isi/);
  assert.ok(html.indexOf('Servis lewat jatuh tempo') < html.indexOf('BBM segera perlu isi'));
  assert.match(html, /🔧/);
  assert.match(html, /⛽/);
});

test('render() — item vehicle severity tidak dikenal: fallback ikon ⛔', () => {
  const items = [{ kind: 'vehicle', severity: 'unknown', vehicleType: 'weird', message: 'x' }];
  const PriorityEngine = { getItems: () => ({ ok: true, items, count: 1 }) };
  const { LifePriorityPanel, fakeDocument } = makeCtx({ PriorityEngine });
  assert.doesNotThrow(() => LifePriorityPanel.render());
  const html = fakeDocument.getElementById('lifePriorityBody').innerHTML;
  assert.match(html, /⛔/);
});
