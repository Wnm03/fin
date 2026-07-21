'use strict';
// tests/priority-engine.test.js — PriorityEngine (modules/cross/
// priority-engine.js). Sesi 90 (Batch 8) — Personal Decision Center
// Foundation: filter+urutan (dipindah dari LifePriorityPanel Sesi 89)
// murni budget.items over + reminder.all severity overdue/due-soon.
// Pola sama persis tests/life-priority-panel.test.js (bagian filter yang
// sebelumnya dites lewat render(), sekarang dites langsung lewat
// getItems() sbg data murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  const ctx = loadSource(['modules/cross/priority-engine.js'], {
    ...opts,
  }, ['PriorityEngine']);
  return { PriorityEngine: ctx.PriorityEngine };
}

function summaryWith(finance, vehicle) {
  return { ok: true, finance, vehicle, insightCount: 0, priorityCount: 0 };
}

test('priority-engine.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('getItems() — LifeDashboardSummaryAPI belum dimuat: ok:false, items kosong', () => {
  const { PriorityEngine } = makeCtx({ LifeDashboardSummaryAPI: undefined });
  const r = PriorityEngine.getItems();
  assert.equal(r.ok, false);
  assert.equal(r.items.length, 0);
  assert.equal(r.count, 0);
});

test('getItems() — summary() ok:false: ok:false, items kosong', () => {
  const LifeDashboardSummaryAPI = { summary: () => ({ ok: false, reason: 'x' }) };
  const { PriorityEngine } = makeCtx({ LifeDashboardSummaryAPI });
  const r = PriorityEngine.getItems();
  assert.equal(r.ok, false);
  assert.equal(r.items.length, 0);
});

test('getItems() — tidak ada budget over & reminder overdue/due-soon: items kosong', () => {
  const s = summaryWith(
    { ok: true, budget: { ok: true, items: [{ id: 1, name: 'Makan', over: false }] } },
    { ok: true, reminder: { all: [{ type: 'service', severity: 'info', message: 'x' }] } },
  );
  const LifeDashboardSummaryAPI = { summary: () => s };
  const { PriorityEngine } = makeCtx({ LifeDashboardSummaryAPI });
  const r = PriorityEngine.getItems();
  assert.equal(r.ok, true);
  assert.equal(r.items.length, 0);
  assert.equal(r.count, 0);
});

test('getItems() — budget over: FILTER murni .over===true', () => {
  const s = summaryWith(
    { ok: true, budget: { ok: true, items: [{ id: 1, name: 'Makan', over: true }, { id: 2, name: 'Transport', over: false }] } },
    { ok: true, reminder: { all: [] } },
  );
  const LifeDashboardSummaryAPI = { summary: () => s };
  const { PriorityEngine } = makeCtx({ LifeDashboardSummaryAPI });
  const r = PriorityEngine.getItems();
  assert.equal(r.count, 1);
  assert.equal(r.items[0].kind, 'finance');
  assert.equal(r.items[0].name, 'Makan');
});

test('getItems() — reminder overdue & due-soon: FILTER murni severity, urut overdue -> finance -> due-soon', () => {
  const s = summaryWith(
    { ok: true, budget: { ok: true, items: [{ id: 1, name: 'Belanja', over: true }] } },
    { ok: true, reminder: { all: [
      { type: 'service', severity: 'overdue', message: 'Servis lewat jatuh tempo' },
      { type: 'fuel', severity: 'due-soon', message: 'BBM segera perlu isi' },
      { type: 'tax', severity: 'info', message: 'Info pajak' },
    ] } },
  );
  const LifeDashboardSummaryAPI = { summary: () => s };
  const { PriorityEngine } = makeCtx({ LifeDashboardSummaryAPI });
  const r = PriorityEngine.getItems();
  assert.equal(r.count, 3);
  assert.equal(r.items[0].kind, 'vehicle');
  assert.equal(r.items[0].severity, 'overdue');
  assert.equal(r.items[1].kind, 'finance');
  assert.equal(r.items[2].kind, 'vehicle');
  assert.equal(r.items[2].severity, 'due-soon');
});

test('getItems() — finance.ok false: financeOver dianggap kosong, tidak throw', () => {
  const s = summaryWith({ ok: false }, { ok: true, reminder: { all: [{ type: 'service', severity: 'overdue', message: 'x' }] } });
  const LifeDashboardSummaryAPI = { summary: () => s };
  const { PriorityEngine } = makeCtx({ LifeDashboardSummaryAPI });
  const r = PriorityEngine.getItems();
  assert.equal(r.count, 1);
  assert.equal(r.items[0].kind, 'vehicle');
});

test('getItems() — vehicle.ok false: vehicle items dianggap kosong, tidak throw', () => {
  const s = summaryWith({ ok: true, budget: { ok: true, items: [{ id: 1, name: 'Belanja', over: true }] } }, { ok: false });
  const LifeDashboardSummaryAPI = { summary: () => s };
  const { PriorityEngine } = makeCtx({ LifeDashboardSummaryAPI });
  const r = PriorityEngine.getItems();
  assert.equal(r.count, 1);
  assert.equal(r.items[0].kind, 'finance');
});
