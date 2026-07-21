'use strict';
// tests/vehicle-priority-scoring.test.js — VehiclePriorityScoring
// (modules/vehicle/vehicle-priority-scoring.js). Sesi 82 (Batch 7) —
// Vehicle Decision Engine Foundation: score(recommendation) & rank
// (recommendations), tabel bobot SEVERITY_WEIGHT (satu-satunya "rumus"
// baru sesi ini). Modul ini 0 dependency ke modul lain (langsung baca
// field `severity` yang sudah ada di recommendation), jadi tidak perlu
// loadSource extraGlobals mock — cukup load apa adanya.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx() {
  return loadSource(['modules/vehicle/vehicle-priority-scoring.js'], {}, ['VehiclePriorityScoring']);
}

test('vehicle-priority-scoring.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('score() — severity "overdue" = 100', () => {
  const { VehiclePriorityScoring } = makeCtx();
  assert.equal(VehiclePriorityScoring.score({ severity: 'overdue' }), 100);
});

test('score() — severity "warning" = 60', () => {
  const { VehiclePriorityScoring } = makeCtx();
  assert.equal(VehiclePriorityScoring.score({ severity: 'warning' }), 60);
});

test('score() — severity "due-soon" = 40', () => {
  const { VehiclePriorityScoring } = makeCtx();
  assert.equal(VehiclePriorityScoring.score({ severity: 'due-soon' }), 40);
});

test('score() — severity tidak dikenal: 0, tidak throw', () => {
  const { VehiclePriorityScoring } = makeCtx();
  assert.equal(VehiclePriorityScoring.score({ severity: 'entah' }), 0);
  assert.equal(VehiclePriorityScoring.score({}), 0);
});

test('rank() — array kosong: [], tidak throw', () => {
  const { VehiclePriorityScoring } = makeCtx();
  assert.equal(VehiclePriorityScoring.rank([]).length, 0);
  assert.equal(VehiclePriorityScoring.rank(undefined).length, 0);
});

test('rank() — diurutkan menurun: overdue > warning > due-soon', () => {
  const { VehiclePriorityScoring } = makeCtx();
  const input = [
    { id: 'a', severity: 'due-soon' },
    { id: 'b', severity: 'overdue' },
    { id: 'c', severity: 'warning' },
  ];
  const ranked = VehiclePriorityScoring.rank(input);
  assert.deepEqual(ranked.map((r) => r.id), ['b', 'c', 'a']);
  assert.deepEqual(ranked.map((r) => r.priorityScore), [100, 60, 40]);
});

test('rank() — tidak mengubah recommendation asli (field lain dipertahankan)', () => {
  const { VehiclePriorityScoring } = makeCtx();
  const input = [{ id: 'a', severity: 'overdue', message: 'x' }];
  const ranked = VehiclePriorityScoring.rank(input);
  assert.equal(ranked[0].id, 'a');
  assert.equal(ranked[0].message, 'x');
  assert.equal(input[0].priorityScore, undefined); // input asli tidak diubah (immutable map)
});

test('rank() — sesama skor sama, urutan asli dipertahankan (stable sort)', () => {
  const { VehiclePriorityScoring } = makeCtx();
  const input = [
    { id: 'a', severity: 'overdue' },
    { id: 'b', severity: 'overdue' },
  ];
  const ranked = VehiclePriorityScoring.rank(input);
  assert.deepEqual(ranked.map((r) => r.id), ['a', 'b']);
});
