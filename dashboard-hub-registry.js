// dashboard-hub-registry.js — FEATURE_REGISTRY: sumber data tunggal taksonomi
// Dashboard Feature Hub (blueprint-dashboard-hub.md §1 & §7, Tahap 0).
//
// PENTING — file ini MURNI DATA, tidak ada logic render/navigasi apa pun.
// Tahap 0 blueprint: "Finalisasi taksonomi §1 jadi 1 sumber data ... Tidak
// ada elemen visual baru dirender." dashboard-hub.js/sidebar-nav.js/
// dashboard-hub-search.js (Tahap 1+) akan MENGKONSUMSI registry ini, bukan
// didefinisikan di sini.
//
// Setiap `target` di bawah HANYA diisi berdasarkan navigasi yang SUDAH ADA &
// TERVERIFIKASI di codebase (showPage/goToList/setKeuanganTab/setShopTab/
// setPajakTab/toggleStgGroup/data-action) — bukan tebakan. Bentuk `target`:
//   { page }              — nama page (cocok dgn id="page-<page>")
//   { page, tab }         — tab di dalam page (lihat TAB REFERENSI di bawah)
//   { page, tab, goTo }   — + id elemen utk scroll-highlight ala goToList()
//   { page, group }       — khusus page:'settings', id grup stgGroup (toggleStgGroup)
//   { page, group, goTo } — + id elemen di dalam grup itu
//   { page, dashKey }     — key di DASH_CARD_DEFS (modules-render.js) utk
//                           widget Pinned. Sejak Tahap 3a, 4 widget migrasi
//                           (refleksi/fi/pensiun/absensi) render-nya TETAP
//                           dikontrol DASH_CARD_DEFS yg sama, tapi elemen
//                           HTML-nya sudah pindah ke page:'dashboard-hub'
//                           (section "Pinned Widgets") — sisanya (mis.
//                           laporanMini) masih page:'dashboard' lama.
//   { page, goTo }        — kartu inti Dashboard yang TIDAK ada di
//                           DASH_CARD_DEFS (advisorCard/lifeBalanceCard) —
//                           selalu tampil, tidak bisa dimatikan lewat
//                           isDashCardOn(). Sejak Tahap 3b elemen HTML-nya
//                           sudah pindah ke page:'dashboard-hub' (section
//                           "Pinned Widgets"), sama seperti 4 widget Tahap
//                           3a — render-nya TETAP dipanggil langsung & tanpa
//                           syarat dari renderDashboard() (Advisor.render()/
//                           AIWidget.render()/FinCoach.renderDash()/
//                           LifeBalance.render()), bukan lewat DASH_CARD_DEFS.
//   { page, tab, action } — target utama fitur ini adalah membuka modal
//                           lewat data-action (mis. openTxModal), bukan
//                           scroll ke kartu — dipakai kalau fitur murni
//                           form/modal tanpa kartu tersendiri di halaman
//   { action }            — fitur modal-only, tidak attach ke page/tab
//                           manapun (dibuka lewat Quick Switcher, mis.
//                           WorthIt.open()), TIDAK ADA kartu di page manapun
//                           per audit codebase saat ini
//
// TAB REFERENSI (diverifikasi lewat data-action="setXxxTab" & pane id di
// index.html/app_production.html):
//   page:'keuangan' -> 'kelola' | 'laporan'      (setKeuanganTab, tx-list-cashflow.js)
//   page:'shop'     -> 'kasir'|'jual'|'etalase'|'produsen'|'riwayat'|'pelanggan' (setShopTab, cobek-io.js)
//   page:'carnotes' -> 'bbm' | 'servis'           (setCnTab, vehicle-core.js)
//   page:'pajak'    -> 'zakat' | 'pajak'           (setPajakTab, features-sheets-pwa-selftest.js)
//
// `icon` per fitur/kategori SENGAJA masih emoji (bukan nama ikon SVG
// Feather/Lucide dari Design System §9) — emoji ini adalah yang SUDAH
// dipakai app di card-title masing-masing fitur (jadi terverifikasi nyata
// ada), gampang di-cross-check. Konversi ke SVG outline 24px sesuai §9
// adalah kerjaan visual Tahap 1+, BUKAN Tahap 0.
//
// Kalau nanti ada fitur baru/pindah lokasi, update HANYA file ini —
// jangan taruh taksonomi duplikat di file lain.

const FEATURE_REGISTRY = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: '🏠',
    desc: 'Ringkasan personal & insight otomatis',
    target: { page: 'dashboard-hub' },
    navIdx: 0,
    features: [
      { key: 'dash-penasihat', label: 'Penasihat AI', desc: 'Insight Cepat & Laporan AI', target: { page: 'dashboard-hub', goTo: 'advisorCard' } },
      { key: 'dash-hidup-seimbang', label: 'Skor Hidup Seimbang', desc: 'Dana Darurat, DSR, No-Spend, kerja-istirahat', target: { page: 'dashboard-hub', goTo: 'lifeBalanceCard' } },
      { key: 'dash-refleksi', label: 'Refleksi & Self-Care', desc: 'Jurnal syukur & checklist harian', target: { page: 'dashboard-hub', dashKey: 'refleksi', goTo: 'refleksiCard' } },
      { key: 'dash-laporan-mini', label: 'Ringkasan Laporan Bulan Ini', desc: 'Pemasukan/pengeluaran bulan berjalan', target: { page: 'dashboard', dashKey: 'laporanMini', goTo: 'dashLaporanMiniCard' } },
      { key: 'dash-fi', label: 'Kebebasan Finansial (FI)', desc: 'Progres menuju financial independence', target: { page: 'dashboard-hub', dashKey: 'fi', goTo: 'dashFiCard' } },
    ],
  },
  {
    key: 'keuangan',
    label: 'Keuangan',
    icon: '💰',
    desc: 'Uang masuk/keluar, rencana, dan laporan',
    target: { page: 'keuangan' },
    navIdx: 1,
    features: [
      { key: 'keu-transaksi', label: 'Transaksi (Masuk/Keluar/Transfer)', desc: 'Catat pemasukan, pengeluaran, transfer akun', target: { page: 'keuangan', tab: 'kelola', action: 'openTxModal' } },
      { key: 'keu-saldo-akun', label: 'Saldo Akun', desc: 'Saldo tiap akun cash/bank/e-wallet', target: { page: 'keuangan', tab: 'laporan', goTo: 'lapAccList' } },
      { key: 'keu-anggaran', label: 'Anggaran Bulan Ini', desc: 'Batas & pemakaian anggaran per kategori', target: { page: 'keuangan', tab: 'kelola', goTo: 'budgetList' } },
      { key: 'keu-tagihan', label: 'Tagihan & Cicilan', desc: 'Tagihan, cicilan, dan langganan jatuh tempo', target: { page: 'keuangan', tab: 'kelola', goTo: 'billListKeu' } },
      { key: 'keu-target', label: 'Target Keuangan', desc: 'Target tabungan & Dana Darurat', target: { page: 'settings', group: 'stgGroup2', goTo: 'targetList' } },
      { key: 'keu-pensiun', label: 'Dana Pensiun', desc: 'Proyeksi kebutuhan & tabungan pensiun', target: { page: 'keuangan', tab: 'kelola', goTo: 'pensiunBody' } },
      { key: 'keu-grafik', label: 'Grafik 6 Bulan', desc: 'Tren income/expense 6 bulan terakhir', target: { page: 'keuangan', tab: 'laporan', goTo: 'grafikBars' } },
      { key: 'keu-cashflow', label: 'Proyeksi Arus Kas 30 Hari', desc: 'Perkiraan saldo 30 hari ke depan', target: { page: 'keuangan', tab: 'laporan', goTo: 'cfBody' } },
      { key: 'keu-laporan-kategori', label: 'Laporan per Kategori', desc: 'Rekap pengeluaran/pemasukan per kategori', target: { page: 'keuangan', tab: 'laporan', goTo: 'lapKat' } },
      { key: 'keu-export', label: 'Export', desc: 'Export laporan ke CSV/JSON/PDF/Gambar', target: { page: 'keuangan', tab: 'laporan' } },
    ],
  },
  {
    key: 'bisnis',
    label: 'Bisnis',
    icon: '🛒',
    desc: 'Operasional toko/Shop',
    navIdx: 2,
    features: [
      { key: 'shop-kasir', label: 'Kasir AI', desc: 'Checkout cepat tap produk dari grid', target: { page: 'shop', tab: 'kasir', goTo: 'kasirGrid' } },
      { key: 'shop-etalase', label: 'Etalase Produk', desc: 'Katalog produk, harga, stok', target: { page: 'shop', tab: 'etalase', goTo: 'productList' } },
      { key: 'shop-produsen', label: 'Produsen/Supplier', desc: 'Daftar pemasok produk', target: { page: 'shop', tab: 'produsen', goTo: 'produsenList' } },
      { key: 'shop-order', label: 'Order Manual', desc: 'Input transaksi jual manual', target: { page: 'shop', tab: 'jual', goTo: 'shopRecentList' } },
      { key: 'shop-pelanggan', label: 'Pelanggan', desc: 'Data & riwayat pelanggan', target: { page: 'shop', tab: 'pelanggan', goTo: 'customerList' } },
      { key: 'shop-laporan-omzet', label: 'Laporan Omzet', desc: 'Riwayat & rekap transaksi Shop', target: { page: 'shop', tab: 'riwayat', goTo: 'shopList' } },
      { key: 'shop-tren', label: 'Tren Penjualan 6 Bulan', desc: 'Grafik omzet 6 bulan terakhir', target: { page: 'shop', tab: 'riwayat', goTo: 'shopGrafikBars' } },
      { key: 'shop-reko-harga', label: 'Rekomendasi Harga Jual AI', desc: 'Saran harga jual per produk', target: { page: 'shop', tab: 'etalase', goTo: 'priceRekoWidgetList' } },
      { key: 'shop-reko-restock', label: 'Rekomendasi Restock AI', desc: 'Saran produk yang perlu di-restock', target: { page: 'shop', tab: 'etalase', goTo: 'stockRekoWidgetList' } },
      { key: 'shop-sewakios', label: 'Sewa Kios', desc: 'Unit kios disewakan & riwayat tagihan', target: { page: 'keuangan', tab: 'kelola', goTo: 'sewaKiosList' } },
      { key: 'shop-renovasi', label: 'Proyek Renovasi', desc: 'Kalkulator material & biaya renovasi', target: { page: 'keuangan', tab: 'kelola', goTo: 'renovList' } },
    ],
  },
  {
    key: 'kendaraan',
    label: 'Kendaraan',
    icon: '🚗',
    desc: 'Car Notes: pajak, BBM, servis, sparepart',
    target: { page: 'carnotes' },
    navIdx: 4,
    features: [
      { key: 'cn-pajak-sim', label: 'Pajak Kendaraan & SIM', desc: 'STNK, SPT Tahunan, SIM', target: { page: 'carnotes', goTo: 'vehTaxList' } },
      { key: 'cn-bbm', label: 'Riwayat Isi BBM', desc: 'Catatan isi BBM & konsumsi km/L', target: { page: 'carnotes', tab: 'bbm', goTo: 'bbmList' } },
      { key: 'cn-servis', label: 'Riwayat Servis', desc: 'Catatan servis & pengingat interval', target: { page: 'carnotes', tab: 'servis', goTo: 'servisList' } },
      { key: 'cn-sparepart', label: 'Sparepart', desc: 'Stok sparepart per kategori', target: { page: 'carnotes', tab: 'servis', goTo: 'stockList' } },
    ],
  },
  {
    key: 'pajak-zakat',
    label: 'Pajak & Zakat',
    icon: '🕌',
    desc: 'Kewajiban ke negara & agama',
    target: { page: 'pajak' },
    navIdx: 5,
    features: [
      { key: 'pz-zakat-penghasilan', label: 'Zakat Penghasilan (Profesi)', desc: 'Estimasi zakat profesi bulanan', target: { page: 'pajak', tab: 'zakat', goTo: 'zpStatusBox' } },
      { key: 'pz-zakat-maal', label: 'Zakat Maal', desc: 'Zakat harta & simpanan', target: { page: 'pajak', tab: 'zakat', goTo: 'zmStatusBox' } },
      { key: 'pz-zakat-fitrah', label: 'Zakat Fitrah', desc: 'Hitung zakat fitrah per jiwa', target: { page: 'pajak', tab: 'zakat', goTo: 'zfTotal' } },
      { key: 'pz-riwayat-zakat', label: 'Riwayat Pembayaran Zakat', desc: 'Catatan zakat yang sudah dibayar', target: { page: 'pajak', tab: 'zakat', goTo: 'zakatLogList' } },
      { key: 'pz-pph21', label: 'Estimasi PPh 21', desc: 'Estimasi pajak penghasilan pribadi', target: { page: 'pajak', tab: 'pajak', goTo: 'pphResultBox' } },
      { key: 'pz-pbb', label: 'PBB', desc: 'Pajak Bumi & Bangunan', target: { page: 'pajak', tab: 'pajak', goTo: 'pbbAssetPick' } },
    ],
  },
  {
    key: 'aset',
    label: 'Aset',
    icon: '📦',
    desc: 'Kekayaan di luar arus kas harian',
    navIdx: 5,
    features: [
      { key: 'aset-buku', label: 'Buku Aset & Kekayaan Bersih', desc: 'Daftar aset & total kekayaan bersih', target: { page: 'pajak', tab: 'zakat', goTo: 'assetList' } },
      { key: 'aset-histori', label: 'Histori Kekayaan & Growth Rate', desc: 'Snapshot kekayaan & CAGR', target: { page: 'pajak', tab: 'zakat', goTo: 'wealthSnapshotList' } },
      { key: 'aset-alokasi', label: 'Rekomendasi Alokasi Aset', desc: 'Saran alokasi dana sesuai profil risiko', target: { page: 'pajak', tab: 'zakat', goTo: 'aaResult' } },
      { key: 'aset-emas', label: 'Aset Emas (impor nota massal)', desc: 'Impor nota emas & rekap zakat maal emas', target: { page: 'pajak', tab: 'zakat', goTo: 'assetList', action: 'GoldImport.open' } },
    ],
  },
  {
    key: 'personal',
    label: 'Personal',
    icon: '🌱',
    desc: 'Fitur non-finansial keluarga',
    navIdx: 6,
    features: [
      { key: 'per-absensi', label: 'Absensi Harian & Kalkulator Gaji', desc: 'Absensi & estimasi gaji mingguan', target: { page: 'dashboard-hub', dashKey: 'absensi', goTo: 'dashAbsensiCard' } },
      { key: 'per-edufund', label: 'Dana Pendidikan', desc: 'Target biaya sekolah/kuliah anak', target: { page: 'settings', group: 'stgGroup2', goTo: 'eduFundList' } },
      { key: 'per-anak', label: 'Perkembangan Anak', desc: 'Milestone tumbuh kembang anak', target: { page: 'settings', group: 'stgGroup3', goTo: 'anakList' } },
      { key: 'per-worthit', label: 'Worth It? & Prioritas Belanja', desc: 'Cek layak beli & daftar prioritas belanja', target: { action: 'WorthIt.open' } },
      { key: 'per-piutang-utang', label: 'Piutang & Utang', desc: 'Catatan piutang, utang, strategi pelunasan', target: { page: 'pajak', tab: 'zakat', goTo: 'piutangList' } },
      { key: 'per-pengingat', label: 'Pengingat', desc: 'Pengingat umum keluarga', target: { page: 'settings', group: 'stgGroup3', goTo: 'reminderList' } },
    ],
  },
  {
    key: 'ai',
    label: 'AI',
    icon: '🤖',
    desc: 'Kecerdasan buatan lintas fitur',
    target: { page: 'ai' },
    navIdx: 3,
    features: [
      { key: 'ai-chat', label: 'AI Asisten (chat)', desc: 'Tanya jawab & aksi lewat chat AI', target: { page: 'ai', goTo: 'chatBox' } },
      { key: 'ai-kategorisasi', label: 'Kategorisasi Transaksi Otomatis', desc: 'Tebak kategori dari catatan bebas saat isi transaksi', target: { page: 'keuangan', tab: 'kelola', action: 'openTxModal' } },
      { key: 'ai-scan-ocr', label: 'Scan Struk/OCR', desc: 'Scan struk belanja, transfer, odometer, portofolio aset', target: { page: 'keuangan', tab: 'kelola', action: 'openTxModal' } },
    ],
  },
  {
    key: 'backup',
    label: 'Backup',
    icon: '☁️',
    desc: 'Keamanan & portabilitas data',
    target: { page: 'settings', group: 'stgGroup4' },
    navIdx: 6,
    features: [
      { key: 'bk-manual', label: 'Backup & Restore manual', desc: 'Backup/restore data lewat file', target: { page: 'settings', group: 'stgGroup4', goTo: 'restoreFileInput' } },
      { key: 'bk-gdrive', label: 'Backup Otomatis ke Google Drive', desc: 'Sinkron backup terjadwal ke Drive', target: { page: 'settings', group: 'stgGroup4', goTo: 'gdStatus' } },
      { key: 'bk-sheets', label: 'Sinkron ke Google Sheets', desc: 'Sinkron data ke Google Sheets', target: { page: 'settings', group: 'stgGroup4', goTo: 'gsStatus' } },
      { key: 'bk-export-per-fitur', label: 'Export/Import per fitur', desc: 'CSV/XLSX/JSON per modul (Aset, Shop, Keuangan, Car Notes)', target: { page: 'settings', group: 'stgGroup4' } },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: '⚙️',
    desc: 'Konfigurasi aplikasi murni',
    target: { page: 'settings' },
    navIdx: 6,
    features: [
      { key: 'stg-profil', label: 'Profil', desc: 'Nama, gaji, kiriman, data pribadi', target: { page: 'settings', group: 'stgGroup1', goTo: 'sNama' } },
      { key: 'stg-tema', label: 'Tema Tampilan', desc: 'Ganti tema warna aplikasi', target: { page: 'settings', group: 'stgGroup1', goTo: 'themeGrid' } },
      { key: 'stg-akun', label: 'Akun & Metode Pembayaran', desc: 'Kelola akun cash/bank/e-wallet', target: { page: 'settings', group: 'stgGroup2', goTo: 'accGrid' } },
      { key: 'stg-lanjutan', label: 'Pengaturan Lanjutan per Fitur', desc: 'Pengaturan mendalam per modul', target: { page: 'settings', group: 'stgGroup2' } },
      { key: 'stg-keamanan', label: 'Keamanan (PIN)', desc: 'Ganti PIN & pengaturan keamanan lain', target: { page: 'settings', group: 'stgGroup5' } },
      { key: 'stg-storage', label: 'Kapasitas Penyimpanan HP', desc: 'Estimasi & rincian pemakaian storage', target: { page: 'settings', group: 'stgGroup4', goTo: 'storageOverallBar' } },
      { key: 'stg-debug', label: 'Debug Console', desc: 'Aktifkan panel debug pihak ketiga (eruda)', target: { page: 'settings', group: 'stgGroup6', goTo: 'btnToggleDebugConsole' } },
      { key: 'stg-selftest', label: 'Tes Otomatis/Self-test', desc: 'Jalankan self-test internal aplikasi', target: { page: 'settings', group: 'stgGroup6', goTo: 'selfTestResults' } },
      { key: 'stg-diagnostik-versi', label: 'Diagnostik Versi', desc: 'Status sinkron versi produksi vs modul', target: { page: 'settings', group: 'stgGroup6', goTo: 'aboutProdSyncStatus' } },
      { key: 'stg-about', label: 'Tentang Aplikasi', desc: 'Versi build & informasi aplikasi', target: { page: 'settings', group: 'stgGroup6', goTo: 'aboutBuildVersion' } },
    ],
  },
];
