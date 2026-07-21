'use strict';
// tests/delivery-ai-rule.test.js — Smart Delivery Engine, Sesi 8: rule domain
// DELIVERY untuk AIDecision (lanjutan Sesi 7 — lihat RENCANA-SESI-RINGKAS.md).
// registerDeliveryAIRules()/rule 'delivery-thin-margin' (modules/shop/
// cobek-pricing.js). BEDA dari rule finance/asset/vehicle: rule ini hanya
// baca ctx.payload.marginPct (dikirim cobek-order.js saat emit
// 'delivery.created'), jadi condition() WAJIB cek ctx.event dulu — dites di
// sini secara eksplisit.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx() {
  return loadSource(
    ['modules/ai/ai-core.js', 'modules/ai/ai-decision-engine.js', 'modules/shop/cobek-pricing.js'],
    { D: {}, IDBStore: { async get() { return null; }, async set() { return true; } } },
    ['AIDecision'],
  );
}

test('registerDeliveryAIRules() — berhasil daftar, idempotent, guard AIDecision belum ada', () => {
  const ctx = makeCtx();
  assert.equal(ctx.registerDeliveryAIRules(), true);
  assert.equal(ctx.AIDecision.rules.getAll().some((r) => r.id === 'delivery-thin-margin'), true);
  assert.equal(ctx.registerDeliveryAIRules(), false); // idempotent

  const ctxNoAI = loadSource(['modules/shop/cobek-pricing.js'], { D: {} });
  assert.equal(ctxNoAI.registerDeliveryAIRules(), false);
});

test('rule delivery-thin-margin — trigger kalau marginPct < 10% pada event delivery.created', () => {
  const ctx = makeCtx();
  ctx.registerDeliveryAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({ event: 'delivery.created', payload: { total: 100000, marginPct: 4.5 } });
  assert.equal(triggered.length, 1);
  assert.equal(triggered[0].ruleId, 'delivery-thin-margin');
  assert.equal(triggered[0].category, 'delivery');
  assert.equal(triggered[0].severity, 'info');
  assert.match(triggered[0].message, /4\.5%/);
});

test('rule delivery-thin-margin — TIDAK trigger kalau marginPct >= 10%', () => {
  const ctx = makeCtx();
  ctx.registerDeliveryAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({ event: 'delivery.created', payload: { total: 100000, marginPct: 25 } });
  assert.equal(triggered.length, 0);
});

test('rule delivery-thin-margin — TIDAK trigger kalau event BUKAN delivery.created (data delivery basi)', () => {
  const ctx = makeCtx();
  ctx.registerDeliveryAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({ event: 'finance.updated', payload: { marginPct: 2 } });
  assert.equal(triggered.length, 0);
});

test('rule delivery-thin-margin — TIDAK trigger kalau payload tidak punya marginPct (event lama/tanpa data)', () => {
  const ctx = makeCtx();
  ctx.registerDeliveryAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({ event: 'delivery.created', payload: { total: 100000 } });
  assert.equal(triggered.length, 0);
});

// ================= threshold getter/setter (Sesi 9: configurable) =================

test('getAIDeliveryThinMarginThreshold() — default 10 kalau belum diatur', () => {
  const ctx = makeCtx();
  assert.equal(ctx.getAIDeliveryThinMarginThreshold(), 10);
});

test('getAIDeliveryThinMarginThreshold() — pakai D.profile.aiDeliveryThinMarginThresholdPct kalau ada & valid (0-100)', () => {
  const ctx = makeCtx();
  ctx.D.profile = { aiDeliveryThinMarginThresholdPct: 20 };
  assert.equal(ctx.getAIDeliveryThinMarginThreshold(), 20);
});

test('getAIDeliveryThinMarginThreshold() — nilai di luar 0-100 dianggap tidak valid, fallback default', () => {
  const ctx = makeCtx();
  ctx.D.profile = { aiDeliveryThinMarginThresholdPct: 150 };
  assert.equal(ctx.getAIDeliveryThinMarginThreshold(), 10);
});

test('setAIDeliveryThinMarginThreshold(pct) — set & fallback default kalau invalid', () => {
  const ctx = makeCtx();
  ctx.D.profile = {};
  assert.equal(ctx.setAIDeliveryThinMarginThreshold(15), 15);
  assert.equal(ctx.D.profile.aiDeliveryThinMarginThresholdPct, 15);
  assert.equal(ctx.setAIDeliveryThinMarginThreshold(200), 10); // di luar 0-100 -> fallback default
  assert.equal(ctx.setAIDeliveryThinMarginThreshold('abc'), 10); // bukan angka -> fallback default
});

test('rule delivery-thin-margin — ambang custom (setAIDeliveryThinMarginThreshold) dihormati', () => {
  const ctx = makeCtx();
  ctx.D.profile = {};
  ctx.setAIDeliveryThinMarginThreshold(30); // naikkan ambang
  ctx.registerDeliveryAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({ event: 'delivery.created', payload: { total: 100000, marginPct: 25 } });
  assert.equal(triggered.length, 1); // 25% < ambang custom 30% -> trigger (sebelumnya tidak, di test lain dgn default 10%)
  assert.match(triggered[0].message, /30%/);
});

// ================= rule kedua: delivery-low-stock =================

test('registerDeliveryAIRules() — juga daftarkan rule delivery-low-stock', () => {
  const ctx = makeCtx();
  ctx.registerDeliveryAIRules();
  assert.equal(ctx.AIDecision.rules.getAll().some((r) => r.id === 'delivery-low-stock'), true);
});

test('rule delivery-low-stock — trigger kalau ada produk dengan stok <=2', () => {
  const ctx = makeCtx();
  ctx.D.products = [{ id: 'p1', name: 'Cobek Batu Kecil', stock: 1 }, { id: 'p2', name: 'Ulekan', stock: 10 }];
  ctx.registerDeliveryAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  const rule = triggered.find((r) => r.ruleId === 'delivery-low-stock');
  assert.ok(rule, 'rule delivery-low-stock harusnya trigger');
  assert.equal(rule.category, 'delivery');
  assert.match(rule.message, /Cobek Batu Kecil/);
  assert.match(rule.message, /1 pcs/);
});

test('rule delivery-low-stock — TIDAK trigger kalau semua produk stoknya > 2', () => {
  const ctx = makeCtx();
  ctx.D.products = [{ id: 'p1', name: 'Cobek Batu Kecil', stock: 5 }];
  ctx.registerDeliveryAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  assert.equal(triggered.some((r) => r.ruleId === 'delivery-low-stock'), false);
});

test('rule delivery-low-stock — TIDAK trigger kalau belum ada produk sama sekali', () => {
  const ctx = makeCtx();
  ctx.registerDeliveryAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  assert.equal(triggered.some((r) => r.ruleId === 'delivery-low-stock'), false);
});

// ============ getAIDeliveryLowStockThreshold()/setAIDeliveryLowStockThreshold() ============

test('getAIDeliveryLowStockThreshold() — default 2 kalau belum diatur', () => {
  const ctx = makeCtx();
  assert.equal(ctx.getAIDeliveryLowStockThreshold(), 2);
});

test('getAIDeliveryLowStockThreshold() — pakai D.profile.aiDeliveryLowStockThreshold kalau valid (>=0)', () => {
  const ctx = makeCtx();
  ctx.D.profile = { aiDeliveryLowStockThreshold: 5 };
  assert.equal(ctx.getAIDeliveryLowStockThreshold(), 5);
});

test('getAIDeliveryLowStockThreshold() — nilai negatif dianggap tidak valid, fallback default', () => {
  const ctx = makeCtx();
  ctx.D.profile = { aiDeliveryLowStockThreshold: -1 };
  assert.equal(ctx.getAIDeliveryLowStockThreshold(), 2);
});

test('setAIDeliveryLowStockThreshold(n) — set & fallback default kalau invalid', () => {
  const ctx = makeCtx();
  ctx.D.profile = {};
  assert.equal(ctx.setAIDeliveryLowStockThreshold(5), 5);
  assert.equal(ctx.D.profile.aiDeliveryLowStockThreshold, 5);
  assert.equal(ctx.setAIDeliveryLowStockThreshold(-3), 2); // negatif -> fallback default
  assert.equal(ctx.setAIDeliveryLowStockThreshold('abc'), 2); // bukan angka -> fallback default
});

test('rule delivery-low-stock — ambang custom (setAIDeliveryLowStockThreshold) dihormati', () => {
  const ctx = makeCtx();
  ctx.D.profile = {};
  ctx.D.products = [{ id: 'p1', name: 'Cobek Batu Kecil', stock: 4 }];
  ctx.registerDeliveryAIRules();
  assert.equal(ctx.AIDecision.rules.evaluate({}).some((r) => r.ruleId === 'delivery-low-stock'), false); // 4 > ambang default 2
  ctx.setAIDeliveryLowStockThreshold(5);
  assert.equal(ctx.AIDecision.rules.evaluate({}).some((r) => r.ruleId === 'delivery-low-stock'), true); // 4 <= ambang custom 5
});
