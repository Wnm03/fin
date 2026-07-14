'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// `const FI={...}` di top-level modules-calc.js butuh expose:['FI'] karena vm
// TIDAK menempelkan binding const ke context secara otomatis (beda dari
// function/var) — lihat catatan di tests/helpers/loadSource.js.
// FI banyak methodnya manggil fungsi GLOBAL lain (totalSaldoAkun,
// totalPiutangValue, totalDebtValue, getBillStats, budgetMatchesTx) yang
// aslinya didefinisikan di file LAIN (transaksi.js, akun.js, dst) — di sini
// di-stub manual per test biar method FI yang dites benar-benar terisolasi
// dari file lain (bukan test integrasi lintas-file).
function makeFI(D, stubs = {}) {
  const ctx = loadSource(['modules-calc.js'], {
    D,
    totalSaldoAkun: stubs.totalSaldoAkun || (() => 0),
    totalPiutangValue: stubs.totalPiutangValue || (() => 0),
    totalDebtValue: stubs.totalDebtValue || (() => 0),
    getBillStats: stubs.getBillStats || (() => ({ outstanding: 0 })),
    totalCicilanOutstanding: stubs.totalCicilanOutstanding || (() => 0),
    totalAssetValue: stubs.totalAssetValue || (() => 0),
    // Default meniru perilaku ASLI Budget.matchesTx (features-budget-laporan-carnotes-pelanggan.js):
    // budget dgn catIds ['__total__'] (dipakai FI.annualExpense saat belum ada
    // kategori spesifik dipilih) HANYA match transaksi type 'expense'. Kalau
    // stub ini asal return true untuk semua transaksi, annualExpense/budget
    // manapun yang makai bakal ikut menjumlahkan transaksi 'income' juga --
    // salah total, padahal bukan salah di FI-nya.
    budgetMatchesTx: stubs.budgetMatchesTx || ((budget, t) => t.type === 'expense'),
  }, ['FI']);
  return ctx.FI;
}

// deepStrictEqual di Node gagal untuk object yang lahir dari realm vm (beda
// prototype dgn realm host) walau isinya identik -- lihat catatan yang sama
// di pph21-pbb.test.js. Helper ini bandingkan per-field supaya aman dipakai
// utk hasil object dari ctx.FI.*.
function assertFieldsEqual(actual, expected) {
  for (const key of Object.keys(expected)) {
    assert.equal(actual[key], expected[key], `field "${key}"`);
  }
}

// ---------- calcAge ----------

test('FI.calcAge — belum ulang tahun tahun ini (masih usia lama)', () => {
  const FI = makeFI({});
  const now = new Date();
  // Lahir 30 tahun lalu, tapi tanggal lahirnya BESOK dari hari ini -> ulang
  // tahun tahun ini belum lewat -> usia masih 29.
  const birthday = new Date(now.getFullYear() - 30, now.getMonth(), now.getDate() + 1);
  assert.equal(FI.calcAge(birthday.toISOString()), 29);
});

test('FI.calcAge — sudah lewat ulang tahun tahun ini', () => {
  const FI = makeFI({});
  const now = new Date();
  const birthday = new Date(now.getFullYear() - 30, now.getMonth(), now.getDate() - 1);
  assert.equal(FI.calcAge(birthday.toISOString()), 30);
});

// ---------- formatMonths ----------

test('FI.formatMonths — kasus khusus null & 0', () => {
  const FI = makeFI({});
  assert.equal(FI.formatMonths(null), '>100th');
  assert.equal(FI.formatMonths(0), '🎉 Tercapai');
});

test('FI.formatMonths — di bawah 1 tahun cuma tampil bulan', () => {
  const FI = makeFI({});
  assert.equal(FI.formatMonths(5), '≈5bln');
});

test('FI.formatMonths — kelipatan tahun genap tidak menampilkan "0bln"', () => {
  const FI = makeFI({});
  assert.equal(FI.formatMonths(24), '≈2th');
});

test('FI.formatMonths — tahun + sisa bulan tampil dua-duanya', () => {
  const FI = makeFI({});
  assert.equal(FI.formatMonths(400), '≈33th 4bln');
});

// ---------- getAssumptions (clamping input tidak wajar) ----------

test('FI.getAssumptions — nilai valid dipakai apa adanya', () => {
  const FI = makeFI({ finansialFreedom: { swr: 3.5, assumsiReturn: 7, assumsiInflasi: 4, avgMonths: 12 } });
  assertFieldsEqual(FI.getAssumptions(), { swr: 3.5, ret: 7, inf: 4, avgMonths: 12 });
});

test('FI.getAssumptions — nilai di luar batas wajar dikembalikan ke default', () => {
  const FI = makeFI({ finansialFreedom: { swr: 999, assumsiReturn: -999, assumsiInflasi: 999, avgMonths: 999 } });
  assertFieldsEqual(FI.getAssumptions(), { swr: 4, ret: 8, inf: 5, avgMonths: 6 });
});

test('FI.getAssumptions — data kosong/belum diisi pakai semua default', () => {
  const FI = makeFI({ finansialFreedom: {} });
  assertFieldsEqual(FI.getAssumptions(), { swr: 4, ret: 8, inf: 5, avgMonths: 6 });
});

// ---------- assetFund / totalDebt / netAssetFund ----------

test('FI.assetFund — jumlah saldo akun + aset investasi zakatable + piutang', () => {
  const D = {
    finansialFreedom: {},
    assets: [
      { id: 1, nilai: 50000000, zakatable: true },
      { id: 2, nilai: 20000000, zakatable: false }, // tidak dihitung (default scope 'zakatable')
    ],
  };
  const FI = makeFI(D, { totalSaldoAkun: () => 100000000, totalPiutangValue: () => 10000000 });
  // 100jt (akun) + 50jt (aset zakatable) + 10jt (piutang) = 160jt
  assert.equal(FI.assetFund(), 160000000);
});

test('FI.totalDebt — jumlah utang jangka pendek + sisa cicilan tagihan + buku utang', () => {
  const D = { pajakZakat: { utangJT: 5000000 } };
  const FI = makeFI(D, {
    totalCicilanOutstanding: () => 3000000,
    totalDebtValue: () => 2000000,
  });
  assert.equal(FI.totalDebt(), 10000000);
});

test('FI.netAssetFund — aset bersih = aset kotor − utang, bisa negatif kalau utang lebih besar', () => {
  const D = { pajakZakat: { utangJT: 0 }, finansialFreedom: {}, assets: [] };
  const FI = makeFI(D, {
    totalSaldoAkun: () => 5000000,
    totalDebtValue: () => 20000000,
  });
  assert.equal(FI.netAssetFund(), 5000000 - 20000000);
});

// ---------- annualExpense / monthlySurplus / targetNominal / estimateMonthsToTarget ----------
// Skenario terkontrol: 4 bulan data transaksi (bulan berjalan + 3 bulan
// sebelumnya), tanggal dihitung RELATIF ke "sekarang" (bukan hardcode
// tanggal) supaya test tidak basi seiring waktu berjalan.

function buildTransactionsLast4Months(incomePerMonth, expensePerMonth) {
  const now = new Date();
  const txs = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 10);
    txs.push({ type: 'income', amount: incomePerMonth, date: d.toISOString() });
    txs.push({ type: 'expense', amount: expensePerMonth, date: d.toISOString() });
  }
  return txs;
}

test('FI.annualExpense — rata-rata pengeluaran per bulan (dalam window avgMonths) dikali 12', () => {
  const D = {
    finansialFreedom: { avgMonths: 4 },
    transactions: buildTransactionsLast4Months(5000000, 3000000),
  };
  const FI = makeFI(D);
  // total pengeluaran 4 bulan = 12jt -> rata2/bulan 3jt -> setahun 36jt
  assert.equal(FI.annualExpense(), 36000000);
});

test('FI.monthlySurplus — rata-rata (pemasukan − pengeluaran) per bulan dalam window', () => {
  const D = {
    finansialFreedom: { avgMonths: 4 },
    transactions: buildTransactionsLast4Months(5000000, 3000000),
  };
  const FI = makeFI(D);
  assert.equal(FI.monthlySurplus(), 2000000); // (5jt-3jt) rata2/bulan
});

test('FI.targetNominal — target dana pensiun = pengeluaran tahunan / (SWR%)', () => {
  const D = {
    finansialFreedom: { avgMonths: 4, swr: 4 },
    transactions: buildTransactionsLast4Months(5000000, 3000000),
  };
  const FI = makeFI(D);
  // annualExpense 36jt / (4/100) = 900jt
  assert.equal(FI.targetNominal(), 900000000);
});

test('FI.estimateMonthsToTarget — 0 bulan kalau aset sekarang sudah >= target', () => {
  const D = {
    finansialFreedom: { avgMonths: 4, swr: 4 },
    assets: [],
    pajakZakat: { utangJT: 0 },
    transactions: buildTransactionsLast4Months(5000000, 3000000),
  };
  const FI = makeFI(D, { totalSaldoAkun: () => 1000000000 }); // 1M, jauh di atas target 900jt
  assert.equal(FI.estimateMonthsToTarget(), 0);
});

test('FI.estimateMonthsToTarget — proyeksi jumlah bulan konsisten dgn surplus bulanan saat return riil = 0', () => {
  const D = {
    finansialFreedom: { avgMonths: 4, swr: 4, assumsiReturn: 5, assumsiInflasi: 5 }, // return riil = 0 -> proyeksi linear murni
    assets: [],
    pajakZakat: { utangJT: 0 },
    transactions: buildTransactionsLast4Months(5000000, 3000000),
  };
  const FI = makeFI(D, { totalSaldoAkun: () => 100000000 }); // aset 100jt, target 900jt, surplus 2jt/bln
  // Dengan return riil 0%, saldo naik linear murni sebesar surplus/bulan:
  // butuh ceil((900jt-100jt)/2jt) = 400 bulan.
  assert.equal(FI.estimateMonthsToTarget(), 400);
  assert.equal(FI.formatMonths(FI.estimateMonthsToTarget()), '≈33th 4bln');
});

test('FI.estimateMonthsToTarget — null (>100 tahun) kalau surplus 0 & target tidak pernah tercapai', () => {
  const D = {
    finansialFreedom: { avgMonths: 4, swr: 4, assumsiReturn: 5, assumsiInflasi: 5 },
    assets: [],
    pajakZakat: { utangJT: 0 },
    transactions: buildTransactionsLast4Months(3000000, 3000000), // income = expense -> surplus 0
  };
  const FI = makeFI(D, { totalSaldoAkun: () => 100000000 });
  assert.equal(FI.estimateMonthsToTarget(), null);
});

// ---------- renderFinancialFreedom / renderScenarios (butuh mock DOM) ----------
// Beda dari makeFI() di atas (yg sengaja TIDAK diberi `document` supaya method
// murni FI.* gampang dites terisolasi) — dua method ini MEMBACA & MENULIS DOM
// langsung (bukan return value), jadi butuh fakeDom.js seperti pola di
// gaji-calc.test.js / pph21-pbb.test.js.

const { createFakeDocument, createFakeElement } = require('./helpers/fakeDom');

function makeFIWithDom(D, stubs = {}, domValues = {}, queryGroups = {}) {
  const fakeDocument = createFakeDocument({
    dashFiCard: {}, dashFiSetupPrompt: {}, dashFiBody: {},
    fiPct: {}, fiBar: {}, fiAsetKotorLabel: {}, fiAsetKotor: {}, fiUtang: {},
    fiAsetSekarang: {}, fiTargetSekarang: {}, fiEstimasi: {}, fiCatatan: {},
    fiScenarioBox: {}, fiScenPess: {}, fiScenMod: {}, fiScenOpt: {}, fiScenNote: {},
    ...domValues,
  }, queryGroups);
  const ctx = loadSource(['modules-calc.js'], {
    document: fakeDocument,
    D,
    // fmt DIBUAT identity (bukan format rupiah asli) — sama alasannya dgn
    // fmtFull di gaji-calc.test.js: supaya assertion cek ANGKA HASIL PERSIS.
    fmt: (n) => String(Math.round(n)),
    escapeHtml: stubs.escapeHtml || ((s) => String(s === null || s === undefined ? '' : s)),
    toast: stubs.toast || (() => {}),
    save: stubs.save || (() => {}),
    closeModal: stubs.closeModal || (() => {}),
    renderDashboard: stubs.renderDashboard || (() => {}),
    totalSaldoAkun: stubs.totalSaldoAkun || (() => 0),
    totalPiutangValue: stubs.totalPiutangValue || (() => 0),
    totalDebtValue: stubs.totalDebtValue || (() => 0),
    getBillStats: stubs.getBillStats || (() => ({ outstanding: 0 })),
    totalCicilanOutstanding: stubs.totalCicilanOutstanding || (() => 0),
    totalAssetValue: stubs.totalAssetValue || (() => 0),
    budgetMatchesTx: stubs.budgetMatchesTx || ((budget, t) => t.type === 'expense'),
  }, ['FI']);
  return { FI: ctx.FI, fakeDocument };
}

test('FI.renderFinancialFreedom — belum ada data transaksi sama sekali => tampil prompt setup, body & scenario box disembunyikan', () => {
  const D = { transactions: [], finansialFreedom: {} };
  const { FI, fakeDocument } = makeFIWithDom(D);
  FI.renderFinancialFreedom();
  assert.match(fakeDocument.getElementById('dashFiSetupPrompt').textContent, /Belum ada data transaksi/);
  assert.equal(fakeDocument.getElementById('dashFiBody').style.display, 'none');
  assert.equal(fakeDocument.getElementById('fiScenarioBox').style.display, 'none');
});

test('FI.renderFinancialFreedom — data < 3 bulan tetap dihitung tapi tampil peringatan "kasar"', () => {
  const D = {
    finansialFreedom: { avgMonths: 4, swr: 4 },
    pajakZakat: { utangJT: 0 },
    assets: [],
    transactions: buildTransactionsLast4Months(5000000, 3000000).filter((t) => {
      // sisakan cuma transaksi 2 bulan pertama (bulan berjalan + 1 bulan lalu)
      const now = new Date();
      const d = new Date(t.date);
      const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      return diffMonths < 2;
    }),
  };
  const { FI, fakeDocument } = makeFIWithDom(D, { totalSaldoAkun: () => 5000000 });
  FI.renderFinancialFreedom();
  assert.match(fakeDocument.getElementById('dashFiSetupPrompt').textContent, /Baru ada 2 bulan data transaksi/);
  assert.equal(fakeDocument.getElementById('dashFiBody').style.display, 'block');
});

test('FI.renderFinancialFreedom — aset bersih sudah melewati target => "🎉 Tercapai!", progress 100%', () => {
  const D = {
    finansialFreedom: { avgMonths: 4, swr: 4 },
    pajakZakat: { utangJT: 0 },
    assets: [],
    transactions: buildTransactionsLast4Months(5000000, 3000000), // annualExpense 36jt -> target 900jt
  };
  const { FI, fakeDocument } = makeFIWithDom(D, { totalSaldoAkun: () => 1000000000 }); // 1M > target
  FI.renderFinancialFreedom();
  assert.equal(fakeDocument.getElementById('dashFiSetupPrompt').style.display, 'none');
  assert.equal(fakeDocument.getElementById('fiPct').textContent, '100%');
  assert.equal(fakeDocument.getElementById('fiBar').className, 'budget-bar-fill ok');
  assert.equal(fakeDocument.getElementById('fiEstimasi').textContent, '🎉 Tercapai!');
  assert.match(fakeDocument.getElementById('fiCatatan').textContent, /SWR 4%/);
});

test('FI.renderFinancialFreedom — surplus 0 & target tidak akan tercapai => "Belum tercapai" dalam 100 tahun', () => {
  const D = {
    finansialFreedom: { avgMonths: 4, swr: 4, assumsiReturn: 5, assumsiInflasi: 5 },
    pajakZakat: { utangJT: 0 },
    assets: [],
    transactions: buildTransactionsLast4Months(3000000, 3000000), // income = expense -> surplus 0
  };
  const { FI, fakeDocument } = makeFIWithDom(D, { totalSaldoAkun: () => 100000000 });
  FI.renderFinancialFreedom();
  assert.equal(fakeDocument.getElementById('fiEstimasi').textContent, 'Belum tercapai');
  assert.match(fakeDocument.getElementById('fiCatatan').textContent, /belum tercapai dlm 100 tahun/);
});

test('FI.renderFinancialFreedom — estimasi th+bln normal, dan catatan usia saat tercapai kalau tanggal lahir diisi', () => {
  const now = new Date();
  const D = {
    finansialFreedom: { avgMonths: 4, swr: 4, assumsiReturn: 5, assumsiInflasi: 5 }, // return riil 0% -> proyeksi linear
    pajakZakat: { utangJT: 0 },
    assets: [],
    profile: { tanggalLahir: new Date(now.getFullYear() - 30, now.getMonth(), now.getDate() - 1).toISOString() }, // 30 th, ultah sudah lewat
    transactions: buildTransactionsLast4Months(5000000, 3000000), // surplus 2jt/bln, target 900jt
  };
  const { FI, fakeDocument } = makeFIWithDom(D, { totalSaldoAkun: () => 100000000 }); // asset 100jt -> butuh 400 bulan (33th 4bln)
  FI.renderFinancialFreedom();
  assert.equal(fakeDocument.getElementById('fiEstimasi').textContent, '≈ 33 th 4 bln lagi');
  assert.match(fakeDocument.getElementById('fiCatatan').textContent, /usia 63 tahun saat tercapai/);
});

test('FI.renderScenarios — target tidak valid (<=0) => box disembunyikan, tidak menghitung skenario', () => {
  const D = { finansialFreedom: {}, transactions: [] }; // tanpa transaksi -> annualExpense 0 -> target 0
  const { FI, fakeDocument } = makeFIWithDom(D);
  FI.renderScenarios();
  assert.equal(fakeDocument.getElementById('fiScenarioBox').style.display, 'none');
});

test('FI.renderScenarios — pesimis/moderat/optimis dihitung dari asumsi return ± scenarioRange%', () => {
  const D = {
    finansialFreedom: { avgMonths: 4, swr: 4, assumsiReturn: 5, assumsiInflasi: 5, scenarioRange: 2 },
    pajakZakat: { utangJT: 0 },
    assets: [],
    transactions: buildTransactionsLast4Months(5000000, 3000000), // target 900jt, surplus 2jt/bln
  };
  const { FI, fakeDocument } = makeFIWithDom(D, { totalSaldoAkun: () => 100000000 });
  FI.renderScenarios();
  assert.equal(fakeDocument.getElementById('fiScenarioBox').style.display, 'block');
  // moderat (return asumsi 5% - inflasi 5% = return riil 0%) harus SAMA dgn hasil
  // estimateMonthsToTarget() default (tanpa override), yaitu 400 bulan (≈33th 4bln)
  assert.equal(fakeDocument.getElementById('fiScenMod').textContent, FI.formatMonths(400));
  assert.match(fakeDocument.getElementById('fiScenNote').textContent, /return ±2%\/th dari asumsi \(3\.0% \/ 5\.0% \/ 7\.0%\)/);
  // Belum ada data growth rate aktual (actualWealthCAGR tidak di-stub) => saran catat snapshot
  assert.match(fakeDocument.getElementById('fiScenNote').textContent, /Catat snapshot kekayaan/);
});

// ---------- Method murni tambahan (belum tercakup di atas) ----------

test('FI.investmentAssetValue — default scope "zakatable" cuma jumlah aset zakatable, abaikan totalAssetValue()', () => {
  const D = {
    finansialFreedom: {},
    assets: [
      { id: 1, nilai: 30000000, zakatable: true },
      { id: 2, nilai: 999000000, zakatable: false },
    ],
  };
  const FI = makeFI(D, { totalAssetValue: () => 1000000000 });
  assert.equal(FI.investmentAssetValue(), 30000000);
});

test('FI.investmentAssetValue — scope "semua" pakai totalAssetValue(), abaikan filter zakatable', () => {
  const D = {
    finansialFreedom: { assetScope: 'semua' },
    assets: [{ id: 1, nilai: 30000000, zakatable: true }],
  };
  const FI = makeFI(D, { totalAssetValue: () => 1000000000 });
  assert.equal(FI.investmentAssetValue(), 1000000000);
});

function buildTransactionsAcrossMonths(monthsBack, incomePerMonth = 0, expensePerMonth = 0) {
  // Bikin transaksi tersebar dari "monthsBack bulan lalu" s/d bulan berjalan
  // (dgn 1 titik data per bulan), supaya FI.monthsOfDataAvailable() konsisten
  // menghitung (monthsBack+1) bulan histori.
  const now = new Date();
  const txs = [];
  const d = new Date(now.getFullYear(), now.getMonth() - monthsBack, 10);
  if (incomePerMonth) txs.push({ type: 'income', amount: incomePerMonth, date: d.toISOString() });
  if (expensePerMonth) txs.push({ type: 'expense', amount: expensePerMonth, date: d.toISOString() });
  return txs;
}

test('FI.monthsOfDataAvailable — tanpa transaksi sama sekali => 0', () => {
  const FI = makeFI({ transactions: [] });
  assert.equal(FI.monthsOfDataAvailable(), 0);
});

test('FI.monthsOfDataAvailable — transaksi hanya di bulan berjalan => 1', () => {
  const FI = makeFI({ transactions: buildTransactionsAcrossMonths(0, 1000000, 0) });
  assert.equal(FI.monthsOfDataAvailable(), 1);
});

test('FI.monthsOfDataAvailable — data tertua 5 bulan lalu => 6 (inklusif bulan berjalan)', () => {
  const FI = makeFI({ transactions: buildTransactionsAcrossMonths(5, 1000000, 0) });
  assert.equal(FI.monthsOfDataAvailable(), 6);
});

test('FI.effectiveMonths — setting avgMonths LEBIH BESAR dari data yg tersedia => dibatasi ke data yg ada', () => {
  const D = {
    finansialFreedom: { avgMonths: 12 },
    transactions: buildTransactionsAcrossMonths(2, 1000000, 0), // cuma 3 bulan data
  };
  const FI = makeFI(D);
  assert.equal(FI.effectiveMonths(), 3);
});

test('FI.effectiveMonths — setting avgMonths LEBIH KECIL dari data yg tersedia => pakai avgMonths setting', () => {
  const D = {
    finansialFreedom: { avgMonths: 2 },
    transactions: buildTransactionsAcrossMonths(9, 1000000, 0), // 10 bulan data tersedia
  };
  const FI = makeFI(D);
  assert.equal(FI.effectiveMonths(), 2);
});

test('FI.annualExpense — expenseCatIds spesifik diteruskan apa adanya ke budgetMatchesTx (bukan __total__), transaksi kategori lain diabaikan', () => {
  const now = new Date();
  let receivedCatIds = null;
  const D = {
    finansialFreedom: { avgMonths: 1, expenseCatIds: ['cat_makan'] },
    transactions: [
      { type: 'expense', amount: 500000, category: 'cat_makan', date: now.toISOString() },
      { type: 'expense', amount: 999000000, category: 'cat_lain', date: now.toISOString() }, // diabaikan
    ],
  };
  const FI = makeFI(D, {
    budgetMatchesTx: (budget, t) => {
      receivedCatIds = budget.catIds;
      return budget.catIds.includes(t.category);
    },
  });
  assert.equal(FI.annualExpense(), 500000 * 12);
  assert.deepEqual(receivedCatIds, ['cat_makan']);
});

test('FI.estimateMonthsToTarget — return riil positif mencapai target LEBIH CEPAT drpd return riil 0%', () => {
  const baseline = {
    finansialFreedom: { avgMonths: 4, swr: 4, assumsiReturn: 5, assumsiInflasi: 5 }, // return riil 0% -> 400 bln (lihat test lain)
    assets: [], pajakZakat: { utangJT: 0 },
    transactions: buildTransactionsLast4Months(5000000, 3000000),
  };
  const FIBaseline = makeFI(baseline, { totalSaldoAkun: () => 100000000 });
  assert.equal(FIBaseline.estimateMonthsToTarget(), 400);

  const positif = {
    finansialFreedom: { avgMonths: 4, swr: 4, assumsiReturn: 10, assumsiInflasi: 5 }, // return riil ≈4,76%
    assets: [], pajakZakat: { utangJT: 0 },
    transactions: buildTransactionsLast4Months(5000000, 3000000),
  };
  const FIPositif = makeFI(positif, { totalSaldoAkun: () => 100000000 });
  const months = FIPositif.estimateMonthsToTarget();
  assert.ok(months > 0 && months < 400, `expected 0 < months < 400, got ${months}`);
});

test('FI.estimateMonthsToTarget — retOverride menggantikan assumsiReturn default utk skenario (dipakai FI.renderScenarios)', () => {
  const D = {
    finansialFreedom: { avgMonths: 4, swr: 4, assumsiReturn: 5, assumsiInflasi: 5 }, // default -> 400 bln
    assets: [], pajakZakat: { utangJT: 0 },
    transactions: buildTransactionsLast4Months(5000000, 3000000),
  };
  const FI = makeFI(D, { totalSaldoAkun: () => 100000000 });
  const defaultMonths = FI.estimateMonthsToTarget();
  const overrideMonths = FI.estimateMonthsToTarget(20); // override ke return jauh lbh tinggi
  assert.equal(defaultMonths, 400);
  assert.ok(overrideMonths < defaultMonths);
});

test('FI.calcAge — ulang tahun PERSIS hari ini => usia genap, tidak ikut di-minus 1', () => {
  const FI = makeFI({});
  const now = new Date();
  const birthday = new Date(now.getFullYear() - 25, now.getMonth(), now.getDate());
  assert.equal(FI.calcAge(birthday.toISOString()), 25);
});

// ---------- Method DOM-heavy: selectAssetScope, renderCatOptions, ----------
// ---------- onCatTotalToggle, getSelectedCatIds, saveSettings      ----------
// Method2 ini pakai document.querySelectorAll(), jadi butuh `queryGroups`
// (lihat catatan di fakeDom.js) — elemen yg didaftarkan di situ HARUS dibuat
// lewat createFakeElement() (bukan objek literal biasa) supaya classList-nya
// beneran nge-track add/remove/contains.

test('FI.selectAssetScope — set assetScopeState & pindahkan class "active" HANYA ke elemen yg diklik', () => {
  const chipZakatable = createFakeElement({ classList: ['chip-btn', 'active'] });
  const chipSemua = createFakeElement({ classList: ['chip-btn'] });
  const { FI } = makeFIWithDom({}, {}, {}, {
    '#fiAssetScopePicker .chip-btn': [chipZakatable, chipSemua],
  });
  FI.selectAssetScope('semua', chipSemua);
  assert.equal(FI.assetScopeState, 'semua');
  assert.equal(chipZakatable.classList.contains('active'), false);
  assert.equal(chipSemua.classList.contains('active'), true);
});

function categoriesFixture() {
  return [
    { id: 'cat_makan', name: 'Makanan', icon: '🍔', subs: [{ id: 'sub_snack', name: 'Snack', icon: '🍪' }] },
    { id: 'cat_transport', name: 'Transport', icon: '🚗', subs: [] },
  ];
}

test('FI.renderCatOptions — total dicentang => semua .fiCatChk disabled & unchecked, terlepas dari `selected`', () => {
  const chkMakan = createFakeElement({ value: 'cat_makan' });
  const chkSnack = createFakeElement({ value: 'sub_snack' });
  const chkTransport = createFakeElement({ value: 'cat_transport' });
  const D = { categories: { expense: categoriesFixture() } };
  const { FI, fakeDocument } = makeFIWithDom(D, {}, { fiCatList: {}, fiCatTotal: {} }, {
    '.fiCatChk': [chkMakan, chkSnack, chkTransport],
  });
  FI.renderCatOptions(['__total__']);
  assert.match(fakeDocument.getElementById('fiCatList').innerHTML, /Makanan/);
  assert.match(fakeDocument.getElementById('fiCatList').innerHTML, /Transport/);
  assert.equal(fakeDocument.getElementById('fiCatTotal').checked, true);
  [chkMakan, chkSnack, chkTransport].forEach((c) => {
    assert.equal(c.disabled, true);
    assert.equal(c.checked, false);
  });
});

test('FI.renderCatOptions — kategori spesifik dipilih => total TIDAK dicentang, cuma id yg dipilih ikut checked & aktif (tidak disabled)', () => {
  const chkMakan = createFakeElement({ value: 'cat_makan' });
  const chkSnack = createFakeElement({ value: 'sub_snack' });
  const chkTransport = createFakeElement({ value: 'cat_transport' });
  const D = { categories: { expense: categoriesFixture() } };
  const { FI, fakeDocument } = makeFIWithDom(D, {}, { fiCatList: {}, fiCatTotal: {} }, {
    '.fiCatChk': [chkMakan, chkSnack, chkTransport],
  });
  FI.renderCatOptions(['cat_makan', 'sub_snack']);
  assert.equal(fakeDocument.getElementById('fiCatTotal').checked, false);
  assert.equal(chkMakan.disabled, false); assert.equal(chkMakan.checked, true);
  assert.equal(chkSnack.disabled, false); assert.equal(chkSnack.checked, true);
  assert.equal(chkTransport.disabled, false); assert.equal(chkTransport.checked, false);
});

test('FI.onCatTotalToggle — dicentang => semua .fiCatChk disabled & DIPAKSA unchecked (walau tadinya checked)', () => {
  const chkA = createFakeElement({ value: 'a', checked: true });
  const chkB = createFakeElement({ value: 'b', checked: false });
  const { FI } = makeFIWithDom({}, {}, {}, { '.fiCatChk': [chkA, chkB] });
  FI.onCatTotalToggle({ checked: true });
  assert.equal(chkA.disabled, true); assert.equal(chkA.checked, false);
  assert.equal(chkB.disabled, true); assert.equal(chkB.checked, false);
});

test('FI.onCatTotalToggle — TIDAK dicentang => semua .fiCatChk diaktifkan lagi, checked SEBELUMNYA tidak diubah', () => {
  const chkA = createFakeElement({ value: 'a', checked: true });
  const chkB = createFakeElement({ value: 'b', checked: false });
  const { FI } = makeFIWithDom({}, {}, {}, { '.fiCatChk': [chkA, chkB] });
  FI.onCatTotalToggle({ checked: false });
  assert.equal(chkA.disabled, false); assert.equal(chkA.checked, true); // tidak diubah
  assert.equal(chkB.disabled, false); assert.equal(chkB.checked, false); // tidak diubah
});

test('FI.getSelectedCatIds — total dicentang => selalu [\'__total__\'], terlepas kondisi checkbox lain', () => {
  const chkA = createFakeElement({ value: 'a', checked: true });
  const { FI, fakeDocument } = makeFIWithDom({}, {}, { fiCatTotal: { checked: true } }, { '.fiCatChk': [chkA] });
  // deepEqual/deepStrictEqual TIDAK dipakai di sini krn array hasil balik dari
  // realm vm (beda prototype dgn realm host) -- lihat catatan yg sama di
  // fi-calc.test.js/pph21-pbb.test.js soal assertFieldsEqual.
  const result = Array.from(FI.getSelectedCatIds());
  assert.equal(result.length, 1);
  assert.equal(result[0], '__total__');
});

test('FI.getSelectedCatIds — total TIDAK dicentang => balikin value dari .fiCatChk yg checked saja', () => {
  const chkA = createFakeElement({ value: 'cat_makan', checked: true });
  const chkB = createFakeElement({ value: 'cat_transport', checked: false });
  const chkSub = createFakeElement({ value: 'sub_snack', checked: true });
  const { FI } = makeFIWithDom({}, {}, { fiCatTotal: { checked: false } }, {
    '.fiCatChk': [chkA, chkB, chkSub],
  });
  assert.deepEqual(FI.getSelectedCatIds(), ['cat_makan', 'sub_snack']);
});

function domFieldsForSaveSettings(overrides = {}) {
  return {
    fiSwr: { value: '4' },
    fiReturn: { value: '8' },
    fiInflasi: { value: '5' },
    fiScenarioRange: { value: '2' },
    fiAvgMonths: { value: '6' },
    fiCatTotal: { checked: true },
    ...overrides,
  };
}

test('FI.saveSettings — SWR kosong/di luar 0.5-20 => ditolak, warning spesifik, TIDAK menyimpan', () => {
  const toasts = [];
  const D = {};
  const { FI } = makeFIWithDom(D, { toast: (msg) => toasts.push(msg) }, domFieldsForSaveSettings({ fiSwr: { value: '999' } }));
  FI.saveSettings();
  assert.match(toasts[0], /Safe Withdrawal Rate/);
  assert.equal(D.finansialFreedom.swr, undefined);
});

test('FI.saveSettings — Asumsi Return di luar -20..30 => ditolak, warning spesifik', () => {
  const toasts = [];
  const D = {};
  const { FI } = makeFIWithDom(D, { toast: (msg) => toasts.push(msg) }, domFieldsForSaveSettings({ fiReturn: { value: '-99' } }));
  FI.saveSettings();
  assert.match(toasts[0], /Asumsi Return/);
  assert.equal(D.finansialFreedom.assumsiReturn, undefined);
});

test('FI.saveSettings — Asumsi Inflasi di luar 0..30 => ditolak, warning spesifik', () => {
  const toasts = [];
  const D = {};
  const { FI } = makeFIWithDom(D, { toast: (msg) => toasts.push(msg) }, domFieldsForSaveSettings({ fiInflasi: { value: '-1' } }));
  FI.saveSettings();
  assert.match(toasts[0], /Asumsi Inflasi/);
});

test('FI.saveSettings — Rentang Skenario di luar 0.5..15 => ditolak, warning spesifik', () => {
  const toasts = [];
  const D = {};
  const { FI } = makeFIWithDom(D, { toast: (msg) => toasts.push(msg) }, domFieldsForSaveSettings({ fiScenarioRange: { value: '0' } }));
  FI.saveSettings();
  assert.match(toasts[0], /Rentang Skenario/);
});

test('FI.saveSettings — semua input valid (termasuk koma desimal) => tersimpan ke D.finansialFreedom & sukses', () => {
  const toasts = [];
  let savedCalled = false, closedModal = null, dashboardRendered = false;
  const D = {};
  const { FI } = makeFIWithDom(
    D,
    {
      toast: (msg) => toasts.push(msg),
      save: () => { savedCalled = true; },
      closeModal: (id) => { closedModal = id; },
      renderDashboard: () => { dashboardRendered = true; },
    },
    domFieldsForSaveSettings({
      fiSwr: { value: '4,5' },
      fiReturn: { value: '7,5' },
      fiInflasi: { value: '3,5' },
      fiScenarioRange: { value: '1,5' },
      fiAvgMonths: { value: '9' },
      fiCatTotal: { checked: true }, // total dicentang -> expenseCatIds harus jadi []
    })
  );
  FI.assetScopeState = 'semua';
  FI.saveSettings();
  assert.equal(D.finansialFreedom.swr, 4.5);
  assert.equal(D.finansialFreedom.assumsiReturn, 7.5);
  assert.equal(D.finansialFreedom.assumsiInflasi, 3.5);
  assert.equal(D.finansialFreedom.scenarioRange, 1.5);
  assert.equal(D.finansialFreedom.avgMonths, 9);
  assert.equal(Array.from(D.finansialFreedom.expenseCatIds).length, 0);
  assert.equal(D.finansialFreedom.assetScope, 'semua');
  assert.equal(savedCalled, true);
  assert.equal(closedModal, 'fiSettingsModal');
  assert.equal(dashboardRendered, true);
  assert.match(toasts[toasts.length - 1], /disimpan/);
});
