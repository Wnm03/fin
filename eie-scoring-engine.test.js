'use strict';
// tests/eie-scoring-engine.test.js — EIEScoringEngine (engine/scoring-engine.js).
// Sebelumnya 0 test sama sekali. calcEES/calcPEHS/calcERI/classifyEconomicStatus
// di-stub dgn fungsi sederhana yg predictable (sudah ada test tersendiri utk
// rumus aslinya di tests/eie-scoring-formulas.test.js & tests/status-classifier.test.js)
// supaya test ini murni fokus ke ORKESTRASI-nya (calculateAll/recomputeAndPersist),
// bukan re-test rumus.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');

function fakeCalc(score, breakdown = {}) {
  return () => ({ score, breakdown });
}

function load(overrides = {}) {
  return loadSource(
    ['economic-intelligence/engine/scoring-engine.js'],
    {
      calcEES: overrides.calcEES || fakeCalc(10, { d: 1 }),
      calcPEHS: overrides.calcPEHS || fakeCalc(80, { p: 1 }),
      calcERI: overrides.calcERI || fakeCalc(20, { e: 1 }),
      classifyEconomicStatus: overrides.classifyEconomicStatus
        || ((ees, pehs, eri) => ({ status: 'normal', impactScore: 5 })),
      eieEnsureLoaded: overrides.eieEnsureLoaded || (async () => {}),
      eieGetStore: overrides.eieGetStore || (() => ({})),
      eieSave: overrides.eieSave || (async () => {}),
      MacroDataAdapter: overrides.MacroDataAdapter || { getLatest: () => ({}) },
      UserFinanceAdapter: overrides.UserFinanceAdapter || { getSnapshot: () => ({}) },
      RuleEngine: overrides.RuleEngine || { evaluate: () => [] },
      EIEBus: overrides.EIEBus || { emit: () => {} },
    },
    ['EIEScoringEngine'],
  );
}

test('calculateAll — merangkai skor EES/PEHS/ERI + status jadi 1 object, breakdown lengkap 3 komponen + impactScore', () => {
  const { EIEScoringEngine } = load();
  const out = EIEScoringEngine.calculateAll({}, {});
  assert.equal(out.economicExposureScore, 10);
  assert.equal(out.personalEconomicHealthScore, 80);
  assert.equal(out.economicRiskIndex, 20);
  assert.equal(out.status, 'normal');
  assert.deepEqual(out.breakdown.ees, { d: 1 });
  assert.deepEqual(out.breakdown.pehs, { p: 1 });
  assert.deepEqual(out.breakdown.eri, { e: 1 });
  assert.equal(out.breakdown.impactScore, 5);
});

test('calculateAll — classifyEconomicStatus dipanggil dgn urutan argumen (EES, PEHS, ERI) yang benar', () => {
  let received = null;
  const { EIEScoringEngine } = load({
    calcEES: fakeCalc(11), calcPEHS: fakeCalc(22), calcERI: fakeCalc(33),
    classifyEconomicStatus: (ees, pehs, eri) => { received = [ees, pehs, eri]; return { status: 'waspada', impactScore: 1 }; },
  });
  EIEScoringEngine.calculateAll({}, {});
  assert.deepEqual(received, [11, 22, 33]);
});

test('recomputeAndPersist — menulis 1 entry scoreHistory hari ini, insight baru ditambahkan ke store, EIEBus di-emit', async () => {
  const store = { scoreHistory: [], insights: [] };
  let emitted = null;
  const { EIEScoringEngine } = load({
    eieGetStore: () => store,
    RuleEngine: { evaluate: () => [{ ruleId: 'R1', severity: 'warning', message: 'msg', recommendationId: 'REC-1' }] },
    EIEBus: { emit: (name, payload) => { emitted = { name, payload }; } },
  });
  const result = await EIEScoringEngine.recomputeAndPersist();
  assert.equal(store.scoreHistory.length, 1);
  assert.equal(store.scoreHistory[0].date, new Date().toISOString().slice(0, 10));
  assert.equal(store.insights.length, 1);
  assert.equal(store.insights[0].ruleId, 'R1');
  assert.equal(store.insights[0].read, false);
  assert.equal(store.insights[0].dismissed, false);
  assert.equal(emitted.name, 'eie:scores-updated');
  assert.equal(result.insights.length, 1);
});

test('recomputeAndPersist — dipanggil 2x di hari yang sama: entry scoreHistory ditimpa (1 entry/hari), bukan duplikat', async () => {
  const store = { scoreHistory: [], insights: [] };
  const { EIEScoringEngine } = load({
    eieGetStore: () => store,
    calcEES: fakeCalc(1),
  });
  await EIEScoringEngine.recomputeAndPersist();
  const { EIEScoringEngine: engine2 } = load({ eieGetStore: () => store, calcEES: fakeCalc(99) });
  await engine2.recomputeAndPersist();
  assert.equal(store.scoreHistory.length, 1);
  assert.equal(store.scoreHistory[0].economicExposureScore, 99);
});

test('recomputeAndPersist — scoreHistory dibatasi maksimal 365 entry (entry terlama dibuang)', async () => {
  const old = [];
  for (let i = 0; i < 365; i++) old.push({ date: `2020-01-${String(i % 28 + 1).padStart(2, '0')}-${i}` });
  const store = { scoreHistory: old.slice(), insights: [] };
  const { EIEScoringEngine } = load({ eieGetStore: () => store });
  await EIEScoringEngine.recomputeAndPersist();
  assert.equal(store.scoreHistory.length, 365);
  assert.equal(store.scoreHistory[store.scoreHistory.length - 1].date, new Date().toISOString().slice(0, 10));
});

test('recomputeAndPersist — insights lama + baru dibatasi maksimal 200, insight lama yg dibuang adalah yg PALING LAMA', async () => {
  const oldInsights = [];
  for (let i = 0; i < 200; i++) oldInsights.push({ id: `old-${i}` });
  const store = { scoreHistory: [], insights: oldInsights.slice() };
  const { EIEScoringEngine } = load({
    eieGetStore: () => store,
    RuleEngine: { evaluate: () => [{ ruleId: 'R-NEW', severity: 'info', message: 'x' }] },
  });
  await EIEScoringEngine.recomputeAndPersist();
  assert.equal(store.insights.length, 200);
  assert.equal(store.insights[store.insights.length - 1].ruleId, 'R-NEW');
  assert.equal(store.insights[0].id, 'old-1'); // old-0 yg paling lama ke-drop
});

test('getLatestSnapshot — store kosong -> null; ada isi -> ambil entry PALING TERAKHIR (terbaru)', async () => {
  const storeEmpty = {};
  const { EIEScoringEngine: e1 } = load({ eieGetStore: () => storeEmpty });
  assert.equal(await e1.getLatestSnapshot(), null);

  const storeFilled = { scoreHistory: [{ date: 'a' }, { date: 'b' }, { date: 'c' }] };
  const { EIEScoringEngine: e2 } = load({ eieGetStore: () => storeFilled });
  const latest = await e2.getLatestSnapshot();
  assert.equal(latest.date, 'c');
});
