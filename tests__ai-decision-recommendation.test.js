'use strict';
// tests/ai-decision-recommendation.test.js — Sesi 11: bentuk output
// standar AIDecision.formatRecommendation() / decide().recommendations,
// dipakai bareng oleh Tahap 5 (Daily Briefing) & Tahap 7 (Simulation)
// nanti supaya tidak menghitung ulang logic bisnis. Additive murni —
// tidak mengubah rule/decisions lama, lihat ai-decision-engine.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function loadEngine() {
  const fakeIDBStore = { async get() { return undefined; }, async set() { return true; } };
  const ctx = loadSource(
    ['modules/ai/ai-core.js', 'modules/ai/ai-decision-engine.js'],
    { IDBStore: fakeIDBStore, D: {} },
    ['AIDecision'],
  );
  return ctx;
}

test('decide() — rule tanpa field kaya: recommendations pakai fallback (priority dari severity, actions dari recommend.label)', async () => {
  const { AIDecision } = loadEngine();
  AIDecision.recommend.register('REC-1', { label: 'Cek transaksi', target: null });
  AIDecision.rules.register({
    id: 'r-fallback', category: 'finance', severity: 'warning', weight: 5, cooldownHours: 0,
    condition: () => true,
    action: () => ({ message: 'Pengeluaran tinggi', recommendationId: 'REC-1' }),
  });
  const { recommendations } = await AIDecision.decide({});
  assert.equal(recommendations.length, 1);
  const rec = recommendations[0];
  assert.equal(rec.ruleId, 'r-fallback'); // Sesi 14: wiring recordOutcome() butuh ruleId di output
  assert.equal(rec.reason, 'Pengeluaran tinggi');
  assert.equal(rec.priority, 'HIGH'); // warning -> HIGH
  assert.equal(rec.confidence, 0.5); // weight 5 -> 0.5
  assert.equal(rec.affectedModules.length, 1);
  assert.equal(rec.affectedModules[0], 'finance'); // fallback ke category
  assert.equal(rec.actions.length, 1);
  assert.equal(rec.actions[0], 'Cek transaksi'); // fallback ke recommend.label
  assert.equal(rec.title, 'Cek transaksi'); // fallback ke recommend.label
});

test('decide() — rule dgn field kaya (title/affectedModules/estimatedImpact/actions) diteruskan apa adanya', async () => {
  const { AIDecision } = loadEngine();
  AIDecision.rules.register({
    id: 'r-rich', category: 'shop', severity: 'critical', weight: 9, cooldownHours: 0,
    condition: () => true,
    action: () => ({
      message: 'Margin hanya 4%',
      title: 'Naikkan ongkir',
      affectedModules: ['shop', 'delivery', 'finance'],
      estimatedImpact: { profit: '+Rp75.000/minggu', fuel: 'tidak berubah' },
      actions: ['Naikkan ongkir Rp5.000', 'Gunakan motor yang lebih hemat'],
    }),
  });
  const { recommendations } = await AIDecision.decide({});
  const rec = recommendations[0];
  assert.equal(rec.title, 'Naikkan ongkir');
  assert.equal(rec.priority, 'CRITICAL');
  assert.equal(rec.confidence, 0.9);
  assert.deepEqual(rec.affectedModules, ['shop', 'delivery', 'finance']);
  assert.deepEqual(rec.estimatedImpact, { profit: '+Rp75.000/minggu', fuel: 'tidak berubah' });
  assert.deepEqual(rec.actions, ['Naikkan ongkir Rp5.000', 'Gunakan motor yang lebih hemat']);
});

test('formatRecommendation() — dipanggil ulang dari decisionLog tersimpan (bukan cuma sekali saat decide)', async () => {
  const { AIDecision } = loadEngine();
  AIDecision.rules.register({
    id: 'r-history', category: 'asset', severity: 'info', weight: 2, cooldownHours: 0,
    condition: () => true,
    action: () => ({ message: 'Cek aset' }),
  });
  const { decisions } = await AIDecision.decide({});
  const rec = AIDecision.formatRecommendation(decisions[0]);
  assert.equal(rec.ruleId, 'r-history');
  assert.equal(rec.reason, 'Cek aset');
  assert.equal(rec.priority, 'MEDIUM'); // info -> MEDIUM
  assert.equal(rec.confidence, 0.2); // weight 2 -> 0.2
});

test('formatRecommendation() — input invalid mengembalikan null, tidak throw', () => {
  const { AIDecision } = loadEngine();
  assert.equal(AIDecision.formatRecommendation(null), null);
  assert.equal(AIDecision.formatRecommendation(undefined), null);
});
