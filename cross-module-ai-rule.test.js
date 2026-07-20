'use strict';
// tests/cross-module-ai-rule.test.js — TODO.md #1: Rule Cross Module pertama
// (Finance + Delivery) untuk AIDecision. registerCrossModuleAIRules()/rule
// 'cross-finance-delivery-margin-balance' (modules/ai/ai-decision-engine.js).
//
// BEDA dari rule domain tunggal (finance-*/vehicle-*/asset-*/delivery-*):
// rule ini baca 2 domain sekaligus LEWAT AIContext.snapshot() (ai-core.js,
// Sesi 13) — bukan ctx.payload 1 event, & bukan D langsung. Ambang dipakai
// APA ADANYA dari 2 getter yang sudah ada (tidak menambah ambang baru):
//   - getAIDeliveryThinMarginThreshold() (cobek-pricing.js, default 10%)
//   - getAIFinanceLowBalanceMultiplier() (tx-list-cashflow.js, default 0.5x)

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');

const fakeIDB = { async get() { return null; }, async set() { return true; } };

function baseD(overrides = {}) {
  const now = new Date();
  return Object.assign({
    profile: {},
    transactions: [
      { type: 'income', amount: 9000000, date: now.toISOString() },
      { type: 'expense', amount: 3000000, date: now.toISOString() }, // -> expAvg 1.000.000
    ],
    bills: [],
    products: [],
    cobek: [],
  }, overrides);
}

function makeCtx(D, opts = {}) {
  return loadSource(
    [
      'modules/ai/ai-core.js',
      'modules/ai/ai-decision-engine.js',
      'modules/finance/tx-list-cashflow.js',
      'modules/shop/cobek-pricing.js',
    ],
    {
      D,
      totalSaldoAkun: opts.totalSaldoAkun || (() => 1000000),
      IDBStore: fakeIDB,
    },
    ['AIDecision', 'AIContext'],
  );
}

// margin tipis (5%, di bawah ambang default 10%): profit 5000/total 100000
const THIN_MARGIN_COBEK = [{ id: 1, profit: 5000, total: 100000 }];
// margin sehat (40%, di atas ambang default 10%): profit 40000/total 100000
const HEALTHY_MARGIN_COBEK = [{ id: 1, profit: 40000, total: 100000 }];

// ================= registerCrossModuleAIRules() =================

test('registerCrossModuleAIRules() — berhasil daftar, idempotent', () => {
  const ctx = makeCtx(baseD());
  assert.equal(ctx.registerCrossModuleAIRules(), true);
  assert.equal(ctx.AIDecision.rules.getAll().some((r) => r.id === 'cross-finance-delivery-margin-balance'), true);
  assert.equal(ctx.registerCrossModuleAIRules(), false); // idempotent
  assert.equal(ctx.AIDecision.rules.getAll().filter((r) => r.id === 'cross-finance-delivery-margin-balance').length, 1);
});

// ================= rule end-to-end lewat AIDecision.rules.evaluate() =================

test('rule trigger: margin Shop tipis (5%) DAN saldo rendah (400rb < 0.5x expAvg 1jt)', () => {
  const ctx = makeCtx(baseD({ cobek: THIN_MARGIN_COBEK }), { totalSaldoAkun: () => 400000 });
  ctx.registerCrossModuleAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  const hit = triggered.find((t) => t.ruleId === 'cross-finance-delivery-margin-balance');
  assert.ok(hit, 'rule harus trigger');
  assert.match(hit.message, /5\.0%/);
  assert.match(hit.message, /10%/);
});

test('tidak trigger: margin Shop sehat (40%) walau saldo rendah', () => {
  const ctx = makeCtx(baseD({ cobek: HEALTHY_MARGIN_COBEK }), { totalSaldoAkun: () => 400000 });
  ctx.registerCrossModuleAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  assert.equal(triggered.some((t) => t.ruleId === 'cross-finance-delivery-margin-balance'), false);
});

test('tidak trigger: margin Shop tipis (5%) tapi saldo masih cukup (2jt >= 0.5x expAvg 1jt)', () => {
  const ctx = makeCtx(baseD({ cobek: THIN_MARGIN_COBEK }), { totalSaldoAkun: () => 2000000 });
  ctx.registerCrossModuleAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  assert.equal(triggered.some((t) => t.ruleId === 'cross-finance-delivery-margin-balance'), false);
});

test('tidak trigger: belum ada histori transaksi Cobek sama sekali (recentAvgMarginPct null)', () => {
  const ctx = makeCtx(baseD({ cobek: [] }), { totalSaldoAkun: () => 400000 });
  ctx.registerCrossModuleAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  assert.equal(triggered.some((t) => t.ruleId === 'cross-finance-delivery-margin-balance'), false);
});

test('ambang dihormati kalau diatur custom via getter/setter yang sudah ada', () => {
  // Margin 15% (di atas ambang default 10%, tidak akan trigger default),
  // tapi kalau ambang margin dinaikkan ke 20% (setAIDeliveryThinMarginThreshold),
  // 15% jadi "tipis" -> rule ikut trigger (dipadukan saldo rendah).
  const D = baseD({ cobek: [{ id: 1, profit: 15000, total: 100000 }] });
  const ctx = makeCtx(D, { totalSaldoAkun: () => 400000 });
  ctx.registerCrossModuleAIRules();
  let triggered = ctx.AIDecision.rules.evaluate({});
  assert.equal(triggered.some((t) => t.ruleId === 'cross-finance-delivery-margin-balance'), false);

  ctx.setAIDeliveryThinMarginThreshold(20);
  triggered = ctx.AIDecision.rules.evaluate({});
  assert.equal(triggered.some((t) => t.ruleId === 'cross-finance-delivery-margin-balance'), true);
});

// ================= _crossFinanceDeliveryCheck() — guard langsung =================

test('_crossFinanceDeliveryCheck() — AIContext belum di-load: trigger false, tidak error', () => {
  const ctx = loadSource(['modules/ai/ai-decision-engine.js'], { D: {} });
  assert.equal(ctx._crossFinanceDeliveryCheck().trigger, false);
});

test('_crossFinanceDeliveryCheck() — domain finance/shop belum available: trigger false', () => {
  const ctx = loadSource(
    ['modules/ai/ai-core.js', 'modules/ai/ai-decision-engine.js'],
    { D: {}, IDBStore: fakeIDB },
  );
  assert.equal(ctx._crossFinanceDeliveryCheck().trigger, false);
});
