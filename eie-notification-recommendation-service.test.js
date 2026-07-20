'use strict';
// tests/eie-notification-recommendation-service.test.js —
// NotificationService (services/notification-service.js, dimuat bareng
// eie-bus.js ASLI supaya on/off/emit ikut teruji sekalian — eie-bus.js
// sendiri belum ada test khusus) & RecommendationService
// (services/recommendation-service.js). Keduanya sebelumnya 0 test.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');

function load(toastFn) {
  return loadSource(
    ['economic-intelligence/eie-bus.js', 'economic-intelligence/services/notification-service.js'],
    { toast: toastFn, console: { warn: () => {} } },
    ['EIEBus', 'NotificationService'],
  );
}

test('NotificationService.enable — belum enable, emit tidak memicu toast sama sekali (default off)', () => {
  const calls = [];
  const { EIEBus } = load((msg) => calls.push(msg));
  EIEBus.emit('eie:scores-updated', { insights: [{ severity: 'critical', message: 'x' }] });
  assert.equal(calls.length, 0);
});

test('NotificationService.enable — setelah enable(), event scores-updated memicu toast utk tiap insight', () => {
  const calls = [];
  const { EIEBus, NotificationService } = load((msg) => calls.push(msg));
  NotificationService.enable();
  EIEBus.emit('eie:scores-updated', { insights: [{ severity: 'warning', message: 'A' }, { severity: 'info', message: 'B' }] });
  assert.equal(calls.length, 2);
  assert.match(calls[0], /🟡 A/);
  assert.match(calls[1], /ℹ️ B/);
});

test('NotificationService.enable — dipanggil 2x tidak dobel-subscribe (1 event cuma 1x toast per insight)', () => {
  const calls = [];
  const { EIEBus, NotificationService } = load((msg) => calls.push(msg));
  NotificationService.enable();
  NotificationService.enable();
  EIEBus.emit('eie:scores-updated', { insights: [{ severity: 'info', message: 'X' }] });
  assert.equal(calls.length, 1);
});

test('NotificationService.enable — opsi criticalOnly:true membuang insight non-critical', () => {
  const calls = [];
  const { EIEBus, NotificationService } = load((msg) => calls.push(msg));
  NotificationService.enable({ criticalOnly: true });
  EIEBus.emit('eie:scores-updated', {
    insights: [{ severity: 'critical', message: 'C' }, { severity: 'warning', message: 'W' }],
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0], /🔴 C/);
});

test('NotificationService.enable — opsi silent:true tidak memanggil toast() sama sekali', () => {
  const calls = [];
  const { EIEBus, NotificationService } = load((msg) => calls.push(msg));
  NotificationService.enable({ silent: true });
  EIEBus.emit('eie:scores-updated', { insights: [{ severity: 'info', message: 'X' }] });
  assert.equal(calls.length, 0);
});

test('NotificationService.disable — setelah disable(), event berikutnya tidak lagi memicu toast', () => {
  const calls = [];
  const { EIEBus, NotificationService } = load((msg) => calls.push(msg));
  NotificationService.enable();
  NotificationService.disable();
  EIEBus.emit('eie:scores-updated', { insights: [{ severity: 'info', message: 'X' }] });
  assert.equal(calls.length, 0);
});

test('NotificationService — event scores-updated tanpa insight (array kosong/undefined) tidak throw & tidak toast', () => {
  const calls = [];
  const { EIEBus, NotificationService } = load((msg) => calls.push(msg));
  NotificationService.enable();
  assert.doesNotThrow(() => EIEBus.emit('eie:scores-updated', {}));
  assert.doesNotThrow(() => EIEBus.emit('eie:scores-updated', { insights: [] }));
  assert.equal(calls.length, 0);
});

test('NotificationService._deliver — toast belum tersedia (bukan function) tidak throw, di-skip diam2', () => {
  const { EIEBus, NotificationService } = load(undefined); // toast undefined
  NotificationService.enable();
  assert.doesNotThrow(() => EIEBus.emit('eie:scores-updated', { insights: [{ severity: 'info', message: 'X' }] }));
});

// --- RecommendationService ---

function loadRec() {
  return loadSource(['economic-intelligence/services/recommendation-service.js'], {}, ['RecommendationService']);
}

test('RecommendationService.getById — id dikenal mengembalikan {label, target} sesuai mapping', () => {
  const { RecommendationService } = loadRec();
  const r = RecommendationService.getById('REC-BOOST-EMERGENCY-FUND');
  assert.equal(r.label, 'Tambah alokasi ke Target Dana Darurat');
  assert.deepEqual(Object.assign({}, r.target), { page: 'dashboard-hub', goTo: 'lifeBalanceCard' });
});

test('RecommendationService.getById — id tidak dikenal / kosong mengembalikan null, bukan throw', () => {
  const { RecommendationService } = loadRec();
  assert.equal(RecommendationService.getById('REC-TIDAK-ADA'), null);
  assert.equal(RecommendationService.getById(undefined), null);
  assert.equal(RecommendationService.getById(''), null);
});

test('RecommendationService — setiap recommendationId yg dipakai rule-definitions.js ada mapping-nya (tidak ada dangling id)', () => {
  const { RecommendationService } = loadRec();
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'economic-intelligence', 'rules', 'rule-definitions.js'), 'utf8');
  const ids = new Set([...src.matchAll(/recommendationId:\s*'([^']+)'/g)].map((m) => m[1]));
  const missing = [...ids].filter((id) => !RecommendationService.getById(id));
  assert.deepEqual(missing, []);
});
