// adapters/macro-data-adapter.js — Normalisasi data makro dari berbagai
// sumber, dgn fallback cache (offline-first, §16 dokumen desain).
//
// FASE 1 (MVP, "senyap"): TIDAK ada fetch ke API eksternal apa pun — app ini
// berjalan offline-first & sandbox build ini tidak mengaktifkan network.
// Nilai makro diisi dari eie-store (manual cache). Kalau cache masih kosong
// (pemakaian pertama), dipakai seed placeholder yang DITANDAI TEGAS
// `isStale:true, source:'seed-belum-disinkron'` — supaya skor/insight yang
// dihasilkan tidak pernah diam-diam dikira data pasar real-time.
//
// Fase 2: ganti isi `_fetchRemote()` dgn fetch API nyata (BI/Yahoo Finance/
// dst) di dalam try/catch, tetap fallback ke cache kalau gagal — interface
// `MacroDataAdapter.getLatest()`/`refresh()` TIDAK PERLU berubah.

const EIE_MACRO_INDICATORS = ['usdidr', 'inflasi', 'bi_rate', 'ihsg', 'emas', 'bbm'];

// Seed placeholder — HANYA dipakai kalau eie-store benar-benar belum
// pernah diisi (first run). Angka diambil dari kisaran umum, BUKAN data
// live, dan wajib direfresh/diinput manual oleh user/admin di fase 2 UI.
function _eieSeedMacro() {
  const now = Date.now();
  const seed = {
    usdidr:  { value: 16250, prevValue: 16250, unit: 'IDR' },
    inflasi: { value: 3.0,   prevValue: 3.0,   unit: '%' },
    bi_rate: { value: 6.0,   prevValue: 6.0,   unit: '%' },
    ihsg:    { value: 7200,  prevValue: 7200,  unit: 'poin' },
    emas:    { value: 1950000, prevValue: 1950000, unit: 'IDR/gram' },
    bbm:     { value: 12500, prevValue: 12500, unit: 'IDR/liter' },
  };
  const out = {};
  Object.keys(seed).forEach((id) => {
    const s = seed[id];
    out[id] = {
      indicatorId: id, value: s.value, prevValue: s.prevValue, changePct: 0, trend: 'flat',
      unit: s.unit, source: 'seed-belum-disinkron', fetchedAt: now, isStale: true,
    };
  });
  return out;
}

function _eieComputeTrend(value, prevValue) {
  if (!prevValue) return { changePct: 0, trend: 'flat' };
  const changePct = ((value - prevValue) / prevValue) * 100;
  const trend = changePct > 0.05 ? 'up' : (changePct < -0.05 ? 'down' : 'flat');
  return { changePct, trend };
}

const MacroDataAdapter = {
  /**
   * Baca snapshot makro terbaru dari eie-store. Kalau kosong, isi seed
   * placeholder (ditandai isStale) TANPA menulis balik ke store secara
   * otomatis — biar eksplisit lewat refresh()/setManualValue() saja.
   * @returns {Object.<string, import('../domain/entities.js').MacroSnapshot>}
   */
  getLatest() {
    const store = eieGetStore();
    const cache = store.macroCache || {};
    if (!cache || !Object.keys(cache).length) {
      return _eieSeedMacro();
    }
    return cache;
  },

  /**
   * Input manual 1 indikator (dipakai admin/user di UI fase 2, atau utk
   * testing). Menulis ke eie-store lewat eieSave() — SATU-SATUNYA jalur
   * tulis macro cache.
   */
  async setManualValue(indicatorId, value, unit) {
    if (!EIE_MACRO_INDICATORS.includes(indicatorId)) {
      throw new Error('[EIE] indicatorId tidak dikenal: ' + indicatorId);
    }
    const store = eieGetStore();
    const prev = (store.macroCache && store.macroCache[indicatorId]) || null;
    const prevValue = prev ? prev.value : value;
    const { changePct, trend } = _eieComputeTrend(value, prevValue);
    const snapshot = {
      indicatorId, value, prevValue, changePct, trend,
      unit: unit || (prev && prev.unit) || '',
      source: 'manual-input', fetchedAt: Date.now(), isStale: false,
    };
    store.macroCache = store.macroCache || {};
    store.macroCache[indicatorId] = snapshot;
    store.macroHistory = store.macroHistory || {};
    store.macroHistory[indicatorId] = (store.macroHistory[indicatorId] || []).concat([snapshot]).slice(-365);
    await eieSave();
    return snapshot;
  },

  /**
   * Placeholder titik integrasi fetch API eksternal (fase 2). Fase 1
   * SELALU fallback ke cache (network tidak diaktifkan di build ini).
   */
  async refresh() {
    try {
      // TODO fase 2: panggil API nyata di sini, contoh pola:
      // const res = await fetch(ENDPOINT); const json = await res.json();
      // lalu MacroDataAdapter.setManualValue(...) per indikator.
      // Untuk sekarang: tidak ada network call, langsung fallback cache.
      return this.getLatest();
    } catch (e) {
      console.warn('[EIE] refresh() gagal, pakai cache lama:', e);
      return this.getLatest();
    }
  },
};
