// adapters/goal-adapter.js — READ-ONLY. Menyeragamkan 6 sumber goal lama
// (D.targets, D.eduFunds, D.pensiun, D.finansialFreedom, D.wishlist,
// D.debtStrategy) jadi satu bentuk "goal card". Tidak menyimpan apa pun,
// dihitung ulang tiap dipanggil. Tidak pernah menulis ke D.
//
// Depends on: lifeos-registry.js (LIFEOS_GOAL_SOURCES)

function goalAdapterList(D) {
  const out = [];

  (D.targets || []).forEach((t) => out.push({
    id: `target:${t.id}`, sourceKind: 'target', sourceId: t.id,
    name: t.name, emoji: t.emoji || '🎯',
    targetAmount: t.amount, currentAmount: t.saved,
    progressPct: t.amount ? Math.min(100, Math.round((t.saved / t.amount) * 100)) : 0,
    deadline: null, areaKey: 'finance',
    isDanaDarurat: !!t.isDanaDarurat,
  }));

  (D.eduFunds || []).forEach((e) => out.push({
    id: `eduFund:${e.id}`, sourceKind: 'eduFund', sourceId: e.id,
    name: e.name || 'Dana Pendidikan', emoji: '🎓',
    targetAmount: e.target ?? null, currentAmount: e.saved ?? null,
    progressPct: e.target ? Math.min(100, Math.round(((e.saved || 0) / e.target) * 100)) : null,
    deadline: null, areaKey: 'finance',
  }));

  (D.wishlist || []).filter((w) => !w.bought).forEach((w) => out.push({
    id: `wishlist:${w.id}`, sourceKind: 'wishlist', sourceId: w.id,
    name: w.name, emoji: '🛍️',
    targetAmount: w.price, currentAmount: 0, progressPct: 0,
    deadline: null, areaKey: 'finance',
  }));

  // NOTE: D.pensiun, D.finansialFreedom, D.debtStrategy — bentuk persisnya
  // (objek tunggal vs array) belum terverifikasi (modules-calc.js belum
  // di-audit). Adapter untuk 3 sumber ini sengaja dikosongkan dulu — isi
  // setelah field-nya dikonfirmasi, jangan menebak bentuknya di sini.

  return out;
}

function goalAdapterFindOne(D, sourceKind, sourceId) {
  return goalAdapterList(D).find((g) => g.sourceKind === sourceKind && g.sourceId === sourceId) || null;
}
