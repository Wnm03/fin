'use strict';
// tests/unified-ai-briefing.test.js — UnifiedAIBriefing (modules/cross/
// unified-ai-briefing.js). Sesi 88 (Batch 8) — Unified AI Briefing
// Foundation: teks ringkasan 1-3 kalimat, 100% reuse UnifiedSummaryAPI.
// summary(). Pola sama persis tests/vehicle-daily-brief.test.js (versi
// data murni, bukan presenter) — dependency di-mock lewat loadSource
// extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  return loadSource(['modules/cross/unified-ai-briefing.js'], {
    UnifiedSummaryAPI: opts.UnifiedSummaryAPI,
  }, ['UnifiedAIBriefing']);
}

function fullSummary(overrides = {}) {
  return Object.assign({
    ok: true,
    finance: {
      ok: true,
      budget: { ok: true, overCount: 0 },
      healthScore: { score: 82, label: 'Sehat' },
    },
    vehicle: {
      ok: true,
      intelligence: { fleet: { totalVehicles: 3, avgHealth: 85 } },
      reminder: { overdueCount: 0 },
    },
    insightCount: 0,
  }, overrides);
}

test('unified-ai-briefing.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('generate() — UnifiedSummaryAPI belum dimuat: {ok:false}, tidak throw', () => {
  const { UnifiedAIBriefing } = makeCtx({ UnifiedSummaryAPI: undefined });
  const b = UnifiedAIBriefing.generate();
  assert.equal(b.ok, false);
  assert.match(b.reason, /UnifiedSummaryAPI belum dimuat/);
});

test('generate() — summary() ok:false: diteruskan apa adanya', () => {
  const UnifiedSummaryAPI = { summary: () => ({ ok: false, reason: 'CrossAIHook belum dimuat' }) };
  const { UnifiedAIBriefing } = makeCtx({ UnifiedSummaryAPI });
  const b = UnifiedAIBriefing.generate();
  assert.equal(b.ok, false);
  assert.equal(b.reason, 'CrossAIHook belum dimuat');
});

test('generate() — finance & vehicle keduanya tidak ada: {ok:false, reason Tidak ada data}', () => {
  const UnifiedSummaryAPI = { summary: () => ({ ok: true, finance: { ok: false }, vehicle: { ok: false }, insightCount: 0 }) };
  const { UnifiedAIBriefing } = makeCtx({ UnifiedSummaryAPI });
  const b = UnifiedAIBriefing.generate();
  assert.equal(b.ok, false);
  assert.match(b.reason, /Tidak ada data/);
});

test('generate() — sebutkan skor kesehatan finansial & armada apa adanya', () => {
  const UnifiedSummaryAPI = { summary: () => fullSummary() };
  const { UnifiedAIBriefing } = makeCtx({ UnifiedSummaryAPI });
  const b = UnifiedAIBriefing.generate();
  assert.equal(b.ok, true);
  assert.match(b.text, /Skor kesehatan finansial 82\/100 \(Sehat\)/);
  assert.match(b.text, /Skor kesehatan armada 85\/100 dari 3 kendaraan/);
});

test('generate() — totalAttention 0: sebutkan "Tidak ada hal mendesak"', () => {
  const UnifiedSummaryAPI = { summary: () => fullSummary() };
  const { UnifiedAIBriefing } = makeCtx({ UnifiedSummaryAPI });
  const b = UnifiedAIBriefing.generate();
  assert.match(b.text, /Tidak ada hal mendesak yang butuh perhatian saat ini/);
});

test('generate() — totalAttention > 0: penjumlahan MURNI budget.overCount + reminder.overdueCount, 0 rumus baru', () => {
  const UnifiedSummaryAPI = { summary: () => fullSummary({
    finance: { ok: true, budget: { ok: true, overCount: 2 }, healthScore: { score: 60, label: 'Cukup Sehat' } },
    vehicle: { ok: true, intelligence: { fleet: { totalVehicles: 2, avgHealth: 70 } }, reminder: { overdueCount: 3 } },
  }) };
  const { UnifiedAIBriefing } = makeCtx({ UnifiedSummaryAPI });
  const b = UnifiedAIBriefing.generate();
  assert.match(b.text, /5 hal butuh perhatian \(2 anggaran lewat batas, 3 servis\/pajak\/BBM lewat jatuh tempo\)/);
});

test('generate() — insightCount > 0: sebutkan jumlah insight apa adanya', () => {
  const UnifiedSummaryAPI = { summary: () => fullSummary({ insightCount: 4 }) };
  const { UnifiedAIBriefing } = makeCtx({ UnifiedSummaryAPI });
  const b = UnifiedAIBriefing.generate();
  assert.match(b.text, /4 insight tersedia hari ini/);
});

test('generate() — insightCount 0: tidak menyebutkan kalimat insight', () => {
  const UnifiedSummaryAPI = { summary: () => fullSummary({ insightCount: 0 }) };
  const { UnifiedAIBriefing } = makeCtx({ UnifiedSummaryAPI });
  const b = UnifiedAIBriefing.generate();
  assert.doesNotMatch(b.text, /insight tersedia/);
});

test('generate() — hanya finance tersedia (vehicle.ok false): tetap hasilkan briefing dari finance saja', () => {
  const UnifiedSummaryAPI = { summary: () => fullSummary({ vehicle: { ok: false, reason: 'VehicleAIHook belum dimuat' } }) };
  const { UnifiedAIBriefing } = makeCtx({ UnifiedSummaryAPI });
  const b = UnifiedAIBriefing.generate();
  assert.equal(b.ok, true);
  assert.match(b.text, /Skor kesehatan finansial 82\/100/);
  assert.doesNotMatch(b.text, /armada/);
});
