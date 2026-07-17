// ui/eie-dashboard.js — Kartu Status Ekonomi (§19). HANYA render, tidak
// pernah akses EIEStore/adapter langsung — selalu lewat EIEScoringEngine/
// MacroSyncService. Dipanggil dari DashboardHub.render() (pola "tambahan
// murni" sama seperti LifeOSHome.render()).

const EIEDashboard = {
  _rendering: false,

  async render() {
    const wrap = document.getElementById('eieWrap');
    if (!wrap) return; // container belum ada di halaman ini, aman diam2.
    if (this._rendering) return;
    this._rendering = true;
    try {
      await eieEnsureLoaded();
      // fase 3: nyalakan lagi notifikasi kalau user sudah pernah aktifkan
      // di sesi sebelumnya (sekali per sesi — bootstrap() sendiri no-op
      // aman kalau dipanggil berkali-kali karena NotificationService.enable()
      // sudah guard `if(this._enabled)return`).
      if (typeof EIENotifSettings !== 'undefined') EIENotifSettings.bootstrap();
      const today = new Date().toISOString().slice(0, 10);
      let snapshot = await EIEScoringEngine.getLatestSnapshot();
      // Recompute paling banyak 1x/hari — bukan tiap buka Dashboard Hub,
      // supaya tidak jadi kerja berat berulang tiap render. syncAndRecompute()
      // (bukan recomputeOnly()) supaya boundary harian ini juga jadi titik
      // auto-fetch USD/IDR (API publik) & IHSG (AI+web search) — lihat
      // MacroDataAdapter.refresh(); gagal fetch tetap fallback ke cache lama
      // secara diam-diam (tidak pernah melempar ke sini).
      if (!snapshot || snapshot.date !== today) {
        const result = await MacroSyncService.syncAndRecompute();
        snapshot = result.snapshot;
      }
      this._renderStatusCard(snapshot);
      if (typeof EIEInsightFeed !== 'undefined') EIEInsightFeed.render();
    } catch (e) {
      console.warn('[EIE] EIEDashboard.render() gagal:', e);
    } finally {
      this._rendering = false;
    }
  },

  _renderStatusCard(score) {
    const el = document.getElementById('eieStatusCard');
    if (!el || !score) return;
    const meta = STATUS_META[score.status] || STATUS_META.normal;
    const barColor = score.status === 'risiko_tinggi' ? 'var(--accent2)' : (score.status === 'waspada' ? 'var(--accent4)' : 'var(--accent3)');
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="font-size:28px;line-height:1;">${meta.icon}</div>
        <div>
          <div style="font-weight:600;font-size:15px;">${meta.label}</div>
          <div style="font-size:12.5px;opacity:.75;">Eksposur: ${score.economicExposureScore} · Kesehatan: ${score.personalEconomicHealthScore} · Risiko Makro: ${score.economicRiskIndex}</div>
        </div>
      </div>
      <div style="margin-top:8px;height:6px;border-radius:4px;background:var(--panel2,rgba(255,255,255,.08));overflow:hidden;">
        <div style="height:100%;width:${Math.max(4, Math.min(100, score.breakdown && score.breakdown.impactScore || 0))}%;background:${barColor};"></div>
      </div>
      <div style="margin-top:6px;font-size:11.5px;opacity:.6;">Diperbarui: ${score.date}</div>
      ${this._macroSourceHintHTML()}
      <button class="btn btn-ghost btn-sm u-mt8" data-action="eieManualSync" data-args='["$el"]'>🔄 Perbarui Kurs USD & IHSG Sekarang</button>
    `;
  },

  /** Baris kecil status sumber data USD/IDR & IHSG (auto-api/auto-ai/manual/belum
   * disinkron) supaya user tahu kenapa angkanya belum berubah kalau, mis., API
   * key AI di Pengaturan belum diisi (IHSG tidak bisa auto tanpa itu). */
  _macroSourceHintHTML() {
    try {
      const cache = (typeof MacroDataAdapter !== 'undefined' && MacroDataAdapter.getLatest()) || {};
      const label = (id, name) => {
        const s = cache[id];
        if (!s) return `${name}: belum ada data`;
        if (s.source === 'auto-api' || s.source === 'auto-ai') return `${name}: auto ✓`;
        if (s.source === 'manual-input') return `${name}: manual`;
        return `${name}: belum disinkron`;
      };
      return `<div style="margin-top:2px;font-size:11px;opacity:.55;">${label('usdidr', 'USD/IDR')} · ${label('ihsg', 'IHSG')}</div>`;
    } catch (e) {
      return '';
    }
  },
};

/** Tombol manual "🔄 Perbarui Kurs USD & IHSG" — dipanggil dari data-action
 * lewat dispatcher global (features-helpers-global-security.js), $el = elemen
 * tombol itu sendiri supaya bisa dikasih status loading/disabled sementara. */
async function eieManualSync(btn) {
  const originalLabel = btn ? btn.textContent : null;
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Memperbarui…'; }
  try {
    await eieEnsureLoaded();
    await MacroSyncService.syncAndRecompute();
    await EIEDashboard.render();
    if (typeof toast === 'function') toast('✅ Data kurs & IHSG diperbarui');
  } catch (e) {
    console.warn('[EIE] eieManualSync() gagal:', e);
    if (typeof toast === 'function') toast('⚠️ Gagal update, tetap pakai data sebelumnya');
  } finally {
    const stillBtn = document.getElementById('eieStatusCard') ? document.querySelector('#eieStatusCard [data-action="eieManualSync"]') : null;
    if (stillBtn) { stillBtn.disabled = false; }
    else if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
  }
}
