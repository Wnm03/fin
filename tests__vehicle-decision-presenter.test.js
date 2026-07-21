'use strict';
// tests/vehicle-decision-presenter.test.js — VehicleDecisionPresenter
// (modules/vehicle/vehicle-decision-presenter.js). Sesi 82 (Batch 7) —
// Vehicle Decision Engine Foundation: render() daftar rekomendasi
// (maks 5, diurutkan priorityScore), 100% reuse
// VehicleRecommendationEngine.recommendations() + VehiclePriorityScoring.
// rank() + VehicleActionRecommendation.withAction(). Pola sama persis
// tests/vehicle-alert-panel.test.js/tests/vehicle-insight-feed.test.js —
// dependency di-mock lewat loadSource extraGlobals (isolasi murni), DOM
// lewat fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ vehDecisionBody: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/vehicle/vehicle-decision-presenter.js'], {
    escapeHtml: (s) => String(s ?? ''),
    ...rest,
    document: fakeDocument,
  }, ['VehicleDecisionPresenter']);
  return { VehicleDecisionPresenter: ctx.VehicleDecisionPresenter, fakeDocument };
}

function rec(overrides = {}) {
  return Object.assign({
    id: 'r1',
    source: 'reminder',
    type: 'service',
    vehicleId: 'veh_1',
    vehicleName: 'Motor A',
    severity: 'overdue',
    message: 'Servis Oli Mesin Motor A sudah lewat jatuh tempo.',
  }, overrides);
}

test('vehicle-decision-presenter.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #vehDecisionBody tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { VehicleDecisionPresenter } = makeCtx({ document: emptyDoc });
  assert.doesNotThrow(() => VehicleDecisionPresenter.render());
});

test('render() — VehicleRecommendationEngine belum dimuat: body dikosongkan, tidak throw', () => {
  const { VehicleDecisionPresenter, fakeDocument } = makeCtx({ VehicleRecommendationEngine: undefined });
  assert.doesNotThrow(() => VehicleDecisionPresenter.render());
  assert.equal(fakeDocument.getElementById('vehDecisionBody').innerHTML, '');
});

test('render() — 0 recommendation: body dikosongkan (silent), tidak throw', () => {
  const VehicleRecommendationEngine = { recommendations: () => [] };
  const VehiclePriorityScoring = { rank: (r) => r };
  const VehicleActionRecommendation = { withAction: (r) => r };
  const { VehicleDecisionPresenter, fakeDocument } = makeCtx({ VehicleRecommendationEngine, VehiclePriorityScoring, VehicleActionRecommendation });
  VehicleDecisionPresenter.render();
  assert.equal(fakeDocument.getElementById('vehDecisionBody').innerHTML, '');
});

test('render() — recommendation ditampilkan: pesan + action label, reuse apa adanya', () => {
  const recs = [rec()];
  const VehicleRecommendationEngine = { recommendations: () => recs };
  const VehiclePriorityScoring = { rank: (r) => r.map((x) => ({ ...x, priorityScore: 100 })) };
  const VehicleActionRecommendation = { withAction: (r) => r.map((x) => ({ ...x, action: { label: 'Jadwalkan servis sekarang' } })) };
  const { VehicleDecisionPresenter, fakeDocument } = makeCtx({ VehicleRecommendationEngine, VehiclePriorityScoring, VehicleActionRecommendation });
  VehicleDecisionPresenter.render();
  const html = fakeDocument.getElementById('vehDecisionBody').innerHTML;
  assert.match(html, /Rekomendasi Kendaraan/);
  assert.match(html, /Servis Oli Mesin Motor A sudah lewat jatuh tempo\./);
  assert.match(html, /Jadwalkan servis sekarang/);
});

test('render() — memanggil rank() lalu withAction() dgn urutan yg benar (pipeline)', () => {
  const recs = [rec()];
  let rankCalled = false;
  const VehicleRecommendationEngine = { recommendations: () => recs };
  const VehiclePriorityScoring = {
    rank: (r) => { rankCalled = true; assert.equal(r, recs); return r.map((x) => ({ ...x, priorityScore: 100 })); },
  };
  const VehicleActionRecommendation = {
    withAction: (r) => { assert.equal(rankCalled, true); return r.map((x) => ({ ...x, action: { label: 'x' } })); },
  };
  const { VehicleDecisionPresenter } = makeCtx({ VehicleRecommendationEngine, VehiclePriorityScoring, VehicleActionRecommendation });
  assert.doesNotThrow(() => VehicleDecisionPresenter.render());
});

test('render() — maks 5 item ditampilkan meski recommendation lebih banyak', () => {
  const recs = Array.from({ length: 8 }, (_, i) => rec({ id: `r${i}`, message: `Pesan ${i}` }));
  const VehicleRecommendationEngine = { recommendations: () => recs };
  const VehiclePriorityScoring = { rank: (r) => r.map((x) => ({ ...x, priorityScore: 100 })) };
  const VehicleActionRecommendation = { withAction: (r) => r.map((x) => ({ ...x, action: { label: 'aksi' } })) };
  const { VehicleDecisionPresenter, fakeDocument } = makeCtx({ VehicleRecommendationEngine, VehiclePriorityScoring, VehicleActionRecommendation });
  VehicleDecisionPresenter.render();
  const html = fakeDocument.getElementById('vehDecisionBody').innerHTML;
  for (let i = 0; i < 5; i++) assert.match(html, new RegExp(`Pesan ${i}`));
  for (let i = 5; i < 8; i++) assert.doesNotMatch(html, new RegExp(`Pesan ${i}`));
});

test('render() — icon berbeda per type (service/tax/fuel/insight)', () => {
  const recs = [
    rec({ id: 'a', type: 'service', message: 'pesan-service' }),
    rec({ id: 'b', type: 'tax', message: 'pesan-tax' }),
    rec({ id: 'c', type: 'fuel', message: 'pesan-fuel' }),
    rec({ id: 'd', type: 'insight', severity: 'warning', message: 'pesan-insight' }),
  ];
  const VehicleRecommendationEngine = { recommendations: () => recs };
  const VehiclePriorityScoring = { rank: (r) => r.map((x) => ({ ...x, priorityScore: 100 })) };
  const VehicleActionRecommendation = { withAction: (r) => r.map((x) => ({ ...x, action: { label: 'aksi' } })) };
  const { VehicleDecisionPresenter, fakeDocument } = makeCtx({ VehicleRecommendationEngine, VehiclePriorityScoring, VehicleActionRecommendation });
  VehicleDecisionPresenter.render();
  const html = fakeDocument.getElementById('vehDecisionBody').innerHTML;
  assert.match(html, /🔧 pesan-service/);
  assert.match(html, /📋 pesan-tax/);
  assert.match(html, /⛽ pesan-fuel/);
  assert.match(html, /💡 pesan-insight/);
});
