'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// investasi.js — modul BARU, murni logic (tidak ada DOM), jadi dites lewat
// loadSource() biasa. `const Investment={...}` butuh expose:['Investment']
// karena vm TIDAK menempelkan binding const ke context secara otomatis
// (lihat catatan di tests/helpers/loadSource.js). `D`, `save()`, dan `uid()`
// di-inject sbg extraGlobals — pola sama dgn tests/self-reward-engine.test.js.

function makeEngine({ D } = {}) {
  const saveCalls = [];
  let seq = 1;
  const extraGlobals = {
    D: D || {},
    save: (...args) => saveCalls.push(args),
    uid: () => 'uid_' + (seq++),
  };
  const ctx = loadSource(['modules/asset/investasi.js'], extraGlobals, ['Investment', 'INVESTMENT_TYPES']);
  return { Investment: ctx.Investment, TYPES: ctx.INVESTMENT_TYPES, D: extraGlobals.D, saveCalls };
}

// ---------- Holding CRUD ----------

test('addHolding — membuat holding baru dengan default yang benar', () => {
  const { Investment, D, saveCalls } = makeEngine({ D: {} });
  const h = Investment.addHolding({ name: 'BBCA', type: 'Saham', unit: 100, avgPrice: 9000, currentPrice: 9500 });
  assert.equal(h.name, 'BBCA');
  assert.equal(h.type, 'Saham');
  assert.equal(h.unit, 100);
  assert.equal(h.avgPrice, 9000);
  assert.equal(h.currentPrice, 9500);
  assert.equal(D.investments.length, 1);
  assert.equal(saveCalls.length, 1);
});

test('addHolding — nama kosong dilempar error', () => {
  const { Investment } = makeEngine({ D: {} });
  assert.throws(() => Investment.addHolding({ name: '  ' }), /Nama instrumen wajib diisi/);
});

test('addHolding — type tidak dikenal fallback ke "Lainnya"', () => {
  const { Investment } = makeEngine({ D: {} });
  const h = Investment.addHolding({ name: 'X', type: 'TidakDikenal' });
  assert.equal(h.type, 'Lainnya');
});

test('updateHolding — mengubah currentPrice & notes', () => {
  const { Investment } = makeEngine({ D: {} });
  const h = Investment.addHolding({ name: 'BBCA', avgPrice: 9000 });
  Investment.updateHolding(h.id, { currentPrice: 9800, notes: 'update harga' });
  assert.equal(Investment.getHolding(h.id).currentPrice, 9800);
  assert.equal(Investment.getHolding(h.id).notes, 'update harga');
});

test('deleteHolding — menghapus holding beserta transaksi terkait', () => {
  const { Investment, D } = makeEngine({ D: {} });
  const h = Investment.addHolding({ name: 'BBCA' });
  Investment.addTransaction({ investmentId: h.id, type: 'beli', qty: 10, price: 9000 });
  assert.equal(D.investmentTx.length, 1);
  const deleted = Investment.deleteHolding(h.id);
  assert.equal(deleted, true);
  assert.equal(Investment.getHoldings().length, 0);
  assert.equal(D.investmentTx.length, 0);
});

// ---------- Transaksi & recompute average cost ----------

test('addTransaction beli — menambah unit & menghitung avgPrice (average cost)', () => {
  const { Investment } = makeEngine({ D: {} });
  const h = Investment.addHolding({ name: 'BBCA' });
  Investment.addTransaction({ investmentId: h.id, type: 'beli', qty: 10, price: 9000 });
  Investment.addTransaction({ investmentId: h.id, type: 'beli', qty: 10, price: 11000 });
  const updated = Investment.getHolding(h.id);
  assert.equal(updated.unit, 20);
  assert.equal(updated.avgPrice, 10000); // (10*9000 + 10*11000) / 20
});

test('addTransaction beli — fee ikut menambah cost basis', () => {
  const { Investment } = makeEngine({ D: {} });
  const h = Investment.addHolding({ name: 'BBCA' });
  Investment.addTransaction({ investmentId: h.id, type: 'beli', qty: 10, price: 1000, fee: 500 });
  const updated = Investment.getHolding(h.id);
  assert.equal(updated.unit, 10);
  assert.equal(updated.avgPrice, 1050); // (10*1000+500)/10
});

test('addTransaction jual — mengurangi unit & menghitung realizedGain, avgPrice tetap', () => {
  const { Investment } = makeEngine({ D: {} });
  const h = Investment.addHolding({ name: 'BBCA' });
  Investment.addTransaction({ investmentId: h.id, type: 'beli', qty: 10, price: 9000 });
  const jual = Investment.addTransaction({ investmentId: h.id, type: 'jual', qty: 4, price: 12000 });
  const updated = Investment.getHolding(h.id);
  assert.equal(updated.unit, 6);
  assert.equal(updated.avgPrice, 9000);
  assert.equal(jual.realizedGain, (12000 - 9000) * 4);
});

test('addTransaction jual — jumlah melebihi unit yang dipegang dilempar error', () => {
  const { Investment } = makeEngine({ D: {} });
  const h = Investment.addHolding({ name: 'BBCA' });
  Investment.addTransaction({ investmentId: h.id, type: 'beli', qty: 5, price: 1000 });
  assert.throws(() => Investment.addTransaction({ investmentId: h.id, type: 'jual', qty: 6, price: 1000 }), /melebihi unit/);
});

test('addTransaction jual habis — unit & avgPrice kembali 0', () => {
  const { Investment } = makeEngine({ D: {} });
  const h = Investment.addHolding({ name: 'BBCA' });
  Investment.addTransaction({ investmentId: h.id, type: 'beli', qty: 5, price: 1000 });
  Investment.addTransaction({ investmentId: h.id, type: 'jual', qty: 5, price: 1200 });
  const updated = Investment.getHolding(h.id);
  assert.equal(updated.unit, 0);
  assert.equal(updated.avgPrice, 0);
});

test('addTransaction dividen — tidak mengubah unit, tercatat sbg amount', () => {
  const { Investment } = makeEngine({ D: {} });
  const h = Investment.addHolding({ name: 'BBCA' });
  Investment.addTransaction({ investmentId: h.id, type: 'beli', qty: 10, price: 1000 });
  const div = Investment.addTransaction({ investmentId: h.id, type: 'dividen', amount: 50000, date: '2026-03-01' });
  assert.equal(div.amount, 50000);
  assert.equal(Investment.getHolding(h.id).unit, 10);
});

test('addTransaction dividen — amount wajib > 0', () => {
  const { Investment } = makeEngine({ D: {} });
  const h = Investment.addHolding({ name: 'BBCA' });
  assert.throws(() => Investment.addTransaction({ investmentId: h.id, type: 'dividen', amount: 0 }), /Nominal dividen/);
});

test('addTransaction — holding tidak ditemukan dilempar error', () => {
  const { Investment } = makeEngine({ D: {} });
  assert.throws(() => Investment.addTransaction({ investmentId: 'ga-ada', type: 'beli', qty: 1, price: 1 }), /Holding tidak ditemukan/);
});

test('deleteTransaction — menghapus tx beli lalu recompute holding otomatis', () => {
  const { Investment } = makeEngine({ D: {} });
  const h = Investment.addHolding({ name: 'BBCA' });
  const t1 = Investment.addTransaction({ investmentId: h.id, type: 'beli', qty: 10, price: 9000 });
  Investment.addTransaction({ investmentId: h.id, type: 'beli', qty: 10, price: 11000 });
  Investment.deleteTransaction(t1.id);
  const updated = Investment.getHolding(h.id);
  assert.equal(updated.unit, 10);
  assert.equal(updated.avgPrice, 11000);
});

test('getTransactions — filter by investmentId/type dan urut terbaru dulu', () => {
  const { Investment } = makeEngine({ D: {} });
  const h1 = Investment.addHolding({ name: 'A' });
  const h2 = Investment.addHolding({ name: 'B' });
  Investment.addTransaction({ investmentId: h1.id, type: 'beli', qty: 1, price: 100, date: '2026-01-01' });
  Investment.addTransaction({ investmentId: h1.id, type: 'beli', qty: 1, price: 100, date: '2026-02-01' });
  Investment.addTransaction({ investmentId: h2.id, type: 'beli', qty: 1, price: 100, date: '2026-01-15' });
  const list = Investment.getTransactions({ investmentId: h1.id });
  assert.equal(list.length, 2);
  assert.equal(list[0].date, '2026-02-01'); // terbaru dulu
});

// ---------- Nilai / Capital Gain-Loss / ROI ----------

test('holdingValue/holdingCost/holdingGainLoss/holdingROI', () => {
  const { Investment } = makeEngine({ D: {} });
  const h = Investment.addHolding({ name: 'BBCA', unit: 10, avgPrice: 1000, currentPrice: 1500 });
  assert.equal(Investment.holdingValue(h), 15000);
  assert.equal(Investment.holdingCost(h), 10000);
  assert.equal(Investment.holdingGainLoss(h), 5000);
  assert.equal(Investment.holdingROI(h), 50);
});

test('holdingROI — cost 0 tidak error (dibagi nol dihindari)', () => {
  const { Investment } = makeEngine({ D: {} });
  const h = Investment.addHolding({ name: 'X' });
  assert.equal(Investment.holdingROI(h), 0);
});

test('realizedGainLoss — total dari seluruh transaksi jual', () => {
  const { Investment } = makeEngine({ D: {} });
  const h = Investment.addHolding({ name: 'BBCA' });
  Investment.addTransaction({ investmentId: h.id, type: 'beli', qty: 10, price: 1000 });
  Investment.addTransaction({ investmentId: h.id, type: 'jual', qty: 4, price: 1500 });
  Investment.addTransaction({ investmentId: h.id, type: 'jual', qty: 2, price: 900 });
  const gain = Investment.realizedGainLoss(h.id);
  assert.equal(gain, (1500 - 1000) * 4 + (900 - 1000) * 2);
});

test('dividendTotal — filter opsional per investmentId & tahun', () => {
  const { Investment } = makeEngine({ D: {} });
  const h = Investment.addHolding({ name: 'BBCA' });
  Investment.addTransaction({ investmentId: h.id, type: 'beli', qty: 10, price: 1000 });
  Investment.addTransaction({ investmentId: h.id, type: 'dividen', amount: 10000, date: '2025-06-01' });
  Investment.addTransaction({ investmentId: h.id, type: 'dividen', amount: 20000, date: '2026-06-01' });
  assert.equal(Investment.dividendTotal(h.id), 30000);
  assert.equal(Investment.dividendTotal(h.id, '2026'), 20000);
});

// ---------- Ringkasan Portofolio & Alokasi Aset ----------

test('portfolioSummary — agregat lintas holding', () => {
  const { Investment } = makeEngine({ D: {} });
  const h1 = Investment.addHolding({ name: 'A', unit: 10, avgPrice: 1000, currentPrice: 1200 });
  const h2 = Investment.addHolding({ name: 'B', unit: 5, avgPrice: 2000, currentPrice: 1800 });
  Investment.addTransaction({ investmentId: h1.id, type: 'dividen', amount: 5000 });
  const sum = Investment.portfolioSummary();
  assert.equal(sum.holdingsCount, 2);
  assert.equal(sum.totalValue, 10 * 1200 + 5 * 1800);
  assert.equal(sum.totalCost, 10 * 1000 + 5 * 2000);
  assert.equal(sum.totalGainLoss, sum.totalValue - sum.totalCost);
  assert.equal(sum.totalDividend, 5000);
});

test('assetAllocation — dikelompokkan per type dengan persentase benar', () => {
  const { Investment } = makeEngine({ D: {} });
  Investment.addHolding({ name: 'BBCA', type: 'Saham', unit: 10, avgPrice: 1000, currentPrice: 1000 });
  Investment.addHolding({ name: 'Emas Antam', type: 'Emas', unit: 2, avgPrice: 1000000, currentPrice: 1000000 });
  const alloc = Investment.assetAllocation();
  assert.equal(alloc.length, 2);
  const total = 10 * 1000 + 2 * 1000000;
  const saham = alloc.find((a) => a.type === 'Saham');
  assert.equal(saham.value, 10000);
  assert.ok(Math.abs(saham.pct - (10000 / total) * 100) < 1e-9);
});

// ---------- Watchlist ----------

test('addWatch/updateWatch/removeWatch — CRUD dasar', () => {
  const { Investment, D } = makeEngine({ D: {} });
  const w = Investment.addWatch({ name: 'GOTO', type: 'Saham', lastPrice: 80, targetPrice: 70 });
  assert.equal(D.investmentWatchlist.length, 1);
  Investment.updateWatch(w.id, { lastPrice: 65 });
  assert.equal(Investment.getWatchlist()[0].lastPrice, 65);
  const removed = Investment.removeWatch(w.id);
  assert.equal(removed, true);
  assert.equal(Investment.getWatchlist().length, 0);
});

test('addWatch — nama kosong dilempar error', () => {
  const { Investment } = makeEngine({ D: {} });
  assert.throws(() => Investment.addWatch({ name: '' }), /Nama instrumen wajib diisi/);
});

test('watchlistAlerts — hanya item yang lastPrice <= targetPrice', () => {
  const { Investment } = makeEngine({ D: {} });
  Investment.addWatch({ name: 'A', lastPrice: 65, targetPrice: 70 }); // sudah kena target beli
  Investment.addWatch({ name: 'B', lastPrice: 90, targetPrice: 70 }); // belum
  Investment.addWatch({ name: 'C', lastPrice: 0, targetPrice: 70 }); // belum ada harga
  const alerts = Investment.watchlistAlerts();
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].name, 'A');
});

// ---------- TYPES ----------

test('INVESTMENT_TYPES mencakup jenis-jenis investasi yang diminta', () => {
  const { TYPES } = makeEngine({ D: {} });
  for (const t of ['Saham', 'Reksa Dana', 'Obligasi', 'Deposito', 'Kripto', 'Emas']) {
    assert.ok(TYPES.includes(t), `${t} harus ada di INVESTMENT_TYPES`);
  }
});
