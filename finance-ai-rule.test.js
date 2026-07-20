'use strict';
// tests/finance-ai-rule.test.js — Smart Delivery Engine, Sesi 7: rule domain
// FINANCE pertama untuk AIDecision (lihat "Status nyata setelah Sesi 6" &
// "Mulai dari mana" di RENCANA-SESI-RINGKAS.md — bus sudah hidup dari Sesi 6
// tapi AIDecision.rules._rules masih kosong sampai sesi ini).
//
// Fungsi yang dites (semua baru, modules/finance/tx-list-cashflow.js):
//   - getAIFinanceOverspendThreshold()/setAIFinanceOverspendThreshold(pct)
//   - registerFinanceAIRules() — idempotent, guard AIDecision belum ada
//   - rule 'finance-overspend-month' end-to-end lewat AIDecision.rules.evaluate()
//
// Tidak menguji ulang computeCashflowForecast() sendiri (sudah dites di
// tests/tx-list-cashflow-deltx.test.js) — expAvg di sini dibuat sederhana
// (1 transaksi expense bulan berjalan) supaya rasio monthExpense/expAvg
// gampang dihitung manual di assertion.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');

function makeCtx(D, opts = {}) {
  return loadSource(
    ['modules/ai/ai-core.js', 'modules/ai/ai-decision-engine.js', 'modules/finance/tx-list-cashflow.js'],
    { D, totalSaldoAkun: opts.totalSaldoAkun || (() => 1000000), IDBStore: { async get() { return null; }, async set() { return true; } } },
    ['AIDecision'],
  );
}

// D dengan expAvg (computeCashflowForecast, months default 3 tanpa
// BudgetReko) = 3.000.000/3 = 1.000.000. monthExpense (transaksi bulan
// berjalan) juga 3.000.000 di baseD() -> rasio 300%, di atas ambang default
// 150% -> rule trigger.
function baseD(overrides = {}) {
  const now = new Date();
  return Object.assign({
    profile: {},
    transactions: [
      { type: 'income', amount: 9000000, date: now.toISOString() },
      { type: 'expense', amount: 3000000, date: now.toISOString() },
    ],
    bills: [],
  }, overrides);
}

// ================= threshold getter/setter =================

test('getAIFinanceOverspendThreshold() — default 150 kalau belum diatur', () => {
  const ctx = makeCtx(baseD());
  assert.equal(ctx.getAIFinanceOverspendThreshold(), 150);
});

test('getAIFinanceOverspendThreshold() — pakai D.profile.aiFinanceOverspendThresholdPct kalau ada & valid', () => {
  const ctx = makeCtx(baseD({ profile: { aiFinanceOverspendThresholdPct: 200 } }));
  assert.equal(ctx.getAIFinanceOverspendThreshold(), 200);
});

test('getAIFinanceOverspendThreshold() — nilai < 100 di D.profile dianggap tidak valid, fallback default', () => {
  const ctx = makeCtx(baseD({ profile: { aiFinanceOverspendThresholdPct: 50 } }));
  assert.equal(ctx.getAIFinanceOverspendThreshold(), 150);
});

test('setAIFinanceOverspendThreshold(pct) — set & clamp minimum 100', () => {
  const ctx = makeCtx(baseD());
  assert.equal(ctx.setAIFinanceOverspendThreshold(180), 180);
  assert.equal(ctx.D.profile.aiFinanceOverspendThresholdPct, 180);
  assert.equal(ctx.setAIFinanceOverspendThreshold(10), 150); // di bawah 100 -> fallback default
  assert.equal(ctx.setAIFinanceOverspendThreshold('abc'), 150); // bukan angka -> fallback default
});

// ================= registerFinanceAIRules() =================

test('registerFinanceAIRules() — berhasil daftarkan rule ke AIDecision, idempotent', () => {
  const ctx = makeCtx(baseD());
  assert.equal(ctx.registerFinanceAIRules(), true);
  assert.equal(ctx.AIDecision.rules.getAll().some((r) => r.id === 'finance-overspend-month'), true);
  // Panggil ke-2 -> false (guard _financeAIRulesRegistered), tidak dobel-daftar.
  assert.equal(ctx.registerFinanceAIRules(), false);
  assert.equal(ctx.AIDecision.rules.getAll().filter((r) => r.id === 'finance-overspend-month').length, 1);
});

test('registerFinanceAIRules() — return false kalau AIDecision belum dimuat (guard urutan load)', () => {
  const ctx = loadSource(['modules/finance/tx-list-cashflow.js'], { D: baseD(), totalSaldoAkun: () => 1000000 });
  assert.equal(ctx.registerFinanceAIRules(), false);
});

// ================= rule end-to-end lewat AIDecision.rules.evaluate() =================

test('rule finance-overspend-month — trigger kalau pengeluaran bulan ini > ambang % dari rata-rata', () => {
  const ctx = makeCtx(baseD()); // rasio 300% > default 150%
  ctx.registerFinanceAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  assert.equal(triggered.length, 1);
  assert.equal(triggered[0].ruleId, 'finance-overspend-month');
  assert.equal(triggered[0].category, 'finance');
  assert.equal(triggered[0].severity, 'warning');
  assert.match(triggered[0].message, /150%/);
  assert.match(triggered[0].message, /300%|3\.000\.000/); // pct atau nominal ada di pesan
});

test('rule finance-overspend-month — TIDAK trigger kalau di bawah ambang', () => {
  // expense merata 900rb di bulan berjalan + 2 bulan sebelumnya (semua masuk
  // window computeCashflowForecast) -> expAvg = 2.700.000/3 = 900.000,
  // monthExpense = 900.000 -> rasio 100%, di bawah ambang default 150%.
  const now = new Date();
  const m1 = new Date(now.getFullYear(), now.getMonth() - 1, 10);
  const m2 = new Date(now.getFullYear(), now.getMonth() - 2, 10);
  const ctx = makeCtx(baseD({
    transactions: [
      { type: 'income', amount: 9000000, date: now.toISOString() },
      { type: 'expense', amount: 900000, date: now.toISOString() },
      { type: 'expense', amount: 900000, date: m1.toISOString() },
      { type: 'expense', amount: 900000, date: m2.toISOString() },
    ],
  }));
  ctx.registerFinanceAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  assert.equal(triggered.length, 0);
});

test('rule finance-overspend-month — ambang custom (setAIFinanceOverspendThreshold) dihormati', () => {
  const ctx = makeCtx(baseD()); // rasio tetap 300%
  ctx.setAIFinanceOverspendThreshold(400); // naikkan ambang di atas rasio aktual
  ctx.registerFinanceAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  assert.equal(triggered.length, 0); // 300% < ambang custom 400% -> tidak trigger
});

test('rule finance-overspend-month — TIDAK trigger kalau belum ada histori pengeluaran (expAvg 0)', () => {
  const ctx = makeCtx(baseD({ transactions: [] }));
  ctx.registerFinanceAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  assert.equal(triggered.length, 0);
});

// ================= rule kedua: finance-low-balance =================
// expAvg baseD() = 1.000.000 (3jt/3 bulan) -> ambang low-balance = 500.000.

test('registerFinanceAIRules() — juga daftarkan rule finance-low-balance', () => {
  const ctx = makeCtx(baseD());
  ctx.registerFinanceAIRules();
  assert.equal(ctx.AIDecision.rules.getAll().some((r) => r.id === 'finance-low-balance'), true);
});

test('rule finance-low-balance — trigger kalau saldo < setengah rata-rata pengeluaran bulanan', () => {
  const ctx = makeCtx(baseD(), { totalSaldoAkun: () => 400000 }); // < 500.000
  ctx.registerFinanceAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  const rule = triggered.find((r) => r.ruleId === 'finance-low-balance');
  assert.ok(rule, 'rule finance-low-balance harusnya trigger');
  assert.equal(rule.category, 'finance');
  assert.match(rule.message, /400\.000/);
});

test('rule finance-low-balance — TIDAK trigger kalau saldo >= setengah rata-rata pengeluaran bulanan', () => {
  const ctx = makeCtx(baseD(), { totalSaldoAkun: () => 600000 }); // >= 500.000
  ctx.registerFinanceAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  assert.equal(triggered.some((r) => r.ruleId === 'finance-low-balance'), false);
});

test('rule finance-low-balance — TIDAK trigger kalau belum ada histori pengeluaran (expAvg 0)', () => {
  const ctx = makeCtx(baseD({ transactions: [] }), { totalSaldoAkun: () => 0 });
  ctx.registerFinanceAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  assert.equal(triggered.some((r) => r.ruleId === 'finance-low-balance'), false);
});

// ============ getAIFinanceLowBalanceMultiplier()/setAIFinanceLowBalanceMultiplier() ============

test('getAIFinanceLowBalanceMultiplier() — default 0.5 kalau belum diatur', () => {
  const ctx = makeCtx(baseD());
  assert.equal(ctx.getAIFinanceLowBalanceMultiplier(), 0.5);
});

test('getAIFinanceLowBalanceMultiplier() — pakai D.profile.aiFinanceLowBalanceMultiplier kalau valid', () => {
  const ctx = makeCtx(baseD({ profile: { aiFinanceLowBalanceMultiplier: 1 } }));
  assert.equal(ctx.getAIFinanceLowBalanceMultiplier(), 1);
});

test('getAIFinanceLowBalanceMultiplier() — di luar rentang 0.1-2 fallback default', () => {
  const ctx = makeCtx(baseD({ profile: { aiFinanceLowBalanceMultiplier: 5 } }));
  assert.equal(ctx.getAIFinanceLowBalanceMultiplier(), 0.5);
});

test('setAIFinanceLowBalanceMultiplier(mult) — set & clamp rentang 0.1-2', () => {
  const ctx = makeCtx(baseD());
  assert.equal(ctx.setAIFinanceLowBalanceMultiplier(1), 1);
  assert.equal(ctx.D.profile.aiFinanceLowBalanceMultiplier, 1);
  assert.equal(ctx.setAIFinanceLowBalanceMultiplier(0), 0.5); // di bawah 0.1 -> fallback default
  assert.equal(ctx.setAIFinanceLowBalanceMultiplier('abc'), 0.5); // bukan angka -> fallback default
});

test('rule finance-low-balance — ambang custom (setAIFinanceLowBalanceMultiplier) dihormati', () => {
  // expAvg 1.000.000; saldo 700.000 tidak trigger di ambang default 0.5x,
  // tapi trigger kalau multiplier dinaikkan ke 1x.
  const ctx = makeCtx(baseD(), { totalSaldoAkun: () => 700000 });
  ctx.registerFinanceAIRules();
  assert.equal(ctx.AIDecision.rules.evaluate({}).some((r) => r.ruleId === 'finance-low-balance'), false);
  ctx.setAIFinanceLowBalanceMultiplier(1);
  assert.equal(ctx.AIDecision.rules.evaluate({}).some((r) => r.ruleId === 'finance-low-balance'), true);
});
