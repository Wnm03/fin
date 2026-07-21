'use strict';
// tests/decision-center-dependency-graph.test.js — Regression test S116
// (Circular Dependency Hotfix). BEDA dgn test lain di folder ini:
// test-test lain SENGAJA meng-mock dependency tiap modul lewat loadSource
// extraGlobals (isolasi murni per file) — itu bagus utk unit test logic,
// TAPI tidak bisa mendeteksi bug SIKLUS ANTAR FILE (siklus cuma muncul
// kalau rantai file ASLI dimuat & dipanggil BERSAMAAN, seperti yang
// terjadi di app sungguhan).
//
// Insiden yang melatarbelakangi file ini: S115 menambahkan
// UnifiedAIBriefing.generate() -> ActionQueue.getQueue() -> DecisionCenterAPI.
// summary() -> LifeDashboardSummaryAPI.summary() -> (memanggil balik)
// UnifiedAIBriefing.generate() -> ... siklus tak berhingga -> "Maximum
// call stack size exceeded" di app nyata. TIDAK ketahuan oleh test unit
// yang ada saat itu justru krn masing-masing file di-test terisolasi
// (mock memutus rantai sebelum sempat muter balik). S116 me-revert
// wiring itu (UnifiedAIBriefing TIDAK BOLEH lagi membaca ActionQueue/
// DecisionCenterAPI/LifeDashboardSummaryAPI — lihat komentar arsitektur
// di modules/cross/unified-ai-briefing.js) & test ini dibuat supaya
// regresi yang sama TIDAK BISA balik lagi tanpa ketahuan test.
//
// Cara kerja: load SEMUA file modules/cross/*.js yang terlibat dlm
// rantai Decision Center APA ADANYA (sumber ASLI, bukan disalin/ditulis
// ulang), urutan PERSIS sama dgn scripts/build.js (GROUP_A, lihat baris
// 'modules/cross/...' di build.js) — HANYA 4 titik terluar rantai yang
// di-stub (FinanceDashboard.getAIHook/VehicleAIHook.fleetSummary/
// FinanceIntelligence.insights/VehicleIntelligence.insights — modul
// DOMAIN finance/vehicle, di luar scope "cross", sengaja diganti data
// statis minimal supaya test ini fokus murni ke SIKLUS ANTAR MODUL
// cross/*, bukan ke rumus finance/vehicle yang sudah dites terpisah di
// file lain), lalu benar-benar MEMANGGIL tiap entry point publik
// (UnifiedAIBriefing.generate(), DecisionCenterAPI.summary(),
// ActionQueue.getQueue()/render(), RecommendationPanel.getRecommendations()/
// render()) dan pastikan SEMUA selesai tanpa RangeError/stack overflow.

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { createFakeDocument } = require('./helpers/fakeDom');

const ROOT = path.join(__dirname, '..');

// Urutan PERSIS sama dengan scripts/build.js (GROUP_A, blok modules/cross/).
const CROSS_CHAIN_FILES = [
  'modules/cross/finance-vehicle-cross-summary.js',
  'modules/cross/cross-ai-hook.js',
  'modules/cross/unified-summary-api.js',
  'modules/cross/unified-ai-briefing.js',
  'modules/cross/life-dashboard-summary-api.js',
  'modules/cross/priority-engine.js',
  'modules/cross/decision-center-api.js',
  'modules/cross/recommendation-panel.js',
  'modules/cross/action-queue.js',
];

// Stub minimal utk 4 titik terluar rantai (domain finance/vehicle, di
// LUAR scope "cross" — sudah dites terpisah di
// tests/finance-dashboard.test.js, tests/vehicle-ai-hook.test.js, dst).
function makeSandbox(fakeDocument) {
  return {
    console,
    escapeHtml: (s) => String(s ?? ''),
    document: fakeDocument || createFakeDocument({ actionQueueBody: {}, recommendationPanelBody: {} }),
    FinanceDashboard: {
      getAIHook: () => ({
        ok: true,
        insights: [{ type: 'warning', message: 'Anggaran Makan hampir habis' }],
        budget: { ok: true, overCount: 1, items: [{ name: 'Makan', over: true }] },
        healthScore: { score: 78, label: 'Sehat' },
      }),
    },
    VehicleAIHook: {
      fleetSummary: () => ({
        ok: true,
        intelligence: {
          fleet: { totalVehicles: 2, avgHealth: 88 },
          insights: [{ type: 'warning', message: 'Servis motor lewat jatuh tempo' }],
        },
        reminder: {
          overdueCount: 1,
          dueSoonCount: 1,
          all: [
            { type: 'service', severity: 'overdue', message: 'Servis motor lewat jatuh tempo' },
            { type: 'tax', severity: 'due-soon', message: 'Pajak mobil jatuh tempo minggu depan' },
          ],
        },
      }),
    },
    FinanceIntelligence: {
      insights: () => [{ type: 'warning', message: 'Anggaran Makan hampir habis' }],
    },
    VehicleIntelligence: {
      insights: () => [{ type: 'warning', message: 'Servis motor lewat jatuh tempo' }],
    },
  };
}

function loadRealChain(fakeDocument) {
  const sandbox = makeSandbox(fakeDocument);
  const context = vm.createContext(sandbox);
  for (const file of CROSS_CHAIN_FILES) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    new vm.Script(src, { filename: file }).runInContext(context);
  }
  const expose = ['CrossSummaryAPI', 'CrossAIHook', 'UnifiedSummaryAPI', 'UnifiedAIBriefing',
    'LifeDashboardSummaryAPI', 'PriorityEngine', 'DecisionCenterAPI', 'RecommendationPanel', 'ActionQueue'];
  const assign = expose.map((n) => `this.${n} = ${n};`).join('\n');
  new vm.Script(assign, { filename: 'expose-bindings' }).runInContext(context);
  return context;
}

test('rantai modul ASLI (bukan mock) berhasil dimuat tanpa error', () => {
  assert.doesNotThrow(() => loadRealChain());
});

test('UnifiedAIBriefing.generate() — rantai ASLI: selesai tanpa "Maximum call stack size exceeded" (regresi S115/S116)', () => {
  const ctx = loadRealChain();
  let result;
  assert.doesNotThrow(() => { result = ctx.UnifiedAIBriefing.generate(); });
  assert.equal(result.ok, true);
  assert.match(result.text, /Skor kesehatan finansial/);
});

test('UnifiedAIBriefing.generate() — rantai ASLI: TIDAK menyebutkan "Action Queue" (guard permanen: UnifiedAIBriefing dilarang membaca ActionQueue/DecisionCenterAPI/LifeDashboardSummaryAPI)', () => {
  const ctx = loadRealChain();
  const result = ctx.UnifiedAIBriefing.generate();
  assert.doesNotMatch(result.text, /Action Queue/);
});

test('DecisionCenterAPI.summary() — rantai ASLI: selesai tanpa stack overflow, priorityItems & recommendations terisi', () => {
  const ctx = loadRealChain();
  let s;
  assert.doesNotThrow(() => { s = ctx.DecisionCenterAPI.summary(); });
  assert.equal(s.ok, true);
  assert.ok(Array.isArray(s.priorityItems));
  assert.ok(s.priorityItems.length > 0);
  assert.ok(Array.isArray(s.recommendations));
  assert.ok(s.recommendations.length > 0);
});

test('ActionQueue.getQueue()/render() — rantai ASLI: selesai tanpa stack overflow, konsisten dgn DecisionCenterAPI.summary().priorityItems', () => {
  const ctx = loadRealChain();
  const q = ctx.ActionQueue.getQueue();
  assert.equal(q.ok, true);
  assert.ok(q.priorityItems.length > 0);
  assert.doesNotThrow(() => ctx.ActionQueue.render());
});

test('RecommendationPanel.getRecommendations()/render() — rantai ASLI: selesai tanpa stack overflow, konsisten dgn DecisionCenterAPI.summary().recommendations', () => {
  const ctx = loadRealChain();
  const r = ctx.RecommendationPanel.getRecommendations();
  assert.equal(r.ok, true);
  assert.ok(r.recommendations.length > 0);
  assert.doesNotThrow(() => ctx.RecommendationPanel.render());
});

test('memanggil UnifiedAIBriefing.generate() & DecisionCenterAPI.summary() BERGANTIAN berulang kali — rantai ASLI: tidak akumulasi stack / tidak melambat drastis (guard siklus tersembunyi)', () => {
  const ctx = loadRealChain();
  assert.doesNotThrow(() => {
    for (let i = 0; i < 50; i++) {
      ctx.UnifiedAIBriefing.generate();
      ctx.DecisionCenterAPI.summary();
      ctx.ActionQueue.getQueue();
      ctx.RecommendationPanel.getRecommendations();
    }
  });
});
