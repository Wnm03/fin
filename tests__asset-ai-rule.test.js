'use strict';
// tests/asset-ai-rule.test.js — Smart Delivery Engine, Sesi 8: rule domain
// ASSET untuk AIDecision (lanjutan Sesi 7 — lihat RENCANA-SESI-RINGKAS.md).
// registerAssetAIRules()/rule 'asset-networth-declining' (modules/asset/
// aset.js). Tidak menguji ulang netWorthForecast() sendiri (sudah dites di
// tests/asset-predict.test.js) — Kekayaan di-stub sesederhana mungkin
// (actualCAGR) supaya arah tren (naik/turun) gampang dikontrol per test.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, opts = {}) {
  return loadSource(
    ['modules/ai/ai-core.js', 'modules/ai/ai-decision-engine.js', 'modules/asset/aset.js'],
    {
      D,
      document: opts.document,
      window: opts.window || {},
      escapeHtml: (s) => String(s == null ? '' : s),
      sameId: (a, b) => String(a) === String(b),
      todayStr: () => '2026-07-18',
      dateToISO: (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
      save: () => {},
      toast: () => {},
      Kekayaan: opts.Kekayaan,
      predictCashflow: opts.predictCashflow,
      IDBStore: { async get() { return null; }, async set() { return true; } },
    },
    ['AIDecision', 'Penyusutan'],
  );
}

test('registerAssetAIRules() — berhasil daftar, idempotent, guard AIDecision belum ada', () => {
  const Kekayaan = { currentNetWorth: () => 50000000, actualCAGR: () => ({ cagr: 0.1 }) };
  const ctx = makeCtx({ assets: [] }, { Kekayaan });
  assert.equal(ctx.registerAssetAIRules(), true);
  assert.equal(ctx.AIDecision.rules.getAll().some((r) => r.id === 'asset-networth-declining'), true);
  assert.equal(ctx.registerAssetAIRules(), false); // idempotent

  const ctxNoAI = loadSource(['modules/asset/aset.js'], {
    D: { assets: [] }, window: {}, escapeHtml: (s) => s, sameId: (a, b) => a === b,
    todayStr: () => '2026-07-18', dateToISO: (d) => d.toISOString(), save: () => {}, toast: () => {},
    Kekayaan,
  }, ['Penyusutan']);
  assert.equal(ctxNoAI.registerAssetAIRules(), false);
});

test('rule asset-networth-declining — trigger kalau CAGR negatif (proyeksi turun)', () => {
  const Kekayaan = { currentNetWorth: () => 50000000, actualCAGR: () => ({ cagr: -0.2 }) };
  const ctx = makeCtx({ assets: [] }, { Kekayaan });
  ctx.registerAssetAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  assert.equal(triggered.length, 1);
  assert.equal(triggered[0].ruleId, 'asset-networth-declining');
  assert.equal(triggered[0].category, 'asset');
  assert.match(triggered[0].message, /cagr-snapshot/);
});

test('rule asset-networth-declining — TIDAK trigger kalau CAGR positif (proyeksi naik)', () => {
  const Kekayaan = { currentNetWorth: () => 50000000, actualCAGR: () => ({ cagr: 0.15 }) };
  const ctx = makeCtx({ assets: [] }, { Kekayaan });
  ctx.registerAssetAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  assert.equal(triggered.length, 0);
});

test('rule asset-networth-declining — fallback cashflow-delta: trigger kalau monthlyNet negatif', () => {
  const Kekayaan = { currentNetWorth: () => 50000000, actualCAGR: () => null };
  const predictCashflow = () => ({
    ok: true, monthlyNet: -500000,
    months: [1, 2, 3, 4, 5, 6].map((i) => ({ month: '2026-0' + i })),
  });
  const ctx = makeCtx({ assets: [] }, { Kekayaan, predictCashflow });
  ctx.registerAssetAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  assert.equal(triggered.length, 1);
  assert.match(triggered[0].message, /cashflow-delta/);
});

test('rule asset-networth-declining — TIDAK trigger kalau data belum cukup (ok:false)', () => {
  const Kekayaan = { currentNetWorth: () => 50000000, actualCAGR: () => null };
  const ctx = makeCtx({ assets: [] }, { Kekayaan }); // predictCashflow sengaja tidak diberikan
  ctx.registerAssetAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  assert.equal(triggered.length, 0);
});

// ================= rule kedua: asset-zakat-due =================

test('registerAssetAIRules() — juga daftarkan rule asset-zakat-due', () => {
  const Kekayaan = { currentNetWorth: () => 50000000, actualCAGR: () => ({ cagr: 0.1 }) };
  const ctx = makeCtx({ assets: [] }, { Kekayaan });
  ctx.registerAssetAIRules();
  assert.equal(ctx.AIDecision.rules.getAll().some((r) => r.id === 'asset-zakat-due'), true);
});

test('rule asset-zakat-due — trigger kalau ada aset zakatable dgn estimasi Zakat Maal > 0', () => {
  const Kekayaan = { currentNetWorth: () => 50000000, actualCAGR: () => ({ cagr: 0.1 }) };
  const ctx = makeCtx({ assets: [{ id: 'a1', name: 'Emas', jenis: 'Emas', nilai: 20000000, zakatable: true }] }, { Kekayaan });
  ctx.registerAssetAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  const rule = triggered.find((r) => r.ruleId === 'asset-zakat-due');
  assert.ok(rule, 'rule asset-zakat-due harusnya trigger');
  assert.equal(rule.category, 'asset');
  assert.match(rule.message, /1 aset zakatable/);
});

test('rule asset-zakat-due — TIDAK trigger kalau tidak ada aset zakatable', () => {
  const Kekayaan = { currentNetWorth: () => 50000000, actualCAGR: () => ({ cagr: 0.1 }) };
  const ctx = makeCtx({ assets: [{ id: 'a1', name: 'Motor', jenis: 'Kendaraan', nilai: 20000000, zakatable: false }] }, { Kekayaan });
  ctx.registerAssetAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  assert.equal(triggered.some((r) => r.ruleId === 'asset-zakat-due'), false);
});

// ============ getAIAssetZakatMinThreshold()/setAIAssetZakatMinThreshold() ============

test('getAIAssetZakatMinThreshold() — default 0 kalau belum diatur', () => {
  const Kekayaan = { currentNetWorth: () => 50000000, actualCAGR: () => ({ cagr: 0.1 }) };
  const ctx = makeCtx({ assets: [] }, { Kekayaan });
  assert.equal(ctx.getAIAssetZakatMinThreshold(), 0);
});

test('getAIAssetZakatMinThreshold() — pakai D.profile.aiAssetZakatMinThresholdRp kalau valid (>=0)', () => {
  const Kekayaan = { currentNetWorth: () => 50000000, actualCAGR: () => ({ cagr: 0.1 }) };
  const ctx = makeCtx({ assets: [], profile: { aiAssetZakatMinThresholdRp: 100000 } }, { Kekayaan });
  assert.equal(ctx.getAIAssetZakatMinThreshold(), 100000);
});

test('getAIAssetZakatMinThreshold() — nilai negatif dianggap tidak valid, fallback default', () => {
  const Kekayaan = { currentNetWorth: () => 50000000, actualCAGR: () => ({ cagr: 0.1 }) };
  const ctx = makeCtx({ assets: [], profile: { aiAssetZakatMinThresholdRp: -1 } }, { Kekayaan });
  assert.equal(ctx.getAIAssetZakatMinThreshold(), 0);
});

test('setAIAssetZakatMinThreshold(rp) — set & fallback default kalau invalid', () => {
  const Kekayaan = { currentNetWorth: () => 50000000, actualCAGR: () => ({ cagr: 0.1 }) };
  const ctx = makeCtx({ assets: [], profile: {} }, { Kekayaan });
  assert.equal(ctx.setAIAssetZakatMinThreshold(200000), 200000);
  assert.equal(ctx.D.profile.aiAssetZakatMinThresholdRp, 200000);
  assert.equal(ctx.setAIAssetZakatMinThreshold(-5), 0); // negatif -> fallback default
  assert.equal(ctx.setAIAssetZakatMinThreshold('abc'), 0); // bukan angka -> fallback default
});

test('rule asset-zakat-due — ambang custom (setAIAssetZakatMinThreshold) dihormati', () => {
  // Emas 20jt -> estimasi Zakat Maal = 20jt * 2.5% = 500.000.
  const Kekayaan = { currentNetWorth: () => 50000000, actualCAGR: () => ({ cagr: 0.1 }) };
  const D = { assets: [{ id: 'a1', name: 'Emas', jenis: 'Emas', nilai: 20000000, zakatable: true }], profile: {} };
  const ctx = makeCtx(D, { Kekayaan });
  ctx.registerAssetAIRules();
  ctx.setAIAssetZakatMinThreshold(600000); // di atas estimasi 500.000
  assert.equal(ctx.AIDecision.rules.evaluate({}).some((r) => r.ruleId === 'asset-zakat-due'), false);
  ctx.setAIAssetZakatMinThreshold(400000); // di bawah estimasi 500.000
  assert.equal(ctx.AIDecision.rules.evaluate({}).some((r) => r.ruleId === 'asset-zakat-due'), true);
});
