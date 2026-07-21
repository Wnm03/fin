'use strict';
// tests/lifeos-review-adapter.test.js — reviewAdapterLatestSnapshots()/
// reviewAdapterLogFor()/reviewAdapterIsOverdue() (lifeos/adapters/
// review-adapter.js). Fokus: (1) reviewAdapterLatestSnapshots() SEKARANG
// registry-driven — dibaca dari LIFEOS_REVIEW_SOURCES (lifeos-registry.js),
// dispatch ke REVIEW_SOURCE_BUILDERS per `key`, bukan hardcode nama array D
// di badan fungsi — sama pola dgn tests/lifeos-goal-adapter.test.js /
// tests/lifeos-project-adapter.test.js; (2) 3 sumber existing (wealth/
// lifeBalance/assetAlloc) tetap menghasilkan bentuk output yang SAMA
// PERSIS dgn sebelum migrasi (field wealth/lifeBalance/assetAllocation);
// (3) reviewAdapterLogFor()/reviewAdapterIsOverdue() (LifeOSStore.reviewLog)
// TIDAK berubah sama sekali.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function load() {
  return loadSource(
    ['lifeos/lifeos-registry.js', 'lifeos/adapters/review-adapter.js'],
    {},
    ['LIFEOS_REVIEW_SOURCES', 'REVIEW_SOURCE_BUILDERS', 'REVIEW_OUTPUT_FIELD'],
  );
}

test('reviewAdapterLatestSnapshots(): registry-driven — semua key di LIFEOS_REVIEW_SOURCES punya builder di REVIEW_SOURCE_BUILDERS', () => {
  const ctx = load();
  const keysWithBuilder = ctx.LIFEOS_REVIEW_SOURCES
    .map((s) => s.key)
    .filter((k) => typeof ctx.REVIEW_SOURCE_BUILDERS[k] === 'function');
  assert.equal(keysWithBuilder.join(','), 'wealth,lifeBalance,assetAlloc');
});

test('reviewAdapterLatestSnapshots(): wealth — item terakhir dari D[dArr registry], bukan hardcode nama array', () => {
  const ctx = load();
  const D = { wealthSnapshots: [{ netWorth: 100 }, { netWorth: 250 }] };
  const result = ctx.reviewAdapterLatestSnapshots(D);
  assert.equal(result.wealth.netWorth, 250);
});

test('reviewAdapterLatestSnapshots(): lifeBalance — item terakhir dari D[dArr registry]', () => {
  const ctx = load();
  const D = { lifeBalanceSnapshots: [{ score: 5 }, { score: 8 }] };
  const result = ctx.reviewAdapterLatestSnapshots(D);
  assert.equal(result.lifeBalance.score, 8);
});

test('reviewAdapterLatestSnapshots(): assetAlloc — dibaca langsung (bukan array), field output tetap "assetAllocation" (backward compatible)', () => {
  const ctx = load();
  const D = { assetAllocation: { saham: 40, obligasi: 60 } };
  const result = ctx.reviewAdapterLatestSnapshots(D);
  assert.equal(result.assetAllocation.saham, 40);
  assert.equal(result.assetAllocation.obligasi, 60);
});

test('reviewAdapterLatestSnapshots(): array/objek D kosong/belum ada -> semua field null, tidak throw', () => {
  const ctx = load();
  assert.doesNotThrow(() => ctx.reviewAdapterLatestSnapshots({}));
  const result = ctx.reviewAdapterLatestSnapshots({});
  assert.equal(result.wealth, null);
  assert.equal(result.lifeBalance, null);
  assert.equal(result.assetAllocation, null);
});

test('reviewAdapterLatestSnapshots(): kalau 1 entri dihapus dari LIFEOS_REVIEW_SOURCES, sumbernya otomatis berhenti diproses (field tidak muncul di hasil)', () => {
  const ctx = load();
  ctx.LIFEOS_REVIEW_SOURCES.splice(
    ctx.LIFEOS_REVIEW_SOURCES.findIndex((s) => s.key === 'assetAlloc'), 1,
  );
  const D = { assetAllocation: { saham: 40 } };
  const result = ctx.reviewAdapterLatestSnapshots(D);
  assert.equal('assetAllocation' in result, false);
});

test('reviewAdapterLatestSnapshots(): key tanpa builder terdaftar dilewati dgn aman, TIDAK throw', () => {
  const ctx = load();
  ctx.LIFEOS_REVIEW_SOURCES.push({ key: 'belumAda', dArr: 'belumAdaArr' });
  const D = { belumAdaArr: [{ x: 1 }] };
  assert.doesNotThrow(() => ctx.reviewAdapterLatestSnapshots(D));
  const result = ctx.reviewAdapterLatestSnapshots(D);
  assert.equal('belumAda' in result, false);
});

test('reviewAdapterLatestSnapshots(): kalau dArr di registry diganti, adapter otomatis ikut baca array D yang baru (bukti benar-benar dibaca dari registry)', () => {
  const ctx = load();
  ctx.LIFEOS_REVIEW_SOURCES.find((s) => s.key === 'wealth').dArr = 'wealthSnapshotsBaru';
  const D = { wealthSnapshotsBaru: [{ netWorth: 999 }] };
  const result = ctx.reviewAdapterLatestSnapshots(D);
  assert.equal(result.wealth.netWorth, 999);
});

test('reviewAdapterLogFor(): TIDAK berubah — filter+sort reviewLog berdasar period, terbaru dulu', () => {
  const ctx = load();
  const store = {
    reviewLog: [
      { period: 'weekly', completedAt: '2026-07-01T00:00:00Z' },
      { period: 'weekly', completedAt: '2026-07-10T00:00:00Z' },
      { period: 'monthly', completedAt: '2026-07-05T00:00:00Z' },
    ],
  };
  const result = ctx.reviewAdapterLogFor(store, 'weekly');
  assert.equal(result.length, 2);
  assert.equal(result[0].completedAt, '2026-07-10T00:00:00Z');
});

test('reviewAdapterIsOverdue(): TIDAK berubah — true kalau belum ada log, true kalau sudah lewat threshold, false kalau belum', () => {
  const ctx = load();
  assert.equal(ctx.reviewAdapterIsOverdue({}, 'weekly', 7), true);
  const recentStore = { reviewLog: [{ period: 'weekly', completedAt: new Date().toISOString() }] };
  assert.equal(ctx.reviewAdapterIsOverdue(recentStore, 'weekly', 7), false);
  const oldStore = { reviewLog: [{ period: 'weekly', completedAt: '2020-01-01T00:00:00Z' }] };
  assert.equal(ctx.reviewAdapterIsOverdue(oldStore, 'weekly', 7), true);
});
