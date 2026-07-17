// ui/eie-dashboard.js — Economic Weather card (§19). HANYA render, tidak
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
      // supaya tidak jadi kerja berat berulang tiap render.
      if (!snapshot || snapshot.date !== today) {
        const result = await MacroSyncService.recomputeOnly();
        snapshot = result.snapshot;
      }
      this._renderWeatherCard(snapshot);
      if (typeof EIEInsightFeed !== 'undefined') EIEInsightFeed.render();
    } catch (e) {
      console.warn('[EIE] EIEDashboard.render() gagal:', e);
    } finally {
      this._rendering = false;
    }
  },

  _renderWeatherCard(score) {
    const el = document.getElementById('eieWeatherCard');
    if (!el || !score) return;
    const meta = WEATHER_META[score.weather] || WEATHER_META.normal;
    const barColor = score.weather === 'risiko_tinggi' ? 'var(--accent2)' : (score.weather === 'waspada' ? 'var(--accent4)' : 'var(--accent3)');
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
    `;
  },
};
