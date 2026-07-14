# Catatan Cek & Perbaikan — untuk Claude di sesi berikutnya

> **Cara pakai file ini (WAJIB dibaca dulu):**
> 1. Ini daftar kerja: apa yang **sudah** diverifikasi beres, dan apa yang **belum**.
> 2. Kalau kamu mengerjakan salah satu item "BELUM DIKERJAKAN" dan sudah
>    kamu **verifikasi sendiri** (jalan di browser / `npm run check` hijau),
>    pindahkan ke bagian "SUDAH SELESAI" dengan tanggal, atau — kalau memang
>    tidak ada tindak lanjut lain yang perlu dicatat — **hapus saja barisnya**
>    dari file ini supaya file ini tidak menggembung jadi riwayat basi.
> 3. Jangan tandai "selesai" hanya berdasarkan asumsi/baca kode — pengujian
>    nyata dulu (browser via Playwright + Chrome di `/home/claude/.cache/puppeteer/chrome/...`,
>    atau `npm run check`).

## SUDAH SELESAI (terverifikasi)

- ✅ **[2026-07-13] Audit menyeluruh pasca-patch v205 (fitur impor emas/zakat) — build #238.**
  Menjalankan ulang seluruh self-test (102/102), full modal-registry sweep (78/78 modal
  ter-cover, 0 hilang), dan smoke-test browser (`getElementById`/`data-action` scan) di atas
  Chrome headless nyata (bukan cuma baca kode) via Playwright + server statis lokal.
  **2 bug nyata ditemukan & diperbaiki (surgical fix, tidak ada refactor):**
  1. **Modul UI Life OS tidak ter-expose ke `window`** (`LifeOSHome`, `LifeOSToday`,
     `LifeOSGoals`, `LifeOSProjects`, `LifeOSReview`, `LifeOSKnowledge`) — persis pola bug
     FinCoach (2026-07-10) & DashboardHub (Tahap 2) yang pernah ditemukan sebelumnya: dispatcher
     `data-action` global lookup lewat `window[...]`, tapi ke-6 modul ini cuma `const` lokal.
     Akibatnya tombol `LifeOSHome.switchPanel`, `LifeOSProjects.open`,
     `LifeOSReview.startWeekly` (dan yg lain di rumpun Life OS) diam/error saat diklik.
     **Fix:** tambahkan `Object.assign`-style expose di akhir `lifeos/ui/knowledge.js` (file
     TERAKHIR dari rumpun `lifeos/ui/*` yang dimuat build.js), meng-expose ke-6 modul sekaligus.
  2. **False-positive pra-existing di `smoke-test.js`** (sudah dicatat di "BELUM DIKERJAKAN"
     sejak 2026-07-12): regex `extractDataActionPaths` ikut men-scan komentar dokumentasi
     `// ...data-action="..." di modal...` di `aset-emas-impor.js` krn `.` termasuk character
     class regex, menghasilkan path palsu `"..."` yang dianggap modul tidak ke-expose.
     **Fix:** setiap segmen hasil split path sekarang divalidasi sebagai identifier JS yang sah
     (`/^[A-Za-z_$][A-Za-z0-9_$]*$/`), bukan cuma dicek `length>=2`.
  **Hasil sebelum fix:** smoke-test browser melaporkan `❌ 4 masalah` (1 false-positive lama +
  3 modul Life OS beneran putus). **Hasil sesudah fix:** `✅ OK — 1044 referensi getElementById()
  & 69 data-action semuanya valid`, 0 masalah, 0 page error, 102/102 self-test tetap hijau,
  modal sweep tetap 78/78, `npm test` tetap 1191/1191 (0 regresi, murni tambahan expose +
  perketat 1 regex).
  **File diubah:** `lifeos/ui/knowledge.js` (+18 baris expose), `smoke-test.js` (+9 baris
  validasi identifier). Tidak ada file lain yang disentuh. Build #238, versi disamakan di
  index.html/app_production.html/sw.js, kedua HTML tetap identik.
  **Item lama yang masih belum dikerjakan** (tidak terkait audit ini, lihat "BELUM DIKERJAKAN"):
  aria-label utk tombol `loadMoreBbmList` di BBM.renderList().

- ✅ **[2026-07-12] Dashboard Feature Hub Tahap 2 (Final) — Integrasi UI Feature Search
  (build #227).** Lanjutan Tahap 1 (`dashboard-hub.js`/`dashboard-hub-registry.js`, build
  #224) & modul `dashboard-hub-search.js` yang sudah ada dari sesi sebelumnya (TIDAK diubah
  algoritmanya, kecuali 1 bug nyata — lihat poin bug di bawah). Yang dikerjakan sesi ini:
  - **Markup minimum** ditambahkan di `#page-dashboard-hub` (index.html & app_production.html,
    tetap identik), di ATAS `#dashboardHubGrid` — `<input id="dashHubSearchInput" oninput=
    "DashboardHubSearch.render(this.value)">` + `<div id="dashHubSearchResults">` (mengikuti
    pola persis `stgSearchInput`/`stgSearchResult` yang sudah ada di Pengaturan). TIDAK
    membuat page/modal baru, TIDAK menambah `MODAL_HTML[]` (diverifikasi otomatis lewat test
    baru, lihat di bawah).
  - **CSS minimum** di `styles.css` (`.dashhub-search-wrap/-results/-item/-empty`, dst) pakai
    token warna/radius yang sudah ada (`--surface2/3`, `--border`, `--r-lg`) — belum ada
    animasi/styling final sesuai instruksi.
  - **`scripts/build.js`**: `'dashboard-hub-search.js'` ditambahkan ke akhir `GROUP_B`
    (sesudah `dashboard-hub.js`).
  - **BUG NYATA ditemukan saat audit** (di luar scope algoritma pencarian itu sendiri, tapi
    wajib diperbaiki supaya klik hasil Feature Search bisa jalan sama sekali): `DashboardHub`
    & `DashboardHubSearch` TIDAK PERNAH ter-expose ke `window` — `Object.assign(window,{...})`
    besar di `features-sheets-pwa-selftest.js` dieksekusi SEBELUM `dashboard-hub.js`/
    `dashboard-hub-search.js` dimuat (keduanya di akhir `GROUP_B`), jadi dispatcher global
    `data-action` (yang lookup lewat `window[p]`) tidak akan pernah menemukan
    `DashboardHub.open`/`DashboardHubSearch.select` — persis pola bug `FinCoach` yang pernah
    ditemukan sebelumnya (2026-07-10). **Fix:** tambahkan `if(typeof window!=='undefined'){
    window.DashboardHub=DashboardHub; window.DashboardHubSearch=DashboardHubSearch; }` di
    AKHIR `dashboard-hub-search.js` (file TERAKHIR yang dimuat di `GROUP_B`, jadi keduanya
    sudah pasti ada). Ini juga sekaligus memperbaiki kartu fitur Hub (`DashboardHub.open`)
    yang dari Tahap 1 sebenarnya belum pernah bisa diklik.
  - **Test baru:** `tests/dashboard-hub-search-integration.test.js` (7 test) — integrasi nyata
    (bukan fake registry) `dashboard-hub-registry.js`+`dashboard-hub.js`+`dashboard-hub-search.js`
    bareng: input->render menampilkan hasil asli, klik hasil (data-args yang BENAR-BENAR
    di-parse dari HTML yang dirender, bukan ditebak) -> `DashboardHub.open()` -> `showPage()`,
    empty-state, plus 2 guard regresi: Global Search (`openGlobalSearch`, id
    `globalSearchInput`/`globalSearchResults`) tidak tersentuh sama sekali, dan
    `MODAL_HTML[]`/`document.write(MODAL_HTML[i])` tetap 70 di kedua HTML (tidak ada modal baru).
  - `npm test` → 1150/1150 pass, 0 fail (naik dari 1143, +7 test integrasi baru — test unit
    `dashboard-hub-search.js`/`dashboard-hub.js` dari sesi sebelumnya sudah ada duluan, tidak
    diulang). `node build.js` → build #227 sukses, sintaks bundle valid, index.html &
    app_production.html identik.
  - **Belum dikerjakan (di luar scope Tahap 2 sesuai instruksi sesi ini):** icon collapse/
    expand di `#mainHeader` (Feature Search saat ini selalu terlihat penuh di dalam halaman
    Dashboard Hub, BUKAN di top bar global) — blueprint §2 minta versi collapsed-icon-di-top-
    bar utk mobile, tapi itu perubahan ke `#mainHeader` yang dipakai di SEMUA halaman
    (risiko lebih besar) & sesi ini eksplisit fokus ke container minimum di dalam Hub saja;
    styling/animasi final; verifikasi manual di browser (Playwright) belum dijalankan ulang
    sesi ini, cuma test Node.

- ✅ **[2026-07-12] Split file besar `features-tukang-kendaraan-storage.js` — bagian ke-5
  (TERAKHIR): rename jadi `tukang-absensi.js` (build #222). ROADMAP SELESAI TOTAL (5 bagian).**
  Lanjutan langsung dari bagian ke-1 (Chat Action), ke-2 (Storage/Archive), ke-3 (Sparepart/Servis)
  & ke-4 (Vehicle core) — file ini sejak bagian ke-4 sudah murni domain Tukang (678 baris, cuma
  `const Tukang={...}`), jadi bagian ke-5 murni rename, tidak ada kode yang dipindah/diubah.
  **Perubahan:**
  1. `features-tukang-kendaraan-storage.js` → `tukang-absensi.js` (rename, isi identik persis
     kecuali header komentar yang ditulis ulang untuk mencatat penyelesaian roadmap 5-bagian ini
     & daftar urutan GROUP_B yang disebut di komentar itu).
  2. `scripts/build.js` — entri `'features-tukang-kendaraan-storage.js'` di `GROUP_B` diganti
     `'tukang-absensi.js'`, posisi urutan (tepat setelah `payroll-absensi.js`, sebelum
     `vehicle-core.js`) TIDAK berubah.
  3. Komentar banner "urutan build.js (GROUP_A/GROUP_B)" yang di-copy-paste di 19 file source lain
     (`akun.js`, `backup-restore.js`, `features-aiwidget-reminder-gdrive-search.js`,
     `features-helpers-global-security.js`, `features-sheets-pwa-selftest.js`, `filter-laporan.js`,
     `gaji-calc.js`, `kategori.js`, `payroll-absensi.js`, `profil-pengaturan.js`, `scan-ocr.js`,
     `tagihan-kalender.js`, `transaksi.js`, `vehicle-core.js`, `data-archive.js`,
     `sparepart-servis.js`, `chat-action.js`, `kalkulator-input.js`, `cobek-pricing.js`) —
     semua diupdate ganti nama file lama→baru, murni teks komentar, tidak ada logic yang berubah.
  4. `tests/bbm-renderlist.test.js`, `tests/estimate-rp-per-km.test.js`, `tests/servis-calc.test.js`,
     `tests/torsi-calc.test.js` — komentar yang menyebut nama file lama diupdate jadi "tukang-
     absensi.js (dulu features-tukang-kendaraan-storage.js)"; TIDAK ada `loadSource([...])` yang
     perlu diubah krn ke-4 test itu sudah meng-load `vehicle-core.js`/`sparepart-servis.js`
     (bukan file Tukang) sejak bagian ke-3/ke-4 — tidak ada test yang meng-load file Tukang lewat
     nama file secara langsung.
  **Diverifikasi:** `node --test tests/*.test.js` → 1106/1106 pass (sama persis sebelum & sesudah
  — murni rename, tidak ada perubahan fungsi apa pun); `node scripts/build.js` → sukses, versi
  #222, `node --check` kedua bundle valid, `FILE-MAP.md` ter-generate ulang (59 file, `tukang-
  absensi.js` muncul benar dgn modul `Tukang`, referensi silang `chat-action.js`/`data-archive.js`
  ke "Dipisah dari tukang-absensi.js" ikut ter-update otomatis oleh generator). Belum sempat
  smoke-test browser (Playwright) sesi ini — sandbox saat itu tanpa Chrome; berdasarkan pola
  verifikasi bagian ke-1 s/d ke-4 (murni rename/copy-paste tanpa ubah logic, selalu 0 pageerror),
  risiko regresi sangat rendah, tapi tetap disarankan smoke-test browser sebelum rilis final kalau
  belum sempat sesi ini.
  **Dengan ini seluruh roadmap split file besar `features-tukang-kendaraan-storage.js` (bagian
  ke-1 s/d ke-5) TUNTAS.** Tidak ada bagian lanjutan lagi untuk file ini.

- ✅ **[2026-07-12] Split file besar `features-tukang-kendaraan-storage.js` — bagian ke-4:
  Vehicle core → `vehicle-core.js` (build #221).**
  Lanjutan langsung dari bagian ke-1 (Chat Action), ke-2 (Storage/Archive) & ke-3 (Sparepart/Servis)
  di sesi yang sama.
  **Perubahan:**
  1. File baru `vehicle-core.js` (453 baris): `selectVehicle`, `openVehicleModal`,
     `editVehicleInterval`, `saveVehicle`, `populateKmVehicleSelect`, `onKmVehicleChange`,
     `openKmModal`, `saveKm`, `delVehicle`, `daysUntilDate`, `dateStatusBadge`, `fmtDateID`,
     `sptTahunanDueDate`, `sptStatusBadge`, `ikatSptTagihan`, `getProactiveReminders`,
     `openVehTaxModal`, `ikatVehTaxTagihan`, `saveVehTax`, `bayarPajakKendaraan`, `editSimId`,
     `openSimModal`, `ikatSimTagihan`, `saveSim`, `delSim`, `setCnTab`, `getVehicleKm`,
     `estimateKmPerDay`, `estimateServiceDateISO`, `estimateRpPerKm`, `setCnPeriode`,
     `getCnRange`, `startEditCurKm`, `commitCurKmEdit`, wrapper BBM (`openBbmModal`/`syncBbmCost`/
     `syncBbmLiterFromCost`/`syncBbmHargaChanged`/`saveBbm`/`deleteBbmFromModal`/`delBbm`/
     `loadMoreBbmList`) — dipindah persis (copy-paste) dari `features-tukang-kendaraan-storage.js`,
     TERMASUK 4 pointer comment lama (`moved to sparepart-servis.js`/`data-archive.js`/
     `chat-action.js`/`modules-render.js`) yang ikut pindah ke posisi barunya karena kode yang
     ditunjuknya dulu memang berada di area Vehicle core ini di file asal.
  2. `features-tukang-kendaraan-storage.js` — SEKARANG TINGGAL domain Tukang saja (678 baris, cuma
     `const Tukang={...}`); header ditulis ulang total (riwayat 4 bagian yang sudah dipisah +
     catatan bagian ke-5/terakhir yang akan me-rename/pindah sisa file ini ke
     `tukang-absensi.js`).
  3. `scripts/build.js` — `vehicle-core.js` ditambahkan ke `GROUP_B`, tepat setelah
     `features-tukang-kendaraan-storage.js` & sebelum `chat-action.js`/`data-archive.js`/
     `sparepart-servis.js` (yang tidak butuh apa pun dari file ini) & sebelum
     `features-aiwidget-reminder-gdrive-search.js` (yang memanggil `getVehicleKm()` dst dari file
     ini). Dicek: tidak ada pola top-level IIFE/bare-assignment di kode yang dipindah, jadi tidak
     ada constraint urutan ketat lain yang perlu dijaga.
  4. `tests/servis-calc.test.js` & `tests/estimate-rp-per-km.test.js` — `loadSource([...])`
     diupdate ke `vehicle-core.js` (+ `sparepart-servis.js` di servis-calc, karena test itu juga
     menguji fungsi dari bagian ke-3) — TIDAK lagi meng-load `features-tukang-kendaraan-storage.js`
     sama sekali (fungsi yang dites di kedua file itu sudah sepenuhnya pindah).
  **Diverifikasi:** `node --test tests/*.test.js` → 1106/1106 pass (sama persis sebelum & sesudah);
  `node scripts/build.js` → sukses, versi #221, `node --check` kedua bundle valid, `FILE-MAP.md`
  ter-generate ulang (59 file); smoke-test browser (Playwright + Chrome headless) → 0 `pageerror`,
  identifier baru (`selectVehicle`, `getVehicleKm`, `Tukang`, dll) semua ketemu benar di
  window/bundle, hanya 1 false-positive pra-existing yang SAMA PERSIS dengan bagian ke-1/2/3
  (komentar dokumentasi literal `data-action="..."` di `aset-emas-impor.js`, tidak disentuh sesi
  ini) — 0 masalah baru.
  **Untuk sesi berikutnya:** ✅ bagian ke-5 (TERAKHIR, rename ke `tukang-absensi.js`) sudah
  dikerjakan di sesi yang sama — lihat entri paling atas file ini. Roadmap 5-bagian ini TUNTAS.

- ✅ **[2026-07-12] Split file besar `features-tukang-kendaraan-storage.js` — bagian ke-3:
  Sparepart & Servis → `sparepart-servis.js` (build #220).**
  Lanjutan langsung dari bagian ke-1 (Chat Action) & ke-2 (Storage/Archive) di sesi yang sama.
  **Perubahan:**
  1. File baru `sparepart-servis.js` (519 baris): `servisLogMatchesCat`, `getEffectiveIntervalKm`,
     `hasIntervalOverride`, `editVehicleIntervalOverride`, `getLastServiceKm`, `matchingVehicleName`,
     `codeFromName`, `Sparepart` (kategori & stok sparepart), wrapper `autoFillSparepartCode`/
     `populateSparepartDatalist`/`openSparepartModal`/`saveSparepart`/`delSparepart`/
     `populateStockCatSelect`/`autoFillStockCode`/`openStockModal`/`saveStock`/`delStock`/
     `populateServisPartSelect`/`onServisPartChange`/`onServisItemAutofillInterval`/
     `openServisModal`, `TORSI_DB`, `findTorsiDb`, `TORSI_NM_PER_KGF/LBFT/LBIN`, `VEHICLE_SPEC_DB`,
     `findVehicleSpec`, `MY_WRENCH_SCALE`, wrapper `revertStockUsage`/`applyStockUsage`/
     `saveServis`/`deleteServisFromModal`/`delServis`/`markSparepartServiced`/
     `getLastServiceKmForCat`/`editSparepartFromReminder`/`loadMoreServisList`,
     `dashServisVehFilter`/`setDashServisVehFilter`/`goToServisFromDash` — dipindah persis
     (copy-paste, bukan ditulis ulang) dari `features-tukang-kendaraan-storage.js`.
  2. `features-tukang-kendaraan-storage.js` — kode di atas dihapus, diganti 3 pointer comment
     (di posisi asalnya masing-masing); header file diperbarui (sekarang menyebut 3 bagian yang
     sudah dipisah: Chat Action, Storage/Archive, Sparepart & Servis — sisa file cuma Tukang &
     Vehicle core). Fungsi `estimateKmPerDay`/`estimateServiceDateISO`/`estimateRpPerKm` dan blok
     Car Notes tab (`cnPeriode`/`getCnRange`/`setCnPeriode`/`startEditCurKm`/`commitCurKmEdit`) +
     wrapper BBM (`openBbmModal` dst) SENGAJA TETAP di file ini (domain Vehicle core, bukan
     Sparepart/Servis) — akan dipindah di bagian ke-4.
  3. `scripts/build.js` — `sparepart-servis.js` ditambahkan ke `GROUP_B`, tepat setelah
     `data-archive.js` & sebelum `features-aiwidget-reminder-gdrive-search.js` (yang memanggil
     `getEffectiveIntervalKm()` dari file baru ini). Tidak ada pola "assignment sebelum let/const"
     yang perlu dijaga urutannya untuk domain ini (dicek: semua identifier baru murni
     function/const/let yang tidak di-reset via bare assignment dari file lain).
  4. `tests/servis-calc.test.js` — `loadVehicleHelpers()` diupdate untuk `loadSource([...])` dari
     KEDUA file (`features-tukang-kendaraan-storage.js` + `sparepart-servis.js`), karena
     `servisLogMatchesCat`/`getEffectiveIntervalKm`/`hasIntervalOverride`/`getLastServiceKm` yang
     dites di situ sekarang ada di file baru (fungsi `estimateKmPerDay`/`estimateServiceDateISO`
     yang dites di file yang sama tetap di file lama, jadi kedua file tetap perlu di-load
     bersamaan). `tests/torsi-calc.test.js`/`tests/estimate-rp-per-km.test.js` TIDAK perlu diubah
     (masing-masing sudah/tetap tidak meng-load `features-tukang-kendaraan-storage.js` untuk
     fungsi yang dipindah).
  **Diverifikasi:** `node --test tests/*.test.js` → 1106/1106 pass (sama persis sebelum & sesudah);
  `node scripts/build.js` → sukses, versi #220, `node --check` kedua bundle valid, `FILE-MAP.md`
  ter-generate ulang (58 file); smoke-test browser (Playwright + Chrome headless dari cache
  Puppeteer) → 0 `pageerror`, identifier baru (`Sparepart`, `Servis`, `findVehicleSpec`,
  `servisLogMatchesCat`, `getEffectiveIntervalKm`, dll) semua ketemu benar di window/bundle, hanya
  1 false-positive pra-existing yang SAMA PERSIS dengan yang dicatat di bagian ke-1/ke-2 (regex
  `smoke-test.js` salah mendeteksi komentar dokumentasi literal `data-action="..."` di
  `aset-emas-impor.js`, file yang tidak disentuh sesi ini) — 0 masalah baru.
  **Untuk sesi berikutnya:** lanjutkan bagian ke-4 (Vehicle core → `vehicle-core.js`), ke-5
  (Tukang → `tukang-absensi.js`, sisa terakhir).

- ✅ **[2026-07-12] Split file besar `features-tukang-kendaraan-storage.js` — bagian ke-2:
  Storage/Archive → `data-archive.js` (build #219).**
  Lanjutan langsung dari bagian ke-1 (Chat Action, di atas) di sesi yang sama.
  **Perubahan:**
  1. File baru `data-archive.js` (160 baris): `STORAGE_QUOTA_ESTIMATE`, `STORAGE_BIG_MODULES`,
     `byteSize()`, `fmtBytes()`, `ARCHIVE_MODULES`, `archiveSelectedYears`, `archiveExportedYears`,
     `archiveGetYear()`, `archiveAvailableYears()`, `openArchiveModal()`, `toggleArchiveYear()`,
     `archiveCollectByYears()`, `updateArchivePreview()`, `archiveExportStep()`,
     `archiveDeleteStep()` — dipindah persis dari `features-tukang-kendaraan-storage.js`.
  2. `features-tukang-kendaraan-storage.js` — kode di atas dihapus, diganti pointer comment;
     header diperbarui lagi (sekarang menyebut kedua bagian yang sudah dipisah).
  3. `scripts/build.js` — `data-archive.js` ditambahkan ke `GROUP_B` setelah `chat-action.js`.
     Beda dengan `chat-action.js`, domain ini TIDAK punya pola "assignment sebelum let" (dicek:
     tidak ada file lain yang nge-reset `archiveSelectedYears`/`archiveExportedYears` via bare
     assignment), jadi secara teknis boleh diletakkan di posisi manapun di `GROUP_B` asal sebelum
     `features-sheets-pwa-selftest.js` (yang memanggil `archiveAvailableYears()`/
     `archiveCollectByYears()` di self-test-nya) — tetap diletakkan berdekatan untuk keterbacaan.
  **Diverifikasi:** `node --test tests/*.test.js` → 1106/1106 pass; `node scripts/build.js` →
  sukses, versi #219, `FILE-MAP.md` ter-generate ulang (57 file); smoke-test browser → hasil
  identik dengan verifikasi bagian ke-1 (`domChecked`/`actionChecked` sama persis, hanya 1
  false-positive pra-existing yang sudah dicatat, 0 masalah baru).
  **Untuk sesi berikutnya:** lanjutkan bagian ke-3 (Sparepart+Servis → `sparepart-servis.js`),
  ke-4 (Vehicle core → `vehicle-core.js`), ke-5 (Tukang → `tukang-absensi.js`, sisa terakhir).

- ✅ **[2026-07-12] Split file besar `features-tukang-kendaraan-storage.js` (1794 baris) — bagian
  ke-1: Chat Action → `chat-action.js` (build #218).**
  Konteks: `PEMISAHAN-FILE-ROADMAP.md` lama sudah diarsipkan (basi total, lihat catatan 2026-07-11
  bagian ke-12), jadi TIDAK ada roadmap eksplisit untuk file ini. File ternyata isinya campuran
  5 domain tak berkaitan (headernya sendiri stale/salah, sudah diperbaiki di sesi ini): Tukang
  (absensi/payroll), Vehicle core (CRUD/KM/Pajak/SIM/reminders), Sparepart+Servis (+TORSI_DB/
  VEHICLE_SPEC_DB), Storage/Archive (arsip & hapus data lama), dan Chat Action (parsing blok
  `[[ACTION]]` dari AI Chat — SAMA SEKALI tidak terkait 4 domain lain). Rencana: pisah bertahap
  5 domain, dimulai dari yang paling tidak berkaitan (Chat Action) ke yang paling berkaitan
  (Tukang), tiap tahap diverifikasi `npm test` + `npm run build` + smoke-test browser sebelum
  lanjut ke tahap berikutnya.
  **Perubahan bagian ke-1:**
  1. File baru `chat-action.js` (61 baris): `chatInited`, `_pendingChatActions`,
     `chatActionSummary()`, `_repairLooseJson()`, `extractChatAction()`, `chatActionInnerHTML()`
     — dipindah persis (copy-paste, bukan ditulis ulang) dari `features-tukang-kendaraan-storage.js`.
  2. `features-tukang-kendaraan-storage.js` — kode di atas dihapus, diganti komentar
     `/* moved to chat-action.js: ... */`; header file (baris 1-3) diperbaiki (deskripsi lama
     "Dana darurat, keuangan/laporan/grafik, budget..." sudah tidak sesuai isi sama sekali —
     kemungkinan sisa copy-paste basi dari sesi split lain; diganti deskripsi akurat + catatan
     bagian mana yang sudah dipisah).
  3. `scripts/build.js` — `chat-action.js` ditambahkan ke `GROUP_B`, tepat setelah
     `features-tukang-kendaraan-storage.js` & sebelum `features-aiwidget-reminder-gdrive-search.js`
     (WAJIB di antara keduanya: harus setelah `features-helpers-global-security.js` yang reset
     `chatInited=false` via assignment biasa sebelum `let chatInited` dideklarasikan, dan harus
     sebelum file yang baca/tulis `chatInited`/`_pendingChatActions`/panggil
     `chatActionInnerHTML`/`extractChatAction`).
  **Diverifikasi:**
  - `node --test tests/*.test.js` → 1106/1106 pass (sama persis sebelum & sesudah — tidak ada
    test yang di-load lewat nama file lama utk fungsi-fungsi ini, jadi tidak ada test yang perlu
    diupdate path-nya).
  - `node scripts/build.js` → sukses, versi naik ke #218, `node --check` kedua bundle valid,
    `FILE-MAP.md` ke-generate ulang otomatis (56 file, naik dari 55; `chat-action.js` muncul benar
    dengan 6 identifier-nya).
  - Smoke-test browser (Playwright + Chrome headless dari cache Puppeteer): ditemukan 1 "masalah"
    tapi **bukan regresi dari split ini** — regex `smoke-test.js` salah mendeteksi komentar
    dokumentasi literal `data-action="..."` di `aset-emas-impor.js` (file yang TIDAK disentuh sesi
    ini) sebagai referensi `data-action` asli. Ini bug pra-existing di `smoke-test.js` sendiri
    (false-positive dari regex-nya), di luar scope sesi ini — dicatat di bagian "BELUM DIKERJAKAN"
    di bawah. Semua identifier hasil split (6 di atas) ketemu benar di bundle, 0 `pageerror`.
  **Untuk sesi berikutnya:** lanjutkan bagian ke-2 (Storage/Archive → `data-archive.js`), lalu
  ke-3 (Sparepart+Servis), ke-4 (Vehicle core), ke-5 (Tukang, sisa terakhir).

- ✅ **[2026-07-12] Import Excel (xlsx) untuk fitur Shop — Etalase & Produsen (kw210-shop-import-xlsx, build #213).**
  Lanjutan dari fitur Export Excel (kw209) sesi yang sama — user minta fitur import juga.
  **Perubahan:**
  1. `cobek.js` — modul baru `ImportShopExcel`: pilih target (Etalase/Produsen) →pilih file .xlsx →
     baca via SheetJS (`XLSX.read`+`sheet_to_json`, header baris pertama jadi key kolom, cocok
     dengan format hasil `ShopExport`) → preview (jumlah baru vs update) → commit (match by nama,
     case-insensitive: ada → update field, belum ada → buat baru). Wrapper global:
     `openImportShopExcelModal(target)/setImportShopExcelTarget/onImportShopExcelFileChange/
     commitImportShopExcel`. SENGAJA TIDAK ada import utk Riwayat Transaksi/Pelanggan (keduanya
     derived data — transaksi riwayat & agregat pelanggan — impor mentah berisiko dobel dengan
     Keuangan/stok; hanya master data Etalase/Produsen yang aman diimpor begini).
  2. `modals.js` — modal baru `importShopExcelModal` (index MODAL_HTML[69], di-append pakai script
     Node terpisah karena isi array sangat panjang & di-generate build.js; ikuti pola array
     JSON-escaped yang sudah ada, JANGAN edit manual tanpa tool). Toggle target Etalase/Produsen +
     `<input type="file" accept=".xlsx,.xls">` + area preview + tombol commit.
  3. `index.html` — `<script>document.write(MODAL_HTML[69])</script>` ditambah setelah baris
     goldZakatModal; tombol baru "📥 Import Excel (Etalase)" & "📥 Import Excel (Produsen)" di
     tab masing-masing, di bawah tombol Export Excel yang sudah ada.
  Diverifikasi: sempat ketemu `MODAL_VERSION` di `modals.js` balik ke nilai lama setelah restore
  manual dari zip upload awal sesi (harus disamakan manual sebelum `node build.js` mau jalan —
  lihat catatan `verifyVersionConstantsSynced()` di `build.js`), sudah diperbaiki. Setelah itu:
  `node --test tests/*.test.js` 1087/1087 pass, `node build.js` sukses (semua lint guard hijau),
  `node --check` kedua bundle valid, dan test parity `document.write(MODAL_HTML[i])` index.html
  vs app_production.html juga hijau lagi. Belum ada unit test baru khusus `ImportShopExcel`.

- ✅ **[2026-07-12] Export Excel (xlsx) untuk fitur Shop — Etalase/Produsen/Riwayat/Pelanggan (kw209-shop-export-xlsx, build #212).**
  User minta bisa export data Shop (stok/etalase dll) ke file Excel.
  **Perubahan:**
  1. `cobek.js` — modul baru `ShopExport` (di akhir file): `etalaseRows()`/`produsenRows()`/
     `riwayatRows()`/`pelangganRows()` masing-masing bikin array-of-array (header+data) langsung
     dari `D` (live, bukan cache) lalu di-convert ke sheet lewat SheetJS (`XLSX.utils.aoa_to_sheet`)
     & didownload (`XLSX.writeFile`). `riwayatRows()` ikut periode aktif (`Laporan.getRange()`) biar
     konsisten sama yang lagi ditampilkan di layar. 5 wrapper function global buat `data-action`:
     `exportShopEtalaseXLSX/exportShopProdusenXLSX/exportShopRiwayatXLSX/exportShopPelangganXLSX/
     exportShopSemuaXLSX` (yang terakhir gabung ke-4 sheet dalam 1 file `.xlsx`).
  2. `index.html` — `ensureXLSX()` baru (pola sama `ensureJsPDF`/`ensureHtml2Canvas`: lazy-load
     SheetJS dari `cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js`, sudah di-whitelist
     CSP `script-src` lama, jadi TIDAK perlu ubah CSP). Tombol baru: "📤 Export Excel (Etalase)" di
     tab Etalase, "📤 Export Excel (Produsen)" di tab Produsen, "📤 Excel" di card-title Riwayat &
     Pelanggan (pola sama tombol "⚙️ Atur"/card-setting-btn yang sudah ada), plus 1 tombol
     page-level "📊 Export Semua Data Shop (Excel)" di atas tab-switcher Shop (kelihatan dari tab
     manapun).
  Diverifikasi: `node --test tests/*.test.js` 1087/1087 pass, `node build.js` sukses (semua lint
  guard hijau: u-dnone/style.display, escapeHtml, chicken-egg Tesseract), `node --check` kedua
  bundle valid. Belum ada unit test baru khusus `ShopExport` (belum sempat ditulis sesi ini) —
  kalau mau lanjutkan rangkaian coverage test module Shop, ini kandidat berikutnya.

- ✅ **[2026-07-12] Integrasi Kasir/Order dengan `priceRekoWidgetList` (kw194-kasir-order-pricereko, build #194).**
  Lanjutan dari item "Ide lanjutan yang BELUM dikerjakan" di entri OngkirCalc di bawah: widget
  "🤖 Rekomendasi Harga Jual AI" (`PriceRekoWidget`) sebelumnya HANYA kelihatan di tab Etalase —
  kasir yang checkout langsung dari tab 🧠 Kasir atau form 🛒 Transaksi Manual (Order) tidak tahu
  kalau harga jual sebuah produk sudah menyimpang jauh dari estimasi, kecuali sengaja buka Etalase
  dulu.
  **Perubahan** (`cobek.js` + `kasir.js` + `styles.css`):
  1. `PriceRekoWidget.checkOne(p)` (baru, `cobek.js`) — versi per-produk dari `scan()`, balikin
     `{reko,diffPct}` kalau produk menyimpang ≥`THRESHOLD_PCT` dari estimasi, atau `null` kalau
     wajar/belum ada Harga Beli-Jual. `scan()` di-refactor supaya reuse fungsi ini (bukan
     reimplementasi rumus 2x) — SATU sumber kebenaran rumus reko dipakai Etalase, Kasir, & Order.
  2. `Kasir.renderGrid()` — tile produk yang flagged dapat badge ⬇️/⬆️ (elemen `<button>` terpisah
     pojok kiri-atas tile, class `.kasir-tile-pricewarn`, BUKAN nempel ke `data-action` tile itu
     sendiri supaya tap badge tidak ikut nge-trigger `addToCart`) — tap badge memanggil
     `Kasir.openPriceReko(pid)` yang delegasi ke `PriceRekoWidget.openDetail()` yang sudah ada
     (buka `productModal` produk itu, auto-expand panel Rekomendasi Harga Jual).
  3. `Kasir.renderCart()` — baris keranjang yang flagged dapat hint teks kecil "Reko Etalase: RpX"
     di bawah nama produk.
  4. `Order.renderItems()` (form 🛒 Transaksi Manual lama, `cobek.js`) — baris item yang flagged
     dapat hint sama ("Reko Etalase: RpX") + link "detail →" yang memanggil
     `openPriceRekoWidgetDetail(pid)` (wrapper `PriceRekoWidget.openDetail` yang sudah ada).
  5. CSS baru `.kasir-tile-pricewarn` di `styles.css` (badge bulat kecil, posisi absolute pojok
     kiri-atas, mirror `.kasir-tile-badge` yang sudah ada di pojok kanan-atas utk qty keranjang).
  Modul `Kasir` (POS) TIDAK diubah alur checkout/`recordShopSale`-nya sama sekali — murni tambahan
  visual+link ke alur yang sudah ada, konsisten dgn rumus & UX "🔍 Detail" yang sudah dipakai widget
  Etalase.
  **Verifikasi:** 2 test baru `PriceRekoWidget.checkOne()` + 2 test baru `Order.renderItems()`
  ditambahkan ke `tests/cobek.test.js`; file test baru `tests/kasir.test.js` (12 test, `kasir.js`
  sebelumnya nol test sama sekali) mencakup badge/hint reko baru DI ATAS jalur inti Kasir
  (`renderGrid`/`renderCart`/`addToCart`/`computeTotals`/`_checkoutInner` sukses & gagal). `npm
  test` → 1059/1059 pass (naik dari 1043). `node build.js` → sukses, versi naik ke build #194.
  Belum sempat smoke-test browser (Playwright) sesi ini — perlu dicoba visual (khususnya tap badge
  ⬆️/⬇️ di tile Kasir tidak ikut nge-trigger tambah ke keranjang) sebelum dianggap 100% final, tapi
  logic inti sudah diverifikasi lewat unit test. `npm run lint` juga belum bisa dijalankan (sandbox
  tanpa akses internet).

- ✅ **[2026-07-12] Preferensi jarak/ongkos per Produsen di OngkirCalc (kw192-ongkir-produsen-pref, build #193).**
  Lanjutan dari `PriceReko`/`OngkirCalc` (kw190/191): sebelumnya tiap buka panel "📍 Hitung dari
  Jarak & Ongkir" di `productModal`, field Etape 1 (Jarak km & Ongkos/km "Ambil ke Produsen") selalu
  kosong walau produknya dari produsen yang SAMA dengan sebelumnya — padahal jarak rute ke 1 produsen
  kan tetap, cuma jumlah pcs/etape 2 (ke rumah konsumen) yang beda-beda tiap order.
  **Perubahan** (`cobek.js` + `modals.js`):
  1. `D.produsen[].jarakKm`/`.biayaPerKm` (field baru, opsional) menyimpan rute Etape 1 per produsen.
  2. `OngkirCalc.prefillFromProdusen()`: dipanggil saat panel Ongkir dibuka (`toggle()`) & saat ganti
     Produsen (`Etalase.onProdusenChange()`) — isi otomatis field jarak/ongkos KALAU kosong (tidak
     menimpa input manual yang sudah ada), plus tampilkan hint di `#ongkirProdusenPrefHint` (baru,
     di atas field Etape 1 di `modals.js`).
  3. `OngkirCalc.saveProdusenPref()`: link baru "💾 Simpan sbg rute tetap Produsen ini" di bawah
     field Etape 1 — validasi Produsen & Jarak terisi, simpan ke `D.produsen`, toast konfirmasi.
  4. Ganti Produsen di dropdown `pProdusen` sekarang RESET dulu field Etape 1 lalu isi ulang dari
     preferensi produsen yang baru dipilih (bukan nyisa dari produsen sebelumnya).
  5. `Produsen.renderList()` (tab Bisnis Shop → Produsen) menampilkan rute tersimpan (📍 X km × Rp/km)
     di baris info produsen kalau sudah ada.
  Etape 2 (Pekalongan→Rumah Konsumen) SENGAJA TIDAK disimpan per produsen karena beda-beda tiap order.
  **Verifikasi:** 12 test baru ditambahkan di `tests/cobek.test.js` (prefill kosong/ada-rute/tidak-
  menimpa-input-manual, saveProdusenPref validasi & sukses, toggle() & onProdusenChange() memanggil
  prefill). `npm test` → 1043/1043 pass (naik dari 1033, +10 di cobek.test.js karena beberapa test
  digabung). `node build.js` → sukses, versi naik ke build #193. Belum sempat smoke-test browser
  (Playwright) sesi ini — perlu dicoba visual sebelum dianggap 100% final, tapi logic inti sudah
  diverifikasi lewat unit test.
  **Ide lanjutan yang BELUM dikerjakan (dari daftar user)**: buffer % susut/pecah di kalkulasi harga
  (PriceReko/OngkirCalc belum memperhitungkan barang pecah/rusak saat transport), dan integrasi
  Kasir/Order dengan `priceRekoWidgetList` (widget rekomendasi harga di Etalase belum terhubung ke
  alur POS Kasir).

- ✅ **[2026-07-11] 2 bug dari laporan screenshot user (build v188): renderDashboard() crash
  "Cannot set properties of null (setting 'textContent')" & toast "Tombol ini belum berfungsi
  (setCobekTab)".**
  1. **Isolasi error per-card di `renderDashboard()`** (`modules-render.js`): loop
     `DASH_RENDER_ORDER` sebelumnya memanggil `cardDef.render(dashCtx)` TANPA try/catch —
     kalau SATU card melempar error (mis. data anggaran/kategori yang sudah rusak), SISA card
     setelahnya di urutan render (`laporanMini`/`fi`/`pensiun`/`absensi`/`eduFund`/`refleksi`)
     ikut TIDAK ter-render ulang sama sekali, user cuma dapat toast generik "Ada error kecil"
     dari `_friendlyErrorNotice` tanpa tahu card mana yang bermasalah. Sekarang tiap card
     dibungkus try/catch sendiri, kegagalan dicatat `console.warn` & dilewati — card lain tetap
     lanjut normal.
  2. **`Budget.renderDashMini()` diperkeras** (`features-budget-laporan-carnotes-pelanggan.js`):
     4 elemen anak (`dashBudgetUsed`/`dashBudgetLimit`/`dashBudgetPct`/`dashBudgetBar`) dulu
     diambil & langsung ditulis TANPA null-check (beda dari pola card lain, mis.
     `renderDashLaporanMini` sudah `if(!trendEl||!katEl)return;`) — inilah sumber paling
     mungkin dari "Cannot set properties of null (setting 'textContent')" yang dilaporkan user
     persis di test self-test "renderDashboard() ikut memanggil mini-card Anggaran". Sekarang
     ke-4 elemen dicek dulu sebelum ditulis, fallback `card.style.display='none'` kalau ada yang
     hilang (bukan crash).
  3. **Alias kompatibilitas mundur `setCobekTab`→`setShopTab`** (`cobek.js`): tombol tab Bisnis
     Shop di-rename dari `setCobekTab` ke `setShopTab` saat redesign Etalase (lihat entri
     redesign di atas), tapi PWA yang service worker-nya belum sempat refresh HTML (skenario:
     app dibuka offline/cache lama) masih bisa menyimpan markup LAMA dengan
     `data-action="setCobekTab"` sementara bundle JS SUDAH ter-update ke versi baru → tombol itu
     memanggil fungsi yang sudah tidak ada, persis toast "Tombol ini belum berfungsi
     (setCobekTab)" yang dilaporkan user. Source `index.html`/`app_production.html`/`cobek.js`
     saat ini SUDAH 100% pakai `setShopTab` (dicek eksplisit, tidak ada sisa `setCobekTab` di
     source) — alias ini murni jaring pengaman transisi utk kombinasi HTML-lama+JS-baru di sisi
     klien, bukan tanda ada bug rename yang belum tuntas.
  **Verifikasi:** `npm test` → 1020/1020 pass (tidak ada test lama yang berubah perilakunya).
  `node build.js` → sukses, versi naik ke build #189
  (`kw83-test-pengaturan-search-5`/`kw-cache-v189`). Direproduksi & dikonfirmasi via Playwright +
  Chrome headless: `renderDashboard()` dgn `D.budgets` terisi tidak lagi melempar error tak
  tertangani; `setCobekTab('etalase', el)` dipanggil langsung → berhasil pindah tab tanpa error
  (membuktikan alias jalan). Sisa 1 kegagalan self-test yang TIDAK terkait laporan user
  (`loadMoreBbmList` tanpa aria-label) sudah ada SEBELUM perubahan ini & bukan bagian dari 2 bug
  yang dilaporkan — belum dikerjakan di sesi ini, lihat "BELUM DIKERJAKAN" di bawah.

- ✅ **[2026-07-11] Test `filter-laporan.js`** (lanjutan daftar nol-test
  ringan→berat dari bagian ke-33 `pengaturan-search.js`; sempat tertunda
  krn cabang kerja ini fokus ke redesign Etalase dulu). File 220 baris (221
  di versi sebelum redesign Etalase — beda cuma penamaan `cobek`→`shop`:
  `#page-cobek`→`#page-shop`, `setCobekTab`→`setShopTab`,
  `cobekTabName`→`shopTabName`, fungsinya identik). Test-nya sendiri
  awalnya ditulis & diverifikasi di snapshot v174 (belum ada redesign
  Etalase), lalu di-port ke sini dgn menyesuaikan penamaan tsb — bukan
  ditulis ulang dari nol. Cakupan: filter panel Keuangan (`kf*`) & Laporan
  (`f*`) — `txMatchesFilters`/`txMatchesSearch` (murni), `getLaporanFilters`/
  `getKeuFilters`/`resetLaporanFilter`/`resetKeuFilter`/`populateCatFilter`/
  `populateKeuFilters`/`onFKatChange`/`onKfKatChange`/`toggleKeuFilter`,
  simpan/pulihkan preferensi filter ke localStorage (`saveKeuFilterPrefs`/
  `loadKeuFilterPrefsIntoDOM`, dgn guard sekali-muat `_keuFilterPrefsLoaded`),
  badge jumlah filter aktif (`updateKfBadge`), paginasi list (`loadMoreTx`/
  `loadMoreLapTx`/`resetTxPageAndRender`, debounce pencarian
  `onKfSearchInput`), navigasi antar-list dgn scroll+highlight (`goToList`,
  termasuk cabang tab Shop `etalase`/`produsen`/`riwayat`/`pelanggan` &
  Car Notes), & modal ringkasan transaksi terfilter dari 3 scope
  dashboard/keuangan/laporan dgn paginasi 100/batch (`showFilteredTx`).
  **Tidak ada bug ditemukan** — murni menambah test yg sebelumnya nol.
  `npm test` → 1020/1020 pass (naik dari 969, +51 test baru). `node
  build.js` → sukses, versi naik ke build #188, `FILE-MAP.md` diregenerasi.
  Smoke-test browser (Playwright + Chrome headless) → bersih, 0
  `pageerror`, `✅ [smoke-test] OK`; dicoba juga live: `toggleKeuFilter()`,
  `resetKeuFilter()`, `showFilteredTx('dashboard','all',...)`,
  `goToList('page-etalase',null,undefined,'etalase')` — semua jalan &
  fungsi `setShopTab` (nama baru pasca-redesign) terkonfirmasi ada &
  terpanggil dgn benar. **Daftar nol-test ringan→berat BELUM tuntas** —
  sisa (per pengecekan `loadSource([...])` di seluruh `tests/*.test.js`
  sesi ini, TAPI cek ulang lagi krn 1x sudah kejadian ada file kelewat):
  `kasir.js`, `sewakios.js`, `linktx.js`, `modal-navigasi.js`,
  `payroll-absensi.js`, `renovasi.js`, `tagihan-kalender.js`,
  `backup-restore.js`, `features-aiwidget-reminder-gdrive-search.js`.
  (`cobek.js` SUDAH punya test — ditambahkan bareng redesign Etalase;
  `features-sheets-pwa-selftest.js` SEBAGIAN tercakup lewat `extractFunction`
  di `tests/parse-angka.test.js`, belum full.) Detail teknis test & jebakan
  `vm`/`fakeDom.js` yg ditemukan: lihat `CLAUDE.md`, catatan kerja
  2026-07-11 bagian ke-34.

- ✅ **[2026-07-11] Redesign tampilan kartu produk Etalase (tab Bisnis Shop → Etalase) jadi lebih profesional.**
  Sebelumnya kartu produk pakai layout generik `.tx-item` (sama seperti baris riwayat
  transaksi biasa). Sekarang pakai layout khusus `.shop-product-card` (di `styles.css`):
  - Badge stok berwarna sesuai level: 🔴 "Menipis" (≤2 pcs), 🟡 "Terbatas" (≤5 pcs),
    🟢 "Aman" (>5 pcs), plus garis aksen warna di sisi kiri kartu.
  - Tag kategori & produsen sbg pill terpisah (bukan teks digabung dgn "·").
  - Blok harga jelas: kalau produk punya "Diskon Default %" (field `pDiskon` yang
    sudah ada di form produk), harga normal dicoret & harga final + persen diskon
    ditonjolkan warna aksen; kalau tidak ada diskon, tampil harga jual polos.
    Harga modal & harga reseller tetap sbg info sekunder di bawahnya.
  - Badge margin (nominal + persen) & tombol edit/hapus dikelompokkan rapi di kanan.
  Perubahan di `cobek.js` (`Etalase.renderList()`), `styles.css` (kelas baru
  `.shop-product-*`), dan `index.html`/`app_production.html` (wrapper `#productList`
  dapat class `shop-product-grid`). Test baru ditambahkan di `tests/cobek.test.js`
  (badge stok per level, tampilan diskon vs tanpa diskon) — total 969 test, semua
  pass. Diverifikasi visual via Playwright + Chrome headless (screenshot tab Etalase
  dgn data produk contoh, termasuk smoke-test bawaan app tetap ✅ OK). Build dijalankan
  ulang (`node build.js`) sampai versi v187, bundle `app-bundle-a/b.min.js` &
  `index.html`/`app_production.html`/`sw.js` sudah konsisten di v187.
  **Belum dikerjakan (permintaan berikutnya dari user):** redesign POS Kasir, dan
  widget AI rekomendasi harga jual/reseller yang menghitung ongkos transport
  berdasarkan rute nyata (produsen → Pekalongan → konsumen, atau ambil di rumah)
  — saat ini `PriceReko.autoFillTransport()` masih pakai rata-rata Rp/liter dari
  log BBM tanpa memperhitungkan jarak/rute.

- ✅ **[2026-07-11] `cobek.js` — test suite (102 test) disesuaikan dgn rebranding "Cobek"→"Shop".**
  Sejak v163/v164, banyak identifier/DOM-id di `cobek.js` di-rename dari
  awalan `Cobek`/`cobek` jadi `Shop`/`shop` (mis. `resolveCobekKategori`→
  `resolveShopKategori`, `recordCobekSale`→`recordShopSale`, `renderCobek`→
  `renderShop`, id `cobekList`→`shopList`, `#page-cobek`→`#page-shop`, dst
  — murni rename, TIDAK ada perubahan logika/behavior, diverifikasi lewat
  `diff` baris-per-baris). Data layer TIDAK berubah: `D.cobek`,
  `D.cobekKategori`, dan properti `cobekLinkId` tetap memakai nama lama,
  begitu juga label `subcategory:'Cobek'` di transaksi. `tests/cobek.test.js`
  diupdate mengikuti mapping rename ini (78 token diverifikasi cocok satu-
  satu ke source baru). Dijalankan via `node --test tests/*.test.js`: 966
  test, semua pass, tidak ada regresi di file lain.

- ✅ **[2026-07-11] Bug: tombol "💰 Sudah Gajian?" SELALU reset minggu SEKARANG, walau user
  lagi browse ke minggu LAMA yang pending** (build #182). Ditemukan langsung dari pertanyaan
  user "absensi pending dimana lihat & dimana konfirmnya" — ternyata notif pending (fitur
  sebelumnya) mengarahkan user ke tombol yang secara diam-diam SELALU pakai `new Date()` utk
  hitung rentang minggu, bukan minggu yang sedang ditampilkan di layar (`Payroll.weekStart`,
  diubah via panah ‹ › di atas Riwayat Absensi). Akibatnya: notif pending tidak pernah bisa
  benar-benar diselesaikan lewat tombol itu — yang ke-reset/dicatat selalu minggu sekarang
  (kosong/salah), minggu lama yang dimaksud tetap nyangkut selamanya.
  **Fix** (`reset-gaji-mingguan.js`): `openWeeklyResetManual()` sekarang pakai `Payroll.weekStart`
  (fallback ke minggu real sekarang kalau modul Payroll belum termuat) sbg target rentang minggu,
  simpan ke `_wrLastStart`/`_wrLastEnd` (baru). `confirmWeeklyReset()` pakai `_wrLastStart`/
  `_wrLastEnd` yang sudah "dikunci" saat modal dibuka (bukan hitung ulang `new Date()`) — supaya
  konsisten dgn minggu yang ditampilkan ke user & aman dari race condition tanggal berganti persis
  saat modal terbuka. `checkWeeklySalaryReset()` (prompt otomatis tiap Sabtu) tetap pakai minggu
  real sekarang seperti semula (memang scope-nya cuma minggu berjalan), tapi ikut isi
  `_wrLastStart`/`_wrLastEnd` supaya konsisten.
  **Cara pakai sekarang (untuk user):** buka 📅 Absensi & Kalkulator Gaji Harian → tab Absensi →
  pakai panah ‹ › di atas "Riwayat Absensi" utk browse ke minggu yang pending (sesuai yg disebut
  di notif ⚠️) → kalau minggu itu ada isinya, tombol "💰 Sudah Gajian? Catat & Reset Minggu Ini"
  otomatis muncul di bawah ringkasan gaji minggu itu → tap → konfirmasi di modal "Sabtu Gajian!".
  `npm test` → 821/821 pass (1 test toast text sempat berubah krn typo saya sendiri, sudah
  dikembalikan persis semula agar tidak perlu ubah test). `node build.js` → sukses, versi naik
  ke 182. Lint & smoke-test browser BELUM dijalankan sesi ini (sandbox tanpa Chrome/Playwright).

- ✅ **[2026-07-11] Fitur Absensi: field "Tambahan Lain-lain (Rp)" + notif pending bisa di-dismiss**
  (build #181). 2 temuan dari user (lewat screenshot form Absensi):
  1. Form Absensi cuma punya field "Potongan Lain-lain", tidak ada lawannya untuk nominal
     tambahan (bonus/uang makan/dsb). **Fix:** tambah field `whTambahan` (mirror field
     Potongan) di `modals.js`, dibaca & dimasukkan ke rumus total di `payroll-absensi.js`
     (`total = pokok+lembur+tambahan-potongan`, berlaku di cabang jam biasa & borongan),
     disimpan sebagai `w.tambahan` di `D.workDays`, tampil di breakdown ringkasan gaji
     mingguan & di tiap item Riwayat Absensi, dan ikut ke-load/reset saat edit/batal-edit.
  2. Notif "⚠️ Ada absensi dari N minggu sebelumnya..." di atas Riwayat Absensi cuma teks HTML
     tanpa cara ditutup — muncul terus tiap buka Absensi walau user sudah paham. **Fix:**
     tambah tombol ✕ (`Payroll.dismissPendingOldWeeksBox`) yang menyimpan `weekStart` minggu
     yang lagi ditampilkan ke `D.payrollDismissedWeeks` (baru, default `[]`, migrasi di
     `features-helpers-global-security.js`). Box notif (`renderPendingOldWeeksBox`) sekarang
     pakai `pendingOldWeeksInfoVisible()` yang memfilter minggu ter-dismiss; badge status di
     Dashboard (`renderDashMini`) TETAP pakai `pendingOldWeeksInfo()` mentah (tidak ikut
     ke-filter) supaya status asli tidak disembunyikan permanen — kalau ada minggu pending
     BARU yang menumpuk lagi, notif otomatis muncul lagi (dismiss bukan "matikan selamanya").
  **Belum ada test otomatis ditambahkan** — `payroll-absensi.js` termasuk daftar nol-test
  yang belum digarap (lihat `FILE-MAP.md`). `npm test` → 821/821 pass (tidak ada yang berubah,
  murni menambah kode baru yang belum ada test-nya). `node build.js` → sukses, versi naik ke
  181. Lint & smoke-test browser BELUM dijalankan sesi ini (sandbox tanpa Chrome/Playwright
  saat itu) — perlu diverifikasi visual sebelum dianggap 100% selesai.

- ✅ **[2026-07-11] Test `reset-gaji-mingguan.js`** (lanjutan daftar nol-test
  ringan→berat, setelah `profil-pengaturan.js`). File 86 baris: `getWeekRange`
  (rentang minggu Minggu-Sabtu), `checkWeeklySalaryReset` (deteksi hari Sabtu
  + prompt sekali sehari + filter absensi dlm rentang minggu),
  `openWeeklyResetManual` (alur reset manual dari tombol Absensi/Kalkulator
  Gaji), `confirmWeeklyReset` (konfirmasi reset + catat Pemasukan otomatis,
  dgn fallback kategori & akun). Dipakai `class FakeDate extends Date` custom
  (bukan stub objek biasa) krn source butuh `new Date()`/`new Date(x)`
  berperilaku beda tapi tetap 1 class yg sama. **Tidak ada bug ditemukan** —
  murni menambah test yg sebelumnya nol. `npm test` → 813/813 pass (naik dari
  795, +18 test baru). `node build.js` → sukses, versi naik ke build #173.
  Smoke-test browser (Playwright + Chrome headless) → bersih, 0 `pageerror`.
  Detail lengkap: lihat `CLAUDE.md`, catatan kerja 2026-07-11 bagian ke-32.
  Sisa daftar nol-test berikutnya: `filter-laporan.js` (✅ SELESAI —
  lihat entri paling atas file ini; catatan: sesi berikutnya sempat
  loncat duluan ke `pengaturan-search.js` sebelum akhirnya balik
  mengerjakan `filter-laporan.js`, urutan bukan strict berurutan).

- ✅ **[2026-07-11] Test `profil-pengaturan.js`** (lanjutan daftar nol-test
  ringan→berat, setelah `error-handler.js`/`onboarding.js` &
  `diagnostik-versi.js`). File 81 baris: `autoSaveProfile` (baca form profil,
  fallback default, field opsional dgn guard sendiri2), `profilePTKPStatus`
  vs `profileJiwaKeluarga` (2 fungsi murni serupa tapi beda aturan clamp
  tanggungan), `updateProfilPTKPPreview`, `updateUsiaPreview`,
  `selectStatusKawin`/`selectTanggungan`/`selectStatusPekerjaan` (toggle chip
  + save), `toggleApiKeyHint`. **Tidak ada bug ditemukan** — murni menambah
  test yg sebelumnya nol. `npm test` → 795/795 pass (naik dari 764, +31 test
  baru). `node build.js` → sukses, versi naik ke build #172. Smoke-test
  browser (Playwright + Chrome headless) → bersih, 0 `pageerror`. Detail
  lengkap: lihat `CLAUDE.md`, catatan kerja 2026-07-11 bagian ke-31. Sisa
  daftar nol-test berikutnya: `reset-gaji-mingguan.js`.

- ✅ **[2026-07-11] Test `error-handler.js` + `onboarding.js`** (2 file paling
  ringan dari daftar nol-test tersisa, dikerjakan duluan sesuai urutan
  ringan→berat). `error-handler.js` (37 baris): throttle toast 3 detik,
  fallback console.warn kalau `toast()` belum siap, error di dalam
  `toast()` ditangkap diam-diam, & 2 listener global (`error`/
  `unhandledrejection`) — disuntik `window`/`Date`/`console` tiruan lewat
  `extraGlobals` krn stub bawaan `loadSource()` no-op (tidak bisa
  maju-mundurkan waktu / menyimpan handler). `onboarding.js` (40 baris):
  rumus estimasi gaji bulanan & sisa kiriman (`updateOnboardPreview`),
  validasi PIN 4 digit, & alur simpan profil+PIN (`finishOnboard`).
  **Tidak ada bug ditemukan** — murni menambah test yg sebelumnya nol.
  `npm test` → 733/733 pass (naik dari 715, +18 test baru). `node build.js`
  → sukses, versi naik ke `kw80-merge-advisor-card-dashcards-42` (build
  #167), `FILE-MAP.md` diregenerasi (kedua file otomatis hilang dari daftar
  nol-test). Detail lengkap: lihat `CLAUDE.md`, catatan kerja 2026-07-11
  bagian ke-28.

- ✅ **[2026-07-11] Housekeeping dokumentasi + `FILE-MAP.md` otomatis.**
  3 hal: (1) 2 item ✅ yang kesasar di "BELUM DIKERJAKAN" dipindah ke
  "SUDAH SELESAI" (2 entri di bawah ini); (2) `PEMISAHAN-FILE-ROADMAP.md`
  yang sudah basi (nyebut file yang sudah tidak ada) dipindah ke
  `archive/PEMISAHAN-FILE-ROADMAP.md.OBSOLETE-2026-07-11.md` dgn header
  peringatan; (3) script baru `scripts/generate-file-map.js` yang
  generate `FILE-MAP.md` (peta file+ringkasan & index fungsi global→file)
  OTOMATIS dari source, dipanggil tiap `node build.js` sukses — supaya
  TIDAK PERNAH basi seperti roadmap lama. **Mulai sekarang: cek
  `FILE-MAP.md` dulu kalau mau tahu "fungsi X ada di file mana" atau
  "file Y isinya apa", sebelum grep manual.** Detail lengkap: lihat
  `CLAUDE.md`, catatan kerja 2026-07-11 bagian ke-12.
  `npm test` → 187/187 pass. `node build.js` → sukses, versi naik ke 155,
  `FILE-MAP.md` ke-generate otomatis. Smoke-test browser tetap ✅ OK, 0
  error (perubahan sesi ini murni tooling, tidak menyentuh kode runtime).

- ✅ **[2026-07-11] Sinkronisasi BBM ↔ Transaksi ↔ Car Notes** — sudah diuji
  otomatis & 1 bug nyata ditemukan+diperbaiki (field dasar catatan BBM basi
  kalau checkbox "Sinkron ke Catatan Mobil" mati saat edit transaksi).
  Detail lengkap: lihat `CLAUDE.md`, catatan kerja 2026-07-11 bagian ke-3.

- ✅ **[2026-07-11] Logic Torsi Sparepart** (katalog 60+ spesifikasi torsi
  Honda Vario 125, kalibrasi kunci torsi fisik MOLLAR MLR-B11950) — sudah
  ditambah 22 test murni-logika utk `Torsi.calcExt` (kalkulator ekstensi/
  sambungan kunci), konversi satuan, & mode checklist servis. TIDAK ada bug
  ditemukan di sesi ini — murni menambah cakupan test yg sebelumnya nol utk
  area ini. Detail lengkap: lihat `CLAUDE.md`, catatan kerja 2026-07-11
  bagian ke-4.

- ✅ **[2026-07-11] Split `transaksi.js` → `tx-list-cashflow.js`** (area
  terakhir dari roadmap split, atas permintaan eksplisit user). Pindah 9
  fungsi + 1 var state verbatim: `txHTML`, `delTx`, `changeMonth`,
  `txListPeriode`, `setTxListPeriode`, `getTxListRange`, `setPeriode`,
  `getRange`, `computeCashflowForecast`, `setKeuanganTab`. `transaksi.js`
  864 → 729 baris. Terdaftar di `GROUP_B` (`build.js`) tepat sebelum
  `transaksi.js`. Build ke versi 154.
  **Diverifikasi lewat browser (Playwright + Chrome headless):**
  - Semua fungsi ke-expose ke `window`, tidak ada yang nyangkut di scope
    modul.
  - `changeMonth`, `getTxListRange`, `getRange`, `computeCashflowForecast`
    dites langsung, hasil masuk akal & tanpa error.
  - `txHTML(t)` dgn data contoh → markup benar, `data-action`
    editTx/delTx ter-escape rapi.
  - `setKeuanganTab` gonta-ganti tab Kelola↔Laporan tanpa error.
  - `delTx()` end-to-end: tambah dummy tx → hapus → array balik bersih.
  - Smoke-test internal: `✅ OK — 992 referensi getElementById() & 55
    data-action semuanya valid`, 0 `pageerror`.
  - `npm test` → 187/187 pass, 0 fail (tidak ada test yang perlu diubah).
  Detail lengkap: lihat `CLAUDE.md`, catatan kerja 2026-07-11 bagian
  ke-11. **Dengan ini seluruh roadmap split `transaksi.js` (bagian ke-5
  s/d ke-11) tuntas** — `transaksi.js` sekarang murni form Tambah/Edit
  Transaksi + beberapa fungsi kecil lintas-domain yang sengaja dibiarkan
  gabung (skala kecil, tidak layak jadi file sendiri).

- ✅ **[2026-07-11] Verifikasi browser split `tx-cobek.js` + `tx-target.js`**
  (kerjaan bagian ke-9 di sesi sebelumnya sudah lolos sintaks/unit-test,
  tapi verifikasi visual di browser belum sempat — sandbox saat itu tanpa
  Chrome/Playwright). Sesi ini punya akses Chrome
  (`/home/claude/.cache/puppeteer/chrome/...`) + Playwright global, jadi
  langsung dicek nyata (bukan cuma baca kode). **Tidak ditemukan bug** —
  murni verifikasi, tidak ada perubahan kode. Hasil:
  - `isCobekStockCatName` (di `tx-cobek.js`): dites pakai kategori Cobek
    ASLI di data (`Bisnis › Cobek`, id `sub_cb_cobek`) → `true`. Dites nama
    kategori/sub acak yang tidak nyambung → `false` (tidak asal-true).
    Dites skenario inti fitur ini (rename total nama kategori & sub jadi
    "Bisnis Kios Renovasi" / "Peralatan Rumah Tangga", TANPA ganti id) →
    tetap `true` lewat fallback id `sub_cb_cobek` — fallback rename-proof
    yang jadi alasan utama fungsi ini ada betul-betul jalan.
  - `openTargetModal`, `saveTarget`, `onTargetDanaDaruratToggle`,
    `showTargetAccountTx`, `addTarget`, `delTarget`, `onTargetAccChange`
    (semua di `tx-target.js`): semua ke-expose ke `window` (typeof
    `function`, tidak ada yang "hilang" nyangkut di scope modul). Alur
    nyata dicoba: buka modal → isi nama+nominal → `saveTarget()` → target
    baru nambah persis 1 di `D.targets` dengan field benar. Toggle "Dana
    Darurat" → hint rekomendasi muncul dengan teks & angka masuk akal.
    `delTarget()` pada target manual → tersplice bersih dari array.
  - Smoke-test internal: `✅ OK — 992 referensi getElementById() & 55
    data-action semuanya valid`, 0 `pageerror` di console selama semua
    skenario di atas.
  - `npm test` → 187/187 pass. `node build.js` → sukses, versi naik ke 153.
  **Kesimpulan: split ke-9 (Cobek + Target) bersih, tidak ada kekurangan
  atau sisa fungsi ganda/hilang.** Area terakhir yang masih menunggu split
  (belum dikerjakan) tetap "List Transaksi & Cashflow Forecast" — lihat
  item di bawah.

- ✅ **[2026-07-11] Bug: edit transaksi cicilan LAMA (histori) diam-diam menimpa jadwal
  cicilan aktif (termasuk kategori) yang dipakai buat semua pembayaran BERIKUTNYA.**
  Root cause: 1 bill cicilan (`D.bills`) dipakai bersama oleh SEMUA transaksi
  pembayarannya (semua transaksi punya `billLinkId` yang sama ke bill itu) — bill
  merepresentasikan jadwal/sisa cicilan yang LIVE, bukan snapshot 1 transaksi. Modal
  edit transaksi (`transaksi.js`) sebelumnya menyamakan "edit transaksi cicilan APAPUN
  yang tertaut" dengan "edit jadwal cicilan aktif": tiap kali user edit transaksi
  cicilan (termasuk yang sudah lama/histori, misal cuma mau betulin kategori bulan
  lalu), field jadwal (total harga/tenor/bunga/jatuh tempo/**kategori**) di bill ikut
  ditimpa ulang dari form — form itu sendiri di-prefill dari state bill yang SEKARANG,
  jadi kalau user cuma ganti kategori/catatan tanpa sadar, kategori BILL (dan semua
  cicilan berikutnya yang belum dibayar) ikut berubah diam-diam.
  **Fix:** field jadwal cicilan/langganan (total/tenor/bunga/jatuh tempo/kategori/akun
  bill) sekarang hanya disinkron ke `D.bills` kalau transaksi yang diedit adalah
  transaksi TERBARU yang tertaut ke bill itu (id transaksi terbesar di antara semua
  yang share `billLinkId` sama). Kalau bukan (transaksi lama/histori), hanya field
  transaksi itu sendiri (kategori/subkategori/akun/catatan/tanggal) yang berubah — bill
  & transaksi lain sama sekali tidak tersentuh. User dikasih toast info kalau editnya
  kena transaksi lama, mengarahkan ke 📋 Riwayat Pembayaran kalau memang mau ubah jadwal.
  Berlaku juga utk tagihan `langganan` (bukan cuma `cicilan`), karena pola sharing bill-
  nya sama persis. Build ke versi 140.
  **Diverifikasi lewat browser (Playwright + Chrome headless), skenario nyata:**
  - Buat cicilan 6x @ Rp400rb/bulan → bayar 2x lewat `markBillPaid` (real code path,
    bukan mock) → sisa tenor 3, bill masih aktif.
  - Edit transaksi PALING LAMA (transaksi ke-1, sudah lewat 2 pembayaran berikutnya):
    ganti kategori jadi "Cicilan Motor (Koreksi)" → simpan. Hasil: kategori BILL tetap
    "Cicilan Motor" (tidak berubah), transaksi lain (2 pembayaran berikutnya) sama
    sekali tidak berubah, cuma transaksi yang diedit yang kategorinya berubah. ✓
  - Edit transaksi TERBARU/aktif: ganti Total Harga jadi Rp3.000.000 (dari Rp2.400.000)
    → simpan. Hasil: `bill.totalHarga` & `bill.amount` (cicilan/bulan) ikut update
    sesuai perhitungan baru, seperti sebelumnya (perilaku yang benar tetap jalan). ✓
  - `npm test` → 103/103 pass, 0 fail. `node build.js` → sintaks bundle valid.
  - Smoke-test internal tetap bersih: `✅ OK — 992 referensi getElementById() & 55
    data-action semuanya valid`.

- ✅ **[2026-07-10] Bug: `FinCoach.dismiss` & `FinCoach.showAll` tidak ke-expose ke `window`.**
  Root cause: modul `FinCoach` (di `modules-calc.js`) tidak dimasukkan ke daftar
  `Object.assign(window,{...})` di `features-sheets-pwa-selftest.js` — beda dari
  ~40 modul lain yang sudah ada di daftar itu (kelihatan seperti human error/typo
  saat modul ini ditambahkan). Akibatnya tombol ✕ (sembunyikan insight) dan
  "Lihat semua →" di widget "🩺 Insight Cepat" Dashboard diam/toast error saat
  ditap.
  **Fix:** tambahkan `FinCoach` ke daftar `Object.assign(window,{...})`, lalu
  `node build.js` (versi naik ke 137). Diverifikasi: smoke-test internal jadi
  `✅ OK — 991 referensi getElementById() & 55 data-action semuanya valid`,
  dan klik langsung tombol dismiss di browser headless tidak lagi memicu error.

- ✅ **[2026-07-10] Saran UX: modal tidak bisa ditutup dengan tombol Escape.**
  Ditambahkan listener `keydown` global di `modal-navigasi.js` (setelah
  `openQS`/`closeQS`) yang menutup modal/overlay yang lagi terbuka saat
  Escape ditekan, dengan urutan prioritas: kalkulator popup → quick-switcher
  (`qsXxx`) → modal sistem (confirm/prompt/choice/info/pinPrompt — lewat
  resolver `_xxxAnswer` masing2 supaya `Promise` yang di-`await` tetap
  ke-resolve, bukan nge-hang) → modal fitur generik `.overlay.open` (kalau
  ada beberapa bertumpuk, pilih yang z-index tertinggi lebih dulu).
  Build ke versi 138.
  **Diverifikasi lewat browser (Playwright + Chrome headless):**
  - Modal generik (`globalSearchModal`) → Escape menutup, `open` jadi false. ✓
  - `askConfirm()` → Promise ter-resolve `false` lewat Escape, tidak hang. ✓
  - Modal bertumpuk (kalkulator di atas modal transaksi) → Escape menutup
    satu-per-satu (calc dulu, baru modal induk di Escape ke-2), bukan
    langsung menutup semua sekaligus. ✓
  - Smoke-test internal tetap bersih: `✅ OK — 992 getElementById() & 55
    data-action semuanya valid`.
  - `npm test` → 103/103 pass, 0 fail.

## BELUM DIKERJAKAN (butuh tindak lanjut di sesi berikutnya)

- Self-test "UI: elemen interaktif (data-action) yang cuma berisi ikon/emoji/tanpa teks wajib
  punya aria-label" gagal utk `<button data-action="loadMoreBbmList">` (BBM.renderList() di
  `features-budget-laporan-carnotes-pelanggan.js`, sekitar variabel `bbmMoreWrap`) — tombol
  "muat lebih banyak" ini dirender tanpa teks/aria-label. TIDAK terkait 2 bug dari screenshot
  user (sudah ada sebelum sesi ini), belum diperbaiki krn di luar scope laporan user kali ini.

- Smoke-test browser (`smoke-test.js`) melaporkan false-positive "data-action merujuk
  modul/fungsi yang TIDAK ke-expose" untuk string literal `"..."` — **SUDAH DIPERBAIKI
  2026-07-13, lihat "SUDAH SELESAI" di atas.**

_(sisanya kosong — item lama lain sudah tuntas per 2026-07-13; roadmap split
`features-tukang-kendaraan-storage.js` sudah TUNTAS 5/5 bagian, lihat "SUDAH SELESAI" di atas)_

## Cara jalanin pengecekan otomatis lagi (kalau perlu ulang dari nol)

Server statis lokal + Playwright pakai Chrome dari cache Puppeteer (karena
`npx playwright install` butuh internet & jaringan container ini biasanya
mati). Semua HARUS dalam satu pemanggilan bash (server mati kalau sesi bash
berakhir):

```bash
cd app-fixed && (python3 -m http.server 8877 > /tmp/server.log 2>&1 &)
sleep 1
node /path/ke/script-probe.js   # chromium.launch({ executablePath:
                                #   '/home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome',
                                #   args:['--no-sandbox','--disable-setuid-sandbox'] })
```

Cek smoke-test bawaan app (paling cepat & paling dipercaya untuk nangkep
`data-action` yang putus / `getElementById` yang hilang): buka
`http://localhost:8877/index.html`, tunggu ~1 detik, baca console — harus
muncul `✅ [smoke-test] OK — ... semuanya valid`. Kalau muncul
`❌ [smoke-test] Ditemukan N masalah`, itu bug nyata yang harus diperbaiki
sebelum kirim ke user.
