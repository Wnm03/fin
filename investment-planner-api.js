// modules/finance/investment-planner-api.js — Investment Planner API
// (Sesi 95, Batch 10). Target sesi: Investment Planner Foundation —
// Portfolio Overview, Asset Allocation, Watchlist Alerts, Investment
// Recommendation, Presenter.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE `Investment` (modules/asset/
// investasi.js, MODUL LAMA — sudah punya portfolioSummary()/
// assetAllocation()/getWatchlist()/watchlistAlerts(), field-field di
// dalamnya SUDAH FINAL, dihitung ulang oleh Investment sendiri — TIDAK
// dihitung ulang di sini) + `FinancialGoalAPI._surplus()`
// (modules/finance/financial-goal-api.js, Sesi 94 — method ini SUDAH
// membaca `CashFlowProjectionAPI.summary()` & menghasilkan
// `monthlySurplus`, dipanggil ULANG di sini APA ADANYA supaya TIDAK ada
// duplikasi helper "baca CashFlowProjectionAPI.summary() lalu
// income.avgMonthly-expense.avgMonthly" yang SUDAH ADA persis di
// financial-goal-api.js) — TIDAK ada rumus keuangan baru, TIDAK
// duplikasi logic, TIDAK framework baru, TIDAK mengubah struktur data D
// (murni membaca D.investments/D.investmentTx/D.investmentWatchlist lewat
// `Investment`, yang sudah ada sejak Sesi 9).
//
// Portfolio Overview/Asset Allocation/Watchlist Alerts di bawah BUKAN
// hasil hitungan baru — murni MEMBACA ULANG hasil `Investment.
// portfolioSummary()`/`Investment.assetAllocation()`/
// `Investment.watchlistAlerts()` apa adanya (0 recompute), pola sama
// persis `financialGoals()` (financial-goal-api.js) yang murni membaca
// ulang `goalAdapterList(D)`.
//
// `topAllocation` di bawah SATU-SATUNYA "logic" baru sesi ini — murni
// `array.reduce((a,b)=>b.value>a.value?b:a)` (cari item bernilai
// terbesar), bentuk yang SAMA PERSIS dipakai `_projectionCard()` di
// financial-goal-presenter.js (`withEstimate.reduce((a,b)=>
// b.monthsNeeded<a.monthsNeeded?b:a)`) — bukan rumus finansial baru,
// murni pencarian max/min atas field yang sudah final.
//
// Investment Recommendation di bawah derivatif murni dari Portfolio
// Overview + Asset Allocation + Watchlist Alerts + surplus (semua milik
// file ini sendiri) — pola sama persis `goalRecommendation()`
// (financial-goal-api.js) yang juga cuma menyusun rule dari
// klasifikasi/angka yang sudah final, BUKAN duplikasi
// `FinanceIntelligence.insights()`/`Investment` (cakupan beda: khusus
// investasi).
//
// Semua fungsi di bawah PURE (read-only) — tidak pernah memanggil save()
// atau menulis ke D/localStorage, tidak menyentuh DOM. TIDAK ada UI di
// file ini — presenternya (InvestmentPlannerPresenter) ada di file
// terpisah, sesi ini juga, 100% konsumsi objek ini.
const InvestmentPlannerAPI = {

// _portfolio() — helper internal: satu titik akses ke
// `Investment.portfolioSummary()`. Guard berlapis (Investment belum
// dimuat) — pola sama persis guard `typeof goalAdapterList==='function'`
// di FinancialGoalAPI._goals().
_portfolio() {
  if (typeof Investment === 'undefined') {
    return { ok: false, reason: 'Investment belum dimuat' };
  }
  let s;
  try {
    s = Investment.portfolioSummary();
  } catch (e) {
    return { ok: false, reason: 'Investment.portfolioSummary() gagal dipanggil' };
  }
  return { ok: true, ...s };
},

// portfolioOverview() — Investment Portfolio Overview. `Investment.
// portfolioSummary()` APA ADANYA (holdingsCount/totalValue/totalCost/
// totalGainLoss/roiPct/totalDividend/totalRealizedGain — 0 recompute).
portfolioOverview() {
  return this._portfolio();
},

// _allocation() — helper internal: satu titik akses ke
// `Investment.assetAllocation()`. Guard sama pola dgn _portfolio().
_allocation() {
  if (typeof Investment === 'undefined') {
    return { ok: false, reason: 'Investment belum dimuat' };
  }
  let list;
  try {
    list = Investment.assetAllocation();
  } catch (e) {
    return { ok: false, reason: 'Investment.assetAllocation() gagal dipanggil' };
  }
  return { ok: true, allocation: Array.isArray(list) ? list : [] };
},

// assetAllocation() — Asset Allocation. `Investment.assetAllocation()`
// APA ADANYA (list lengkap per tipe instrumen, sudah terurut value
// terbesar dari Investment sendiri), ditambah `topAllocation` (item
// bernilai terbesar — murni reduce max, pola sama persis `nearest`
// goal di FinancialGoalPresenter._projectionCard()).
assetAllocation() {
  const a = this._allocation();
  if (!a.ok) return a;
  const topAllocation = a.allocation.length
    ? a.allocation.reduce((max, item) => (item.value > max.value ? item : max))
    : null;
  return { ok: true, allocation: a.allocation, topAllocation };
},

// watchlistAlerts() — Watchlist Alerts. `Investment.watchlistAlerts()`
// APA ADANYA (list instrumen yang lastPrice sudah menyentuh/lewat
// targetPrice — logic sudah ada & final di Investment sendiri),
// ditambah `count` (murni `.length`).
watchlistAlerts() {
  if (typeof Investment === 'undefined') {
    return { ok: false, reason: 'Investment belum dimuat' };
  }
  let list;
  try {
    list = Investment.watchlistAlerts();
  } catch (e) {
    return { ok: false, reason: 'Investment.watchlistAlerts() gagal dipanggil' };
  }
  const alerts = Array.isArray(list) ? list : [];
  return { ok: true, alerts, count: alerts.length };
},

// _surplus() — helper internal: satu titik akses ke
// `FinancialGoalAPI._surplus()` (Sesi 94 — SUDAH membaca
// CashFlowProjectionAPI.summary() & menghasilkan `monthlySurplus`,
// dipakai ULANG di sini apa adanya supaya TIDAK duplikasi helper yang
// sudah ada). Guard berlapis (FinancialGoalAPI belum dimuat/method
// tidak ada) — kalau tidak tersedia, `ok:false` diteruskan apa adanya
// (bukan dianggap fatal — investmentRecommendation() tetap jalan tanpa
// bagian surplus, lihat di bawah).
_surplus() {
  if (typeof FinancialGoalAPI === 'undefined' || typeof FinancialGoalAPI._surplus !== 'function') {
    return { ok: false, reason: 'FinancialGoalAPI._surplus() belum dimuat' };
  }
  let s;
  try {
    s = FinancialGoalAPI._surplus();
  } catch (e) {
    return { ok: false, reason: 'FinancialGoalAPI._surplus() gagal dipanggil' };
  }
  return s || { ok: false, reason: 'surplus tidak tersedia' };
},

// investmentRecommendation() — Investment Recommendation. Derivatif
// murni dari portfolioOverview() + assetAllocation() + watchlistAlerts()
// + _surplus() milik file ini sendiri — pola sama persis
// goalRecommendation() (financial-goal-api.js). 5 rule turunan, murni
// perbandingan sederhana atas field yang sudah final (0 rumus baru):
//   - holdingsCount===0 -> info (belum ada portofolio)
//   - roiPct<0 -> warning (portofolio rugi)
//   - roiPct>=10 -> positive (portofolio tumbuh baik)
//   - topAllocation.pct>=70 (holdingsCount>1) -> info (konsentrasi tinggi
//     di satu jenis instrumen, saran diversifikasi)
//   - watchlist alerts count>0 -> info (ada instrumen watchlist sudah
//     capai target beli)
//   - monthlySurplus>0 (dari _surplus(), kalau tersedia) -> positive
//     (ada surplus bulanan yang bisa dialokasikan ke investasi)
investmentRecommendation() {
  const p = this.portfolioOverview();
  const out = [];
  if (!p.ok) return out;
  if (p.holdingsCount === 0) {
    out.push({ type: 'info', code: 'invest_no_holdings', message: 'Belum ada portofolio investasi — tambahkan instrumen pertama utk mulai memantau ROI & alokasi aset.' });
  } else {
    if (p.roiPct < 0) {
      out.push({ type: 'warning', code: 'invest_negative_roi', message: `Portofolio sedang rugi (ROI ${p.roiPct.toFixed(1)}%) — pertimbangkan tinjau ulang alokasi.` });
    } else if (p.roiPct >= 10) {
      out.push({ type: 'positive', code: 'invest_good_roi', message: `Portofolio tumbuh baik (ROI ${p.roiPct.toFixed(1)}%).` });
    }
    const a = this.assetAllocation();
    if (a.ok && a.topAllocation && p.holdingsCount > 1 && a.topAllocation.pct >= 70) {
      out.push({ type: 'info', code: 'invest_concentration', message: `${Math.round(a.topAllocation.pct)}% portofolio terkonsentrasi di "${a.topAllocation.type}" — pertimbangkan diversifikasi.` });
    }
  }
  const w = this.watchlistAlerts();
  if (w.ok && w.count > 0) {
    out.push({ type: 'info', code: 'invest_watchlist_alert', message: `${w.count} instrumen di watchlist sudah menyentuh harga target beli.` });
  }
  const s = this._surplus();
  if (s.ok && s.monthlySurplus > 0) {
    out.push({ type: 'positive', code: 'invest_surplus_available', message: `Ada surplus bulanan yang bisa dialokasikan ke investasi.` });
  }
  return out;
},

// summary() — satu pintu masuk gabungan (dipakai presenter), murni
// memanggil ke-4 fungsi di atas, TIDAK ada logic tambahan. `ok` true
// kalau portfolioOverview() ok (pola sama persis FinancialGoalAPI.
// summary()/BudgetRecommendationAPI.summary() — recommendation/alerts
// TIDAK ikut menentukan `ok` gabungan).
summary() {
  const portfolioOverview = this.portfolioOverview();
  const assetAllocation = this.assetAllocation();
  const watchlistAlerts = this.watchlistAlerts();
  const recommendation = this.investmentRecommendation();
  return {
    ok: !!portfolioOverview.ok,
    portfolioOverview,
    assetAllocation,
    watchlistAlerts,
    recommendation: Array.isArray(recommendation) ? recommendation : [],
  };
},

};
