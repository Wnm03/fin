'use strict';
// tests/action-queue.test.js — ActionQueue (modules/cross/action-queue.js).
// Sesi 90 (Batch 8) — Personal Decision Center Foundation. UI hanya
// presenter, 100% reuse DecisionCenterAPI.summary() -> s.priorityItems.
// Pola sama persis tests/life-priority-panel.test.js — dependency
// di-mock lewat loadSource extraGlobals, UI (document) lewat fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ actionQueueBody: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/cross/action-queue.js'], {
    escapeHtml: (s) => String(s ?? ''),
    ...rest,
    document: fakeDocument,
  }, ['ActionQueue']);
  return { ActionQueue: ctx.ActionQueue, fakeDocument };
}

test('action-queue.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #actionQueueBody tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { ActionQueue } = makeCtx({ document: emptyDoc, DecisionCenterAPI: { summary: () => ({ ok: true, priorityItems: [] }) } });
  assert.doesNotThrow(() => ActionQueue.render());
});

test('render() — DecisionCenterAPI belum dimuat: body dikosongkan, tidak throw', () => {
  const { ActionQueue, fakeDocument } = makeCtx({ DecisionCenterAPI: undefined });
  assert.doesNotThrow(() => ActionQueue.render());
  assert.equal(fakeDocument.getElementById('actionQueueBody').innerHTML, '');
});

test('render() — summary() ok:false: body dikosongkan (silent)', () => {
  const DecisionCenterAPI = { summary: () => ({ ok: false }) };
  const { ActionQueue, fakeDocument } = makeCtx({ DecisionCenterAPI });
  assert.doesNotThrow(() => ActionQueue.render());
  assert.equal(fakeDocument.getElementById('actionQueueBody').innerHTML, '');
});

test('render() — priorityItems kosong: body dikosongkan (silent)', () => {
  const DecisionCenterAPI = { summary: () => ({ ok: true, priorityItems: [], priorityCount: 0 }) };
  const { ActionQueue, fakeDocument } = makeCtx({ DecisionCenterAPI });
  ActionQueue.render();
  assert.equal(fakeDocument.getElementById('actionQueueBody').innerHTML, '');
});

test('render() — priorityItems ada: bernomor urut, judul memuat jumlah item', () => {
  const items = [
    { kind: 'vehicle', severity: 'overdue', vehicleType: 'service', message: 'Servis lewat jatuh tempo' },
    { kind: 'finance', severity: 'over', name: 'Makan' },
  ];
  const DecisionCenterAPI = { summary: () => ({ ok: true, priorityItems: items, priorityCount: 2 }) };
  const { ActionQueue, fakeDocument } = makeCtx({ DecisionCenterAPI });
  ActionQueue.render();
  const html = fakeDocument.getElementById('actionQueueBody').innerHTML;
  assert.match(html, /1\. 🔧 Servis lewat jatuh tempo/);
  assert.match(html, /2\. 💰 Anggaran "Makan" sudah melebihi limit\./);
  assert.match(html, /Antrean Tindakan \(2\)/);
});

// --- S115: ActionQueue Public API Integration — getQueue() sbg pintu
// data publik (dipakai render(), UnifiedAIBriefing & AI Chat).

test('getQueue() — DecisionCenterAPI belum dimuat: {ok:false, priorityItems:[]}', () => {
  const { ActionQueue } = makeCtx({ DecisionCenterAPI: undefined });
  const r = ActionQueue.getQueue();
  assert.equal(r.ok, false);
  assert.equal(r.priorityItems.length, 0);
});

test('getQueue() — summary() ok:false: {ok:false, priorityItems:[]}', () => {
  const DecisionCenterAPI = { summary: () => ({ ok: false }) };
  const { ActionQueue } = makeCtx({ DecisionCenterAPI });
  const r = ActionQueue.getQueue();
  assert.equal(r.ok, false);
  assert.equal(r.priorityItems.length, 0);
});

test('getQueue() — priorityItems bukan array: {ok:false, priorityItems:[]}', () => {
  const DecisionCenterAPI = { summary: () => ({ ok: true, priorityItems: null }) };
  const { ActionQueue } = makeCtx({ DecisionCenterAPI });
  const r = ActionQueue.getQueue();
  assert.equal(r.ok, false);
  assert.equal(r.priorityItems.length, 0);
});

test('getQueue() — summary() ok:true: meneruskan priorityItems apa adanya (0 transformasi)', () => {
  const items = [
    { kind: 'vehicle', vehicleType: 'tax', message: 'Pajak lewat jatuh tempo' },
    { kind: 'finance', name: 'Transport' },
  ];
  const DecisionCenterAPI = { summary: () => ({ ok: true, priorityItems: items }) };
  const { ActionQueue } = makeCtx({ DecisionCenterAPI });
  const r = ActionQueue.getQueue();
  assert.equal(r.ok, true);
  assert.equal(r.priorityItems.length, 2);
  assert.equal(r.priorityItems[0].message, 'Pajak lewat jatuh tempo');
  assert.equal(r.priorityItems[1].name, 'Transport');
});

test('render() — tetap reuse getQueue() (refactor internal, perilaku render() 0 berubah)', () => {
  const items = [{ kind: 'finance', name: 'Hiburan' }];
  const DecisionCenterAPI = { summary: () => ({ ok: true, priorityItems: items }) };
  const { ActionQueue, fakeDocument } = makeCtx({ DecisionCenterAPI });
  ActionQueue.render();
  const html = fakeDocument.getElementById('actionQueueBody').innerHTML;
  assert.match(html, /1\. 💰 Anggaran "Hiburan" sudah melebihi limit\./);
  assert.match(html, /Antrean Tindakan \(1\)/);
});
