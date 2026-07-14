'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// Cakupan file ini: `delTx` (hapus transaksi + efek samping lintas-modul:
// stok produk, Shop/Shop, catatan servis, Renov, WorthIt, SewaKios,
// Tukang) & `computeCashflowForecast` dari tx-list-cashflow.js. Dipisah
// dari tx-list-cashflow-render.test.js (lihat komentar di file itu) karena
// dua fungsi ini butuh mock dependency yg jauh lebih banyak/berat
// (askConfirm, D.products/shop/servisLogs/bbmLogs, Renov/WorthIt/
// SewaKios/Tukang, BudgetReko) dibanding fungsi render/filter yg cukup
// stub DOM sederhana.

function makeDelTxCtx(D, opts = {}) {
  const calls = { toast: [], save: 0, render: [], revertStockUsage: [], renov: [], worthit: [], sewakios: [], tukang: [] };
  const record = (name) => (...args) => calls.render.push([name, ...args]);
  const ctx = loadSource(['tx-list-cashflow.js'], {
    D,
    askConfirm: opts.askConfirm || (async () => true),
    toast: (msg, ...rest) => calls.toast.push(msg),
    save: () => { calls.save++; },
    renderDashboard: record('renderDashboard'),
    renderKeuangan: record('renderKeuangan'),
    renderCnTab: record('renderCnTab'),
    renderProductList: record('renderProductList'),
    renderShop: record('renderShop'),
    renderShopRecent: record('renderShopRecent'),
    renderStockList: record('renderStockList'),
    revertStockUsage: (...args) => calls.revertStockUsage.push(args),
    Renov: { onLinkedTxDeleted: (...args) => calls.renov.push(args) },
    WorthIt: { onLinkedTxDeleted: (...args) => calls.worthit.push(args) },
    SewaKios: { onLinkedTxDeleted: (...args) => calls.sewakios.push(args) },
    Tukang: { unmarkPaidEntries: (...args) => calls.tukang.push(args) },
  });
  return { ctx, calls };
}

function baseCoreCalls(calls) {
  const names = calls.render.map((r) => r[0]);
  assert.equal(calls.save, 1);
  assert.ok(names.includes('renderDashboard'));
  assert.ok(names.includes('renderKeuangan'));
  assert.ok(names.includes('renderCnTab'));
  assert.ok(names.includes('renderProductList'));
}

// ================= delTx — konfirmasi =================

test('delTx — user membatalkan konfirmasi => tidak ada apa2 yg berubah, tidak ada save/render/toast', async () => {
  const D = { transactions: [{ id: 't1', type: 'expense' }] };
  const { ctx, calls } = makeDelTxCtx(D, { askConfirm: async () => false });
  await ctx.delTx('t1');
  assert.equal(D.transactions.length, 1);
  assert.equal(calls.save, 0);
  assert.equal(calls.render.length, 0);
  assert.equal(calls.toast.length, 0);
});

// ================= delTx — kasus dasar (tanpa link apapun) =================

test('delTx — transaksi biasa tanpa link apapun: dihapus dari D.transactions, semua render dasar dipanggil, toast generik "🗑 Dihapus"', async () => {
  const D = { transactions: [{ id: 't1', type: 'expense' }, { id: 't2', type: 'income' }] };
  const { ctx, calls } = makeDelTxCtx(D);
  await ctx.delTx('t1');
  assert.deepEqual(D.transactions.map((t) => t.id), ['t2']);
  baseCoreCalls(calls);
  assert.deepEqual(calls.toast, ['🗑 Dihapus']);
});

test('delTx — id tidak ditemukan (t undefined): tidak error, tetap panggil save/render dasar & toast generik', async () => {
  const D = { transactions: [{ id: 't1' }] };
  const { ctx, calls } = makeDelTxCtx(D);
  await ctx.delTx('tidak-ada');
  assert.equal(D.transactions.length, 1); // tidak ada yg terhapus (filter no-op)
  baseCoreCalls(calls);
  assert.deepEqual(calls.toast, ['🗑 Dihapus']);
});

// ================= delTx — bbmLinkId =================

test('delTx — tx dgn bbmLinkId: entry terkait di D.bbmLogs ikut terhapus', async () => {
  const D = {
    transactions: [{ id: 't1', bbmLinkId: 'bbm1' }],
    bbmLogs: [{ id: 'bbm1' }, { id: 'bbm2' }],
  };
  const { ctx } = makeDelTxCtx(D);
  await ctx.delTx('t1');
  assert.deepEqual(D.bbmLogs.map((b) => b.id), ['bbm2']);
});

test('delTx — tx dgn bbmLinkId tapi D.bbmLogs tidak ada sama sekali: tidak error', async () => {
  const D = { transactions: [{ id: 't1', bbmLinkId: 'bbm1' }] };
  const { ctx } = makeDelTxCtx(D);
  await assert.doesNotReject(() => ctx.delTx('t1'));
});

// ================= delTx — stockItems (multi-produk) =================

test('delTx — tx dgn stockItems: stok tiap produk dikurangi sesuai qty, toast stok khusus, TANPA toast generik "🗑 Dihapus"', async () => {
  const D = {
    transactions: [{ id: 't1', stockItems: [{ productId: 'p1', qty: 3 }, { productId: 'p2', qty: 2 }] }],
    products: [{ id: 'p1', stock: 10 }, { id: 'p2', stock: 5 }],
  };
  const { ctx, calls } = makeDelTxCtx(D);
  await ctx.delTx('t1');
  assert.equal(D.products.find((p) => p.id === 'p1').stock, 7);
  assert.equal(D.products.find((p) => p.id === 'p2').stock, 3);
  assert.deepEqual(calls.toast, ['📦 Stok dikurangi (transaksi dihapus)']);
});

test('delTx — stockItems: stok tidak boleh minus (clamp ke 0) walau qty dihapus > stok tersisa', () => {
  return (async () => {
    const D = {
      transactions: [{ id: 't1', stockItems: [{ productId: 'p1', qty: 99 }] }],
      products: [{ id: 'p1', stock: 2 }],
    };
    const { ctx } = makeDelTxCtx(D);
    await ctx.delTx('t1');
    assert.equal(D.products.find((p) => p.id === 'p1').stock, 0);
  })();
});

// ================= delTx — stockProductId (single-produk) =================

test('delTx — tx dgn stockProductId (bukan stockItems): stok 1 produk dikurangi stockQty, toast sebut nama produk, tanpa toast generik', async () => {
  const D = {
    transactions: [{ id: 't1', stockProductId: 'p1', stockQty: 4 }],
    products: [{ id: 'p1', name: 'Batu Akik', stock: 10 }],
  };
  const { ctx, calls } = makeDelTxCtx(D);
  await ctx.delTx('t1');
  assert.equal(D.products.find((p) => p.id === 'p1').stock, 6);
  assert.equal(calls.toast.length, 1);
  assert.match(calls.toast[0], /Batu Akik/);
  assert.match(calls.toast[0], /dikurangi 4/);
});

test('delTx — stockProductId tapi produknya sudah tidak ada di D.products: tidak error, TIDAK ADA toast sama sekali (toast stok butuh produk ketemu, toast generik ditekan krn t.stockProductId tetap truthy)', async () => {
  const D = { transactions: [{ id: 't1', stockProductId: 'p-hilang', stockQty: 1 }], products: [] };
  const { ctx, calls } = makeDelTxCtx(D);
  await ctx.delTx('t1');
  assert.equal(calls.toast.length, 0);
});

// ================= delTx — cobekLinkId =================

test('delTx — tx dgn cobekLinkId & shop terkait punya items: stok dikembalikan, entry shop dihapus, render Shop dipanggil, tanpa toast generik', async () => {
  const D = {
    transactions: [{ id: 't1', cobekLinkId: 'c1' }],
    cobek: [{ id: 'c1', items: [{ productId: 'p1', qty: 5 }] }],
    products: [{ id: 'p1', stock: 10 }],
  };
  const { ctx, calls } = makeDelTxCtx(D);
  await ctx.delTx('t1');
  assert.equal(D.products.find((p) => p.id === 'p1').stock, 15);
  assert.equal(D.cobek.length, 0);
  const names = calls.render.map((r) => r[0]);
  assert.ok(names.includes('renderShop'));
  assert.ok(names.includes('renderShopRecent'));
  assert.ok(calls.toast.some((m) => /Stok dikembalikan/.test(m)));
  assert.ok(!calls.toast.includes('🗑 Dihapus'));
});

test('delTx — cobekLinkId tapi entry shop sudah tidak ketemu di D.cobek: tetap render Shop, tanpa toast stok, tanpa toast generik', async () => {
  const D = {
    transactions: [{ id: 't1', cobekLinkId: 'c-hilang' }],
    cobek: [{ id: 'c-lain', items: [] }],
  };
  const { ctx, calls } = makeDelTxCtx(D);
  await ctx.delTx('t1');
  assert.equal(D.cobek.length, 1); // c-lain tetap ada, filter cobekLinkId tidak match apapun
  const names = calls.render.map((r) => r[0]);
  assert.ok(names.includes('renderShop'));
  assert.equal(calls.toast.length, 0); // tidak match linkedShop => tidak ada toast stok; cobekLinkId set => toast generik ikut ditekan
});

// ================= delTx — servisLinkId =================

test('delTx — tx dgn servisLinkId & catatan servis ketemu dgn usedPartId: revertStockUsage dipanggil, entry servis dihapus, renderStockList dipanggil, tanpa toast generik', async () => {
  const D = {
    transactions: [{ id: 't1', servisLinkId: 's1' }],
    servisLogs: [{ id: 's1', usedPartId: 'p1', usedPartQty: 2 }],
  };
  const { ctx, calls } = makeDelTxCtx(D);
  await ctx.delTx('t1');
  assert.deepEqual(calls.revertStockUsage, [['p1', 2]]);
  assert.equal(D.servisLogs.length, 0);
  assert.ok(calls.render.map((r) => r[0]).includes('renderStockList'));
  assert.ok(calls.toast.some((m) => /Catatan servis terkait ikut dihapus/.test(m)));
  assert.ok(!calls.toast.includes('🗑 Dihapus'));
});

test('delTx — servisLinkId set tapi D.servisLogs TIDAK ada sama sekali: seluruh blok servis dilewati, DAN toast generik ikut TIDAK muncul (karena kondisi akhir cuma cek t.servisLinkId, bukan D.servisLogs)', async () => {
  const D = { transactions: [{ id: 't1', servisLinkId: 's1' }] };
  const { ctx, calls } = makeDelTxCtx(D);
  await ctx.delTx('t1');
  assert.equal(calls.revertStockUsage.length, 0);
  assert.ok(!calls.render.map((r) => r[0]).includes('renderStockList'));
  assert.equal(calls.toast.length, 0); // edge case: tidak ada toast SAMA SEKALI
});

test('delTx — servisLinkId ketemu tapi usedPartId kosong: entry servis tetap dihapus & toast muncul, TAPI revertStockUsage TIDAK dipanggil', async () => {
  const D = {
    transactions: [{ id: 't1', servisLinkId: 's1' }],
    servisLogs: [{ id: 's1', usedPartId: null }],
  };
  const { ctx, calls } = makeDelTxCtx(D);
  await ctx.delTx('t1');
  assert.equal(calls.revertStockUsage.length, 0);
  assert.equal(D.servisLogs.length, 0);
  assert.ok(calls.toast.some((m) => /Catatan servis terkait ikut dihapus/.test(m)));
});

// ================= delTx — renovItemLinkId / wishlistLinkId / sewaKiosLinkId / tukangPaymentEntryIds =================

test('delTx — tx dgn renovItemLinkId: Renov.onLinkedTxDeleted dipanggil dgn tx-nya, toast generik dgn suffix Renovasi', async () => {
  const D = { transactions: [{ id: 't1', renovItemLinkId: 'r1' }] };
  const { ctx, calls } = makeDelTxCtx(D);
  await ctx.delTx('t1');
  assert.equal(calls.renov.length, 1);
  assert.equal(calls.renov[0][0].id, 't1');
  assert.deepEqual(calls.toast, ['🗑 Dihapus (status lunas di Proyek Renovasi dibatalkan)']);
});

test('delTx — tx dgn wishlistLinkId: WorthIt.onLinkedTxDeleted dipanggil, toast generik dgn suffix Prioritas Belanja', async () => {
  const D = { transactions: [{ id: 't1', wishlistLinkId: 'w1' }] };
  const { ctx, calls } = makeDelTxCtx(D);
  await ctx.delTx('t1');
  assert.equal(calls.worthit.length, 1);
  assert.deepEqual(calls.toast, ['🗑 Dihapus (barang dikembalikan ke Prioritas Belanja)']);
});

test('delTx — tx dgn sewaKiosLinkId: SewaKios.onLinkedTxDeleted dipanggil, toast generik TANPA suffix khusus (tidak ada di daftar ternary)', async () => {
  const D = { transactions: [{ id: 't1', sewaKiosLinkId: 'sk1' }] };
  const { ctx, calls } = makeDelTxCtx(D);
  await ctx.delTx('t1');
  assert.equal(calls.sewakios.length, 1);
  assert.deepEqual(calls.toast, ['🗑 Dihapus']);
});

test('delTx — tx dgn tukangPaymentEntryIds non-kosong: Tukang.unmarkPaidEntries dipanggil dgn array id, toast suffix absensi tukang', async () => {
  const D = { transactions: [{ id: 't1', tukangPaymentEntryIds: ['e1', 'e2'] }] };
  const { ctx, calls } = makeDelTxCtx(D);
  await ctx.delTx('t1');
  assert.deepEqual(calls.tukang, [[['e1', 'e2']]]);
  assert.deepEqual(calls.toast, ['🗑 Dihapus (absensi tukang terkait dibuka kembali)']);
});

test('delTx — tukangPaymentEntryIds ARRAY KOSONG: Tukang.unmarkPaidEntries TIDAK dipanggil (guard .length), toast generik tanpa suffix', async () => {
  const D = { transactions: [{ id: 't1', tukangPaymentEntryIds: [] }] };
  const { ctx, calls } = makeDelTxCtx(D);
  await ctx.delTx('t1');
  assert.equal(calls.tukang.length, 0);
  assert.deepEqual(calls.toast, ['🗑 Dihapus']);
});

// ================= computeCashflowForecast =================

function makeForecastCtx(D, opts = {}) {
  const ctx = loadSource(['tx-list-cashflow.js'], {
    D,
    BudgetReko: opts.BudgetReko, // sengaja bisa undefined -> pakai default internal
    totalSaldoAkun: opts.totalSaldoAkun || (() => 1000000),
  });
  return ctx;
}

test('computeCashflowForecast — BudgetReko TIDAK terdefinisi: pakai default months=3, avail=0, from=now-2bulan (tanggal 1)', () => {
  const D = { transactions: [], bills: [] };
  const ctx = makeForecastCtx(D);
  const result = ctx.computeCashflowForecast();
  assert.equal(result.months, 3);
  assert.equal(result.avail, 0);
  assert.equal(result.incAvg, 0);
  assert.equal(result.expAvg, 0);
  assert.equal(result.saldoNow, 1000000);
  assert.equal(result.billsDue, 0);
  assert.equal(result.projected, 1000000);
});

test('computeCashflowForecast — BudgetReko terdefinisi: months/avail/from dari BudgetReko dipakai, bukan default', () => {
  const customFrom = new Date('2026-01-01');
  const D = { transactions: [], bills: [] };
  const ctx = makeForecastCtx(D, {
    BudgetReko: { monthsAvailable: () => 5, effectiveMonths: () => 6, rangeFrom: () => customFrom },
  });
  const result = ctx.computeCashflowForecast();
  assert.equal(result.months, 6);
  assert.equal(result.avail, 5);
});

test('computeCashflowForecast — incAvg/expAvg dihitung dari transaksi dlm rentang from..now, dibagi jumlah bulan', () => {
  const now = new Date();
  const D = {
    transactions: [
      { type: 'income', amount: 6000000, date: now.toISOString() },
      { type: 'income', amount: 3000000, date: now.toISOString() },
      { type: 'expense', amount: 1500000, date: now.toISOString() },
      // transaksi lama di luar rentang (2 tahun lalu) TIDAK ikut terhitung
      { type: 'income', amount: 999999999, date: new Date(now.getFullYear() - 2, 0, 1).toISOString() },
    ],
    bills: [],
  };
  const ctx = makeForecastCtx(D); // months default = 3
  const result = ctx.computeCashflowForecast();
  assert.equal(result.incAvg, 9000000 / 3);
  assert.equal(result.expAvg, 1500000 / 3);
});

test('computeCashflowForecast — billsDue & upcoming: hanya tagihan dgn nextDue dlm 30 hari ke depan yg dihitung', () => {
  const now = new Date();
  const in10 = new Date(now); in10.setDate(in10.getDate() + 10);
  const in60 = new Date(now); in60.setDate(in60.getDate() + 60);
  const D = {
    transactions: [],
    bills: [
      { amount: 200000, nextDue: in10.toISOString() },
      { amount: 500000, nextDue: in60.toISOString() }, // di luar 30 hari, TIDAK ikut
    ],
  };
  const ctx = makeForecastCtx(D);
  const result = ctx.computeCashflowForecast();
  assert.equal(result.billsDue, 200000);
  assert.equal(result.upcoming.length, 1);
});

test('computeCashflowForecast — projected = saldoNow + incAvg - expAvg - billsDue', () => {
  const now = new Date();
  const in10 = new Date(now); in10.setDate(in10.getDate() + 10);
  const D = {
    transactions: [
      { type: 'income', amount: 3000000, date: now.toISOString() },
      { type: 'expense', amount: 900000, date: now.toISOString() },
    ],
    bills: [{ amount: 100000, nextDue: in10.toISOString() }],
  };
  const ctx = makeForecastCtx(D, { totalSaldoAkun: () => 2000000 });
  const result = ctx.computeCashflowForecast();
  const expectedIncAvg = 3000000 / 3;
  const expectedExpAvg = 900000 / 3;
  assert.equal(result.projected, 2000000 + expectedIncAvg - expectedExpAvg - 100000);
});
