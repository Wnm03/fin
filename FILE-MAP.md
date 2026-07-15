# FILE-MAP.md — peta file & fungsi global (AUTO-GENERATED, JANGAN EDIT MANUAL)

> Di-generate otomatis oleh `node scripts/generate-file-map.js` — dipanggil
> juga otomatis di akhir setiap `node build.js` yang sukses, jadi peta ini
> SELALU sinkron dengan source terbaru. Kalau kamu (manusia atau Claude sesi
> lain) mau tahu "fungsi X ada di file mana" atau "file Y isinya apa", cek di
> sini dulu SEBELUM grep manual ke puluhan file — jauh lebih cepat & akurat
> daripada dokumen prosa manual (yang gampang basi, lihat `archive/`).
>
> Kalau file ini kelihatan tidak sinkron dengan source (mis. abis rename/split
> file tapi lupa `node build.js`), jalankan ulang generatornya, JANGAN diedit
> tangan — editan manual bakal ketimpa lagi di build berikutnya.

Terakhir digenerate: 2026-07-15T06:51:24.226Z
Total file source: 87 · Total identifier global: 974

## 1. Urutan load & ringkasan tiap file

Urutan sesuai `GROUP_A`+`GROUP_B` di `build.js` (urutan ini yang dipakai
bundler menggabungkan semua file jadi `app-bundle-a.min.js`/`app-bundle-b.min.js`).

| # | File | Baris | Ringkasan |
|---|------|------:|-----------|
| 1 | `modules-render.js` | 1401 | Fungsi render (85 fungsi) dipisah dari app_production.html untuk pemerataan ukuran file. Semua fungsi ini murni definisi function global (bukan module), jadi tetap bisa dipanggil dari file manapun yang loadnya … |
| 2 | `modals.js` | 7 | Modal HTML dipisah dari app_production.html untuk pemerataan ukuran file. Setiap elemen array persis sama dengan blok <div class="overlay" id="...">...</div> aslinya, di-inject balik ke posisi yang sama persis via … |
| 3 | `modules-calc.js` | 859 | _(tidak ada komentar header)_ |
| 4 | `cobek-etalase.js` | 368 | Domain Shop bagian Etalase: katalog produk (tambah/edit/hapus, size-pairing bracket harga, bundle, modal stok tertanam), stok, & produsen terkait produk. Dipecah dari cobek.js (2026-07-12, file lama 1966 baris > 500 … |
| 5 | `cobek-pricing.js` | 502 | Domain Shop bagian rekomendasi harga & ongkir: PriceReko (kalkulator harga jual AI), OngkirCalc (kalkulator ongkos kirim), PriceRekoWidget & StockRekoWidget (widget dashboard rule-based). Bagian ke-2 dari 5 hasil … |
| 6 | `cobek-order.js` | 459 | Domain Shop bagian order & pelanggan: Produsen (supplier), SiapPulang (status siap diambil/dikirim), Order (order pelanggan), Laporan (omzet), Pelanggan (data & riwayat pelanggan). Bagian ke-3 dari 5 hasil pemecahan … |
| 7 | `cobek-tx-cart.js` | 371 | Domain Shop bagian integrasi form Transaksi: cart Stok Masuk & Penjualan Shop pada form Transaksi gabungan (populate/onChange/toggle/add/remove/sync/apply), termasuk applyBundleLinkedStock & recordShopSale. Bagian ke-4 … |
| 8 | `cobek-io.js` | 458 | Domain Shop bagian impor/ekspor: ImportKatalog (impor massal produk+harga dari teks), wrapper tab/tombol UI ringan, ShopExport (ekspor XLSX), ImportShopExcel (impor dari file Excel). Bagian ke-5 (terakhir) dari 5 hasil … |
| 9 | `kasir.js` | 331 | Modul "🧠 Kasir AI" (v127, kw81-kasir-ai-pos): Tab checkout BARU utk halaman Bisnis Shop yang lebih cepat dari form "Transaksi Manual" (Order) lama: tap produk langsung dari grid (bukan pilih dari dropdown lalu klik "+ … |
| 10 | `piutang-utang.js` | 352 | Domain Piutang & Utang: catatan piutang (uang dipinjamkan), utang (uang dipinjam) beserta status lunas/cicilan, dan DebtStrategy (simulasi strategi pelunasan Avalanche/Snowball). Juga berisi Bill (helper hubungkan … |
| 11 | `pajak-pbb-zakat.js` | 343 | Kalkulator Pajak Bumi & Bangunan (PBB), Zakat (penghasilan, maal, fitrah), Referensi AI (cek harga emas/nisab via AI), Pajak UMKM, dan PPh 21 (Orang Pribadi) Dipisah dari: features-renovasi-pajak-aset-order.js (PBB, … |
| 12 | `features-budget-laporan-carnotes-pelanggan.js` | 1502 | Budget & laporan keuangan, Car Notes (BBM/servis/torsi baut), aksi AI chat, data pelanggan PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: … |
| 13 | `edukasi-dana.js` | 174 | Dana Pendidikan (EduFund): kalkulator target biaya sekolah/kuliah & nabung/bulan CATATAN: modul EduFund dipindah ke file baru ini dari features-edukasi-pajak-utang-sewakios.js (v60). EduFund.checkAI() masih memanggil … |
| 14 | `sewakios.js` | 243 | Domain Sewa Kios: catat unit kios yang disewakan, riwayat tagihan sewa, ROI vs modal renovasi, laporan PDF. Dipisah dari: features-edukasi-pajak-utang-sewakios.js (lanjutan roadmap PEMISAHAN-FILE-ROADMAP.md, v58). … |
| 15 | `hidup-seimbang.js` | 219 | Domain Skor Hidup Seimbang: skor gabungan dari Dana Darurat, DSR cicilan, No-Spend 30 hari, & keseimbangan kerja-istirahat, plus riwayat snapshot bulanan. Dipisah dari: features-edukasi-pajak-utang-sewakios.js (lanjutan … |
| 16 | `linktx.js` | 245 | Transaksi tertaut (LinkTx): hubungkan transaksi lama di Keuangan ke Renov/Wishlist/Bill CATATAN: modul LinkTx dipindah ke file baru ini dari features-edukasi-pajak-utang-sewakios.js (v61). File lama … |
| 17 | `renovasi.js` | 438 | Domain Proyek Renovasi: RenovCalc (kalkulator material), Renov (proyek & item biaya), RenovAI (saran AI kebutuhan/ukuran) CATATAN: modul-modul ini dipindah ke file baru ini dari features-renovasi-pajak-aset-order.js … |
| 18 | `aset.js` | 446 | Domain Aset & Kekayaan: ALOKASI_PRESETS/AlokasiAset (rekomendasi alokasi dana), Aset (Buku Aset & Kekayaan Bersih), IDBStore (helper generik penyimpanan IndexedDB), PORTFOLIO_LABELS, TimelineW (timeline tujuan keuangan) … |
| 19 | `invest-ai-widget.js` | 178 | Widget "🤖 Rekomendasi AI" otomatis di kartu 🧭 Rekomendasi Alokasi Aset (aset.js: AlokasiAset.renderOne(), target #aaResult, halaman Pajak & Zakat / tab Zakat). MODUL BARU — tidak mengubah satu baris pun logic … |
| 20 | `aset-emas-impor.js` | 392 | FITUR BARU: GoldImport (impor massal nota emas via paste teks ATAU upload file .xlsx rekap nota) & GoldZakat (rekap emas utk zakat maal + analisa harga/gram & untung-rugi). CARA PASANG (lihat juga INTEGRASI-EMAS.md): 1. … |
| 21 | `worthit.js` | 468 | Domain Worth It? & Prioritas Belanja: cek kondisi keuangan sebelum belanja + daftar prioritas barang yang mau dibeli CATATAN: modul WorthIt dipindah ke file baru ini dari features-renovasi-pajak-aset-order.js (v62). … |
| 22 | `data-default.js` | 36 | Domain Data Default: kategori shop bawaan (DEFAULT_COBEK_KATEGORI), akun keuangan bawaan (DEFAULT_ACCOUNTS), kategori sparepart kendaraan bawaan (DEFAULT_SPAREPARTS). PENTING: file ini HARUS dimuat SEBELUM … |
| 23 | `features-helpers-global-security.js` | 469 | Helper global (migrasi data, state D, save/load, event dispatcher) CATATAN: 3 konstanta default (DEFAULT_COBEK_KATEGORI/DEFAULT_ACCOUNTS/DEFAULT_SPAREPARTS) dipindah ke data-default.js (v79) — file itu HARUS dimuat … |
| 24 | `diagnostik-versi.js` | 77 | Domain Diagnostik & Sinkronisasi Versi: snapshot HTML utk self-test (getHtmlSnapshotForSelfTest), cek status sinkron versi produksi vs master (computeProductionSyncStatus), cek status sinkron versi antar file modul … |
| 25 | `format-tema.js` | 34 | Domain Format Angka & Tema: format rupiah singkat (fmt, mis. "Rp 1.5 jt"), format rupiah penuh (fmtFull/fmtFullSigned), notifikasi toast di bawah layar (toast), dan ganti/terapkan tema warna app termasuk mode "auto" … |
| 26 | `error-handler.js` | 38 | Domain Error Handler Global: tangkap error tak tertangani (uncaught error & unhandled promise rejection) di seluruh app, catat ke console utk debugging, dan tampilkan toast singkat yang ramah ke pengguna (dibatasi … |
| 27 | `helper-teks.js` | 25 | Domain Helper Teks & Kalender: escape karakter HTML berbahaya biar aman dimasukkan ke innerHTML (escapeHtml), daftar nama bulan singkat & lengkap dalam Bahasa Indonesia (MONTHS/MONTHS_FULL) utk format tanggal. Dipindah … |
| 28 | `keamanan-pin.js` | 205 | Domain Keamanan: layar PIN (showPinScreen/checkPin/pinPress/pinBack/updatePinDots), lockout percobaan PIN salah (PIN_MAX_ATTEMPTS/PIN_LOCK_DURATIONS_SEC/updatePinLockUI/dst), ganti PIN (gantiPin), dan enkripsi API key … |
| 29 | `refleksi-selfcare.js` | 255 | Domain Refleksi & Self-Care: Jurnal Syukur, Checklist Self-Care harian (dgn hitung konsisten berturut-turut), & Catatan Privat terenkripsi (pakai PIN aplikasi, skema kripto sama dgn … |
| 30 | `modal-navigasi.js` | 312 | Domain Modal Generik & Navigasi Halaman: modal konfirmasi/prompt/pilihan/info/pin (askConfirm/showPromptModal/showChoiceModal/showAlertModal/showPinPromptModal & pasangan _xxxAnswer/_xxxSubmit-nya), buka/tutup modal & … |
| 31 | `reset-gaji-mingguan.js` | 102 | Domain Reset Gaji Mingguan: hitung rentang minggu berjalan (getWeekRange), deteksi & tawarkan reset absensi tiap Sabtu (checkWeeklySalaryReset), buka modal reset manual (openWeeklyResetManual), dan proses konfirmasi … |
| 32 | `debug-console.js` | 49 | Domain Debug Console: toggle tombol status (updateDebugConsoleBtn) & aktifkan/matikan panel debug pihak ketiga "eruda" (toggleDebugConsole), termasuk lazy-load skrip eruda dari CDN kalau belum pernah dipakai. Dipindah … |
| 33 | `pengaturan-search.js` | 73 | Domain Pencarian Pengaturan: buka/tutup grup pengaturan (toggleStgGroup), cari & sorot kartu pengaturan yang cocok teks pencarian (stgSearch), dan dukungan keyboard (Enter/Spasi) utk buka grup pengaturan lewat kepala … |
| 34 | `onboarding.js` | 41 | Domain Onboarding: preview perkiraan kasar gaji/kiriman saat setup awal (updateOnboardPreview) & proses selesai onboarding — simpan profil awal + PIN (finishOnboard). Dipindah dari features-helpers-global-security.js … |
| 35 | `kalkulator-input.js` | 141 | Kalkulator ekspresi angka: parser aman (safeCalc), popup kalkulator (openCalc/calcPress/dst), dan preview nilai input jumlah (calcPreviewValue/updateAmtPreview/evalAmtExpr). Dipindah dari … |
| 36 | `scan-ocr.js` | 764 | Scan struk belanja (OCR): struk belanja, bukti transfer, tanggal dari foto, odometer, portofolio aset, kategori & sparepart otomatis dari struk Domain terakhir hasil pembedahan features-filter-scanstruk-ocr.js (v84-v87 … |
| 37 | `filter-laporan.js` | 221 | Filter transaksi/keuangan (panel filter Keuangan & Laporan), pencarian, paginasi list transaksi, navigasi antar-list (goToList/showFilteredTx) PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) … |
| 38 | `akun.js` | 112 | Kelola Akun (Cash/Bank/Ewallet dll): saldo, filter dropdown akun di seluruh app, CRUD akun PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: … |
| 39 | `gaji-calc.js` | 45 | Kalkulator gaji harian/borongan (Tukang & karyawan lepas), catat sbg pemasukan PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: … |
| 40 | `cicilan.js` | 113 | logika form Cicilan pada txModal (Tambah/Edit Transaksi Keuangan). Dipisah dari transaksi.js (2026-07-11, lihat CLAUDE.md catatan kerja "split transaksi.js") murni sebagai pengelompokan ulang file, BUKAN perubahan … |
| 41 | `tx-bbm.js` | 93 | logika panel "Sinkron ke Catatan Mobil (BBM)" pada txModal (Tambah/Edit Transaksi Keuangan). Dipisah dari transaksi.js (2026-07-11, lihat CLAUDE.md catatan kerja "split transaksi.js" bagian ke-6) murni sebagai … |
| 42 | `tx-stok-sparepart.js` | 73 | logika panel "Tambah ke Stok Sparepart juga?" pada txModal (Tambah/Edit Transaksi Keuangan). Dipisah dari transaksi.js (2026-07-11, lihat CLAUDE.md catatan kerja "split transaksi.js" bagian ke-7) murni sebagai … |
| 43 | `tx-transfer.js` | 33 | logika modal "⇄ Transfer Antar Akun" (transferModal). Dipisah dari transaksi.js (2026-07-11, lihat CLAUDE.md catatan kerja "split transaksi.js" bagian ke-8) murni sebagai pengelompokan ulang file, BUKAN perubahan … |
| 44 | `tx-cobek.js` | 29 | domain "Stok/Penjualan Shop (Shop)" pada form Transaksi. Dipindah dari transaksi.js (lihat CLAUDE.md catatan kerja "split transaksi.js" bagian ke-9) -- tetap fungsi global, tetap dipanggil persis sama dari sini … |
| 45 | `tx-target.js` | 68 | domain "Target Tabungan" (modal tambah target, deteksi Dana Darurat, simpan, lihat transaksi akun terkait, tambah/hapus progres). Dipindah dari transaksi.js (lihat CLAUDE.md catatan kerja "split transaksi.js" bagian … |
| 46 | `tx-list-cashflow.js` | 160 | domain "List Transaksi (kartu tx, hapus tx), filter periode Keuangan/Laporan, & Cashflow Forecast". Dipindah dari transaksi.js (lihat CLAUDE.md catatan kerja "split transaksi.js" bagian ke-11 -- lanjutan bagian … |
| 47 | `transaksi.js` | 745 | Form Tambah/Edit Transaksi Keuangan: autocomplete kategori/produk, panel kendaraan (BBM/sparepart/stok shop), target Dana Darurat, catatan/reminder/ transfer, dan simpan transaksi (saveTx) — mesin utama halaman … |
| 48 | `profil-pengaturan.js` | 82 | Profil pengguna di Pengaturan: auto-save profil, status PTKP (kawin/tanggungan/pekerjaan) utk estimasi PPh21, preview usia, hint API key AI PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena … |
| 49 | `kategori.js` | 168 | Modal Kategori & Subkategori (tambah/edit/hapus, filter tampilan) PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: data-default.js, … |
| 50 | `kategorisasi-ai.js` | 186 | AI Auto-Kategorisasi Transaksi dari Catatan Bebas FITUR BARU: saat user mengetik Keterangan transaksi bebas di Input Transaksi (mis. "bayar galon+beras warung"), modul ini menebak Kategori & Subkategori yang paling … |
| 51 | `tagihan-kalender.js` | 444 | Modul Tagihan/Bill (CRUD, riwayat, filter, arsip) & Kalender Jatuh Tempo PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: data-default.js, … |
| 52 | `backup-restore.js` | 719 | Export/import/backup data (satu domain penuh: CSV/JSON export laporan, backup terjadwal & manual per-modul, restore dari file backup, import dari Cashew/CSV lain, import Car Notes) (v89): blok "deteksi item checkout … |
| 53 | `payroll-absensi.js` | 449 | Payroll: Absensi Harian & Kalkulator Gaji Mingguan (const Payroll={...}) (v93): dipindah dari backup-restore.js — domain ini sudah rapi sbg 1 objek modul (mirip LinkTx/Renov/Aset), jadi dipisah jadi file domain sendiri, … |
| 54 | `tukang-absensi.js` | 678 | Domain Tukang (absensi/payroll harian & borongan) ONLY. CATATAN [2026-07-12]: File ini dulu bernama features-tukang-kendaraan-storage.js dan asalnya campuran 5 domain (lihat riwayat lengkap di … |
| 55 | `vehicle-core.js` | 454 | Domain Vehicle core: CRUD kendaraan, KM (log & estimasi konsumsi/rp-per-km), Pajak Kendaraan (STNK tahunan/5-tahunan + SPT Tahunan pribadi), SIM, proactive reminders (dashboard), dan Car Notes tab (filter periode, edit … |
| 56 | `chat-action.js` | 62 | Parsing & UI blok [[ACTION]] dari balasan AI Chat (RefAI), murni ekstraksi/format teks, TIDAK terkait domain kendaraan/sparepart/storage sama sekali. Dipisah dari tukang-absensi.js (2026-07-12, roadmap split file besar … |
| 57 | `data-archive.js` | 161 | Storage usage estimate & Archive (export lalu hapus data lama per tahun). Dipisah dari tukang-absensi.js (2026-07-12, roadmap split file besar bagian ke-2) murni pengelompokan ulang file, BUKAN perubahan perilaku. … |
| 58 | `sparepart-servis.js` | 520 | Domain Sparepart & Servis kendaraan: kategori & stok sparepart (Sparepart), catatan servis (wrapper ke Servis di features-budget-laporan-carnotes-pelanggan.js), interval servis per-kategori & override per-kendaraan, … |
| 59 | `features-aiwidget-reminder-gdrive-search.js` | 1616 | Reminder, hari kerja, kendaraan (pajak/SIM/servis/BBM/sparepart), storage & arsip, skema Google Sheets (SHEETS_SCHEMAS/SHEETS_MODULES) CATATAN: SHEETS_SCHEMAS dipindah dari features-edukasi-pajak-utang-sewakios.js (v57) … |
| 60 | `features-sheets-pwa-selftest.js` | 2390 | Settings, notifikasi, PWA setup, self-test/smoke-test rendering, pajak/zakat/aset/utang PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: … |
| 61 | `dashboard-hub-registry.js` | 223 | FEATURE_REGISTRY: sumber data tunggal taksonomi Dashboard Feature Hub (blueprint-dashboard-hub.md §1 & §7, Tahap 0). PENTING — file ini MURNI DATA, tidak ada logic render/navigasi apa pun. Tahap 0 blueprint: "Finalisasi … |
| 62 | `dashboard-hub.js` | 383 | Dashboard Feature Hub (blueprint-dashboard-hub.md §5) STATUS (update v1.0-stabilization, build v234): sejak Tahap 4, halaman ini SUDAH jadi landing page default (satu-satunya class="page active" saat startup, lihat … |
| 63 | `dashboard-hub-search.js` | 127 | Feature Search: cari FITUR/MENU (bukan data transaksi) lintas kategori FEATURE_REGISTRY (blueprint-dashboard-hub.md §2 & §6). Berbeda tujuan dari Global Search existing (`openGlobalSearch`) yang mencari DATA milik user … |
| 64 | `dashboard-hub-favorit.js` | 38 | Favorit (Tahap 3, Langkah 6): storage + service MURNI (ADR-001 §3/§4/§5, blueprint Favorit final). Tidak ada DOM/render di file ini — itu ada di dashboard-hub-favorit-view.js (Langkah 7-8, sudah diimplementasikan; lihat … |
| 65 | `dashboard-hub-favorit-view.js` | 112 | Favorit (Tahap 3, Langkah 7-8): render + toggle button wiring. Sengaja file TERPISAH dari dashboard-hub-favorit.js (storage murni, Langkah 6) supaya guard test "window.DashboardHubFavorit HANYA mengekspos getFavoritKeys … |
| 66 | `ai-command-center.js` | 141 | Sprint 3 Tahap 3.1: AI Command Center Foundation. SCOPE Tahap 3.1 (Foundation SAJA): Menyediakan satu registry netral tempat modul lain (Tahap 3.2+) MENDAFTARKAN "command" AI (aksi yang bisa dijalankan lewat command … |
| 67 | `self-reward-engine.js` | 215 | Domain Self Reward Engine: cek kelayakan self reward berdasarkan kondisi finansial (Budget, Cashflow, Dana Darurat, Target Investasi, Utang Macet, Tagihan). MODUL BARU — tidak mengubah API/modul yang sudah ada; hanya … |
| 68 | `self-reward-view.js` | 219 | UI layer untuk Self Reward Engine. Memisahkan render/DOM dari logic MURNI di self-reward-engine.js (lihat catatan di kepala file itu: "Tidak ada DOM/render di file ini... taruh di file terpisah, pola sama dgn … |
| 69 | `self-reward-ai-widget.js` | 234 | Widget Rekomendasi AI di dalam modal Self Reward. MODUL BARU — tidak mengubah API/behavior self-reward-engine.js maupun self-reward-view.js yang sudah ada; file ini HANYA menambah satu section baru ("🤖 Rekomendasi AI") … |
| 70 | `investasi.js` | 307 | Domain Investment: Portfolio, Dividend, Capital Gain/Loss, ROI, Asset Allocation, Watchlist, Riwayat Transaksi. MODUL BARU — tidak mengubah API/modul yang sudah ada; hanya MEMBACA/MENULIS D.investments/D.investmentTx/ … |
| 71 | `lifeos/lifeos-store.js` | 51 | SATU-SATUNYA tempat Life OS boleh MENULIS. ATURAN WAJIB: - Tidak pernah menyentuh D. Tidak ada property baru di D, tidak ada perubahan struktur D sedikit pun. - Tidak pernah memanggil save() milik D. - Persist lewat … |
| 72 | `lifeos/lifeos-registry.js` | 55 | taksonomi FUNGSIONAL Life OS (beda dari FEATURE_REGISTRY yang taksonomi NAVIGASI — keduanya sengaja terpisah, lihat personal-life-os-blueprint.md Langkah 1). PENTING: file ini MURNI DATA. Tidak ada logic, tidak ada … |
| 73 | `lifeos/lifeos-link-registry.js` | 25 | relasi implisit-by-convention di D dibuat eksplisit di SATU tempat (Gap #9, personal-life-os-blueprint.md). PENTING: murni data deklaratif. `match`/lookup di sini hanya MEMBACA D — tidak pernah menulis. Dikonsumsi oleh … |
| 74 | `lifeos/adapters/goal-adapter.js` | 46 | adapters/goal-adapter.js — READ-ONLY. Menyeragamkan 6 sumber goal lama (D.targets, D.eduFunds, D.pensiun, D.finansialFreedom, D.wishlist, D.debtStrategy) jadi satu bentuk "goal card". Tidak menyimpan apa pun, dihitung … |
| 75 | `lifeos/adapters/project-adapter.js` | 30 | adapters/project-adapter.js — merge READ-ONLY antara dua sumber: 1. D.renovProjects (legacy, milik renovasi.js — tidak disentuh) 2. LifeOSStore.projects (generic, milik Life OS — lihat services/project-service.js untuk … |
| 76 | `lifeos/adapters/today-adapter.js` | 34 | adapters/today-adapter.js — READ-ONLY. TODAY bukan penyimpanan sendiri, cuma lensa waktu di atas AREAS/PROJECTS/GOALS (lihat personal-life-os-blueprint.md Langkah 2). Depends on: lifeos-registry.js … |
| 77 | `lifeos/adapters/review-adapter.js` | 26 | adapters/review-adapter.js — READ-ONLY. Menggabungkan histori pasif existing (D.wealthSnapshots, D.lifeBalanceSnapshots, D.assetAllocation) dengan sesi review Life OS sendiri (LifeOSStore.reviewLog). Tidak pernah … |
| 78 | `lifeos/adapters/knowledge-adapter.js` | 20 | adapters/knowledge-adapter.js — READ-ONLY. D.catatan (catatan privat manual, milik keamanan-pin.js/refleksi-selfcare.js dll) dibaca sebagai REFERENSI saja — Knowledge base Life OS yang sebenarnya (insight AI tersimpan) … |
| 79 | `lifeos/services/project-service.js` | 48 | services/project-service.js — SATU-SATUNYA tempat menulis LifeOSStore.projects (generic project). Tidak pernah menulis ke D.renovProjects atau array D.* lain — kalau butuh baca renovasi, pakai … |
| 80 | `lifeos/services/review-service.js` | 34 | services/review-service.js — SATU-SATUNYA tempat menulis LifeOSStore.reviewLog. Boleh MEMBACA D.wealthSnapshots/ D.lifeBalanceSnapshots (lewat adapters/review-adapter.js) untuk menyimpan referensi id-nya, tapi tidak … |
| 81 | `lifeos/services/knowledge-service.js` | 29 | services/knowledge-service.js — SATU-SATUNYA tempat menulis LifeOSStore.knowledge. Tidak pernah menulis ke D.catatan — kalau butuh baca catatan lama, pakai adapters/knowledge-adapter.js (knowledgeAdapterCatatanRef). |
| 82 | `lifeos/ui/lifeos-home.js` | 80 | ui/lifeos-home.js — halaman masuk Life OS. Hanya membaca lewat adapter, menulis (kalau ada aksi) hanya lewat services/*.js. Tidak pernah akses D atau LifeOSStore langsung dari file UI — selalu lewat adapter/service. … |
| 83 | `lifeos/ui/today.js` | 20 | ui/today.js — render-only lewat todayAdapterList(D). Aksi "selesaikan" tetap dispatch ke fungsi modul LAMA (mis. dismiss bill), Life OS tidak menduplikasi logic itu. |
| 84 | `lifeos/ui/goals.js` | 23 | ui/goals.js — render-only lewat goalAdapterList(D). Tidak ada goal-service.js karena Goals tidak punya data tulis sendiri di Life OS (murni agregasi 6 sumber lama, lihat Gap #2). Aksi "tambah tabungan" dsb tetap … |
| 85 | `lifeos/ui/projects.js` | 33 | ui/projects.js — render lewat projectAdapterList(D, store); aksi tulis (create/toggle checklist/dsb) HANYA lewat services/project-service.js. |
| 86 | `lifeos/ui/review.js` | 32 | ui/review.js — render lewat review-adapter.js; aksi mulai/selesai sesi review HANYA lewat services/review-service.js. |
| 87 | `lifeos/ui/knowledge.js` | 43 | ui/knowledge.js — render lewat knowledge-adapter.js; aksi simpan/hapus HANYA lewat services/knowledge-service.js. D.catatan ditampilkan sebagai referensi read-only, tidak pernah dimigrasikan ke sini. |

## 2. Index fungsi/variabel global → file (urut abjad)

Semua identifier top-level (`function`, `const`, `let`, `var`) yang
dideklarasikan langsung di level file (bukan di dalam fungsi lain) — ini yang
bisa dipanggil sebagai "global" dari file manapun lewat bundel gabungan.

| Nama | File |
|------|------|
| `_apiKeyEncSaveTimer` | `keamanan-pin.js` |
| `_b64FromBuf` | `keamanan-pin.js` |
| `_bigDataWarnShown` | `features-helpers-global-security.js` |
| `_bufFromB64` | `keamanan-pin.js` |
| `_buildSaveJson` | `features-helpers-global-security.js` |
| `_bulanIndoMap` | `scan-ocr.js` |
| `_choiceModalAnswer` | `modal-navigasi.js` |
| `_choiceModalResolve` | `modal-navigasi.js` |
| `_confirmModalAnswer` | `modal-navigasi.js` |
| `_confirmResolve` | `modal-navigasi.js` |
| `_dashHubAnalyticsMonthTx` | `dashboard-hub.js` |
| `_dashHubCallAction` | `dashboard-hub.js` |
| `_dashHubHeroMonthTx` | `dashboard-hub.js` |
| `_dashHubIsFav` | `dashboard-hub.js` |
| `_dashHubSummaryMonthTx` | `dashboard-hub.js` |
| `_deriveApiKeyCryptoKey` | `keamanan-pin.js` |
| `_formatLockDuration` | `keamanan-pin.js` |
| `_friendlyErrorNotice` | `error-handler.js` |
| `_gcLastTotal` | `gaji-calc.js` |
| `_gdriveDownloadBackupInner` | `features-aiwidget-reminder-gdrive-search.js` |
| `_gdriveFindExistingBackupFileId` | `features-aiwidget-reminder-gdrive-search.js` |
| `_gdriveLocalDataLooksEmpty` | `features-aiwidget-reminder-gdrive-search.js` |
| `_gdriveSilentReconnectInProgress` | `features-aiwidget-reminder-gdrive-search.js` |
| `_globalSearchDebounce` | `features-aiwidget-reminder-gdrive-search.js` |
| `_iaEsc` | `invest-ai-widget.js` |
| `_iaFmtRp` | `invest-ai-widget.js` |
| `_infoModalAnswer` | `modal-navigasi.js` |
| `_infoModalResolve` | `modal-navigasi.js` |
| `_invSave` | `investasi.js` |
| `_invToday` | `investasi.js` |
| `_invUid` | `investasi.js` |
| `_keuFilterPrefsLoaded` | `filter-laporan.js` |
| `_lapLastFilterSig` | `filter-laporan.js` |
| `_lastErrorToastAt` | `error-handler.js` |
| `_lastModalSweepData` | `features-sheets-pwa-selftest.js` |
| `_lastNavSmokeData` | `features-sheets-pwa-selftest.js` |
| `_lastSelfTestData` | `features-sheets-pwa-selftest.js` |
| `_lastUid` | `features-helpers-global-security.js` |
| `_lifeOSLoaded` | `lifeos/lifeos-store.js` |
| `_ocrWorkerPromise` | `scan-ocr.js` |
| `_pendingChatActions` | `chat-action.js` |
| `_pinLockRemainingMs` | `keamanan-pin.js` |
| `_pinLockState` | `keamanan-pin.js` |
| `_pinLockTimer` | `keamanan-pin.js` |
| `_pinPromptAnswer` | `modal-navigasi.js` |
| `_pinPromptResolve` | `modal-navigasi.js` |
| `_pinPromptSubmit` | `modal-navigasi.js` |
| `_promptModalAnswer` | `modal-navigasi.js` |
| `_promptModalResolve` | `modal-navigasi.js` |
| `_promptModalSubmit` | `modal-navigasi.js` |
| `_repairLooseJson` | `chat-action.js` |
| `_saveAccInner` | `akun.js` |
| `_saveBillInner` | `tagihan-kalender.js` |
| `_saveDebounceTimer` | `features-helpers-global-security.js` |
| `_saveErrorShown` | `features-helpers-global-security.js` |
| `_saveGuards` | `features-helpers-global-security.js` |
| `_saveImmediate` | `features-helpers-global-security.js` |
| `_saveTxInner` | `transaksi.js` |
| `_selfTestAssert` | `features-sheets-pwa-selftest.js` |
| `_sendChatInner` | `features-aiwidget-reminder-gdrive-search.js` |
| `_sessionRawPin` | `keamanan-pin.js` |
| `_sheetsPullInner` | `features-sheets-pwa-selftest.js` |
| `_sheetsSyncInner` | `features-sheets-pwa-selftest.js` |
| `_sraiEsc` | `self-reward-ai-widget.js` |
| `_sraiFmtRp` | `self-reward-ai-widget.js` |
| `_srEsc` | `self-reward-view.js` |
| `_srFmtRp` | `self-reward-view.js` |
| `_stgSearchHighlighted` | `pengaturan-search.js` |
| `_syncNavVisibilityForModals` | `modal-navigasi.js` |
| `_txAccManuallySet` | `features-helpers-global-security.js` |
| `_txCatLearnSource` | `features-helpers-global-security.js` |
| `_txSaving` | `features-helpers-global-security.js` |
| `_uploadBackupToDriveInner` | `features-aiwidget-reminder-gdrive-search.js` |
| `_writeLocalSnapshot` | `features-helpers-global-security.js` |
| `_wrLastTotal` | `reset-gaji-mingguan.js` |
| `acBillNames` | `transaksi.js` |
| `acProductNames` | `transaksi.js` |
| `acProdusenNames` | `transaksi.js` |
| `acShopCustomers` | `cobek-tx-cart.js` |
| `acSparepartCatCodes` | `transaksi.js` |
| `acSparepartCatNames` | `transaksi.js` |
| `acSpbuNames` | `transaksi.js` |
| `acStockCodes` | `transaksi.js` |
| `acStockNames` | `transaksi.js` |
| `acTxNotes` | `transaksi.js` |
| `addNewCatFromInput` | `transaksi.js` |
| `addOrderItem` | `cobek-io.js` |
| `addShopStockCartItem` | `cobek-tx-cart.js` |
| `addTarget` | `tx-target.js` |
| `addTxShopSaleCartItem` | `cobek-tx-cart.js` |
| `addWorkDay` | `payroll-absensi.js` |
| `Advisor` | `features-aiwidget-reminder-gdrive-search.js` |
| `aggregateCustomers` | `cobek-io.js` |
| `AICommandCenter` | `ai-command-center.js` |
| `aiErrorHint` | `features-aiwidget-reminder-gdrive-search.js` |
| `aiQ` | `features-aiwidget-reminder-gdrive-search.js` |
| `AIWidget` | `features-aiwidget-reminder-gdrive-search.js` |
| `ALOKASI_PRESETS` | `aset.js` |
| `AlokasiAset` | `aset.js` |
| `API_KEY_ENC_STORAGE_KEY` | `keamanan-pin.js` |
| `API_KEY_PBKDF2_ITER` | `keamanan-pin.js` |
| `APP_BUILD_VERSION` | `features-helpers-global-security.js` |
| `applyBillFilter` | `tagihan-kalender.js` |
| `applyBundleLinkedStock` | `cobek-tx-cart.js` |
| `applyCardCollapsePrefs` | `modal-navigasi.js` |
| `applyDashHubMainGridDefaultCollapse` | `features-helpers-global-security.js` |
| `applyEffectiveTheme` | `format-tema.js` |
| `applyLastAccForCat` | `transaksi.js` |
| `applyOneCardCollapsePref` | `modal-navigasi.js` |
| `applyPriceRekoWidgetOne` | `cobek-io.js` |
| `applyQuickScan` | `scan-ocr.js` |
| `applyStockUsage` | `sparepart-servis.js` |
| `applyTxBbmFromTx` | `tx-bbm.js` |
| `applyTxShopSaleFromTx` | `cobek-tx-cart.js` |
| `applyTxShopStockFromTx` | `cobek-tx-cart.js` |
| `applyTxStockFromTx` | `tx-stok-sparepart.js` |
| `ARCHIVE_MODULES` | `data-archive.js` |
| `archiveAvailableYears` | `data-archive.js` |
| `archiveCollectByYears` | `data-archive.js` |
| `archiveExportedYears` | `data-archive.js` |
| `archiveExportStep` | `data-archive.js` |
| `archiveGetYear` | `data-archive.js` |
| `archiveSelectedYears` | `data-archive.js` |
| `Aset` | `aset.js` |
| `askConfirm` | `modal-navigasi.js` |
| `ASSET_JENIS_KEYWORDS` | `scan-ocr.js` |
| `ASSET_NAME_EXCLUDE_RE` | `scan-ocr.js` |
| `ASSET_NAME_LABEL_RE` | `scan-ocr.js` |
| `autoBudgetName` | `features-budget-laporan-carnotes-pelanggan.js` |
| `autoFillSparepartCode` | `sparepart-servis.js` |
| `autoFillStockCode` | `sparepart-servis.js` |
| `AutoKat` | `kategorisasi-ai.js` |
| `autoSaveProfile` | `profil-pengaturan.js` |
| `BACKUP_REMINDER_DATA_THRESHOLD` | `modules-render.js` |
| `BACKUP_REMINDER_DISMISS_KEY` | `modules-render.js` |
| `backupModules` | `backup-restore.js` |
| `bayarPajakKendaraan` | `vehicle-core.js` |
| `BBM` | `features-budget-laporan-carnotes-pelanggan.js` |
| `Bill` | `piutang-utang.js` |
| `BILL_ANOMALY_THRESHOLD_PCT` | `tagihan-kalender.js` |
| `BILLCAL_MAX_ITER` | `tagihan-kalender.js` |
| `billCalYear` | `tagihan-kalender.js` |
| `billFilterStatus` | `tagihan-kalender.js` |
| `Budget` | `features-budget-laporan-carnotes-pelanggan.js` |
| `budgetMatchesTx` | `features-budget-laporan-carnotes-pelanggan.js` |
| `BudgetReko` | `features-budget-laporan-carnotes-pelanggan.js` |
| `BudgetTabs` | `features-budget-laporan-carnotes-pelanggan.js` |
| `buildBackupPayload` | `backup-restore.js` |
| `buildEvaluationView` | `self-reward-view.js` |
| `buildLaporanExportData` | `features-aiwidget-reminder-gdrive-search.js` |
| `buildModalBodyHtml` | `self-reward-view.js` |
| `buildSettingsFormHtml` | `self-reward-view.js` |
| `byteSize` | `data-archive.js` |
| `calcBackspace` | `kalkulator-input.js` |
| `calcCicilanPerBulanFromTotal` | `cicilan.js` |
| `calcCicilanTotalFromPerBulan` | `cicilan.js` |
| `calcClear` | `kalkulator-input.js` |
| `calcEquals` | `kalkulator-input.js` |
| `calcGaji` | `gaji-calc.js` |
| `calcPress` | `kalkulator-input.js` |
| `calcPreviewValue` | `kalkulator-input.js` |
| `calcRenderDisplay` | `kalkulator-input.js` |
| `calcTargetId` | `kalkulator-input.js` |
| `calcUseResult` | `kalkulator-input.js` |
| `callAIProviderRaw` | `features-aiwidget-reminder-gdrive-search.js` |
| `cancelChatAction` | `features-aiwidget-reminder-gdrive-search.js` |
| `cancelChatActionEdit` | `features-aiwidget-reminder-gdrive-search.js` |
| `cancelEditWorkDay` | `payroll-absensi.js` |
| `cashflowActionSuggestion` | `tagihan-kalender.js` |
| `catLearnKey` | `scan-ocr.js` |
| `changeAbsensiWeek` | `gaji-calc.js` |
| `changeMonth` | `tx-list-cashflow.js` |
| `changeOrderQty` | `cobek-io.js` |
| `CHAT_ACTION_EDIT_FIELDS` | `features-budget-laporan-carnotes-pelanggan.js` |
| `CHAT_ACTION_HANDLERS` | `features-budget-laporan-carnotes-pelanggan.js` |
| `CHAT_ACTION_LABELS` | `features-budget-laporan-carnotes-pelanggan.js` |
| `chatActionEditFormHTML` | `features-aiwidget-reminder-gdrive-search.js` |
| `chatActionSummary` | `chat-action.js` |
| `chatInited` | `chat-action.js` |
| `checkAndFireReminders` | `features-aiwidget-reminder-gdrive-search.js` |
| `checkBills` | `tagihan-kalender.js` |
| `CHECKOUT_ADDR_RE` | `scan-ocr.js` |
| `CHECKOUT_PRICE_CUT_RE` | `scan-ocr.js` |
| `CHECKOUT_RATING_PREFIX_RE` | `scan-ocr.js` |
| `CHECKOUT_TOTAL_FALLBACK_RE` | `scan-ocr.js` |
| `CHECKOUT_TOTAL_RE` | `scan-ocr.js` |
| `CHECKOUT_UI_EXCLUDE_RE` | `scan-ocr.js` |
| `checkPin` | `keamanan-pin.js` |
| `checkWeeklySalaryReset` | `reset-gaji-mingguan.js` |
| `CICILAN_PATTERNS` | `scan-ocr.js` |
| `cicilanDateLinked` | `features-helpers-global-security.js` |
| `cicilanLastInput` | `features-helpers-global-security.js` |
| `cicilanSharedLastInput` | `features-helpers-global-security.js` |
| `cleanCatOptText` | `features-budget-laporan-carnotes-pelanggan.js` |
| `clearChat` | `features-helpers-global-security.js` |
| `closeCalc` | `kalkulator-input.js` |
| `closeModal` | `modal-navigasi.js` |
| `closeQS` | `modal-navigasi.js` |
| `CN_TAB_IDX` | `dashboard-hub.js` |
| `codeFromName` | `sparepart-servis.js` |
| `commitCurKmEdit` | `vehicle-core.js` |
| `commitGoldImport` | `aset-emas-impor.js` |
| `commitImportKatalog` | `cobek-io.js` |
| `commitImportShopExcel` | `cobek-io.js` |
| `computeCashflowForecast` | `tx-list-cashflow.js` |
| `computeFileSizeStatus` | `diagnostik-versi.js` |
| `computeModalSweepFnNames` | `features-sheets-pwa-selftest.js` |
| `computeModuleSyncStatus` | `diagnostik-versi.js` |
| `computeNavSmokePageNames` | `features-sheets-pwa-selftest.js` |
| `computeNavSmokeTestResults` | `features-sheets-pwa-selftest.js` |
| `computeOrderTotals` | `cobek-io.js` |
| `computeProductionSyncStatus` | `diagnostik-versi.js` |
| `computeSelfTestResults` | `features-sheets-pwa-selftest.js` |
| `computeTxShopSaleTotals` | `cobek-tx-cart.js` |
| `confirmChatAction` | `features-aiwidget-reminder-gdrive-search.js` |
| `confirmWeeklyReset` | `reset-gaji-mingguan.js` |
| `copyNavSmokeResults` | `features-sheets-pwa-selftest.js` |
| `copySelfTestResults` | `features-sheets-pwa-selftest.js` |
| `curBillHistoryId` | `tagihan-kalender.js` |
| `curBillType` | `features-helpers-global-security.js` |
| `curCatFilter` | `features-helpers-global-security.js` |
| `curMonth` | `features-helpers-global-security.js` |
| `curPayMethod` | `features-helpers-global-security.js` |
| `curShopStockCart` | `cobek-tx-cart.js` |
| `curTxShopSaleCart` | `cobek-tx-cart.js` |
| `curTxType` | `features-helpers-global-security.js` |
| `curVehicleId` | `features-helpers-global-security.js` |
| `customerKey` | `cobek-io.js` |
| `D` | `features-helpers-global-security.js` |
| `DanaDaruratAI` | `modules-calc.js` |
| `DASH_CARD_BY_KEY` | `modules-render.js` |
| `DASH_CARD_DEFS` | `modules-render.js` |
| `DASH_RENDER_ORDER` | `modules-render.js` |
| `DashboardHub` | `dashboard-hub.js` |
| `DashboardHubAnalytics` | `dashboard-hub.js` |
| `DashboardHubFavoritView` | `dashboard-hub-favorit-view.js` |
| `DashboardHubHero` | `dashboard-hub.js` |
| `DashboardHubSearch` | `dashboard-hub-search.js` |
| `DashboardHubSummary` | `dashboard-hub.js` |
| `dashHubNavigateToFeature` | `dashboard-hub.js` |
| `dashHubSearchFeatures` | `dashboard-hub-search.js` |
| `dashServisVehFilter` | `sparepart-servis.js` |
| `DATA_MIGRATIONS` | `features-helpers-global-security.js` |
| `dateStatusBadge` | `vehicle-core.js` |
| `dateToISO` | `helper-teks.js` |
| `daysUntilDate` | `vehicle-core.js` |
| `Debt` | `piutang-utang.js` |
| `DebtStrategy` | `piutang-utang.js` |
| `decryptApiKeyWithPin` | `keamanan-pin.js` |
| `DEFAULT_ACCOUNTS` | `data-default.js` |
| `DEFAULT_CATS` | `renovasi.js` |
| `DEFAULT_COBEK_KATEGORI` | `data-default.js` |
| `DEFAULT_SPAREPARTS` | `data-default.js` |
| `delAcc` | `akun.js` |
| `delBbm` | `vehicle-core.js` |
| `delBill` | `tagihan-kalender.js` |
| `delCat` | `kategori.js` |
| `delCatFromModal` | `kategori.js` |
| `deleteBbmFromModal` | `vehicle-core.js` |
| `deleteBillHistoryTx` | `tagihan-kalender.js` |
| `deleteBudget` | `features-budget-laporan-carnotes-pelanggan.js` |
| `deleteServisFromModal` | `sparepart-servis.js` |
| `deleteTxFromModal` | `transaksi.js` |
| `delProduct` | `cobek-tx-cart.js` |
| `delProdusen` | `cobek-io.js` |
| `delReminder` | `transaksi.js` |
| `delServis` | `sparepart-servis.js` |
| `delShop` | `cobek-io.js` |
| `delSim` | `vehicle-core.js` |
| `delSparepart` | `sparepart-servis.js` |
| `delStock` | `sparepart-servis.js` |
| `delSubCat` | `kategori.js` |
| `delTarget` | `tx-target.js` |
| `delTx` | `tx-list-cashflow.js` |
| `delVehicle` | `vehicle-core.js` |
| `delWorkDay` | `payroll-absensi.js` |
| `detectPaylaterDueNextMonth` | `scan-ocr.js` |
| `dismissBackupReminder` | `modules-render.js` |
| `downscaleImage` | `scan-ocr.js` |
| `editAccIdx` | `akun.js` |
| `editBillHistoryTx` | `tagihan-kalender.js` |
| `editChatAction` | `features-aiwidget-reminder-gdrive-search.js` |
| `editSimId` | `vehicle-core.js` |
| `editSparepartFromReminder` | `sparepart-servis.js` |
| `editTx` | `transaksi.js` |
| `editVehicleInterval` | `vehicle-core.js` |
| `editVehicleIntervalOverride` | `sparepart-servis.js` |
| `editWorkDay` | `payroll-absensi.js` |
| `EduFund` | `edukasi-dana.js` |
| `enableSwipeToDismiss` | `modal-navigasi.js` |
| `encryptApiKeyWithPin` | `keamanan-pin.js` |
| `escapeHtml` | `helper-teks.js` |
| `estimateKmPerDay` | `vehicle-core.js` |
| `estimateRpPerKm` | `vehicle-core.js` |
| `estimateServiceDateISO` | `vehicle-core.js` |
| `Etalase` | `cobek-etalase.js` |
| `evalAmtExpr` | `kalkulator-input.js` |
| `exportCSV` | `backup-restore.js` |
| `exportData` | `backup-restore.js` |
| `exportJSON` | `backup-restore.js` |
| `exportLaporanImage` | `features-aiwidget-reminder-gdrive-search.js` |
| `exportLaporanPDF` | `features-aiwidget-reminder-gdrive-search.js` |
| `exportShopEtalaseXLSX` | `cobek-io.js` |
| `exportShopPelangganXLSX` | `cobek-io.js` |
| `exportShopProdusenXLSX` | `cobek-io.js` |
| `exportShopRiwayatXLSX` | `cobek-io.js` |
| `exportShopSemuaXLSX` | `cobek-io.js` |
| `EXTRA_MODAL_SWEEP_SPECS` | `features-sheets-pwa-selftest.js` |
| `extractBitgetFields` | `scan-ocr.js` |
| `extractDateFromText` | `scan-ocr.js` |
| `extractLabeledAmount` | `scan-ocr.js` |
| `extractOdometerKm` | `scan-ocr.js` |
| `extractPortfolioFields` | `scan-ocr.js` |
| `FEATURE_REGISTRY` | `dashboard-hub-registry.js` |
| `FI` | `modules-calc.js` |
| `fiAnnualExpense` | `modules-calc.js` |
| `fiAssetFund` | `modules-calc.js` |
| `fiCalcAge` | `modules-calc.js` |
| `fiEffectiveMonths` | `modules-calc.js` |
| `fiEstimateMonthsToTarget` | `modules-calc.js` |
| `fiFormatMonths` | `modules-calc.js` |
| `fiGetAssumptions` | `modules-calc.js` |
| `fiInvestmentAssetValue` | `modules-calc.js` |
| `FILE_SIZE_ACTION_BYTES` | `diagnostik-versi.js` |
| `FILE_SIZE_WARN_BYTES` | `diagnostik-versi.js` |
| `filterCat` | `kategori.js` |
| `fiMonthlySurplus` | `modules-calc.js` |
| `fiMonthsOfDataAvailable` | `modules-calc.js` |
| `FinCoach` | `modules-calc.js` |
| `findMissingAriaLabels` | `features-sheets-pwa-selftest.js` |
| `findPossibleDuplicateTx` | `scan-ocr.js` |
| `findTorsiDb` | `sparepart-servis.js` |
| `findVehicleSpec` | `sparepart-servis.js` |
| `fiNetAssetFund` | `modules-calc.js` |
| `finishOnboard` | `onboarding.js` |
| `fireNotif` | `features-aiwidget-reminder-gdrive-search.js` |
| `fiTargetNominal` | `modules-calc.js` |
| `fiTotalDebt` | `modules-calc.js` |
| `fmt` | `format-tema.js` |
| `fmtBytes` | `data-archive.js` |
| `fmtDateID` | `vehicle-core.js` |
| `fmtFull` | `format-tema.js` |
| `fmtFullSigned` | `format-tema.js` |
| `gantiPin` | `keamanan-pin.js` |
| `GDRIVE_EMAIL_SCOPE` | `features-aiwidget-reminder-gdrive-search.js` |
| `gdriveAccessToken` | `features-aiwidget-reminder-gdrive-search.js` |
| `gdriveBackupNow` | `features-aiwidget-reminder-gdrive-search.js` |
| `gdriveConnectOnly` | `features-aiwidget-reminder-gdrive-search.js` |
| `gdriveConnStatusLabel` | `features-aiwidget-reminder-gdrive-search.js` |
| `gdriveDisconnect` | `features-aiwidget-reminder-gdrive-search.js` |
| `gdriveDownloadBackup` | `features-aiwidget-reminder-gdrive-search.js` |
| `gdriveEnsureAuth` | `features-aiwidget-reminder-gdrive-search.js` |
| `gdriveFetchUserInfo` | `features-aiwidget-reminder-gdrive-search.js` |
| `gdriveHandleAuthSuccess` | `features-aiwidget-reminder-gdrive-search.js` |
| `gdriveInitTokenClient` | `features-aiwidget-reminder-gdrive-search.js` |
| `gdrivePendingAfterAuth` | `features-aiwidget-reminder-gdrive-search.js` |
| `gdriveResetTokenState` | `features-aiwidget-reminder-gdrive-search.js` |
| `gdriveRestoreNow` | `features-aiwidget-reminder-gdrive-search.js` |
| `gdriveSaveClientId` | `features-aiwidget-reminder-gdrive-search.js` |
| `gdriveThrowForFailedRes` | `features-aiwidget-reminder-gdrive-search.js` |
| `gdriveToggleAutoSync` | `features-aiwidget-reminder-gdrive-search.js` |
| `gdriveTokenClient` | `features-aiwidget-reminder-gdrive-search.js` |
| `gdriveTokenExpiresAt` | `features-aiwidget-reminder-gdrive-search.js` |
| `gdriveTokenScope` | `features-aiwidget-reminder-gdrive-search.js` |
| `gdriveTrySilentReconnectOnLoad` | `features-aiwidget-reminder-gdrive-search.js` |
| `gdriveUserEmail` | `features-aiwidget-reminder-gdrive-search.js` |
| `getAllCats` | `kategori.js` |
| `getBackupRange` | `backup-restore.js` |
| `getBillAnomalyInfo` | `tagihan-kalender.js` |
| `getBillOccurrencesInMonth` | `tagihan-kalender.js` |
| `getBillOccurrencesInRange` | `tagihan-kalender.js` |
| `getBillStats` | `tagihan-kalender.js` |
| `getBudgetEffectiveLimit` | `features-budget-laporan-carnotes-pelanggan.js` |
| `getBudgetSettings` | `features-budget-laporan-carnotes-pelanggan.js` |
| `getBudgetUsed` | `features-budget-laporan-carnotes-pelanggan.js` |
| `getCat` | `kategori.js` |
| `getCatByType` | `kategori.js` |
| `getCatInfoById` | `features-budget-laporan-carnotes-pelanggan.js` |
| `getCatNameById` | `features-budget-laporan-carnotes-pelanggan.js` |
| `getCatsByType` | `kategori.js` |
| `getCicilanSharedMine` | `cicilan.js` |
| `getCnRange` | `vehicle-core.js` |
| `getCustomerOrders` | `cobek-io.js` |
| `getEffectiveIntervalKm` | `sparepart-servis.js` |
| `getFavoritKeys` | `dashboard-hub-favorit.js` |
| `getHtmlSnapshotForSelfTest` | `diagnostik-versi.js` |
| `getKeuFilters` | `filter-laporan.js` |
| `getLaporanFilters` | `filter-laporan.js` |
| `getLastServiceKm` | `sparepart-servis.js` |
| `getLastServiceKmForCat` | `sparepart-servis.js` |
| `getOcrWorker` | `scan-ocr.js` |
| `getProactiveReminders` | `vehicle-core.js` |
| `getRange` | `tx-list-cashflow.js` |
| `getSelectedBudgetCatIds` | `features-budget-laporan-carnotes-pelanggan.js` |
| `getSelectedFiCatIds` | `modules-calc.js` |
| `getSelfTestCases` | `features-sheets-pwa-selftest.js` |
| `getShopRange` | `cobek-io.js` |
| `getTxListRange` | `tx-list-cashflow.js` |
| `getVehicleKm` | `vehicle-core.js` |
| `getWeekRange` | `reset-gaji-mingguan.js` |
| `goalAdapterFindOne` | `lifeos/adapters/goal-adapter.js` |
| `goalAdapterList` | `lifeos/adapters/goal-adapter.js` |
| `GoldImport` | `aset-emas-impor.js` |
| `GoldZakat` | `aset-emas-impor.js` |
| `goToList` | `filter-laporan.js` |
| `goToPageAndClose` | `features-aiwidget-reminder-gdrive-search.js` |
| `goToServisFromDash` | `sparepart-servis.js` |
| `guessAssetJenisFromText` | `scan-ocr.js` |
| `guessAssetNameFromText` | `scan-ocr.js` |
| `guessCategoryFromReceiptText` | `scan-ocr.js` |
| `guessCheckoutCicilan` | `scan-ocr.js` |
| `guessCheckoutItemName` | `scan-ocr.js` |
| `guessCheckoutPrices` | `scan-ocr.js` |
| `guessCheckoutTotalTagihan` | `scan-ocr.js` |
| `guessCryptoSymbolFromText` | `scan-ocr.js` |
| `guessSparepartFromReceiptText` | `scan-ocr.js` |
| `guessTransferNameFromText` | `scan-ocr.js` |
| `guessWorthItCategory` | `scan-ocr.js` |
| `hashPin` | `keamanan-pin.js` |
| `hasIntervalOverride` | `sparepart-servis.js` |
| `hideDashCardEl` | `modules-render.js` |
| `hideSuggestBox` | `transaksi.js` |
| `IDBStore` | `aset.js` |
| `ikatSimTagihan` | `vehicle-core.js` |
| `ikatSptTagihan` | `vehicle-core.js` |
| `ikatVehTaxTagihan` | `vehicle-core.js` |
| `ImportKatalog` | `cobek-io.js` |
| `ImportShopExcel` | `cobek-io.js` |
| `initChat` | `features-aiwidget-reminder-gdrive-search.js` |
| `inRange` | `backup-restore.js` |
| `InvestAI` | `invest-ai-widget.js` |
| `Investment` | `investasi.js` |
| `INVESTMENT_TYPES` | `investasi.js` |
| `isAccLinkedToAsset` | `akun.js` |
| `isBensinSubName` | `transaksi.js` |
| `isDashCardOn` | `modules-render.js` |
| `isDevMode` | `features-helpers-global-security.js` |
| `isDueSoon` | `lifeos/adapters/today-adapter.js` |
| `isKendaraanCatName` | `transaksi.js` |
| `isShopStockCatName` | `tx-cobek.js` |
| `isSparepartSubName` | `transaksi.js` |
| `jsAttrEscape` | `transaksi.js` |
| `Kasir` | `kasir.js` |
| `Kekayaan` | `modules-calc.js` |
| `KEU_TAB_IDX` | `dashboard-hub.js` |
| `knowledgeAdapterByTag` | `lifeos/adapters/knowledge-adapter.js` |
| `knowledgeAdapterCatatanRef` | `lifeos/adapters/knowledge-adapter.js` |
| `knowledgeAdapterList` | `lifeos/adapters/knowledge-adapter.js` |
| `knowledgeServiceDelete` | `lifeos/services/knowledge-service.js` |
| `knowledgeServiceSave` | `lifeos/services/knowledge-service.js` |
| `knowledgeServiceUpdateTags` | `lifeos/services/knowledge-service.js` |
| `Laporan` | `cobek-order.js` |
| `lapTxPage` | `filter-laporan.js` |
| `learnCatFromItemName` | `scan-ocr.js` |
| `LifeBalance` | `hidup-seimbang.js` |
| `LIFEOS_AREAS` | `lifeos/lifeos-registry.js` |
| `LIFEOS_GOAL_SOURCES` | `lifeos/lifeos-registry.js` |
| `LIFEOS_KNOWLEDGE_REF_SOURCE` | `lifeos/lifeos-registry.js` |
| `LIFEOS_LINK_REGISTRY` | `lifeos/lifeos-link-registry.js` |
| `LIFEOS_PROJECT_LEGACY_SOURCE` | `lifeos/lifeos-registry.js` |
| `LIFEOS_REVIEW_SOURCES` | `lifeos/lifeos-registry.js` |
| `LIFEOS_STORE_DEFAULT` | `lifeos/lifeos-store.js` |
| `LIFEOS_STORE_KEY` | `lifeos/lifeos-store.js` |
| `LIFEOS_TODAY_SOURCES` | `lifeos/lifeos-registry.js` |
| `lifeOSEnsureLoaded` | `lifeos/lifeos-store.js` |
| `lifeOSFindLink` | `lifeos/lifeos-link-registry.js` |
| `lifeOSGetStore` | `lifeos/lifeos-store.js` |
| `LifeOSGoals` | `lifeos/ui/goals.js` |
| `LifeOSHome` | `lifeos/ui/lifeos-home.js` |
| `LifeOSKnowledge` | `lifeos/ui/knowledge.js` |
| `lifeOSLoad` | `lifeos/lifeos-store.js` |
| `LifeOSProjects` | `lifeos/ui/projects.js` |
| `LifeOSReview` | `lifeos/ui/review.js` |
| `lifeOSSave` | `lifeos/lifeos-store.js` |
| `LifeOSStore` | `lifeos/lifeos-store.js` |
| `LifeOSToday` | `lifeos/ui/today.js` |
| `linkedAssetAccountIds` | `akun.js` |
| `LinkTx` | `linktx.js` |
| `load` | `features-helpers-global-security.js` |
| `loadAndMigrateApiKeyOnUnlock` | `keamanan-pin.js` |
| `loadKeuFilterPrefsIntoDOM` | `filter-laporan.js` |
| `loadMoreBbmList` | `vehicle-core.js` |
| `loadMoreLapTx` | `filter-laporan.js` |
| `loadMoreServisList` | `sparepart-servis.js` |
| `loadMoreTx` | `filter-laporan.js` |
| `markBillPaid` | `tagihan-kalender.js` |
| `markShopDelivered` | `cobek-io.js` |
| `markSparepartServiced` | `sparepart-servis.js` |
| `matchingVehicleName` | `sparepart-servis.js` |
| `maybeOfferPaylaterReminder` | `scan-ocr.js` |
| `migrateShopCategory` | `features-helpers-global-security.js` |
| `MODAL_HTML` | `modals.js` |
| `MODAL_VERSION` | `modals.js` |
| `MODULE_CALC_VERSION` | `modules-calc.js` |
| `MODULE_FEATURES_VERSION` | `features-budget-laporan-carnotes-pelanggan.js` |
| `MODULE_RENDER_VERSION` | `modules-render.js` |
| `MONTHS` | `helper-teks.js` |
| `MONTHS_FULL` | `helper-teks.js` |
| `MY_WRENCH` | `features-budget-laporan-carnotes-pelanggan.js` |
| `MY_WRENCH_SCALE` | `sparepart-servis.js` |
| `navBillCalendar` | `tagihan-kalender.js` |
| `normalizeAmtToken` | `kalkulator-input.js` |
| `ocrRecognize` | `scan-ocr.js` |
| `onBackupPeriodeChange` | `backup-restore.js` |
| `onBudgetCatChildToggle` | `features-budget-laporan-carnotes-pelanggan.js` |
| `onBudgetCatTotalToggle` | `features-budget-laporan-carnotes-pelanggan.js` |
| `onCustomerInputChange` | `cobek-io.js` |
| `onFiCatTotalToggle` | `modules-calc.js` |
| `onFKatChange` | `filter-laporan.js` |
| `OngkirCalc` | `cobek-pricing.js` |
| `onGlobalSearchInput` | `features-aiwidget-reminder-gdrive-search.js` |
| `onImportShopExcelFileChange` | `cobek-io.js` |
| `onKfKatChange` | `filter-laporan.js` |
| `onKfSearchInput` | `filter-laporan.js` |
| `onKmVehicleChange` | `vehicle-core.js` |
| `onPProdusenChange` | `cobek-tx-cart.js` |
| `onServisItemAutofillInterval` | `sparepart-servis.js` |
| `onServisPartChange` | `sparepart-servis.js` |
| `onShopCustFieldInput` | `cobek-tx-cart.js` |
| `onTargetAccChange` | `tx-target.js` |
| `onTargetDanaDaruratToggle` | `tx-target.js` |
| `onTxCatInput` | `transaksi.js` |
| `onTxShopSaleItemChange` | `cobek-tx-cart.js` |
| `onTxShopStockItemChange` | `cobek-tx-cart.js` |
| `onTxShopStockProdusenChange` | `cobek-tx-cart.js` |
| `onTxStockItemChange` | `tx-stok-sparepart.js` |
| `onTxSubCatInput` | `transaksi.js` |
| `openAbsensiModal` | `gaji-calc.js` |
| `openAccModal` | `akun.js` |
| `openArchiveModal` | `data-archive.js` |
| `openBackupModal` | `backup-restore.js` |
| `openBbmModal` | `vehicle-core.js` |
| `openBillActionsMenu` | `tagihan-kalender.js` |
| `openBillArchive` | `tagihan-kalender.js` |
| `openBillCalendar` | `tagihan-kalender.js` |
| `openBillHistory` | `tagihan-kalender.js` |
| `openBillModal` | `tagihan-kalender.js` |
| `openBudgetModal` | `features-budget-laporan-carnotes-pelanggan.js` |
| `openBudgetSettings` | `features-budget-laporan-carnotes-pelanggan.js` |
| `openCalc` | `kalkulator-input.js` |
| `openCatatan` | `transaksi.js` |
| `openCatModal` | `kategori.js` |
| `openCicilanHistoryFromTx` | `cicilan.js` |
| `openCustomerDetail` | `cobek-io.js` |
| `openFiSettingsModal` | `modules-calc.js` |
| `openGajiCalc` | `gaji-calc.js` |
| `openGlobalSearch` | `features-aiwidget-reminder-gdrive-search.js` |
| `openImportKatalogModal` | `cobek-io.js` |
| `openImportShopExcelModal` | `cobek-io.js` |
| `openKmModal` | `vehicle-core.js` |
| `openModal` | `modal-navigasi.js` |
| `openOrderModal` | `cobek-io.js` |
| `openPriceRekoWidgetDetail` | `cobek-io.js` |
| `openProductModal` | `cobek-tx-cart.js` |
| `openProdusenHargaModal` | `cobek-io.js` |
| `openProdusenModal` | `cobek-io.js` |
| `openQS` | `modal-navigasi.js` |
| `openReminderModal` | `transaksi.js` |
| `openServisModal` | `sparepart-servis.js` |
| `openSimModal` | `vehicle-core.js` |
| `openSparepartModal` | `sparepart-servis.js` |
| `openStockModal` | `sparepart-servis.js` |
| `openStockRekoWidgetDetail` | `cobek-io.js` |
| `openSubCatModal` | `kategori.js` |
| `openTargetModal` | `tx-target.js` |
| `openTransferModal` | `tx-transfer.js` |
| `openTxModal` | `transaksi.js` |
| `openVehicleModal` | `vehicle-core.js` |
| `openVehTaxModal` | `vehicle-core.js` |
| `openWaShare` | `features-aiwidget-reminder-gdrive-search.js` |
| `openWeeklyResetManual` | `reset-gaji-mingguan.js` |
| `Order` | `cobek-order.js` |
| `PAGE_NAV_IDX` | `dashboard-hub.js` |
| `PAJAK_TAB_IDX` | `dashboard-hub.js` |
| `PAYLATER_DUE_NEXT_MONTH_RE` | `scan-ocr.js` |
| `Payroll` | `payroll-absensi.js` |
| `PBB` | `pajak-pbb-zakat.js` |
| `Pelanggan` | `cobek-order.js` |
| `Pensiun` | `modules-calc.js` |
| `persistApiKeyEncrypted` | `keamanan-pin.js` |
| `phoneToWaId` | `features-aiwidget-reminder-gdrive-search.js` |
| `pickAssetScanCandidate` | `scan-ocr.js` |
| `PIN_LOCK_DURATIONS_SEC` | `keamanan-pin.js` |
| `PIN_MAX_ATTEMPTS` | `keamanan-pin.js` |
| `pinBack` | `keamanan-pin.js` |
| `pinBuffer` | `features-helpers-global-security.js` |
| `pinPress` | `keamanan-pin.js` |
| `Piutang` | `piutang-utang.js` |
| `populateAccFilters` | `akun.js` |
| `populateBillFilterOptions` | `tagihan-kalender.js` |
| `populateCatFilter` | `filter-laporan.js` |
| `populateCatSelect` | `kategori.js` |
| `populateKeuFilters` | `filter-laporan.js` |
| `populateKmVehicleSelect` | `vehicle-core.js` |
| `populateOrderProductSelect` | `cobek-io.js` |
| `populateServisPartSelect` | `sparepart-servis.js` |
| `populateSparepartDatalist` | `sparepart-servis.js` |
| `populateStockCatSelect` | `sparepart-servis.js` |
| `populateSubSelect` | `kategori.js` |
| `populateTxBbmVehicleSelect` | `tx-bbm.js` |
| `populateTxShopSaleSelect` | `cobek-tx-cart.js` |
| `populateTxShopStockSelect` | `cobek-tx-cart.js` |
| `populateTxStockSelect` | `tx-stok-sparepart.js` |
| `PORTFOLIO_LABELS` | `aset.js` |
| `previewGoldImport` | `aset-emas-impor.js` |
| `previewImportKatalog` | `cobek-io.js` |
| `PriceReko` | `cobek-pricing.js` |
| `PriceRekoWidget` | `cobek-pricing.js` |
| `PRODUCTION_BUILD_SYNCED_VERSION` | `features-helpers-global-security.js` |
| `Produsen` | `cobek-order.js` |
| `profileJiwaKeluarga` | `profil-pengaturan.js` |
| `profilePTKPStatus` | `profil-pengaturan.js` |
| `projectAdapterFindOne` | `lifeos/adapters/project-adapter.js` |
| `projectAdapterList` | `lifeos/adapters/project-adapter.js` |
| `projectServiceAddChecklistItem` | `lifeos/services/project-service.js` |
| `projectServiceCreate` | `lifeos/services/project-service.js` |
| `projectServiceDelete` | `lifeos/services/project-service.js` |
| `projectServiceSetStatus` | `lifeos/services/project-service.js` |
| `projectServiceToggleChecklistItem` | `lifeos/services/project-service.js` |
| `quickScanAsset` | `scan-ocr.js` |
| `quickToggleInclude` | `akun.js` |
| `recalcAccBalance` | `akun.js` |
| `recentUniqueStrings` | `transaksi.js` |
| `recordBbmLog` | `tx-bbm.js` |
| `recordShopSale` | `cobek-tx-cart.js` |
| `RefAI` | `pajak-pbb-zakat.js` |
| `Refleksi` | `refleksi-selfcare.js` |
| `REFLEKSI_SELFCARE_ITEMS` | `refleksi-selfcare.js` |
| `refreshBillEverywhere` | `tagihan-kalender.js` |
| `refreshCurrentPage` | `modal-navigasi.js` |
| `refreshTxCatIfOpen` | `kategori.js` |
| `rememberLastAccForCat` | `scan-ocr.js` |
| `removeOrderItem` | `cobek-io.js` |
| `removeShopStockCartItem` | `cobek-tx-cart.js` |
| `removeTxShopSaleCartItem` | `cobek-tx-cart.js` |
| `renderAccGrid` | `modules-render.js` |
| `renderActualStorageQuota` | `modules-render.js` |
| `renderArchiveHistory` | `modules-render.js` |
| `renderArchiveSuggestHint` | `modules-render.js` |
| `renderAssetList` | `modules-render.js` |
| `renderBbmList` | `modules-render.js` |
| `renderBillArchive` | `modules-render.js` |
| `renderBillCalendar` | `modules-render.js` |
| `renderBillHistory` | `modules-render.js` |
| `renderBillList` | `modules-render.js` |
| `renderBudgetCatOptions` | `modules-render.js` |
| `renderBudgets` | `modules-render.js` |
| `renderCarImportVehicleSelect` | `modules-render.js` |
| `renderCashflowForecast` | `modules-render.js` |
| `renderCatList` | `modules-render.js` |
| `renderChatActionBubble` | `modules-render.js` |
| `renderCnTab` | `modules-render.js` |
| `renderCustomerList` | `cobek-io.js` |
| `renderDashAccList` | `modules-render.js` |
| `renderDashboard` | `modules-render.js` |
| `renderDashboardBackupReminder` | `modules-render.js` |
| `renderDashboardBills` | `modules-render.js` |
| `renderDashboardServisReminder` | `modules-render.js` |
| `renderDashboardSewaKiosReminder` | `modules-render.js` |
| `renderDashBudgetMini` | `modules-render.js` |
| `renderDashCardPrefsUI` | `modules-render.js` |
| `renderDashCashflowForecast` | `modules-render.js` |
| `renderDashDanaDarurat` | `modules-render.js` |
| `renderDashLaporanMini` | `modules-render.js` |
| `renderDashServisVehChips` | `modules-render.js` |
| `renderDashZakatMini` | `modules-render.js` |
| `renderDebtList` | `modules-render.js` |
| `renderFiCatOptions` | `modules-render.js` |
| `renderFinancialFreedom` | `modules-render.js` |
| `renderFiScenarios` | `modules-render.js` |
| `renderGDriveSettings` | `modules-render.js` |
| `renderGrafik` | `modules-render.js` |
| `renderKekayaanBersih` | `modules-render.js` |
| `renderKeuAbsensiGajiCard` | `modules-render.js` |
| `renderKeuangan` | `modules-render.js` |
| `renderLapAccList` | `modules-render.js` |
| `renderLaporan` | `modules-render.js` |
| `renderLDR` | `modules-render.js` |
| `renderModalSweepResults` | `modules-render.js` |
| `renderMs` | `modules-render.js` |
| `renderNavSmokeResults` | `modules-render.js` |
| `renderNotifSettings` | `modules-render.js` |
| `renderOrderItems` | `cobek-io.js` |
| `renderPageContent` | `modules-render.js` |
| `renderPajakRekomendasi` | `modules-render.js` |
| `renderPajakZakat` | `modules-render.js` |
| `renderPBB` | `modules-render.js` |
| `renderPBBBillStatus` | `modules-render.js` |
| `renderPiutangList` | `modules-render.js` |
| `renderProductList` | `cobek-io.js` |
| `renderProdusenList` | `cobek-io.js` |
| `renderReceiptInsight` | `modules-render.js` |
| `renderRefCheckReminder` | `modules-render.js` |
| `renderReminder` | `modules-render.js` |
| `renderSelfTestLastResult` | `modules-render.js` |
| `renderSelfTestResults` | `modules-render.js` |
| `renderServisList` | `modules-render.js` |
| `renderServisReminder` | `modules-render.js` |
| `renderSettings` | `modules-render.js` |
| `renderSheetsSettings` | `modules-render.js` |
| `renderShop` | `cobek-io.js` |
| `renderShopGrafik` | `cobek-io.js` |
| `renderShopRecent` | `cobek-io.js` |
| `renderShopStockCartList` | `cobek-io.js` |
| `renderSiapPulang` | `cobek-io.js` |
| `renderSimLinkStatus` | `modules-render.js` |
| `renderSimList` | `modules-render.js` |
| `renderSparepartCatList` | `modules-render.js` |
| `renderSptLinkStatus` | `modules-render.js` |
| `renderStockList` | `modules-render.js` |
| `renderStorageUsage` | `modules-render.js` |
| `renderTarget` | `modules-render.js` |
| `renderTxShopSaleCartList` | `cobek-io.js` |
| `renderUMKMPajak` | `modules-render.js` |
| `renderVehicleManageList` | `modules-render.js` |
| `renderVehicleSelect` | `modules-render.js` |
| `renderVehicleSpecCard` | `modules-render.js` |
| `renderVehTaxLinkStatus` | `modules-render.js` |
| `renderVehTaxList` | `modules-render.js` |
| `renderVehTaxSim` | `modules-render.js` |
| `renderWealthSnapshots` | `modules-render.js` |
| `renderWorkDays` | `modules-render.js` |
| `renderZakatLog` | `modules-render.js` |
| `Renov` | `renovasi.js` |
| `RenovAI` | `renovasi.js` |
| `RenovCalc` | `renovasi.js` |
| `requestNotifPermission` | `features-aiwidget-reminder-gdrive-search.js` |
| `resetApp` | `features-aiwidget-reminder-gdrive-search.js` |
| `resetBillFilter` | `tagihan-kalender.js` |
| `resetKeuFilter` | `filter-laporan.js` |
| `resetLaporanFilter` | `filter-laporan.js` |
| `resetOcrWorker` | `scan-ocr.js` |
| `resetPayMethodLock` | `transaksi.js` |
| `resetShopStockCart` | `cobek-tx-cart.js` |
| `resetTxPageAndRender` | `filter-laporan.js` |
| `resetTxShopSaleCart` | `cobek-tx-cart.js` |
| `resolveFavoritEntries` | `dashboard-hub-favorit-view.js` |
| `resolveShopKategori` | `cobek-tx-cart.js` |
| `resolveVehicleTxCategory` | `transaksi.js` |
| `revertStockUsage` | `sparepart-servis.js` |
| `reviewAdapterIsOverdue` | `lifeos/adapters/review-adapter.js` |
| `reviewAdapterLatestSnapshots` | `lifeos/adapters/review-adapter.js` |
| `reviewAdapterLogFor` | `lifeos/adapters/review-adapter.js` |
| `reviewServiceAddActionItem` | `lifeos/services/review-service.js` |
| `reviewServiceComplete` | `lifeos/services/review-service.js` |
| `reviewServiceStartSession` | `lifeos/services/review-service.js` |
| `RISKY_OPENER_SPECS` | `features-sheets-pwa-selftest.js` |
| `runBackup` | `backup-restore.js` |
| `runDataHealthCheck` | `features-aiwidget-reminder-gdrive-search.js` |
| `runDataMigrations` | `features-helpers-global-security.js` |
| `runFullBackup` | `backup-restore.js` |
| `runGlobalSearch` | `features-aiwidget-reminder-gdrive-search.js` |
| `runNavSmokeTest` | `features-sheets-pwa-selftest.js` |
| `runSelfTest` | `features-sheets-pwa-selftest.js` |
| `safeCalc` | `kalkulator-input.js` |
| `safeSetItem` | `features-helpers-global-security.js` |
| `sameId` | `features-helpers-global-security.js` |
| `save` | `features-helpers-global-security.js` |
| `saveAcc` | `akun.js` |
| `saveBbm` | `vehicle-core.js` |
| `saveBill` | `tagihan-kalender.js` |
| `saveBillHistoryEdit` | `tagihan-kalender.js` |
| `saveBudget` | `features-budget-laporan-carnotes-pelanggan.js` |
| `saveBudgetSettings` | `features-budget-laporan-carnotes-pelanggan.js` |
| `saveCat` | `kategori.js` |
| `saveCatatan` | `transaksi.js` |
| `saveChatActionEdit` | `features-aiwidget-reminder-gdrive-search.js` |
| `saveFiSettings` | `modules-calc.js` |
| `saveFlush` | `features-helpers-global-security.js` |
| `saveGajiAsIncome` | `gaji-calc.js` |
| `saveKeuFilterPrefs` | `filter-laporan.js` |
| `saveKm` | `vehicle-core.js` |
| `saveLDR` | `transaksi.js` |
| `saveNotifDays` | `features-aiwidget-reminder-gdrive-search.js` |
| `saveOrder` | `cobek-io.js` |
| `saveProduct` | `cobek-tx-cart.js` |
| `saveProdusen` | `cobek-io.js` |
| `saveProdusenHarga` | `cobek-io.js` |
| `saveReminder` | `transaksi.js` |
| `saveSelfTestState` | `features-sheets-pwa-selftest.js` |
| `saveServis` | `sparepart-servis.js` |
| `saveSim` | `vehicle-core.js` |
| `saveSparepart` | `sparepart-servis.js` |
| `saveStock` | `sparepart-servis.js` |
| `saveSubCat` | `kategori.js` |
| `saveTarget` | `tx-target.js` |
| `saveTransfer` | `tx-transfer.js` |
| `saveTx` | `transaksi.js` |
| `saveVehicle` | `vehicle-core.js` |
| `saveVehTax` | `vehicle-core.js` |
| `scanAssetPortfolio` | `scan-ocr.js` |
| `scanBuktiTransfer` | `scan-ocr.js` |
| `scanErrorMessage` | `scan-ocr.js` |
| `scanKmOdometer` | `scan-ocr.js` |
| `scanReceipt` | `scan-ocr.js` |
| `scanReceiptBelanja` | `scan-ocr.js` |
| `scanTanggalDariFoto` | `scan-ocr.js` |
| `scanWorthItCheckout` | `scan-ocr.js` |
| `SCHEMA_VERSION` | `features-helpers-global-security.js` |
| `selectBillCalDay` | `tagihan-kalender.js` |
| `selectBudgetIcon` | `features-budget-laporan-carnotes-pelanggan.js` |
| `selectBudgetPeriod` | `features-budget-laporan-carnotes-pelanggan.js` |
| `selectFiAssetScope` | `modules-calc.js` |
| `selectShopCustomer` | `cobek-tx-cart.js` |
| `selectSimpleAutocomplete` | `transaksi.js` |
| `selectStatusKawin` | `profil-pengaturan.js` |
| `selectStatusPekerjaan` | `profil-pengaturan.js` |
| `selectTanggungan` | `profil-pengaturan.js` |
| `selectTxCat` | `transaksi.js` |
| `selectTxSubCat` | `transaksi.js` |
| `selectTxSubCatWithCat` | `transaksi.js` |
| `selectVehicle` | `vehicle-core.js` |
| `SELF_REWARD_LEVEL_LABEL` | `self-reward-view.js` |
| `SelfCareReko` | `refleksi-selfcare.js` |
| `SelfReward` | `self-reward-engine.js` |
| `SelfRewardAI` | `self-reward-ai-widget.js` |
| `SelfRewardDefaults` | `self-reward-engine.js` |
| `SelfRewardView` | `self-reward-view.js` |
| `sendChat` | `features-aiwidget-reminder-gdrive-search.js` |
| `Servis` | `features-budget-laporan-carnotes-pelanggan.js` |
| `servisLogMatchesCat` | `sparepart-servis.js` |
| `setAllDashCardPrefs` | `modules-render.js` |
| `setBillType` | `tagihan-kalender.js` |
| `setCatModalType` | `kategori.js` |
| `setCnPeriode` | `vehicle-core.js` |
| `setCnTab` | `vehicle-core.js` |
| `setCobekTab` | `cobek-io.js` |
| `setDashServisVehFilter` | `sparepart-servis.js` |
| `setImportKatalogTarget` | `cobek-io.js` |
| `setImportShopExcelTarget` | `cobek-io.js` |
| `setKeuanganTab` | `tx-list-cashflow.js` |
| `setPayMethod` | `transaksi.js` |
| `setPeriode` | `tx-list-cashflow.js` |
| `setShopPeriode` | `cobek-io.js` |
| `setShopTab` | `cobek-io.js` |
| `setTheme` | `format-tema.js` |
| `setTxListPeriode` | `tx-list-cashflow.js` |
| `setTxType` | `transaksi.js` |
| `setupPWA` | `features-sheets-pwa-selftest.js` |
| `SewaKios` | `sewakios.js` |
| `shareBillWA` | `features-aiwidget-reminder-gdrive-search.js` |
| `shareLDRWA` | `features-aiwidget-reminder-gdrive-search.js` |
| `SHEETS_MODULES` | `features-aiwidget-reminder-gdrive-search.js` |
| `SHEETS_ROW_BUFFER` | `features-sheets-pwa-selftest.js` |
| `SHEETS_SCHEMAS` | `features-aiwidget-reminder-gdrive-search.js` |
| `SHEETS_WRITE_CHUNK` | `features-sheets-pwa-selftest.js` |
| `sheetsCellsToItem` | `features-aiwidget-reminder-gdrive-search.js` |
| `sheetsColLetter` | `features-aiwidget-reminder-gdrive-search.js` |
| `sheetsConnectOnly` | `features-sheets-pwa-selftest.js` |
| `sheetsEnsureAuth` | `features-sheets-pwa-selftest.js` |
| `sheetsEnsureTabs` | `features-sheets-pwa-selftest.js` |
| `sheetsFetch` | `features-sheets-pwa-selftest.js` |
| `sheetsGetOrCreateSpreadsheet` | `features-sheets-pwa-selftest.js` |
| `sheetsHeaderFor` | `features-aiwidget-reminder-gdrive-search.js` |
| `sheetsInitTokenClient` | `features-sheets-pwa-selftest.js` |
| `sheetsItemToCells` | `features-aiwidget-reminder-gdrive-search.js` |
| `sheetsLastColFor` | `features-aiwidget-reminder-gdrive-search.js` |
| `sheetsPendingAfterAuth` | `features-sheets-pwa-selftest.js` |
| `sheetsPullNow` | `features-sheets-pwa-selftest.js` |
| `sheetsSaveSpreadsheetId` | `features-aiwidget-reminder-gdrive-search.js` |
| `sheetsSyncNow` | `features-sheets-pwa-selftest.js` |
| `sheetsTokenClient` | `features-sheets-pwa-selftest.js` |
| `SHOP_TAB_IDX` | `dashboard-hub.js` |
| `ShopExport` | `cobek-io.js` |
| `shopKategoriName` | `cobek-tx-cart.js` |
| `shopOrderRowHTML` | `cobek-io.js` |
| `showAlertModal` | `modal-navigasi.js` |
| `showAllBudgetDrillDown` | `features-budget-laporan-carnotes-pelanggan.js` |
| `showBudgetDrillDown` | `features-budget-laporan-carnotes-pelanggan.js` |
| `showChoiceModal` | `modal-navigasi.js` |
| `showFilteredTx` | `filter-laporan.js` |
| `showMain` | `features-helpers-global-security.js` |
| `showPage` | `modal-navigasi.js` |
| `showPinPromptModal` | `modal-navigasi.js` |
| `showPinScreen` | `keamanan-pin.js` |
| `showPromptModal` | `modal-navigasi.js` |
| `showQuickScanPicker` | `scan-ocr.js` |
| `showTargetAccountTx` | `tx-target.js` |
| `SiapPulang` | `cobek-order.js` |
| `simpleAutocompleteInput` | `transaksi.js` |
| `Sparepart` | `sparepart-servis.js` |
| `SPAREPART_LINE_KEYWORDS` | `scan-ocr.js` |
| `sptStatusBadge` | `vehicle-core.js` |
| `sptTahunanDueDate` | `vehicle-core.js` |
| `startEditCurKm` | `vehicle-core.js` |
| `STATUS_BAR_LINE_RE` | `scan-ocr.js` |
| `stgSearch` | `pengaturan-search.js` |
| `StockRekoWidget` | `cobek-pricing.js` |
| `STORAGE_BIG_MODULES` | `data-archive.js` |
| `STORAGE_QUOTA_ESTIMATE` | `data-archive.js` |
| `subCatParentId` | `features-helpers-global-security.js` |
| `subNamesForCat` | `kategori.js` |
| `syncBbmCost` | `vehicle-core.js` |
| `syncBbmHargaChanged` | `vehicle-core.js` |
| `syncBbmLiterFromCost` | `vehicle-core.js` |
| `syncCicilanDate` | `cicilan.js` |
| `syncCicilanPreview` | `cicilan.js` |
| `syncTxAmtToLiter` | `tx-bbm.js` |
| `syncTxAmtToLiterForce` | `tx-bbm.js` |
| `syncTxBbmAmt` | `tx-bbm.js` |
| `syncTxShopSaleAmt` | `cobek-tx-cart.js` |
| `syncTxShopStockAmt` | `cobek-tx-cart.js` |
| `testNotif` | `features-aiwidget-reminder-gdrive-search.js` |
| `TimelineW` | `aset.js` |
| `timeToMinutes` | `payroll-absensi.js` |
| `toast` | `format-tema.js` |
| `todayAdapterList` | `lifeos/adapters/today-adapter.js` |
| `todayStr` | `features-helpers-global-security.js` |
| `toggleAccInclude` | `akun.js` |
| `toggleApiKeyHint` | `profil-pengaturan.js` |
| `toggleArchiveYear` | `data-archive.js` |
| `toggleBackupModule` | `backup-restore.js` |
| `toggleBillFilterPanel` | `tagihan-kalender.js` |
| `toggleBillSharedFields` | `tagihan-kalender.js` |
| `toggleCardCollapse` | `modal-navigasi.js` |
| `toggleCatGroup` | `kategori.js` |
| `toggleCicilanSharedFields` | `cicilan.js` |
| `toggleDashCardPref` | `modules-render.js` |
| `toggleDebugConsole` | `debug-console.js` |
| `toggleFavorit` | `dashboard-hub-favorit.js` |
| `toggleKeuFilter` | `filter-laporan.js` |
| `toggleMs` | `transaksi.js` |
| `toggleNotifEnabled` | `features-aiwidget-reminder-gdrive-search.js` |
| `toggleOrderDeliveredField` | `cobek-io.js` |
| `toggleSingleCardCollapse` | `pengaturan-search.js` |
| `toggleStgGroup` | `pengaturan-search.js` |
| `toggleTxBbmFields` | `tx-bbm.js` |
| `toggleTxShopSaleFields` | `cobek-tx-cart.js` |
| `toggleTxShopStockFields` | `cobek-tx-cart.js` |
| `toggleTxStockFields` | `tx-stok-sparepart.js` |
| `Torsi` | `features-budget-laporan-carnotes-pelanggan.js` |
| `TORSI_DB` | `sparepart-servis.js` |
| `TORSI_NM_PER_KGF` | `sparepart-servis.js` |
| `TORSI_STANDARD_CAT` | `features-budget-laporan-carnotes-pelanggan.js` |
| `totalSaldoAkun` | `akun.js` |
| `Tukang` | `tukang-absensi.js` |
| `TX_PAGE_SIZE` | `filter-laporan.js` |
| `txEditId` | `features-helpers-global-security.js` |
| `txHTML` | `tx-list-cashflow.js` |
| `txListPage` | `filter-laporan.js` |
| `txListPeriode` | `tx-list-cashflow.js` |
| `txMatchesFilters` | `filter-laporan.js` |
| `txMatchesSearch` | `filter-laporan.js` |
| `uid` | `features-helpers-global-security.js` |
| `uniqueCatList` | `kategori.js` |
| `updateAccIncludeBtn` | `akun.js` |
| `updateAmtPreview` | `kalkulator-input.js` |
| `updateArchivePreview` | `data-archive.js` |
| `updateBillSharedPreview` | `tagihan-kalender.js` |
| `updateBillStatGrid` | `tagihan-kalender.js` |
| `updateBillSubCatOptions` | `tagihan-kalender.js` |
| `updateDebugConsoleBtn` | `debug-console.js` |
| `updateKfBadge` | `filter-laporan.js` |
| `updateOnboardPreview` | `onboarding.js` |
| `updateOrderItemHarga` | `cobek-io.js` |
| `updatePinDots` | `keamanan-pin.js` |
| `updatePinLockUI` | `keamanan-pin.js` |
| `updateProfilPTKPPreview` | `profil-pengaturan.js` |
| `updateSelfTestBadge` | `features-sheets-pwa-selftest.js` |
| `updateSubCatOptions` | `transaksi.js` |
| `updateTxVehiclePanels` | `transaksi.js` |
| `updateUsiaPreview` | `profil-pengaturan.js` |
| `uploadBackupToDrive` | `features-aiwidget-reminder-gdrive-search.js` |
| `validateCicilanFields` | `cicilan.js` |
| `VEHICLE_SPEC_DB` | `sparepart-servis.js` |
| `VEHTAX_INPUT_IDS` | `features-budget-laporan-carnotes-pelanggan.js` |
| `VEHTAX_ITEMS` | `features-budget-laporan-carnotes-pelanggan.js` |
| `waShareLink` | `features-aiwidget-reminder-gdrive-search.js` |
| `withSaveGuard` | `features-helpers-global-security.js` |
| `withSaveGuardAsync` | `features-helpers-global-security.js` |
| `withTimeout` | `scan-ocr.js` |
| `WorthIt` | `worthit.js` |
| `WORTHIT_KEBUTUHAN_KEYWORDS` | `scan-ocr.js` |
| `Zakat` | `pajak-pbb-zakat.js` |
