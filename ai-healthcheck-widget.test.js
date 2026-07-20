'use strict';
// tests/ai-healthcheck-widget.test.js — modules/ai untuk UI: AIHealthCheckWidget
// (ai-chat.js, Sesi 34, TODO.md #4e lanjutan — "pusat diagnostik" Smart AI).
// Tombol "🩺 Health Check Lengkap" di dalam "🧭 Penasihat" > tab "🔍 Laporan
// AI", DI BAWAH tombol AISimulateWidget. Fokus test: run() panggil
// AIService.healthCheck() (TANPA argumen) lalu tulis 7 checkmark (Context
// Collector/Rule Evaluation/Recommendation Engine/Daily Briefing/
// Simulation/Performance Timing/Overall Status) ke #aiHealthCheckBody,
// murni menyusun ulang field yang SUDAH ADA di return healthCheck() (TIDAK
// menjalankan/mengukur ulang apa pun), tidak error kalau AIService belum
// ter-load atau healthCheck() melempar error, guard `running` mencegah
// panggilan dobel.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');
const { createFakeDocument } = require('../helpers/fakeDom');

function fullHealth(overrides = {}) {
  return Object.assign({
    ok: true,
    checkedAt: '2026-07-18T00:00:00.000Z',
    checks: {
      busReady: true,
      storeReady: true,
      rulesRegistered: 3,
      recommendationsRegistered: 2,
      duplicateRuleIds: [],
      duplicateRecommendations: [],
      deadRuleIds: [],
      brokenRecommendationRefs: [],
      orphanedStorageKeys: { orphanedCooldownRuleIds: [], orphanedLearningDataRuleIds: [] },
      contextReady: true,
      performance: {
        contextCollectorMs: 0.5,
        ruleEvaluationMs: 0.25,
        recommendationMs: 0.1,
        dailyBriefingMs: 1.2,
        simulationMs: 0.9,
      },
    },
  }, overrides);
}

function makeCtx({ healthCheckImpl } = {}) {
  const fakeDocument = createFakeDocument({ aiHealthCheckBody: {}, aiHealthCheckBtn: {} });
  let callCount = 0;
  const AIService = {
    healthCheck: async () => {
      callCount += 1;
      if (healthCheckImpl) return healthCheckImpl();
      return fullHealth();
    },
  };
  const c = loadSource(['ai-chat.js'], {
    document: fakeDocument,
    AIService,
    escapeHtml: (s) => String(s),
    toast: () => {},
  }, ['AIHealthCheckWidget']);
  return { AIHealthCheckWidget: c.AIHealthCheckWidget, fakeDocument, getCallCount: () => callCount };
}

test('run() — memanggil AIService.healthCheck() lalu menulis ke #aiHealthCheckBody', async () => {
  const { AIHealthCheckWidget, fakeDocument, getCallCount } = makeCtx();
  await AIHealthCheckWidget.run();
  assert.equal(getCallCount(), 1);
  const html = fakeDocument.getElementById('aiHealthCheckBody').innerHTML;
  assert.notEqual(html, '');
});

test('run() — tidak melempar error kalau AIService belum ter-load', async () => {
  const fakeDocument = createFakeDocument({ aiHealthCheckBody: {}, aiHealthCheckBtn: {} });
  const c = loadSource(['ai-chat.js'], { document: fakeDocument, toast: () => {} }, ['AIHealthCheckWidget']);
  await assert.doesNotReject(() => c.AIHealthCheckWidget.run());
  assert.equal(fakeDocument.getElementById('aiHealthCheckBody').innerHTML, '');
});

test('run() — tidak melempar error kalau AIService.healthCheck() melempar error', async () => {
  const { AIHealthCheckWidget, fakeDocument } = makeCtx({
    healthCheckImpl: () => { throw new Error('gagal health check'); },
  });
  await assert.doesNotReject(() => AIHealthCheckWidget.run());
  assert.equal(fakeDocument.getElementById('aiHealthCheckBtn').disabled, false);
});

test('run() — tombol disabled selama berjalan lalu di-enable lagi setelah selesai', async () => {
  const { AIHealthCheckWidget, fakeDocument } = makeCtx();
  await AIHealthCheckWidget.run();
  assert.equal(fakeDocument.getElementById('aiHealthCheckBtn').disabled, false);
});

test('run() — guard running mencegah panggilan dobel bersamaan', async () => {
  let callCount = 0;
  const { AIHealthCheckWidget } = makeCtx({
    healthCheckImpl: () => {
      callCount += 1;
      return new Promise((resolve) => setTimeout(() => resolve(fullHealth()), 10));
    },
  });
  const p1 = AIHealthCheckWidget.run();
  const p2 = AIHealthCheckWidget.run();
  await Promise.all([p1, p2]);
  assert.equal(callCount, 1);
});

test('renderHtml — menampilkan 7 checkmark (5 fungsi + Performance Timing + Overall Status) kondisi sehat', () => {
  const { AIHealthCheckWidget } = makeCtx();
  const html = AIHealthCheckWidget.renderHtml(fullHealth());
  assert.match(html, /✓ Context Collector/);
  assert.match(html, /✓ Rule Evaluation/);
  assert.match(html, /✓ Recommendation Engine/);
  assert.match(html, /✓ Daily Briefing/);
  assert.match(html, /✓ Simulation/);
  assert.match(html, /✓ Performance Timing/);
  assert.match(html, /✓ Overall Status/);
  assert.match(html, /Sehat/);
});

test('renderHtml — checkmark individual balik ✗ kalau ms field-nya bukan number (fungsi terkait gagal diukur)', () => {
  const { AIHealthCheckWidget } = makeCtx();
  const health = fullHealth();
  health.checks.performance.dailyBriefingMs = null;
  health.checks.performance.simulationMs = null;
  const html = AIHealthCheckWidget.renderHtml(health);
  assert.match(html, /✗ Daily Briefing/);
  assert.match(html, /✗ Simulation/);
  // Performance Timing ikut ✗ krn tidak semua 5 fungsi berhasil diukur.
  assert.match(html, /✗ Performance Timing/);
  // Context Collector/Rule Evaluation/Recommendation Engine tetap ✓ (tidak ikut gagal).
  assert.match(html, /✓ Context Collector/);
});

test('renderHtml — Overall Status balik ✗ & pesan "belum siap" kalau ok:false', () => {
  const { AIHealthCheckWidget } = makeCtx();
  const html = AIHealthCheckWidget.renderHtml(fullHealth({ ok: false }));
  assert.match(html, /✗ Overall Status/);
  assert.match(html, /belum siap/);
});

test('renderHtml — menampilkan durasi ms tiap fungsi', () => {
  const { AIHealthCheckWidget } = makeCtx();
  const html = AIHealthCheckWidget.renderHtml(fullHealth());
  assert.match(html, /0\.50ms/);
  assert.match(html, /0\.25ms/);
  assert.match(html, /0\.10ms/);
  assert.match(html, /1\.20ms/);
  assert.match(html, /0\.90ms/);
});

test('renderHtml — menampilkan temuan informasional (duplikat/dead/broken/orphaned) kalau ada', () => {
  const { AIHealthCheckWidget } = makeCtx();
  const health = fullHealth();
  health.checks.duplicateRuleIds = ['a', 'b'];
  health.checks.deadRuleIds = ['c'];
  const html = AIHealthCheckWidget.renderHtml(health);
  assert.match(html, /2 rule dobel/);
  assert.match(html, /1 rule mati/);
});

test('renderHtml — tidak melempar kalau health null/undefined', () => {
  const { AIHealthCheckWidget } = makeCtx();
  assert.doesNotThrow(() => AIHealthCheckWidget.renderHtml(null));
  assert.doesNotThrow(() => AIHealthCheckWidget.renderHtml(undefined));
});

test('renderHtml — tidak melempar kalau checks/performance kosong (belum pernah healthCheck())', () => {
  const { AIHealthCheckWidget } = makeCtx();
  const html = AIHealthCheckWidget.renderHtml({ ok: false, checks: {} });
  assert.match(html, /✗ Context Collector/);
  assert.match(html, /✗ Performance Timing/);
});
