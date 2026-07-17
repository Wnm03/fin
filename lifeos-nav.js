// lifeos-nav.js — "Jump to source": item Life OS (Today/Goals/Projects)
// hanyalah LENSA baca di atas data lama (lihat komentar di
// adapters/today-adapter.js & adapters/goal-adapter.js: tiap item sudah
// bawa `sourceKind`/`sourceId`). File ini SATU-SATUNYA tempat yang tahu
// cara "pergi ke referensi aslinya" per sourceKind — supaya ui/today.js,
// ui/goals.js, ui/projects.js tidak masing-masing menebak sendiri cara
// membuka modal/halaman modul lama (yang gampang jadi tidak konsisten &
// duplikat kalau ditulis ulang di tiap file UI).
//
// Read-only murni: tidak pernah menulis ke D/LifeOSStore, cuma memanggil
// fungsi navigasi/modal yang SUDAH ADA (showPage, openModal via WorthIt/
// Renov, dst) atau menyorot+scroll ke kartu Setelan yang relevan — pola
// sorot+scroll-nya sama persis dengan stgSearch() di pengaturan-search.js,
// supaya "pergi ke referensi" terasa konsisten dengan fitur cari
// pengaturan yang sudah ada, bukan mekanisme baru.
//
// Kalau nanti nambah sumber baru di todayAdapterList/goalAdapterList/
// projectAdapterList, tambahkan entri sourceKind yang cocok di
// LIFEOS_NAV_MAP di bawah — jangan hardcode navigasi di file adapter/ui.

const LIFEOS_NAV_MAP = {
  // --- Today (adapters/today-adapter.js) ---
  bills: { page: 'settings', cardSelector: '#billList' },
  reminders: { page: 'settings', cardSelector: '#reminderList' },

  // --- Goals (adapters/goal-adapter.js) ---
  target: { page: 'settings', cardSelector: '#targetList' },
  eduFund: { page: 'settings', cardSelector: '#eduFundList' },
  wishlist: {
    openFn() {
      if (typeof WorthIt !== 'undefined' && typeof WorthIt.open === 'function') WorthIt.open();
    },
  },

  // --- Projects (adapters/project-adapter.js) ---
  renovasi: {
    openFn(sourceId) {
      if (typeof Renov !== 'undefined' && typeof Renov.openDetail === 'function') Renov.openDetail(sourceId);
    },
  },
  // kind:'generic' (LifeOSStore.projects) SENGAJA tidak ada entri di sini —
  // project generik itu sendiri LAHIR di Life OS (lifeos/services/
  // project-service.js), tidak punya "referensi lama" di modul lain untuk
  // dituju. Ditangani terpisah di lifeOSNavigateToSource() di bawah.
};

/**
 * Pergi ke referensi data tempat 1 item Life OS sebenarnya berada.
 * @param {string} sourceKind lihat field `sourceKind` di item hasil adapter
 *   (today/goal), atau `kind` untuk item project ('renovasi'|'generic').
 * @param {string|number} [sourceId] id di array sumber lama (mis. D.bills id).
 */
function lifeOSNavigateToSource(sourceKind, sourceId) {
  if (sourceKind === 'generic') {
    if (typeof toast === 'function') toast('🌱 Project ini murni tersimpan di Life OS — belum ada halaman lama untuk ini.');
    return;
  }
  const conf = LIFEOS_NAV_MAP[sourceKind];
  if (!conf) {
    console.warn('[LifeOS] lifeOSNavigateToSource: sourceKind tidak dikenal:', sourceKind);
    if (typeof toast === 'function') toast('⚠️ Referensi untuk item ini belum diatur. Tolong laporkan ke pengembang.');
    return;
  }

  if (typeof conf.openFn === 'function') {
    conf.openFn(sourceId);
    return;
  }

  if (conf.page) {
    // Pindah halaman: REUSE dashHubNavigateToFeature() (dashboard-hub.js) —
    // fungsi ini sudah tahu cara showPage() + tandai nav-item bottom-nav yg
    // benar lewat PAGE_NAV_IDX, jadi lookup navBtns/navIndex tidak perlu
    // ditulis ulang di sini (dulu duplikat persis). goTo/tab/action SENGAJA
    // tidak dikirim — semua entri LIFEOS_NAV_MAP butuh highlight kartu
    // Setelan (cardSelector, bisa nested di dalam stg-group yang collapsed),
    // beda mekanisme dgn goTo generik dashHubNavigateToFeature (flash by id
    // saja, tidak buka stg-group/card-collapse dulu) — makanya tetap dites
    // _lifeOSHighlightSettingsCard() di bawah, bukan lewat target.goTo.
    if (typeof dashHubNavigateToFeature === 'function') {
      dashHubNavigateToFeature({ page: conf.page });
    } else if (typeof showPage === 'function') {
      // Fallback kalau dashboard-hub.js entah kenapa belum ter-load —
      // showPage() tanpa `el` tetap aman, dia sendiri fallback ke
      // querySelector nav-item yang cocok (lihat modal-navigasi.js).
      showPage(conf.page);
    }
    // showPage() me-render halaman baru secara sinkron, tapi kasih 1 tick
    // supaya DOM (termasuk stg-group yang collapsed) benar2 settle sebelum
    // dicari & disorot — pola sama persis dgn timeout 120ms di stgSearch().
    setTimeout(() => _lifeOSHighlightSettingsCard(conf.cardSelector), 120);
  }
}

/** Sorot + scroll ke kartu Setelan yang berisi elemen `selector` — pola
 * sorot/scroll-nya SAMA PERSIS dengan stgSearch() (pengaturan-search.js),
 * sengaja tidak dipanggil ulang dari sana supaya file ini tetap mandiri
 * dan tidak bergantung urutan load terhadap pengaturan-search.js. */
function _lifeOSHighlightSettingsCard(selector) {
  if (!selector) return;
  const anchor = document.querySelector(selector);
  const card = anchor ? anchor.closest('.card, .card-collapse') : null;
  if (!card) return;

  const tabPanel = card.closest('.stg-tabpanel');
  if (tabPanel && tabPanel.classList.contains('u-dnone') && typeof setSettingsTab === 'function') {
    setSettingsTab(tabPanel.dataset.tab);
  }
  const grp = card.closest('.stg-group');
  if (grp && !grp.classList.contains('open') && typeof toggleStgGroup === 'function') toggleStgGroup(grp.id);
  if (card.classList.contains('card-collapse') && !card.classList.contains('open') && typeof toggleSingleCardCollapse === 'function') {
    toggleSingleCardCollapse(card.id);
  }

  card.style.outline = '2px solid var(--accent)';
  card.style.outlineOffset = '3px';
  setTimeout(() => { card.style.outline = ''; card.style.outlineOffset = ''; }, 2500);
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

if (typeof window !== 'undefined') {
  window.lifeOSNavigateToSource = lifeOSNavigateToSource;
}
