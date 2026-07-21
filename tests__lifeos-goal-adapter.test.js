'use strict';
// tests/lifeos-goal-adapter.test.js — goalAdapterList()/goalAdapterFindOne()
// (lifeos/adapters/goal-adapter.js). Fokus: (1) goalAdapterList() SEKARANG
// registry-driven (iterasi LIFEOS_GOAL_SOURCES, dispatch ke
// GOAL_SOURCE_BUILDERS per key) — bukan cuma diklaim di komentar, sama pola
// dgn tests/lifeos-today-adapter.test.js; (2) SEMUA 6 sumber (target/
// eduFund/wishlist/pensiun/fi/debt — Sesi 49, keputusan produk final
// `docs/PRODUCT_DECISIONS.md` § LifeOS) menghasilkan goal card sesuai
// bentuk D masing-masing, TERMASUK guard "belum dikonfigurasi"/"Pensiun|FI
// tidak tersedia" utk pensiun/fi (reuse langsung Pensiun.*/FI.*, BUKAN
// dihitung ulang dari D — di-stub lewat extraGlobals loadSource() persis
// pola tests/lifeos-*.test.js lain yang butuh fungsi module lain).
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function load(extraGlobals = {}) {
  return loadSource(
    ['lifeos/lifeos-registry.js', 'lifeos/adapters/goal-adapter.js'],
    extraGlobals,
    ['LIFEOS_GOAL_SOURCES', 'GOAL_SOURCE_BUILDERS'],
  );
}

test('goalAdapterList(): registry-driven — hanya key yang punya builder di GOAL_SOURCE_BUILDERS yang diproses', () => {
  const ctx = load();
  const keysWithBuilder = ctx.LIFEOS_GOAL_SOURCES
    .map((s) => s.key)
    .filter((k) => typeof ctx.GOAL_SOURCE_BUILDERS[k] === 'function');
  // .join() dulu supaya perbandingan tidak terjatuh oleh beda realm
  // Array (vm sandbox vs host) — isinya yang dibandingkan, bukan identity.
  // Sesi 49: pensiun/fi/debt sekarang PUNYA builder (urutan mengikuti
  // LIFEOS_GOAL_SOURCES: target,eduFund,pensiun,fi,wishlist,debt).
  assert.equal(keysWithBuilder.join(','), 'target,eduFund,pensiun,fi,wishlist,debt');
});

test('pensiun: builder dilewati aman (TIDAK throw) kalau D.pensiun belum dikonfigurasi', () => {
  const ctx = load();
  const D = { pensiun: { aktif: false } };
  assert.doesNotThrow(() => ctx.goalAdapterList(D));
  assert.equal(ctx.goalAdapterList(D).some((g) => g.sourceKind === 'pensiun'), false);
});

test('pensiun: builder dilewati aman kalau global Pensiun tidak tersedia (guard typeof), walau D.pensiun lengkap', () => {
  const ctx = load();
  const D = { pensiun: { aktif: true, usiaSekarang: 30, usiaPensiun: 58, targetDana: 500000000, accId: 'a1' } };
  assert.doesNotThrow(() => ctx.goalAdapterList(D));
  assert.equal(ctx.goalAdapterList(D).some((g) => g.sourceKind === 'pensiun'), false);
});

test('pensiun: reuse Pensiun.danaTerkumpul() (stub) sbg currentAmount, targetAmount dari D.pensiun.targetDana', () => {
  const ctx = load({ Pensiun: { danaTerkumpul: () => 100000000 } });
  const D = { pensiun: { aktif: true, usiaSekarang: 30, usiaPensiun: 58, targetDana: 500000000, accId: 'a1' } };
  const g = ctx.goalAdapterList(D).find((x) => x.sourceKind === 'pensiun');
  assert.equal(g.id, 'pensiun:main');
  assert.equal(g.emoji, '🏖️');
  assert.equal(g.targetAmount, 500000000);
  assert.equal(g.currentAmount, 100000000);
  assert.equal(g.progressPct, 20);
  assert.equal(g.areaKey, 'finance');
});

test('pensiun: kalau Pensiun.danaTerkumpul() throw, builder tetap tidak throw (currentAmount fallback 0)', () => {
  const ctx = load({ Pensiun: { danaTerkumpul: () => { throw new Error('boom'); } } });
  const D = { pensiun: { aktif: true, usiaSekarang: 30, usiaPensiun: 58, targetDana: 500000000, accId: 'a1' } };
  assert.doesNotThrow(() => ctx.goalAdapterList(D));
  const g = ctx.goalAdapterList(D).find((x) => x.sourceKind === 'pensiun');
  assert.equal(g.currentAmount, 0);
});

test('fi: builder dilewati aman kalau global FI tidak tersedia (guard typeof)', () => {
  const ctx = load();
  const D = { finansialFreedom: { expenseCatIds: [], avgMonths: 6, swr: 4 } };
  assert.doesNotThrow(() => ctx.goalAdapterList(D));
  assert.equal(ctx.goalAdapterList(D).some((g) => g.sourceKind === 'fi'), false);
});

test('fi: builder dilewati aman kalau targetNominal() <= 0 (belum ada data transaksi cukup)', () => {
  const ctx = load({ FI: { targetNominal: () => 0, netAssetFund: () => 0 } });
  const D = { finansialFreedom: {} };
  assert.equal(ctx.goalAdapterList(D).some((g) => g.sourceKind === 'fi'), false);
});

test('fi: reuse FI.targetNominal()/FI.netAssetFund() (stub) sbg target/currentAmount', () => {
  const ctx = load({ FI: { targetNominal: () => 1000000000, netAssetFund: () => 250000000 } });
  const D = { finansialFreedom: {} };
  const g = ctx.goalAdapterList(D).find((x) => x.sourceKind === 'fi');
  assert.equal(g.id, 'fi:main');
  assert.equal(g.emoji, '🕊️');
  assert.equal(g.targetAmount, 1000000000);
  assert.equal(g.currentAmount, 250000000);
  assert.equal(g.progressPct, 25);
  assert.equal(g.areaKey, 'finance');
});

test('debt: D.debts (BUKAN D.debtStrategy) sbg sumber, tiap utang jadi goal card, target=nilai', () => {
  const ctx = load();
  const D = { debts: [{ id: 'd1', name: 'KTA Bank X', nilai: 20000000, lunas: false, jatuhTempo: '2027-01-10' }] };
  const g = ctx.goalAdapterList(D).find((x) => x.sourceKind === 'debt');
  assert.equal(g.id, 'debt:d1');
  assert.equal(g.name, 'KTA Bank X');
  assert.equal(g.emoji, '📕');
  assert.equal(g.targetAmount, 20000000);
  assert.equal(g.currentAmount, 0);
  assert.equal(g.progressPct, 0);
  assert.equal(g.deadline, '2027-01-10');
});

test('debt: utang lunas -> currentAmount = nilai, progressPct 100', () => {
  const ctx = load();
  const D = { debts: [{ id: 'd2', name: 'Cicilan Motor', nilai: 5000000, lunas: true }] };
  const g = ctx.goalAdapterList(D).find((x) => x.sourceKind === 'debt');
  assert.equal(g.currentAmount, 5000000);
  assert.equal(g.progressPct, 100);
  assert.equal(g.deadline, null);
});

test('debt: item dgn nilai 0/kosong dilewati (tidak jadi goal card)', () => {
  const ctx = load();
  const D = { debts: [{ id: 'd3', name: 'Tanpa Nilai', nilai: 0, lunas: false }] };
  assert.equal(ctx.goalAdapterList(D).some((g) => g.sourceKind === 'debt'), false);
});

test('goalAdapterList(): registry-driven — kalau 1 entri dihapus dari LIFEOS_GOAL_SOURCES, sumbernya otomatis berhenti diproses', () => {
  const ctx = load();
  const D = { wishlist: [{ id: 'w1', name: 'Kamera', price: 5000000, bought: false }] };
  ctx.LIFEOS_GOAL_SOURCES.splice(
    ctx.LIFEOS_GOAL_SOURCES.findIndex((s) => s.key === 'wishlist'), 1,
  );
  const items = ctx.goalAdapterList(D);
  assert.equal(items.some((i) => i.sourceKind === 'wishlist'), false);
});

test('goalAdapterList(): array D kosong/belum ada -> hasil kosong, tidak throw', () => {
  const ctx = load();
  assert.doesNotThrow(() => ctx.goalAdapterList({}));
  assert.equal(ctx.goalAdapterList({}).length, 0);
});

test('target: dipetakan jadi goal card, progressPct dibulatkan dari saved/amount', () => {
  const ctx = load();
  const D = { targets: [{ id: 't1', name: 'Dana Darurat', amount: 10000000, saved: 2500000, isDanaDarurat: true }] };
  const result = ctx.goalAdapterList(D);
  const g = result.find((x) => x.sourceKind === 'target');
  assert.equal(g.id, 'target:t1');
  assert.equal(g.name, 'Dana Darurat');
  assert.equal(g.emoji, '🎯');
  assert.equal(g.targetAmount, 10000000);
  assert.equal(g.currentAmount, 2500000);
  assert.equal(g.progressPct, 25);
  assert.equal(g.areaKey, 'finance');
  assert.equal(g.isDanaDarurat, true);
});

test('target: progressPct 0 kalau amount 0/kosong, tidak NaN/Infinity', () => {
  const ctx = load();
  const D = { targets: [{ id: 't2', name: 'Tanpa Target', amount: 0, saved: 0 }] };
  const g = ctx.goalAdapterList(D).find((x) => x.sourceKind === 'target');
  assert.equal(g.progressPct, 0);
});

test('eduFund: dipetakan jadi goal card, progressPct null kalau target belum diisi', () => {
  const ctx = load();
  const D = { eduFunds: [{ id: 'e1', name: 'Kuliah Anak', target: null, saved: 1000000 }] };
  const g = ctx.goalAdapterList(D).find((x) => x.sourceKind === 'eduFund');
  assert.equal(g.id, 'eduFund:e1');
  assert.equal(g.targetAmount, null);
  assert.equal(g.currentAmount, 1000000);
  assert.equal(g.progressPct, null);
});

test('eduFund: name fallback ke "Dana Pendidikan" kalau kosong', () => {
  const ctx = load();
  const D = { eduFunds: [{ id: 'e2', target: 20000000, saved: 5000000 }] };
  const g = ctx.goalAdapterList(D).find((x) => x.sourceKind === 'eduFund');
  assert.equal(g.name, 'Dana Pendidikan');
  assert.equal(g.progressPct, 25);
});

test('wishlist: hanya item yang belum bought yang masuk, targetAmount = price', () => {
  const ctx = load();
  const D = {
    wishlist: [
      { id: 'w1', name: 'Kamera', price: 5000000, bought: false },
      { id: 'w2', name: 'Sepatu', price: 800000, bought: true },
    ],
  };
  const result = ctx.goalAdapterList(D).filter((x) => x.sourceKind === 'wishlist');
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'wishlist:w1');
  assert.equal(result[0].targetAmount, 5000000);
  assert.equal(result[0].currentAmount, 0);
  assert.equal(result[0].progressPct, 0);
});

test('goalAdapterList(): urutan hasil = target -> eduFund -> wishlist (mengikuti urutan LIFEOS_GOAL_SOURCES, sama dgn perilaku sebelum registry-driven)', () => {
  const ctx = load();
  const D = {
    targets: [{ id: 't1', name: 'A', amount: 100, saved: 10 }],
    eduFunds: [{ id: 'e1', name: 'B', target: 100, saved: 10 }],
    wishlist: [{ id: 'w1', name: 'C', price: 100, bought: false }],
  };
  const result = ctx.goalAdapterList(D);
  assert.equal(result.map((g) => g.sourceKind).join(','), 'target,eduFund,wishlist');
});

test('goalAdapterFindOne(): balikin 1 goal card sesuai sourceKind+sourceId, null kalau tidak ketemu', () => {
  const ctx = load();
  const D = { targets: [{ id: 't1', name: 'Dana Darurat', amount: 100, saved: 10 }] };
  const found = ctx.goalAdapterFindOne(D, 'target', 't1');
  assert.equal(found.id, 'target:t1');
  assert.equal(ctx.goalAdapterFindOne(D, 'target', 'tidak-ada'), null);
  assert.equal(ctx.goalAdapterFindOne(D, 'wishlist', 't1'), null);
});

// Sesi 35 (target eksplisit user: "Registry Driven Goal Adapter") — guard tambahan:
// kalau LIFEOS_GOAL_SOURCES nambah entri BARU (key belum terdaftar sebelumnya) dan builder-nya
// SUDAH ada di GOAL_SOURCE_BUILDERS, goalAdapterList() harus otomatis ikut memprosesnya TANPA
// perlu ubah goalAdapterList() itu sendiri — bukti langsung bahwa daftar sumber murni dibaca dari
// registry saat runtime, bukan hardcode di badan fungsi.
test('goalAdapterList(): registry-driven — entri BARU di LIFEOS_GOAL_SOURCES otomatis diproses kalau builder-nya sudah ada, tanpa ubah goalAdapterList()', () => {
  const ctx = load();
  ctx.GOAL_SOURCE_BUILDERS.dummyGoal = (D) => (D.dummyGoals || []).map((g) => ({
    id: `dummyGoal:${g.id}`, sourceKind: 'dummyGoal', sourceId: g.id, name: g.name,
  }));
  ctx.LIFEOS_GOAL_SOURCES.push({ key: 'dummyGoal', dArr: 'dummyGoals', areaKey: 'finance' });
  const D = { dummyGoals: [{ id: 'd1', name: 'Goal Dummy' }] };
  const result = ctx.goalAdapterList(D);
  assert.equal(result.some((g) => g.sourceKind === 'dummyGoal' && g.id === 'dummyGoal:d1'), true);
});
