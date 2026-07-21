'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// self-reward-engine.js — modul BARU, murni logic (tidak ada DOM), jadi
// dites lewat loadSource() biasa. `const SelfReward={...}` butuh
// expose:['SelfReward'] karena vm TIDAK menempelkan binding const ke
// context secara otomatis (lihat catatan di tests/helpers/loadSource.js).
// `D` & `save()` di-inject sbg extraGlobals. `FI`/`Budget`/`getBillStats`
// (dependency LINTAS FILE opsional, dibaca via guard `typeof x!=='undefined'`
// di source-nya) di-stub manual per test — pola sama dgn tests/fi-calc.test.js
// — supaya test ini benar-benar test SelfReward saja, bukan test integrasi.

function makeEngine({ D, FI, Budget, getBillStats } = {}) {
  const saveCalls = [];
  const extraGlobals = {
    D: D || {},
    save: (...args) => saveCalls.push(args),
  };
  if (FI !== undefined) extraGlobals.FI = FI;
  if (Budget !== undefined) extraGlobals.Budget = Budget;
  if (getBillStats !== undefined) extraGlobals.getBillStats = getBillStats;
  const ctx = loadSource(['modules/self-reward/self-reward-engine.js'], extraGlobals, ['SelfReward', 'SelfRewardDefaults']);
  return { SelfReward: ctx.SelfReward, D: extraGlobals.D, saveCalls };
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function daysFromNowStr(n) { return daysAgoStr(-n); }

// ---------- getSettings / saveSettings ----------

test('getSettings() — default dipakai kalau D.selfReward belum ada', () => {
  const { SelfReward } = makeEngine({ D: {} });
  const s = SelfReward.getSettings();
  assert.equal(s.level1Pct, 2);
  assert.equal(s.level2Pct, 5);
  assert.equal(s.level3Pct, 10);
  assert.equal(s.graceDaysUtang, 0);
  assert.equal(s.graceDaysTagihan, 0);
});

test('getSettings() — field yang sudah diisi user dipakai apa adanya, field yang belum diisi tetap default', () => {
  const { SelfReward } = makeEngine({ D: { selfReward: { level3Pct: 15 } } });
  const s = SelfReward.getSettings();
  assert.equal(s.level3Pct, 15);
  assert.equal(s.level1Pct, 2); // default, belum diisi
});

test('getSettings() — nilai invalid (negatif/NaN) di D.selfReward diabaikan, fallback ke default', () => {
  const { SelfReward } = makeEngine({ D: { selfReward: { level1Pct: -5, level2Pct: NaN } } });
  const s = SelfReward.getSettings();
  assert.equal(s.level1Pct, 2);
  assert.equal(s.level2Pct, 5);
});

test('saveSettings(partial) — merge ke setting yang sudah ada, tidak menghapus field lain, lalu save()', () => {
  const { SelfReward, D, saveCalls } = makeEngine({ D: { selfReward: { level1Pct: 3 } } });
  SelfReward.saveSettings({ level2Pct: 7 });
  assert.equal(D.selfReward.level1Pct, 3);
  assert.equal(D.selfReward.level2Pct, 7);
  assert.equal(saveCalls.length, 1);
});

// ---------- checkBudgetAman ----------

test('checkBudgetAman — tidak ada D.budgets sama sekali -> ok true (tidak ada yg bisa over)', () => {
  const { SelfReward } = makeEngine({ D: { budgets: [] } });
  const r = SelfReward.checkBudgetAman();
  assert.equal(r.ok, true);
  assert.equal(r.overBudgetList.length, 0);
});

test('checkBudgetAman — semua budget di bawah limit -> ok true', () => {
  const Budget = {
    getEffectiveLimit: () => 500000,
    getUsed: () => 300000,
  };
  const { SelfReward } = makeEngine({ D: { budgets: [{ name: 'Makan' }] }, Budget });
  assert.equal(SelfReward.checkBudgetAman().ok, true);
});

test('checkBudgetAman — salah satu budget over limit -> ok false, masuk overBudgetList', () => {
  const Budget = {
    getEffectiveLimit: (b) => (b.name === 'Makan' ? 500000 : 200000),
    getUsed: (b) => (b.name === 'Makan' ? 600000 : 100000),
  };
  const { SelfReward } = makeEngine({
    D: { budgets: [{ name: 'Makan' }, { name: 'BBM' }] },
    Budget,
  });
  const r = SelfReward.checkBudgetAman();
  assert.equal(r.ok, false);
  assert.equal(r.overBudgetList.length, 1);
  assert.equal(r.overBudgetList[0].name, 'Makan');
});

// ---------- checkCashflowPositif ----------

test('checkCashflowPositif — surplus > 0 -> ok true', () => {
  const FI = { monthlySurplus: () => 500000 };
  const { SelfReward } = makeEngine({ D: {}, FI });
  const r = SelfReward.checkCashflowPositif();
  assert.equal(r.ok, true);
  assert.equal(r.surplus, 500000);
});

test('checkCashflowPositif — surplus 0 atau negatif -> ok false', () => {
  const FI = { monthlySurplus: () => -100000 };
  const { SelfReward } = makeEngine({ D: {}, FI });
  assert.equal(SelfReward.checkCashflowPositif().ok, false);
});

// ---------- checkDanaDarurat ----------

test('checkDanaDarurat — belum ada Target ditandai Dana Darurat -> ok false, hasTarget false', () => {
  const { SelfReward } = makeEngine({ D: { targets: [{ name: 'Rumah', amount: 100, saved: 100 }] } });
  const r = SelfReward.checkDanaDarurat();
  assert.equal(r.ok, false);
  assert.equal(r.hasTarget, false);
});

test('checkDanaDarurat — sudah 100% -> ok true', () => {
  const { SelfReward } = makeEngine({
    D: { targets: [{ name: 'DD', isDanaDarurat: true, amount: 1000000, saved: 1000000 }] },
  });
  const r = SelfReward.checkDanaDarurat();
  assert.equal(r.ok, true);
  assert.equal(r.pct, 100);
});

test('checkDanaDarurat — baru 80% -> ok false', () => {
  const { SelfReward } = makeEngine({
    D: { targets: [{ name: 'DD', isDanaDarurat: true, amount: 1000000, saved: 800000 }] },
  });
  const r = SelfReward.checkDanaDarurat();
  assert.equal(r.ok, false);
  assert.equal(r.pct, 80);
});

// ---------- checkTargetInvestasi ----------

test('checkTargetInvestasi — tidak ada Target investasi sama sekali -> ok true (tidak menghalangi)', () => {
  const { SelfReward } = makeEngine({ D: { targets: [] } });
  assert.equal(SelfReward.checkTargetInvestasi().ok, true);
});

test('checkTargetInvestasi — Target Dana Darurat tidak ikut dihitung sbg target investasi', () => {
  const { SelfReward } = makeEngine({
    D: { targets: [{ name: 'DD', isDanaDarurat: true, amount: 100, saved: 10 }] },
  });
  const r = SelfReward.checkTargetInvestasi();
  assert.equal(r.ok, true);
  assert.equal(r.targets.length, 0);
});

test('checkTargetInvestasi — semua target investasi 100% -> ok true', () => {
  const { SelfReward } = makeEngine({
    D: {
      targets: [
        { name: 'Reksadana', amount: 100, saved: 100 },
        { name: 'Emas', amount: 200, saved: 250 },
      ],
    },
  });
  const r = SelfReward.checkTargetInvestasi();
  assert.equal(r.ok, true);
});

test('checkTargetInvestasi — salah satu belum tercapai -> ok false, masuk notDone', () => {
  const { SelfReward } = makeEngine({
    D: {
      targets: [
        { name: 'Reksadana', amount: 100, saved: 100 },
        { name: 'Emas', amount: 200, saved: 50 },
      ],
    },
  });
  const r = SelfReward.checkTargetInvestasi();
  assert.equal(r.ok, false);
  assert.equal(r.notDone.length, 1);
  assert.equal(r.notDone[0].name, 'Emas');
});

// ---------- checkUtangMacet ----------

test('checkUtangMacet — tidak ada utang -> ok true', () => {
  const { SelfReward } = makeEngine({ D: { debts: [] } });
  assert.equal(SelfReward.checkUtangMacet().ok, true);
});

test('checkUtangMacet — utang belum lunas tapi jatuh tempo masih di masa depan -> ok true', () => {
  const { SelfReward } = makeEngine({
    D: { debts: [{ name: 'Bank ABC', lunas: false, jatuhTempo: daysFromNowStr(10) }] },
  });
  assert.equal(SelfReward.checkUtangMacet().ok, true);
});

test('checkUtangMacet — utang belum lunas & sudah lewat jatuh tempo -> ok false', () => {
  const { SelfReward } = makeEngine({
    D: { debts: [{ name: 'Bank ABC', lunas: false, jatuhTempo: daysAgoStr(5) }] },
  });
  const r = SelfReward.checkUtangMacet();
  assert.equal(r.ok, false);
  assert.equal(r.macetList.length, 1);
  assert.equal(r.macetList[0].name, 'Bank ABC');
});

test('checkUtangMacet — utang sudah lunas walau lewat jatuh tempo -> tetap ok true', () => {
  const { SelfReward } = makeEngine({
    D: { debts: [{ name: 'Bank ABC', lunas: true, jatuhTempo: daysAgoStr(30) }] },
  });
  assert.equal(SelfReward.checkUtangMacet().ok, true);
});

test('checkUtangMacet — graceDaysUtang dari settings dipakai sbg toleransi', () => {
  const { SelfReward } = makeEngine({
    D: {
      selfReward: { graceDaysUtang: 7 },
      debts: [{ name: 'Bank ABC', lunas: false, jatuhTempo: daysAgoStr(5) }],
    },
  });
  // telat 5 hari, tapi toleransi 7 hari -> belum dianggap macet
  assert.equal(SelfReward.checkUtangMacet().ok, true);
});

// ---------- checkTagihanLunas ----------

test('checkTagihanLunas — pakai getBillStats() global kalau tersedia & graceDays default (0)', () => {
  const { SelfReward } = makeEngine({
    D: { bills: [] },
    getBillStats: () => ({ overdueCount: 2 }),
  });
  const r = SelfReward.checkTagihanLunas();
  assert.equal(r.ok, false);
  assert.equal(r.overdueCount, 2);
});

test('checkTagihanLunas — fallback hitung manual dari D.bills kalau getBillStats tidak tersedia', () => {
  const { SelfReward } = makeEngine({
    D: {
      bills: [
        { name: 'Listrik', nextDue: daysAgoStr(3) },
        { name: 'WiFi', nextDue: daysFromNowStr(10) },
      ],
    },
  });
  const r = SelfReward.checkTagihanLunas();
  assert.equal(r.ok, false);
  assert.equal(r.overdueCount, 1);
  assert.equal(r.overdueList[0].name, 'Listrik');
});

test('checkTagihanLunas — semua tagihan belum jatuh tempo -> ok true (fallback manual)', () => {
  const { SelfReward } = makeEngine({
    D: { bills: [{ name: 'Listrik', nextDue: daysFromNowStr(5) }] },
  });
  assert.equal(SelfReward.checkTagihanLunas().ok, true);
});

// ---------- evaluate() : Not Eligible ----------

test('evaluate() — satu kondisi gagal (dana darurat belum ada) -> Not Eligible, priorities berisi label yg gagal', () => {
  const FI = { monthlySurplus: () => 500000, annualExpense: () => 12000000 };
  const { SelfReward } = makeEngine({
    D: { budgets: [], targets: [], debts: [], bills: [] },
    FI,
  });
  const r = SelfReward.evaluate();
  assert.equal(r.eligible, false);
  assert.ok(r.priorities.includes('Dana darurat mencapai target'));
  assert.equal(r.rewardLevel, undefined);
});

test('evaluate() — cashflow negatif -> Not Eligible walau semua kondisi lain terpenuhi', () => {
  const FI = { monthlySurplus: () => -50000, annualExpense: () => 12000000 };
  const { SelfReward } = makeEngine({
    D: {
      budgets: [],
      targets: [{ name: 'DD', isDanaDarurat: true, amount: 100, saved: 100 }],
      debts: [],
      bills: [],
    },
    FI,
  });
  const r = SelfReward.evaluate();
  assert.equal(r.eligible, false);
  assert.ok(r.priorities.includes('Cashflow positif'));
});

// ---------- evaluate() : Eligible ----------

function makeAllPassD() {
  return {
    budgets: [],
    targets: [{ name: 'DD', isDanaDarurat: true, amount: 1000000, saved: 1000000 }],
    debts: [],
    bills: [],
  };
}

test('evaluate() — semua kondisi lolos -> Eligible, ada rewardLevel (1-3) & maxReward >= 0', () => {
  const FI = { monthlySurplus: () => 1000000, annualExpense: () => 12000000 };
  const { SelfReward } = makeEngine({ D: makeAllPassD(), FI });
  const r = SelfReward.evaluate();
  assert.equal(r.eligible, true);
  assert.ok([1, 2, 3].includes(r.rewardLevel));
  assert.ok(r.maxReward >= 0);
  assert.equal(r.priorities, undefined);
});

test('evaluate() — Eligible, maxReward = surplus x pct level yang terpilih / 100 (level dari settings custom)', () => {
  const FI = { monthlySurplus: () => 1000000, annualExpense: () => 12000000000 }; // avg expense gede -> surplusScore kecil -> level 1
  const D = makeAllPassD();
  D.selfReward = { level1Pct: 2, level2Pct: 5, level3Pct: 10 };
  const { SelfReward } = makeEngine({ D, FI });
  const r = SelfReward.evaluate();
  assert.equal(r.rewardLevel, 1);
  assert.equal(r.maxReward, Math.round(1000000 * 0.02));
});

test('evaluate() — dana darurat & surplus jauh melebihi target -> rewardLevel naik ke 3', () => {
  // surplus == avgMonthlyExpense * 2 -> surplusScore = 150 (capped); dana
  // darurat terisi 150% -> ddScore 150; tidak ada target investasi ->
  // investScore 100 -> rata-rata (150+100+150)/3 = 133.3 -> level 3.
  const FI = { monthlySurplus: () => 2000000, annualExpense: () => 12000000 }; // avgMonthlyExpense = 1.000.000
  const D = {
    budgets: [],
    targets: [{ name: 'DD', isDanaDarurat: true, amount: 1000000, saved: 1500000 }],
    debts: [],
    bills: [],
  };
  const { SelfReward } = makeEngine({ D, FI });
  const r = SelfReward.evaluate();
  assert.equal(r.rewardLevel, 3);
  assert.equal(r.maxReward, Math.round(2000000 * 0.10));
});

test('evaluate() — reasons selalu berisi keenam kondisi (ok true/false), utk ditampilkan sbg Alasan', () => {
  const FI = { monthlySurplus: () => 1000000, annualExpense: () => 12000000 };
  const { SelfReward } = makeEngine({ D: makeAllPassD(), FI });
  const r = SelfReward.evaluate();
  assert.equal(r.reasons.length, 6);
  assert.ok(r.reasons.every((x) => typeof x.ok === 'boolean' && typeof x.label === 'string'));
});

// ---------- window exposure ----------

test('window.SelfReward ke-expose (dipakai lewat data-action="SelfReward.method" pola modul lain)', () => {
  const ctx = loadSource(['modules/self-reward/self-reward-engine.js'], { D: {}, save: () => {}, window: {} });
  assert.ok(ctx.window.SelfReward, 'window.SelfReward harus di-expose');
  assert.equal(typeof ctx.window.SelfReward.evaluate, 'function');
});
