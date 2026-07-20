'use strict';
// tests/ai-service.test.js — modules/ai/ai-service.js (Sesi 2/6 Smart
// Delivery Engine: AIService facade). AIService adalah SATU-SATUNYA pintu
// yang seharusnya dipakai modul lain (Sesi 4-6) — test ini memastikan ke-4
// method (dailyBriefing/healthCheck/simulate/buildPrompt) berperilaku
// benar dari facade, tanpa perlu tahu detail internal AIDecision/AIStore.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');

function loadService(idbData, {
  withLogistics = false, withFinance = false, withReminderSources = false, D: dFixture = { some: 'thing' },
} = {}) {
  const idbCalls = [];
  const fakeIDBStore = {
    async get() { return idbData; },
    async set(key, value) { idbCalls.push([key, value]); return true; },
  };
  const files = [
    'modules/ai/ai-core.js',
    'modules/ai/ai-decision-engine.js',
    'modules/ai/ai-service.js',
  ];
  const exposeNames = ['AIService', 'AIDecision', 'aiGetStore', 'aiEnsureLoaded'];
  if (withLogistics) {
    // Sesi 15 — Tahap 7 Profit Simulation & Tahap 5 Delivery Summary:
    // LogisticsEngine dimuat SEBELUM ai-service.js (urutan sama dgn
    // scripts/build.js), supaya AIService.simulate()/dailyBriefing() bisa
    // memanggilnya lewat guard `typeof LogisticsEngine !== 'undefined'`.
    files.splice(2, 0, 'modules/logistics/logistics-engine.js');
    exposeNames.push('LogisticsEngine');
  }
  const extraGlobals = { IDBStore: fakeIDBStore, D: dFixture };
  if (withFinance) {
    // Sesi 23 — Tahap 5 Financial Summary: tx-list-cashflow.js dimuat
    // supaya computeCashflowForecast() ada (dipakai AIContext.snapshot()
    // .finance, pola sama dgn tests/ai-context-collector.test.js).
    files.splice(2, 0, 'modules/finance/tx-list-cashflow.js');
    extraGlobals.totalSaldoAkun = () => 1000000;
  }
  if (withReminderSources) {
    // Sesi 31 — Tahap 5 Reminder Summary/Target Summary: muat SEMUA
    // sumber per domain yang di-reuse `_aiReminderAndTargetSummary()`
    // (vehicle-core.js+sparepart-servis.js/aset.js/cobek-pricing.js utk
    // reminder Vehicle/Asset/Shop, lifeos-registry.js+goal-adapter.js+
    // today-adapter.js utk Goal/LifeOS). Global stub SAMA PERSIS dgn yang
    // sudah terbukti dipakai tests/vehicle-ai-rule.test.js/
    // tests/asset-ai-rule.test.js/tests/lifeos-goal-adapter.test.js/
    // tests/lifeos-today-adapter.test.js (tidak menebak stub baru).
    files.splice(
      2, 0,
      'modules/vehicle/vehicle-core.js',
      'modules/vehicle/sparepart-servis.js',
      'modules/asset/aset.js',
      'modules/shop/cobek-pricing.js',
      'lifeos/lifeos-registry.js',
      'lifeos/adapters/goal-adapter.js',
      'lifeos/adapters/today-adapter.js',
    );
    Object.assign(extraGlobals, {
      dateToISO: (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
      getWeekRange: () => ({ start: new Date(), end: new Date() }),
      MY_WRENCH: { minLbft: 10, maxLbft: 80 },
      Servis: { getLastServiceKmForCat: () => null },
      escapeHtml: (s) => String(s == null ? '' : s),
      sameId: (a, b) => String(a) === String(b),
      todayStr: () => '2026-07-18',
      save: () => {},
      toast: () => {},
      PajakAset: { hitungZakatAset: () => ({ totalNilai: 0, totalZakat: 0, list: [] }) },
    });
  }
  const ctx = loadSource(
    files,
    extraGlobals,
    exposeNames,
  );
  return { ctx, idbCalls };
}

function validRule(overrides = {}) {
  return Object.assign({
    id: 'R-SVC-001',
    category: 'test',
    severity: 'warning',
    weight: 5,
    cooldownHours: 24,
    condition: () => true,
    action: () => ({ message: 'butuh perhatian', recommendationId: 'REC-SVC' }),
  }, overrides);
}

test('dailyBriefing — belum ada decisionLog: recentDecisions kosong, context & lastRunAt ada', async () => {
  const { ctx } = loadService(undefined);
  const briefing = await ctx.AIService.dailyBriefing();
  assert.equal(JSON.stringify(briefing.recentDecisions), '[]');
  assert.equal(briefing.lastRunAt, null);
  assert.equal(typeof briefing.generatedAt, 'string');
  assert.equal(briefing.context.hasAppData, true);
});

test('dailyBriefing — setelah decide(), recentDecisions berisi hasil terbaru + rekomendasi ter-resolve', async () => {
  const { ctx } = loadService(undefined);
  ctx.AIDecision.recommend.register('REC-SVC', { label: 'Cek Sesuatu', target: { page: 'x' } });
  ctx.AIDecision.rules.register(validRule());
  await ctx.AIDecision.decide({});
  const briefing = await ctx.AIService.dailyBriefing();
  assert.equal(briefing.recentDecisions.length, 1);
  assert.equal(briefing.recentDecisions[0].message, 'butuh perhatian');
  assert.equal(briefing.recentDecisions[0].recommendation.label, 'Cek Sesuatu');
  assert.ok(briefing.lastRunAt, 'lastRunAt harus terisi setelah decide()');
});

test('dailyBriefing — limit membatasi jumlah & urutan terbaru dulu', async () => {
  const { ctx } = loadService({
    decisionLog: [
      { id: 'd1', ruleId: 'R1', severity: 'info', message: 'satu', recommendationId: null, createdAt: 1000 },
      { id: 'd2', ruleId: 'R2', severity: 'info', message: 'dua', recommendationId: null, createdAt: 3000 },
      { id: 'd3', ruleId: 'R3', severity: 'info', message: 'tiga', recommendationId: null, createdAt: 2000 },
    ],
  });
  const briefing = await ctx.AIService.dailyBriefing({ limit: 2 });
  assert.equal(briefing.recentDecisions.length, 2);
  assert.equal(briefing.recentDecisions[0].message, 'dua'); // createdAt terbesar
  assert.equal(briefing.recentDecisions[1].message, 'tiga');
});

test('dailyBriefing — recommendations (bentuk standar) sejajar dgn recentDecisions, tidak menghapus field lama', async () => {
  const { ctx } = loadService(undefined);
  ctx.AIDecision.recommend.register('REC-SVC', { label: 'Cek Sesuatu', target: { page: 'x' } });
  ctx.AIDecision.rules.register(validRule());
  await ctx.AIDecision.decide({});
  const briefing = await ctx.AIService.dailyBriefing();
  assert.equal(briefing.recommendations.length, 1);
  assert.equal(briefing.recommendations[0].reason, 'butuh perhatian');
  assert.equal(briefing.recommendations[0].priority, 'HIGH'); // severity warning
  assert.equal(briefing.recommendations[0].actions[0], 'Cek Sesuatu'); // fallback dari recommend.label
  // field lama tetap ada (backward compatible)
  assert.equal(briefing.recentDecisions[0].recommendation.label, 'Cek Sesuatu');
});

test('dailyBriefing — ada order Cobek pending + LogisticsEngine dimuat: deliverySummary terisi dari order TERBARU yg belum dikirim', async () => {
  const D = {
    cobek: [
      { id: 1, items: [{ productId: 'p1', qty: 1 }], total: 100000, diskon: 0, delivered: false },
      { id: 3, items: [{ productId: 'p2', qty: 2 }], total: 250000, diskon: 5000, delivered: false }, // terbaru (id terbesar)
      { id: 2, items: [{ productId: 'p3', qty: 1 }], total: 500000, diskon: 0, delivered: true }, // sudah dikirim, harus diabaikan
    ],
  };
  const { ctx } = loadService(undefined, { withLogistics: true, D });
  const briefing = await ctx.AIService.dailyBriefing();
  assert.ok(briefing.deliverySummary, 'deliverySummary harus terisi');
  assert.equal(briefing.deliverySummary.sourceOrderId, 3); // order pending terbaru, BUKAN id 1 atau order yg sudah delivered
  assert.equal(briefing.deliverySummary.profit.totalPenjualan, 250000);
  assert.equal(briefing.deliverySummary.profit.diskon, 5000);
  // hasilnya sama persis dgn manggil LogisticsEngine.deliverySummary langsung dgn data order itu
  assert.deepEqual(
    briefing.deliverySummary.profit,
    ctx.LogisticsEngine.deliverySummary({ totalPenjualan: 250000, diskon: 5000 }).profit,
  );
});

test('dailyBriefing — tidak ada order Cobek pending: deliverySummary null (tidak menebak/reka data)', async () => {
  const D = { cobek: [{ id: 1, items: [{ productId: 'p1', qty: 1 }], total: 100000, diskon: 0, delivered: true }] };
  const { ctx } = loadService(undefined, { withLogistics: true, D });
  const briefing = await ctx.AIService.dailyBriefing();
  assert.equal(briefing.deliverySummary, null);
});

test('dailyBriefing — ada order pending tapi LogisticsEngine BELUM di-load: deliverySummary null, tidak throw', async () => {
  const D = { cobek: [{ id: 1, items: [{ productId: 'p1', qty: 1 }], total: 100000, diskon: 0, delivered: false }] };
  const { ctx } = loadService(undefined, { withLogistics: false, D });
  const briefing = await ctx.AIService.dailyBriefing();
  assert.equal(briefing.deliverySummary, null);
  assert.equal(typeof briefing.generatedAt, 'string'); // kontrak lama tetap jalan normal
});

test('dailyBriefing — tx-list-cashflow.js dimuat: financialSummary terisi sama persis dgn context.finance', async () => {
  const now = new Date();
  const D = {
    profile: {},
    transactions: [
      { type: 'income', amount: 9000000, date: now.toISOString() },
      { type: 'expense', amount: 3000000, date: now.toISOString() },
    ],
    bills: [],
  };
  const { ctx } = loadService(undefined, { withFinance: true, D });
  const briefing = await ctx.AIService.dailyBriefing();
  assert.ok(briefing.financialSummary, 'financialSummary harus terisi');
  assert.equal(briefing.financialSummary.available, true);
  // financialSummary adalah field TOP-LEVEL yang isinya sama persis dgn
  // context.finance (diangkat, bukan dihitung ulang/rumus baru)
  assert.equal(JSON.stringify(briefing.financialSummary), JSON.stringify(briefing.context.finance));
  assert.equal(typeof briefing.financialSummary.saldoNow, 'number');
});

test('dailyBriefing — tx-list-cashflow.js BELUM di-load: financialSummary null, tidak throw, kontrak lama tetap jalan', async () => {
  const { ctx } = loadService(undefined, { withFinance: false });
  const briefing = await ctx.AIService.dailyBriefing();
  assert.equal(briefing.financialSummary, null);
  assert.equal(briefing.context.finance.available, false);
  assert.equal(typeof briefing.generatedAt, 'string');
});

test('dailyBriefing — reminderSummary/targetSummary: TIDAK ada modul domain di-load sama sekali -> 6 entri tetap ada, semua available:false, tidak throw', async () => {
  const { ctx } = loadService(undefined);
  const briefing = await ctx.AIService.dailyBriefing();
  assert.ok(Array.isArray(briefing.reminderSummary));
  assert.equal(briefing.reminderSummary.length, 6);
  // urutan WAJIB Finance -> Vehicle -> Shop -> Asset -> Goal -> LifeOS
  // (docs/PRODUCT_DECISIONS.md § Reminder Priority). JSON.stringify (bukan
  // deepEqual langsung) krn array dibuat di realm vm sandbox berbeda,
  // sama alasan pola yang sudah dipakai test lain di file ini.
  assert.equal(JSON.stringify(briefing.reminderSummary.map((r) => r.domain)), JSON.stringify(['finance', 'vehicle', 'shop', 'asset', 'goal', 'lifeos']));
  briefing.reminderSummary.forEach((r) => {
    assert.equal(r.available, false);
    assert.equal(r.count, 0);
  });
  assert.equal(briefing.targetSummary, null);
});

test('dailyBriefing — reminderSummary: semua sumber domain di-load & trigger -> tiap domain available:true dgn count sesuai fixture', async () => {
  const D = {
    profile: {},
    vehicles: [{ id: 'v1', name: 'Vario 125' }],
    sparepartCats: [{ id: 'catA', name: 'Ganti Oli', intervalKm: 3000 }],
    kmLogs: [{ vehicleId: 'v1', date: '2026-06-01', km: 5000 }], // overdue: lewat 3000km
    bbmLogs: [], servisLogs: [],
    assets: [],
    products: [{ id: 'p1', name: 'Produk A', stock: 1 }], // <= default threshold 2 -> low stock
    cobek: [],
    targets: [{ id: 't1', name: 'Motor Baru', amount: 10000000, saved: 2000000 }], // progress 20% -> incomplete
    eduFunds: [], wishlist: [], reminders: [], refleksi: {}, workDays: [], tukangWorkers: [], tukangAbsensi: [],
  };
  const { ctx } = loadService(undefined, { withReminderSources: true, D });
  const briefing = await ctx.AIService.dailyBriefing();
  const byDomain = Object.fromEntries(briefing.reminderSummary.map((r) => [r.domain, r]));

  assert.equal(byDomain.vehicle.available, true);
  assert.equal(byDomain.vehicle.count, 1);
  assert.equal(byDomain.vehicle.items[0].vehicleName, 'Vario 125');

  assert.equal(byDomain.shop.available, true);
  assert.equal(byDomain.shop.count, 1);
  assert.equal(byDomain.shop.items[0].id, 'p1');

  assert.equal(byDomain.asset.available, true); // PajakAset ada, cuma totalZakat 0 (di bawah minThreshold)
  assert.equal(byDomain.asset.count, 0);

  assert.equal(byDomain.goal.available, true);
  assert.equal(byDomain.goal.count, 1); // t1 belum 100%
  assert.equal(byDomain.goal.items[0].id, 'target:t1');

  assert.equal(byDomain.lifeos.available, true);
  assert.ok(byDomain.lifeos.count >= 0);
});

test('dailyBriefing — targetSummary: reuse goalAdapterList(D) apa adanya, count & incompleteCount konsisten', async () => {
  const D = {
    profile: {},
    vehicles: [], sparepartCats: [], kmLogs: [], bbmLogs: [], servisLogs: [],
    assets: [], products: [], cobek: [],
    targets: [
      { id: 't1', name: 'Motor Baru', amount: 10000000, saved: 2000000 }, // 20%, incomplete
      { id: 't2', name: 'Dana Darurat', amount: 5000000, saved: 5000000 }, // 100%, complete
    ],
    eduFunds: [], wishlist: [], reminders: [], refleksi: {}, workDays: [], tukangWorkers: [], tukangAbsensi: [],
  };
  const { ctx } = loadService(undefined, { withReminderSources: true, D });
  const briefing = await ctx.AIService.dailyBriefing();
  assert.ok(briefing.targetSummary);
  assert.equal(briefing.targetSummary.count, 2);
  assert.equal(briefing.targetSummary.incompleteCount, 1);
  assert.equal(briefing.targetSummary.items.length, 2);
});

test('dailyBriefing — reminderSummary/targetSummary tidak mengganggu field lama (financialSummary/deliverySummary/recommendations tetap ada)', async () => {
  const { ctx } = loadService(undefined, { withLogistics: true, withFinance: true, D: { profile: {}, cobek: [], transactions: [], bills: [] } });
  const briefing = await ctx.AIService.dailyBriefing();
  assert.ok('financialSummary' in briefing);
  assert.ok('deliverySummary' in briefing);
  assert.ok('recommendations' in briefing);
  assert.ok('reminderSummary' in briefing);
  assert.ok('targetSummary' in briefing);
});

test('simulate() — recommendations tetap terisi meski tidak menulis store (What-If)', async () => {
  const { ctx } = loadService(undefined);
  ctx.AIDecision.rules.register(validRule());
  const result = await ctx.AIService.simulate({});
  assert.equal(result.simulated, true);
  assert.equal(result.decisions.length, 0); // tidak menulis decisionLog
  assert.equal(result.recommendations.length, 1);
  assert.equal(result.recommendations[0].reason, 'butuh perhatian');
  assert.equal(result.profitSimulation, null); // ctx.profit tidak diisi -> null, kontrak lama utuh
});


test('healthCheck — kondisi normal: ok true, semua check terisi', async () => {
  const { ctx } = loadService(undefined);
  ctx.AIDecision.rules.register(validRule());
  ctx.AIDecision.recommend.register('REC-SVC', { label: 'Cek Sesuatu' });
  const health = await ctx.AIService.healthCheck();
  assert.equal(health.ok, true);
  assert.equal(health.checks.busReady, true);
  assert.equal(health.checks.storeReady, true);
  assert.equal(health.checks.rulesRegistered, 1);
  assert.equal(health.checks.recommendationsRegistered, 1);
  assert.equal(health.checks.contextReady, true);
  assert.deepEqual(health.checks.duplicateRuleIds, []);
  assert.deepEqual(health.checks.duplicateRecommendations, []);
  // deadRuleIds berasal dari AIDecision.rules.getAll() (array literal di
  // dalam sandbox vm test harness) — beda realm dgn `[]` literal di file
  // test ini, jadi deepEqual/deepStrictEqual gagal walau isinya identik
  // (sama persis alasan test duplicateRecommendations di bawah pakai
  // JSON.stringify buat field `ids`, bukan bug di implementasi).
  assert.equal(JSON.stringify(health.checks.deadRuleIds), '[]');
  // brokenRecommendationRefs sama alasan realm dgn deadRuleIds di atas
  // (array dibuat di dalam sandbox vm test harness) -> JSON.stringify,
  // bukan deepEqual langsung.
  assert.equal(JSON.stringify(health.checks.brokenRecommendationRefs), '[]');
  assert.equal(JSON.stringify(health.checks.orphanedStorageKeys), JSON.stringify({ orphanedCooldownRuleIds: [], orphanedLearningDataRuleIds: [] }));
});

test('healthCheck — 0 rule terdaftar tetap ok (Sesi 2 memang belum ada rule domain)', async () => {
  const { ctx } = loadService(undefined);
  const health = await ctx.AIService.healthCheck();
  assert.equal(health.ok, true);
  assert.equal(health.checks.rulesRegistered, 0);
  assert.equal(health.checks.recommendationsRegistered, 0);
  assert.deepEqual(health.checks.duplicateRuleIds, []);
  assert.deepEqual(health.checks.duplicateRecommendations, []);
  assert.equal(JSON.stringify(health.checks.deadRuleIds), '[]');
  assert.equal(JSON.stringify(health.checks.brokenRecommendationRefs), '[]');
  assert.equal(JSON.stringify(health.checks.orphanedStorageKeys), JSON.stringify({ orphanedCooldownRuleIds: [], orphanedLearningDataRuleIds: [] }));
});

test('healthCheck — deadRuleIds mendeteksi rule terdaftar dgn enabled:false (Tahap 8, TODO.md #4)', async () => {
  const { ctx } = loadService(undefined);
  ctx.AIDecision.rules.register(validRule({ id: 'R-ACTIVE' })); // default enabled:true
  ctx.AIDecision.rules.register(validRule({ id: 'R-DEAD', enabled: false }));
  const health = await ctx.AIService.healthCheck();
  assert.equal(health.ok, true);
  assert.equal(health.checks.rulesRegistered, 2);
  assert.equal(JSON.stringify(health.checks.deadRuleIds), JSON.stringify(['R-DEAD']));
});

test('healthCheck — deadRuleIds kosong kalau semua rule enabled (default true)', async () => {
  const { ctx } = loadService(undefined);
  ctx.AIDecision.rules.register(validRule({ id: 'R-1' }));
  ctx.AIDecision.rules.register(validRule({ id: 'R-2' }));
  const health = await ctx.AIService.healthCheck();
  assert.equal(JSON.stringify(health.checks.deadRuleIds), '[]');
});

test('healthCheck — deadRuleIds TIDAK ikut deadRuleIds kalau rule di-unregister (bukan cuma dinonaktifkan)', async () => {
  const { ctx } = loadService(undefined);
  ctx.AIDecision.rules.register(validRule({ id: 'R-GONE', enabled: false }));
  ctx.AIDecision.rules.unregister('R-GONE');
  const health = await ctx.AIService.healthCheck();
  assert.equal(health.checks.rulesRegistered, 0);
  assert.equal(JSON.stringify(health.checks.deadRuleIds), '[]');
});

test('healthCheck — duplicateRuleIds kosong walau register() dipanggil 2x id sama (register() sendiri sudah menolak duplikat)', async () => {
  const { ctx } = loadService(undefined);
  const registeredFirst = ctx.AIDecision.rules.register(validRule({ id: 'R-DUP' }));
  const registeredSecond = ctx.AIDecision.rules.register(validRule({ id: 'R-DUP', category: 'lain' }));
  assert.equal(registeredFirst, true);
  assert.equal(registeredSecond, false); // ditolak duduluan oleh register()
  const health = await ctx.AIService.healthCheck();
  assert.equal(health.ok, true);
  assert.equal(health.checks.rulesRegistered, 1);
  assert.deepEqual(health.checks.duplicateRuleIds, []); // tidak ada yg lolos jadi duplikat nyata
});

test('healthCheck — duplicateRecommendations mendeteksi 2 id berbeda dgn label+target persis sama', async () => {
  const { ctx } = loadService(undefined);
  ctx.AIDecision.recommend.register('REC-A', { label: 'Cek Saldo', target: { page: 'finance' } });
  ctx.AIDecision.recommend.register('REC-B', { label: 'Cek Saldo', target: { page: 'finance' } });
  ctx.AIDecision.recommend.register('REC-C', { label: 'Cek Stok', target: { page: 'shop' } }); // unik, tidak ikut kena
  const health = await ctx.AIService.healthCheck();
  assert.equal(health.ok, true);
  assert.equal(health.checks.recommendationsRegistered, 3);
  assert.equal(health.checks.duplicateRecommendations.length, 1);
  assert.equal(health.checks.duplicateRecommendations[0].label, 'Cek Saldo');
  assert.equal(JSON.stringify(health.checks.duplicateRecommendations[0].ids.slice().sort()), JSON.stringify(['REC-A', 'REC-B']));
});

test('healthCheck — recommend dgn label sama tapi target berbeda TIDAK dianggap duplikat', async () => {
  const { ctx } = loadService(undefined);
  ctx.AIDecision.recommend.register('REC-A', { label: 'Cek Saldo', target: { page: 'finance' } });
  ctx.AIDecision.recommend.register('REC-B', { label: 'Cek Saldo', target: { page: 'shop' } });
  const health = await ctx.AIService.healthCheck();
  assert.deepEqual(health.checks.duplicateRecommendations, []);
});

// Sesi 20 (TODO.md #4b, Tahap 8) — Broken Reference: recommendationId yang
// PERNAH tercatat di decisionLog (hasil rule trigger nyata lewat decide())
// tapi tidak/tidak lagi terdaftar di AIDecision.recommend.
test('healthCheck — brokenRecommendationRefs mendeteksi recommendationId di decisionLog yang tidak terdaftar di AIDecision.recommend', async () => {
  const { ctx } = loadService(undefined);
  ctx.AIDecision.rules.register(validRule({ id: 'R-BROKEN', action: () => ({ message: 'x', recommendationId: 'REC-GHOST' }) }));
  // REC-GHOST sengaja TIDAK di-register ke ctx.AIDecision.recommend.
  await ctx.AIDecision.decide({});
  const health = await ctx.AIService.healthCheck();
  assert.equal(JSON.stringify(health.checks.brokenRecommendationRefs), JSON.stringify(['REC-GHOST']));
});

test('healthCheck — brokenRecommendationRefs kosong kalau recommendationId di decisionLog terdaftar', async () => {
  const { ctx } = loadService(undefined);
  ctx.AIDecision.rules.register(validRule()); // action() -> recommendationId 'REC-SVC'
  ctx.AIDecision.recommend.register('REC-SVC', { label: 'Cek Sesuatu' });
  await ctx.AIDecision.decide({});
  const health = await ctx.AIService.healthCheck();
  assert.equal(JSON.stringify(health.checks.brokenRecommendationRefs), '[]');
});

test('healthCheck — brokenRecommendationRefs kosong kalau belum ada decisionLog sama sekali (belum pernah decide())', async () => {
  const { ctx } = loadService(undefined);
  ctx.AIDecision.rules.register(validRule({ id: 'R-NEVER-RUN', action: () => ({ message: 'x', recommendationId: 'REC-GHOST' }) }));
  const health = await ctx.AIService.healthCheck();
  assert.equal(JSON.stringify(health.checks.brokenRecommendationRefs), '[]');
});

test('healthCheck — brokenRecommendationRefs dedup: id broken yang sama muncul di 2 decision cuma dihitung sekali', async () => {
  const { ctx } = loadService(undefined);
  ctx.AIDecision.rules.register(validRule({ id: 'R-BROKEN-1', action: () => ({ message: 'x', recommendationId: 'REC-GHOST' }) }));
  ctx.AIDecision.rules.register(validRule({ id: 'R-BROKEN-2', action: () => ({ message: 'y', recommendationId: 'REC-GHOST' }) }));
  await ctx.AIDecision.decide({}); // kedua rule trigger dalam 1 decide() -> 2 decision, recommendationId sama
  const health = await ctx.AIService.healthCheck();
  assert.equal(JSON.stringify(health.checks.brokenRecommendationRefs), JSON.stringify(['REC-GHOST']));
});

// Sesi 21 (TODO.md #4d, Tahap 8) — Storage Audit: ruleId di
// AIStore.ruleCooldowns/learningData yang rule-nya sudah di-unregister().
test('healthCheck — orphanedStorageKeys kosong kalau rule yang trigger & dapat feedback masih terdaftar', async () => {
  const { ctx } = loadService(undefined);
  ctx.AIDecision.rules.register(validRule({ id: 'R-LIVE' }));
  await ctx.AIDecision.decide({}); // isi ruleCooldowns['R-LIVE']
  await ctx.AIDecision.learn.recordOutcome('R-LIVE', 'accepted'); // isi learningData['R-LIVE']
  const health = await ctx.AIService.healthCheck();
  assert.equal(JSON.stringify(health.checks.orphanedStorageKeys), JSON.stringify({ orphanedCooldownRuleIds: [], orphanedLearningDataRuleIds: [] }));
});

test('healthCheck — orphanedStorageKeys mendeteksi ruleCooldowns & learningData yang rule-nya sudah di-unregister()', async () => {
  const { ctx } = loadService(undefined);
  ctx.AIDecision.rules.register(validRule({ id: 'R-GONE' }));
  await ctx.AIDecision.decide({}); // isi ruleCooldowns['R-GONE']
  await ctx.AIDecision.learn.recordOutcome('R-GONE', 'rejected'); // isi learningData['R-GONE']
  ctx.AIDecision.rules.unregister('R-GONE'); // unregister() TIDAK ikut membersihkan storage
  const health = await ctx.AIService.healthCheck();
  assert.equal(health.ok, true); // informasional, tidak menjatuhkan ok
  assert.equal(health.checks.rulesRegistered, 0);
  assert.equal(JSON.stringify(health.checks.orphanedStorageKeys), JSON.stringify({ orphanedCooldownRuleIds: ['R-GONE'], orphanedLearningDataRuleIds: ['R-GONE'] }));
});

test('healthCheck — orphanedStorageKeys tidak dobel-hitung ruleId yang sama di 2 field kalau memang orphan di keduanya', async () => {
  const { ctx } = loadService(undefined);
  ctx.AIDecision.rules.register(validRule({ id: 'R-A' }));
  ctx.AIDecision.rules.register(validRule({ id: 'R-B', action: () => ({ message: 'y' }) }));
  await ctx.AIDecision.decide({}); // isi ruleCooldowns utk R-A & R-B
  await ctx.AIDecision.learn.recordOutcome('R-A', 'accepted'); // isi learningData HANYA utk R-A
  ctx.AIDecision.rules.unregister('R-A');
  ctx.AIDecision.rules.unregister('R-B');
  const health = await ctx.AIService.healthCheck();
  assert.equal(JSON.stringify(health.checks.orphanedStorageKeys.orphanedCooldownRuleIds.slice().sort()), JSON.stringify(['R-A', 'R-B']));
  assert.equal(JSON.stringify(health.checks.orphanedStorageKeys.orphanedLearningDataRuleIds), JSON.stringify(['R-A']));
});

test('healthCheck — orphanedStorageKeys kosong kalau belum pernah ada rule trigger/feedback sama sekali', async () => {
  const { ctx } = loadService(undefined);
  const health = await ctx.AIService.healthCheck();
  assert.equal(JSON.stringify(health.checks.orphanedStorageKeys), JSON.stringify({ orphanedCooldownRuleIds: [], orphanedLearningDataRuleIds: [] }));
});

test('healthCheck — checks.performance terisi 5 field (ms number >= 0) kondisi normal (rule+recommendation terdaftar)', async () => {
  const { ctx } = loadService(undefined);
  ctx.AIDecision.rules.register(validRule());
  ctx.AIDecision.recommend.register('REC-SVC', { label: 'Cek Sesuatu' });
  const health = await ctx.AIService.healthCheck();
  assert.equal(health.ok, true);
  const perf = health.checks.performance;
  ['contextCollectorMs', 'ruleEvaluationMs', 'recommendationMs', 'dailyBriefingMs', 'simulationMs'].forEach((field) => {
    assert.equal(typeof perf[field], 'number', `${field} harus number`);
    assert.ok(perf[field] >= 0, `${field} harus >= 0`);
  });
});

test('healthCheck — checks.performance tetap terisi walau 0 rule/recommendation & belum pernah decide() (decisionLog kosong)', async () => {
  const { ctx } = loadService(undefined);
  const health = await ctx.AIService.healthCheck();
  assert.equal(health.ok, true);
  const perf = health.checks.performance;
  ['contextCollectorMs', 'ruleEvaluationMs', 'recommendationMs', 'dailyBriefingMs', 'simulationMs'].forEach((field) => {
    assert.equal(typeof perf[field], 'number', `${field} harus tetap number walau belum ada decisionLog`);
  });
});

test('healthCheck — performance tidak menandai cooldown & tidak menulis IDBStore (murni pengukuran read-only)', async () => {
  const { ctx, idbCalls } = loadService(undefined);
  ctx.AIDecision.rules.register(validRule());
  await ctx.AIService.healthCheck();
  assert.equal(idbCalls.length, 0, 'healthCheck() tidak boleh menulis IDBStore sama sekali');
  const store = ctx.aiGetStore();
  assert.equal(JSON.stringify((store && store.ruleCooldowns) || {}), '{}', 'ruleEvaluationMs harus dipanggil dgn simulated:true (tidak menandai cooldown nyata)');
});

test('healthCheck — checks.performance.recommendationMs tetap terukur pakai decision terakhir dari decisionLog kalau sudah pernah decide()', async () => {
  const { ctx } = loadService(undefined);
  ctx.AIDecision.rules.register(validRule());
  ctx.AIDecision.recommend.register('REC-SVC', { label: 'Cek Sesuatu' });
  await ctx.AIDecision.decide({});
  const health = await ctx.AIService.healthCheck();
  assert.equal(typeof health.checks.performance.recommendationMs, 'number');
});

test('simulate — meneruskan ke AIDecision.decide dengan simulated=true, tidak menulis IDBStore', async () => {
  const { ctx, idbCalls } = loadService(undefined);
  ctx.AIDecision.rules.register(validRule());
  const result = await ctx.AIService.simulate({});
  assert.equal(result.simulated, true);
  assert.equal(result.triggered.length, 1);
  assert.equal(idbCalls.length, 0);
});

test('simulate({profit}) — LogisticsEngine dimuat & ctx.profit diisi: profitSimulation berisi breakdown dari LogisticsEngine.profitCalculator', async () => {
  const { ctx } = loadService(undefined, { withLogistics: true });
  const result = await ctx.AIService.simulate({
    profit: { totalPenjualan: 1000000, diskon: 0, ongkir: 20000, biayaBBM: 30000, biayaOperasional: 50000 },
  });
  assert.equal(result.simulated, true);
  assert.ok(result.profitSimulation, 'profitSimulation harus terisi');
  assert.equal(result.profitSimulation.penjualanBersih, 1000000);
  assert.equal(result.profitSimulation.profitBersih, 900000);
  assert.equal(result.profitSimulation.marginPct, 90);
  // hasilnya sama persis dgn manggil LogisticsEngine.profitCalculator langsung
  assert.deepEqual(
    result.profitSimulation,
    ctx.LogisticsEngine.profitCalculator({ totalPenjualan: 1000000, diskon: 0, ongkir: 20000, biayaBBM: 30000, biayaOperasional: 50000 }),
  );
});

test('simulate({}) — LogisticsEngine dimuat tapi ctx.profit tidak diisi: profitSimulation tetap null (tidak menebak default)', async () => {
  const { ctx } = loadService(undefined, { withLogistics: true });
  const result = await ctx.AIService.simulate({});
  assert.equal(result.profitSimulation, null);
});

test('simulate({profit}) — LogisticsEngine BELUM di-load: profitSimulation null, tidak throw (guard typeof)', async () => {
  const { ctx } = loadService(undefined, { withLogistics: false });
  const result = await ctx.AIService.simulate({ profit: { totalPenjualan: 500000 } });
  assert.equal(result.profitSimulation, null);
  assert.equal(result.simulated, true); // kontrak lama tetap jalan normal
});

// Sesi 33 (Tahap 7 — Delivery Simulation, TARGET sesi ini): simulate() dihubungkan ke
// LogisticsEngine.deliverySummary() (orkestrator §9, Tahap 3) — bukan cuma profitCalculator()
// (Sesi 15) — supaya 1 pemanggilan simulate() bisa nguji skenario BBM/ongkir/margin/profit
// SEKALIGUS, seeded dari order Cobek pending nyata (sumber sama persis dgn
// dailyBriefing().deliverySummary, reuse _aiLastPendingCobekOrder() apa adanya).
const cobekPendingD = {
  cobek: [
    { id: 5, items: [{ productId: 'p1', qty: 1 }], total: 300000, diskon: 10000, delivered: false },
    { id: 9, items: [{ productId: 'p2', qty: 2 }], total: 800000, diskon: 0, delivered: false }, // terbaru
    { id: 2, items: [{ productId: 'p3', qty: 1 }], total: 999999, diskon: 0, delivered: true }, // diabaikan
  ],
};

test('simulate({}) — ada order Cobek pending + LogisticsEngine dimuat, TANPA ctx.delivery: deliverySimulation terisi dari data NYATA order terbaru', async () => {
  const { ctx } = loadService(undefined, { withLogistics: true, D: cobekPendingD });
  const result = await ctx.AIService.simulate({});
  assert.ok(result.deliverySimulation, 'deliverySimulation harus terisi');
  assert.equal(result.deliverySimulation.sourceOrderId, 9); // order pending terbaru (id terbesar), bukan yg delivered
  assert.equal(result.deliverySimulation.profit.totalPenjualan, 800000);
  assert.equal(result.deliverySimulation.profit.diskon, 0);
  // hasilnya sama persis dgn manggil LogisticsEngine.deliverySummary langsung dgn data order itu
  assert.deepEqual(
    result.deliverySimulation.profit,
    ctx.LogisticsEngine.deliverySummary({ totalPenjualan: 800000, diskon: 0 }).profit,
  );
});

test('simulate({delivery}) — skenario perubahan harga BBM ditimpa di atas baseline order nyata', async () => {
  const { ctx } = loadService(undefined, { withLogistics: true, D: cobekPendingD });
  const baseline = await ctx.AIService.simulate({});
  const withMahalBBM = await ctx.AIService.simulate({ delivery: { jarak: 50, konsumsiKmPerLiter: 25, hargaBBM: 20000 } });
  assert.equal(withMahalBBM.deliverySimulation.estimasiBBM.hargaBBM, 20000);
  assert.equal(withMahalBBM.deliverySimulation.estimasiBBM.biayaBBM, Math.round(50 / 25 * 20000));
  // totalPenjualan/diskon (data nyata) TETAP dari order, TIDAK ikut hilang krn ctx.delivery parsial
  assert.equal(withMahalBBM.deliverySimulation.profit.totalPenjualan, 800000);
  // biaya BBM lebih tinggi -> profit bersih lebih rendah dibanding baseline tanpa skenario BBM
  assert.ok(withMahalBBM.deliverySimulation.profit.profitBersih < baseline.deliverySimulation.profit.profitBersih);
});

test('simulate({delivery}) — skenario perubahan ongkir (jarak/biayaPerKm) & margin ditimpa di atas baseline nyata', async () => {
  const { ctx } = loadService(undefined, { withLogistics: true, D: cobekPendingD });
  const result = await ctx.AIService.simulate({
    delivery: { jarak: 30, biayaPerKm: 5000, marginPct: 15 },
  });
  assert.equal(result.deliverySimulation.ongkir.marginPct, 15);
  assert.ok(result.deliverySimulation.ongkir.totalOngkir > 0);
  assert.equal(result.deliverySimulation.profit.totalPenjualan, 800000); // baseline nyata tetap dipakai
});

test('simulate({delivery}) — TANPA order pending, ctx.delivery berdiri sendiri sbg skenario manual (bukan reka data)', async () => {
  const { ctx } = loadService(undefined, { withLogistics: true, D: { cobek: [] } });
  const result = await ctx.AIService.simulate({
    delivery: { totalPenjualan: 400000, diskon: 0, marginPct: 10 },
  });
  assert.ok(result.deliverySimulation, 'deliverySimulation tetap bisa jalan murni dari ctx.delivery manual');
  assert.equal(result.deliverySimulation.sourceOrderId, undefined); // tidak ada order asli, tidak menebak id
  assert.equal(result.deliverySimulation.profit.totalPenjualan, 400000);
});

test('simulate({}) — tidak ada order pending & ctx.delivery tidak diisi: deliverySimulation null (tidak menebak data)', async () => {
  const { ctx } = loadService(undefined, { withLogistics: true, D: { cobek: [] } });
  const result = await ctx.AIService.simulate({});
  assert.equal(result.deliverySimulation, null);
});

test('simulate({delivery}) — LogisticsEngine BELUM di-load: deliverySimulation null, tidak throw', async () => {
  const { ctx } = loadService(undefined, { withLogistics: false, D: cobekPendingD });
  const result = await ctx.AIService.simulate({ delivery: { marginPct: 10 } });
  assert.equal(result.deliverySimulation, null);
  assert.equal(result.simulated, true); // kontrak lama tetap jalan normal
});

test('simulate({profit, delivery}) — profitSimulation (Sesi 15) & deliverySimulation (Sesi 33) berdampingan, tidak saling mengganggu', async () => {
  const { ctx } = loadService(undefined, { withLogistics: true, D: cobekPendingD });
  const result = await ctx.AIService.simulate({
    profit: { totalPenjualan: 1000000, diskon: 0, ongkir: 20000, biayaBBM: 30000, biayaOperasional: 50000 },
    delivery: { marginPct: 20 },
  });
  assert.ok(result.profitSimulation, 'profitSimulation (kontrak lama) tetap terisi');
  assert.equal(result.profitSimulation.totalPenjualan, 1000000);
  assert.ok(result.deliverySimulation, 'deliverySimulation (baru) juga terisi');
  assert.equal(result.deliverySimulation.ongkir.marginPct, 20);
  assert.equal(result.deliverySimulation.profit.totalPenjualan, 800000); // dari order nyata, bukan ctx.profit
});

// Sesi 45 (Tahap 7 — Scenario Engine, TARGET sesi ini): simulateScenarios()
// builder skenario terstruktur — murni orkestrasi berulang di atas simulate()
// yang sudah ada (Sesi 15/33), TIDAK ada rule/engine baru.
test('simulateScenarios([]) — array kosong balik [], tidak throw', async () => {
  const { ctx } = loadService(undefined);
  const results = await ctx.AIService.simulateScenarios([]);
  // JSON.stringify (bukan deepEqual langsung) krn array dibuat di realm vm
  // sandbox berbeda, sama pola yang sudah dipakai test lain di file ini
  // (lihat catatan test dailyBriefing reminderSummary di atas).
  assert.equal(JSON.stringify(results), '[]');
});

test('simulateScenarios(bukan array) — undefined/null/object balik [], tidak throw', async () => {
  const { ctx } = loadService(undefined);
  assert.equal(JSON.stringify(await ctx.AIService.simulateScenarios(undefined)), '[]');
  assert.equal(JSON.stringify(await ctx.AIService.simulateScenarios(null)), '[]');
  assert.equal(JSON.stringify(await ctx.AIService.simulateScenarios({ not: 'array' })), '[]');
});

test('simulateScenarios([{name,ctx}]) — bentuk terstruktur, name dipakai apa adanya, simulate(ctx) dipanggil per skenario', async () => {
  const { ctx } = loadService(undefined, { withLogistics: true });
  ctx.AIDecision.recommend.register('REC-SC', { label: 'Cek Sesuatu' });
  const results = await ctx.AIService.simulateScenarios([
    { name: 'BBM Naik', ctx: { profit: { totalPenjualan: 500000, diskon: 0, ongkir: 10000, biayaBBM: 40000, biayaOperasional: 10000 } } },
    { name: 'BBM Normal', ctx: { profit: { totalPenjualan: 500000, diskon: 0, ongkir: 10000, biayaBBM: 10000, biayaOperasional: 10000 } } },
  ]);
  assert.equal(results.length, 2);
  assert.equal(results[0].name, 'BBM Naik');
  assert.equal(results[0].error, null);
  assert.ok(results[0].result.profitSimulation, 'profitSimulation tetap terisi lewat simulate() apa adanya');
  assert.equal(results[1].name, 'BBM Normal');
  assert.notEqual(results[0].result.profitSimulation.profitBersih, results[1].result.profitSimulation.profitBersih);
});

test('simulateScenarios([ctxPolos]) — tanpa name/ctx wrapper, name default "Skenario N" berurutan', async () => {
  const { ctx } = loadService(undefined);
  const results = await ctx.AIService.simulateScenarios([{}, {}, {}]);
  assert.equal(results.length, 3);
  assert.equal(results[0].name, 'Skenario 1');
  assert.equal(results[1].name, 'Skenario 2');
  assert.equal(results[2].name, 'Skenario 3');
  results.forEach((r) => assert.equal(r.error, null));
});

test('simulateScenarios — name kosong/bukan string tetap fallback ke "Skenario N", ctx kosong tetap dipakai simulate({})', async () => {
  const { ctx } = loadService(undefined);
  const results = await ctx.AIService.simulateScenarios([
    { name: '   ' }, // name kosong setelah trim -> fallback
    { name: 123, ctx: {} }, // name bukan string -> fallback
  ]);
  assert.equal(results[0].name, 'Skenario 1');
  assert.equal(results[1].name, 'Skenario 2');
});

test('simulateScenarios — 1 skenario error tertangkap per-item, TIDAK menjatuhkan skenario lain dalam batch', async () => {
  const { ctx } = loadService(undefined);
  const originalSimulate = ctx.AIService.simulate;
  let call = 0;
  ctx.AIService.simulate = async function patchedSimulate(c) {
    call += 1;
    if (call === 1) throw new Error('boom skenario pertama');
    return originalSimulate.call(ctx.AIService, c);
  };
  const results = await ctx.AIService.simulateScenarios([{ name: 'Gagal' }, { name: 'Sukses' }]);
  assert.equal(results[0].name, 'Gagal');
  assert.equal(results[0].result, null);
  assert.equal(results[0].error, 'boom skenario pertama');
  assert.equal(results[1].name, 'Sukses');
  assert.equal(results[1].error, null);
  assert.ok(results[1].result);
});

test('simulateScenarios — urutan hasil di array PERSIS sama dgn urutan input (dijalankan berurutan, bukan Promise.all)', async () => {
  const { ctx } = loadService(undefined);
  const results = await ctx.AIService.simulateScenarios([
    { name: 'Pertama' }, { name: 'Kedua' }, { name: 'Ketiga' },
  ]);
  assert.equal(JSON.stringify(results.map((r) => r.name)), JSON.stringify(['Pertama', 'Kedua', 'Ketiga']));
});

test('simulateScenarios — kontrak simulate() lama TIDAK berubah sama sekali (dipanggil langsung, hasil identik)', async () => {
  const { ctx } = loadService(undefined, { withLogistics: true });
  const direct = await ctx.AIService.simulate({ profit: { totalPenjualan: 300000, diskon: 0, ongkir: 5000, biayaBBM: 5000, biayaOperasional: 5000 } });
  const viaScenarios = await ctx.AIService.simulateScenarios([
    { ctx: { profit: { totalPenjualan: 300000, diskon: 0, ongkir: 5000, biayaBBM: 5000, biayaOperasional: 5000 } } },
  ]);
  assert.equal(viaScenarios[0].result.profitSimulation.profitBersih, direct.profitSimulation.profitBersih);
});

test('buildPrompt — merangkai tujuan, waktu, ringkasan keputusan, dan extra info jadi teks', async () => {
  const { ctx } = loadService(undefined);
  ctx.AIDecision.recommend.register('REC-SVC', { label: 'Cek Sesuatu' });
  ctx.AIDecision.rules.register(validRule());
  await ctx.AIDecision.decide({});
  const prompt = await ctx.AIService.buildPrompt('daily briefing', { catatan: 'halo' });
  assert.ok(prompt.includes('Tujuan: daily briefing'));
  assert.ok(prompt.includes('butuh perhatian'));
  assert.ok(prompt.includes('catatan'));
  assert.ok(prompt.includes('halo'));
});

test('buildPrompt — purpose kosong/tidak diisi tidak melempar, tetap ada teks default', async () => {
  const { ctx } = loadService(undefined);
  const prompt = await ctx.AIService.buildPrompt();
  assert.ok(prompt.includes('(tidak ditentukan)'));
});
