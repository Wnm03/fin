'use strict';
// tests/eie-rules-fase3.test.js — Test rule baru fase 3 (notif + rule
// tambahan) di economic-intelligence/rules/rule-definitions.js. Fokus:
// 1) semua rule (lama + baru) tetap valid secara skema (validateRuleShape).
// 2) 7 rule baru fase 3 (R-USD-003, R-INF-003, R-BI-003, R-IHSG-003,
//    R-EMAS-003, R-BBM-002, R-COMP-006) diuji condition/action-nya lewat
//    source ASLI (bukan re-implementasi), pola sama seperti test lain di
//    suite ini (loadSource dari tests/helpers/).
const { test } = require('node:test');
const assert = require('node:assert');
const { loadSource } = require('./helpers/loadSource');

function loadRules() {
  const ctx = loadSource(
    [
      'economic-intelligence/rules/rule-schema.js',
      'economic-intelligence/rules/rule-definitions.js',
    ],
    {},
    ['EIE_RULES', 'EIE_VALID_SEVERITIES'],
  );
  return ctx;
}

function ruleById(rules, id) {
  const r = rules.find((r) => r.id === id);
  assert.ok(r, `rule ${id} tidak ditemukan di EIE_RULES`);
  return r;
}

test('EIE_RULES — semua rule (termasuk 7 rule baru fase 3) valid secara skema', () => {
  const ctx = loadRules();
  assert.strictEqual(ctx.EIE_RULES.length, 23, 'total rule harus 16 (fase 1) + 7 (fase 3) = 23');
  for (const rule of ctx.EIE_RULES) {
    const errors = ctx.validateRuleShape(rule);
    assert.strictEqual(errors.length, 0, `rule ${rule.id} punya error skema: ${errors.join('; ')}`);
  }
});

test('EIE_RULES — semua rule.id unik (tidak ada duplikat, termasuk rule baru)', () => {
  const ctx = loadRules();
  const ids = ctx.EIE_RULES.map((r) => r.id);
  const unique = new Set(ids);
  assert.strictEqual(unique.size, ids.length, 'ada rule.id duplikat di EIE_RULES');
});

test('R-USD-003 — kurs turun tajam memicu info, kurs naik/turun tipis tidak', () => {
  const { EIE_RULES } = loadRules();
  const rule = ruleById(EIE_RULES, 'R-USD-003');
  assert.strictEqual(rule.severity, 'info');
  assert.strictEqual(rule.category, 'usdidr');
  assert.strictEqual(rule.condition({ usdidr: { changePct: -5 } }, {}), true);
  assert.strictEqual(rule.condition({ usdidr: { changePct: -1 } }, {}), false);
  assert.strictEqual(rule.condition({ usdidr: { changePct: 5 } }, {}), false, 'kurs NAIK bukan urusan rule ini');
  const result = rule.action({ usdidr: { changePct: -6.2 } }, {});
  assert.match(result.message, /turun 6\.2%/);
  assert.strictEqual(result.recommendationId, null);
});

test('R-INF-003 — inflasi naik & incomeStabilityScore rendah, dua kondisi wajib bersamaan', () => {
  const { EIE_RULES } = loadRules();
  const rule = ruleById(EIE_RULES, 'R-INF-003');
  assert.strictEqual(rule.severity, 'warning');
  const macroNaik = { inflasi: { changePct: 8 } };
  assert.strictEqual(rule.condition(macroNaik, { incomeStabilityScore: 20 }), true);
  assert.strictEqual(rule.condition(macroNaik, { incomeStabilityScore: 80 }), false, 'income stabil -> tidak memicu');
  assert.strictEqual(rule.condition({ inflasi: { changePct: 1 } }, { incomeStabilityScore: 20 }), false, 'inflasi naik tipis -> tidak memicu');
  assert.strictEqual(rule.condition(macroNaik, {}), false, 'incomeStabilityScore kosong dianggap 100 (default aman) via ?? -> tidak memicu');
});

test('R-BI-003 — BI Rate turun & ada utang floating -> peluang refinancing', () => {
  const { EIE_RULES } = loadRules();
  const rule = ruleById(EIE_RULES, 'R-BI-003');
  assert.strictEqual(rule.severity, 'info');
  assert.strictEqual(rule.category, 'bi_rate');
  assert.strictEqual(rule.condition({ bi_rate: { changePct: -0.5 } }, { floatingRateDebtRatio: 0.4 }), true);
  assert.strictEqual(rule.condition({ bi_rate: { changePct: -0.5 } }, { floatingRateDebtRatio: 0 }), false, 'tanpa utang floating -> tidak relevan');
  assert.strictEqual(rule.condition({ bi_rate: { changePct: 0.5 } }, { floatingRateDebtRatio: 0.4 }), false, 'BI Rate NAIK bukan urusan rule ini');
});

test('R-IHSG-003 — IHSG turun tajam, buffer kuat & alokasi volatil rendah -> peluang beli', () => {
  const { EIE_RULES } = loadRules();
  const rule = ruleById(EIE_RULES, 'R-IHSG-003');
  const userAman = {
    emergencyFundMonths: 6,
    savingsTotal: 100000000,
    investmentTotal: 10000000,
    investmentBreakdown: { saham: 500000, reksadana: 500000 },
  };
  assert.strictEqual(rule.condition({ ihsg: { changePct: -4 } }, userAman), true);
  const userBufferTipis = { ...userAman, emergencyFundMonths: 1 };
  assert.strictEqual(rule.condition({ ihsg: { changePct: -4 } }, userBufferTipis), false, 'buffer tipis -> tidak cocok kondisi rule ini');
  const userAlokasiTinggi = {
    ...userAman,
    savingsTotal: 0,
    investmentBreakdown: { saham: 5000000, reksadana: 3000000 }, // 80% dari investmentTotal
  };
  assert.strictEqual(rule.condition({ ihsg: { changePct: -4 } }, userAlokasiTinggi), false, 'alokasi volatil sudah tinggi -> beda kondisi dari R-IHSG-001, bukan rule ini');
});

test('R-EMAS-003 — emas naik tajam & alokasi emas >50% total investasi -> warning konsentrasi', () => {
  const { EIE_RULES } = loadRules();
  const rule = ruleById(EIE_RULES, 'R-EMAS-003');
  assert.strictEqual(rule.severity, 'warning');
  const userKonsentrasi = { investmentTotal: 10000000, investmentBreakdown: { emas: 7000000 } };
  assert.strictEqual(rule.condition({ emas: { changePct: 6 } }, userKonsentrasi), true);
  const userSeimbang = { investmentTotal: 10000000, investmentBreakdown: { emas: 2000000 } };
  assert.strictEqual(rule.condition({ emas: { changePct: 6 } }, userSeimbang), false, 'porsi emas < 50% -> tidak memicu');
  assert.strictEqual(rule.condition({ emas: { changePct: 1 } }, userKonsentrasi), false, 'kenaikan emas tipis -> tidak memicu');
  const result = rule.action({ emas: { changePct: 6 } }, userKonsentrasi);
  assert.match(result.message, /70%/);
});

test('R-BBM-002 — BBM turun tajam memicu info tanpa syarat importDependencyRatio', () => {
  const { EIE_RULES } = loadRules();
  const rule = ruleById(EIE_RULES, 'R-BBM-002');
  assert.strictEqual(rule.severity, 'info');
  assert.strictEqual(rule.condition({ bbm: { changePct: -4 } }, {}), true, 'tidak butuh importDependencyRatio sama sekali');
  assert.strictEqual(rule.condition({ bbm: { changePct: -1 } }, {}), false);
});

test('R-COMP-006 — incomeStabilityScore rendah & DSR tinggi bersamaan (baseline personal)', () => {
  const { EIE_RULES } = loadRules();
  const rule = ruleById(EIE_RULES, 'R-COMP-006');
  assert.strictEqual(rule.category, 'composite');
  assert.strictEqual(rule.severity, 'warning');
  assert.strictEqual(rule.condition({}, { incomeStabilityScore: 25, debtToIncomeRatio: 0.4 }), true);
  assert.strictEqual(rule.condition({}, { incomeStabilityScore: 25, debtToIncomeRatio: 0.1 }), false, 'DSR rendah -> tidak memicu');
  assert.strictEqual(rule.condition({}, { incomeStabilityScore: 80, debtToIncomeRatio: 0.4 }), false, 'income stabil -> tidak memicu');
  // Tidak bergantung sama sekali ke object macro (baseline personal murni).
  assert.strictEqual(rule.condition(null, { incomeStabilityScore: 25, debtToIncomeRatio: 0.4 }), true);
});
