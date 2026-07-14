// adapters/review-adapter.js — READ-ONLY. Menggabungkan histori pasif
// existing (D.wealthSnapshots, D.lifeBalanceSnapshots, D.assetAllocation)
// dengan sesi review Life OS sendiri (LifeOSStore.reviewLog). Tidak pernah
// menulis ke D. Penulisan sesi review lewat services/review-service.js.

function reviewAdapterLatestSnapshots(D) {
  return {
    wealth: (D.wealthSnapshots || []).slice(-1)[0] || null,
    lifeBalance: (D.lifeBalanceSnapshots || []).slice(-1)[0] || null,
    assetAllocation: D.assetAllocation || null,
  };
}

function reviewAdapterLogFor(lifeOSStore, period) {
  return (lifeOSStore.reviewLog || [])
    .filter((r) => r.period === period)
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
}

function reviewAdapterIsOverdue(lifeOSStore, period, thresholdDays) {
  const last = reviewAdapterLogFor(lifeOSStore, period)[0];
  if (!last) return true;
  const daysSince = Math.floor((Date.now() - new Date(last.completedAt)) / (1000 * 60 * 60 * 24));
  return daysSince >= thresholdDays;
}
