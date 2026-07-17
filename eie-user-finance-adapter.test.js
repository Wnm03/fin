'use strict';
// tests/eie-user-finance-adapter.test.js — UserFinanceAdapter.getSnapshot()
// (economic-intelligence/adapters/user-finance-adapter.js). Sebelumnya 0
// test sama sekali walau adapter ini yg menerjemahkan D.* (state finance
// existing app) jadi input scoring EES/PEHS — kalau salah, skor yg
// ditampilkan ke user ikut salah walau rumus scoring-nya sendiri benar.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function load(D, worthItIncomeAvg) {
  return loadSource(
    ['economic-intelligence/adapters/user-finance-adapter.js'],
    {
      D,
      WorthIt: worthItIncomeAvg === undefined ? undefined : { incomeAvg: () => worthItIncomeAvg },
    },
    ['UserFinanceAdapter'],
  );
}

function midThisMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 15);
}
function sixMonthsAgo() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 6, 15);
}

function baseD() {
  return {
    accounts: [{ balance: 1000000 }, { balance: 2000000 }],
    investments: [
      { type: 'Saham', unit: 10, currentPrice: 1000 },
      { type: 'Emas', unit: 5, currentPrice: 200 },
    ],
    debts: [
      { id: 1, name: 'A', nilai: 5000000, cicilanBulanan: 500000, bunga: 0.1, lunas: false },
      { id: 2, name: 'B (lunas)', nilai: 2000000, cicilanBulanan: 200000, bunga: 0, lunas: true },
    ],
    bills: [
      { kind: 'cicilan', sisaTenor: 3, amount: 600000 },
      { kind: 'cicilan', sisaTenor: null, amount: 999999 }, // sisaTenor null -> tidak dihitung
      { kind: 'langganan', sisaTenor: 2, amount: 111 }, // beda kind -> tidak dihitung
    ],
    targets: [{ isDanaDarurat: true, saved: 3000000 }],
    transactions: [
      { type: 'expense', amount: 2000000, category: 'BBM Motor', date: midThisMonth().toISOString() },
      { type: 'expense', amount: 3000000, category: 'Groceries', date: midThisMonth().toISOString() },
      { type: 'income', amount: 5000000, date: midThisMonth().toISOString() },
      { type: 'expense', amount: 9999999, category: 'Lama', date: sixMonthsAgo().toISOString() }, // di luar window 3 bulan
    ],
  };
}

test('getSnapshot — alur lengkap: savings/investasi/utang/emergency-fund/import-ratio terhitung benar dari D', () => {
  const { UserFinanceAdapter } = load(baseD(), 10000000);
  const s = UserFinanceAdapter.getSnapshot();

  assert.equal(s.incomeMonthly, 10000000);
  assert.equal(s.savingsTotal, 3000000);
  assert.deepEqual(Object.assign({}, s.investmentBreakdown), {
    saham: 10000, reksadana: 0, emas: 1000, crypto: 0, obligasi: 0, deposito: 0, lainnya: 0,
  });
  assert.equal(s.investmentTotal, 11000);

  // expense window 3 bulan: hanya 2 tx bulan ini (2jt+3jt=5jt), tx 6 bulan lalu diabaikan
  assert.equal(s.expenseMonthly, 5000000 / 3);
  assert.equal(s.cashflowNet, 10000000 - 5000000 / 3);

  // import ratio: kategori "BBM Motor" cocok keyword 'bbm' -> 2jt / 5jt = 0.4
  assert.equal(s.importDependencyRatio, 0.4);

  // dana darurat: saved 3jt / expenseMonthly (5jt/3) = 1.8 bulan
  assert.ok(Math.abs(s.emergencyFundMonths - 1.8) < 1e-9);

  // utang: debt lunas DIKECUALIKAN dari debtTotal & dari daftar debts
  assert.equal(s.debtTotal, 5000000);
  assert.equal(s.debts.length, 1);
  assert.equal(s.debts[0].hasInterest, true);
  assert.equal(s.debts[0].balance, 5000000);

  // cicilan bulanan: hanya bill kind:'cicilan' & sisaTenor!=null yg dihitung -> 600rb saja
  assert.equal(s.debtMonthlyInstallment, 600000);
  assert.equal(s.debtToIncomeRatio, 600000 / 10000000);

  // floatingRateDebtRatio: dari debt non-lunas yg bunga>0 -> 100% (cuma 1 debt aktif, semua berbunga)
  assert.equal(s.floatingRateDebtRatio, 1);
});

test('getSnapshot — WorthIt belum tersedia (belum di-load) -> incomeMonthly fallback 0, bukan throw', () => {
  const { UserFinanceAdapter } = load(baseD(), undefined);
  const s = UserFinanceAdapter.getSnapshot();
  assert.equal(s.incomeMonthly, 0);
});

test('getSnapshot — tidak ada target Dana Darurat -> emergencyFundMonths 0', () => {
  const D = baseD();
  D.targets = [];
  const { UserFinanceAdapter } = load(D, 10000000);
  const s = UserFinanceAdapter.getSnapshot();
  assert.equal(s.emergencyFundMonths, 0);
});

test('getSnapshot — tidak ada transaksi expense sama sekali -> expenseMonthly 0, importDependencyRatio 0 (bukan NaN/Infinity)', () => {
  const D = baseD();
  D.transactions = [];
  const { UserFinanceAdapter } = load(D, 10000000);
  const s = UserFinanceAdapter.getSnapshot();
  assert.equal(s.expenseMonthly, 0);
  assert.equal(s.importDependencyRatio, 0);
  assert.equal(s.emergencyFundMonths, 0); // expenseMonthly 0 -> guard, bukan division by zero
});

test('getSnapshot — incomeMonthly 0 -> debtToIncomeRatio 0, bukan Infinity/NaN', () => {
  const D = baseD();
  const { UserFinanceAdapter } = load(D, 0);
  const s = UserFinanceAdapter.getSnapshot();
  assert.equal(s.debtToIncomeRatio, 0);
});

test('getSnapshot — tidak ada utang sama sekali -> debtTotal 0, floatingRateDebtRatio 0 (bukan NaN)', () => {
  const D = baseD();
  D.debts = [];
  const { UserFinanceAdapter } = load(D, 10000000);
  const s = UserFinanceAdapter.getSnapshot();
  assert.equal(s.debtTotal, 0);
  assert.equal(s.floatingRateDebtRatio, 0);
});

test('getSnapshot — pencocokan kategori impor tidak case-sensitive ("Pertalite" huruf besar tetap cocok)', () => {
  const D = baseD();
  D.transactions = [
    { type: 'expense', amount: 1000000, category: 'PERTALITE', date: midThisMonth().toISOString() },
    { type: 'expense', amount: 1000000, category: 'Lainnya', date: midThisMonth().toISOString() },
  ];
  const { UserFinanceAdapter } = load(D, 10000000);
  const s = UserFinanceAdapter.getSnapshot();
  assert.equal(s.importDependencyRatio, 0.5);
});

test('getSnapshot — investasi dgn type yg tidak dikenal masuk ke kategori "lainnya"', () => {
  const D = baseD();
  D.investments = [{ type: 'Aset Aneh', unit: 2, currentPrice: 500 }];
  const { UserFinanceAdapter } = load(D, 10000000);
  const s = UserFinanceAdapter.getSnapshot();
  assert.equal(s.investmentBreakdown.lainnya, 1000);
  assert.equal(s.investmentTotal, 1000);
});
