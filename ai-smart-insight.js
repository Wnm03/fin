// ai-smart-insight.js — Kartu "🤖 Insight AI" PERSISTEN di paling atas halaman, tampil SAMA di
// SEMUA tab/halaman. Markup-nya (#aiSmartInsightCard) sengaja ditaruh di index.html/
// app_production.html DI LUAR .page (langsung di dalam #mainApp, sebelum <!-- DASHBOARD -->),
// jadi TIDAK ikut disembunyikan/diganti oleh showPage() (modal-navigasi.js) seperti kartu
// FeatureInsightUI (feature-insights.js) yang satu kartu per halaman — beda tujuan: modul itu
// insight PER FITUR, modul ini insight PEMAKAIAN AI SECARA KESELURUHAN, dan harus terlihat
// dari tab manapun tanpa pindah scroll posisi.
//
// TUJUAN: kasih tahu user "apakah kamu sudah pintar/optimal memanfaatkan fitur AI di app ini",
// dibaca dari sinyal pemakaian AI yang SUDAH ADA, semua lewat guard `typeof X!=='undefined'`
// (pola sama dgn feature-insights.js) — read-only, TIDAK nyimpen state baru sendiri:
//   - D.profile.apiKey        -> AI sudah diaktifkan/belum (features-helpers-global-security.js)
//   - D.chatHistory            -> seberapa sering pakai AI Asisten chat (page-ai)
//   - D.learnedItemCat         -> seberapa sering saran kategori AI di-"Pakai" (kategorisasi-ai.js)
//   - D.assetAllocation/D.assets[].penyusutan -> pernah pakai widget Rekomendasi AI di halaman
//     Aset (invest-ai-widget.js / penyusutan-ai-widget.js)
//
// Dipanggil dari showPage() (modal-navigasi.js) TIAP pindah tab supaya datanya selalu segar —
// tapi elemen kartunya sendiri tidak pernah ikut di-hide/dipindah, jadi "posisinya" konsisten
// di baris yang sama (tepat di bawah header) di semua tab. Dipanggil juga dari boot/render
// awal (renderAll di modules-render.js) supaya sudah terisi sebelum tab pertama dibuka.
const AiSmartInsight = {
  // Urutan dari paling rendah ke tinggi — dipilih dari BAWAH (level tertinggi yang syaratnya
  // terpenuhi) di pickLevel().
  LEVELS: [
    { key: 'belum', label: 'Belum aktif', emoji: '⚪', headline: 'AI di app ini belum kamu aktifkan.' },
    { key: 'baru', label: 'Baru mulai', emoji: '🟡', headline: 'Kamu baru mulai coba-coba fitur AI di app ini.' },
    { key: 'lumayan', label: 'Lumayan', emoji: '🟠', headline: 'Lumayan — beberapa fitur AI sudah mulai kamu manfaatkan.' },
    { key: 'pintar', label: 'Sudah pintar', emoji: '🟢', headline: 'Mantap, kamu sudah pintar memanfaatkan AI di app ini.' },
  ],

  // Baca semua sinyal pemakaian AI yang relevan dari D. Semua field dibaca defensif (opsional)
  // supaya modul ini tidak pernah melempar error walau salah satu fitur/data belum ada.
  readSignals() {
    const hasD = typeof D !== 'undefined' && D;
    const apiKey = !!(hasD && D.profile && D.profile.apiKey);
    const chatCount = (hasD && Array.isArray(D.chatHistory))
      ? D.chatHistory.filter(m => m && m.role === 'user').length
      : 0;
    const learnedCount = (hasD && D.learnedItemCat && typeof D.learnedItemCat === 'object')
      ? Object.keys(D.learnedItemCat).length
      : 0;
    const usedInvestAI = !!(hasD && D.assetAllocation && D.assetAllocation.risk);
    const usedPenyusutanAI = !!(hasD && Array.isArray(D.assets) &&
      D.assets.some(a => a && a.penyusutan && a.penyusutan.aktif));
    return { apiKey, chatCount, learnedCount, usedInvestAI, usedPenyusutanAI };
  },

  // Skor kasar 0-5 dari sinyal di atas -> dipetakan ke salah satu LEVELS.
  pickLevel(sig) {
    if (!sig.apiKey) return this.LEVELS[0];
    let score = 1; // apiKey sudah aktif = poin dasar
    if (sig.chatCount >= 1) score++;
    if (sig.chatCount >= 8) score++;
    if (sig.learnedCount >= 3) score++;
    if (sig.usedInvestAI || sig.usedPenyusutanAI) score++;
    if (score <= 1) return this.LEVELS[1];
    if (score <= 3) return this.LEVELS[2];
    return this.LEVELS[3];
  },

  // Saran actionable, maksimal beberapa item, prioritas: aktifkan dulu -> lalu coba fitur satu-satu.
  buildTips(sig) {
    const tips = [];
    if (!sig.apiKey) {
      tips.push({ icon: '🔑', text: 'Isi API key AI di Pengaturan supaya AI Asisten, kategorisasi otomatis, & rekomendasi AI di berbagai fitur bisa aktif.' });
      return tips;
    }
    if (sig.chatCount < 3) {
      tips.push({ icon: '💬', text: 'Coba tanya AI Asisten soal kondisi keuanganmu bulan ini — makin sering ditanya, makin terasa manfaatnya.' });
    }
    if (sig.learnedCount < 3) {
      tips.push({ icon: '🏷️', text: 'Saat input transaksi, coba pakai saran kategori dari AI lalu tap "✅ Pakai" — AI makin cepat menebak kategori berikutnya.' });
    }
    if (!sig.usedInvestAI && !sig.usedPenyusutanAI) {
      tips.push({ icon: '🧭', text: 'Lihat kartu "🤖 Rekomendasi AI" di halaman Aset (Alokasi Aset / Penyusutan) untuk saran otomatis dari AI.' });
    }
    if (!tips.length) {
      tips.push({ icon: '✨', text: 'Kamu sudah memanfaatkan hampir semua fitur AI yang tersedia di app ini. Pertahankan!' });
    }
    return tips.slice(0, 3);
  },

  compute() {
    const sig = this.readSignals();
    const level = this.pickLevel(sig);
    const tips = this.buildTips(sig);
    return { ...sig, level, tips };
  },

  render() {
    const card = document.getElementById('aiSmartInsightCard');
    const badge = document.getElementById('aiSmartInsightBadge');
    const headline = document.getElementById('aiSmartInsightHeadline');
    const body = document.getElementById('aiSmartInsightBody');
    if (!card || !badge || !headline || !body) return;
    if (typeof D === 'undefined') { card.classList.add('u-dnone'); return; }
    card.classList.remove('u-dnone');
    const r = this.compute();
    badge.textContent = r.level.emoji + ' ' + r.level.label;
    headline.textContent = r.level.headline;
    const esc = typeof escapeHtml === 'function' ? escapeHtml : (s => s);
    body.innerHTML = r.tips.map(t =>
      `<div class="u-fs12 u-lh15 u-mb6">${t.icon} ${esc(t.text)}</div>`
    ).join('');
  },
};
if (typeof window !== 'undefined') window.AiSmartInsight = AiSmartInsight;
