// ui/lifeos-home.js — halaman masuk Life OS. Hanya membaca lewat adapter,
// menulis (kalau ada aksi) hanya lewat services/*.js. Tidak pernah akses D
// atau LifeOSStore langsung dari file UI — selalu lewat adapter/service.
//
// CATATAN NAVIGASI (keputusan sesi ini): LifeOS BUKAN page terpisah — dia
// section di dalam #page-dashboard-hub (lihat index.html/app_production.html
// wrapper #lifeOSWrap). showPage() tidak dipakai sama sekali di sini karena
// showPage() akses document.getElementById('page-'+name) TANPA null-check
// (lihat modal-navigasi.js) dan renderPageContent() (modules-render.js)
// tidak punya case untuk page LifeOS — menambah case di situ berarti
// mengubah modul lama, dilarang. Sebagai gantinya dipakai switchPanel()
// lokal, cuma toggle class 'u-dnone' (utility class yang sudah ada) di
// antara panel-panel sibling di dalam #lifeOSWrap. Router lama tidak
// disentuh sama sekali.

const LifeOSHome = {
  async render() {
    const el = document.getElementById('lifeOSHomeGrid');
    if (!el) return;

    await lifeOSEnsureLoaded();
    const store = lifeOSGetStore();

    const today = todayAdapterList(D);
    const goals = goalAdapterList(D);
    const projects = projectAdapterList(D, store);
    const knowledge = knowledgeAdapterList(store);

    // Reuse class dashhub-feature-card/-name/-desc (sudah ada di styles.css,
    // dipakai DashboardHub.render()) — sengaja, supaya tidak perlu CSS baru.
    el.innerHTML = `
      <div class="dashhub-feature-card" data-action="LifeOSHome.switchPanel" data-args='["today"]'>
        <div class="dashhub-feature-name">Today</div>
        <div class="dashhub-feature-desc">${today.length} item</div>
      </div>
      <div class="dashhub-feature-card" data-action="LifeOSHome.switchPanel" data-args='["goals"]'>
        <div class="dashhub-feature-name">Goals</div>
        <div class="dashhub-feature-desc">${goals.length} goal</div>
      </div>
      <div class="dashhub-feature-card" data-action="LifeOSHome.switchPanel" data-args='["projects"]'>
        <div class="dashhub-feature-name">Projects</div>
        <div class="dashhub-feature-desc">${projects.length} project</div>
      </div>
      <div class="dashhub-feature-card" data-action="LifeOSHome.switchPanel" data-args='["review"]'>
        <div class="dashhub-feature-name">Review</div>
        <div class="dashhub-feature-desc">Weekly/Monthly</div>
      </div>
      <div class="dashhub-feature-card" data-action="LifeOSHome.switchPanel" data-args='["knowledge"]'>
        <div class="dashhub-feature-name">Knowledge</div>
        <div class="dashhub-feature-desc">${knowledge.length} insight</div>
      </div>
    `;

    // Render tiap panel sekali di sini (skala data personal, murah). Yang
    // aktif/terlihat ditentukan switchPanel() lewat CSS class, bukan re-render.
    if (typeof LifeOSToday !== 'undefined') LifeOSToday.render();
    if (typeof LifeOSGoals !== 'undefined') LifeOSGoals.render();
    if (typeof LifeOSProjects !== 'undefined') LifeOSProjects.render();
    if (typeof LifeOSReview !== 'undefined') LifeOSReview.render();
    if (typeof LifeOSKnowledge !== 'undefined') LifeOSKnowledge.render();
  },

  switchPanel(name) {
    const panels = ['today', 'goals', 'projects', 'review', 'knowledge'];
    panels.forEach((p) => {
      const panelEl = document.getElementById('lifeOSPanel-' + p);
      if (panelEl) panelEl.classList.toggle('u-dnone', p !== name);
    });
  },
};
