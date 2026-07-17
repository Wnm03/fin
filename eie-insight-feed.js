// ui/eie-insight-feed.js — Feed insight & rekomendasi (§3, §19). HANYA
// render, akses data lewat InsightGenerator/RecommendationService (bukan
// EIEStore langsung).

const EIEInsightFeed = {
  async render() {
    const el = document.getElementById('eieInsightFeed');
    if (!el) return;
    try {
      const list = (await InsightGenerator.list({ onlyUnread: false }))
        .filter((i) => !i.dismissed)
        .slice(0, 8);
      if (!list.length) {
        el.innerHTML = `<div style="font-size:12.5px;opacity:.6;padding:6px 0;">Belum ada insight — kondisi makro & keuanganmu belum memicu rule apa pun saat ini.</div>`;
        return;
      }
      const sevIcon = { critical: '🔴', warning: '🟡', info: 'ℹ️' };
      el.innerHTML = list.map((ins) => {
        const rec = ins.recommendationId ? RecommendationService.getById(ins.recommendationId) : null;
        return `
          <div style="padding:8px 0;border-bottom:1px solid var(--border,rgba(255,255,255,.08));font-size:13px;">
            <div>${sevIcon[ins.severity] || 'ℹ️'} ${escapeHtml(ins.message)}</div>
            ${rec ? `<div style="margin-top:3px;font-size:11.5px;opacity:.7;">→ ${escapeHtml(rec.label)}</div>` : ''}
          </div>
        `;
      }).join('');
    } catch (e) {
      console.warn('[EIE] EIEInsightFeed.render() gagal:', e);
    }
  },
};
