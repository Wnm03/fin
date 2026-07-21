'use strict';
// tests/lifeos-area-adapter.test.js — areaAdapterList()/areaAdapterFindOne()
// (lifeos/adapters/area-adapter.js, file baru). Fokus: LIFEOS_AREAS
// (lifeos-registry.js) benar2 dikonsumsi otomatis — hasil adapter berubah
// mengikuti isi registry, bukan daftar area yang di-hardcode ulang di
// adapter.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function load() {
  return loadSource(
    ['lifeos/lifeos-registry.js', 'lifeos/adapters/area-adapter.js'],
    {},
    ['LIFEOS_AREAS'],
  );
}

test('areaAdapterList(): jumlah area yang dihasilkan sama persis dgn jumlah entri LIFEOS_AREAS', () => {
  const ctx = load();
  const D = {};
  const result = ctx.areaAdapterList(D);
  assert.equal(result.length, ctx.LIFEOS_AREAS.length);
  assert.deepEqual(result.map((a) => a.key), ctx.LIFEOS_AREAS.map((a) => a.key));
});

test('areaAdapterList(): itemCount = total panjang seluruh dSources area itu di D', () => {
  const ctx = load();
  const D = {
    transactions: [1, 2, 3], accounts: [1], budgets: [], budgetReko: [],
    bills: [1, 2], billsArchive: [], debts: [], debtStrategy: [], piutang: [], pajakZakat: [],
  };
  const result = ctx.areaAdapterList(D);
  const finance = result.find((a) => a.key === 'finance');
  // transactions(3) + accounts(1) + bills(2) = 6, sisanya 0/undefined
  assert.equal(finance.itemCount, 6);
});

test('areaAdapterList(): dSources yang belum ada di D (undefined, domain belum di-load) dihitung 0, tidak throw', () => {
  const ctx = load();
  const D = {}; // semua domain kosong/belum di-load
  assert.doesNotThrow(() => ctx.areaAdapterList(D));
  const result = ctx.areaAdapterList(D);
  result.forEach((a) => assert.equal(a.itemCount, 0));
});

test('areaAdapterList(): registry-driven — kalau LIFEOS_AREAS ditambah 1 entri baru, adapter otomatis ikut menghasilkannya', () => {
  const ctx = load();
  ctx.LIFEOS_AREAS.push({ key: 'hobby', label: 'Hobby', icon: '🎨', dSources: ['hobbyItems'] });
  const D = { hobbyItems: [1, 2] };
  const result = ctx.areaAdapterList(D);
  const hobby = result.find((a) => a.key === 'hobby');
  assert.ok(hobby, 'area baru "hobby" harus otomatis muncul tanpa ubah area-adapter.js');
  assert.equal(hobby.itemCount, 2);
});

test('areaAdapterFindOne(): balikin 1 area sesuai key, null kalau tidak ketemu', () => {
  const ctx = load();
  const D = {};
  assert.equal(ctx.areaAdapterFindOne(D, 'finance').key, 'finance');
  assert.equal(ctx.areaAdapterFindOne(D, 'tidak-ada'), null);
});
