# Changelog — Sesi 158b: Deep-link Sub-tab Insight AI & BBM + Bugfix CN_TAB_IDX

## Konteks

Lanjutan Sesi 158 (split sub-tab Insight AI & BBM di page-carnotes).
User minta "lanjutkan" — target yang sengaja ditunda di Sesi 158: wiring
deep-link `{page:'carnotes', tab, subtab}` (Global Search/Quick
Switcher) ke 2 sub-tab baru, ikut pola `LAPORAN_SUBTAB_IDX`/
`PJK_SUBTAB_IDX` yang sudah ada di `dashboard-hub.js`. Baseline:
`kw158-carnotes-insight-bbm-subtabs-599` (`?v=599`), 381/381 test pass.

## Perubahan

**3 file source diubah:**

- `modules/dashboard-hub/dashboard-hub.js`:
  - **Bugfix ditemukan sewaktu wiring** (bukan disengaja, sudah stale
    sejak Sesi 157): `CN_TAB_IDX` sebelumnya `{bbm:0, servis:1}` — tidak
    sinkron lagi dgn urutan DOM 4-tab (insight/bbm/servis/pajak) sejak
    Sesi 157 split page-carnotes dari 2 jadi 4 tab. Efeknya cosmetic
    (pane yang tampil tetap benar krn `setCnTab()` pakai nama tab `t`,
    bukan index — tapi tombol yang di-highlight `active` salah, mis.
    target `tab:'bbm'` malah menyalakan tombol "🧠 Insight AI"). Sudah
    diperbaiki jadi `{insight:0, bbm:1, servis:2, pajak:3}`.
  - Tambah `CNI_SUBTAB_IDX`/`CNB_SUBTAB_IDX` (pola sama persis
    `LAPORAN_SUBTAB_IDX`/`PJK_SUBTAB_IDX`).
  - `dashHubNavigateToFeature()` blok `target.page === 'carnotes'`:
    tambah handling `target.subtab` utk `tab:'insight'`
    (→`setCnInsightTab()`) & `tab:'bbm'` (→`setCnBbmTab()`), pola SAMA
    PERSIS blok `keuangan`/`pajak` yang sudah ada.
- `modules/dashboard-hub/dashboard-hub-registry.js`:
  - Update komentar TAB REFERENSI § carnotes (dulu stale, cuma sebut
    `'bbm'|'servis'`, sekarang 4 tab lengkap + 2 field `subtab` baru).
  - `cn-bbm` (satu-satunya entry existing dgn `target.page:'carnotes',
    tab:'bbm'`) ditambah `subtab: 'ringkasan'` eksplisit (goTo:'bbmList'
    memang hidup di sub-tab "Ringkasan" — sebelumnya implisit default
    index 0, sekarang eksplisit ikut konvensi entry lain, mis.
    `keu-saldo-akun`).

**Sengaja TIDAK disentuh:** tidak ada registry entry baru yang goTo ke
dalam pane `rekomendasi`/`analisis` sesi ini (di luar scope — kalau nanti
ada fitur baru yang perlu deep-link ke situ, field `subtab` sudah siap
dipakai).

## Verifikasi

```
node --test tests/*.test.js
# 381/381 pass

node scripts/build.js kw158-carnotes-subtab-deeplink-cntabidx-fix-600
# ✅ Build selesai & lolos cek sintaks (node --check), ?v=600
# index.html & app_production.html identik (0 diff)
```

**ZIP:** `kw_release_sesi158b_carnotes_subtab_deeplink_v600.zip`

# Changelog — Sesi 158: Split Sub-tab Insight AI & BBM (page-carnotes)

## Konteks

Permintaan eksplisit user: tab 🧠 Insight AI dan ⛽ BBM (di dalam
page-carnotes, hasil split 4-tab Sesi 157) masih terasa panjang ke
bawah walau sudah dipecah dari halaman tunggal — beda dari tab Keuangan/
Shop yang tiap tab-nya isinya lebih sedikit. User minta dipecah lagi
jadi split sub-tab, TAPI multi-kendaraan (vehicle selector) tetap harus
kepegang di semua sub-tab. Baseline: `kw158-dashboard-hub-section-
groups-fix` (`?v=598`), 381/381 test pass.

## Perubahan

**4 file source diubah** (murni reorganisasi DOM + toggle visibility,
0 rumus/render/presenter baru — 100% reuse pola `setPjkTab()` yang
sudah ada):

- `app_production.html` / `index.html` — tab `#cnTab-insight` dipecah
  jadi 2 sub-tab bersarang (`.cni-subtab`): "📊 Ringkasan"
  (`#cniTab-ringkasan` = `vehdashWrap`/`vehinsightWrap`/`vehBriefWrap`)
  dan "🧭 Rekomendasi & Tren" (`#cniTab-rekomendasi` =
  `vehAttentionWrap`/`vehAnalyticsWrap`/`vehAutomationWrap`/
  `vehSpecCard`). Tab `#cnTab-bbm` dipecah jadi 2 sub-tab bersarang
  (`.cnb-subtab`): "📊 Ringkasan" (`#cnbTab-ringkasan` = `fuelIntelWrap`
  + stat grid + `bbmTrendCard` + tombol catat + riwayat BBM) dan
  "📈 Analisis Lanjutan" (`#cnbTab-analisis` = `fuelDashWrap`/
  `fuelCompareWrap`/`fuelTrendWrap`, ketiganya tetap default collapsed
  seperti Sesi 157). Vehicle selector + Odometer (di luar kedua tab ini)
  TIDAK disentuh sama sekali — tetap tampil di semua sub-tab.
- `styles.css` — tambah `.cni-subtabs`/`.cni-subtab` &
  `.cnb-subtabs`/`.cnb-subtab`, class BARU (bukan reuse `.cn-tab`/
  `.pjk-subtab` dst) — pola sama persis alasan class terpisah tiap
  sub-tab lain: cegah tabrakan query `#page-carnotes .cn-tab` yang
  dipakai `setCnTab()`.
- `modules/vehicle/vehicle-core.js` — tambah `setCnInsightTab(t,el)` &
  `setCnBbmTab(t,el)`, pola SAMA PERSIS `setPjkTab()`
  (`pajak-aset-ui-wrappers.js`): toggle class `active` + toggle
  `u-dnone` per pane. `renderCnTab()` TIDAK diubah — semua `render()`
  card tetap dipanggil apa adanya, terlepas sub-tab mana yang aktif.
- `self-test.js` — daftarkan 2 group baru (`#cnTab-insight`/
  `#cnTab-bbm`) di test "panel tab benar-benar terlihat", pola sama
  persis 3 entry sub-tab yang sudah ada (laporan/kelola/pajak).

**Sengaja TIDAK disentuh** (di luar scope, additive only):
`dashboard-hub-registry.js`/`dashboard-hub.js` (deep-link
`{page:'carnotes', tab, subtab}` ke sub-tab baru ini BELUM ada — kalau
mau dipakai dari Global Search/Quick Switcher, itu target sesi
berikutnya, ikut pola `LAPORAN_SUBTAB_IDX`/`PJK_SUBTAB_IDX`).

## Verifikasi

```
node --test tests/*.test.js
# 381/381 pass

node scripts/build.js kw158-carnotes-insight-bbm-subtabs-599
# ✅ Build selesai & lolos cek sintaks (node --check), ?v=599
# index.html & app_production.html identik (0 diff)
```

**ZIP:** `kw_release_sesi158_carnotes_insight_bbm_subtabs_v599.zip`

**Known Issue (masih berlaku dari sesi-sesi sebelumnya):** `npm run
lint`/esbuild tetap tidak bisa dijalankan (tanpa akses internet di
sandbox ini) — bundle hasil build TANPA minifikasi.

**Sengaja di luar scope sesi ini (next TODO):** wiring deep-link
`subtab` utk `page:'carnotes'` (Global Search/Quick Switcher) ke 4
sub-tab baru ini, ikut pola `LAPORAN_SUBTAB_IDX`/`PJK_SUBTAB_IDX` di
`dashboard-hub.js` + komentar TAB REFERENSI di
`dashboard-hub-registry.js` (saat ini masih menyebut `page:'carnotes'
-> 'bbm'|'servis'` saja, sudah stale sejak Sesi 157 — belum termasuk
`insight`/`pajak`, apalagi sub-tab baru sesi ini).

# Changelog — Sesi 156d: Konsolidasi Fuel Briefing ke Fuel Intelligence Card

## Konteks

Permintaan eksplisit user: "Fuel Briefing bisa digabung ke Fuel
Intelligence Card — dua-duanya soal BBM kendaraan aktif, tidak perlu 2
card terpisah." Ini adalah saran ke-4 yang sengaja ditunda di Sesi 156b
(lihat `docs/NEXT_SESSION.md` § TODO no. 1) — dua card memang muncul
berurutan di Dashboard Hub tab Car Notes: `#vehBriefWrap` (section "Fuel
Briefing" 1 kendaraan, diisi `VehicleDailyBrief`, TASK-151B) lalu
`#fuelIntelWrap` (Fuel Intelligence Card, diisi `FuelCard`, TASK-141),
keduanya menampilkan info BBM kendaraan aktif yang tumpang tindih.
Baseline: `kw156b-fuel-buttons-window-expose-fix-588` (`?v=589`,
375/375 test pass).

## Perubahan

**2 file source diubah** (murni presentasi, 0 rumus/skoring/engine BBM
disentuh):

- `modules/vehicle/fuel-card.js` — tambah method `_briefingHtml(vehicleId)`,
  isi persis dipindah dari `_fuelBriefHtml()` lama di
  `vehicle-daily-brief.js` (0 baris teks/urutan diubah, hanya lokasi &
  sumber vehicleId): 100% REUSE `FuelInsightEngine.getSummary(vehicleId)`
  langsung dgn `insight.vehicleId` yang SAMA dgn kendaraan yang sudah
  ditampilkan card ini (BUKAN `FuelFleetSelector` — card ini sudah scoped
  ke 1 kendaraan aktif via `curVehicleId`, jadi tidak butuh lapisan
  pemilihan fleet-wide lagi). Hasil `_briefingHtml()` disisipkan di
  `_body()` di antara baris status/rekomendasi low-confidence & baris CTA
  (📊 Lihat Detail / ⚙️ Koreksi) — satu card gabungan.
- `modules/vehicle/vehicle-daily-brief.js` — `_fuelBriefHtml()` &
  pemanggilannya DIHAPUS, beserta seluruh ketergantungan ke
  `FuelFleetSelector` (0 referensi tersisa di file ini). `#vehBriefBody`
  sekarang HANYA berisi ringkasan armada harian (jumlah kendaraan, skor
  kesehatan, reminder aktif) — pola sama persis sebelum TASK-151B.
  `FuelFleetSelector` sendiri TIDAK dihapus (masih dipakai
  `fuel-compare.js`).

**2 file test diubah:**

- `tests/vehicle-daily-brief.test.js` — ditulis ulang, hapus seluruh
  coverage section Fuel Briefing (FuelFleetSelector tidak lagi jadi
  dependency file ini); tambah 1 assertion eksplisit `_fuelBriefHtml`
  tidak lagi ada di modul.
  `tests/fuel-card.test.js` — tambah 5 test baru utk `_briefingHtml()`
  (tampil di card yang sama, insight/recommendation apa adanya, field
  kosong -> placeholder "—", `FuelInsightEngine` belum dimuat/`throw` ->
  section dilewati tanpa menggagalkan render card).

**2 file HTML (dokumentasi komentar saja, markup DOM 0 berubah):**
`index.html`/`app_production.html` — komentar di atas `#vehBriefWrap` &
`#fuelIntelWrap` diperbarui menjelaskan konsolidasi ini.

## Hasil verifikasi

```
node --test tests/*.test.js
# tests 375 / pass 375 / fail 0   (sebelum & sesudah build, 0 regresi)

node scripts/build.js kw156d-fuel-briefing-consolidation
# ✅ Build selesai & lolos cek sintaks bundle (node --check), ?v=591
# index.html & app_production.html identik (0 diff)
```

**Known Issue (masih berlaku dari sesi-sesi sebelumnya):** `npm run
lint`/esbuild tetap tidak bisa dijalankan (tanpa akses internet di
sandbox ini) — bundle hasil build TANPA minifikasi.

---



## Konteks

Bugfix di luar batch tracking, dilaporkan langsung oleh user: tombol-
tombol di seluruh area Fuel Intelligence (kartu Fuel, Fuel Dashboard,
Fuel Comparison, Fuel Trend Dashboard, modal Koreksi Bar BBM) tidak
merespons saat di-tap — tidak ada navigasi ke data, tidak ada error yang
terlihat user. Baseline: `kw156-fuel-trend-dashboard` (`?v=587`,
TASK-156, 371/371 test pass — skop test yang tersedia di ZIP kerja ini).

## Root cause

Delegasi klik global (`document.addEventListener('click', ...)` di
`modules/shared/features-helpers-global-security.js`) me-resolve
`data-action="Nama.method"` lewat `window['Nama']['method']`. Tapi
`FuelModal`, `FuelBarCorrection`, `FuelCompare`, `FuelDashboard`, dan
`FuelTrendDashboard` semua dideklarasikan pakai `const Nama = {...}` —
di JavaScript, `const`/`let` top-level HANYA membuat binding
lexical-scope, BUKAN properti `window` (beda dari `var`/`function` yang
otomatis nempel ke `window`). Akibatnya `window['FuelModal']` dst.
selalu `undefined`, delegasi klik gagal diam-diam (cuma toast singkat
"⚠️ Tombol ini belum berfungsi"), dan SEMUA tombol yang mengarah ke
kelima modul ini (📊 Lihat Detail, ⚙️ Koreksi, ⬇️ Export, chip pilih
kendaraan, sort kolom perbandingan armada) tidak pernah berfungsi sejak
awal dibuat.

Test tidak menangkap bug ini karena `loadSource()` (test helper)
memanggil fungsi langsung lewat referensi lexical (mis.
`FuelBarCorrection.selectBar()`), bukan lewat simulasi klik DOM yang
melalui jalur delegasi `data-action` yang sesungguhnya — jadi
371/371 pass tapi bug tetap ada di jalur produksi nyata.

Pola fix yang sama PERNAH diterapkan sebelumnya untuk `DashboardHub`
(`window.DashboardHub = DashboardHub;` di `dashboard-hub-search.js`) dan
`SelfRewardView` (`self-reward-view.js`) — tapi belum diterapkan lagi
untuk modul Fuel yang lebih baru.

**Catatan audit lanjutan**: pola `const Nama = {...}` + `data-action`
tanpa expose ke `window` kemungkinan juga ada di modul lain (`Budget`,
`Aset`, `Kasir`, `Etalase`, `Order`, dll — semua ditemukan lewat
`data-action="X.method"`). Belum diaudit satu-per-satu di sesi ini
(scope-nya cuma Fuel Intelligence sesuai laporan user) — kandidat kuat
utk audit menyeluruh di sesi berikutnya, lihat `docs/NEXT_SESSION.md`.

## Perubahan

**5 file diubah**, HANYA tambah 1 baris expose-window di tiap file
(0 logic lama disentuh):

- `modules/vehicle/fuel-modal.js` — `window.FuelModal = FuelModal;`
- `modules/vehicle/fuel-compare.js` — `window.FuelCompare = FuelCompare;`
- `modules/vehicle/fuel-dashboard.js` — `window.FuelDashboard = FuelDashboard;`
- `modules/vehicle/fuel-trend-dashboard.js` — `window.FuelTrendDashboard = FuelTrendDashboard;`
- `modules/vehicle/fuel-intelligence-ui.js` — `window.FuelBarCorrection = FuelBarCorrection;`

Semua pakai guard `if (typeof Nama !== 'undefined') window.Nama = Nama;`
(pola sama persis `dashboard-hub-search.js`), ditaruh tepat setelah
penutup `};` objek, di baris terakhir file — TIDAK ada mekanisme baru,
TIDAK ada perubahan urutan/logic apa pun di dalam objeknya.

Tombol bar picker (`0 Bar`/`1 Bar`/dst) di dalam modal Koreksi TIDAK
kena bug ini — tombol itu pakai `data-onclick` (bukan `data-action`),
yang di-resolve lewat `new Function('event', code)` (baca lexical scope
global, bukan lewat `window[...]`), jadi sudah berfungsi normal dari
awal.

## Regression

`npm test` → **371/371 PASS** (skop test yang tersedia di ZIP kerja
ini, sama seperti baseline `kw156-fuel-trend-dashboard`, 0 gagal).
`node build.js` → build sukses, bundle a/b lolos `node --check`,
`window.FuelModal`/`FuelBarCorrection`/`FuelCompare`/`FuelDashboard`/
`FuelTrendDashboard` terverifikasi ada di `app-bundle-b.min.js`.

Versi baru: `kw156b-fuel-buttons-window-expose-fix-587`, `?v=588`.

---

# Changelog — Sesi 156: Fuel Trend Dashboard (TASK-156)

## Konteks

Task ditetapkan Product Owner (STATUS=READY): buat
`modules/vehicle/fuel-trend-dashboard.js`, presenter only, reuse penuh
`FuelInsightEngine`/`FuelCostAnalytics`/`FuelPredictionEngine`/
`FuelMaintenanceEngine`, JANGAN bikin engine/helper baru, JANGAN storage
baru, JANGAN rumus baru, JANGAN ubah engine yang ada kecuali ditemukan
bug, register di `scripts/build.js`, render di `modules-render.js`,
refresh mengikuti `renderCnTab()` & `FuelBarCorrection.save()`, tambah
regression test. Baseline: `kw155a-fuel-export` (`?v=586`, TASK-155A,
348/348 test pass).

## Perubahan

**1 file baru**, **3 file diubah** (HANYA wiring, 0 logic engine
disentuh).

- `modules/vehicle/fuel-trend-dashboard.js` (`FuelTrendDashboard`,
  BARU) — presenter only, 0 rumus baru. Beda dari `FuelDashboard`/
  `FuelCompare` yang HANYA reuse `FuelInsightEngine.getSummary()`, modul
  ini memanggil LANGSUNG ke-4 dependency yang diminta task supaya field
  trend granular yang tidak diekspos `getSummary()` tetap 100% dibaca
  apa adanya:
  - `FuelInsightEngine.getSummary(vehicleId)` -> `healthScore` +
    `highestInsight`.
  - `FuelCostAnalytics` -> `monthlyCost()`/`yearlyCost()` (histori
    AKTUAL bulan/tahun berjalan), `projectedMonthlyCost()`/
    `projectedYearlyCost()` (proyeksi, sendiri 100% reuse
    `FuelPredictionEngine`), `averageFuelPrice()`, `refillFrequency()`.
  - `FuelPredictionEngine` -> `predictRemainingDistance()`/
    `predictNextRefuel()`/`predictMonthlyFuelUsage()`.
  - `FuelMaintenanceEngine` -> `fuelEfficiencyHealth()` (status
    degradasi + `dropPct` apa adanya)/`maintenanceRisk()`/
    `maintenanceRecommendation()`.
  - `_safeCall()` — guard `typeof` + try/catch per-dependency; 1
    dependency belum dimuat/gagal/throw TIDAK memblokir section lain.
  - Kartu menampilkan 4 section: Biaya & Frekuensi BBM (aktual vs
    proyeksi bulan/tahun, rata-rata harga, frekuensi isi), Prediksi
    (jarak tersisa, tanggal isi BBM berikutnya, proyeksi pemakaian
    bulan depan), Efisiensi & Perawatan (status km/L/Rp-per-km +
    dropPct kalau degradasi terdeteksi, risiko perawatan, rekomendasi
    teks), dan Insight Prioritas Tertinggi.
  - CTA "📊 Lihat Detail"/"⚙️ Koreksi" reuse `FuelModal.open()`/
    `FuelBarCorrection.open()` yang sudah ada (0 mekanisme baru).
  - Kendaraan aktif dikelola sendiri (`this.curVehicleId`, pola sama
    persis `FuelDashboard.curVehicleId`) — `FuelFleetSelector`/variabel
    global `curVehicleId` TIDAK disentuh. Vehicle switcher (>1
    kendaraan) & fallback "Invalid vehicle" ke kendaraan pertama, pola
    SAMA PERSIS `FuelDashboard`.
  - 0 chart/grafik visual (di luar scope task — kandidat "Chart/grafik
    visual untuk `VehicleTrendAPI.monthlyCostTrend()`" di
    `AI_TASK_QUEUE.md` tetap `BLOCKED`, menunggu keputusan produk soal
    library/bentuk chart).
- `scripts/build.js` — 1 baris registrasi `fuel-trend-dashboard.js`
  setelah `fuel-compare.js`.
- `modules/shared/modules-render.js` — 1 baris
  `FuelTrendDashboard.render()` di `renderCnTab()`, setelah
  `FuelCompare.render()` (refresh setelah transaksi BBM/servis otomatis
  lewat `renderCnTab()` yang dipanggil ulang, pola sama persis
  `FuelCard`/`FuelDashboard`/`FuelCompare`).
- `modules/vehicle/fuel-intelligence-ui.js` — `FuelBarCorrection.save()`
  dapat 1 baris refresh baru `FuelTrendDashboard.render(vid)`, pola sama
  persis refresh `FuelCard`/`FuelModal`/`FuelDashboard` di atasnya.
- `index.html`/`app_production.html` — markup `#fuelTrendWrap`/
  `#fuelTrendBody` ditambahkan IDENTIK di kedua file, tepat setelah
  `#fuelCompareWrap` (diverifikasi build).

**Test**: 1 file baru `tests/fuel-trend-dashboard.test.js` (+23 test) —
cakupan: render smoke, 0 kendaraan, `D`/`D.vehicles` tidak ada,
`FuelInsightEngine` belum dimuat, `getSummary()` `{ok:false}`/throw,
single vehicle (switcher tersembunyi), multiple vehicles (switcher +
kendaraan aktif ditandai), `switchVehicle()` delegasi ke `render()`,
invalid vehicle (fallback kendaraan pertama), biaya aktual & proyeksi
bulan/tahun + `FuelCostAnalytics` belum dimuat/`monthlyCost()`
`{ok:false}` (section lain tetap render), prediksi jarak/isi
ulang/pemakaian + `FuelPredictionEngine` belum dimuat, status efisiensi
baik vs degradasi (dropPct) + risiko perawatan + rekomendasi +
`FuelMaintenanceEngine` belum dimuat, highestInsight CRITICAL/null, CTA
reuse `FuelModal`/`FuelBarCorrection`, render ulang (pola refresh)
konsisten dgn data terbaru, dan D tidak diubah sama sekali (read-only,
presenter murni).

Build `kw156-fuel-trend-dashboard` (`?v=587`), **371/371 test pass**
(348 lama + 23 baru), dijalankan 2x (sebelum & sesudah build).
`index.html`/`app_production.html` identik (diverifikasi build).
`FuelInsightEngine`/`FuelCostAnalytics`/`FuelPredictionEngine`/
`FuelMaintenanceEngine`/`FuelFleetSelector`/`D.vehicles`/`D.bbmLogs`/
`D.servisLogs` (data & logic) TIDAK disentuh sama sekali sesi ini — 0
bug ditemukan di engine manapun, jadi 0 engine diubah (sesuai batasan
task). Detail lengkap: `AI_STATE.md` § Sesi 156.

---

# Changelog — Sesi 155A: Export Fuel Dashboard & Fuel Compare (TASK-155A)

## Konteks

Task baru dari user (STATUS=READY, diimplementasikan dari nol — sebelumnya
TIDAK PERNAH masuk repository walau sempat dibahas di chat sesi lain).
Baseline: `kw154-fuel-comparison-fleet-view` (`?v=585`, TASK-154, 323/323
test pass). Tujuan: tambah kemampuan export (HTML & JSON) untuk Fuel
Dashboard (1 kendaraan, TASK-150) dan Fuel Compare (seluruh armada,
TASK-154), presentation-only — 0 rumus/kalkulasi baru, 0 storage baru,
100% reuse `FuelInsightEngine.getSummary()` (dependency yang SUDAH dipakai
`render()` di kedua modul).

## Perubahan

**0 file baru.** 2 file diubah (`modules/vehicle/fuel-dashboard.js`,
`modules/vehicle/fuel-compare.js`) — HANYA menambah method export + 1
tombol per modul, tidak menyentuh `render()`/logic yang sudah ada selain
menambah 1 baris tombol di masing-masing.

- `modules/vehicle/fuel-dashboard.js` (`FuelDashboard`):
  - `_buildExportData(vehicleId)` — kumpulkan 1 objek data export dari
    `FuelInsightEngine.getSummary(vehicleId)` apa adanya (healthScore/
    efficiencyScore/monthlyCost/remainingDistance/maintenanceRisk/fuel/
    highestInsight). `null` kalau kendaraan tidak ditemukan di
    `D.vehicles`, `FuelInsightEngine` belum dimuat, atau `getSummary()`
    `{ok:false}`/throw ("Invalid vehicle" — tidak pernah throw ke
    pemanggil).
  - `exportVehicleJSON(vehicleId?)` — download file `.json` (isi = data
    export apa adanya). Kembalikan `{ok,data}` supaya bisa diverifikasi
    programatik tanpa membaca file yang diunduh.
  - `exportVehicleHTML(vehicleId?)` — download laporan `.html`
    standalone (inline style, self-contained — file dibuka terpisah dari
    app) dari data yang sama.
  - `_downloadFile()`/`_dateTag()`/`_slug()` — helper murni, pola download
    SAMA PERSIS `modules/shared/data-archive.js`/`backup-restore.js`
    (Blob + `URL.createObjectURL` + `<a download>` + `click()`).
  - Tombol baru "⬇️ Export" ditambahkan di `btn-row` yang sudah ada
    (sebelah "📊 Lihat Detail"/"⚙️ Koreksi"), `data-action="FuelDashboard.
    exportVehicleHTML"`.
- `modules/vehicle/fuel-compare.js` (`FuelCompare`):
  - `_buildFleetExportData()` — kumpulkan array kendaraan dari `_rows()`
    (SUDAH ADA, 100% reuse — kendaraan invalid otomatis dilewati, pola
    sama `render()`), diurutkan sesuai `this.sortKey`/`this.sortDir` yang
    sedang aktif (0 sort baru, reuse `_sortRows()`). `null` kalau "empty
    fleet" (0 kendaraan) atau "empty data" (semua kendaraan invalid).
  - `exportFleetJSON()`/`exportFleetHTML()` — kontrak sama persis versi
    single-vehicle di atas (JSON mentah vs laporan tabel HTML).
  - Tombol baru "⬇️ Export All" ditambahkan di atas baris sort header,
    `data-action="FuelCompare.exportFleetHTML"`.

**Test**: 1 file baru `tests/fuel-export.test.js` (+25 test) — cakupan:
`exportVehicleHTML()`/`exportVehicleJSON()`/`exportFleetHTML()`/
`exportFleetJSON()`, tombol Export FuelDashboard/Export All FuelCompare,
invalid vehicle, empty fleet, empty data, FuelInsightEngine belum dimuat,
Blob/URL tidak tersedia, dan verifikasi `D.vehicles` TIDAK dimodifikasi
sama sekali oleh keempat fungsi export (0 storage baru). 1 assertion lama
di `tests/fuel-dashboard.test.js` disesuaikan (jumlah tombol `btn-ghost
btn-sm` 2→3 karena tombol Export baru).

Build `kw155a-fuel-export` (`?v=586`), **348/348 test pass** (323 lama +
25 baru). `index.html`/`app_production.html` identik (diverifikasi
build). `FuelInsightEngine`/`FuelFleetSelector`/`FuelCostAnalytics`/
`FuelPredictionEngine`/`FuelMaintenanceEngine`/`D.vehicles`/`D.bbmLogs`/
`D.servisLogs` (data & logic) TIDAK disentuh sama sekali sesi ini. 0
`scripts/build.js` baris baru (0 file baru yang perlu registrasi). Detail
lengkap: `AI_STATE.md` § Sesi 155A.

---

# Changelog — Sesi 154b: Multi Vehicle Fuel Comparison (TASK-154)

## Konteks

Task baru dari user (STATUS=READY): buat comparison view untuk SEMUA
kendaraan, reuse `FuelInsightEngine`/`FuelFleetSelector`/
`FuelCostAnalytics`/`FuelPredictionEngine`/`FuelMaintenanceEngine`
existing, dengan syarat eksplisit: JANGAN ubah engine yang sudah ada,
JANGAN storage baru, JANGAN duplikasi kalkulasi, presentation only.
Menyusul langsung setelah TASK-150 (Fuel Dashboard Integration, 1
kendaraan) selesai di sesi yang sama — TASK-154 memperluas jadi
tampilan SELURUH armada sekaligus, tetap 100% reuse
`FuelInsightEngine.getSummary()` per kendaraan (0 rumus baru
dihitung ulang; `FuelCostAnalytics`/`FuelPredictionEngine`/
`FuelMaintenanceEngine` sudah 100% dibungkus lewat `getSummary()`,
tidak dipanggil langsung di modul baru ini).

## Perubahan

**1 file baru** (presenter, pola SAMA PERSIS `modules/vehicle/
fuel-dashboard.js`):

- `modules/vehicle/fuel-compare.js` (`FuelCompare`) — `render(sortKey?)`
  mengumpulkan `FuelInsightEngine.getSummary(vehicleId)` utk SETIAP
  kendaraan di `D.vehicles` (kendaraan yang `getSummary()`-nya
  `{ok:false}` dilewati, pola sama persis
  `FuelFleetSelector._candidates()`), lalu render 1 baris per
  kendaraan: nama, Fuel Health Score, Remaining Fuel, Estimated
  Distance, Monthly Fuel Cost, Fuel Efficiency, Maintenance Risk,
  Highest Priority Insight — SEMUA field dibaca apa adanya dari
  `summary`, 0 kalkulasi baru.
  - `FuelFleetSelector.selectVehicle()` (100% reuse, 0 logic
    seleksi/prioritas baru ditulis di sini) dipakai HANYA utk badge
    "⚠️ Prioritas Tertinggi" pada kendaraan dgn insight paling urgent
    fleet-wide.
  - `openVehicle(vehicleId)` — tap 1 baris kendaraan membuka
    `FuelModal.open(vehicleId)` (SUDAH ADA, TASK-141) apa adanya,
    termasuk penanganan "Invalid vehicle" (`FuelModal.open()` sendiri
    sudah toast + tidak jadi buka modal kalau vehicleId tidak
    ditemukan).
  - `setSort(key)`/`_sortRows()` — sort by Vehicle Name/Health
    Score/Monthly Cost/Remaining Fuel, tap key yang sama membalik arah
    (asc↔desc). Default: `healthScore` ASC (= Highest Health Risk ->
    Lowest, karena healthScore rendah berarti risiko tinggi). Nilai
    `null`/`undefined` selalu ditaruh di akhir hasil sort, apa pun
    arahnya.
  - Wrap `#fuelCompareWrap` disembunyikan HANYA kalau: 0 kendaraan
    sama sekali ("No vehicles"), `FuelInsightEngine` belum dimuat, atau
    `getSummary()` gagal utk SEMUA kendaraan yang dicoba ("Invalid
    vehicle" utk seluruh armada) — tidak pernah throw ke pemanggil.

**3 file diubah** (HANYA wiring, 0 logic baru):

- `scripts/build.js` — 1 baris registrasi `modules/vehicle/
  fuel-compare.js`, ditaruh setelah `fuel-dashboard.js` (dependency:
  `FuelInsightEngine`/`FuelFleetSelector`/`FuelModal` semua sudah
  dimuat sebelum titik itu).
- `modules/shared/modules-render.js` — 1 baris `FuelCompare.render()`
  ditambahkan di `renderCnTab()`, tepat di sebelah `FuelDashboard.
  render()` yang sudah ada. Karena `renderCnTab()` dipanggil ulang
  tiap ada perubahan data kendaraan (termasuk setelah transaksi
  BBM/servis tersimpan), refresh "after fuel transaction"/"after
  maintenance" otomatis terjadi lewat baris ini — 0 hook refresh baru
  ditambahkan secara terpisah.
- (tidak ada perubahan lain di file existing — `FuelInsightEngine`/
  `FuelFleetSelector`/`FuelCostAnalytics`/`FuelPredictionEngine`/
  `FuelMaintenanceEngine`/`FuelModal` TIDAK disentuh sama sekali)

**Markup HTML** (identik di kedua file, diverifikasi lewat build):

- `index.html` & `app_production.html` — `<div id="fuelCompareWrap">
  <div id="fuelCompareBody"></div></div>` ditambahkan tepat setelah
  blok `#fuelDashWrap` (Dashboard Hub, tab Car Notes).

**1 file test baru**: `tests/fuel-compare.test.js` (19 test) —
mencakup seluruh skenario regresi yang diminta: Single vehicle,
Multiple vehicles, No vehicles, Invalid vehicle, Sorting (default +
4 kunci sortable + toggle arah), Vehicle switch (`openVehicle()` ->
`FuelModal.open()`), Refresh after fuel transaction, Refresh after
maintenance, plus reuse `FuelFleetSelector` (badge prioritas).

## Hasil

- Build: `kw154-fuel-comparison-fleet-view` (`?v=585`)
- Test: `node --test tests/*.test.js` → **323/323 PASS**, 0 fail
  (+19 test baru dari 304 sebelumnya)
- `index.html` == `app_production.html`: ya (diverifikasi via
  `build.js`)
- `FuelInsightEngine`/`FuelFleetSelector`/`FuelCostAnalytics`/
  `FuelPredictionEngine`/`FuelMaintenanceEngine`/`D.vehicles`/
  `D.bbmLogs`/`D.servisLogs` (data & logic) TIDAK disentuh sama
  sekali sesi ini.

---

# Changelog — Sesi 154: Fuel Dashboard Integration (TASK-150)

## Konteks

`TASK-150 AUDIT` diberikan dulu (verifikasi source-only, mengabaikan
`AI_STATE.md`/`AI_TASK_QUEUE.md`/`CHANGELOG.md`/klaim chat sebelumnya):
mengonfirmasi seluruh 8 item checklist ("modules/vehicle/
fuel-dashboard.js", registrasi `scripts/build.js`,
`FuelDashboard.render()` dari `modules-render.js`, refresh setelah
`FuelBarCorrection.save()`, markup `#fuelDashWrap`/`#fuelDashBody` di
kedua HTML, `tests/fuel-dashboard.test.js`, regression test) memang
belum ada sama sekali di repo — hasil audit: `IN_PROGRESS`, semua 8
item hilang. Menyusul itu, task implementasi TASK-150 diberikan ulang
dgn syarat eksplisit: reuse arsitektur existing, JANGAN ubah
`FuelInsightEngine`/`FuelFleetSelector`, JANGAN storage baru, JANGAN
duplikasi kalkulasi, presentation layer only.

## Perubahan

**1 file baru** (presenter, pola SAMA PERSIS `modules/vehicle/
fuel-card.js`):

- `modules/vehicle/fuel-dashboard.js` (`FuelDashboard`) —
  `render(vehicleId?)` 100% REUSE `FuelInsightEngine.getSummary()`:
  `fuel` (currentBar/maxBar/remainingLiter/fuelPercent/reserve) utk
  gauge BBM, `healthScore` utk skor kesehatan, `highestInsight` utk
  insight prioritas tertinggi — SEMUA dibaca apa adanya, 0 rumus/skoring
  baru. CTA "📊 Lihat Detail"/"⚙️ Koreksi" reuse `FuelModal.open()`/
  `FuelBarCorrection.open()` (data-action, pola SAMA PERSIS baris CTA
  `fuel-card.js`). Switcher multi-kendaraan (`_vehicleChips()`) pola
  sama persis `renderDashServisVehChips()` (`modules-render.js`).
  Kendaraan aktif dikelola SENDIRI (`this.curVehicleId`, pola sama
  `FuelModal.curVehicleId`/`FuelBarCorrection.curVehicleId`) supaya
  `FuelFleetSelector` maupun variabel global `curVehicleId` (dipakai tab
  Car Notes) TIDAK tersentuh sama sekali. `switchVehicle(vehicleId)`
  murni delegasi ke `render()`.
  - `render()` MENYEMBUNYIKAN `#fuelDashWrap` HANYA kalau: 0 kendaraan
    sama sekali, `FuelInsightEngine` belum dimuat, atau
    `getSummary()` gagal utk kendaraan yang dicoba. `vehicleId` yang
    tidak valid ("Invalid vehicle" — mis. kendaraan sudah dihapus)
    FALLBACK ke kendaraan pertama, BUKAN menyembunyikan dashboard.

**3 file diubah** (HANYA wiring, 0 logic baru):

- `scripts/build.js` — 1 baris registrasi `modules/vehicle/
  fuel-dashboard.js`, ditaruh setelah `fuel-notif-bridge.js` (dependency:
  `FuelInsightEngine`/`FuelModal`/`FuelBarCorrection` semua sudah dimuat
  sebelum titik itu).
- `modules/shared/modules-render.js` — 1 baris `FuelDashboard.render()`
  ditambahkan di `renderCnTab()`, tepat di sebelah `FuelCard.render()`
  yang sudah ada.
- `modules/vehicle/fuel-intelligence-ui.js` — `FuelBarCorrection.save()`
  dapat 1 baris refresh baru (`FuelDashboard.render(vid)`), ditambahkan
  setelah blok refresh `FuelCard`/`FuelModal` yang sudah ada, pola sama
  persis.

**Markup HTML** (identik di kedua file, diverifikasi lewat build):

- `index.html` & `app_production.html` — `<div id="fuelDashWrap"><div
  id="fuelDashBody"></div></div>` ditambahkan tepat setelah blok
  `#fuelIntelWrap` yang sudah ada (di dalam Dashboard Hub / Car Notes).

**1 file test baru** (18 test):

- `tests/fuel-dashboard.test.js` — smoke render, no vehicle (wrap
  disembunyikan), `FuelInsightEngine` belum dimuat, `getSummary()`
  gagal (tidak throw), single vehicle (switcher tersembunyi), multiple
  vehicles (switcher + kendaraan aktif ditandai), invalid vehicle
  (fallback kendaraan pertama), remaining fuel (gauge bar/liter/
  persen + peringatan reserve + placeholder kalau `fuel` null), health
  score (warna + dilewati kalau null), highest insight (warna prioritas
  + dilewati kalau null), CTA reuse `FuelModal`/`FuelBarCorrection` (0
  class baru), refresh after refill (render ulang mencerminkan data
  baru), refresh after correction (`FuelBarCorrection.save()` memanggil
  `FuelDashboard.render(vid)`), vehicle switch (`switchVehicle()`
  memperbarui body & `curVehicleId`).

## Validasi

- Build: `node scripts/build.js kw154-fuel-dashboard-integration` — versi
  naik ke `?v=584`, sintaks kedua bundle lolos `node --check`,
  `index.html`/`app_production.html` dikonfirmasi identik oleh build
  script sendiri.
- Test: `node --test tests/*.test.js` — 304/304 pass (286 lama + 18
  baru).
- ZIP checkpoint dibuat & diverifikasi (lihat `AI_STATE.md` § Current
  Step Sesi 154 utk detail lengkap).

## Batasan yang dijaga

`FuelInsightEngine` — 0 baris diubah. `FuelFleetSelector` — 0 baris
diubah, 0 dependency baru ke situ (dashboard mengelola kendaraan
aktifnya sendiri). 0 storage baru (`FuelDashboard` tidak pernah menulis
ke `D`). 0 duplikasi kalkulasi (seluruh angka dibaca dari
`FuelInsightEngine.getSummary()` apa adanya). `reminder-notif.js`/
`FuelNotifBridge` (TASK-153) TIDAK disentuh — target klik notifikasi
masih `FuelModal`, di luar scope TASK-150 (lihat `AI_STATE.md` § Known
Blocker).

---

# Changelog — Sesi 153: Fuel Notification & Reminder (TASK-153)

## Konteks

Task baru dari user: "Integrate Fuel Intelligence with the existing
Notification system", dgn syarat eksplisit: reuse Notification Engine
existing, JANGAN buat sistem notifikasi baru, JANGAN duplikasi reminder
logic, JANGAN ubah rumus `FuelInsightEngine`, 0 storage baru. Behavior
wajib: notifikasi otomatis utk (1) fuel reserve reached, (2) fuel
efficiency drops significantly, (3) maintenance affects fuel efficiency,
(4) predicted fuel refill reminder — dan notifikasi membuka Fuel
Dashboard existing.

## Audit sebelum kode diubah

Satu-satunya "Notification Engine" di project ini adalah
`reminder-notif.js` (`fireNotif()` + `checkAndFireReminders()` + dedup
harian `kw_notif_fired` di `localStorage`) — sudah dipakai tagihan/LDR/
pajak-kendaraan/SIM/SPT (ad-hoc, baca `D` langsung) DAN servis/estimasi-
BBM kendaraan lewat `VehicleNotifBridge` (Sesi 84) — sebuah translator
murni yang HANYA menerjemahkan sinyal existing (`VehicleReminder`
severity `'overdue'`) jadi `{fireKey,title,body}`, tidak pernah memanggil
`fireNotif()`/`Notification`/`localStorage` sendiri.

`FuelInsightEngine` (TASK-149/150A) SUDAH punya seluruh 4 sinyal yang
dibutuhkan task ini — insight `reserve-fuel`/`fuel-efficiency`/
`maintenance`/`next-refuel`, masing-masing sudah punya `priority`
(CRITICAL/HIGH/MEDIUM/LOW/INFO) yang SUDAH dihitung dari
`FuelGaugeEngine`/`FuelMaintenanceEngine`/`FuelPredictionEngine` — tapi
BELUM PERNAH ditembak jadi notifikasi push. Itu satu-satunya gap yang
ditutup sesi ini.

Ditemukan juga: **TASK-150 (Fuel Dashboard Integration)**, UI-nya sendiri
masih `STOPPED`/belum dikerjakan (lihat `AI_TASK_QUEUE.md`/`AI_STATE.md`
§ Sesi 151). Satu-satunya tampilan BBM per-kendaraan yang SUDAH ADA di
aplikasi ini adalah `FuelModal` (`#fuelIntelModal`, Fuel Intelligence
Modal, TASK-141) — dipakai sbg target "existing Fuel Dashboard" task ini
(bukan dashboard baru yang dibuat sesi ini). Kalau TASK-150 dikerjakan
nanti, target klik notifikasi ini perlu diarahkan ulang.

## Perubahan

**1 file baru** (translator murni, pola SAMA PERSIS
`modules/vehicle/vehicle-notif-bridge.js`):

- `modules/vehicle/fuel-notif-bridge.js` (`FuelNotifBridge`) —
  `items(vehicleId?, firedIds?)` memanggil `FuelInsightEngine.
  getInsights(vehicleId)` APA ADANYA (0 rumus reserve/efisiensi/risiko/
  prediksi baru dihitung ulang) per kendaraan, filter ke 4 insight id yang
  "actionable" lewat `NOTIFY_RULES`:
  - `reserve-fuel` priority `CRITICAL` → *Fuel reserve reached*
  - `fuel-efficiency` priority `CRITICAL`/`HIGH` (degradationDetected) →
    *Fuel efficiency drops significantly*
  - `maintenance` priority `CRITICAL` (riskLevel `'tinggi'` — overdue
    servis relevan BBM DAN degradasi efisiensi terdeteksi BERSAMAAN,
    persis definisi *Maintenance affects fuel efficiency*)
  - `next-refuel` priority `CRITICAL`/`HIGH` (estimatedRemainingDays<=3)
    → *Predicted fuel refill reminder*

  Insight lain (`fuel-consumption`/`monthly-cost`/`prediction`, selalu
  INFO) & priority MEDIUM/LOW/INFO pada 4 insight di atas SENGAJA TIDAK
  ditembak — pola sama `VehicleNotifBridge` (hanya severity `'overdue'`
  yang aktif menembak, bukan `'due-soon'`/`'info'`) supaya notifikasi
  tetap actionable, bukan noise harian.

**2 file diubah** (HANYA wiring, 0 logic reminder baru):

- `reminder-notif.js`:
  - `fireNotif(title,body,tag,onClick)` — 1 parameter opsional BARU
    (additive, 100% backward compatible — 2 caller lama,
    `requestNotifPermission()`/`checkAndFireReminders()` blok lama, tetap
    jalan tanpa perubahan) supaya klik notifikasi bisa jalankan aksi.
  - `checkAndFireReminders()` — 1 blok baru (pola SAMA PERSIS blok
    `VehicleNotifBridge` yang sudah ada tepat di atasnya) yang panggil
    `FuelNotifBridge.items(undefined, fired.ids)`, tembak tiap item lewat
    `fireNotif()` yang SAMA (0 mekanisme dedup baru — `kw_notif_fired`
    yang SUDAH ADA dipakai apa adanya), `onClick` memanggil
    `FuelModal.open(vehicleId)` (guard `typeof`, aman kalau `FuelModal`
    belum dimuat).
- `scripts/build.js` — 1 baris baru, daftarkan
  `modules/vehicle/fuel-notif-bridge.js` tepat setelah
  `fuel-fleet-selector.js`.

```js
function fireNotif(title,body,tag,onClick){
if(!('Notification' in window)||Notification.permission!=='granted')return;
try{
const n=new Notification(title,{body,tag,renotify:!!tag});
n.onclick=()=>{window.focus();n.close();if(typeof onClick==='function'){try{onClick();}catch(e){console.warn('Gagal jalankan aksi klik notifikasi:',e);}}};
}catch(e){console.warn('Gagal kirim notifikasi:',e);}
}
```

```js
if(typeof FuelNotifBridge!=='undefined'&&typeof FuelNotifBridge.items==='function'){
FuelNotifBridge.items(undefined,fired.ids).forEach((n)=>{
fireNotif(n.title,n.body,n.fireKey,()=>{if(typeof FuelModal!=='undefined'&&typeof FuelModal.open==='function')FuelModal.open(n.vehicleId);});
fired.ids.push(n.fireKey);
});
}
```

## Tidak diubah

0 rumus `FuelInsightEngine`/`FuelGaugeEngine`/`FuelPredictionEngine`/
`FuelMaintenanceEngine` disentuh, 0 storage baru dibuat, 0 sistem
notifikasi baru (100% reuse `Notification` browser API + `fireNotif()` +
`kw_notif_fired`), 0 reminder logic diduplikasi (`FuelNotifBridge` murni
translator, sama seperti `VehicleNotifBridge`).

## Hasil verifikasi

```
node --test tests/*.test.js
# 286/286 pass (0 fail) — +11 test baru tests/fuel-notif-bridge.test.js
#   (reserve notification CRITICAL vs INFO, efficiency warning
#   CRITICAL/HIGH vs MEDIUM/LOW/INFO, maintenance reminder CRITICAL vs
#   MEDIUM/LOW, prediction reminder CRITICAL/HIGH vs MEDIUM/LOW, insight
#   tipe lain tidak pernah ditembak, no duplicate notifications via
#   firedIds, vehicle switch/filter per kendaraan + multi-kendaraan,
#   kendaraan tanpa insight valid dilewati tanpa menggagalkan kendaraan
#   lain, kendaraan tanpa id dilewati, FuelInsightEngine belum dimuat,
#   0 kendaraan)

node scripts/build.js kw153-fuel-notification-reminder
# ✅ Build selesai & lolos cek sintaks bundle (node --check), ?v=583
#   (naik dari ?v=582)
# index.html & app_production.html identik (0 diff)
# grep app-bundle-b.min.js: FuelNotifBridge terdaftar

node --test tests/*.test.js   # ulang setelah build, tetap 286/286 pass
```

Checkpoint ZIP: `kw_release_sesi153_fuel-notification-reminder_v583.zip`.

---

# Changelog — Sesi 152: Fuel Finance Integration (TASK-152)

## Konteks

Task baru dari user: "Integrate Fuel Intelligence with the Finance
module. Every fuel transaction should automatically enrich Fuel Analytics
without creating duplicate transactions", dgn syarat eksplisit: TIDAK
boleh ada transaksi kedua, TIDAK boleh duplikat riwayat keuangan, TIDAK
mengubah record historis, TIDAK redesign UI, TIDAK mengubah rumus
`FuelInsightEngine`, wajib reuse arsitektur yang sudah ada (Finance
transaction engine, `FuelCostAnalytics`, `FuelInsightEngine`,
`FuelPredictionEngine`, `FuelMaintenanceEngine`, `FuelFleetSelector`).

## Audit sebelum kode diubah

Ditemukan bahwa SEBAGIAN BESAR requirement task ini **sudah terpenuhi**
dari sesi-sesi sebelumnya (149-151B), 0 gap besar:

- **Tidak ada transaksi ganda**: `tx-bbm.js` (`recordBbmLog()`) +
  `car-notes.js` (`BBM._saveInner()`) SUDAH menghubungkan 1 transaksi
  Finance (`D.transactions`) <-> 1 log BBM (`D.bbmLogs`) via
  `txLinkId`/`bbmLinkId`, baik dari form Transaksi umum (centang "Sinkron
  BBM") maupun modal "Catat Isi BBM" khusus Car Notes. Edit tidak pernah
  membuat baris baru (`Object.assign` di tempat), hapus menghapus
  keduanya sekaligus (tidak ada log/transaksi yatim).
- **Refresh tanpa reload**: `renderCnTab()` (SUDAH ADA, dipanggil dari
  `_saveTxInner()`/`BBM._saveInner()`/`delTx()`/`BBM.del()`) SUDAH
  merender ulang `FuelCard` (Fuel Dashboard) dan `VehicleDailyBrief`
  (AI Daily Briefing per-kendaraan, TASK-151B) begitu transaksi BBM
  tersimpan — Fuel Analytics (`FuelAnalytics.render()`, dalam
  `FuelModal`) sendiri selalu baca `D` langsung tiap dibuka, jadi otomatis
  konsisten tanpa perlu push refresh terpisah.

## GAP yang ditemukan & ditutup

Satu inkonsistensi: jalur `_saveTxInner()` (`transaksi.js`, transaksi
umum) SUDAH memancarkan `AIBus.emit("finance.updated", {...})` tiap
transaksi tersimpan (dipakai `AIService.wireEvents()` -> `AIDecision.
decide()`, SUDAH ADA sejak Smart Delivery Engine), TAPI jalur
`BBM._saveInner()` (`car-notes.js`, modal "Catat Isi BBM" — jalur UTAMA
user mencatat BBM dari Car Notes) **tidak pernah** memancarkan event yang
sama. Akibatnya AI Decision/Service tidak pernah "tahu" ada transaksi BBM
baru kalau user mencatatnya lewat Car Notes, bukan lewat form Transaksi
umum — padahal keduanya sama-sama "fuel transaction tersimpan".

## Perubahan

Satu file diubah: `car-notes.js`. Tepat 1 baris baru ditambahkan setelah
`save();closeModal('bbmModal');renderCnTab();renderDashboard();
renderKeuangan();` yang SUDAH ADA di akhir `BBM._saveInner()`:

```js
if(typeof AIBus!=="undefined")AIBus.emit("finance.updated",{txId,category:resolveVehicleTxCategory(veh),type:'expense',amount:cost,kind:'bbm'});
```

Payload bentuk dasarnya (`txId`/`category`/`type`/`amount`) SAMA PERSIS
pola `_saveTxInner()` di `transaksi.js` — tambahan `kind:'bbm'` (pola
sama dgn `kind:"cicilan-baru"`/`"langganan"` yang sudah dipakai
`transaksi.js` sendiri) supaya listener bisa membedakan asal event kalau
perlu, tanpa mengubah bentuk dasar payload yang sudah dikonsumsi
`AIService`. Guard `typeof AIBus!=="undefined"` (pola sama persis semua
pemanggilan `AIBus.emit` lain di project ini) — kalau `AIBus` belum
dimuat, `BBM._saveInner()` tetap jalan normal, tidak throw.

**TIDAK ADA transaksi kedua ditambahkan, TIDAK ADA riwayat keuangan
diduplikasi, TIDAK ADA record historis diubah, TIDAK ADA UI di-redesign,
`FuelInsightEngine`/`FuelCostAnalytics`/`FuelPredictionEngine`/
`FuelMaintenanceEngine`/`FuelFleetSelector` TIDAK disentuh sama sekali** —
murni 1 baris pemancar event, reuse `AIBus` yang sudah ada apa adanya.

## Test baru

+7 test baru `tests/tx-bbm-finance-integration.test.js`:
single fuel transaction (1x simpan -> 1 transaksi + 1 log, saling
terhubung), multiple fuel transactions (2x simpan -> 2 transaksi + 2 log,
tidak silang), finance edit (edit log existing -> transaksi lama
di-update di tempat, TIDAK ada baris baru), dashboard/AI daily brief
refresh (`renderCnTab`/`renderDashboard`/`renderKeuangan` terpanggil),
`AIBus.emit("finance.updated")` terpancar 1x per simpan (2x utk 2x
simpan, tidak digabung/di-debounce) dgn payload yang benar, dan guard
`AIBus` belum dimuat (tidak throw).

Build `kw152-fuel-finance-integration` (`?v=582`, naik dari `?v=581`).
Test naik dari 268 ke 275 pass (2x — sebelum & sesudah build).

## Hasil verifikasi

```
node --test tests/*.test.js
# 275/275 pass (268 lama + 7 baru, 0 regresi)

node scripts/build.js kw152-fuel-finance-integration
# ✅ Build selesai & lolos cek sintaks bundle (node --check), ?v=582
# index.html & app_production.html identik (0 diff)
```

---



## Konteks

Menutup TASK-151 (Sesi 151, `STOPPED`) sekarang gap-nya (pemilihan
kendaraan) sudah ditutup TASK-151A (`FuelFleetSelector.selectVehicle()`).
Task ini murni WIRING presentasi — mengintegrasikan `FuelFleetSelector`
ke `VehicleDailyBrief` (AI Daily Briefing kendaraan yang sudah ada,
`modules/vehicle/vehicle-daily-brief.js`, container `#vehBriefBody`).

## Perubahan

Satu file diubah: `modules/vehicle/vehicle-daily-brief.js`. Method baru
`_fuelBriefHtml()` + dipanggil dari `render()` (append ke `innerHTML`
yang sudah ada, container/mekanisme render TIDAK berubah). Alur:

1. Panggil `FuelFleetSelector.selectVehicle()` — **satu-satunya** sumber
   pemilihan kendaraan (`FuelFleetSelector` TIDAK disentuh). Kalau `null`
   (tidak ada insight sama sekali) atau modul belum dimuat, section Fuel
   TIDAK ditambahkan (rule task #3) — silent, bukan error/empty-state.
2. Kalau ada hasil, tampilkan **satu** briefing Fuel dari `summary`/
   `insight` (= `summary.highestInsight`) apa adanya: nama kendaraan
   (lookup by-id TAMPILAN saja, id sudah final dari selector — 0 logic
   seleksi baru), Fuel Health (`healthScore`), Sisa BBM (`fuel.
   remainingLiter`/`fuelPercent`), Estimasi Jarak Tersisa
   (`remainingDistance`), Biaya BBM Bulanan (`monthlyCost`, format via
   `fmt()` global SUDAH ADA), Risiko Perawatan (`maintenanceRisk`),
   insight prioritas tertinggi (`insight.title`/`description`), dan
   Rekomendasi — **`insight.recommendation` dipakai LANGSUNG**, 0 kalimat
   rekomendasi baru disusun (rule task "Never generate new
   recommendations").
3. `FuelFleetSelector.selectVehicle()` dibungkus `try/catch` (presenter
   tidak pernah throw ke pemanggil) — kendaraan invalid/`getSummary()`
   gagal sudah ditangani `FuelFleetSelector` sendiri (balikin `null`),
   di sini cuma jaga-jaga tambahan.

0 rumus/skoring/logic prioritas/logic seleksi kendaraan baru ditulis di
sini — murni presentasi dari data yang `FuelFleetSelector`/
`FuelInsightEngine` SUDAH sediakan. `FuelInsightEngine` dan
`FuelFleetSelector` **TIDAK disentuh sama sekali**. `UnifiedAIBriefing`
(briefing finance+vehicle gabungan, `modules/cross/unified-ai-briefing.js`)
juga TIDAK disentuh — integrasi ditaruh di `VehicleDailyBrief` (briefing
level kendaraan, tempat paling natural utk data per-kendaraan seperti
BBM) supaya tidak perlu mengubah bentuk/arsitektur briefing gabungan yang
levelnya tetap fleet-wide. 0 storage baru, 0 UI/container baru
(`#vehBriefBody` yang sudah ada dipakai apa adanya).

+8 test baru `tests/vehicle-daily-brief.test.js` (tanpa kendaraan
terpilih -> tidak ada section Fuel, kendaraan terpilih -> section tampil
dgn nama, highest insight rendering, recommendation rendering reuse apa
adanya, invalid vehicle/`selectVehicle()` throw -> tidak menggagalkan
render, empty history -> field kosong jadi placeholder tanpa error,
`FuelFleetSelector` belum dimuat -> section dilewati, 0 kendaraan armada
-> body dikosongkan). Build `kw151-fuel-ai-daily-briefing-integration`
(`?v=581`, naik dari `?v=580`). Test naik dari 260 ke 268 pass (2x —
sebelum & sesudah build).

---

# Changelog — Sesi 151A: Fuel Fleet Brief Selector (TASK-151A)

## Konteks

Menutup gap TASK-151 (Sesi sebelumnya, `STOPPED`): pipeline "AI Daily
Briefing" yang ada beroperasi fleet-wide, sedangkan `FuelInsightEngine.
getSummary()`/`getInsights()` wajib 1 `vehicleId`. Tidak ada mekanisme
"kendaraan mana yang diceritakan" — TASK-151A diminta khusus utk
menyediakan selector-nya (murni pemilihan kendaraan, bukan wiring ke
briefing itu sendiri).

## Perubahan

Modul BARU `modules/vehicle/fuel-fleet-selector.js` (`FuelFleetSelector`)
— presentation helper only, 0 UI, PURE (read-only, tidak pernah panggil
`save()`). API publik tunggal:

- **`selectVehicle()`** -> `{ok:true, vehicleId, summary, insight}` atau
  `null` kalau tidak ada satu pun kendaraan dgn insight (0 kendaraan /
  seluruh kendaraan invalid / seluruh kendaraan tanpa insight).

100% REUSE:
- `FuelInsightEngine.getSummary(vehicleId)` (TASK-149/150A) per kendaraan
  — `summary.highestInsight` (sudah diurutkan prioritas oleh
  `FuelInsightEngine` sendiri via `getInsights()`, TASK-150A) dipakai apa
  adanya sbg insight prioritas tertinggi kendaraan itu, 0 logic sortir
  insight baru ditulis di modul ini.
- `curVehicleId` (global SUDAH ADA sejak lama, `modules/shared/
  features-helpers-global-security.js` — sudah dipakai sbg "kendaraan
  aktif" di `fuel-card.js`/`fuel-modal.js`/`fuel-intelligence-ui.js`/
  `vehicle-core.js` dst) sbg tie-breaker "active/current vehicle" — TIDAK
  ADA state/field baru dibuat utk konsep ini.

Logic baru (sesuai requirement task, bukan kalkulasi bisnis): (1) iterasi
`D.vehicles`, kumpulkan `highestInsight` tiap kendaraan valid; (2)
bandingkan level prioritas (CRITICAL->HIGH->MEDIUM->LOW->INFO, urutan
teks dari task) cari kandidat teratas; (3) kalau seri, pilih
`curVehicleId` kalau termasuk kandidat seri, else kandidat pertama sesuai
urutan `D.vehicles` (deterministik, bukan tebakan acak). Kendaraan
invalid/tanpa insight/`getSummary()` yang throw dilewati (tidak
menggagalkan seleksi kendaraan lain), `selectVehicle()` sendiri tidak
pernah throw ke pemanggil.

`FuelInsightEngine` DAN AI Briefing (`UnifiedAIBriefing`/
`VehicleDailyBrief`) **TIDAK disentuh sama sekali** sesuai batasan task —
modul ini murni menyiapkan `vehicleId` terpilih; wiring nyata ke briefing
TETAP di luar scope TASK-151A, menunggu task lanjutan eksplisit.

1 file baru, 1 baris registrasi di `scripts/build.js` GROUP_B (setelah
`fuel-insight-engine.js`). +13 test baru
`tests/fuel-fleet-selector.test.js` (priority selection penuh
CRITICAL->INFO, tie-breaker `curVehicleId` termasuk/tidak termasuk
kandidat seri, `curVehicleId` undefined, 0 kendaraan, `D`/`D.vehicles`
tidak ada, seluruh kendaraan tanpa insight, `FuelInsightEngine` belum
dimuat, kendaraan invalid dilewati, seluruh kendaraan invalid, entri
tanpa `id`, `getSummary()` throw utk 1 kendaraan tidak menggagalkan
kendaraan lain). Build `kw151a-fuel-fleet-brief-selector` (`?v=580`, naik
dari `?v=579`). Test naik dari 247 ke 260 pass (2x — sebelum & sesudah
build).

---

# Changelog — Sesi 151: Fuel AI Daily Briefing Integration (TASK-151) — STOPPED

## Konteks

TASK-151 minta `FuelInsightEngine` diintegrasikan ke "Existing AI Daily
Briefing" (natural-language summary saja, presentation only, dilarang
menghitung/redesign UI/bikin storage). Audit sebelum menulis kode
menemukan pipeline briefing yang ADA (`UnifiedAIBriefing.generate()` +
`VehicleDailyBrief.render()`) 100% fleet-wide (baca `VehicleAIHook.
fleetSummary()`/`UnifiedSummaryAPI.summary()`, agregat SELURUH
kendaraan), sedangkan `FuelInsightEngine.getSummary(vehicleId)`/
`getInsights(vehicleId)` wajib 1 `vehicleId` spesifik — tidak ada varian
agregat di engine ini. Tidak ada mekanisme "kendaraan mana yang tampil di
briefing" yang sudah ada di pipeline manapun.

## Keputusan

Sesuai instruksi "IMPORTANT" di task sendiri ("If AI Briefing requires
changes outside presentation, STOP. Report the dependency."): task
di-STOP. Memilih kendaraan mana yang diceritakan (kendaraan pertama? semua
kendaraan? insight paling kritis lintas-armada?) adalah keputusan bentuk
tampilan/produk, bukan presentasi murni — akar masalah yang sama dgn
kandidat lama `BLOCKED` #1 di `AI_TASK_QUEUE.md` ("Wiring VehicleAIHook ke
AI Daily Briefing", alasan identik: "Belum ada keputusan produk soal
bentuk tampilan di briefing").

## Perubahan

**0 file diubah.** Tidak ada kode, test, atau build baru sesi ini — versi
tetap `?v=579`, 247/247 test tetap hijau apa adanya dari Sesi 150A.
Dicatat `STOPPED` di `AI_TASK_QUEUE.md` § Task selesai + `AI_STATE.md`
§ Sesi 151 (detail lengkap gap & opsi keputusan yang ditunggu dari user).

---

# Changelog — Sesi 150A: Expand FuelInsightEngine Summary API (TASK-150A)

## Konteks

TASK-150 (Fuel Dashboard Integration) mengaudit `FuelInsightEngine` sebelum
wiring UI dan menemukan gap: `getSummary()` belum mengekspos data numerik
terstruktur (liter/bar/persen/reserve) yang dibutuhkan utk render Fuel
Gauge + Remaining Fuel — hanya tersedia sbg teks prosa di dalam
`description` insight. Karena rule task "Dashboard hanya boleh konsumsi
`FuelInsightEngine`" DAN "Jangan ubah engine existing" saling bertentangan
kalau gap ini tidak ditutup dulu, TASK-150 di-STOP & gap dilaporkan —
lihat catatan STOP di `AI_PROGRESS.md`/riwayat sesi ini. TASK-150A dibuat
khusus menutup gap tsb (murni expand API, **0 UI, 0 Dashboard, 0 AI**).

## Perubahan

`modules/vehicle/fuel-insight-engine.js` — **HANYA** `getSummary()` yang
diubah (method lain tidak disentuh). 2 field baru di-APPEND di akhir
object return (field lama TIDAK diganti nama/nilai — 100% backward
compatible, caller lama yang cuma baca field lama tidak terpengaruh):

- **`fuel`** — `{currentBar, maxBar, remainingLiter, fuelPercent, reserve,
  reserveLiter}`. 100% REUSE `FuelGaugeEngine.calculateFuelBar()`/
  `calculateFuelPercent()`/`getReserveStatus()` (liter input dibaca apa
  adanya dari `fuelState.currentFuelLiter`, pola sama persis
  `_reserveFuelInsight()` yang sudah ada) + `FuelTankProfile.get().
  fuelBarCount` (dibaca apa adanya — satu-satunya tempat nilai ini
  tersimpan, tidak diekspos engine lain manapun). 0 rumus bar/liter/
  persen/reserve baru dihitung — murni membungkus nilai yang SUDAH
  dihitung jadi 1 objek terstruktur (helper baru `_fuelGaugeData()`).
  `null` kalau belum ada `fuelState.currentFuelLiter` tersimpan sama
  sekali (kendaraan belum pernah dikoreksi); kalau liter ada tapi salah
  satu engine dependency belum dimuat/gagal, field terkait itu saja
  `null` (tidak memblokir field lain di objek `fuel`).
- **`highestInsight`** — 100% REUSE `this.getInsights(vehicleId)` (array
  yang SAMA PERSIS sudah diurutkan `_sortByPriority()` sejak TASK-149) —
  `insights[0]` apa adanya, atau `null` kalau array kosong/kendaraan
  tidak valid. 0 logic sortir/prioritas baru ditulis di sini.

**TIDAK disentuh**: `FuelGaugeEngine`/`FuelPredictionEngine`/
`FuelCostAnalytics`/`FuelMaintenanceEngine`/`FuelTankProfile` (logic-nya
masing-masing), `getInsights()` (method lain di file yang sama),
`D.bbmLogs`/`D.servisLogs`/`D.vehicles`/`D.sparepartCats` (data). 0
storage baru, 0 UI, 0 Dashboard, 0 AI diimplementasi (sesuai batasan
eksplisit task — itu tetap jadi kerjaan TASK-150 lanjutan setelah gap ini
ditutup).

+10 test baru di `tests/fuel-insight-engine.test.js` (`fuel.currentBar`/
`fuel.remainingLiter`/`fuel.fuelPercent`/`fuel.reserve`/`fuel.reserveLiter`/
`fuel.maxBar`, `fuel:null` kalau belum ada fuelState, `fuel` partial-null
kalau dependency belum dimuat, `highestInsight` kosong & terisi, 2 test
backward-compatibility). Build `kw150a-expand-fuel-insight-summary-api`
(`?v=579`, naik dari `?v=578`). Test naik dari 237 ke 247 pass (2x —
sebelum & sesudah build).

# Changelog — Sesi 149: Fuel Insight Engine (TASK-149)

## Fitur baru

Modul BARU `modules/vehicle/fuel-insight-engine.js` (`FuelInsightEngine`)
— engine yang MENGGABUNGKAN seluruh engine Fuel Intelligence yang sudah
ada jadi insight & ringkasan siap tampil, **engine-only, 0 UI**. 100%
REUSE (0 rumus km/L/Rp-per-km/interval servis/degradasi/proyeksi baru):
`FuelGaugeEngine.getReserveStatus()` (TASK-143),
`FuelPredictionEngine.predictRemainingDistance()`/`predictNextRefuel()`/
`predictMonthlyFuelUsage()`/`predictYearlyFuelUsage()` (TASK-146),
`FuelCostAnalytics.costPerKm()`/`monthlyCost()`/`projectedMonthlyCost()`
(TASK-147), `FuelMaintenanceEngine.fuelEfficiencyHealth()`/
`maintenanceRisk()`/`maintenanceRecommendation()` (TASK-148).

API publik (2 method, semua `{ok,...}` / `{ok:false,reason}`, tidak
pernah throw):

- `getInsights(vehicleId)` -> `{ok, insights:[]}` — sampai 7 tipe
  insight siap tampil (`Fuel Consumption`, `Monthly Cost`,
  `Fuel Efficiency`, `Maintenance`, `Reserve Fuel`, `Next Refuel`,
  `Prediction`), tiap insight `{id,type,priority,title,description,
  recommendation,confidence,source}`. Prioritas
  (`CRITICAL`/`HIGH`/`MEDIUM`/`LOW`/`INFO`) murni MAPPING TAMPILAN dari
  nilai yang sudah dihitung engine sumber (mis. `dropPct`/`riskLevel`/
  `estimatedRemainingDays`) — 0 rumus baru. Insight yang sumbernya belum
  tersedia (dependency belum dimuat/data belum cukup) dilewati, tidak
  membuat seluruh hasil gagal. Array diurutkan menaik berdasarkan
  prioritas.
- `getSummary(vehicleId)` -> `{ok, healthScore, efficiencyScore,
  monthlyCost, remainingDistance, maintenanceRisk, confidenceScore}`.
  `efficiencyScore`/`healthScore` adalah skor 0-100 (LOGIC BARU: komposisi
  rule-based dari `dropPct`/`riskLevel` yang sudah dihitung, pola sama
  persis `FuelMaintenanceEngine.maintenanceRisk()` yang juga
  menggabungkan 2 sinyal existing jadi 1 level baru). `monthlyCost`
  pakai histori aktual bulan ini, fallback ke proyeksi kalau belum ada
  transaksi. `remainingDistance`/`confidenceScore` diteruskan apa adanya
  dari engine sumber.

Build `kw149-fuel-insight-engine` (`?v=578`), **237/237 test pass**
(+25 test baru, `tests/fuel-insight-engine.test.js`). 1 file baru, 1
baris registrasi di `scripts/build.js` (setelah
`fuel-maintenance-engine.js`). `FuelGaugeEngine`/`FuelPredictionEngine`/
`FuelCostAnalytics`/`FuelMaintenanceEngine`/`FuelTankProfile` (logic)/
`D.bbmLogs`/`D.servisLogs`/`D.vehicles`/`D.sparepartCats` tidak
disentuh — 0 storage baru dibuat, 0 UI diubah (murni disiapkan utk
konsumen Dashboard/AI Chat masa depan).

### Hasil verifikasi

```
node --test tests/*.test.js   # 237/237 PASS (sebelum & sesudah build)
node scripts/build.js kw149-fuel-insight-engine
# ✅ Build selesai & lolos cek sintaks bundle (node --check), ?v=578
# index.html & app_production.html identik (0 diff)
```

---

# Changelog — Sesi 148: Fuel Maintenance Intelligence Engine (TASK-148)

## Fitur baru

Modul BARU `modules/vehicle/fuel-maintenance-engine.js`
(`FuelMaintenanceEngine`) — engine korelasi perawatan↔efisiensi BBM,
**engine-only, 0 UI**. 100% REUSE (0 rumus km/L/Rp-per-km/interval
servis/deteksi-drop baru): `FuelCostAnalytics.costPerKm()` (TASK-147),
`fuelEfficiency()` global, `predictService()` (Vehicle Service History,
sparepart-servis.js), `_vehicleFuelEfficiencyDropCheck()` (SATU-SATUNYA
logic deteksi penurunan efisiensi yang sudah ada, dipakai rule AI
`vehicle-fuel-efficiency-drop`), dan `findVehicleSpec()` (referensi
statis tekanan ban pabrikan — **TIDAK ADA histori tekanan ban aktual**
tersimpan di app manapun, jadi field ini selalu referensi statis, 0
storage baru dibuat sesuai larangan task).

API publik (4 method, semua `{ok,...}` / `{ok:false,reason}`, tidak
pernah throw):

- `maintenanceImpact(vehicleId)` — kmPerLiter/costPerKm saat ini +
  daftar item servis jatuh-tempo/mendekati yang RELEVAN efisiensi BBM
  (oli mesin, saringan udara, busi, CVT/v-belt — via keyword match nama
  kategori `D.sparepartCats`, bukan storage/rumus baru) + jumlah total
  kategori lewat jatuh tempo (sinyal umum) + referensi tekanan ban
  statis (kalau motor dikenali katalog).
- `fuelEfficiencyHealth(vehicleId)` — kmPerLiter/rpPerKm + status
  degradasi (reuse `_vehicleFuelEfficiencyDropCheck()`, difilter ke 1
  kendaraan).
- `maintenanceRecommendation(vehicleId)` — daftar rekomendasi teks dari
  gabungan 2 method di atas (LOGIC BARU: penyusunan kalimat, bukan
  rumus).
- `maintenanceRisk(vehicleId)` — level risiko (`tinggi`/`sedang`/
  `rendah`) dari kombinasi overdue-relevan-BBM + degradasi terdeteksi.

Build `kw148-fuel-maintenance-intelligence-engine` (`?v=577`),
**212/212 test pass** (+22 test baru,
`tests/fuel-maintenance-engine.test.js`). 1 file baru, 1 baris
registrasi di `scripts/build.js` (setelah `fuel-cost-analytics.js`).
`FuelGaugeEngine`/`FuelPredictionEngine`/`FuelCostAnalytics`/
`FuelTankProfile` (logic)/`D.bbmLogs`/`D.servisLogs`/`D.vehicles`/
`D.sparepartCats` tidak disentuh — 0 storage baru dibuat.

### Hasil verifikasi

```
node --test tests/*.test.js   # 212/212 PASS
node scripts/build.js kw148-fuel-maintenance-intelligence-engine
# ✅ Build selesai & lolos cek sintaks bundle (node --check), ?v=577
# index.html & app_production.html identik (0 diff)
```

---

# Changelog — Sesi 147: Fuel Cost Analytics Engine (TASK-147)

## Fitur baru

Modul BARU `modules/vehicle/fuel-cost-analytics.js` (`FuelCostAnalytics`)
— engine analitik biaya BBM read-only, **engine-only, 0 UI**. 100% REUSE
modul fuel yang sudah ada (`FuelStorage`, `fuelEfficiency()` global,
`FuelPredictionEngine`, `D.vehicles[i].fuelState`) — 0 rumus km/L, Rp/km,
atau proyeksi baru dihitung ulang, PURE/read-only (tidak pernah panggil
`save()` atau menulis ke `D`).

API publik (6 method, semua `{ok,...}` / `{ok:false,reason}`, tidak
pernah throw):

- `monthlyCost(vehicleId)` — total liter/biaya/rata-rata harga BBM
  bulan kalender berjalan (SUM `D.bbmLogs[].liter/cost` via
  `FuelStorage`, bukan rumus baru).
- `yearlyCost(vehicleId)` — sama seperti di atas, dikelompokkan per
  tahun kalender berjalan.
- `costPerKm(vehicleId)` — reuse `fuelEfficiency()` apa adanya
  (`rpPerKm`/`kmPerLiter`/`avgHarga`), 0 recompute.
- `averageFuelPrice(vehicleId)` — rata-rata harga BBM tertimbang
  (`totalCost/totalLiter`) dari SELURUH histori transaksi valid (beda
  cakupan dari `avgHarga` di `costPerKm()` yang cuma 10 log terakhir).
- `projectedMonthlyCost(vehicleId)` / `projectedYearlyCost(vehicleId)`
  — reuse `FuelPredictionEngine.predictMonthlyFuelUsage()`/
  `predictYearlyFuelUsage()` apa adanya, ditambah `confidenceScore`
  dari `D.vehicles[i].fuelState.confidenceScore` (dibaca apa adanya).
- `refillFrequency(vehicleId)` — jumlah transaksi isi BBM & rata-rata
  interval hari antar transaksi berurutan (logic baru: murni selisih
  tanggal, bukan rumus konsumsi/efisiensi).

Build `kw147-fuel-cost-analytics-engine` (`?v=576`), **190/190 test
pass** (+19 test baru, `tests/fuel-cost-analytics.test.js`). 1 file baru
(`modules/vehicle/fuel-cost-analytics.js`), 1 baris registrasi di
`scripts/build.js` (setelah `fuel-prediction-engine.js`).
`FuelGaugeEngine`/`FuelPredictionEngine`/`D.bbmLogs`/`D.vehicles`/Finance
tidak disentuh.

### Hasil verifikasi

```
node --test tests/*.test.js   # 190/190 PASS
node scripts/build.js kw147-fuel-cost-analytics-engine
# ✅ Build selesai & lolos cek sintaks bundle (node --check), ?v=576
# index.html & app_production.html identik (0 diff)
```

---

# Changelog — Sesi 146: Fuel Consumption Prediction Engine (TASK-146)

## Fitur baru

Modul BARU `modules/vehicle/fuel-prediction-engine.js`
(`FuelPredictionEngine`) — engine prediksi konsumsi BBM, **engine-only,
0 UI**. 100% REUSE modul fuel yang sudah ada (`FuelGaugeEngine`,
`FuelTankProfile` tidak langsung, `fuelEfficiency()` global,
`D.vehicles[i].fuelState`) — 0 rumus baru, PURE/read-only, deterministik
(rule-based, bukan machine learning).

API publik (4 method, semua `{ok,...}` / `{ok:false,reason}`, tidak
pernah throw):

- `predictRemainingDistance(vehicleId)` — estimasi jarak tempuh
  tersisa (km) dari sisa BBM saat ini.
- `predictNextRefuel(vehicleId)` — estimasi tanggal & jumlah hari
  sampai perlu isi BBM lagi (dari liter di atas ambang reserve dibagi
  rata-rata jarak harian).
- `predictMonthlyFuelUsage(vehicleId)` — proyeksi liter & biaya BBM
  sebulan ke depan (reuse `fuelEfficiency().estMonthlyLiter/Cost`
  langsung).
- `predictYearlyFuelUsage(vehicleId)` — proyeksi liter & biaya BBM
  setahun ke depan, diturunkan dari proyeksi bulanan x12 (bukan
  formula independen — supaya angka bulanan & tahunan selalu
  konsisten).

Extension point `_applyAdjustments()` disiapkan (belum diimplementasi)
supaya sesi mendatang bisa menambah weather/traffic/riding-style/
seasonal adjustment tanpa mengubah API publik.

## Yang TIDAK diubah

`FuelGaugeEngine` (kalkulasi bar↔liter↔persen↔jarak), `D.bbmLogs`
(riwayat transaksi BBM historis), `FuelTankProfile`, dan UI apa pun —
sesuai batasan TASK-146 ("engine-only", "Do NOT redesign the UI", "Do
NOT modify FuelGaugeEngine calculations", "Do NOT modify historical
fuel transactions", "Do NOT create duplicate calculations").

## Test

+17 test baru `tests/fuel-prediction-engine.test.js`: remaining
distance, next-refuel prediction, monthly prediction, yearly
prediction (konsisten x12 dgn monthly), invalid vehicle (4 method
sekaligus), missing fuel profile (`tankCapacityLiter` belum diatur),
missing fuel state, zero fuel (tidak error, balikin 0), dan 1 test
read-only guarantee. Total naik dari 154 ke **171/171 pass**.

## Build

`kw146-fuel-consumption-prediction-engine-2` (`?v=575`, naik dari
`?v=573`). 1 file baru (`modules/vehicle/fuel-prediction-engine.js`),
1 baris registrasi baru di `scripts/build.js` (GROUP_B, setelah
`fuel-intelligence-ui.js`).

---

# Changelog — Sesi 145: Fuel Intelligence Integration (TASK-145)

## Fitur baru

Melengkapi end-to-end user flow Fuel Intelligence — Sesi 144 sudah
bikin `FuelBarCorrection` (controller lengkap `open()`/`selectBar()`/
`save()`), tapi belum ada tombol trigger di UI manapun yang
memanggilnya. Sesi ini menutup gap itu tanpa menyentuh business
logic/kalkulasi apa pun. **2 file diubah, 0 file baru:**

- `modules/vehicle/fuel-card.js`:
  - Tombol "⚙️ Koreksi" ditambah di sebelah tombol "📊 Lihat Detail"
    yang sudah ada. Baris CTA sekarang `.btn-row` (class SUDAH ADA,
    dipakai modal lain seperti konfirmasi — 0 CSS baru) berisi 2 tombol
    `.btn.btn-ghost.btn-sm` (class SUDAH ADA). Tombol baru panggil
    `FuelBarCorrection.open(vehicleId)` lewat `data-action` dispatch
    generik yang sudah ada di seluruh aplikasi (pola persis tombol
    "Lihat Detail" di sampingnya) — 0 handler klik baru ditulis manual.
    `aria-label="Koreksi estimasi BBM dengan speedometer"` disertakan.
  - Rekomendasi pasif (non-blocking, bukan dialog) ditambah:
    `_lowConfidenceHint(vehicleId)` baca LANGSUNG
    `veh.fuelState.confidenceScore` dari `D.vehicles` (field opsional
    dari TASK-144, 0 rumus/skoring baru dihitung di sini) — kalau di
    bawah ambang presenter `LOW_CONFIDENCE_THRESHOLD=50`, tampilkan teks
    "⚠️ Estimasi mulai kurang akurat. Disarankan sinkronkan dengan
    speedometer." Ambang ini murni nilai presenter (kapan menampilkan
    teks), BUKAN rumus confidence baru.
- `modules/vehicle/fuel-intelligence-ui.js`:
  - Satu baris diubah — teks toast sukses di `FuelBarCorrection.save()`
    disamakan dgn spesifikasi task: **"✅ Kalibrasi bensin berhasil
    diperbarui"** (sebelumnya "✅ Estimasi BBM disinkronkan dengan
    speedometer" — beda kata-kata saja, 0 perubahan perilaku). Refresh
    `FuelCard.render()` + `FuelModal.open()` (kalau modal terbuka utk
    kendaraan yang sama) tetap seperti Sesi 144, tidak diubah.

## Yang TIDAK diubah

`FuelGaugeEngine` (kalkulasi bar↔liter↔persen), `D.bbmLogs` (riwayat
transaksi BBM), `FuelTankProfile`, dan seluruh business logic lain —
sesuai batasan TASK-145 ("Do NOT change business logic", "Do NOT modify
historical fuel transactions", "Do NOT change FuelGaugeEngine
calculations"). Diverifikasi lewat test "riwayat D.bbmLogs TIDAK
diubah" (Sesi 144, tetap hijau) + audit baris-per-baris kedua file yang
diubah.

## User flow (sekarang lengkap end-to-end)

```
Fuel Card → tap "⚙️ Koreksi" → FuelBarCorrection Modal → Pilih Bar
→ Preview (Sebelum/Sesudah/Selisih) → Simpan → FuelGaugeEngine
→ D.vehicles[i].fuelState → refresh Fuel Card + refresh Fuel Modal
(kalau terbuka) → toast "✅ Kalibrasi bensin berhasil diperbarui"
```

## Test

+7 test baru:

- `tests/fuel-card.test.js` — tombol Koreksi tampil & `data-action`
  terpasang benar, 0 class button baru dipakai (masih reuse
  `.btn.btn-ghost.btn-sm`), rekomendasi low-confidence tampil kalau
  `confidenceScore < 50`, TIDAK tampil kalau skor tinggi, TIDAK tampil
  kalau `fuelState` belum pernah ada sama sekali.
- `tests/fuel-intelligence-ui.test.js` — teks toast baru sesuai
  spesifikasi, refresh `FuelCard` + `FuelModal` sekaligus tervalidasi
  dalam 1 test end-to-end.

### Hasil verifikasi

```
node --test tests/*.test.js
# 154/154 PASS (naik dari 147/147 sebelum sesi ini)

node scripts/build.js kw145-fuel-intelligence-integration-1
# ✅ Build selesai & lolos cek sintaks bundle (node --check), ?v=573
# index.html & app_production.html identik (md5sum sama persis)
# grep app-bundle-b.min.js: "⚙️ Koreksi" (4x, termasuk sumber+bundle),
#   "Kalibrasi bensin berhasil diperbarui" (1x) — terkonfirmasi masuk bundle
```

---



## Fitur baru

Modul baru `modules/vehicle/fuel-intelligence-ui.js` (`FuelBarCorrection`)
— melengkapi modal `#fuelBarCorrectionModal` yang markup HTML-nya sudah
ada di `modules/shared/modals.js` sejak sesi sebelumnya tapi belum punya
controller (tombol Simpan sebelumnya memanggil method yang tidak ada,
akan error kalau ditekan). Sekarang lengkap:

- `FuelBarCorrection.open(vehicleId?)` — validasi kendaraan & profil
  tangki (`FuelTankProfile.get()`, butuh `tankCapacityLiter`), render
  estimasi BBM saat ini (dari `fuelState` tersimpan, atau log BBM
  terbaru kalau full tank, atau `-` kalau belum ada dasar sama sekali),
  render bar picker dinamis (0..`fuelBarCount` kendaraan ini — bukan
  hardcode), lalu buka modal.
- `FuelBarCorrection.selectBar(bar)` — live preview Sebelum/Sesudah/
  Selisih liter, 100% REUSE `FuelGaugeEngine.calculateFuelLiter()`
  (TASK-143), 0 rumus konversi baru.
- `FuelBarCorrection.save()` — tulis `currentFuelBar`, `currentFuelLiter`,
  `correctedAt` (ISO timestamp), `estimatedSource`
  (`'manual-bar-correction'`), `confidenceScore` (100 — pembacaan manual
  langsung dari speedometer) ke `D.vehicles[i].fuelState` (field baru,
  OPSIONAL/additive, pola sama `fuelTankProfile` TASK-142). **Riwayat
  `D.bbmLogs` TIDAK disentuh** — koreksi ini murni memperbaiki estimasi
  saat ini, bukan transaksi/log historis. Setelah simpan: refresh
  `FuelCard.render()` + refresh `FuelModal` kalau sedang terbuka untuk
  kendaraan yang sama (`FuelModal.curVehicleId`).

CSS baru scoped `#fbcBarPicker .fbc-bar-btn` (full-width per baris) —
warna/hover/active 100% reuse `.chip-btn` yang sudah ada, 0 style global
diubah.

## TASK-REF-001 (konsolidasi)

Task minta merge `fuel-gauge-ui.js` + `fuel-bar-correction.js` jadi
`fuel-intelligence-ui.js` — tapi audit menemukan KEDUA file sumber itu
tidak pernah ada (TASK-144 sebelumnya cuma bikin markup modal, belum
bikin controller-nya). Daripada bikin 2 file kosong lalu langsung
di-merge, controller TASK-144 di atas langsung ditulis sebagai SATU file
`fuel-intelligence-ui.js` — memenuhi tujuan TASK-REF-001 (0 fragmentasi
file kecil baru) sekaligus TASK-144 (controller lengkap) dalam satu
langkah.

## Build & Test

Terdaftar di `scripts/build.js` GROUP_B setelah `fuel-card.js` (dependency:
`FuelGaugeEngine`/`FuelTankProfile`/`FuelStorage`/`FuelCard`/`FuelModal`,
semua sudah dimuat sebelum titik ini). +12 test baru
`tests/fuel-intelligence-ui.test.js`. Build `kw144-fuel-bar-correction`
(`?v=572`, naik dari `?v=571`). Test naik dari 135 ke 147 pass.

## Catatan lingkup

Belum ada tombol/trigger UI manapun yang memanggil
`FuelBarCorrection.open()` (mis. dari Fuel Card) — item ini TIDAK ada di
checklist TASK-144 yang diberikan, dan menambahkannya berarti mengedit
`fuel-card.js` (modul TASK-141 yang sudah selesai), di luar lingkup
"Never modify unrelated modules". `FuelBarCorrection.open(vehicleId)`
sudah diekspos sebagai API publik siap dipanggil — wiring tombol trigger
jadi kandidat task terpisah kalau dibutuhkan.

# Changelog — Sesi 140: Bugfix Kartu Beranda Tidak Muncul Lagi Setelah Dinyalakan Ulang

## Bug yang diperbaiki

Kartu Beranda opsional (Kebebasan Finansial/Dana Pensiun/Absensi Harian/
Refleksi & Self-Care, `DASH_CARD_DEFS` di `modules/shared/modules-render.js`)
yang sudah dimatikan lewat Pengaturan → Tampilan → Kartu di Beranda TIDAK
PERNAH muncul lagi walau checkbox-nya dinyalakan ulang — checkbox &
`D.dashCardPrefs` sudah benar menunjukkan "aktif", tapi kartunya tetap
kosong/hilang sampai aplikasi di-reload penuh.

**Root cause**: `hideDashCardEl(elId)` menyembunyikan kartu lewat DUA
jalur — `classList.add('u-dnone')` DAN inline `style.display='none'`.
`toggleDashCardPref()`/`setAllDashCardPrefs()` sudah benar memanggil
`renderDashboard()` ulang, dan loop `DASH_RENDER_ORDER` di dalamnya sudah
benar SKIP `hideDashCardEl()` begitu `isDashCardOn()` balik `true` — tapi
tidak ada fungsi kebalikan yang pernah melepas inline `style.display='none'`
yang sudah kadung ditulis. Inline style attribute punya spesifisitas lebih
tinggi dari class CSS (`.u-dnone{display:none}`), jadi kartu tetap
invisible walau class-nya sendiri sudah tidak ditambahkan lagi.

## Diperbaiki

- **`modules/shared/modules-render.js`** — tambah `showDashCardEl(elId)`
  (kebalikan simetris persis `hideDashCardEl()`, melepas class `u-dnone`
  DAN inline `style.display`), dipanggil di loop `DASH_RENDER_ORDER`
  (`renderDashboard()`) SETELAH guard `isDashCardOn()` & SEBELUM
  `cardDef.render(...)`. 0 fungsi lama diubah, 0 perilaku lain berubah —
  kartu yang memang selalu ON perilakunya identik dengan sebelumnya
  (`showDashCardEl` pada elemen yang tidak pernah disembunyikan adalah
  no-op).
- **`app-bundle-a.min.js`** — dibuat ulang otomatis dari source yang sudah
  dipatch (grup A, memuat `modules-render.js`).

## Ditambahkan

- **`tests/dash-card-show-hide.test.js`** (7 test baru) — `hideDashCardEl()`
  (class + inline style ditambahkan), `showDashCardEl()` (keduanya
  dilepas, idempotent, aman di elemen yang tidak ada/tidak pernah
  disembunyikan), serta pemeriksaan urutan pemanggilan di source
  (`isDashCardOn` guard → `showDashCardEl` → `cardDef.render`) supaya
  patch di loop `renderDashboard()` tidak diam-diam terlepas di sesi
  mendatang.

## Tidak diubah

- `hideDashCardEl()` — 0 baris disentuh, `showDashCardEl()` murni fungsi
  BARU yang simetris, bukan modifikasi fungsi lama.
- `DASH_CARD_DEFS`/`DASH_RENDER_ORDER`/`DASH_CARD_BY_KEY`,
  `isDashCardOn()`/`toggleDashCardPref()`/`setAllDashCardPrefs()` — 0
  baris disentuh.
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`, termasuk field
  `dashKey` yang dipakai `dash-refleksi`/`dash-fi`/`per-absensi`) — 0
  baris disentuh.
- `dashHubNavigateToFeature()`/`DASHHUB_GOTO_SECTION_MAP` (bugfix Sesi
  139, sub-tab Dashboard Hub) — 0 baris disentuh sesi ini, area berbeda
  (sub-tab vs inline style kartu opsional).

## Test & Build

```
node --test tests/*.test.js
# tests 69 / pass 69 / fail 0  (62 lama + 7 baru, semua hijau)

node scripts/build.js kw140-fix-dashcard-toggle-inline-style
# ✓ Linter bawaan "pola bug u-dnone vs style.display" lolos bersih
# ✓ Sintaks kedua bundle valid (node --check lolos)
# ✓ index.html & app_production.html sudah identik.
# Versi baru: ?v=565 / kw-cache-v565
```

---

# Changelog — Sesi 139: Bugfix Navigasi "Semua Fitur" Dashboard Hub (goTo ke sub-tab tidak aktif)

## Bug yang diperbaiki

Dilaporkan user (screenshot): klik kartu apa pun di grid "🗂️ Semua Fitur"
yang targetnya `dash-penasihat`/`dash-ai-rekomendasi`/
`dash-ai-ringkasan-harian`/`dash-hidup-seimbang`/`dash-refleksi`/`dash-fi`/
`dash-lifeos` (Penasihat AI, Rekomendasi AI, Ringkasan Harian AI, Skor Hidup
Seimbang, Refleksi & Self-Care, Kebebasan Finansial, Life OS) selalu terlihat
"mengarah ke Tangga Ternak Uang", bukan ke kartu yang diklik.

**Root cause**: `target.goTo` ketujuh kartu itu (`advisorCard`/
`aiRecommendBody`/`aiBriefingBody`/`lifeBalanceCard`/`refleksiCard`/
`dashFiCard`/`lifeOSWrap`) hidup di dalam container yang ada di
`SECTION_GROUPS` sub-tab **LAIN** (`#dashboardHubPinnedWrap` → sub-tab
"📌 Widget"; `#lifeOSWrap` → sub-tab "🌦️ Insight") — bukan di sub-tab
"🗂️ Fitur" tempat kartunya sendiri berada. `dashHubNavigateToFeature()`
SEBELUM fix ini tidak pernah memanggil `DashboardHub.setSectionTab()`
dulu sebelum `scrollIntoView()`, jadi kalau user sedang di sub-tab lain,
elemen tujuan tetap disembunyikan `u-dnone` → `scrollIntoView()` jadi
no-op tanpa error apa pun. Yang kelihatan cuma efek sampingan:
`showPage()` di baris sebelumnya sudah keburu reset scroll ke 0, dan
karena kartu "Tangga Ternak Uang" (`#tanggaKeuanganCard`) SENGAJA selalu
tampil di atas seluruh sub-tab (di luar `SECTION_GROUPS` manapun), itulah
yang selalu terlihat — bukan navigasi yang benar-benar salah arah, murni
efek "mendarat di posisi paling atas yang kebetulan didominasi kartu itu".

## Diperbaiki

- **`modules/dashboard-hub/dashboard-hub.js`** — tambah
  `DASHHUB_GOTO_SECTION_MAP` (100% REUSE nilai `SECTION_GROUPS` yang sudah
  ada di `DashboardHub.applySectionTab()`, dibalik jadi id→tab) +
  `_dashHubResolveGoToSection(goToId)` (jalan naik lewat `parentElement`
  dari elemen `goTo` sampai ketemu id yang terdaftar di peta itu, atau
  `null` kalau memang di luar section manapun — mis. Tangga
  Keuangan/Hero, yang memang tidak butuh pindah tab). `dashHubNavigateToFeature()`
  sekarang memanggil `DashboardHub.setSectionTab(section)` (kalau ada)
  SEBELUM `scrollIntoView()`, hanya utk `target.page==='dashboard-hub'`.
  0 baris/fungsi lama dihapus, 0 perilaku lain berubah — kartu yang
  goTo-nya memang sudah di sub-tab aktif (atau di luar section manapun)
  perilakunya identik dengan sebelumnya.
- **`app-bundle-b.min.js`** — patch identik ditempel manual ke bundle
  (bundle ini yang benar-benar dimuat `index.html`/`app_production.html`),
  supaya tidak perlu menunggu build ulang utk verifikasi manual pertama.
  `node scripts/build.js` lalu dijalankan sungguhan (lihat di bawah) untuk
  menghasilkan bundle final dari source yang sudah dipatch — bundle hasil
  patch manual ini jadi konsisten dgn hasil build otomatis.

## Ditambahkan

- **`tests/dashboard-hub-goto-subtab.test.js`** (10 test baru) — load
  `dashboard-hub.js` ASLI lewat `vm` dgn DOM tiruan minimal yang meniru
  struktur nyata (`advisorCard`/`lifeBalanceCard`/`refleksiCard`/
  `dashFiCard` sbg descendant `#dashboardHubPinnedWrap`, `lifeOSWrap`
  berdiri sendiri, dst): resolusi section per id (termasuk naik beberapa
  level ancestor & id yang tidak terdaftar/tidak ada → `null`, tidak
  throw), serta integrasi `dashHubNavigateToFeature()` penuh
  (`setSectionTab` terpanggil dgn tab yang benar SEBELUM `scrollIntoView`,
  kartu yang tidak butuh pindah tab TIDAK memicu `setSectionTab` sama
  sekali, dan goTo di halaman lain tidak pernah menyentuh sub-tab
  Dashboard Hub).

## Tidak diubah

- `SECTION_GROUPS` di `DashboardHub.applySectionTab()` — 0 baris
  disentuh, `DASHHUB_GOTO_SECTION_MAP` murni REUSE nilainya, bukan
  keputusan taksonomi baru.
- `FEATURE_REGISTRY` (`dashboard-hub-registry.js`) — 0 baris disentuh,
  seluruh `target.goTo` per kartu tetap persis sama.
- Navigasi ke page LAIN (`keuangan`/`shop`/`carnotes`/`pajak`/`aset`/dst)
  — 0 baris disentuh, guard baru hanya aktif utk
  `target.page==='dashboard-hub'`.
- `showPage()`, `applySectionTab()` — 0 baris disentuh, dipanggil apa
  adanya.

## Test & Build

```
node --test tests/*.test.js
# tests 62 / pass 62 / fail 0  (52 lama + 10 baru, semua hijau)

node scripts/build.js kw139-fix-dashboard-hub-goto-subtab
# ✓ Sintaks kedua bundle valid (node --check lolos)
# ✓ index.html & app_production.html sudah identik.
# Versi baru: ?v=564 / kw-cache-v564
```

---

# Changelog — Smart Delivery Engine, Sesi 4/6: Fungsi Additive Shop + Cobek

Lihat `RENCANA-SESI-RINGKAS.md` untuk peta 6 sesi lengkap. Sesi ini
melanjutkan Sesi 1-3 (`modules/ai/*`, `modules/logistics/*`, sudah ada &
tidak disentuh) dengan menambah fungsi kalkulasi ke 3 file Shop yang SUDAH
ADA (bukan file baru) — sesuai rencana ringkas, TIDAK ada file baru di
sesi ini.

## Ditambahkan (semua PURE/read-only, tidak ada UI/tombol/wiring baru)

- **`modules/shop/cobek-etalase.js`** — `weightCalculator({beratPerUnit,
  qty})`, `volumeCalculator({panjang, lebar, tinggi, qty})`,
  `packingCalculator({items, capacityKg, capacityM3})`: kalkulator
  berat/volume/rit pengiriman, murni parameter (D.products belum punya
  field berat/volume, jadi tidak baca D sama sekali).
- **`modules/shop/cobek-pricing.js`** — `calculateFuel(vehicleId)`
  (bungkus `LogisticsEngine.fuel()` dgn pesan alasan gagal),
  `calculateProfit({productId, qty, deliveryPlan})` (revenue - modal -
  ongkir dari `D.products` + `deliveryPlan.route`), `calculateVehicleCapacity
  ({vehicleId, items, capacityKg, capacityM3})` (gabungan
  `packingCalculator()` + `calculateFuel()`).
- **`modules/shop/cobek-order.js`** — `calculateSmartDelivery({productId,
  qty, produsenId, kmKonsumen, biayaPerKmKonsumen, metode, vehicleId,
  marginPct})`: orkestrator rencana pengiriman lengkap 1 produk, Etape 1
  (jarak/biaya ke Produsen) diambil otomatis dari `D.produsen[].jarakKm/
  biayaPerKm` kalau ada, lewat `LogisticsEngine.plan()` +
  `calculateProfit()`. `requestAIRecommendation({...})` (async): bangun
  prompt lewat `AIService.buildPrompt()`, kirim ke AI lewat
  `callAIProviderRaw()` KALAU `D.profile.apiKey` sudah diisi (pola sama
  dgn `PriceReko.checkMarketAI()`), kalau belum tetap balikin prompt-nya
  (`aiText:null`) — tidak memaksa isi API Key dulu.
- **`tests/cobek-smart-delivery.test.js`** (file baru, 21 test) — meliputi
  ke-8 fungsi di atas, termasuk kasus gagal (produk tidak ketemu, histori
  BBM belum cukup, kapasitas tidak dikasih, API Key kosong, AI gagal
  dihubungi).

## Tidak diubah

- `modules/ai/*`, `modules/logistics/*` (Sesi 1-3) — 0 byte diubah, cuma
  DIPAKAI (dipanggil dari dalam fungsi baru di atas, referensi lewat nama
  global karena urutan load `scripts/build.js` menaruh Shop SEBELUM AI/
  Logistics — lihat catatan di tiap fungsi baru).
- Tidak ada file baru di `scripts/build.js` (semua fungsi ditambah ke file
  yang SUDAH terdaftar), jadi tidak ada perubahan urutan/registrasi build.
- Tidak ada UI/tombol/menu baru, tidak ada `save()` dipanggil dari fungsi
  manapun di atas — semua murni baca `D` (read-only) + hitung.
- `D.products`/`D.vehicles` tidak ditambah field baru (berat/volume/
  kapasitas tetap jadi parameter eksplisit, bukan field D baru).

## Yang masih perlu diputuskan sebelum Sesi 5

"Inventory" mau dipetakan ke stok produk Shop (`cobek-etalase.js`), stok
sparepart kendaraan (`tx-stok-sparepart.js`), keduanya, atau modul baru? —
lihat `RENCANA-SESI-RINGKAS.md`.

## Hasil test

```
node --test tests/cobek-smart-delivery.test.js
# tests 21 / pass 21 / fail 0

node --test tests/*.test.js
# tests 1985 / pass 1985 / fail 0  (baseline lama tetap hijau, 0 diubah)

node scripts/build.js
# ✅ Build "kw99-sesi25-fix-gdrive-backup-await-9" selesai & lolos cek sintaks

node --test tests/*.test.js   (setelah build)
# tests 1985 / pass 1985 / fail 0
```

---

# Changelog — Bangun UI Tab "📊 Laporan" Shop/Cobek + FAB Kontekstual

## Ditambahkan

- **Tab "📊 Laporan" di halaman Shop kini bisa diakses.** Logic-nya
  (`Laporan.renderTab()`, `topProdukAgg()`, `renderTopProduk()`,
  `renderTopPelanggan()`, `setPeriodeLap()`/`getRangeLap()` di
  `cobek-order.js`, `exportLaporanShopXLSX()` di `cobek-io.js`) sudah ada
  sejak lama termasuk cabang `t==='laporan'` di `setShopTab()`, tapi tidak
  pernah punya markup HTML — jadi selama ini sama sekali tidak bisa dibuka
  user. Sekarang tab ini menampilkan: filter periode sendiri (terpisah dari
  tab Riwayat), 4 kartu ringkasan (Transaksi/Omzet/Untung/Margin), grafik
  tren penjualan 6 bulan, top 5 produk terlaris, dan top 5 pelanggan.
- **FAB kontekstual `#shopLaporanFab`** di tab Laporan Shop, menyamakan
  standar UI dengan FAB Laporan Keuangan (`REPORTS-2.0.md`) — 2 aksi:
  📤 Export Laporan (`exportLaporanShopXLSX()`) & 📊 Export Semua Data
  (`exportShopSemuaXLSX()`), keduanya fungsi lama, reuse penuh. `#shopFab`
  (Sprint 2 Tahap 2) tidak diubah, tetap tampil di semua tab Shop.

## Tidak diubah

- Tidak ada business logic baru selain 1 wrapper tipis `renderShopLaporan()`
  (pola sama dgn `renderShop()`/`renderShopGrafik()` yang sudah ada).
- Tidak ada class CSS baru — 100% reuse `.keu-fab*`, `.grid2`, `.stat-box`,
  `.grafik-bar-wrap` yang sudah ada. Hanya 1 rule posisi FAB aditif.
- `setShopTab()`, `Laporan.*`, `ShopExport.*` (business logic) — 0 baris
  tersentuh.

## Verifikasi

Browser (Playwright + Chrome headless) dgn data transaksi nyata: tab
Laporan menghitung & menampilkan angka dengan benar, FAB & filter periode
berfungsi tanpa error. `node --test` → **1755/1755 PASS** (28 test baru,
aditif, baseline 1727 tetap hijau). `npm run build` → lolos semua guard.

---

# Changelog — Google Sheets Sync: Fix Bug "shop" + Tambah Modul yang Hilang

## Diperbaiki (BUG kritis)

- **`SHEETS_MODULES` salah tulis `'shop'`, seharusnya `'cobek'`.** `D` tidak
  pernah punya field bernama `shop` (data transaksi shop/kasir asli ada di
  `D.cobek`, dan `SHEETS_SCHEMAS.cobek` sudah lengkap sejak awal tapi tidak
  pernah terpakai). Akibatnya tab "shop" di Google Sheets selalu dibuat
  tapi **selalu 0 baris** — transaksi shop tidak pernah benar-benar
  ke-sync ke Sheets sejak fitur ini ada, walau terlihat terdaftar di
  daftar modul. Sekarang pakai `'cobek'` (schema yang sudah ada
  langsung terpakai, tidak perlu skema baru).

## Ditambahkan (modul yang tadinya tidak ikut sync sama sekali)

- **`simList`** (data SIM/pajak kendaraan) — skema baru ditambahkan.
- **`tukangWorkers`** (daftar tukang/pekerja) — skema baru ditambahkan.
- **`tukangAbsensi`** (absensi & upah harian tukang) — sengaja TIDAK diberi
  skema kolom tetap (bentuk datanya beda antara mode `jam` vs `borongan`),
  otomatis fallback ke 1 kolom JSON per baris (perilaku yang memang sudah
  didukung `sheetsItemToCells`/`sheetsCellsToItem`, bukan bug).
- **`gajiMingguanHistory`** (riwayat hasil hitung gaji mingguan) — data
  lama di modul ini TIDAK punya `id` unik per entri (cuma
  `{weekStart,weekEnd,total,count,...}`), padahal sync butuh `id` buat
  diffing antar baris. Ditambahkan: (a) `id:uid()` di titik push baru
  (`reset-gaji-mingguan.js`), (b) migrasi data `toVersion:3` yang
  membackfill `id` ke entri LAMA yang sudah kadung tersimpan tanpa id
  (`SCHEMA_VERSION` 2 → 3).

## Sengaja TIDAK ditambahkan

- **`jalanLogs`** (catatan perjalanan) — dicek dulu, ternyata fitur ini
  sudah legacy/tidak aktif (tidak ada 1 pun `.push()` ke array ini di
  seluruh kode, dan `data-archive.js` sendiri sudah melabelinya
  "fitur lama, data lama"). Tidak ada gunanya disync.

## Verifikasi

- `node scripts/build.js`: bundle naik ke versi 364, lolos semua lint
  otomatis (u-dnone, escapeHtml, chicken-egg OCR).
- `npm test`: **1688/1688 PASS** (termasuk 3 test lama yang nilai
  `SCHEMA_VERSION` hardcode-nya ikut disesuaikan dari 2 → 3, karena
  memang versi terbarunya sekarang 3 — intent tesnya sendiri, migrasi
  toVersion:2 tetap terdaftar & tetap dites, tidak berubah).

---

# Changelog — Backup Coverage Fix (Custom Per-Modul Backup)

## Diperbaiki

- **Celah keamanan**: `runBackup()` (backup custom per-modul di modal
  "Backup Custom") dulu menaruh `D.profile` APA ADANYA ke file export,
  TANPA menghapus `apiKey` — beda sendiri dari `buildBackupPayload()`
  (dipakai tombol Backup utama) yang sudah benar menghapusnya. Kalau
  user pernah isi API key AI di profil lalu pakai jalur backup custom
  ini, key itu ikut nyangkut di file JSON hasil export. Sekarang
  `apiKey` dihapus juga di jalur ini sebelum diekspor.
- **Cakupan data tidak lengkap**: 9 field berikut sebelumnya tidak
  ikut modul toggle manapun di backup custom, jadi selalu hilang dari
  hasil export meskipun semua toggle diaktifkan (beda dari tombol
  Backup utama yang otomatis lengkap karena pakai `{...D}`):
  `refleksi` (gratitude/self-care/catatan pribadi), `gajiMingguanHistory`,
  `tukangBorHargaMemory`, `tukangWorkers`, `tukangAbsensi`,
  `torsiChecklist`, `debtStrategy`, `favoritKeys`, `dashCardPrefs`.
  Sekarang semuanya ikut dimasukkan di modul "lain". Khusus
  `favoritKeys`, dibaca lewat `getFavoritKeys()` (bukan `D.favoritKeys`
  langsung) supaya patuh invariant satu-pintu-mutasi ADR di
  `dashboard-hub-favorit.js` (ada guard test otomatis untuk ini).
- Sisi restore (`applyRestoredData`) tidak perlu diubah — sudah pakai
  spread generik `D={...D,...imp}` jadi field baru ini otomatis
  ke-restore dengan benar begitu ada di file backup.

## Verifikasi

- `node scripts/build.js` dijalankan ulang (`app-bundle-a/b.min.js`,
  `index.html`/`app_production.html`, `sw.js` naik ke versi 363) karena
  `runBackup()` ikut ter-bundle di `app-bundle-b.min.js`, bukan
  dimuat lepas.
- `npm test` (`node --test tests/*.test.js`): **1688/1688 PASS**,
  termasuk guard ADR `favoritKeys` di atas.

## Tidak diubah

- Tombol Backup utama (`exportData()`/`runFullBackup()` via
  `buildBackupPayload()`) TIDAK berubah — jalur itu memang sudah benar
  sejak awal (lengkap + apiKey sudah disaring).

---

# Changelog — Sprint 2 Tahap 19: Fitur Tangga Ternak Uang

Baseline: Sprint 2 Tahap 18 (Resource Hints + Theme Color) selesai.

## Ditambahkan

- **`tangga-keuangan.js`** (modul baru) — kartu "🪜 Tangga Ternak Uang" di
  Dashboard Hub, tepat di bawah Hero Card. Menganalisis OTOMATIS posisi
  user di 7 anak tangga (Nabung Cash 10jt, Lunasi Hutang Kecil, Dana
  Darurat 3-6 bulan, Investasi 20% income, Dana Pendidikan Anak, Lunasi
  KPR, Kekayaan Abadi & Berbagi) berdasarkan data yang SUDAH ADA:
  `totalSaldoAkun()`, `D.bills`, `D.targets` (Dana Darurat), `D.assets`
  (kategori investasi), `D.eduFunds`, `AsetKeluarga.build()`, dan
  `D.pajakZakat.zakatLog`. Beberapa threshold (mis. estimasi 20% income
  & Rp1M kekayaan bersih di anak tangga 7) adalah **heuristik ilustratif**
  yang ditulis transparan di catatan tiap baris kartu, bukan pelacakan
  presisi/nasihat finansial personal.
- **`tangga-ternak-uang.jpg`** — gambar infografis tangga, dipakai sebagai
  background kartu.
- **`styles.css`**: 10 baris CSS baru (`.tk-*`) khusus styling baris
  anak tangga di kartu ini — murni tambahan di akhir file, tidak
  menimpa rule lain.
- **`index.html`, `app_production.html`**: tambah markup kartu (di
  bawah Hero Card) + `<script src="tangga-keuangan.js?v=1">` di-load
  SETELAH `app-bundle-a/b.min.js`.

## Cara kerja teknis (non-invasive)

- File JS terpisah dari bundle, dimuat belakangan — semua fungsi/modul
  global yang dipakai (`D`, `WorthIt`, `AsetKeluarga`, `totalSaldoAkun`,
  `escapeHtml`, `fmtFull`) dijamin sudah ada saat file ini jalan.
- Render ulang saat halaman Dashboard Hub dibuka dilakukan dengan
  **membungkus** `window.showPage` yang sudah ada (panggil versi asli
  dulu, baru render kartu ini kalau halamannya `dashboard-hub`) —
  bukan menimpa/mengganti isi fungsi asli di bundle.

## Tidak diubah

- Tidak ada baris di `app-bundle-a.min.js`/`app-bundle-b.min.js` yang
  disentuh/di-rebuild.
- Tidak ada logic/data existing (Keuangan, Dana Darurat, Investasi,
  dst.) yang berubah — modul ini murni MEMBACA data yang sudah ada.

---

# Changelog — Sprint 2 Tahap 18: Resource Hints + Theme Color

Baseline: Sprint 2 Tahap 17 (Shadow Token Migration + Modern UI Layer) selesai.

## Ditambahkan

- **`<meta name="theme-color" content="#08090c">`** — warna address bar
  browser mobile mengikuti `--bg` tema dark (default app), kesan lebih
  menyatu/native saat dibuka sebagai PWA/tab browser.
- **`preconnect`/`dns-prefetch`** ke 3 domain yang sudah ada di
  allowlist CSP (`cdn.jsdelivr.net`, `cdnjs.cloudflare.com`,
  `accounts.google.com`) — domain-domain ini sebelumnya baru dikoneksi
  saat fitur lazy-load (eruda/tesseract.js/jsPDF/Google Identity)
  dipicu; hint ini cuma buka koneksi DNS/TLS lebih awal supaya saat
  fitur itu dipakai terasa lebih cepat. 0 byte aset tambahan, 0
  perubahan visual/JS.

## Tidak diubah

- Tidak ada file JavaScript yang disentuh.
- Tidak ada `app-bundle-a/b.min.js` yang di-rebuild (tidak perlu).

---

# Changelog — Sprint 2 Tahap 17: Shadow Token Migration + Modern UI Layer

Baseline: Sprint 2 Tahap 16 (Secondary Clickable Hover Elevation) selesai.

## Ditambahkan

- **`modern-ui-layer.css`** (file baru, ~3KB) — lapisan CSS tambahan
  murni additive (tidak menimpa token warna/kontras Tahap 9): glass
  blur pada header & bottom-nav, lift/elevation halus pada `.card`/
  tombol saat hover/tap (pakai token `--shadow-*`/`--dur-*` yang sudah
  ada), focus ring aksesibel untuk navigasi keyboard, scrollbar tipis
  di layar ≥900px, font smoothing, dan menghormati
  `prefers-reduced-motion`. Di-link dari `index.html` &
  `app_production.html` setelah `styles.css`, terpisah dari bundle JS
  sehingga tidak butuh rebuild `app-bundle-a/b.min.js`.

## Diubah (value-preserving, tanpa perubahan visual)

- **`styles.css`**: 22 deklarasi `box-shadow` literal (nilai numerik
  langsung) dipindah ke 20 token `var(--shadow-*)` baru di `:root`
  (`ROADMAP-v1.1.md` Item 5, Medium Priority, 🟢 CSS-only). Nilai akhir
  identik persis dengan sebelumnya — pola sama seperti migrasi
  border-radius (Tahap 11), duration (Tahap 12), dan font-size (Tahap
  14). `0 0 0 0 transparent` (reset/animation-state, bukan shadow
  desain) sengaja tidak dimigrasi.
- **`index.html`, `app_production.html`**: tambah satu baris
  `<link rel="stylesheet" href="modern-ui-layer.css?v=1">` setelah
  `styles.css?v=337`.

## Tidak diubah

- Tidak ada file JavaScript yang disentuh, tidak ada `app-bundle-a/b.min.js`
  yang di-rebuild (tidak perlu — perubahan murni CSS baru + tokenisasi
  value-preserving).
- Tidak ada nilai warna, kontras (Tahap 9), radius, ukuran font, atau
  timing animasi yang berubah.

---

# Changelog — Tahap 1: Audit UI & Pembangunan Design System (Foundation)

Baseline: `repo-final.zip` (v242 / `kw83-tahap0-feature-registry-17`).

## Ditambahkan

- **`design-tokens.css`** (file baru) — sumber tunggal seluruh design
  token: 9 blok warna tema (`[data-theme="..."]`), spacing (`--sp-*`),
  border-radius (`--r-*`), font-size (`--fs-*`), z-index (`--z-*`) —
  dipindah apa adanya dari `styles.css`. Ditambah token baru (aditif):
  - `--font-body`, `--font-heading` (dipakai menggantikan 32 string
    literal `font-family` yang berulang di `styles.css`)
  - 7 token radius tambahan: `--r-2xs`, `--r-3xs`, `--r-4xs`, `--r-3xl`,
    `--r-4xl`, `--r-5xl`, `--r-99` (melengkapi skala radius yang sudah
    ada supaya seluruh `border-radius` di `styles.css` bisa pakai token)
  - Skala referensi `--shadow-xs…xl` dan `--dur-fast…slow` (belum
    dipakai di komponen manapun — disiapkan untuk Tahap 2+)
- **`UI-AUDIT.md`** — hasil audit lengkap CSS/HTML/komponen.
- **`DESIGN-SYSTEM.md`** — katalog design token & inventaris komponen.
- **`CHANGELOG.md`** — dokumen ini.
- **`FILES-CHANGED.md`** — daftar file berubah beserta alasan.

## Diubah (tanpa perubahan visual)

- **`styles.css`**: blok token dipindah ke `design-tokens.css` (diganti
  komentar penunjuk); 71 deklarasi `border-radius` & 32 deklarasi
  `font-family` yang sebelumnya angka/string literal diganti referensi
  `var(--token)` dengan **nilai akhir identik** (value-preserving).
  739 → 727 baris.
- **`index.html`, `app_production.html`**: tambah satu baris
  `<link rel="stylesheet" href="design-tokens.css?v=242">` sebelum
  link `styles.css`, supaya token termuat lebih dulu. Kedua file tetap
  identik satu sama lain (diverifikasi dengan `diff`).

## Tidak diubah

- Tidak ada file JavaScript yang disentuh.
- Tidak ada nilai warna, spacing, radius, ukuran font, shadow, atau
  timing animasi yang berubah — seluruh tokenisasi murni memindahkan
  nilai yang sudah ada ke sebuah variabel dengan nilai yang sama persis.
- `FEATURE_REGISTRY`, ADR-001, Blueprint Final: tidak disentuh.
- Build pipeline (`scripts/build.js`), Service Worker (`sw.js`), cache
  (`CACHE_NAME`), routing, IndexedDB, LocalStorage: tidak disentuh.
- Tidak ada icon library yang ditambahkan — Material Symbols Rounded
  dipertimbangkan tapi ditunda karena kendala CSP + tidak ada akses
  jaringan untuk self-host font (lihat `UI-AUDIT.md` §5 dan
  `DESIGN-SYSTEM.md` §9 untuk detail & rekomendasi Tahap 2).
- Tidak ada fitur yang dihapus, tidak ada file yang dihapus atau
  digabung, tidak ada perubahan struktur folder, tidak ada dependency
  baru.

## Hasil test

```
node --test tests/*.test.js
# tests 1227
# pass 1227
# fail 0
```

Identik sebelum dan sesudah perubahan (1227/1227 pass di kedua kondisi)
— sesuai ekspektasi, karena tidak ada file JavaScript yang tersentuh.

`npm run build` dan `npm run lint` sengaja **tidak dijalankan** pada
sesi ini (di luar scope Tahap 1 / tidak tersedia di sandbox — lihat
`UI-AUDIT.md` §7 untuk detail).

## Rekomendasi untuk Tahap 2

Lihat bagian "Rekomendasi untuk Tahap 2" di `UI-AUDIT.md` untuk daftar
lengkap (6 item): verifikasi `.u-r99`, migrasi inline style → utility
class, self-host icon font, penerapan skala shadow/transition ke
komponen baru, token ukuran font display, dan pemecahan `styles.css`
per domain.

---

## Tahap 6 — Audit Icon & Perbaikan Minimal

Baseline: hasil Tahap 5 (1227/1227 test PASS, tidak ada JS berubah
sejak Tahap 1). Melanjutkan dari posisi "baseline confirmed 1227/1227,
mulai audit icon menyeluruh" — bukan mengulang audit sebelumnya.

### Audit

Diperiksa seluruh 69 file `.js` (termasuk `lifeos/**`), `styles.css`,
`index.html`/`app_production.html` untuk enam kategori icon: SVG
Inline, SVG File, Emoji, Unicode Symbol, Image Icon, CSS Generated
Icon. Ringkasan kuantitatif:

- **Emoji**: 4.759 karakter total — 400 di HTML statis (pola: 1 emoji
  per judul section/kartu/tombol/opsi, dipakai konsisten), ±4.359 di
  JavaScript (mayoritas field `icon:` pada data registry, mis.
  `dashboard-hub-registry.js`, dan label tombol/toast di 60+ file JS
  lain).
- **SVG Inline**: 16 pemakaian, seluruhnya di `index.html`
  (`app_production.html` identik), bergaya konsisten
  (`stroke="currentColor"`, `viewBox="0 0 24 24"`, `stroke-width="2"`).
- **SVG File**: 2 (`icon-192.svg`, `icon-512.svg`) — app icon PWA,
  tidak terkait icon di dalam UI.
- **Unicode Symbol**: `▾` (chevron collapse, 30+×, teks statis di
  `<span class="card-collapse-toggle">`), `✕` (tombol tutup modal,
  7×), `‹ › → ← ↑ ⋮` (navigasi/aksi, konsisten).
- **CSS Generated Icon**: 1 (`details.card summary::after{content:'▾'}`).
- **Image Icon**: 0 (tidak ada icon berupa `<img>` atau
  `background-image` di `styles.css`; satu-satunya kecocokan `<img
  onerror=...>` yang ter-grep adalah contoh string di teks dokumentasi
  keamanan, bukan icon yang dirender).

### Temuan yang dieksekusi

4 tombol `qs-btn` (menu cepat Keuangan, Laporan, Car Notes, AI
Asisten) memakai **icon ganda**: SVG gear inline diikuti langsung oleh
emoji `⚙️` — makna identik, dirender berdampingan. Ini inkonsistensi
nyata dibanding 2 tombol `qs-btn` lain (Dashboard, Shop) yang sudah
benar (SVG + label teks, tanpa duplikasi). Emoji `⚙️` yang redundan
dihapus; SVG gear dipertahankan sebagai satu-satunya icon pada keempat
tombol tersebut. Perubahan murni penghapusan teks di dalam atribut
HTML statis — tidak menyentuh `data-action`, event listener, atribut
`aria-label`, atau file JavaScript manapun.

### Temuan yang TIDAK dieksekusi (rekomendasi Tahap 7)

- **7 emoji `page-title`** (🏠📊🪨🏍️🕌🤖🧭) — aman secara teknis untuk
  diganti SVG lokal (murni teks HTML statis, diverifikasi tidak ada
  JS yang membaca `.page-title` sama sekali — 0 hasil `grep`), tapi
  butuh desain 7 aset SVG baru + review visual, di luar batas
  "perubahan minimal" Tahap 6.
- **±380 emoji lain di HTML** (`card-title`, tombol aksi, `<option>`,
  empty-state) — pola konsisten tapi volume besar, sama seperti di
  atas.
- **±4.359 emoji di JavaScript** — mayoritas field data (`icon:` pada
  registry), tidak bisa diganti tanpa mengubah JavaScript, yang
  dilarang eksplisit di Tahap 6. Dicatat sebagai rekomendasi murni.
- Seluruh Unicode Symbol (`▾ ✕ ‹ › → ← ↑ ⋮`) dan CSS-generated icon
  **dipertahankan** — sudah konsisten, ringan, dan fungsional; tidak
  ada alasan mengganti.

### Hasil test

```
node --test tests/*.test.js
# tests 1227
# pass 1227
# fail 0
```

Identik sebelum dan sesudah (1227/1227 pass di kedua kondisi) — sesuai
ekspektasi karena tidak ada file JavaScript, `styles.css`, ADR-001,
FEATURE_REGISTRY, Blueprint Final, Build System, Service Worker, atau
Routing yang tersentuh.

---

## Tahap 7 — Micro Interaction & Motion System

Baseline: hasil Tahap 6 (1227/1227 PASS, `UI-ICON-AUDIT.md` selesai,
0 JS berubah sejak Tahap 1). Fokus murni polish interaksi ala
Material Design 3 — tidak ada layout, ukuran, spacing, typography,
warna, atau icon yang diubah. Hanya `styles.css` yang disentuh.

### Ditambahkan (aditif)

- **Motion design tokens** di `:root`: `--dur-fast` (100ms),
  `--dur-base` (150ms), `--dur-moderate` (200ms), `--dur-slow`
  (250ms), serta `--ease-standard`, `--ease-emphasized`,
  `--ease-emphasized-accel` (kurva MD3). Semua durasi berada dalam
  target 100–250ms sesuai instruksi.
- **`prefers-reduced-motion`**: blok global yang mempercepat seluruh
  animasi/transisi ke ~0 dan menonaktifkan smooth-scroll bila
  pengguna mengaktifkan preferensi ini di OS/browser — belum ada
  sebelumnya.
- **`:focus-visible`**: ring fokus konsisten (outline, tidak memakan
  ruang layout) untuk seluruh elemen interaktif, plus varian khusus
  untuk `.fi`/`.fs`/`.chat-input` yang sudah punya `:focus` sendiri.
  Sebelumnya aplikasi tidak punya indikator fokus keyboard sama
  sekali di luar input teks.
- **Ripple effect berbasis CSS murni** (pulsa dari tengah elemen,
  tanpa JavaScript, tanpa koordinat sentuh — keterbatasan bawaan
  teknik CSS-only) pada 13 tap-target primer yang aman dari risiko
  clipping: `.btn`, `.chip-btn`, `.type-btn`, `.pm-btn`,
  `.qs-action`, `.bill-action-row`, `.card-collapse-toggle`,
  `.pin-key`, `.theme-card`, `.qs-btn`, `.kasir-tile`,
  `.dashhub-feature-card`, `.customer-card`.
- **Press feedback yang tadinya belum ada**: `.chip-btn:active`,
  `.type-btn:active`, `.pm-btn:active`, `.theme-card:active`
  (scale-down konsisten dengan pola `:active{transform:scale(...)}`
  yang sudah dipakai di `.btn`/`.pin-key`/dll), serta
  `.nav-item:active svg` (scale-down ikon saat bottom nav ditekan).
- **Card elevation on hover** (desktop-only, dibungkus
  `@media (hover:hover) and (pointer:fine)` — pola yang sudah ada
  di file ini sejak sebelumnya): `.card`, `.kasir-tile`,
  `.dashhub-feature-card` mendapat `box-shadow` halus saat hover;
  `.card` & `.dashhub-feature-card` mendapat `transition` baru
  supaya elevasi ini animatif (sebelumnya `.card` tidak punya
  `transition` sama sekali).
- **Hover state tambahan** (desktop-only) untuk `.btn` (brightness),
  `.chip-btn`, `.type-btn`, `.pm-btn`, `.theme-card`, `.qs-btn`,
  `.nav-item`, `.customer-card`, `.bill-action-row` — seluruhnya
  memakai warna yang **sudah ada** di tema (`var(--accent)`,
  `var(--accent-soft)`), tidak ada warna baru diperkenalkan.

### Disempurnakan (nilai lama dipertahankan, hanya kurva/kelengkapan diperhalus)

- `overlayIn`, `slideUp` (dipakai bersama oleh `.modal`, `.calc-modal`,
  `.qs-modal` — dialog & bottom sheet): easing diseragamkan ke token
  MD3 (`--ease-standard` untuk fade overlay, `--ease-emphasized`
  untuk slide masuk sheet/dialog). **Durasi tidak diubah** (tetap
  0.2s/0.25s, hanya direferensikan lewat token `--dur-moderate` /
  `--dur-slow` yang nilainya sama persis). `slideUp` ditambah fade
  opacity `.4→1` beriringan dengan translate, supaya entrance terasa
  lebih halus (standar MD3 emphasized-decelerate).
- `.toast` (snackbar): sebelumnya hanya fade opacity; sekarang
  ditambah slide vertikal kecil (`translate(-50%,10px)` →
  `translate(-50%,0)`) beriringan dengan fade, memakai mekanisme
  `.toast.show` yang **sudah ada** di JS (`toast()` di
  `format-tema.js`/bundle) — tidak ada perubahan JS.
- `.page` (transisi ganti halaman): referensi durasi/easing
  diseragamkan ke token (`--dur-moderate`, `--ease-standard`),
  nilai akhir identik (0.2s, kurva setara `ease`).

### TIDAK dieksekusi (rekomendasi Tahap 8)

- **Exit/closing animation untuk overlay & bottom sheet**: `.overlay`
  disembunyikan lewat `display:none` instan setelah class `.open`
  dilepas oleh JS (`modals.js`) — animasi keluar yang mulus butuh
  penundaan `display:none` (mis. via `animationend`/`setTimeout` di
  JS), yang berada di luar batas "tidak mengubah JavaScript" Tahap 7.
- Ripple sungguhan berbasis koordinat sentuh (bukan pulsa dari
  tengah) — teknis membutuhkan JS untuk membaca posisi klik/tap dan
  menset custom property `--x`/`--y`; versi CSS-only di Tahap 7
  adalah pendekatan terdekat tanpa JS.
- Elevation/hover pada tap-target sekunder lain (`.stat-box.clickable`,
  `.budget-item.clickable`, dll.) — sudah punya `:active` feedback
  memadai, tidak disentuh supaya perubahan tetap minimal.

### Verifikasi non-regresi

```
node --test tests/*.test.js
# tests 1227
# pass 1227
# fail 0
```

Identik sebelum & sesudah. **0 file JavaScript disentuh** (hanya
`styles.css`, +79 baris murni aditif/penyempurnaan). `index.html` dan
`app_production.html` **tidak berubah sama sekali** di Tahap 7 (tetap
identik satu sama lain). ADR-001, FEATURE_REGISTRY, Blueprint Final,
Build System, Service Worker, Routing tidak disentuh.

## Tahap 8 — Final QA, Accessibility, Performance & Release Candidate

Baseline: hasil Tahap 7 (1228/1228 test PASS — lihat catatan angka di
`FINAL-QA.md` §1 — 0 JS berubah sejak Tahap 1). Tahap terakhir: audit
menyeluruh, tanpa fitur baru dan tanpa redesign.

### Ditambahkan

- **`FINAL-QA.md`** (file baru) — laporan audit akhir lengkap:
  Accessibility (focus-visible, keyboard nav, contrast, touch target,
  reduced motion, hover dependency, scroll behavior), Responsive
  (360–1024px), Performance CSS (selector, duplikasi, transition,
  shadow, radius, typography), Design System (konsistensi token),
  Motion Audit, Icon Audit Summary, daftar rekomendasi Tahap 9, dan
  ringkasan Tahap 1–8.

### Diubah

- Tidak ada. Tahap 8 murni dokumentasi — **0 file CSS/JS/HTML
  disentuh**. Seluruh temuan performa/konsistensi CSS (radius, shadow,
  transition, font-size literal vs token) dan kontras warna `--text3`
  dicatat sebagai rekomendasi di `FINAL-QA.md`, tidak dieksekusi,
  mengikuti instruksi eksplisit Tahap 8 ("jangan mengubah jika
  berisiko").

### Hasil test

```
node --test tests/*.test.js
# tests 1228
# pass 1228
# fail 0
```

Identik sebelum & sesudah (tidak ada perubahan kode). **0 file
JavaScript disentuh** sepanjang Tahap 1–8. ADR-001, FEATURE_REGISTRY,
Blueprint Final, Build System, Service Worker, Routing tidak disentuh.

### Rekomendasi untuk Tahap 9

Lihat `FINAL-QA.md` §8 untuk daftar lengkap (6 item CSS risiko rendah,
1 item token warna risiko sedang, 3 item carry-over yang butuh
perubahan JavaScript dari Tahap 6–7).

### Status akhir

Seluruh Quality Gate Tahap 8 **LULUS**. Project dinyatakan
**RELEASE CANDIDATE**, siap digunakan.

## Final Release Candidate — Release Notes, Dokumentasi & Handover

Ini BUKAN tahap pengembangan — murni dokumentasi & handover setelah
Release Candidate (Tahap 8) dinyatakan LULUS. Baseline: hasil Tahap 8
(1228/1228 test PASS, 0 JS berubah sejak Tahap 1).

### Ditambahkan

- **`RELEASE-NOTES.md`** (file baru) — ringkasan Release Candidate,
  highlight perubahan Tahap 1–8, fitur utama, modernisasi UI, design
  system, motion system, accessibility, responsive, performance, icon
  audit, hasil testing, dan quality gate.
- **`PROJECT-SUMMARY.md`** (file baru) — struktur project, arsitektur
  (pola source-file-plus-minified-bundle), design system, file
  penting, entry point, folder utama, komponen utama per domain, dan
  alur aplikasi singkat — ditujukan untuk developer lain yang akan
  memelihara project ini.
- **`KNOWN-ISSUES.md`** (file baru) — seluruh isu yang sengaja belum
  diperbaiki (kontras `--text3`, touch target sekunder, literal CSS
  vs token, emoji `icon:` di JavaScript, exit animation, ripple
  koordinat sentuh), dikelompokkan per kategori risiko perbaikan
  (🟢 CSS-only / 🟡 token warna / 🔴 butuh JavaScript). Murni
  dokumentasi — tidak ada perbaikan dieksekusi.
- **`ROADMAP-v1.1.md`** (file baru) — backlog versi berikutnya,
  dikelompokkan High/Medium/Low Priority, seluruh item yang
  membutuhkan perubahan JavaScript ditandai eksplisit.

### Diubah

- Tidak ada file kode (HTML/CSS/JS) yang diubah. Hanya file Markdown
  baru + pembaruan `CHANGELOG.md`/`FILES-CHANGED.md` (bagian ini).

### Hasil test

```
node --test tests/*.test.js
# tests 1228
# pass 1228
# fail 0
```

Identik dengan hasil Tahap 8 — tidak ada perubahan kode di tahap
finalisasi ini. **0 file JavaScript/CSS/HTML disentuh** sepanjang
Tahap 1 hingga Final Release Candidate. ADR-001, FEATURE_REGISTRY,
Blueprint Final, Build System, Service Worker, Routing tidak disentuh.

### Status akhir

**FINAL RELEASE CANDIDATE** — siap dipelihara dan dikembangkan pada
versi berikutnya. Lihat `RELEASE-NOTES.md` untuk ringkasan rilis,
`PROJECT-SUMMARY.md` untuk onboarding developer baru, `KNOWN-ISSUES.md`
untuk isu yang belum diperbaiki, dan `ROADMAP-v1.1.md` untuk backlog
v1.1.

---

# Changelog — Sprint 1, Tahap 2: Dashboard 2.0 — Hero Card

Baseline: FINAL RELEASE CANDIDATE (v242 / `kw83-tahap0-feature-registry-17`,
1228/1228 test PASS) + Sprint 1 Tahap 1 (`DASHBOARD-2.0-PLAN.md`, audit-only,
0 file kode disentuh).

## Ditambahkan

- **Hero Card** di `page-dashboard-hub` (`index.html`/`app_production.html`)
  — elemen pertama setelah header, sebelum search bar, sesuai
  `DASHBOARD-2.0-PLAN.md` §11/§12. Menampilkan (semua dari data yang SUDAH
  ADA, tidak ada business logic baru):
  - Sapaan + nama profil (`D.profile.nama`, field yang sudah ada)
  - Tanggal hari ini (format native `Date.toLocaleDateString('id-ID', ...)`)
  - Saldo semua akun (`totalSaldoAkun()` dari `akun.js`, dipanggil apa
    adanya — tidak ada logic saldo baru)
  - Pemasukan & pengeluaran bulan berjalan (agregasi `D.transactions` dgn
    pola yang sama persis dgn `renderDashboard()`/`renderDashLaporanMini()`
    di `modules-render.js`)
- **`DashboardHubHero`** (object baru di `dashboard-hub.js`) — modul render
  murni tampilan, dipanggil dari `DashboardHub.render()` secara aditif
  (pola sama dgn `LifeOSHome.render()`/`DashboardHubFavoritView.render()`
  yang sudah ada — tidak mengubah baris lain).
- CSS baru scoped `.dashhub-hero*` di `styles.css` — Material Design 3 /
  Material You: radius besar (`--r-2xl`), gradient aksen tipis, elevation
  via shadow, hierarki tipografi jelas. 100% memakai token yang sudah ada
  (`--r-*`/`--sp-*`/`--fs-*`/`--accent*`/`.green`/`.red`), responsif lewat
  breakpoint yang sudah ada di file ini (`max-width:359px`, `min-width:600px`).
- **`HERO-CARD.md`** — dokumentasi struktur, data, CSS, dan alasan desain
  Hero Card.
- **`tests/dashboard-hub-hero.test.js`** — 8 test baru: render tanpa data
  (placeholder aman), render dgn `D.profile.nama`, saldo positif/negatif,
  agregasi bulan berjalan (termasuk memastikan transaksi bulan lalu &
  transfer diabaikan), dan integrasi ke `DashboardHub.render()` (grid
  kategori tetap tidak berubah).

## Diubah

- **`dashboard-hub.js`**: tambah `_dashHubHeroMonthTx()` + object
  `DashboardHubHero` (murni fungsi baru, tidak ada baris lama yang
  dihapus/diubah), + 1 baris pemanggilan aditif di `DashboardHub.render()`.
- **`index.html`**: tambah blok `<div class="dashhub-hero" id="dashHubHeroCard">…</div>`
  di dalam `#page-dashboard-hub`, sebelum `.dashhub-search-wrap`. Tidak ada
  elemen lain yang dipindah/dihapus.
- **`styles.css`**: tambah blok CSS baru scoped `.dashhub-hero*` (lihat
  `HERO-CARD.md` §CSS). Tidak ada deklarasi `.dashhub-*` yang sudah ada
  yang diubah.
- **`app_production.html`**: disinkronkan ulang jadi salinan persis
  `index.html` lewat `node scripts/build.js` (konvensi proyek yang sudah
  ada sejak awal, bukan proses baru).
- **`app-bundle-a.min.js`, `app-bundle-b.min.js`**: dibuat ulang dari
  source lewat `node scripts/build.js` supaya Hero Card benar-benar
  ter-load di app (kedua file HTML memuat bundle ini, bukan file source
  individual). **`scripts/build.js` sendiri TIDAK diedit/diubah logic-nya**
  — dijalankan apa adanya sesuai alur kerja yang sudah didokumentasikan di
  file itu ("Jalankan skrip ini SETIAP KALI selesai edit file .js sumber").
- **`sw.js`**: `CACHE_NAME` naik ke `kw-cache-v243` — efek samping otomatis
  dari `scripts/build.js` (bagian bump-version, bukan perubahan logic
  Service Worker apa pun).
- Nomor versi `?v=242` → `?v=243` di kedua HTML, dan
  `kw83-tahap0-feature-registry-17` → `-18` di 6 file source versi — juga
  efek samping otomatis `scripts/build.js`, konsisten dgn konvensi versi
  yang sudah ada sejak Tahap 0.
- **`docs/FILE-MAP.md`**: ditulis ulang otomatis oleh `scripts/build.js`
  (bagian dari alur build yang sudah ada, bukan proses baru).

## Tidak diubah

- `FEATURE_REGISTRY` (`dashboard-hub-registry.js`) — tidak disentuh sama
  sekali.
- ADR-001, Routing (`dashHubNavigateToFeature`/`DashboardHub.open`),
  Business Logic (`totalSaldoAkun()` dipakai APA ADANYA, tidak ada
  perubahan di `akun.js`).
- Grid kategori, Favorit, Life OS, Pinned Widgets, Bottom Navigation — tidak
  ada satu baris pun dari komponen-komponen ini yang diubah.
- `scripts/build.js` — dijalankan, tidak diedit.
- Tidak ada dependency baru ditambahkan (`package.json` tidak berubah).

## Hasil test

```
node --test tests/*.test.js
# tests 1235
# pass 1235
# fail 0
```

Catatan: baseline FINAL RELEASE CANDIDATE yang diverifikasi ulang di
lingkungan ini (`node --test tests/*.test.js` pada arsip asli, sebelum
perubahan apa pun) menghasilkan **1227/1227 PASS**, bukan 1228 seperti
disebut di status header — kemungkinan selisih pencatatan minor di
dokumentasi sebelumnya, dicatat di sini demi akurasi. Tidak ada test lama
yang gagal atau dihapus; 8 test baru dari `tests/dashboard-hub-hero.test.js`
ditambahkan murni aditif, sehingga total naik 1227 → 1235.

## Status

Hero Card selesai, sesuai cakupan Sprint 1 Tahap 2. **Belum** mengerjakan
Quick Actions, refactor Grid Dashboard, Widget lain, atau Bottom Navigation
— menunggu instruksi Sprint 1 Tahap 3.

# Changelog — Sprint 1, Tahap 3: Dashboard 2.0 — Quick Actions

Baseline: Sprint 1 Tahap 2 — Hero Card (1235/1235 test PASS, build
`kw83-tahap0-feature-registry-18`, v243).

## Ditambahkan

- **Quick Actions** di `page-dashboard-hub` (`index.html`/`app_production.html`)
  — baris tombol kartu kecil (pill) bergaya Material Design 3/Material You,
  tepat di bawah Hero Card, sebelum search bar. 5 aksi, semua memanggil
  fungsi yang **SUDAH ADA** (tidak ada business logic baru):
  - 💰 **Transaksi** → `openTxModal('expense')` (`transaksi.js`, pola sama
    dgn tombol "+ Pengeluaran" di menu Aksi Cepat lama/`qsDashboard`)
  - 📝 **Catatan** → `openCatatan('anak')` (`transaksi.js`, satu-satunya
    fungsi "buka form catatan" yang sudah ada di app)
  - 💾 **Backup** → `openBackupModal()` (`backup-restore.js`, dipakai juga
    oleh 3 tombol lama lain: `qsDashboard`, `qsShop`, `qsLaporan`)
  - 🔍 **Cari** → fokus native ke `#dashHubSearchInput` yang sudah ada tepat
    di bawah Quick Actions (murni `element.focus()`, bukan logic baru)
  - 🤖 **AI** → `showPage('ai', document.querySelectorAll('.nav-item')[3])`
    (`modal-navigasi.js` + `PAGE_NAV_IDX.ai` yang sudah ada di
    `dashboard-hub.js`, pola sama dgn navigasi "Edit Profil" di `qsAI`)
- CSS baru scoped `.dashhub-qa*` di `styles.css` — 5 kolom grid pill,
  radius penuh (`--r-pill`), 100% memakai token yang sudah ada
  (`--sp-*`/`--r-pill`/`--fs-icon-lg`/`--surface2`/`--surface3`/`--border`/
  `--accent`/`--text2`), breakpoint `max-width:359px` (3 kolom, konsisten
  dgn pola stack Hero Card) & `min-width:600px` (hover state, konsisten dgn
  `.dashhub-feature-card:hover`).
- **`QUICK-ACTIONS.md`** — dokumentasi struktur, aksi, event yang dipanggil,
  CSS baru, dan alasan desain.
- **`tests/dashboard-hub-quickactions.test.js`** — 10 test baru: markup ada
  & posisinya benar (di antara Hero Card & search bar), 5 tombol persis,
  tiap tombol memanggil fungsi yang sudah ada (bukan fungsi baru), Hero
  Card/Grid Dashboard tidak tersentuh, parity `index.html`/
  `app_production.html`, dan token CSS yang dipakai semuanya sudah
  terdefinisi di `:root`.

## Diubah

- **`index.html`**: tambah blok `<div class="dashhub-qa-row" id="dashHubQuickActions">…</div>`
  di dalam `#page-dashboard-hub`, tepat setelah `.dashhub-hero` dan sebelum
  `.dashhub-search-wrap`. Tidak ada elemen lain (Hero Card, search bar,
  Favorit, Grid Dashboard, Life OS, Pinned Widgets) yang dipindah/diubah.
- **`styles.css`**: tambah blok CSS baru scoped `.dashhub-qa*` (lihat
  `QUICK-ACTIONS.md` §3). Tidak ada deklarasi `.dashhub-*` yang sudah ada
  yang diubah.
- **`app_production.html`**: disinkronkan ulang jadi salinan persis
  `index.html` lewat `node scripts/build.js` (konvensi proyek yang sama
  sejak Tahap 2, bukan proses baru).
- **`app-bundle-a.min.js`, `app-bundle-b.min.js`**: dibuat ulang dari source
  lewat `node scripts/build.js` (Quick Actions murni markup, tidak ada
  fungsi JS baru yang perlu ikut ke-bundle — regenerasi ini hanya supaya
  bundle tetap sinkron dgn `index.html` versi terbaru, sama seperti proses
  Tahap 2). **`scripts/build.js` sendiri TIDAK diedit.**
- **`sw.js`**: `CACHE_NAME` naik ke `kw-cache-v244` — efek samping otomatis
  `scripts/build.js`.
- Nomor versi `?v=243` → `?v=244`, dan
  `kw83-tahap0-feature-registry-18` → `-19` — efek samping otomatis
  `scripts/build.js`.
- **`docs/FILE-MAP.md`**: ditulis ulang otomatis oleh `scripts/build.js`.

## Tidak diubah

- `FEATURE_REGISTRY` (`dashboard-hub-registry.js`), ADR-001 — tidak
  disentuh sama sekali.
- Business Logic — tidak ada fungsi baru; kelima tombol Quick Actions
  murni memanggil `openTxModal`/`openCatatan`/`openBackupModal`/`showPage`
  yang sudah ada, atau `.focus()` native ke elemen yang sudah ada.
- Routing (`dashHubNavigateToFeature`/`DashboardHub.open`) — tidak diubah;
  tombol AI memakai `showPage()` langsung (pola yang sudah dipakai di
  markup `qsAI`/`qsDashboard`), bukan lewat `DashboardHub.open()`.
- **Grid Dashboard** (`#dashboardHubGrid`/`#dashboardHubWrap`) — tidak
  disentuh.
- **Widget** (Life OS, Favorit, Pinned Widgets) — tidak disentuh.
- **Bottom Navigation** (`.nav-item`) — tidak disentuh; hanya *dibaca*
  (`document.querySelectorAll('.nav-item')[3]`) untuk parameter `showPage()`,
  sama persis pola yang sudah dipakai di markup `qsDashboard` (mis.
  `document.querySelectorAll('.nav-item')[6]` untuk "Edit Profil").
- `dashboard-hub.js` — **tidak ada baris JS yang diubah**; Quick Actions
  100% markup (HTML+CSS), tidak butuh modul JS baru karena setiap tombol
  langsung memanggil fungsi global yang sudah ada lewat `data-onclick`
  (mekanisme dispatcher yang sudah ada di
  `features-helpers-global-security.js`, pola sama dgn tombol
  `qs-action` yang sudah dipakai di `qsDashboard`/`qsAI`).
- `scripts/build.js` — dijalankan, tidak diedit.
- Tidak ada dependency baru ditambahkan (`package.json` tidak berubah).

## Hasil test

```
node --test tests/*.test.js
# tests 1245
# pass 1245
# fail 0
```

Baseline Tahap 2 (1235/1235 PASS) diverifikasi ulang di lingkungan ini
sebelum perubahan apa pun. Tidak ada test lama yang gagal atau dihapus; 10
test baru dari `tests/dashboard-hub-quickactions.test.js` ditambahkan murni
aditif, sehingga total naik 1235 → 1245.

## Status

Quick Actions selesai, sesuai cakupan Sprint 1 Tahap 3. **Belum**
mengerjakan Widget Dashboard, Grid Dashboard, Statistik, atau AI Insight —
menunggu instruksi Sprint 1 Tahap 4.

# Changelog — Sprint 1 Tahap 4: Modern Dashboard Grid

Baseline: Sprint 1 Tahap 3 selesai (Hero Card + Quick Actions), `node
--test` 1245/1245 PASS. Lihat `DASHBOARD-GRID.md` untuk detail lengkap.

## Diubah

- **`styles.css`** — modernisasi visual Dashboard Grid (Material Design
  3): radius kartu diperbesar (`--r-lg`→`--r-xl`), padding/gap kartu &
  kategori mengikuti token spacing yang sudah ada (`--sp-*`), elevation
  shadow ditambahkan di kartu fitur (default, tekan, & hover), ikon
  kategori diperbesar + shadow tipis, favorite indicator (`.dashhub-fav-star`)
  diubah dari teks bintang polos jadi chip bulat (icon-button M3), dan
  satu class baru `.dashhub-cat-badge` (chip kecil jumlah fitur per
  kategori). Semua **class lama tetap dipakai** (tidak ada rename),
  semua nilai memakai token yang sudah ada di `:root` (tidak ada token
  baru).
- **`dashboard-hub.js`** — 1 baris ditambah: render `.dashhub-cat-badge`
  berisi `cat.features.length` di sebelah label kategori. Murni
  render/tampilan (memakai data yang sudah tersedia saat render),
  **`FEATURE_REGISTRY` tidak disentuh/diubah**.

## Ditambahkan

- **`DASHBOARD-GRID.md`** — dokumentasi deliverable Tahap 4.

## Tidak diubah

- Hero Card, Quick Actions, Bottom Navigation, AI, Statistik, Widget
  Drag & Drop, Search — sama sekali tidak disentuh (di luar cakupan
  Tahap 4).
- `FEATURE_REGISTRY`, ADR-001, business logic, routing, database.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `docs/FILE-MAP.md`, versi aplikasi (`package.json` tidak berubah).
- `scripts/build.js` **tidak dijalankan**.

## Hasil test

```
node --test
# tests 1246
# pass 1246
# fail 0
```

Tidak ada test lama yang gagal; tidak ada test yang dihapus. Hero Card,
Quick Actions, dan seluruh fungsi Dashboard (buka fitur, toggle favorit,
search, LifeOS, Pinned Widgets) diverifikasi tetap tampil & berfungsi
setelah perubahan CSS/markup ini.

## Status

Modern Dashboard Grid selesai, sesuai cakupan Sprint 1 Tahap 4. Sesuai
instruksi, pengerjaan **berhenti di sini** — tahap berikutnya menunggu
instruksi lebih lanjut.

# Changelog — Sprint 1 Tahap 5: Dashboard Summary Cards

Baseline: Sprint 1 Tahap 4 selesai (Hero Card + Quick Actions + Modern
Dashboard Grid), `node --test` 1246/1246 PASS. Lihat `DASHBOARD-SUMMARY.md`
untuk detail lengkap.

## Ditambahkan

- **`dashboard-hub.js`** — fungsi baru murni-baca `_dashHubSummaryMonthTx()`
  + object baru `DashboardHubSummary` (render 4 kartu ringkas: Pemasukan/
  Pengeluaran/Bersih/Jumlah Transaksi bulan berjalan dari `D.transactions`),
  + 1 baris pemanggilan aditif
  `if (typeof DashboardHubSummary !== 'undefined') DashboardHubSummary.render();`
  di dalam `DashboardHub.render()`, pola sama dgn `DashboardHubHero.render()`
  yang sudah ada. Tidak ada baris lama yang dihapus/diubah.
- **`index.html`, `app_production.html`** — tambah blok
  `<div class="dashhub-summary-grid" id="dashHubSummaryGrid"></div>` di
  dalam `#page-dashboard-hub`, tepat setelah `.dashhub-qa-row` (Quick
  Actions), sebelum `.dashhub-search-wrap`. Kedua file tetap identik satu
  sama lain (diverifikasi dengan `diff`).
- **`styles.css`** — blok CSS baru scoped `.dashhub-summary*` (~6
  deklarasi + 1 media query), 100% pakai token yang sudah ada
  (`--sp-*`/`--r-xl`/`--fs-caption`/`--fs-title-sm`/`--surface2`/`--border`)
  serta utility `.green`/`.red` yang sudah ada. Tidak ada deklarasi
  `.dashhub-*` lama yang diubah nilainya.
- **`DASHBOARD-SUMMARY.md`** — dokumentasi deliverable Tahap 5.
- **`tests/dashboard-hub-summary.test.js`** — 6 test baru untuk
  `_dashHubSummaryMonthTx()`/`DashboardHubSummary` + 1 test integrasi
  `DashboardHub.render()`.

## Tidak diubah

- Hero Card (`.dashhub-hero*`), Quick Actions (`.dashhub-qa*`), Dashboard
  Grid (`#dashboardHubGrid`/`.dashhub-cat*`/`.dashhub-feature*`),
  Bottom Navigation, AI, Statistik, Widget Drag & Drop, Search — sama
  sekali tidak disentuh (di luar cakupan Tahap 5).
- `FEATURE_REGISTRY`, ADR-001, business logic, routing, database.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `docs/FILE-MAP.md`, versi aplikasi (`package.json` tidak berubah).
- `scripts/build.js` **tidak dijalankan**.

## Hasil test

```
node --test
# tests 1252
# pass 1252
# fail 0
```

Tidak ada test lama yang gagal; tidak ada test yang dihapus. Hero Card,
Quick Actions, dan seluruh fungsi Dashboard Grid (buka fitur, toggle
favorit, search, LifeOS, Pinned Widgets) diverifikasi tetap tampil &
berfungsi setelah perubahan ini.

## Status

Dashboard Summary Cards selesai, sesuai cakupan Sprint 1 Tahap 5. Sesuai
instruksi, pengerjaan **berhenti di sini** — tidak melanjutkan ke Tahap 6
(AI Insight/Statistik/dst), menunggu instruksi lebih lanjut.

# Changelog — Sprint 1 Tahap 6: Modern Pinned Widgets

Baseline: Sprint 1 Tahap 5 selesai (Hero Card + Quick Actions + Summary
Cards + Modern Dashboard Grid), `node --test` 1252/1252 PASS. Lihat
`PINNED-WIDGETS.md` untuk detail lengkap.

## Diubah

- **`styles.css`** — modernisasi visual 6 widget lama di dalam
  `#dashboardHubPinnedWrap` (`advisorCard`, `lifeBalanceCard`,
  `refleksiCard`, `dashFiCard`, `dashPensiunCard`, `dashAbsensiCard`):
  radius diperbesar via token (`var(--r-2xl)`), padding/spacing lebih
  lega (`--sp-7/8`), elevation shadow default + hover, header
  (`.card-title`) diperjelas (font lebih besar, non-uppercase, garis
  pemisah), + layout responsive (1 kolom mobile → 2 kolom tablet → 3
  kolom desktop, urutan DOM tidak berubah). **Semua aturan di-scope
  lewat descendant selector `#dashboardHubPinnedWrap ...`** — definisi
  dasar `.card`/`.card-title` (dipakai ~40+ kartu lain di seluruh app)
  **tidak diubah sama sekali**.

## Ditambahkan

- **`PINNED-WIDGETS.md`** — dokumentasi deliverable Tahap 6.
- **`tests/dashboard-hub-pinnedwidgets.test.js`** — 11 test baru:
  widget & urutan tidak berubah, markup/`data-action` tiap widget tidak
  berubah, Hero/Quick Actions/Summary Cards/Grid tetap ada, `.card`/
  `.card-title` dasar tidak diedit, override ter-scope dengan benar,
  token CSS valid, breakpoint responsive ada.

## Tidak diubah

- `dashboard-hub.js`, `index.html`, `app_production.html` — **0 baris
  berubah** (modernisasi murni CSS, isi/urutan/event/data widget tidak
  disentuh; rendering isi widget sudah ditangani modul JS masing-masing
  seperti sebelumnya).
- Hero Card, Quick Actions, Summary Cards, Dashboard Grid — sama sekali
  tidak disentuh (di luar cakupan Tahap 6).
- `FEATURE_REGISTRY`, ADR-001, business logic, routing, database.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `docs/FILE-MAP.md`, versi aplikasi (`package.json` tidak berubah).
- `scripts/build.js` **tidak dijalankan**.

## Hasil test

```
node --test
# tests 1263
# pass 1263
# fail 0
```

Tidak ada test lama yang gagal; tidak ada test yang dihapus. Hero Card,
Quick Actions, Summary Cards, dan Dashboard Grid diverifikasi tetap
tampil & berfungsi setelah perubahan CSS ini; 6 widget Pinned tetap
tampil dengan konten/event/urutan yang sama, hanya lebih modern secara
visual.

## Status

Modern Pinned Widgets selesai, sesuai cakupan Sprint 1 Tahap 6. Sesuai
instruksi, pengerjaan **berhenti di sini** — tidak melanjutkan ke AI
Insight, Dashboard Analytics, atau Drag & Drop, menunggu instruksi
Sprint 1 Tahap 7.

# Changelog — Sprint 1 Tahap 7: Dashboard Analytics

Baseline: Sprint 1 Tahap 6 selesai (Hero Card + Quick Actions + Summary
Cards + Modern Dashboard Grid + Modern Pinned Widgets), `node --test`
1263/1263 PASS. Lihat `DASHBOARD-ANALYTICS.md` untuk detail lengkap.

## Ditambahkan

- **`dashboard-hub.js`** — fungsi baru murni-baca
  `_dashHubAnalyticsMonthTx()` + object baru `DashboardHubAnalytics`
  (render 5 kartu horizontal kecil: Transaksi Bulan Ini/Total Pemasukan/
  Total Pengeluaran/Saldo Bersih/Pemasukan vs Pengeluaran (%) dari
  `D.transactions` bulan berjalan), + 1 baris pemanggilan aditif
  `if (typeof DashboardHubAnalytics !== 'undefined') DashboardHubAnalytics.render();`
  di dalam `DashboardHub.render()`, tepat setelah pemanggilan
  `DashboardHubSummary.render()`, pola sama dgn Tahap 5/6. Tidak ada
  baris lama yang dihapus/diubah.
- **`index.html`, `app_production.html`** — tambah blok
  `<div class="dashhub-analytics-row" id="dashHubAnalyticsRow"></div>`
  di dalam `#page-dashboard-hub`, tepat setelah `.dashhub-summary-grid`
  (Summary Cards), sebelum `.dashhub-search-wrap` — sesuai instruksi
  "setelah Summary Cards, sebelum Dashboard Grid". Kedua file tetap
  identik satu sama lain (diverifikasi dengan `diff`).
- **`styles.css`** — blok CSS baru scoped `.dashhub-analytics*` (5
  deklarasi, baris horizontal scroll), 100% pakai token yang sudah ada
  (`--sp-*`/`--r-xl`/`--fs-caption`/`--fs-title-sm`/`--surface2`/
  `--border`) serta utility `.green`/`.red` yang sudah ada. Pola scroll
  horizontal reuse dari `.trs-chip-row`/`.kasir-kat-chips` yang sudah
  ada. Tidak ada deklarasi `.dashhub-*` lama yang diubah nilainya.
- **`DASHBOARD-ANALYTICS.md`** — dokumentasi deliverable Tahap 7.
- **`tests/dashboard-hub-analytics.test.js`** — 7 test baru untuk
  `_dashHubAnalyticsMonthTx()`/`DashboardHubAnalytics` + 1 test
  integrasi `DashboardHub.render()`.

## Tidak diubah

- Hero Card (`.dashhub-hero*`), Quick Actions (`.dashhub-qa*`), Summary
  Cards (`.dashhub-summary*`), Dashboard Grid
  (`#dashboardHubGrid`/`.dashhub-cat*`/`.dashhub-feature*`), Pinned
  Widgets (`#dashboardHubPinnedWrap`) — sama sekali tidak disentuh (di
  luar cakupan Tahap 7).
- `FEATURE_REGISTRY`, ADR-001, business logic, routing, database.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `docs/FILE-MAP.md`, versi aplikasi (`package.json` tidak berubah).
- `scripts/build.js` **tidak dijalankan**.

## Hasil test

```
node --test
# tests 1270
# pass 1270
# fail 0
```

Tidak ada test lama yang gagal; tidak ada test yang dihapus. Hero Card,
Quick Actions, Summary Cards, Dashboard Grid, dan Pinned Widgets
diverifikasi tetap tampil & berfungsi setelah perubahan ini; Dashboard
Analytics tampil sebagai baris kartu horizontal baru di antara Summary
Cards dan search bar.

## Status

Dashboard Analytics selesai, sesuai cakupan Sprint 1 Tahap 7. Sesuai
instruksi, pengerjaan **berhenti di sini** — tidak melanjutkan ke AI
Insight, Drag & Drop, atau Dashboard 3.0, menunggu Sprint 2.

---

# Changelog — Sprint 2 Tahap 1: FAB Halaman Keuangan (Finance 2.0)

Baseline: diaudit ulang langsung dari source code (bukan dari laporan
sebelumnya) — Sprint 1 Tahap 7 selesai, `node --test` **1271/1271
PASS**. Tidak ditemukan artefak Finance 2.0 apa pun (FAB/CSS/test) di
project sebelum Tahap ini; lihat `FINANCE-2.0.md` §0 untuk detail.

## Ditambahkan

- **`index.html`, `app_production.html`** — tambah blok `.keu-fab`
  (FAB tambah transaksi cepat: 💚 Pemasukan / 🔴 Pengeluaran) di dalam
  `#page-keuangan`, tepat setelah `.cn-tabs`, sebelum
  `#keuanganTab-kelola` (supaya tampil di kedua tab Kelola & Laporan).
  Reuse fungsi `openTxModal('income'|'expense')` yang sudah ada di
  `transaksi.js` — **tidak ada fungsi JS baru**. Toggle buka/tutup pakai
  mekanisme `data-onclick` generik yang sudah ada
  (`features-helpers-global-security.js`, tidak diubah). Kedua file
  tetap identik satu sama lain (diverifikasi dengan `diff`).
- **`styles.css`** — blok CSS baru scoped `.keu-fab*` (append di akhir
  file), 100% pakai token yang sudah ada (`--sp-*`/`--r-full`/
  `--r-pill`/`--fs-icon*`/`--z-dropdown`/`--accent`/`--surface3`/
  `--border2`/`--dur-fast`/`--ease-standard`). Tidak ada deklarasi lama
  yang diubah nilainya.
- **`FINANCE-2.0.md`** — dokumentasi deliverable Sprint 2 Tahap 1.
- **`tests/finance-2.0-fab.test.js`** — 12 test struktural baru
  (markup FAB ada & di posisi yang benar, reuse `openTxModal()`, reuse
  `data-onclick`, parity `index.html`/`app_production.html`, CSS pakai
  token yang sudah ada, guard `FEATURE_REGISTRY` & business logic tidak
  disentuh).

## Tidak diubah

- Hero Dashboard, Dashboard, Dashboard Analytics (Tahap 7) — tidak
  disentuh sama sekali.
- Seluruh isi Halaman Keuangan yang sudah ada (Anggaran, Dana Pensiun,
  Proyek Renovasi, Sewa Kios, dll.) — 0 baris berubah.
- `FEATURE_REGISTRY` (`dashboard-hub-registry.js`), ADR-001, business
  logic (`transaksi.js`, `modules-calc.js`, dll.), routing, database.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `docs/FILE-MAP.md`, versi aplikasi (`package.json` tidak berubah).
- `scripts/build.js` **tidak dijalankan**.

## Hasil test

```
node --test
# tests 1283
# pass 1283
# fail 0
```

Tidak ada test lama yang gagal; tidak ada test yang dihapus/diubah.
Hero Dashboard, Dashboard, dan Halaman Keuangan diverifikasi tetap
tampil & berfungsi setelah perubahan ini; FAB tampil sebagai tombol
mengambang baru di Halaman Keuangan.

## Status

FAB Halaman Keuangan selesai, sesuai cakupan Sprint 2 Tahap 1. Sesuai
instruksi, pengerjaan **berhenti di sini** — tidak melanjutkan ke
halaman Shop, Car Notes, atau Laporan, menunggu instruksi Sprint 2
Tahap 2.

---

# Changelog — Sprint 2 Tahap 2: FAB Halaman Shop (Shop 2.0)

Baseline: Sprint 2 Tahap 1 selesai, `node --test` **1283/1283 PASS**.

## Ditambahkan

- **`index.html`, `app_production.html`** — tambah blok `.keu-fab`
  (FAB aksi cepat: 🛒 Transaksi Baru / 📦 Tambah Produk) di dalam
  `#page-shop`, tepat setelah `.cn-tabs`, sebelum `#shopTab-kasir`
  (supaya tampil di seluruh 6 tab Shop). Reuse **penuh** class CSS
  `.keu-fab*` dari Sprint 2 Tahap 1 (tidak ada class baru) dan fungsi
  `openOrderModal()`/`openProductModal()` yang sudah ada — **tidak ada
  fungsi JS baru**. Toggle buka/tutup pakai mekanisme `data-onclick`
  generik yang sudah ada. Kedua file tetap identik satu sama lain
  (diverifikasi dengan `diff`).
- **`styles.css`** — 1 rule aditif `#page-shop .keu-fab{bottom:150px;}`
  supaya FAB Shop tidak tumpang tindih dengan `.kasir-floatbar` di tab
  Kasir AI. Rule `.keu-fab` asli (Tahap 1) tidak diubah nilainya. Tidak
  ada class `.shop-fab*` baru.
- **`SHOP-2.0.md`** — dokumentasi deliverable Sprint 2 Tahap 2.
- **`tests/shop-fab.test.js`** — 16 test struktural baru (markup FAB
  ada & di posisi yang benar, reuse class `.keu-fab*`, reuse
  `openOrderModal()`/`openProductModal()`, reuse `data-onclick`, parity
  `index.html`/`app_production.html`, guard tidak ada class CSS baru,
  guard rule `.keu-fab` asli tidak berubah, guard `cobek-io.js`/
  `cobek-tx-cart.js`/`FEATURE_REGISTRY` tidak disentuh).

## Tidak diubah

- Hero Dashboard, Dashboard, Dashboard Analytics, Halaman Keuangan &
  FAB-nya (Sprint 2 Tahap 1) — tidak disentuh sama sekali.
- Seluruh isi Halaman Shop yang sudah ada (Kasir AI, Manual, Etalase,
  Produsen, Riwayat, Pelanggan) — 0 baris berubah, tetap tampil &
  berfungsi seperti sebelumnya.
- `cobek-io.js` (`openOrderModal`, `setShopTab`), `cobek-tx-cart.js`
  (`openProductModal`) — 0 baris berubah; hanya dipanggil ulang (reuse)
  dari lokasi baru.
- `FEATURE_REGISTRY` (`dashboard-hub-registry.js`), ADR-001, business
  logic, routing, database.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `docs/FILE-MAP.md`, versi aplikasi (`package.json` tidak berubah).
- `scripts/build.js` **tidak dijalankan**.

## Hasil test

```
node --test
# tests 1299
# pass 1299
# fail 0
```

Tidak ada test lama yang gagal/dihapus/diubah. Hero Dashboard,
Dashboard, Halaman Keuangan+FAB, dan Halaman Shop diverifikasi tetap
tampil & berfungsi setelah perubahan ini; FAB tampil sebagai tombol
mengambang baru di seluruh tab Halaman Shop.

## Status

FAB Halaman Shop selesai, sesuai cakupan Sprint 2 Tahap 2. Sesuai
instruksi, pengerjaan **berhenti di sini** — tidak melanjutkan ke
Sprint 2 Tahap 3.

---

# Changelog — Sprint 2 Tahap 3: FAB Halaman Car Notes (Car Notes 2.0)

Baseline: Sprint 2 Tahap 2 selesai, `node --test` **1299/1299 PASS**.

## Ditambahkan

- **`index.html`, `app_production.html`** — tambah blok `.keu-fab`
  (FAB aksi cepat: ⛽ Isi BBM / 🔧 Servis) di dalam `#page-carnotes`,
  tepat setelah `.cn-tabs`, sebelum komentar `<!-- BBM TAB -->` (supaya
  tampil di kedua tab Car Notes). Reuse **penuh** class CSS `.keu-fab*`
  dari Sprint 2 Tahap 1 (tidak ada class baru) dan fungsi
  `openBbmModal()`/`openServisModal()` yang sudah ada — **tidak ada
  fungsi JS baru**. Toggle buka/tutup pakai mekanisme `data-onclick`
  generik yang sudah ada. Kedua file tetap identik satu sama lain
  (diverifikasi dengan `diff`).
- **`CAR-NOTES-2.0.md`** — dokumentasi deliverable Sprint 2 Tahap 3.
- **`tests/car-notes-fab.test.js`** — 17 test struktural baru (markup
  FAB ada & di posisi yang benar, reuse class `.keu-fab*`, reuse
  `openBbmModal()`/`openServisModal()`, reuse `data-onclick`, parity
  `index.html`/`app_production.html`, guard tidak ada class CSS baru
  & tidak ada override posisi baru di `styles.css`, guard
  `vehicle-core.js`/`sparepart-servis.js`/`FEATURE_REGISTRY`/
  `dashboard-hub.js` tidak disentuh).

## Tidak diubah

- Hero Dashboard, Dashboard, Dashboard Analytics, Halaman Keuangan &
  FAB-nya (Tahap 1), Halaman Shop & FAB-nya (Tahap 2) — tidak disentuh
  sama sekali.
- Seluruh isi Halaman Car Notes yang sudah ada (tab BBM & Servis,
  spesifikasi kendaraan, pajak/SIM, sparepart, stok, import data) — 0
  baris berubah, tetap tampil & berfungsi seperti sebelumnya.
- `styles.css` — **tidak disentuh sama sekali** di Tahap 3 ini; FAB Car
  Notes memakai posisi default `.keu-fab` tanpa override tambahan
  (berbeda dari Tahap 2 yang butuh 1 override untuk Shop).
- `vehicle-core.js` (`openBbmModal`, `setCnTab`), `sparepart-servis.js`
  (`openServisModal`) — 0 baris berubah; hanya dipanggil ulang (reuse)
  dari lokasi baru.
- `FEATURE_REGISTRY` (`dashboard-hub-registry.js`), `dashboard-hub.js`,
  ADR-001, business logic kendaraan, routing, database.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `docs/FILE-MAP.md`, versi aplikasi (`package.json` tidak berubah).
- `scripts/build.js` **tidak dijalankan**.

## Hasil test

```
node --test
# tests 1316
# pass 1316
# fail 0
```

Tidak ada test lama yang gagal/dihapus/diubah. Hero Dashboard,
Dashboard, Halaman Keuangan+FAB, Halaman Shop+FAB, dan Halaman Car
Notes diverifikasi tetap tampil & berfungsi setelah perubahan ini; FAB
tampil sebagai tombol mengambang baru di kedua tab Halaman Car Notes.

## Status

FAB Halaman Car Notes selesai, sesuai cakupan Sprint 2 Tahap 3. Sesuai
instruksi, pengerjaan **berhenti di sini** — tidak melanjutkan ke
Sprint 2 Tahap 4.

---

# Changelog — Sprint 2 Tahap 4: FAB Halaman Laporan (Reports 2.0)

Baseline: Sprint 2 Tahap 3 selesai, `node --test` **1316/1316 PASS**.

## Ditambahkan

- **`index.html`, `app_production.html`** — tambah blok `.keu-fab`
  baru (FAB aksi cepat: 🧾 Export PDF / 📄 Export CSV) di dalam
  `#keuanganTab-laporan`, tepat setelah pembukaan div-nya, sebelum
  `.page-settings-btn`. Audit menemukan bahwa Laporan adalah **tab**
  di dalam `#page-keuangan`, bukan page terpisah — FAB baru ini
  (`#laporanFab`) sengaja ditaruh **di dalam** tab Laporan (kontekstual,
  beda dari `#keuFab` Tahap 1 yang ditaruh di luar kedua tab) supaya
  hanya tampil saat tab Laporan aktif, murni lewat toggle `u-dnone`
  yang **sudah ada** (`setKeuanganTab()`, `tx-list-cashflow.js`, tidak
  disentuh) — **tidak ada JS baru sama sekali**. Reuse **penuh** class
  CSS `.keu-fab*` dari Sprint 2 Tahap 1 (tidak ada class baru) dan
  fungsi `exportLaporanPDF()`/`exportCSV()` yang sudah ada. `#keuFab`
  (Tahap 1) tidak diubah, tetap tampil di kedua tab seperti sebelumnya.
  Kedua file tetap identik satu sama lain (diverifikasi dengan `diff`).
- **`styles.css`** — 1 rule aditif
  `#keuanganTab-laporan .keu-fab{bottom:170px;}` supaya `#laporanFab`
  tidak tumpang tindih dengan `#keuFab` saat tab Laporan aktif. Rule
  `.keu-fab` asli (Tahap 1) dan override Shop (Tahap 2) tidak diubah
  nilainya. Tidak ada class `.laporan-fab*`/`.reports-fab*` baru.
- **`REPORTS-2.0.md`** — dokumentasi deliverable Sprint 2 Tahap 4.
- **`tests/laporan-fab.test.js`** — 20 test struktural baru (markup FAB
  ada & di posisi yang benar, penempatan kontekstual di dalam tab
  Laporan, reuse class `.keu-fab*`, reuse
  `exportLaporanPDF()`/`exportCSV()`, reuse `data-onclick`, parity
  `index.html`/`app_production.html`, guard tidak ada class CSS baru &
  guard override posisi, guard `tx-list-cashflow.js`/
  `features-aiwidget-reminder-gdrive-search.js`/`backup-restore.js`/
  `FEATURE_REGISTRY`/`dashboard-hub.js` tidak disentuh).

## Tidak diubah

- Hero Dashboard, Dashboard, Dashboard Analytics, Halaman Shop & FAB-nya
  (Tahap 2), Halaman Car Notes & FAB-nya (Tahap 3) — tidak disentuh
  sama sekali.
- `#keuFab` (Tahap 1) dan seluruh isi tab Kelola & Laporan yang sudah
  ada (filter, grafik, proyeksi arus kas, per kategori, daftar
  transaksi, card export) — 0 baris berubah, tetap tampil & berfungsi
  seperti sebelumnya.
- `tx-list-cashflow.js` (`setKeuanganTab`),
  `features-aiwidget-reminder-gdrive-search.js` (`exportLaporanPDF`),
  `backup-restore.js` (`exportCSV`) — 0 baris berubah; hanya dipanggil
  ulang (reuse) dari lokasi baru.
- `FEATURE_REGISTRY` (`dashboard-hub-registry.js`), `dashboard-hub.js`,
  ADR-001, business logic, routing, database.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `docs/FILE-MAP.md`, versi aplikasi (`package.json` tidak berubah).
- `scripts/build.js` **tidak dijalankan**.

## Hasil test

```
node --test
# tests 1335
# pass 1335
# fail 0
```

Tidak ada test lama yang gagal/dihapus/diubah. Hero Dashboard,
Dashboard, Halaman Keuangan+FAB (Kelola & Laporan), Halaman Shop+FAB,
dan Halaman Car Notes+FAB diverifikasi tetap tampil & berfungsi setelah
perubahan ini; FAB Laporan tampil sebagai tombol mengambang baru,
kontekstual hanya di tab Laporan.

## Status

FAB tab Laporan selesai, sesuai cakupan Sprint 2 Tahap 4. Sesuai
instruksi, pengerjaan **berhenti di sini** — tidak melanjutkan ke
Sprint berikutnya.

---

# Changelog — Tahap 9: Perbaikan Kontras `--text3` (ROADMAP-v1.1.md #1)

Baseline: Sprint 2 Tahap 4 selesai, `node --test` **1336/1336 PASS**.

## Diubah

- **`styles.css`** — 9 baris diubah (hanya value hex `--text3` per
  tema: `dark`, `ocean`, `light`, `stone`, `slate`, `mono`, `sand`,
  `ink`, `sage`), hue/saturation dipertahankan (adjust lightness saja)
  agar kontras terhadap `--bg` dan `--surface2` mencapai ≥4.5:1 (WCAG
  AA). Tidak ada token/class baru, tidak ada value lain per tema yang
  berubah.

## Ditambahkan

- **`tests/theme-text3-contrast.test.js`** — 30 test struktural baru:
  parsing token warna dari `styles.css` + verifikasi rasio kontras WCAG
  tiap tema vs `--bg`/`--surface2`, plus guard tidak ada class baru &
  token lain per tema tetap utuh.
- **`THEME-CONTRAST-FIX.md`** — dokumentasi deliverable Tahap 9.

## Tidak diubah

- Hero Dashboard, Dashboard, Halaman Keuangan+FAB, Shop+FAB, Car
  Notes+FAB, tab Laporan+FAB — tidak disentuh.
- `FEATURE_REGISTRY`, `dashboard-hub.js`, ADR-001, business logic,
  build system, service worker, `package.json`, `index.html`,
  `app_production.html`.
- Item lain di `ROADMAP-v1.1.md` (border-radius, shadow, transition
  token, dll.) — menunggu tahap berikutnya.

## Hasil test

```
node --test
# tests 1366
# pass 1366
# fail 0
```

## Status

Item #1 `ROADMAP-v1.1.md` selesai. Sesuai instruksi, pengerjaan
**berhenti di sini** — tidak melanjutkan ke item roadmap berikutnya.

## Tahap 10 — Exit/Closing Animation Overlay & Bottom Sheet

ROADMAP-v1.1.md item #2 (High Priority, KNOWN-ISSUES.md §5.1).

- **`styles.css`** — tambah `@keyframes overlayOut`/`slideDown` +
  rule `.overlay.closing`/`.calc-overlay.closing` (reverse simetris
  dari `overlayIn`/`slideUp` yang sudah ada, 100% token
  `--dur-moderate`/`--dur-slow`/`--ease-standard`/`--ease-emphasized`).
- **`modal-navigasi.js`** — `closeModal()` sekarang menunda pelepasan
  class `open` lewat `animationend`+fallback `setTimeout`, dengan guard
  re-open cepat & guard id modal tidak ditemukan. `openModal()` +1
  baris (`classList.remove('closing')`).
- **`tests/modal-close-animation.test.js`** — 10 test baru (7
  struktural DOM + 3 struktural CSS).
- **`MODAL-EXIT-ANIMATION.md`** — dokumentasi deliverable Tahap 10.

## Tidak diubah

- Hero Dashboard, Dashboard, Halaman Keuangan+FAB, Shop+FAB, Car
  Notes+FAB, tab Laporan+FAB — tidak disentuh.
- `FEATURE_REGISTRY`, `dashboard-hub.js`, ADR-001, business logic,
  build system, service worker, `package.json`, `index.html`,
  `app_production.html`.
- Modal generik (confirm/prompt/choice/info/pinPrompt) & quick-switcher
  (`openQS`/`closeQS`) — tidak lewat `closeModal()`, di luar scope.
- Item lain di `ROADMAP-v1.1.md` — menunggu tahap berikutnya.

## Hasil test

```
node --test
# tests 1375
# pass 1375
# fail 0
```

## Status

Item #2 `ROADMAP-v1.1.md` selesai. Sesuai instruksi, pengerjaan
**berhenti di sini** — tidak melanjutkan ke item roadmap berikutnya.

## Tahap 11 — Migrasi Token `border-radius`

ROADMAP-v1.1.md item #4 (Medium Priority, KNOWN-ISSUES.md §2.1).

- **`styles.css`** — 42 literal `border-radius` (16px/10px/20px/12px)
  diganti `var(--r-2xl/--r-md/--r-pill/--r-lg)`, value-preserving.
- **`tests/dashboard-hub-pinnedwidgets.test.js`** — 1 guard test
  diupdate mengikuti representasi baru (nilai `.card` tetap 16px).
- **`BORDER-RADIUS-TOKEN-MIGRATION.md`** — dokumentasi deliverable.

## Tidak diubah

- FEATURE_REGISTRY, Dashboard V2, Hero Dashboard, business logic,
  build system, package.json, service worker.
- Item lain di `ROADMAP-v1.1.md` — menunggu tahap berikutnya.

## Hasil test

```
node --test
# tests 1376
# pass 1376
# fail 0
```

## Status

Item #4 `ROADMAP-v1.1.md` selesai.

## Tahap 12 — Konsolidasi Token Durasi Transition

ROADMAP-v1.1.md item #6 (Medium Priority, KNOWN-ISSUES.md §2.3).
Item #5 (box-shadow token) dilewati: token `--shadow-*` yang disebut
di roadmap ternyata belum pernah dibuat.

- **`styles.css`** — 32 literal durasi transition (`0.2s`/`.2s`,
  `0.15s`/`.15s`, `0.25s`/`.25s`) diganti `var(--dur-moderate)`/
  `var(--dur-base)`/`var(--dur-slow)`, value-preserving (hanya nilai
  match persis token yang dimigrasi).
- **`TRANSITION-DURATION-TOKENS.md`** — dokumentasi deliverable.

## Tidak diubah

FEATURE_REGISTRY, Dashboard V2, Hero Dashboard, business logic, build
system, package.json, service worker.

## Hasil test

```
node --test
# tests 1376
# pass 1376
# fail 0
```

## Status

Item #6 `ROADMAP-v1.1.md` selesai.

## Tahap 13 — Touch Target Padding .chip-btn/.qs-btn

ROADMAP-v1.1.md item #7 (Medium Priority, KNOWN-ISSUES.md §1.2).

- **`styles.css`** — padding vertikal `.chip-btn` (6px→11px) & `.qs-btn`
  (7px→12px), font-size/warna/border tidak berubah.
- **`tests/touch-target-padding.test.js`** — 3 test baru.
- **`TOUCH-TARGET-PADDING.md`** — dokumentasi deliverable.

## Tidak diubah

FEATURE_REGISTRY, Dashboard V2, Hero Dashboard, business logic, build
system, package.json, service worker.

## Hasil test

```
node --test
# tests 1379
# pass 1379
# fail 0
```

## Status

Item #7 `ROADMAP-v1.1.md` selesai.

## Tahap 14 — Migrasi Token font-size

ROADMAP-v1.1.md item #9 (Low Priority, KNOWN-ISSUES.md §2.4).

- **`styles.css`** — 51 literal `font-size` (11px/12px/13px) diganti
  `var(--fs-caption/--fs-label/--fs-body)`, value-preserving.
- **`tests/touch-target-padding.test.js`** — 1 guard diupdate mengikuti
  representasi baru (nilai `.chip-btn` tetap 12px).
- **`FONT-SIZE-TOKEN-MIGRATION.md`** — dokumentasi deliverable.

## Tidak diubah

FEATURE_REGISTRY, Dashboard V2, Hero Dashboard, business logic, build
system, package.json, service worker.

## Hasil test

```
node --test
# tests 1379
# pass 1379
# fail 0
```

## Status

Item #9 `ROADMAP-v1.1.md` selesai.

## Tahap 15 — Container max-width Konsisten (.page)

ROADMAP-v1.1.md item #10 (Low Priority, KNOWN-ISSUES.md §3.1).

- **`styles.css`** — +1 rule aditif `.page{max-width:1080px}` di
  `@media (min-width:1024px)`, reuse nilai existing dari
  `#page-dashboard-hub` (tidak diubah, tetap menang via specificity ID).
- **`tests/page-container-maxwidth.test.js`** — 3 test baru.
- **`PAGE-CONTAINER-MAXWIDTH.md`** — dokumentasi deliverable.

## Tidak diubah

`#page-dashboard-hub` (Dashboard V2), FEATURE_REGISTRY, business logic,
build system, package.json, service worker.

## Hasil test

```
node --test
# tests 1382
# pass 1382
# fail 0
```

## Status

Item #10 `ROADMAP-v1.1.md` selesai.

## Tahap 16 — Hover Elevation Tap-Target Sekunder

ROADMAP-v1.1.md item #11 (Low Priority, KNOWN-ISSUES.md §5.3).

- **`styles.css`** — +1 rule hover aditif (`.stat-box.clickable`,
  `.cobek-stat.clickable`, `.bbm-stat.clickable`,
  `.budget-sum-box.clickable`, `.budget-item.clickable`), reuse shadow
  value `.card:hover`, di dalam media block existing.
- **`tests/secondary-clickable-hover.test.js`** — 3 test baru.
- **`SECONDARY-CLICKABLE-HOVER.md`** — dokumentasi deliverable.

## Tidak diubah

FEATURE_REGISTRY, Dashboard V2, Hero Dashboard, business logic, build
system, package.json, service worker.

## Hasil test

```
node --test
# tests 1385
# pass 1385
# fail 0
```

## Status

Item #11 selesai. ROADMAP-v1.1.md item CSS-only/additive/value-preserving
**habis** — sisa #3 (FEATURE_REGISTRY, dilarang), #5 (butuh skala token
baru), #8 (🔴 butuh JS) menunggu sesi terpisah dengan mandat eksplisit.

## Sprint 3 Tahap 3.1 — AI Command Center Foundation

Baseline diverifikasi langsung dari isi repository (bukan klaim sesi
sebelumnya yang tidak konsisten dengan file ini): `node --test`
1384/1384 PASS sebelum tahap ini dimulai.

Foundation registry netral untuk command AI (aksi yang bisa dieksekusi
langsung, dipakai command palette/asisten AI di tahap selanjutnya).
Murni logic, tanpa DOM/UI, tanpa command bawaan apa pun — registry
kosong sampai modul lain mendaftar di Tahap 3.2+. Terpisah dari
FEATURE_REGISTRY (taksonomi navigasi) secara sengaja; tidak membaca
maupun menulis FEATURE_REGISTRY.

- **`ai-command-center.js`** — baru. `window.AICommandCenter`:
  `registerCommand`, `unregisterCommand`, `getCommands`, `getCommand`,
  `execute` (dibungkus try/catch, tidak pernah throw ke pemanggil),
  `clear`.
- **`tests/ai-command-center.test.js`** — 14 test baru.
- **`scripts/build.js`** — +1 baris, daftarkan `ai-command-center.js` ke
  `GROUP_B`. Logic build.js tidak diedit.
- **`AI-COMMAND-CENTER-FOUNDATION.md`** — dokumentasi deliverable.

## Tidak diubah

FEATURE_REGISTRY, Dashboard V2, business logic modul manapun,
`index.html`/`app_production.html`, `sw.js`, `package.json`.

## Hasil test

```
node --test
# tests 1398
# pass 1398
# fail 0
```

## Status

Foundation Tahap 3.1 selesai. Registry aktif tapi kosong — pendaftaran
command nyata & UI command palette adalah scope Tahap 3.2+, sesi
terpisah dengan mandat eksplisit.

## Sprint 3 → Dashboard V2 Migration — RFC Tahap V2.1 (Layout Foundation)

**PLANNING ONLY — tidak ada file kode yang diubah.** `node --test` tetap
1398/1398 PASS (baseline tidak berubah).

Audit + Migration Plan + Dependency Map + Risk Assessment untuk migrasi
Dashboard V2 (evolusi dari Hero Dashboard existing `#page-dashboard-hub`,
BUKAN dashboard terpisah). Temuan audit: istilah "Dashboard V2" sudah
dipakai 15 dokumen sebelumnya sebagai item yang eksplisit "tidak
diubah"; bottom nav (`#mainNav`) & `showPage()` adalah chrome GLOBAL
dipakai semua 8 halaman (termasuk Finance/Vehicle/Reports/Shop) sehingga
tidak bisa diedit langsung tanpa melanggar constraint; tidak ada preseden
Sidebar di codebase (app 100% mobile bottom-nav).

Rencana Tahap V2.1: 5 komponen (Sidebar/Header V2/Main Content
Container/Bottom Navigation V2/FAB V2) dibangun sebagai scaffold BARU,
dormant, tidak wired ke routing/DOM live — tidak menyentuh `#mainNav`,
`showPage()`, `FEATURE_REGISTRY`, atau business logic modul manapun.

- **`DASHBOARD-V2-MIGRATION-RFC.md`** — dokumen RFC lengkap (audit,
  dependency map, risk assessment, daftar file proyeksi implementasi).

## Tidak diubah

Seluruh file kode (0 file kode disentuh). FEATURE_REGISTRY,
`dashboard-hub.js`, `#mainNav`, `showPage()`, business logic
Finance/Vehicle/Reports/Shop, data layer.

## Hasil test

```
node --test
# tests 1398
# pass 1398
# fail 0
```

## Status

RFC menunggu persetujuan eksplisit. Implementasi V2.1 (5 file kode
proyeksi, lihat §6 RFC) BELUM dimulai.

## Tahap V2.1 — Dashboard V2 Shell (Layout Foundation)

Baseline: `node --test` 1399/1399 PASS. BLOCKER "Dashboard V2 Shell
(V2.1) belum ada" dianggap selesai sesi ini — implementasi dieksekusi
persis sesuai `DASHBOARD-V2-MIGRATION-RFC.md` §4.

### Ditambahkan

- **`dashboard-v2-shell.js`** (file baru) — `window.DashboardV2Shell`
  dgn API `init()`/`render()`/`destroy()`. Scaffold 5 komponen layout
  DORMANT (Sidebar, Header V2, Main Content Container, Bottom
  Navigation V2, FAB V2), semua placeholder murni: tidak ada business
  logic, tidak ada routing, tidak ada integrasi `FEATURE_REGISTRY`.
  Root container (`#dashboardV2Root`) dibuat & di-mount lewat JS
  (`document.createElement`/`appendChild`), bukan markup HTML statis —
  0 baris `index.html`/`app_production.html` disentuh. Namespace class
  baru `dashboard-v2-*` (bukan `.nav`/`.nav-item`) supaya tidak
  bersinggungan dgn query global `showPage()`.
- **`tests/dashboard-v2-shell.test.js`** — 15 test baru: API tersedia,
  init/render/destroy idempotent, struktur 5 placeholder, FAB tidak
  interaktif, namespace tidak bentrok `.nav-item`/`#mainNav`, regresi
  Dashboard Hub existing & HTML tidak berubah.
- **`styles.css`**: rule CSS aditif namespace `dashboard-v2-*` utk 5
  komponen, 100% reuse token existing (`--sp-*`, `--fs-*`, `--bg`,
  `--surface`, `--text`/`--text2`, `--border`, `--header-bg`),
  breakpoint Sidebar desktop-only (`min-width:1024px`).
- **`DASHBOARD-V2-SHELL.md`** — dokumentasi deliverable tahap ini.

### Diubah (aditif)

- **`scripts/build.js`**: +1 baris, daftarkan `dashboard-v2-shell.js`
  ke `GROUP_B`. Logic build.js tidak diedit.

### Tidak diubah

`index.html`, `app_production.html`, `dashboard-hub.js`,
`FEATURE_REGISTRY` (`dashboard-hub-registry.js`), `#mainNav`,
`showPage()`, business logic Finance/Vehicle/Reports/Shop/Hero
Dashboard, data layer.

### Hasil test

```
node --test
# tests 1414
# pass 1414
# fail 0
```

### Status

V2.1 (Layout Foundation) selesai, dormant. V2.2+ (wire-up) tetap
menunggu mandat eksplisit terpisah.

## Tahap V2.2 — Dashboard V2: Header V2 & Hero V2

Baseline: `node --test` 1414/1414 PASS (akhir Tahap V2.1). Tidak
mengulang audit; melengkapi isi 2 placeholder existing di
`dashboard-v2-shell.js` (Header, Main Content Container).

### Ditambahkan

- **`dashboard-v2-shell.js`** (diubah, aditif): Header V2 sekarang
  merender 4 sub-placeholder (greeting, tombol search `disabled`,
  tombol notification `disabled`, avatar `role="img"`). Main Content
  Container sekarang membungkus Hero V2 (welcome title `<h2>`, Health
  Score, Balance, Insight) — semua teks statis placeholder, dirender
  sbg anak Main (bukan komponen top-level baru; struktur 5 komponen
  V2.1 tidak berubah). Semua dibangun via `replaceChildren()`, tanpa
  `innerHTML`. Atribut aksesibilitas: `role="banner"`/`role="img"`/
  `role="region"` + `aria-label`/`aria-labelledby` sesuai konteks.
- **`tests/dashboard-v2-hero.test.js`** — 12 test baru (Header/Hero
  dirender, 4 placeholder Hero, idempotent, tetap dormant, regresi
  isolasi dari `FEATURE_REGISTRY`/`showPage()`/`AICommandCenter`/data
  layer/Dashboard Hub existing/HTML).
- **`styles.css`**: rule CSS aditif utk sub-elemen Header V2 & Hero V2,
  100% reuse token existing (`--sp-*`, `--r-pill`, `--r-full`, `--r-xl`,
  `--fs-*`, `--text`/`--text2`, `--surface2`, `--accent-soft`).
- **`DASHBOARD-V2-HERO.md`** — dokumentasi deliverable tahap ini.

### Tidak diubah

API `init()`/`render()`/`destroy()`, struktur top-level 5 komponen
V2.1, `index.html`, `app_production.html`, `dashboard-hub.js`,
`FEATURE_REGISTRY`, `showPage()`, `AICommandCenter`, business logic
Finance/Vehicle/Reports/Shop/Hero Dashboard existing, `scripts/build.js`
(tidak ada file baru yg perlu didaftarkan).

### Hasil test

```
node --test
# tests 1426
# pass 1426
# fail 0
```

### Status

V2.2 selesai, dormant. V2.2.2+/V2.3 (wire-up nyata) tetap menunggu
mandat eksplisit terpisah.

## Tahap V2.3 — Dashboard V2: Summary Cards & Quick Actions

Baseline: `node --test` 1426/1426 PASS (akhir Tahap V2.2). Tidak
mengulang audit; melengkapi Main Content Container di
`dashboard-v2-shell.js` dgn 2 sub-komponen baru, sejajar dgn Hero V2.

### Ditambahkan

- **`dashboard-v2-shell.js`** (diubah, aditif): Main Content Container
  sekarang membungkus 3 anak berurutan — Hero V2 (tidak berubah),
  Summary Cards (baru), Quick Actions (baru). Struktur top-level 5
  komponen V2.1 & API `init()`/`render()`/`destroy()` tidak berubah.
  - **Summary Cards** (`#dashboardV2SummaryCards`, `role="region"`):
    4 kartu placeholder murni — Total Balance, Monthly Income, Monthly
    Expense, Health Score. Semua teks statis `-- (placeholder)`, TIDAK
    membaca `D.profile`/`D.transactions`/sumber data nyata apa pun.
  - **Quick Actions** (`#dashboardV2QuickActions`, `role="region"`):
    4 tombol placeholder — Tambah Transaksi, Catatan Kendaraan, Backup,
    Laporan. **Semua `disabled`**, tanpa `onclick`/`addEventListener`,
    tanpa routing (tidak memanggil `showPage()`), tanpa business logic
    apa pun.
  - Dibangun via `replaceChildren()` di semua level, tanpa `innerHTML`.
    Atribut aksesibilitas: `role="region"` + `aria-label` per section
    & per elemen anak.
- **`tests/dashboard-v2-summary.test.js`** — 13 test baru (struktur
  Main 3 anak berurutan, Summary Cards 4 kartu, Quick Actions 4 tombol
  semua disabled, idempotent, tetap dormant, regresi isolasi dari
  `FEATURE_REGISTRY`/`showPage()`/`AICommandCenter`/data layer/tanpa
  event handler nyata/Dashboard Hub existing/HTML).
- **`DASHBOARD-V2-SUMMARY.md`** — dokumentasi deliverable tahap ini.

### Diubah (penyesuaian test lama, bukan regresi)

- **`tests/dashboard-v2-hero.test.js`**: 1 assersi pada test
  "render() tetap idempotent..." disesuaikan — sebelumnya mengasumsikan
  Main Content Container hanya py 1 anak (Hero). Sejak Tahap V2.3, Main
  py 3 anak (Hero + Summary Cards + Quick Actions); assersi diganti jadi
  memastikan Hero tetap anak pertama & tidak menumpuk. Assersi lain di
  file ini (Header 4 sub-placeholder, Hero 4 placeholder, dormant, dll)
  tidak berubah dan tetap lulus.

### Tidak diubah

`index.html`, `app_production.html`, `dashboard-hub.js`,
`FEATURE_REGISTRY`, `showPage()`, `AICommandCenter`, business logic
Finance/Vehicle/Reports/Shop/Hero Dashboard existing, `scripts/build.js`
(tidak ada file baru yg perlu didaftarkan), `styles.css` (tidak
disentuh — Summary Cards/Quick Actions tahap ini murni struktur DOM,
styling visual di luar scope).

### Hasil test

```
node --test
# tests 1439
# pass 1439
# fail 0
```

### Status

V2.3 (Summary Cards + Quick Actions) selesai, dormant, tidak wired.
Wire-up nyata (sumber data real, aktivasi tombol, integrasi
FEATURE_REGISTRY/routing) tetap di luar scope, butuh mandat eksplisit
terpisah.

## Tahap V2.4 — Dashboard V2: Module Grid & Insight Panel

Baseline: `node --test` 1439/1439 PASS (akhir Tahap V2.3). Melengkapi
Main Content Container dgn 2 sub-komponen baru, sejajar dgn Hero V2/
Summary Cards/Quick Actions.

### Ditambahkan

- **`dashboard-v2-shell.js`** (diubah, aditif): Main Content Container
  sekarang membungkus 5 anak berurutan — Hero, Summary Cards, Quick
  Actions (tidak berubah), Module Grid (baru), Insight Panel (baru).
  - **Module Grid** (`#dashboardV2ModuleGrid`, `role="region"`): 6
    kartu placeholder — Finance, Vehicle, Reports, Family, Documents,
    Settings. Sekadar label statis, tanpa link/routing.
  - **Insight Panel** (`#dashboardV2InsightPanel`, `role="region"`): 3
    baris insight placeholder — "Backup belum dilakukan", "Saldo
    stabil bulan ini", "Kendaraan akan servis". Teks statis, tidak
    membaca data nyata.
- **`tests/dashboard-v2-summary.test.js`**: assersi struktur Main
  disesuaikan (5 anak, bukan 3) + 6 test baru (Module Grid section, 6
  module card, Insight Panel section, 3 insight item, dormant check,
  regresi tanpa routing/event).

### Tidak diubah

Struktur top-level 5 komponen V2.1, API `init()`/`render()`/`destroy()`,
`index.html`, `app_production.html`, `dashboard-hub.js`,
`FEATURE_REGISTRY`, `showPage()`, `AICommandCenter`, `styles.css`,
`scripts/build.js`.

### Hasil test

```
node --test
# tests 1445
# pass 1445
# fail 0
```

### Status

V2.4 (Module Grid + Insight Panel) selesai, dormant, tidak wired.

## Tahap V2.5 — Dashboard V2: Sidebar Navigation & Bottom Navigation V2 items

Baseline: `node --test` 1445/1445 PASS (akhir Tahap V2.4). Melengkapi
ISI 2 placeholder top-level yg dari V2.1 masih teks polos (Sidebar,
Bottom Navigation V2) — konsisten dgn pola `_buildHeader()` (V2.2):
tiap komponen dipecah jadi method builder tersendiri.

### Ditambahkan

- **`dashboard-v2-shell.js`** (diubah, aditif): `render()` di-refactor
  memanggil 2 method builder baru, `_buildSidebar()` dan
  `_buildBottomNav()`, alih-alih membangun teks polos inline. Struktur
  top-level 5 komponen & API `init()`/`render()`/`destroy()` tidak
  berubah.
  - **Sidebar** (`#dashboardV2Sidebar`): 5 item navigasi placeholder —
    Dashboard, Finance, Vehicle, Reports, Settings. Semua
    `<button type="button" disabled>`, namespace class baru
    `dashboard-v2-sidebar-item` (BUKAN `.nav-item`).
  - **Bottom Navigation V2** (`#dashboardV2BottomNav`): 4 item navigasi
    placeholder — Home, Finance, Vehicle, More. Semua
    `<button type="button" disabled>`, namespace class baru
    `dashboard-v2-bottomnav-item`. Class induk `dashboard-v2-bottomnav`
    tidak berubah.
  - Semua tombol `disabled`, tanpa `onclick`/`addEventListener`, tanpa
    routing (tidak memanggil `showPage()`), tanpa business logic apa
    pun — murni placeholder navigasi, sama seperti FAB V2/tombol
    Header V2. Dibangun via `replaceChildren()`, tanpa `innerHTML`.
- **`tests/dashboard-v2-navigation.test.js`** — 10 test baru (root
  tetap 5 komponen, Sidebar 5 item sesuai urutan & disabled, Bottom Nav
  4 item sesuai urutan & disabled, idempotent, tetap dormant, regresi
  isolasi dari `FEATURE_REGISTRY`/`showPage()`/`AICommandCenter`/
  `.nav-item` global/Dashboard Hub existing/HTML).

### Tidak diubah

Struktur top-level 5 komponen V2.1, API `init()`/`render()`/`destroy()`,
`index.html`, `app_production.html`, `dashboard-hub.js`,
`FEATURE_REGISTRY`, `showPage()`, `AICommandCenter`, `styles.css`
(tidak disentuh — item navigasi tahap ini murni struktur DOM, styling
visual di luar scope), `scripts/build.js` (tidak ada file baru yg
perlu didaftarkan), `tests/dashboard-v2-shell.test.js` (V2.1),
`tests/dashboard-v2-hero.test.js` (V2.2), `tests/dashboard-v2-summary.test.js`
(V2.3/V2.4) — tidak ada assersi yg terdampak, tetap 100% lulus tanpa
perubahan.

### Hasil test

```
node --test
# tests 1456
# pass 1456
# fail 0
```

### Status

V2.5 (Sidebar Navigation + Bottom Navigation V2 items) selesai,
dormant, tidak wired. Kelima komponen top-level V2.1 kini py isi
placeholder lengkap (Sidebar, Header, Main, Bottom Nav, FAB). Wire-up
nyata (routing, aktivasi tombol, integrasi FEATURE_REGISTRY) tetap di
luar scope, butuh mandat eksplisit terpisah.

## Tahap V2.6 — Recent Activity

Baseline: akhir Tahap V2.5 (`tests 1456 / pass 1456 / fail 0`).

### Ditambahkan

- **`dashboard-v2-shell.js`** — method baru `_buildRecentActivity()`,
  di-wire ke `_buildMain()` sbg anak ke-6 (setelah Insight Panel V2.4).
  Urutan Main sekarang: Hero -> Summary Cards -> Quick Actions ->
  Module Grid -> Insight Panel -> **Recent Activity**.
  - Recent Activity: 5 baris item aktivitas placeholder murni
    (`dashboardV2RecentActivityItem1..5`, class induk
    `dashboard-v2-recent-activity-item`) — teks statis semacam
    "Transaksi tercatat (placeholder)", TIDAK membaca
    `D.profile`/`D.transactions`/sumber data nyata apa pun. Pola identik
    `_buildInsightPanel()` (V2.4): `role="region"` + `aria-label` pada
    section, tiap item py `aria-label` sendiri, dibangun via
    `replaceChildren()`, tanpa `innerHTML`.
  - Tanpa `onclick`/`addEventListener`, tanpa routing (tidak memanggil
    `showPage()`), tanpa business logic apa pun — sama seperti seluruh
    sub-komponen Main tahap-tahap sebelumnya.
- **`tests/dashboard-v2-activity.test.js`** — 11 test baru (Recent
  Activity ditemukan sbg anak ke-6 Main + role/aria-label, tepat 5
  item, urutan & isi 5 item sesuai, tetap dormant, idempotent, root
  top-level tetap 5 komponen, regresi isolasi dari
  `FEATURE_REGISTRY`/`showPage()`/`AICommandCenter`/`dashboard-hub.js`/
  HTML markup).

### Diubah

- **`tests/dashboard-v2-summary.test.js`** — 2 assersi jumlah anak Main
  disesuaikan dari 5 menjadi 6 (struktur Main sekarang py Recent
  Activity sbg anak ke-6): test struktur Main berurutan, dan test
  idempotensi `render()`. Tidak ada assersi lain yg terdampak — assersi
  `root.children.length` (top-level, tetap 5) tidak diubah.

### Tidak diubah

Struktur top-level 5 komponen V2.1, API `init()`/`render()`/`destroy()`,
`index.html`, `app_production.html`, `dashboard-hub.js`,
`FEATURE_REGISTRY`, `showPage()`, `AICommandCenter`, `styles.css`
(tidak disentuh), `scripts/build.js` (tidak ada file baru yg perlu
didaftarkan), `tests/dashboard-v2-shell.test.js` (V2.1),
`tests/dashboard-v2-hero.test.js` (V2.2),
`tests/dashboard-v2-navigation.test.js` (V2.5) — tidak ada assersi yg
terdampak, tetap 100% lulus tanpa perubahan.

### Hasil test

```
node --test
# tests 1467
# pass 1467
# fail 0
```

### Status

V2.6 (Recent Activity) selesai, dormant, tidak wired. Main Content
Container kini py 6 sub-komponen (Hero, Summary Cards, Quick Actions,
Module Grid, Insight Panel, Recent Activity). Wire-up nyata (data
aktivitas sungguhan, routing, integrasi FEATURE_REGISTRY) tetap di
luar scope, butuh mandat eksplisit terpisah.

## Tahap V2.7 — Statistics Panel

Baseline: akhir Tahap V2.6 (`tests 1467 / pass 1467 / fail 0`).

### Ditambahkan

- **`dashboard-v2-shell.js`** — method baru `_buildStatisticsPanel()`,
  di-wire ke `_buildMain()` sbg anak ke-7 (setelah Recent Activity
  V2.6). Urutan Main sekarang: Hero -> Summary Cards -> Quick Actions
  -> Module Grid -> Insight Panel -> Recent Activity ->
  **Statistics Panel**.
  - Statistics Panel: section `role="region"` + `aria-label="Statistics"`
    berisi 4 kartu statistik placeholder (Income, Expense, Savings,
    Active Vehicles — id `dashboardV2StatisticsCardIncome/Expense/
    Savings/Vehicles`, class induk `dashboard-v2-statistics-card`).
  - Tiap kartu adalah `<button type="button" disabled>` (pola `disabled`
    sama dgn Quick Actions V2.3/Sidebar & Bottom Nav V2.5) berisi 4
    sub-elemen placeholder statis: icon (`dashboard-v2-statistics-icon`),
    title (`dashboard-v2-statistics-title`), value
    (`dashboard-v2-statistics-value`, "-- (placeholder)"), trend
    (`dashboard-v2-statistics-trend`, "-- (placeholder)").
  - Semua teks statis, TIDAK membaca `D.profile`/`D.transactions`/
    sumber data nyata apa pun. Dibangun via `replaceChildren()`, tanpa
    `innerHTML`, tanpa `onclick`/`addEventListener`, tanpa routing
    (tidak memanggil `showPage()`), tanpa integrasi
    `FEATURE_REGISTRY`/`AICommandCenter`, tanpa `fetch`, tanpa state
    baru — murni render-stub dormant, konsisten dgn seluruh
    sub-komponen Main tahap-tahap sebelumnya.
- **`tests/dashboard-v2-statistics.test.js`** — 13 test baru (Statistics
  Panel ditemukan sbg anak ke-7 Main + role/aria-label "Statistics",
  tepat 4 kartu, urutan & atribut `disabled` 4 kartu, isi 4 sub-elemen
  tiap kartu (icon/title/value/trend), tetap dormant, idempotent, root
  top-level tetap 5 komponen, regresi isolasi dari
  `FEATURE_REGISTRY`/`showPage()`/`AICommandCenter`/`fetch`/
  `dashboard-hub.js`/HTML markup).

### Diubah

- **`tests/dashboard-v2-summary.test.js`** — 2 assersi jumlah anak Main
  disesuaikan dari 6 menjadi 7 (struktur Main sekarang py Statistics
  Panel sbg anak ke-7): test struktur Main berurutan, dan test
  idempotensi `render()` (ditambah cek `statisticsPanel.children.length`
  = 4). Tidak ada assersi lain yg terdampak.
- **`tests/dashboard-v2-activity.test.js`** — 1 assersi jumlah anak Main
  di test idempotensi disesuaikan dari 6 menjadi 7 (assersi lain di
  file ini — urutan/id 5 activity item, dormant, regresi — tidak
  terdampak).

### Tidak diubah

Struktur top-level 5 komponen V2.1, API `init()`/`render()`/`destroy()`,
`index.html`, `app_production.html`, `dashboard-hub.js`,
`FEATURE_REGISTRY`, `showPage()`, `AICommandCenter`, `styles.css`
(tidak disentuh), `scripts/build.js` (tidak ada file baru yg perlu
didaftarkan), `tests/dashboard-v2-shell.test.js` (V2.1),
`tests/dashboard-v2-hero.test.js` (V2.2),
`tests/dashboard-v2-navigation.test.js` (V2.5) — tidak ada assersi yg
terdampak, tetap 100% lulus tanpa perubahan.

### Hasil test

```
node --test
# tests 1480
# pass 1480
# fail 0
```

### Status

V2.7 (Statistics Panel) selesai, dormant, tidak wired. Main Content
Container kini py 7 sub-komponen (Hero, Summary Cards, Quick Actions,
Module Grid, Insight Panel, Recent Activity, Statistics Panel). Wire-up
nyata (data statistik sungguhan, aktivasi kartu, routing, integrasi
`FEATURE_REGISTRY`) tetap di luar scope, butuh mandat eksplisit
terpisah.

## Tahap V2.8 — Upcoming Tasks

Baseline: akhir Tahap V2.7 (`tests 1480 / pass 1480 / fail 0`).

### Ditambahkan

- **`dashboard-v2-shell.js`** — method baru `_buildUpcomingTasks()`,
  di-wire ke `_buildMain()` sbg anak ke-8 (setelah Statistics Panel
  V2.7). Urutan Main sekarang: Hero -> Summary Cards -> Quick Actions
  -> Module Grid -> Insight Panel -> Recent Activity -> Statistics
  Panel -> **Upcoming Tasks**.
  - Upcoming Tasks: section `role="region"` + `aria-label="Upcoming
    Tasks"` berisi 5 kartu tugas placeholder (Bayar Listrik, Servis
    Kendaraan, Backup Data, Review Laporan, Perbarui Dokumen — id
    `dashboardV2UpcomingTaskCardListrik/Servis/Backup/Laporan/Dokumen`,
    class induk `dashboard-v2-upcoming-task-card`).
  - Tiap kartu adalah `<button type="button" disabled>` (pola sama
    persis dgn Statistics Panel V2.7) berisi 4 sub-elemen placeholder
    statis: icon (`dashboard-v2-upcoming-task-icon`), title
    (`dashboard-v2-upcoming-task-title`), due date
    (`dashboard-v2-upcoming-task-due-date`, "-- (placeholder)"),
    status (`dashboard-v2-upcoming-task-status`, "-- (placeholder)").
  - Semua teks statis, TIDAK membaca `D.profile`/`D.transactions`/
    sumber data nyata apa pun. Dibangun via `replaceChildren()`, tanpa
    `innerHTML`, tanpa `onclick`/`addEventListener`, tanpa routing
    (tidak memanggil `showPage()`), tanpa integrasi
    `FEATURE_REGISTRY`/`AICommandCenter`, tanpa `fetch`, tanpa state
    baru — murni render-stub dormant, konsisten dgn seluruh
    sub-komponen Main tahap-tahap sebelumnya.
- **`tests/dashboard-v2-upcoming.test.js`** — 13 test baru (Upcoming
  Tasks ditemukan sbg anak ke-8 Main + role/aria-label "Upcoming
  Tasks", tepat 5 kartu, urutan & atribut `disabled` 5 kartu, isi 4
  sub-elemen tiap kartu (icon/title/due date/status), tetap dormant,
  idempotent, root top-level tetap 5 komponen, regresi isolasi dari
  `FEATURE_REGISTRY`/`showPage()`/`AICommandCenter`/`fetch`/
  `dashboard-hub.js`/HTML markup).

### Diubah

- **`tests/dashboard-v2-summary.test.js`** — 2 assersi jumlah anak Main
  disesuaikan dari 7 menjadi 8 (struktur Main sekarang py Upcoming
  Tasks sbg anak ke-8): test struktur Main berurutan, dan test
  idempotensi `render()` (ditambah cek `upcomingTasks.children.length`
  = 5). Tidak ada assersi lain yg terdampak.
- **`tests/dashboard-v2-activity.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 7 menjadi 8 (assersi lain
  di file ini tidak terdampak).
- **`tests/dashboard-v2-statistics.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 7 menjadi 8 (assersi lain
  di file ini tidak terdampak).

### Tidak diubah

Struktur top-level 5 komponen V2.1, API `init()`/`render()`/`destroy()`,
`index.html`, `app_production.html`, `dashboard-hub.js`,
`FEATURE_REGISTRY`, `showPage()`, `AICommandCenter`, `styles.css`
(tidak disentuh), `scripts/build.js` (tidak ada file baru yg perlu
didaftarkan), `tests/dashboard-v2-shell.test.js` (V2.1),
`tests/dashboard-v2-hero.test.js` (V2.2),
`tests/dashboard-v2-navigation.test.js` (V2.5) — tidak ada assersi yg
terdampak, tetap 100% lulus tanpa perubahan.

### Hasil test

```
node --test
# tests 1493
# pass 1493
# fail 0
```

### Status

V2.8 (Upcoming Tasks) selesai, dormant, tidak wired. Main Content
Container kini py 8 sub-komponen (Hero, Summary Cards, Quick Actions,
Module Grid, Insight Panel, Recent Activity, Statistics Panel, Upcoming
Tasks). Wire-up nyata (data tugas sungguhan, aktivasi kartu, routing,
integrasi `FEATURE_REGISTRY`) tetap di luar scope, butuh mandat
eksplisit terpisah.

## Tahap V2.9 — Notifications Center

Baseline: akhir Tahap V2.8 (`tests 1493 / pass 1493 / fail 0`).

### Ditambahkan

- **`dashboard-v2-shell.js`** — method baru `_buildNotifications()`,
  di-wire ke `_buildMain()` sbg anak ke-9 (setelah Upcoming Tasks
  V2.8). Urutan Main sekarang: Hero -> Summary Cards -> Quick Actions
  -> Module Grid -> Insight Panel -> Recent Activity -> Statistics
  Panel -> Upcoming Tasks -> **Notifications Center**.
  - Notifications Center: section `role="region"` + `aria-label=
    "Notifications"` berisi 5 kartu notifikasi placeholder (Backup
    berhasil, Pengeluaran tinggi minggu ini, Jadwal servis mendekat,
    Laporan bulanan siap, Sinkronisasi selesai — id
    `dashboardV2NotificationCardBackup/Pengeluaran/Servis/Laporan/
    Sinkronisasi`, class induk `dashboard-v2-notification-card`).
  - Tiap kartu adalah `<button type="button" disabled>` (pola sama
    persis dgn Upcoming Tasks V2.8/Statistics Panel V2.7) berisi 4
    sub-elemen placeholder statis: icon
    (`dashboard-v2-notification-icon`), title
    (`dashboard-v2-notification-title`), description
    (`dashboard-v2-notification-description`, "-- (placeholder)"),
    timestamp (`dashboard-v2-notification-timestamp`,
    "-- (placeholder)").
  - Semua teks statis, TIDAK membaca `D.profile`/`D.transactions`/
    sumber data nyata apa pun. Dibangun via `replaceChildren()`, tanpa
    `innerHTML`, tanpa `onclick`/`addEventListener`, tanpa routing
    (tidak memanggil `showPage()`), tanpa integrasi
    `FEATURE_REGISTRY`/`AICommandCenter`, tanpa `fetch`, tanpa state
    baru — murni render-stub dormant, konsisten dgn seluruh
    sub-komponen Main tahap-tahap sebelumnya.
- **`tests/dashboard-v2-notifications.test.js`** — 13 test baru
  (Notifications ditemukan sbg anak ke-9 Main + role/aria-label
  "Notifications", tepat 5 kartu, urutan & atribut `disabled` 5 kartu,
  isi 4 sub-elemen tiap kartu (icon/title/description/timestamp),
  tetap dormant, idempotent, root top-level tetap 5 komponen, regresi
  isolasi dari `FEATURE_REGISTRY`/`showPage()`/`AICommandCenter`/
  `fetch`/`dashboard-hub.js`/HTML markup).

### Diubah

- **`tests/dashboard-v2-summary.test.js`** — 2 assersi jumlah anak
  Main disesuaikan dari 8 menjadi 9 (struktur Main sekarang py
  Notifications Center sbg anak ke-9): test struktur Main berurutan
  (ditambah cek `main.children[8].id === 'dashboardV2Notifications'`),
  dan test idempotensi `render()`. Tidak ada assersi lain yg
  terdampak.
- **`tests/dashboard-v2-upcoming.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 8 menjadi 9 (assersi lain
  di file ini tidak terdampak).
- **`tests/dashboard-v2-activity.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 8 menjadi 9 (assersi lain
  di file ini tidak terdampak).
- **`tests/dashboard-v2-statistics.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 8 menjadi 9 (assersi lain
  di file ini tidak terdampak).

### Tidak diubah

Struktur top-level 5 komponen V2.1, API `init()`/`render()`/`destroy()`,
`index.html`, `app_production.html`, `dashboard-hub.js`,
`FEATURE_REGISTRY`, `showPage()`, `AICommandCenter`, `styles.css`
(tidak disentuh), `scripts/build.js` (tidak ada file baru yg perlu
didaftarkan), `tests/dashboard-v2-shell.test.js` (V2.1),
`tests/dashboard-v2-hero.test.js` (V2.2),
`tests/dashboard-v2-navigation.test.js` (V2.5) — tidak ada assersi yg
terdampak, tetap 100% lulus tanpa perubahan.

### Hasil test

```
node --test
# tests 1506
# pass 1506
# fail 0
```

### Status

V2.9 (Notifications Center) selesai, dormant, tidak wired. Main
Content Container kini py 9 sub-komponen (Hero, Summary Cards, Quick
Actions, Module Grid, Insight Panel, Recent Activity, Statistics
Panel, Upcoming Tasks, Notifications Center). Wire-up nyata (data
notifikasi sungguhan, aktivasi kartu, dismiss/read-state, routing,
integrasi `FEATURE_REGISTRY`) tetap di luar scope, butuh mandat
eksplisit terpisah.

## Tahap V2.10 — AI Command Center UI

Baseline: akhir Tahap V2.9 (`tests 1506 / pass 1506 / fail 0`).

### Ditambahkan

- **`dashboard-v2-shell.js`** — method baru `_buildAiCommandCenter()`,
  di-wire ke `_buildMain()` sbg anak ke-10 (setelah Notifications
  Center V2.9). Urutan Main sekarang: Hero -> Summary Cards -> Quick
  Actions -> Module Grid -> Insight Panel -> Recent Activity ->
  Statistics Panel -> Upcoming Tasks -> Notifications Center ->
  **AI Command Center**.
  - AI Command Center: section `role="region"` + `aria-label="AI
    Command Center"` berisi 6 anak: 1 search field placeholder
    (`<input type="text" readonly>`, id
    `dashboardV2AiCommandCenterSearch`, class
    `dashboard-v2-ai-search`), 4 kartu aksi placeholder (Analyze
    Finance, Analyze Vehicle, Generate Report, Smart Assistant — id
    `dashboardV2AiCommandCenterAction<Key>`, class
    `dashboard-v2-ai-action-card`), dan 1 area saran placeholder (id
    `dashboardV2AiCommandCenterSuggestion`, class
    `dashboard-v2-ai-suggestion`, teks statis "-- (placeholder)").
  - Search field murni `readonly` (bukan `disabled`, supaya tetap bisa
    fokus/dibaca screen reader — namun tanpa input handler apa pun).
    4 kartu aksi murni `<button type="button" disabled>` (pola sama
    persis dgn Quick Actions V2.3). Area saran murni `<div>` teks
    statis, bukan elemen interaktif.
  - Semua teks statis, TIDAK ada AI/API/fetch sungguhan apa pun, TIDAK
    membaca `D.profile`/`D.transactions`/sumber data nyata apa pun,
    TIDAK menyentuh `ai-command-center.js` existing (modul AI
    sungguhan tidak disentuh/direferensikan). Dibangun via
    `replaceChildren()`, tanpa `innerHTML`, tanpa `onclick`/
    `addEventListener`, tanpa routing (tidak memanggil `showPage()`),
    tanpa integrasi `FEATURE_REGISTRY`, tanpa state baru — murni
    render-stub dormant, konsisten dgn seluruh sub-komponen Main
    tahap-tahap sebelumnya.
  - Catatan penamaan: identifier kode (id/method) memakai
    `AiCommandCenter` (bukan `AICommandCenter`) supaya tidak collide
    scr string dgn nama modul `AICommandCenter` existing yg sengaja
    diverifikasi TIDAK direferensikan oleh regresi test tahap-tahap
    sebelumnya (V2.2–V2.9). Teks tampilan (`aria-label`) tetap "AI
    Command Center" apa adanya.
- **`tests/dashboard-v2-ai.test.js`** — 14 test baru (AI Command
  Center ditemukan sbg anak ke-10 Main + role/aria-label "AI Command
  Center", tepat 6 anak, search field readonly, urutan & atribut
  `disabled` 4 kartu aksi, suggestion area & isi placeholder, tetap
  dormant, idempotent, root top-level tetap 5 komponen, regresi
  isolasi dari `FEATURE_REGISTRY`/`showPage()`/`AICommandCenter`/
  `fetch`/`ai-command-center.js`/`dashboard-hub.js`/HTML markup).

### Diubah

- **`tests/dashboard-v2-summary.test.js`** — 2 assersi jumlah anak
  Main disesuaikan dari 9 menjadi 10 (struktur Main sekarang py AI
  Command Center sbg anak ke-10): test struktur Main berurutan
  (ditambah cek `main.children[9].id === 'dashboardV2AiCommandCenter'`),
  dan test idempotensi `render()`. Tidak ada assersi lain yg
  terdampak.
- **`tests/dashboard-v2-upcoming.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 9 menjadi 10 (assersi lain
  di file ini tidak terdampak).
- **`tests/dashboard-v2-activity.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 9 menjadi 10 (assersi lain
  di file ini tidak terdampak).
- **`tests/dashboard-v2-statistics.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 9 menjadi 10 (assersi lain
  di file ini tidak terdampak).
- **`tests/dashboard-v2-notifications.test.js`** — 1 assersi jumlah
  anak Main di test idempotensi disesuaikan dari 9 menjadi 10 (assersi
  lain di file ini tidak terdampak).

### Tidak diubah

Struktur top-level 5 komponen V2.1, API `init()`/`render()`/`destroy()`,
`index.html`, `app_production.html`, `dashboard-hub.js`,
`ai-command-center.js`, `FEATURE_REGISTRY`, `showPage()`,
`AICommandCenter`, `styles.css` (tidak disentuh), `scripts/build.js`
(tidak ada file baru yg perlu didaftarkan), `tests/dashboard-v2-shell.test.js`
(V2.1), `tests/dashboard-v2-hero.test.js` (V2.2),
`tests/dashboard-v2-navigation.test.js` (V2.5) — tidak ada assersi yg
terdampak, tetap 100% lulus tanpa perubahan.

### Hasil test

```
node --test
# tests 1520
# pass 1520
# fail 0
```

### Status

V2.10 (AI Command Center UI) selesai, dormant, tidak wired. Main
Content Container kini py 10 sub-komponen (Hero, Summary Cards, Quick
Actions, Module Grid, Insight Panel, Recent Activity, Statistics
Panel, Upcoming Tasks, Notifications Center, AI Command Center).
Wire-up nyata (AI sungguhan, pemrosesan search, aktivasi kartu aksi,
routing, integrasi `FEATURE_REGISTRY`/`AICommandCenter` existing)
tetap di luar scope, butuh mandat eksplisit terpisah.

## Tahap V2.11 — Dashboard V2 – Health Score Widget

### Ditambahkan

- **`dashboard-v2-shell.js`** — method builder baru `_buildHealthScore()`,
  di-wire ke `_buildMain()` sbg anak ke-11 (setelah AI Command Center
  V2.10). Section `role="region"` + `aria-label="Health Score"`, berisi
  6 anak berurutan:
  - 1 circular score placeholder (`dashboardV2HealthScoreCircle`, class
    `dashboard-v2-health-score-circle`) membungkus 1 nilai skor statis
    (`dashboardV2HealthScoreValue`, textContent `"--"`).
  - 1 subtitle statis (`dashboardV2HealthScoreSubtitle`, class
    `dashboard-v2-health-score-subtitle`, textContent "Overall System
    Health").
  - 4 kartu metrik (Finance, Vehicle, Documents, Family), pola identik
    `_buildNotifications()`/`_buildAiCommandCenter()`: `<button
    type="button" disabled>` (class `dashboard-v2-health-metric-card`),
    masing2 berisi 3 anak — icon (`span`, class
    `dashboard-v2-health-metric-icon`), title (`span`, class
    `dashboard-v2-health-metric-title`), status placeholder (`span`,
    class `dashboard-v2-health-metric-status`, textContent "--
    (placeholder)").
  - Semua teks statis, TIDAK ada AI/API/fetch sungguhan apa pun, TIDAK
    membaca `D.profile`/`D.transactions`/sumber data nyata apa pun,
    TIDAK menyentuh `ai-command-center.js`/`dashboard-hub.js`/
    `FEATURE_REGISTRY` existing. Dibangun via `replaceChildren()`,
    tanpa `innerHTML`, tanpa `onclick`/`addEventListener`, tanpa
    routing (tidak memanggil `showPage()`), tanpa state baru — murni
    render-stub dormant, konsisten dgn seluruh sub-komponen Main
    tahap-tahap sebelumnya. Namespace class baru memakai konvensi
    `dashboard-v2-health-*`, belum ada deklarasi CSS baru
    (`styles.css` tidak disentuh).
- **`tests/dashboard-v2-health.test.js`** — 13 test baru (Health Score
  Widget ditemukan sbg anak ke-11 Main + role/aria-label "Health
  Score", tepat 6 anak, circular score placeholder & subtitle,
  urutan & atribut `disabled`/isi 4 kartu metrik, tetap dormant,
  idempotent, root top-level tetap 5 komponen, regresi isolasi dari
  `FEATURE_REGISTRY`/`showPage()`/`AICommandCenter`/`fetch`/
  `dashboard-hub.js`/HTML markup).

### Diubah

- **`tests/dashboard-v2-summary.test.js`** — 2 assersi jumlah anak
  Main disesuaikan dari 10 menjadi 11 (assersi lain di file ini tidak
  terdampak).
- **`tests/dashboard-v2-upcoming.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 10 menjadi 11 (assersi
  lain di file ini tidak terdampak).
- **`tests/dashboard-v2-activity.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 10 menjadi 11 (assersi
  lain di file ini tidak terdampak).
- **`tests/dashboard-v2-statistics.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 10 menjadi 11 (assersi
  lain di file ini tidak terdampak).
- **`tests/dashboard-v2-notifications.test.js`** — 1 assersi jumlah
  anak Main di test idempotensi disesuaikan dari 10 menjadi 11
  (assersi lain di file ini tidak terdampak).
- **`tests/dashboard-v2-ai.test.js`** — 1 assersi jumlah anak Main di
  test idempotensi disesuaikan dari 10 menjadi 11 (assersi lain di
  file ini tidak terdampak, termasuk assersi anak ke-10 AI Command
  Center yg tetap benar).

### Tidak diubah

Struktur top-level 5 komponen V2.1, API `init()`/`render()`/`destroy()`,
`index.html`, `app_production.html`, `dashboard-hub.js`,
`ai-command-center.js`, `FEATURE_REGISTRY`, `showPage()`,
`AICommandCenter`, `styles.css` (tidak disentuh), `scripts/build.js`
(tidak ada file baru yg perlu didaftarkan), `tests/dashboard-v2-shell.test.js`
(V2.1), `tests/dashboard-v2-hero.test.js` (V2.2),
`tests/dashboard-v2-navigation.test.js` (V2.5) — tidak ada assersi yg
terdampak, tetap 100% lulus tanpa perubahan.

### Hasil test

```
node --test
# tests 1533
# pass 1533
# fail 0
```

### Status

V2.11 (Health Score Widget) selesai, dormant, tidak wired. Main
Content Container kini py 11 sub-komponen (Hero, Summary Cards, Quick
Actions, Module Grid, Insight Panel, Recent Activity, Statistics
Panel, Upcoming Tasks, Notifications Center, AI Command Center, Health
Score Widget). Wire-up nyata (kalkulasi skor sungguhan, integrasi data
Finance/Vehicle/Documents/Family nyata, aktivasi kartu metrik, routing)
tetap di luar scope, butuh mandat eksplisit terpisah.

## Tahap V2.12 — Dashboard V2 – Predictive Insights

### Ditambahkan

- **`dashboard-v2-shell.js`** — method builder baru
  `_buildPredictiveInsights()`, di-wire ke `_buildMain()` sbg anak
  ke-12 (setelah Health Score Widget V2.11). Section `role="region"`
  + `aria-label="Predictive Insights"`, berisi 5 kartu insight
  prediktif berurutan (Cash Flow Forecast, Budget Trend, Vehicle
  Maintenance Prediction, Family Schedule Prediction, Document
  Expiration Prediction), pola identik
  `_buildNotifications()`/`_buildAiCommandCenter()`/
  `_buildHealthScore()`: `<button type="button" disabled>` (class
  `dashboard-v2-predictive-card`), masing2 berisi 5 sub-elemen —
  icon (`span`, class `dashboard-v2-predictive-icon`), title (`span`,
  class `dashboard-v2-predictive-title`), prediction placeholder
  (`span`, class `dashboard-v2-predictive-prediction`, textContent
  `"--"`), confidence placeholder (`span`, class
  `dashboard-v2-predictive-confidence`, textContent `"--"`), dan
  recommendation placeholder (`span`, class
  `dashboard-v2-predictive-recommendation`, textContent "--
  (placeholder)").
  - Semua teks statis, TIDAK ada AI/API/fetch sungguhan apa pun, TIDAK
    membaca `D.profile`/`D.transactions`/sumber data nyata apa pun,
    TIDAK ada perhitungan/prediksi sungguhan apa pun, TIDAK menyentuh
    `ai-command-center.js`/`dashboard-hub.js`/`FEATURE_REGISTRY`
    existing. Dibangun via `replaceChildren()` (di level section & di
    level setiap kartu), tanpa `innerHTML`, tanpa `onclick`/
    `addEventListener`, tanpa routing (tidak memanggil `showPage()`),
    tanpa state baru — murni render-stub dormant, konsisten dgn
    seluruh sub-komponen Main tahap-tahap sebelumnya. Namespace class
    baru memakai konvensi `dashboard-v2-predictive-*`, belum ada
    deklarasi CSS baru (`styles.css` tidak disentuh).
- **`tests/dashboard-v2-predictive.test.js`** — 11 test baru
  (Predictive Insights ditemukan sbg anak ke-12 Main +
  role/aria-label "Predictive Insights", tepat 5 kartu, urutan &
  atribut `disabled`/isi 5 kartu (icon/title/prediction/confidence/
  recommendation), tetap dormant, idempotent, root top-level tetap 5
  komponen, regresi isolasi dari
  `FEATURE_REGISTRY`/`showPage()`/`AICommandCenter`/`fetch`/
  `dashboard-hub.js`/HTML markup).

### Diubah

- **`tests/dashboard-v2-summary.test.js`** — 2 assersi jumlah anak
  Main disesuaikan dari 11 menjadi 12 (assersi lain di file ini tidak
  terdampak).
- **`tests/dashboard-v2-upcoming.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 11 menjadi 12 (assersi
  lain di file ini tidak terdampak).
- **`tests/dashboard-v2-activity.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 11 menjadi 12 (assersi
  lain di file ini tidak terdampak).
- **`tests/dashboard-v2-statistics.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 11 menjadi 12 (assersi
  lain di file ini tidak terdampak).
- **`tests/dashboard-v2-notifications.test.js`** — 1 assersi jumlah
  anak Main di test idempotensi disesuaikan dari 11 menjadi 12
  (assersi lain di file ini tidak terdampak).
- **`tests/dashboard-v2-ai.test.js`** — 1 assersi jumlah anak Main di
  test idempotensi disesuaikan dari 11 menjadi 12 (assersi lain di
  file ini tidak terdampak).
- **`tests/dashboard-v2-health.test.js`** — 1 assersi jumlah anak Main
  di test idempotensi disesuaikan dari 11 menjadi 12 (assersi lain di
  file ini tidak terdampak, termasuk assersi anak ke-11 Health Score
  yg tetap benar).

### Tidak diubah

Struktur top-level 5 komponen V2.1, API `init()`/`render()`/`destroy()`,
`index.html`, `app_production.html`, `dashboard-hub.js`,
`ai-command-center.js`, `FEATURE_REGISTRY`, `showPage()`,
`AICommandCenter`, `styles.css` (tidak disentuh), `scripts/build.js`
(tidak ada file baru yg perlu didaftarkan), `tests/dashboard-v2-shell.test.js`
(V2.1), `tests/dashboard-v2-hero.test.js` (V2.2),
`tests/dashboard-v2-navigation.test.js` (V2.5) — tidak ada assersi yg
terdampak, tetap 100% lulus tanpa perubahan.

### Hasil test

```
node --test
# tests 1544
# pass 1544
# fail 0
```

### Status

V2.12 (Predictive Insights) selesai, dormant, tidak wired. Main
Content Container kini py 12 sub-komponen (Hero, Summary Cards, Quick
Actions, Module Grid, Insight Panel, Recent Activity, Statistics
Panel, Upcoming Tasks, Notifications Center, AI Command Center, Health
Score Widget, Predictive Insights). Wire-up nyata (perhitungan
prediksi/forecast sungguhan, integrasi data Finance/Vehicle/Family/
Documents nyata, aktivasi kartu, routing, styling visual) tetap di
luar scope, butuh mandat eksplisit terpisah.

## Tahap V2.13 — Dashboard V2 – Automation Center

### Ditambahkan

- **`dashboard-v2-shell.js`** — method builder baru
  `_buildAutomationCenter()`, di-wire ke `_buildMain()` sbg anak ke-13
  (setelah Predictive Insights V2.12). Section `role="region"` +
  `aria-label="Automation Center"`, berisi 5 kartu automation
  berurutan (Auto Backup, Monthly Report, Budget Reminder, Vehicle
  Service Reminder, Document Renewal Reminder), pola identik
  `_buildNotifications()`/`_buildAiCommandCenter()`/
  `_buildHealthScore()`/`_buildPredictiveInsights()`: `<button
  type="button" disabled>` (class `dashboard-v2-automation-card`),
  masing2 berisi 5 sub-elemen — icon (`span`, class
  `dashboard-v2-automation-icon`), title (`span`, class
  `dashboard-v2-automation-title`), schedule placeholder (`span`,
  class `dashboard-v2-automation-schedule`, textContent `"--"`),
  status placeholder (`span`, class `dashboard-v2-automation-status`,
  textContent `"Disabled"`), dan description placeholder (`span`,
  class `dashboard-v2-automation-description`, teks statis per kartu).
  - Semua teks statis, TIDAK ada AI/API/fetch sungguhan apa pun, TIDAK
    membaca `D.profile`/`D.transactions`/sumber data nyata apa pun,
    TIDAK ada scheduling/eksekusi automation sungguhan apa pun, TIDAK
    menyentuh `ai-command-center.js`/`dashboard-hub.js`/
    `FEATURE_REGISTRY` existing. Dibangun via `replaceChildren()` (di
    level section & di level setiap kartu), tanpa `innerHTML`, tanpa
    `onclick`/`addEventListener`, tanpa routing (tidak memanggil
    `showPage()`), tanpa state baru — murni render-stub dormant,
    konsisten dgn seluruh sub-komponen Main tahap-tahap sebelumnya.
    Namespace class baru memakai konvensi
    `dashboard-v2-automation-*`, belum ada deklarasi CSS baru
    (`styles.css` tidak disentuh).
- **`tests/dashboard-v2-automation.test.js`** — 11 test baru
  (Automation Center ditemukan sbg anak ke-13 Main +
  role/aria-label "Automation Center", tepat 5 kartu, urutan &
  atribut `disabled`/isi 5 kartu (icon/title/schedule/status/
  description), tetap dormant, idempotent, root top-level tetap 5
  komponen, regresi isolasi dari
  `FEATURE_REGISTRY`/`showPage()`/`AICommandCenter`/`fetch`/
  `dashboard-hub.js`/HTML markup).

### Diubah

- **`tests/dashboard-v2-summary.test.js`** — 2 assersi jumlah anak
  Main disesuaikan dari 12 menjadi 13 (assersi lain di file ini tidak
  terdampak).
- **`tests/dashboard-v2-upcoming.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 12 menjadi 13 (assersi
  lain di file ini tidak terdampak).
- **`tests/dashboard-v2-activity.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 12 menjadi 13 (assersi
  lain di file ini tidak terdampak).
- **`tests/dashboard-v2-statistics.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 12 menjadi 13 (assersi
  lain di file ini tidak terdampak).
- **`tests/dashboard-v2-notifications.test.js`** — 1 assersi jumlah
  anak Main di test idempotensi disesuaikan dari 12 menjadi 13
  (assersi lain di file ini tidak terdampak).
- **`tests/dashboard-v2-ai.test.js`** — 1 assersi jumlah anak Main di
  test idempotensi disesuaikan dari 12 menjadi 13 (assersi lain di
  file ini tidak terdampak).
- **`tests/dashboard-v2-health.test.js`** — 1 assersi jumlah anak Main
  di test idempotensi disesuaikan dari 12 menjadi 13 (assersi lain di
  file ini tidak terdampak).
- **`tests/dashboard-v2-predictive.test.js`** — 1 assersi jumlah anak
  Main di test idempotensi disesuaikan dari 12 menjadi 13 (assersi
  lain di file ini tidak terdampak, termasuk assersi anak ke-12
  Predictive Insights yg tetap benar).

### Tidak diubah

Struktur top-level 5 komponen V2.1, API `init()`/`render()`/`destroy()`,
`index.html`, `app_production.html`, `dashboard-hub.js`,
`ai-command-center.js`, `FEATURE_REGISTRY`, `showPage()`,
`AICommandCenter`, `styles.css` (tidak disentuh), `scripts/build.js`
(tidak ada file baru yg perlu didaftarkan), `tests/dashboard-v2-shell.test.js`
(V2.1), `tests/dashboard-v2-hero.test.js` (V2.2),
`tests/dashboard-v2-navigation.test.js` (V2.5) — tidak ada assersi yg
terdampak, tetap 100% lulus tanpa perubahan.

### Hasil test

```
node --test
# tests 1555
# pass 1555
# fail 0
```

### Status

V2.13 (Automation Center) selesai, dormant, tidak wired. Main Content
Container kini py 13 sub-komponen (Hero, Summary Cards, Quick Actions,
Module Grid, Insight Panel, Recent Activity, Statistics Panel,
Upcoming Tasks, Notifications Center, AI Command Center, Health Score
Widget, Predictive Insights, Automation Center). Wire-up nyata
(scheduling/eksekusi automation sungguhan, integrasi backup/laporan/
reminder nyata, aktivasi kartu, routing, styling visual) tetap di luar
scope, butuh mandat eksplisit terpisah.

## Tahap V2.14A — Dashboard V2 Activation Framework

### Ditambahkan

- **`dashboard-v2-activation.js`** (file baru) — mekanisme feature flag
  internal in-memory untuk Dashboard V2, terpisah sepenuhnya dari
  `dashboard-v2-shell.js`:
  - `isDashboardV2Enabled()` — baca state flag saat ini. Default `false`.
  - `enableDashboardV2()` — set flag jadi `true`. Idempotent.
  - `disableDashboardV2()` — set flag jadi `false`. Idempotent.
  State disimpan di variabel closure top-level file (`_dashboardV2Enabled`),
  in-memory saja (tidak localStorage/cookie/query-param), reset ke default
  `false` setiap file di-load ulang. Tiga fungsi juga ditempel ke
  `window` (pola sama dgn `window.DashboardV2Shell` di
  `dashboard-v2-shell.js`) untuk pemakaian di browser.
  File ini TIDAK membaca/menulis `FEATURE_REGISTRY`, TIDAK memanggil
  `showPage()`, TIDAK menyentuh DOM sama sekali, TIDAK
  meng-instantiate/memanggil `DashboardV2Shell`, TIDAK menghubungkan
  data (`D.profile`/`D.transactions`/dst). Flag ini murni disiapkan
  untuk dibaca oleh tahap wiring terpisah nanti — mengaktifkannya di
  tahap ini SENDIRIAN tidak menampilkan apa pun karena belum ada kode
  lain di repo yang membacanya.
- **`tests/dashboard-v2-activation.test.js`** — 11 test baru: default
  `false`, `enableDashboardV2()`, `disableDashboardV2()`, idempotensi
  enable & disable, transisi berulang, isolasi state antar-instance
  load, jaminan tidak menyentuh `document`/DOM, jaminan tidak memanggil
  `showPage()`, jaminan tidak mengakses `FEATURE_REGISTRY`, serta cek
  statis (grep) atas source file untuk memastikan tidak ada baris kode
  aktif yang mereferensikan `showPage(`, `FEATURE_REGISTRY`, atau
  `DashboardV2Shell`.
- **`scripts/build.js`** — mendaftarkan `dashboard-v2-activation.js` di
  daftar file bundle, tepat setelah `dashboard-v2-shell.js` (murni
  administratif supaya file baru ikut ter-bundle; tidak mengubah urutan
  atau entri lain).
- **`DASHBOARD-V2-ACTIVATION.md`** (file baru) — dokumentasi tahap ini.

### Tidak diubah

`FEATURE_REGISTRY` (`dashboard-hub-registry.js`), `showPage()`,
`dashboard-hub.js`, `index.html`, `app_production.html`,
`dashboard-v2-shell.js`, seluruh business logic aplikasi (D.*), routing,
serta seluruh test suite V2.1–V2.13 yang sudah ada — tidak ada satu
baris pun di file-file tersebut yang tersentuh tahap ini. Dashboard
lama (Dashboard Hub existing) tetap default & aktif sepenuhnya, tidak
terpengaruh oleh flag ini.

### Hasil test

```
node --test
# tests 1566
# pass 1566
# fail 0
```

### Status

Mekanisme aktivasi (feature flag) untuk Dashboard V2 sudah tersedia
tapi belum dipakai di mana pun — Dashboard V2 tetap 100% dormant,
Dashboard lama tetap default. Wiring nyata (mis. `dashboard-hub.js`
atau titik lain membaca `isDashboardV2Enabled()` untuk memutuskan
render Dashboard mana yang ditampilkan) tetap di luar scope, butuh
mandat eksplisit terpisah (tahap integrasi berikutnya).

## Tahap V2.14B — Dashboard V2 Activation Wiring (render, baca-saja)

### Diubah

- **`dashboard-v2-shell.js`** — `render()` sekarang membaca
  `isDashboardV2Enabled()` (global dari `dashboard-v2-activation.js`,
  V2.14A) satu kali di awal, untuk menentukan 2 atribut root yang sudah
  ada sejak V2.1 (`hidden`, `data-dashboard-v2-state`):
  - Flag `false` (default) → root tetap `hidden` + `data-dashboard-v2-state="dormant"` (perilaku identik V2.1–V2.13, tidak berubah).
  - Flag `true` → atribut `hidden` dilepas (`removeAttribute`) +
    `data-dashboard-v2-state="active"`.
  Dipanggil via `typeof isDashboardV2Enabled === 'function'` guard, jadi
  kalau `dashboard-v2-activation.js` belum ter-load di suatu environment,
  `render()` tetap jalan tanpa error dan fallback ke dormant (tidak ada
  perubahan perilaku dari sebelumnya). Struktur top-level 5 komponen,
  API `init()`/`render()`/`destroy()`, dan seluruh sub-komponen Main
  (Hero .. Automation Center) tidak berubah — satu-satunya perubahan
  adalah blok baca-flag + toggle 2 atribut di awal `render()`.
  Tidak ada `showPage()`, tidak ada `FEATURE_REGISTRY`, tidak ada
  pembacaan data Finance/Vehicle/AI, tidak ada `fetch`, tidak ada
  property state instance baru (`this.*`), tidak ada event listener baru.
- **`tests/dashboard-v2-shell.test.js`** dan test V2.1–V2.13 lainnya —
  **tidak diubah**. Karena sandbox test-test tersebut tidak menyuntik
  `isDashboardV2Enabled`, guard `typeof` di `render()` otomatis fallback
  ke `false` (dormant) — perilaku persis sama seperti sebelum tahap ini,
  jadi tidak ada assertion yang perlu disesuaikan.

### Ditambahkan

- **`tests/dashboard-v2-activation-render.test.js`** (file baru) — 11
  test: default (`isDashboardV2Enabled` tidak ada/`false`) tetap hidden
  + dormant; setelah flag `true` → hidden dilepas + `active`; setelah
  flag kembali `false` → hidden lagi + dormant; environment tanpa
  `isDashboardV2Enabled` sama sekali tetap fallback ke dormant tanpa
  error; idempotensi `render()` saat flag `true` maupun `false` (tetap 1
  root, tetap 5 children, atribut konsisten); transisi berulang
  `false → true → false → true`; jaminan `render()` tidak memanggil
  `showPage()`; jaminan `render()` tidak mengakses `FEATURE_REGISTRY`;
  jaminan `render()` hanya MEMBACA flag (tidak memanggil
  `enableDashboardV2()`/`disableDashboardV2()` sendiri); serta cek
  statis (grep atas source, di luar baris komentar) untuk memastikan
  tidak ada referensi kode aktif ke `showPage(`/`FEATURE_REGISTRY`.
  Flag activation di test ini disimulasikan lewat fungsi
  `isDashboardV2Enabled` yang di-inject manual ke sandbox
  `dashboard-v2-shell.js` (bukan menjalankan `dashboard-v2-activation.js`
  sungguhan) — logic enable/disable itu sendiri sudah dites terpisah di
  `tests/dashboard-v2-activation.test.js` (V2.14A).
- **`DASHBOARD-V2-ACTIVATION-RENDER.md`** (file baru) — dokumentasi
  tahap ini.

### Tidak diubah

`dashboard-v2-activation.js` (V2.14A, sudah final — tidak disentuh),
`FEATURE_REGISTRY` (`dashboard-hub-registry.js`), `showPage()`,
`dashboard-hub.js`, `index.html`, `app_production.html`, routing, dan
seluruh business logic aplikasi (`D.*`). Dashboard lama tetap default
& aktif sepenuhnya. Seluruh test suite V2.1–V2.14A yang sudah ada tidak
diubah, tetap 100% lulus tanpa modifikasi assertion.

### Hasil test

```
node --test
# tests 1577
# pass 1577
# fail 0
```

### Status

`DashboardV2Shell.render()` kini secara nyata terhubung ke activation
flag (V2.14A) — tapi Dashboard V2 tetap dormant secara default & tidak
ada satu pun titik lain di repo yang memanggil
`enableDashboardV2()`/mengaktifkan flag ini. Dashboard lama tetap
satu-satunya yang tampil ke pengguna. Wiring rendering nyata ke UI
(kapan/bagaimana `DashboardV2Shell.init()`/`render()` benar-benar
dipanggil dari titik masuk aplikasi, serta penggantian Dashboard lama)
tetap di luar scope, butuh mandat eksplisit terpisah.

## Tahap V2.14C — Dashboard V2 Mount (baca activation flag di DashboardHub.render())

### Diubah

- **`dashboard-hub.js`** — `DashboardHub.render()` menambah SATU blok
  baru di akhir (pola sama persis dgn conditional render() opsional yg
  sudah ada: `LifeOSHome.render()`, `DashboardHubFavoritView.render()`,
  `DashboardHubHero.render()`, `DashboardHubSummary.render()`,
  `DashboardHubAnalytics.render()`):
  ```js
  if (typeof isDashboardV2Enabled === 'function' && isDashboardV2Enabled() === true
    && typeof DashboardV2Shell !== 'undefined') {
    DashboardV2Shell.init();
    DashboardV2Shell.render();
  }
  ```
  Flag `false` (default) → blok ini no-op total, Dashboard lama berjalan
  identik dgn sebelum tahap ini. Flag `true` → `DashboardV2Shell.init()`
  lalu `DashboardV2Shell.render()` dipanggil (keduanya idempotent by
  contract dari V2.1/V2.14B, jadi `DashboardHub.render()` dipanggil
  berkali-kali tidak menumpuk root/children Dashboard V2). Tidak ada
  perubahan lain di `dashboard-hub.js` — `showPage()`, `FEATURE_REGISTRY`,
  `DashboardHub.open()`, dan seluruh logic render existing di atas blok
  ini tidak tersentuh.
- **12 file test lama** (`tests/dashboard-v2-shell.test.js`,
  `tests/dashboard-v2-hero.test.js`, `tests/dashboard-v2-activity.test.js`,
  `tests/dashboard-v2-statistics.test.js`,
  `tests/dashboard-v2-notifications.test.js`,
  `tests/dashboard-v2-upcoming.test.js`, `tests/dashboard-v2-ai.test.js`,
  `tests/dashboard-v2-health.test.js`,
  `tests/dashboard-v2-predictive.test.js`,
  `tests/dashboard-v2-automation.test.js`,
  `tests/dashboard-v2-navigation.test.js`,
  `tests/dashboard-v2-summary.test.js`) — masing2 punya SATU assertion
  peninggalan V2.1–V2.13 yg menjamin `dashboard-hub.js` **0 referensi**
  ke `DashboardV2Shell` (`assert.doesNotMatch(hubSrc, /DashboardV2Shell/)`).
  Assertion itu SENGAJA jadi usang di tahap ini (mount V2.14C memang
  dimandatkan menyentuh `dashboard-hub.js`), jadi diperbarui: sekarang
  menjamin referensi `DashboardV2Shell` di `dashboard-hub.js` muncul
  **tepat 1x**, **di dalam guard `typeof DashboardV2Shell !== 'undefined'`**
  (bukan unconditional / tersebar di banyak tempat). Tidak ada assertion
  lain di file2 ini yg diubah.

### Ditambahkan

- **`tests/dashboard-v2-mount.test.js`** (file baru) — 11 test: default
  (flag `false`) Dashboard lama tetap jalan & `DashboardV2Shell` sama
  sekali tidak dipanggil; flag `true` → `init()` dipanggil; flag `true`
  → `render()` dipanggil; flag `false` (disable) → Dashboard lama tetap,
  `DashboardV2Shell` tidak dipanggil; `DashboardHub.render()` dipanggil
  berkali-kali saat flag `true` → `init()`/`render()` Dashboard V2 ikut
  1:1 (bukan dobel dalam satu panggilan); jaminan tidak dobel dalam satu
  panggilan `DashboardHub.render()`; environment tanpa
  `isDashboardV2Enabled` sama sekali → tidak error, tidak mount;
  environment tanpa `DashboardV2Shell` sama sekali → tidak error walau
  flag `true`; jaminan tidak memanggil `showPage()`; jaminan blok mount
  tidak "memakai" `FEATURE_REGISTRY` dgn cara baru; serta cek statis
  (grep atas potongan source di sekitar blok mount) memastikan blok itu
  tidak mereferensikan `FEATURE_REGISTRY`/`showPage(` secara tekstual.
- **`DASHBOARD-V2-MOUNT.md`** (file baru) — dokumentasi tahap ini.

### Tidak diubah

`dashboard-v2-shell.js` (V2.1–V2.14B), `dashboard-v2-activation.js`
(V2.14A), `FEATURE_REGISTRY`/`dashboard-hub-registry.js`, `showPage()`,
`index.html`, `app_production.html`, routing, dan seluruh business
logic aplikasi (`D.*`, Finance/Vehicle/Reports/AI). Dashboard lama tetap
default & aktif — mount Dashboard V2 hanya terjadi kalau flag activation
diaktifkan secara eksplisit, dan tidak ada satu pun titik lain di repo
yang melakukan itu.

### Hasil test

```
node --test
# tests 1588
# pass 1588
# fail 0
```

### Status

Dashboard V2 kini bisa benar-benar ter-mount ke DOM (via
`DashboardV2Shell.init()`+`render()`) setiap kali `DashboardHub.render()`
dipanggil — TAPI hanya kalau activation flag (V2.14A) diaktifkan. Karena
tidak ada kode produksi yang memanggil `enableDashboardV2()`, flag tetap
`false` secara default dan Dashboard lama tetap satu-satunya yang
tampil ke pengguna. Titik masuk nyata untuk mengaktifkan flag ini (mis.
toggle developer/QA, query-param, atau UI settings) tetap di luar
scope, butuh mandat eksplisit terpisah.

## Tahap V2.14C+ — Guard Init-Once Dashboard V2 Mount

Baseline: hasil akhir V2.14C (`node --test` → 1588/1588 PASS).

### Ditambahkan

- **Guard init-once** di `DashboardHub.render()` (blok mount Dashboard V2,
  V2.14C): `DashboardV2Shell.init()` kini hanya dipanggil **sekali** (flag
  internal `DashboardHub._dashHubV2Initialized`), sedangkan
  `DashboardV2Shell.render()` tetap dipanggil setiap kali
  `DashboardHub.render()` dipanggil, selama `isDashboardV2Enabled() ===
  true`. Sebelumnya `init()` ikut terpanggil ulang tiap `DashboardHub.
  render()` — aman (idempotent by contract), tapi kerja sia-sia.
- **`tests/dashboard-v2-init-once.test.js`** (file baru) — 8 test baru:
  init() sekali walau render() berkali-kali, render() tetap 1:1 dgn
  jumlah panggilan `DashboardHub.render()`, disable→enable ulang tidak
  memicu init() kedua, beberapa siklus disable/enable tetap 1x init,
  Dashboard lama tetap normal saat flag false, environment tanpa
  `DashboardV2Shell` tidak error, tidak memanggil `showPage()`, dan
  jaminan statis blok guard tidak mereferensikan `FEATURE_REGISTRY`.
- **`DASHBOARD-V2-INIT-ONCE.md`** — dokumentasi deliverable tahap ini.

### Diubah

- **`dashboard-hub.js`**: hanya blok mount Dashboard V2 di dalam
  `DashboardHub.render()` (lihat V2.14C) yang disentuh — dibungkus guard
  `if (!DashboardHub._dashHubV2Initialized) { ...init()... }`. Tidak ada
  baris lain di file ini yang diubah.
- **`tests/dashboard-v2-mount.test.js`**: 1 assertion pada test
  `"DashboardHub.render() dipanggil berkali-kali saat flag true..."`
  disesuaikan — sebelumnya menegaskan `init()` ikut bertambah di
  panggilan `render()` ke-2 (perilaku V2.14C sebelum guard ini), kini
  menegaskan `init()` tetap 1 sedangkan `render()` tetap bertambah.
  Assertion lain di file yang sama tidak disentuh.

### Tidak diubah

`dashboard-v2-shell.js`, `dashboard-v2-activation.js`,
`FEATURE_REGISTRY`/`dashboard-hub-registry.js`, `showPage()`,
`index.html`, `app_production.html`, routing, dan seluruh business
logic aplikasi. Dashboard lama tetap default & aktif; guard ini murni
menghemat panggilan `init()` saat flag Dashboard V2 aktif — tidak
mengubah kapan/apakah Dashboard V2 muncul.

### Hasil test

```
node --test
# tests 1596
# pass 1596
# fail 0
```

## Tahap V2.14D — Auto Destroy Dashboard V2 + Perbaikan Kontrak Test

Baseline: hasil akhir Tahap "Guard Init-Once" (`node --test` → 1596/1596
PASS).

### Ditambahkan

- **Blok auto-destroy** di `DashboardHub.render()` (setelah blok
  mount/init-once V2.14C+): kalau `isDashboardV2Enabled() === false`
  **dan** `DashboardV2Shell` tersedia **dan** `DashboardHub.
  _dashHubV2Initialized === true` (pernah ter-init sebelumnya), maka
  `DashboardV2Shell.destroy()` dipanggil TEPAT SEKALI, lalu
  `_dashHubV2Initialized` di-reset ke `false`. Guard memakai pola
  `typeof` yang sama dengan blok mount di atasnya.
- **`DASHBOARD-V2-AUTO-DESTROY.md`** — dokumentasi deliverable tahap
  ini.

### Diubah

- **`dashboard-hub.js`**: hanya method `DashboardHub.render()`, blok
  setelah guard init-once — ditambah blok auto-destroy baru. Tidak ada
  baris lain yang disentuh, `dashboard-v2-shell.js` tidak diubah.
- **12 file test** (`tests/dashboard-v2-activity.test.js`,
  `dashboard-v2-ai.test.js`, `dashboard-v2-automation.test.js`,
  `dashboard-v2-health.test.js`, `dashboard-v2-hero.test.js`,
  `dashboard-v2-mount.test.js`, `dashboard-v2-navigation.test.js`,
  `dashboard-v2-notifications.test.js`, `dashboard-v2-predictive.test.js`,
  `dashboard-v2-shell.test.js`, `dashboard-v2-statistics.test.js`,
  `dashboard-v2-summary.test.js`, `dashboard-v2-upcoming.test.js`) — 1
  assertion tiap file disesuaikan: sebelumnya menegaskan referensi tekstual
  `typeof DashboardV2Shell !== 'undefined'` muncul TEPAT 1x di
  `dashboard-hub.js`; sekarang menegaskan TEPAT 2x (1 guard mount/init +
  1 guard auto-destroy), sesuai kontrak baru. Regression check TIDAK
  dihapus — hanya angka & komentarnya diperbarui.
- **`tests/dashboard-v2-init-once.test.js`**: mock `DashboardV2Shell`
  ditambah `destroy()`. Dua test yang sebelumnya menegaskan "init()
  hanya sekali selama umur aplikasi" ditulis ulang mengikuti kontrak
  baru "init() sekali PER SIKLUS AKTIVASI": disable men-trigger
  `destroy()` sekali, enable berikutnya boleh memanggil `init()` lagi.
  Test "Dashboard lama (flag false dari awal)" ditambah assertion
  `destroy() === 0` (belum pernah init, jadi destroy tidak boleh
  terpanggil). Test lain di file ini tidak berubah logikanya.

### Tidak diubah

`dashboard-v2-shell.js`, `dashboard-hub-registry.js`
(`FEATURE_REGISTRY`), `showPage()`, `index.html`,
`app_production.html`, routing, dan seluruh business logic aplikasi.
Dashboard lama tetap default & aktif.

### Hasil test

```
node --test tests/dashboard-v2-init-once.test.js
# tests 8
# pass 8
# fail 0

node --test
# tests 1596
# pass 1596
# fail 0
```

## Tahap V2.15 — Dashboard V2 Activation Switch

Baseline: hasil akhir Tahap V2.14D — Auto Destroy (`node --test` →
1596/1596 PASS).

### Ditambahkan

- **Blok Activation Switch** (`_dashHubV2SwitchHtml()`, fungsi baru) di
  `dashboard-hub.js`: merender satu blok toggle UI (checkbox + label
  "Dashboard V2 aktif/nonaktif") di bagian atas `#dashboardHubGrid`,
  HANYA kalau `isDashboardV2Enabled`/`enableDashboardV2`/
  `disableDashboardV2` (dari `dashboard-v2-activation.js`, V2.14A)
  semuanya tersedia sbg function — pola guard `typeof` yang sama dengan
  blok mount/init-once/auto-destroy. Kalau salah satu tidak tersedia,
  blok ini no-op total (tidak ada markup switch sama sekali).
- **`DashboardHub.toggleDashboardV2()`** (method baru): dipanggil lewat
  `data-action="DashboardHub.toggleDashboardV2"` pada checkbox switch
  (pola sama dgn `data-action="DashboardHub.open"` yang sudah ada). Baca
  state sekarang lewat `isDashboardV2Enabled()`, panggil
  `disableDashboardV2()` kalau sedang `true` / `enableDashboardV2()`
  kalau sedang `false` (keduanya fungsi existing V2.14A, tidak diubah),
  lalu panggil `DashboardHub.render()` supaya switch dan seluruh blok
  mount/init-once/auto-destroy (V2.14C/V2.14D, tidak diubah) langsung
  mengikuti state baru.
- **`tests/dashboard-v2-activation-switch.test.js`** (file baru) — 11
  test: switch tidak dirender tanpa API aktivasi, switch dirender saat
  API tersedia, checkbox mengikuti `isDashboardV2Enabled()`, label
  "Dashboard V2" muncul, `toggleDashboardV2()` memanggil
  `enableDashboardV2()`/`disableDashboardV2()` sesuai arah flip,
  `toggleDashboardV2()` memanggil `DashboardHub.render()` tepat 1x,
  tidak memanggil `showPage()`, jaminan statis tidak mereferensikan
  `FEATURE_REGISTRY`, aman tanpa `DashboardV2Shell`, dan idempotent saat
  dipanggil berulang.
- **`DASHBOARD-V2-ACTIVATION-SWITCH.md`** — dokumentasi deliverable
  tahap ini.

### Diubah

- **`dashboard-hub.js`**: satu fungsi baru (`_dashHubV2SwitchHtml()`)
  ditambahkan sebelum deklarasi `const DashboardHub`; `el.innerHTML` di
  `DashboardHub.render()` diubah dari
  `FEATURE_REGISTRY.map(...).join('')` menjadi
  `_dashHubV2SwitchHtml() + FEATURE_REGISTRY.map(...).join('')`; satu
  method baru (`toggleDashboardV2()`) ditambahkan ke objek `DashboardHub`
  setelah `render()`, sebelum `open()`. Tidak ada baris lain yang
  disentuh — blok mount/init-once/auto-destroy (V2.14C/V2.14D) persis
  sama, `dashboard-v2-shell.js` dan `dashboard-v2-activation.js` tidak
  diubah.

### Tidak diubah

`dashboard-v2-shell.js`, `dashboard-v2-activation.js`,
`FEATURE_REGISTRY`/`dashboard-hub-registry.js`, `showPage()`,
`index.html`, `app_production.html`, routing, seluruh business logic
aplikasi, dan seluruh file test lama (tidak ada assertion di file test
manapun yang diubah pada tahap ini — hanya 1 file test baru). Dashboard
lama tetap default & aktif; switch murni menambah cara MENGUBAH flag
lewat UI, tidak mengubah kapan/apakah Dashboard V2 muncul untuk flag
yang sama.

### Hasil test

```
node --test tests/dashboard-v2-activation-switch.test.js
# tests 11
# pass 11
# fail 0

node --test
# tests 1607
# pass 1607
# fail 0
```

## Tahap V2.16 — Dashboard V2 Data Adapter Layer

Baseline: hasil akhir Tahap V2.15 — Activation Switch (`node --test` →
1607/1607 PASS).

### Ditambahkan

- **`dashboard-v2-data-adapter.js`** (file baru, satu-satunya file
  produksi baru tahap ini) — lapisan baca-saja (read-only) di atas state
  global `D` (features-helpers-global-security.js), empat fungsi murni:
  - `getFinanceSummary()` — `accountCount`/`totalBalance` dari
    `D.accounts`, `transactionCount` dari `D.transactions`.
  - `getVehicleSummary()` — `vehicleCount` dari `D.vehicles`,
    `bbmLogCount` dari `D.bbmLogs`, `servisLogCount` dari `D.servisLogs`.
  - `getFamilySummary()` — `anakCount` dari `D.catatan.anak`,
    `milestoneDoneCount`/`milestoneTotalCount` dari `D.milestones`,
    `reminderCount` dari `D.reminders`.
  - `getDocumentSummary()` — `simCount` dari `D.simList`,
    `vehicleTaxDocCount` dari field dokumen pajak per kendaraan
    (`pajakTahunanTgl`/`pajakLimaTahunTgl`/`ujiKelayakanTgl` di tiap
    elemen `D.vehicles`, ditulis `vehicle-core.js`).
  Semua fungsi: guard `typeof D` (return `null` kalau `D` belum
  ter-load), tanpa `fetch`, tanpa state baru (tidak ada `let`/`var`
  top-level), tanpa mutasi `D`, tanpa routing/`showPage()`/
  `FEATURE_REGISTRY`.
- **`tests/dashboard-v2-data-adapter.test.js`** (file baru) — 18 test:
  perhitungan tiap fungsi ringkasan, penanganan data kosong/tidak
  lengkap, guard saat `D` belum ter-load/`null`, jaminan read-only lewat
  `Proxy` yang melarang `set`/`deleteProperty` pada `D`, tidak menyentuh
  `document`/`showPage()`/`FEATURE_REGISTRY`, dan jaminan statis tidak
  ada `let`/`var` top-level maupun referensi tekstual `fetch(`/
  `DashboardV2Shell`.
- **`DASHBOARD-V2-DATA-ADAPTER.md`** — dokumentasi deliverable tahap
  ini, termasuk hasil inspeksi sumber data existing per domain.

### Diubah

Tidak ada. Tahap ini murni menambah file baru — `dashboard-hub.js`,
`dashboard-v2-shell.js`, `dashboard-v2-activation.js`, dan seluruh file
test lama TIDAK disentuh.

### Tidak diubah

Dashboard lama, business logic (`D.*` writer: `transaksi.js`,
`vehicle-core.js`, `akun.js`, dst), `FEATURE_REGISTRY`/
`dashboard-hub-registry.js`, `showPage()`, `index.html`,
`app_production.html`, routing. Dashboard V2 BELUM memakai adapter ini
di tahap ini — tidak ada satu pun titik lain di repo yang memanggil
`getFinanceSummary()`/`getVehicleSummary()`/`getFamilySummary()`/
`getDocumentSummary()`. Wiring pemakaian oleh Dashboard V2 di luar
scope tahap ini.

### Hasil test

```
node --test tests/dashboard-v2-data-adapter.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1625
# pass 1625
# fail 0
```

## Tahap V2.17 — Dashboard V2 Hero Data Integration

Baseline: hasil akhir Tahap V2.16 — Dashboard V2 Data Adapter Layer
(`node --test` → 1625/1625 PASS).

### Diubah

- **`dashboard-v2-shell.js`** — `_buildHero()` (satu-satunya fungsi yang
  disentuh tahap ini) sekarang mulai memakai
  `dashboard-v2-data-adapter.js` (V2.16), TAPI HANYA di Hero. 4 elemen
  baru ditambah sbg anak Hero (additive, di bawah 4 elemen lama Tahap
  V2.2 yang TIDAK diubah):
  - `dashboardV2HeroFinanceSummary` — dari `getFinanceSummary()`.
  - `dashboardV2HeroVehicleSummary` — dari `getVehicleSummary()`.
  - `dashboardV2HeroFamilySummary` — dari `getFamilySummary()`.
  - `dashboardV2HeroDocumentSummary` — dari `getDocumentSummary()`.

  Setiap fungsi adapter dipanggil lewat guard `typeof fn === 'function'`
  (pola sama dgn `isDashboardV2Enabled()`, Tahap V2.14B) — shell TIDAK
  membaca `D` langsung sama sekali, satu-satunya jalur baca data tetap
  lewat adapter. Kalau fungsi adapter tidak tersedia ATAU return `null`
  (mis. `D` belum ter-load — guard internal adapter sendiri), elemen
  fallback ke teks placeholder ("Keuangan: -- (placeholder)" dst) — 4
  elemen baru ini SELALU ada & SELALU punya teks, tidak pernah
  kosong/`undefined`. Summary Cards, Module Grid, Statistics, Activity,
  Notifications, Automation, AI, Predictive, Health — semua di luar Hero
  — TIDAK disentuh sama sekali.

### Ditambahkan

- **`tests/dashboard-v2-hero-data.test.js`** (file baru) — 17 test:
  4 elemen data summary baru tampil dgn fallback placeholder saat
  adapter tidak di-load/return `null`; 4 elemen lama (title/healthScore/
  balance/insight) tidak berubah; masing-masing dari 4 fungsi adapter
  menampilkan ringkasan sungguhan saat tersedia & ada data (di-mock per
  fungsi); integrasi sungguhan end-to-end (adapter ASLI + shell dalam
  satu sandbox, `D` tiruan) untuk kasus ada data, `D` belum ter-load, dan
  idempotency `render()`; aksesibilitas (`aria-label` di 4 elemen baru);
  constraint statis (tanpa `fetch(`/`showPage(`/`FEATURE_REGISTRY`, tanpa
  `D.` langsung di shell, tanpa `innerHTML`, adapter tetap 4 fungsi yang
  sama tanpa `let`/`var` top-level baru, guard `typeof` dipakai utk
  ke-4 fungsi); `dashboard-hub.js`/`index.html`/`app_production.html`
  tetap tidak tersentuh.
- **`DASHBOARD-V2-HERO-DATA.md`** — dokumentasi deliverable tahap ini.

### Tidak diubah

`dashboard-v2-data-adapter.js` (dijamin identik dgn baseline V2.16 —
diverifikasi `diff` & test tanda tangan API), `dashboard-hub.js`,
`dashboard-v2-activation.js`, Summary Cards/Module Grid/Statistics
Panel/Recent Activity/Notifications Center/Automation Center/AI Command
Center/Predictive Insights/Health Score Widget (semua sub-komponen Main
selain Hero), `FEATURE_REGISTRY`/`dashboard-hub-registry.js`,
`showPage()`, routing, `index.html`, `app_production.html`. Tidak ada
fetch, tidak ada business logic baru (murni interpolasi field yang
sudah dihitung adapter), tidak ada state instance baru. Seluruh 94 file
test lama (baseline V2.16) tidak satu pun diubah — hanya 1 file test
baru ditambahkan.

### Hasil test

```
node --test tests/dashboard-v2-hero-data.test.js
# tests 17
# pass 17
# fail 0

node --test
# tests 1642
# pass 1642
# fail 0
```

## Tahap V2.18 — Summary Cards Data Integration

Baseline: 1642/1642 PASS (akhir Tahap V2.17).

### Diubah

- **`dashboard-v2-shell.js`** — HANYA `_buildSummaryCards()` diedit.
  Mengikuti pola persis Tahap V2.17 (`_buildHero`): 4 elemen baru
  ditambah sbg anak Summary Cards, satu per fungsi
  `dashboard-v2-data-adapter.js` (getFinanceSummary/getVehicleSummary/
  getFamilySummary/getDocumentSummary), dgn fallback placeholder bila
  adapter tidak tersedia/return `null`. 4 kartu lama (Total Balance/
  Monthly Income/Monthly Expense/Health Score) TIDAK berubah. Summary
  Cards jadi 8 anak (4 lama + 4 baru).
- **`tests/dashboard-v2-summary.test.js`** — 2 assertion lama
  (`cards.children.length`) disesuaikan dari `4` ke `8` (satu-satunya
  perubahan: jumlah anak Summary Cards bertambah akibat penambahan
  additive tahap ini).

### Ditambahkan

- **`tests/dashboard-v2-summary-data.test.js`** — 18 test baru:
  adapter tidak di-load → 4 elemen baru tetap ada dgn fallback
  placeholder; 4 kartu lama tidak berubah; fungsi adapter tersedia tapi
  return `null` → tetap fallback placeholder; masing-masing dari 4
  fungsi adapter menampilkan ringkasan sungguhan saat tersedia & ada
  data (di-mock per fungsi); integrasi sungguhan end-to-end (adapter
  ASLI + shell dalam satu sandbox, `D` tiruan) untuk kasus ada data, `D`
  belum ter-load, dan idempotency `render()`; aksesibilitas
  (`aria-label` di 4 elemen baru); constraint statis (tanpa
  `fetch(`/`showPage(`/`FEATURE_REGISTRY`, tanpa `D.` langsung di
  shell, tanpa `innerHTML`, adapter tetap 4 fungsi yang sama tanpa
  `let`/`var` top-level baru, guard `typeof` dipakai utk ke-4 fungsi
  tepat 2x — Hero + Summary Cards); Hero (V2.17) tidak ikut berubah;
  `dashboard-hub.js`/`index.html`/`app_production.html` tetap tidak
  tersentuh.
- **`DASHBOARD-V2-SUMMARY-DATA.md`** — dokumentasi deliverable tahap
  ini.

### Tidak diubah

`dashboard-v2-data-adapter.js` (dijamin identik dgn baseline V2.16 —
diverifikasi `diff` & test tanda tangan API), `dashboard-hub.js`,
`dashboard-v2-activation.js`, Hero, Quick Actions/Module Grid/Insight
Panel/Recent Activity/Statistics Panel/Upcoming Tasks/Notifications
Center/AI Command Center/Health Score Widget/Predictive Insights/
Automation Center (semua sub-komponen Main selain Summary Cards),
`FEATURE_REGISTRY`/`dashboard-hub-registry.js`, `showPage()`, routing,
`index.html`, `app_production.html`. Tidak ada fetch, tidak ada
business logic baru (murni interpolasi field yang sudah dihitung
adapter), tidak ada state instance baru. Seluruh file test lama
(baseline V2.17) tidak satu pun diubah selain 2 assertion di
`tests/dashboard-v2-summary.test.js` (jumlah child berubah) — hanya
1 file test baru ditambahkan.

### Hasil test

```
node --test tests/dashboard-v2-summary-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1660
# pass 1660
# fail 0
```

## Tahap V2.19 — Module Grid Data Integration

Baseline: 1660/1660 PASS (akhir Tahap V2.18).

### Diubah

- **`dashboard-v2-shell.js`** — HANYA `_buildModuleGrid()` diedit.
  Mengikuti pola persis Tahap V2.17/V2.18: 4 elemen baru ditambah sbg
  anak Module Grid, satu per fungsi `dashboard-v2-data-adapter.js`
  (getFinanceSummary/getVehicleSummary/getFamilySummary/
  getDocumentSummary), dgn fallback placeholder bila adapter tidak
  tersedia/return `null`. 6 kartu lama (Finance/Vehicle/Reports/
  Family/Documents/Settings) TIDAK berubah. Module Grid jadi 10 anak
  (6 lama + 4 baru). Reports & Settings sengaja tidak dapat elemen data
  baru (tidak ada fungsi adapter utk domain itu).
- **`tests/dashboard-v2-summary.test.js`** — 2 assertion lama
  (`moduleGrid.children.length`/`grid.children.length`) disesuaikan
  dari `6` ke `10` (satu-satunya perubahan: jumlah anak Module Grid
  bertambah akibat penambahan additive tahap ini).
- **`tests/dashboard-v2-summary-data.test.js`** — 1 assertion constraint
  (jumlah guard `typeof fn === 'function'` per fungsi adapter)
  disesuaikan dari `2x` ke `3x`, karena `_buildModuleGrid()` menambah 1
  titik pemanggilan guard baru per fungsi.

### Ditambahkan

- **`tests/dashboard-v2-module-grid-data.test.js`** — 18 test baru:
  adapter tidak di-load → 4 elemen baru tetap ada dgn fallback
  placeholder; 6 kartu lama tidak berubah; fungsi adapter tersedia tapi
  return `null` → tetap fallback placeholder; masing-masing dari 4
  fungsi adapter menampilkan ringkasan sungguhan saat tersedia & ada
  data (di-mock per fungsi); integrasi sungguhan end-to-end (adapter
  ASLI + shell dalam satu sandbox, `D` tiruan) untuk kasus ada data, `D`
  belum ter-load, dan idempotency `render()`; aksesibilitas
  (`aria-label` di 4 elemen baru); constraint statis (tanpa
  `fetch(`/`showPage(`/`FEATURE_REGISTRY`, tanpa `D.` langsung di
  shell, tanpa `innerHTML`, adapter tetap 4 fungsi yang sama tanpa
  `let`/`var` top-level baru, guard `typeof` dipakai utk ke-4 fungsi
  tepat 3x — Hero + Summary Cards + Module Grid); Hero (V2.17) &
  Summary Cards (V2.18) tidak ikut berubah;
  `dashboard-hub.js`/`index.html`/`app_production.html` tetap tidak
  tersentuh.
- **`DASHBOARD-V2-MODULE-GRID-DATA.md`** — dokumentasi deliverable
  tahap ini.

### Tidak diubah

`dashboard-v2-data-adapter.js` (dijamin identik dgn baseline V2.16 —
diverifikasi `diff` & test tanda tangan API), `dashboard-hub.js`,
`dashboard-v2-activation.js`, Hero, Summary Cards, Quick Actions/
Insight Panel/Recent Activity/Statistics Panel/Upcoming Tasks/
Notifications Center/AI Command Center/Health Score Widget/Predictive
Insights/Automation Center (semua sub-komponen Main selain Module
Grid), `FEATURE_REGISTRY`/`dashboard-hub-registry.js`, `showPage()`,
routing, `index.html`, `app_production.html`. Tidak ada fetch, tidak
ada business logic baru (murni interpolasi field yang sudah dihitung
adapter), tidak ada state instance baru. Seluruh file test lama
(baseline V2.18) tidak satu pun diubah selain 2 assertion child-count
di `tests/dashboard-v2-summary.test.js` dan 1 assertion guard-count di
`tests/dashboard-v2-summary-data.test.js` — hanya 1 file test baru
ditambahkan.

### Hasil test

```
node --test tests/dashboard-v2-module-grid-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1678
# pass 1678
# fail 0
```

## Tahap V2.20 — Statistics Panel Data Integration

Baseline: 1678/1678 PASS (akhir Tahap V2.19).

### Diubah

- **`dashboard-v2-shell.js`** — HANYA `_buildStatisticsPanel()`
  diedit. Mengikuti pola persis Tahap V2.17/V2.18/V2.19: 4 elemen baru
  ditambah sbg anak Statistics Panel, satu per fungsi
  `dashboard-v2-data-adapter.js` (getFinanceSummary/getVehicleSummary/
  getFamilySummary/getDocumentSummary), dgn fallback placeholder bila
  adapter tidak tersedia/return `null`. 4 kartu lama (Income/Expense/
  Savings/Active Vehicles) TIDAK berubah. Statistics Panel jadi 8 anak
  (4 lama + 4 baru).
- **`tests/dashboard-v2-statistics.test.js`** — 2 assertion lama
  (`panel.children.length`) disesuaikan dari `4` ke `8` (satu-satunya
  perubahan: jumlah anak Statistics Panel bertambah akibat penambahan
  additive tahap ini).
- **`tests/dashboard-v2-summary.test.js`** — 1 assertion lama
  (`statisticsPanel.children.length`) disesuaikan dari `4` ke `8`,
  alasan yang sama.
- **`tests/dashboard-v2-summary-data.test.js`** &
  **`tests/dashboard-v2-module-grid-data.test.js`** — masing-masing 1
  assertion constraint (jumlah guard `typeof fn === 'function'` per
  fungsi adapter) disesuaikan dari `3x` ke `4x`, karena
  `_buildStatisticsPanel()` menambah 1 titik pemanggilan guard baru per
  fungsi.

### Ditambahkan

- **`tests/dashboard-v2-statistics-data.test.js`** — 18 test baru:
  adapter tidak di-load → 4 elemen baru tetap ada dgn fallback
  placeholder; 4 kartu lama tidak berubah; fungsi adapter tersedia tapi
  return `null` → tetap fallback placeholder; masing-masing dari 4
  fungsi adapter menampilkan ringkasan sungguhan saat tersedia & ada
  data (di-mock per fungsi); integrasi sungguhan end-to-end (adapter
  ASLI + shell dalam satu sandbox, `D` tiruan) untuk kasus ada data, `D`
  belum ter-load, dan idempotency `render()`; aksesibilitas
  (`aria-label` di 4 elemen baru); constraint statis (tanpa
  `fetch(`/`showPage(`/`FEATURE_REGISTRY`, tanpa `D.` langsung di
  shell, tanpa `innerHTML`, adapter tetap 4 fungsi yang sama tanpa
  `let`/`var` top-level baru, guard `typeof` dipakai utk ke-4 fungsi
  tepat 4x — Hero + Summary Cards + Module Grid + Statistics Panel);
  Hero (V2.17), Summary Cards (V2.18) & Module Grid (V2.19) tidak ikut
  berubah; `dashboard-hub.js`/`index.html`/`app_production.html` tetap
  tidak tersentuh.
- **`DASHBOARD-V2-STATISTICS-DATA.md`** — dokumentasi deliverable
  tahap ini.

### Tidak diubah

`dashboard-v2-data-adapter.js` (dijamin identik dgn baseline V2.16 —
diverifikasi `diff` & test tanda tangan API), `dashboard-hub.js`,
`dashboard-v2-activation.js`, Hero, Summary Cards, Quick Actions,
Module Grid, Insight Panel, Recent Activity, Upcoming Tasks,
Notifications Center, AI Command Center, Health Score Widget,
Predictive Insights, Automation Center (semua sub-komponen Main selain
Statistics Panel), `FEATURE_REGISTRY`/`dashboard-hub-registry.js`,
`showPage()`, routing, `index.html`, `app_production.html`. Tidak ada
fetch, tidak ada business logic baru (murni interpolasi field yang
sudah dihitung adapter), tidak ada state instance baru. Seluruh file
test lama (baseline V2.19) tidak satu pun diubah selain 2 assertion
child-count di `tests/dashboard-v2-statistics.test.js`, 1 assertion
child-count di `tests/dashboard-v2-summary.test.js`, dan 2 assertion
guard-count di `tests/dashboard-v2-summary-data.test.js` &
`tests/dashboard-v2-module-grid-data.test.js` — hanya 1 file test baru
ditambahkan.

### Hasil test

```
node --test tests/dashboard-v2-statistics-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1696
# pass 1696
# fail 0
```

## Tahap V2.21 — Recent Activity Data Integration

Baseline: 1696/1696 PASS (akhir Tahap V2.20).

### Diubah

- **`dashboard-v2-shell.js`** — HANYA `_buildRecentActivity()` diedit.
  Mengikuti pola persis Tahap V2.17/V2.18/V2.19/V2.20: 4 elemen baru
  ditambah sbg anak Recent Activity, satu per fungsi
  `dashboard-v2-data-adapter.js` (getFinanceSummary/getVehicleSummary/
  getFamilySummary/getDocumentSummary), dgn fallback placeholder bila
  adapter tidak tersedia/return `null`. 5 baris lama (item1-item5)
  TIDAK berubah. Recent Activity jadi 9 anak (5 lama + 4 baru).
- **`tests/dashboard-v2-activity.test.js`** — 2 assertion lama
  (`activity.children.length`) disesuaikan dari `5` ke `9`
  (satu-satunya perubahan: jumlah anak Recent Activity bertambah
  akibat penambahan additive tahap ini).
- **`tests/dashboard-v2-summary.test.js`** — 1 assertion lama
  (`recentActivity.children.length`) disesuaikan dari `5` ke `9`,
  alasan yang sama.
- **`tests/dashboard-v2-summary-data.test.js`**,
  **`tests/dashboard-v2-module-grid-data.test.js`** &
  **`tests/dashboard-v2-statistics-data.test.js`** — masing-masing 1
  assertion constraint (jumlah guard `typeof fn === 'function'` per
  fungsi adapter) disesuaikan dari `4x` ke `5x`, karena
  `_buildRecentActivity()` menambah 1 titik pemanggilan guard baru per
  fungsi.

### Ditambahkan

- **`tests/dashboard-v2-recent-activity-data.test.js`** — 18 test baru:
  adapter tidak di-load → 4 elemen baru tetap ada dgn fallback
  placeholder; 5 baris lama tidak berubah; fungsi adapter tersedia tapi
  return `null` → tetap fallback placeholder; masing-masing dari 4
  fungsi adapter menampilkan ringkasan sungguhan saat tersedia & ada
  data (di-mock per fungsi); integrasi sungguhan end-to-end (adapter
  ASLI + shell dalam satu sandbox, `D` tiruan) untuk kasus ada data, `D`
  belum ter-load, dan idempotency `render()`; aksesibilitas
  (`aria-label` di 4 elemen baru); constraint statis (tanpa
  `fetch(`/`showPage(`/`FEATURE_REGISTRY`, tanpa `D.` langsung di
  shell, tanpa `innerHTML`, adapter tetap 4 fungsi yang sama tanpa
  `let`/`var` top-level baru, guard `typeof` dipakai utk ke-4 fungsi
  tepat 5x — Hero + Summary Cards + Module Grid + Statistics Panel +
  Recent Activity); Hero (V2.17), Summary Cards (V2.18), Module Grid
  (V2.19) & Statistics Panel (V2.20) tidak ikut berubah;
  `dashboard-hub.js`/`index.html`/`app_production.html` tetap tidak
  tersentuh.
- **`DASHBOARD-V2-RECENT-ACTIVITY-DATA.md`** — dokumentasi deliverable
  tahap ini.

### Tidak diubah

`dashboard-v2-data-adapter.js` (dijamin identik dgn baseline V2.16 —
diverifikasi `diff` & test tanda tangan API), `dashboard-hub.js`,
`dashboard-v2-activation.js`, Hero, Summary Cards, Quick Actions,
Module Grid, Insight Panel, Statistics Panel, Upcoming Tasks,
Notifications Center, AI Command Center, Health Score Widget,
Predictive Insights, Automation Center (semua sub-komponen Main selain
Recent Activity), `FEATURE_REGISTRY`/`dashboard-hub-registry.js`,
`showPage()`, routing, `index.html`, `app_production.html`. Tidak ada
fetch, tidak ada business logic baru (murni interpolasi field yang
sudah dihitung adapter), tidak ada state instance baru. Seluruh file
test lama (baseline V2.20) tidak satu pun diubah selain 2 assertion
child-count di `tests/dashboard-v2-activity.test.js`, 1 assertion
child-count di `tests/dashboard-v2-summary.test.js`, dan 3 assertion
guard-count di `tests/dashboard-v2-summary-data.test.js`,
`tests/dashboard-v2-module-grid-data.test.js` &
`tests/dashboard-v2-statistics-data.test.js` — hanya 1 file test baru
ditambahkan.

### Hasil test

```
node --test tests/dashboard-v2-recent-activity-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1714
# pass 1714
# fail 0
```

## Tahap V2.22 — Upcoming Tasks Data Integration

Baseline: 1714/1714 PASS (akhir Tahap V2.21).

### Diubah

- **`dashboard-v2-shell.js`** — HANYA `_buildUpcomingTasks()` diedit.
  Mengikuti pola persis Tahap V2.17/V2.18/V2.19/V2.20/V2.21: 4 elemen
  baru ditambah sbg anak Upcoming Tasks, satu per fungsi
  `dashboard-v2-data-adapter.js` (getFinanceSummary/getVehicleSummary/
  getFamilySummary/getDocumentSummary), dgn fallback placeholder bila
  adapter tidak tersedia/return `null`. 5 kartu lama (listrik/servis/
  backup/laporan/dokumen) TIDAK berubah. Upcoming Tasks jadi 9 anak (5
  lama + 4 baru).
- **`tests/dashboard-v2-upcoming.test.js`** — 2 assertion lama
  (`section.children.length`) disesuaikan dari `5` ke `9`
  (satu-satunya perubahan: jumlah anak Upcoming Tasks bertambah akibat
  penambahan additive tahap ini).
- **`tests/dashboard-v2-summary.test.js`** — 1 assertion lama
  (`upcomingTasks.children.length`) disesuaikan dari `5` ke `9`, alasan
  yang sama.
- **`tests/dashboard-v2-summary-data.test.js`**,
  **`tests/dashboard-v2-module-grid-data.test.js`**,
  **`tests/dashboard-v2-statistics-data.test.js`** &
  **`tests/dashboard-v2-recent-activity-data.test.js`** — masing-masing
  1 assertion constraint (jumlah guard `typeof fn === 'function'` per
  fungsi adapter) disesuaikan dari `5x` ke `6x`, karena
  `_buildUpcomingTasks()` menambah 1 titik pemanggilan guard baru per
  fungsi.

### Ditambahkan

- **`tests/dashboard-v2-upcoming-tasks-data.test.js`** — 18 test baru:
  adapter tidak di-load → 4 elemen baru tetap ada dgn fallback
  placeholder; 5 kartu lama tidak berubah; fungsi adapter tersedia tapi
  return `null` → tetap fallback placeholder; masing-masing dari 4
  fungsi adapter menampilkan ringkasan sungguhan saat tersedia & ada
  data (di-mock per fungsi); integrasi sungguhan end-to-end (adapter
  ASLI + shell dalam satu sandbox, `D` tiruan) untuk kasus ada data, `D`
  belum ter-load, dan idempotency `render()`; aksesibilitas
  (`aria-label` di 4 elemen baru); constraint statis (tanpa
  `fetch(`/`showPage(`/`FEATURE_REGISTRY`, tanpa `D.` langsung di
  shell, tanpa `innerHTML`, adapter tetap 4 fungsi yang sama tanpa
  `let`/`var` top-level baru, guard `typeof` dipakai utk ke-4 fungsi
  tepat 6x — Hero + Summary Cards + Module Grid + Statistics Panel +
  Recent Activity + Upcoming Tasks); Hero (V2.17), Summary Cards
  (V2.18), Module Grid (V2.19), Statistics Panel (V2.20) & Recent
  Activity (V2.21) tidak ikut berubah; `dashboard-hub.js`/
  `index.html`/`app_production.html` tetap tidak tersentuh.
- **`DASHBOARD-V2-UPCOMING-TASKS-DATA.md`** — dokumentasi deliverable
  tahap ini.

### Tidak diubah

`dashboard-v2-data-adapter.js` (dijamin identik dgn baseline V2.16 —
diverifikasi `diff` & test tanda tangan API), `dashboard-hub.js`,
`dashboard-v2-activation.js`, Hero, Summary Cards, Quick Actions,
Module Grid, Insight Panel, Statistics Panel, Recent Activity,
Notifications Center, AI Command Center, Health Score Widget,
Predictive Insights, Automation Center (semua sub-komponen Main selain
Upcoming Tasks), `FEATURE_REGISTRY`/`dashboard-hub-registry.js`,
`showPage()`, routing, `index.html`, `app_production.html`. Tidak ada
fetch, tidak ada business logic baru (murni interpolasi field yang
sudah dihitung adapter), tidak ada state instance baru. Seluruh file
test lama (baseline V2.21) tidak satu pun diubah selain 2 assertion
child-count di `tests/dashboard-v2-upcoming.test.js`, 1 assertion
child-count di `tests/dashboard-v2-summary.test.js`, dan 4 assertion
guard-count di `tests/dashboard-v2-summary-data.test.js`,
`tests/dashboard-v2-module-grid-data.test.js`,
`tests/dashboard-v2-statistics-data.test.js` &
`tests/dashboard-v2-recent-activity-data.test.js` — hanya 1 file test
baru ditambahkan.

### Hasil test

```
node --test tests/dashboard-v2-upcoming-tasks-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1732
# pass 1732
# fail 0
```

## Tahap V2.23 — Notifications Data Integration

Baseline: 1732/1732 PASS (akhir Tahap V2.22).

### Diubah

- **`dashboard-v2-shell.js`** — HANYA `_buildNotifications()` diedit.
  Mengikuti pola persis Tahap V2.17/V2.18/V2.19/V2.20/V2.21/V2.22: 4
  elemen baru ditambah sbg anak Notifications, satu per fungsi
  `dashboard-v2-data-adapter.js` (getFinanceSummary/getVehicleSummary/
  getFamilySummary/getDocumentSummary), dgn fallback placeholder bila
  adapter tidak tersedia/return `null`. 5 kartu lama (backup/
  pengeluaran/servis/laporan/sinkronisasi) TIDAK berubah. Notifications
  jadi 9 anak (5 lama + 4 baru).
- **`tests/dashboard-v2-notifications.test.js`** — 2 assertion lama
  (`section.children.length`) disesuaikan dari `5` ke `9`
  (satu-satunya perubahan: jumlah anak Notifications bertambah akibat
  penambahan additive tahap ini).
- **`tests/dashboard-v2-summary-data.test.js`**,
  **`tests/dashboard-v2-module-grid-data.test.js`**,
  **`tests/dashboard-v2-statistics-data.test.js`**,
  **`tests/dashboard-v2-recent-activity-data.test.js`** &
  **`tests/dashboard-v2-upcoming-tasks-data.test.js`** — masing-masing
  1 assertion constraint (jumlah guard `typeof fn === 'function'` per
  fungsi adapter) disesuaikan dari `6x` ke `7x`, karena
  `_buildNotifications()` menambah 1 titik pemanggilan guard baru per
  fungsi.

### Ditambahkan

- **`tests/dashboard-v2-notifications-data.test.js`** — 18 test baru:
  adapter tidak di-load → 4 elemen baru tetap ada dgn fallback
  placeholder; 5 kartu lama tidak berubah; fungsi adapter tersedia tapi
  return `null` → tetap fallback placeholder; masing-masing dari 4
  fungsi adapter menampilkan ringkasan sungguhan saat tersedia & ada
  data (di-mock per fungsi); integrasi sungguhan end-to-end (adapter
  ASLI + shell dalam satu sandbox, `D` tiruan) untuk kasus ada data, `D`
  belum ter-load, dan idempotency `render()`; aksesibilitas
  (`aria-label` di 4 elemen baru); constraint statis (tanpa
  `fetch(`/`showPage(`/`FEATURE_REGISTRY`, tanpa `D.` langsung di
  shell, tanpa `innerHTML`, adapter tetap 4 fungsi yang sama tanpa
  `let`/`var` top-level baru, guard `typeof` dipakai utk ke-4 fungsi
  tepat 7x — Hero + Summary Cards + Module Grid + Statistics Panel +
  Recent Activity + Upcoming Tasks + Notifications); Hero (V2.17),
  Summary Cards (V2.18), Module Grid (V2.19), Statistics Panel
  (V2.20), Recent Activity (V2.21) & Upcoming Tasks (V2.22) tidak ikut
  berubah; `dashboard-hub.js`/`index.html`/`app_production.html` tetap
  tidak tersentuh.
- **`DASHBOARD-V2-NOTIFICATIONS-DATA.md`** — dokumentasi deliverable
  tahap ini.

### Tidak diubah

`dashboard-v2-data-adapter.js` (dijamin identik dgn baseline V2.16 —
diverifikasi `diff` & test tanda tangan API), `dashboard-hub.js`,
`dashboard-v2-activation.js`, Hero, Summary Cards, Quick Actions,
Module Grid, Insight Panel, Recent Activity, Statistics Panel,
Upcoming Tasks, AI Command Center, Health Score Widget, Predictive
Insights, Automation Center (semua sub-komponen Main selain
Notifications), `FEATURE_REGISTRY`/`dashboard-hub-registry.js`,
`showPage()`, routing, `index.html`, `app_production.html`. Tidak ada
fetch, tidak ada business logic baru (murni interpolasi field yang
sudah dihitung adapter), tidak ada state instance baru. Seluruh file
test lama (baseline V2.22) tidak satu pun diubah selain 2 assertion
child-count di `tests/dashboard-v2-notifications.test.js`, dan 5
assertion guard-count di `tests/dashboard-v2-summary-data.test.js`,
`tests/dashboard-v2-module-grid-data.test.js`,
`tests/dashboard-v2-statistics-data.test.js`,
`tests/dashboard-v2-recent-activity-data.test.js` &
`tests/dashboard-v2-upcoming-tasks-data.test.js` — hanya 1 file test
baru ditambahkan.

### Hasil test

```
node --test tests/dashboard-v2-notifications-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1750
# pass 1750
# fail 0
```

## Tahap V2.24 — Automation Center Data Integration

Baseline: 1750/1750 PASS (akhir Tahap V2.23).

### Diubah

- **`dashboard-v2-shell.js`** — HANYA `_buildAutomationCenter()`
  diedit. Mengikuti pola persis Tahap
  V2.17/V2.18/V2.19/V2.20/V2.21/V2.22/V2.23: 4 elemen baru ditambah sbg
  anak Automation Center, satu per fungsi
  `dashboard-v2-data-adapter.js` (getFinanceSummary/getVehicleSummary/
  getFamilySummary/getDocumentSummary), dgn fallback placeholder bila
  adapter tidak tersedia/return `null`. 5 kartu lama (autoBackup/
  monthlyReport/budgetReminder/vehicleServiceReminder/
  documentRenewalReminder) TIDAK berubah. Automation Center jadi 9
  anak (5 lama + 4 baru).
- **`tests/dashboard-v2-automation.test.js`** — 2 assertion lama
  (`section.children.length`) disesuaikan dari `5` ke `9`
  (satu-satunya perubahan: jumlah anak Automation Center bertambah
  akibat penambahan additive tahap ini).
- **`tests/dashboard-v2-summary-data.test.js`**,
  **`tests/dashboard-v2-module-grid-data.test.js`**,
  **`tests/dashboard-v2-statistics-data.test.js`**,
  **`tests/dashboard-v2-recent-activity-data.test.js`**,
  **`tests/dashboard-v2-upcoming-tasks-data.test.js`** &
  **`tests/dashboard-v2-notifications-data.test.js`** — masing-masing
  1 assertion constraint (jumlah guard `typeof fn === 'function'` per
  fungsi adapter) disesuaikan dari `7x` ke `8x`, karena
  `_buildAutomationCenter()` menambah 1 titik pemanggilan guard baru
  per fungsi.

### Ditambahkan

- **`tests/dashboard-v2-automation-data.test.js`** — 18 test baru:
  adapter tidak di-load → 4 elemen baru tetap ada dgn fallback
  placeholder; 5 kartu lama tidak berubah; fungsi adapter tersedia tapi
  return `null` → tetap fallback placeholder; masing-masing dari 4
  fungsi adapter menampilkan ringkasan sungguhan saat tersedia & ada
  data (di-mock per fungsi); integrasi sungguhan end-to-end (adapter
  ASLI + shell dalam satu sandbox, `D` tiruan) untuk kasus ada data, `D`
  belum ter-load, dan idempotency `render()`; aksesibilitas
  (`aria-label` di 4 elemen baru); constraint statis (tanpa
  `fetch(`/`showPage(`/`FEATURE_REGISTRY`, tanpa `D.` langsung di
  shell, tanpa `innerHTML`, adapter tetap 4 fungsi yang sama tanpa
  `let`/`var` top-level baru, guard `typeof` dipakai utk ke-4 fungsi
  tepat 8x — Hero + Summary Cards + Module Grid + Statistics Panel +
  Recent Activity + Upcoming Tasks + Notifications + Automation
  Center); Hero (V2.17), Summary Cards (V2.18), Module Grid (V2.19),
  Statistics Panel (V2.20), Recent Activity (V2.21), Upcoming Tasks
  (V2.22) & Notifications (V2.23) tidak ikut berubah;
  `dashboard-hub.js`/`index.html`/`app_production.html` tetap tidak
  tersentuh.
- **`DASHBOARD-V2-AUTOMATION-DATA.md`** — dokumentasi deliverable
  tahap ini.

### Tidak diubah

`dashboard-v2-data-adapter.js` (dijamin identik dgn baseline V2.16 —
diverifikasi `diff` & test tanda tangan API), `dashboard-hub.js`,
`dashboard-v2-activation.js`, Hero, Summary Cards, Quick Actions,
Module Grid, Insight Panel, Recent Activity, Statistics Panel,
Upcoming Tasks, Notifications, AI Command Center, Health Score Widget,
Predictive Insights (semua sub-komponen Main selain Automation
Center), `FEATURE_REGISTRY`/`dashboard-hub-registry.js`, `showPage()`,
routing, `index.html`, `app_production.html`. Tidak ada fetch, tidak
ada business logic baru (murni interpolasi field yang sudah dihitung
adapter), tidak ada state instance baru. Seluruh file test lama
(baseline V2.23) tidak satu pun diubah selain 2 assertion child-count
di `tests/dashboard-v2-automation.test.js`, dan 6 assertion
guard-count di `tests/dashboard-v2-summary-data.test.js`,
`tests/dashboard-v2-module-grid-data.test.js`,
`tests/dashboard-v2-statistics-data.test.js`,
`tests/dashboard-v2-recent-activity-data.test.js`,
`tests/dashboard-v2-upcoming-tasks-data.test.js` &
`tests/dashboard-v2-notifications-data.test.js` — hanya 1 file test
baru ditambahkan.

### Hasil test

```
node --test tests/dashboard-v2-automation-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1768
# pass 1768
# fail 0
```

## Tahap V2.25 — AI Command Center Data Integration

Baseline: 1768/1768 PASS (akhir Tahap V2.24).

### Diubah

- **`dashboard-v2-shell.js`** — HANYA `_buildAiCommandCenter()`
  diedit. Mengikuti pola persis Tahap
  V2.17/V2.18/V2.19/V2.20/V2.21/V2.22/V2.23/V2.24: 4 elemen baru
  ditambah sbg anak AI Command Center, satu per fungsi
  `dashboard-v2-data-adapter.js` (getFinanceSummary/getVehicleSummary/
  getFamilySummary/getDocumentSummary), dgn fallback placeholder bila
  adapter tidak tersedia/return `null`. 6 anak lama (1 search field + 4
  action card + 1 suggestion area) TIDAK berubah. AI Command Center
  jadi 10 anak (6 lama + 4 baru).
- **`tests/dashboard-v2-ai.test.js`** — 2 assertion lama
  (`section.children.length`) disesuaikan dari `6` ke `10`
  (satu-satunya perubahan: jumlah anak AI Command Center bertambah
  akibat penambahan additive tahap ini).
- **`tests/dashboard-v2-summary-data.test.js`**,
  **`tests/dashboard-v2-module-grid-data.test.js`**,
  **`tests/dashboard-v2-statistics-data.test.js`**,
  **`tests/dashboard-v2-recent-activity-data.test.js`**,
  **`tests/dashboard-v2-upcoming-tasks-data.test.js`**,
  **`tests/dashboard-v2-notifications-data.test.js`** &
  **`tests/dashboard-v2-automation-data.test.js`** — masing-masing 1
  assertion constraint (jumlah guard `typeof fn === 'function'` per
  fungsi adapter) disesuaikan dari `8x` ke `9x`, karena
  `_buildAiCommandCenter()` menambah 1 titik pemanggilan guard baru
  per fungsi.

### Ditambahkan

- **`tests/dashboard-v2-ai-data.test.js`** — 18 test baru: adapter
  tidak di-load → 4 elemen baru tetap ada dgn fallback placeholder; 6
  anak lama tidak berubah; fungsi adapter tersedia tapi return `null`
  → tetap fallback placeholder; masing-masing dari 4 fungsi adapter
  menampilkan ringkasan sungguhan saat tersedia & ada data (di-mock
  per fungsi); integrasi sungguhan end-to-end (adapter ASLI + shell
  dalam satu sandbox, `D` tiruan) untuk kasus ada data, `D` belum
  ter-load, dan idempotency `render()`; aksesibilitas (`aria-label` di
  4 elemen baru); constraint statis (tanpa `fetch(`/`showPage(`/
  `FEATURE_REGISTRY`, tanpa `D.` langsung di shell, tanpa `innerHTML`,
  adapter tetap 4 fungsi yang sama tanpa `let`/`var` top-level baru,
  guard `typeof` dipakai utk ke-4 fungsi tepat 9x — Hero + Summary
  Cards + Module Grid + Statistics Panel + Recent Activity + Upcoming
  Tasks + Notifications + Automation Center + AI Command Center); Hero
  (V2.17), Summary Cards (V2.18), Module Grid (V2.19), Statistics
  Panel (V2.20), Recent Activity (V2.21), Upcoming Tasks (V2.22),
  Notifications (V2.23) & Automation Center (V2.24) tidak ikut
  berubah; `dashboard-hub.js`/`index.html`/`app_production.html` tetap
  tidak tersentuh.
- **`DASHBOARD-V2-AI-DATA.md`** — dokumentasi deliverable tahap ini.

### Tidak diubah

`dashboard-v2-data-adapter.js` (dijamin identik dgn baseline V2.16 —
diverifikasi `diff` & test tanda tangan API), `dashboard-hub.js`,
`dashboard-v2-activation.js`, Hero, Summary Cards, Quick Actions,
Module Grid, Insight Panel, Recent Activity, Statistics Panel,
Upcoming Tasks, Notifications, Automation Center, Health Score Widget,
Predictive Insights (semua sub-komponen Main selain AI Command
Center), `FEATURE_REGISTRY`/`dashboard-hub-registry.js`, `showPage()`,
routing, `index.html`, `app_production.html`. Tidak ada fetch, tidak
ada business logic baru (murni interpolasi field yang sudah dihitung
adapter), tidak ada state instance baru. Seluruh file test lama
(baseline V2.24) tidak satu pun diubah selain 2 assertion child-count
di `tests/dashboard-v2-ai.test.js`, dan 7 assertion guard-count di
`tests/dashboard-v2-summary-data.test.js`,
`tests/dashboard-v2-module-grid-data.test.js`,
`tests/dashboard-v2-statistics-data.test.js`,
`tests/dashboard-v2-recent-activity-data.test.js`,
`tests/dashboard-v2-upcoming-tasks-data.test.js`,
`tests/dashboard-v2-notifications-data.test.js` &
`tests/dashboard-v2-automation-data.test.js` — hanya 1 file test baru
ditambahkan.

### Hasil test

```
node --test tests/dashboard-v2-ai-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1786
# pass 1786
# fail 0
```

## Tahap V2.26 — Health Score Data Integration

Baseline: `node --test` 1786/1786 PASS (akhir Tahap V2.25 — AI Command
Center Data Integration).

### Diubah

- **`_buildHealthScore()` di `dashboard-v2-shell.js`** — ditambah 4
  elemen baru (`dashboardV2HealthFinanceData`,
  `dashboardV2HealthVehicleData`, `dashboardV2HealthFamilyData`,
  `dashboardV2HealthDocumentData`), satu per fungsi
  `dashboard-v2-data-adapter.js` (`getFinanceSummary`/
  `getVehicleSummary`/`getFamilySummary`/`getDocumentSummary`),
  dipanggil lewat guard `typeof fn === 'function'`, dgn fallback
  placeholder kalau adapter tidak tersedia/return `null`. Health Score
  jadi total 10 anak (6 lama V2.11 + 4 baru). Dibuat dgn
  `createElement()`, digabung ke `children` lewat `replaceChildren()`.
  Tidak ada fungsi lain yang diedit; adapter tidak disentuh; tidak ada
  `D.` langsung/`fetch()`/`showPage()`/`FEATURE_REGISTRY`/`innerHTML`.

### Ditambahkan

- **`tests/dashboard-v2-health-data.test.js`** — 18 test baru: adapter
  tidak di-load → 4 elemen baru tetap ada dgn fallback placeholder; 6
  anak lama tidak berubah; fungsi adapter tersedia tapi return `null`
  → tetap fallback placeholder; masing-masing dari 4 fungsi adapter
  menampilkan ringkasan sungguhan saat tersedia & ada data (di-mock
  per fungsi); integrasi sungguhan end-to-end (adapter ASLI + shell
  dalam satu sandbox, `D` tiruan) untuk kasus ada data, `D` belum
  ter-load, dan idempotency `render()`; aksesibilitas (`aria-label` di
  4 elemen baru); constraint statis (tanpa `fetch(`/`showPage(`/
  `FEATURE_REGISTRY`, tanpa `D.` langsung di shell, tanpa `innerHTML`,
  adapter tetap 4 fungsi yang sama tanpa `let`/`var` top-level baru,
  guard `typeof` dipakai utk ke-4 fungsi tepat 10x — Hero + Summary
  Cards + Module Grid + Statistics Panel + Recent Activity + Upcoming
  Tasks + Notifications + Automation Center + AI Command Center +
  Health Score); Hero (V2.17), Summary Cards (V2.18), Module Grid
  (V2.19), Statistics Panel (V2.20), Recent Activity (V2.21), Upcoming
  Tasks (V2.22), Notifications (V2.23), Automation Center (V2.24) & AI
  Command Center (V2.25) tidak ikut berubah;
  `dashboard-hub.js`/`index.html`/`app_production.html` tetap tidak
  tersentuh.
- **`DASHBOARD-V2-HEALTH-DATA.md`** — dokumentasi deliverable tahap
  ini.

### Tidak diubah

`dashboard-v2-data-adapter.js` (dijamin identik dgn baseline V2.16 —
diverifikasi `diff` & test tanda tangan API), `dashboard-hub.js`,
`dashboard-v2-activation.js`, Hero, Summary Cards, Quick Actions,
Module Grid, Insight Panel, Recent Activity, Statistics Panel,
Upcoming Tasks, Notifications, Automation Center, AI Command Center,
Predictive Insights (semua sub-komponen Main selain Health Score),
`FEATURE_REGISTRY`/`dashboard-hub-registry.js`, `showPage()`, routing,
`index.html`, `app_production.html`. Tidak ada fetch, tidak ada
business logic baru (murni interpolasi field yang sudah dihitung
adapter), tidak ada state instance baru. Seluruh file test lama
(baseline V2.25) tidak satu pun diubah selain 2 assertion child-count
di `tests/dashboard-v2-health.test.js`, dan 8 assertion guard-count di
`tests/dashboard-v2-summary-data.test.js`,
`tests/dashboard-v2-module-grid-data.test.js`,
`tests/dashboard-v2-statistics-data.test.js`,
`tests/dashboard-v2-recent-activity-data.test.js`,
`tests/dashboard-v2-upcoming-tasks-data.test.js`,
`tests/dashboard-v2-notifications-data.test.js`,
`tests/dashboard-v2-automation-data.test.js` &
`tests/dashboard-v2-ai-data.test.js` — hanya 1 file test baru
ditambahkan.

### Hasil test

```
node --test tests/dashboard-v2-health-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1804
# pass 1804
# fail 0
```

## Tahap V2.27 — Predictive Insights Data Integration

Baseline: `node --test` 1804/1804 PASS (akhir Tahap V2.26 — Health
Score Data Integration).

### Diubah

- **`_buildPredictiveInsights()` di `dashboard-v2-shell.js`** —
  ditambah 4 elemen baru (`dashboardV2PredictiveFinanceData`,
  `dashboardV2PredictiveVehicleData`, `dashboardV2PredictiveFamilyData`,
  `dashboardV2PredictiveDocumentData`), satu per fungsi
  `dashboard-v2-data-adapter.js` (`getFinanceSummary`/
  `getVehicleSummary`/`getFamilySummary`/`getDocumentSummary`),
  dipanggil lewat guard `typeof fn === 'function'`, dgn fallback
  placeholder kalau adapter tidak tersedia/return `null`. Predictive
  Insights jadi total 9 anak (5 kartu lama V2.12 + 4 baru). Dibuat dgn
  `createElement()`, digabung ke `section` lewat `replaceChildren()`.
  Tidak ada fungsi lain yang diedit; adapter tidak disentuh; tidak ada
  `D.` langsung/`fetch()`/`showPage()`/`FEATURE_REGISTRY`/`innerHTML`.

### Ditambahkan

- **`tests/dashboard-v2-predictive-data.test.js`** — 18 test baru:
  adapter tidak di-load → 4 elemen baru tetap ada dgn fallback
  placeholder; 5 kartu lama tidak berubah; fungsi adapter tersedia
  tapi return `null` → tetap fallback placeholder; masing-masing dari
  4 fungsi adapter menampilkan ringkasan sungguhan saat tersedia & ada
  data (di-mock per fungsi); integrasi sungguhan end-to-end (adapter
  ASLI + shell dalam satu sandbox, `D` tiruan) untuk kasus ada data,
  `D` belum ter-load, dan idempotency `render()`; aksesibilitas
  (`aria-label` di 4 elemen baru); constraint statis (tanpa
  `fetch(`/`showPage(`/`FEATURE_REGISTRY`, tanpa `D.` langsung di
  shell, tanpa `innerHTML`, adapter tetap 4 fungsi yang sama tanpa
  `let`/`var` top-level baru, guard `typeof` dipakai utk ke-4 fungsi
  tepat 11x — Hero + Summary Cards + Module Grid + Statistics Panel +
  Recent Activity + Upcoming Tasks + Notifications + Automation Center
  + AI Command Center + Health Score + Predictive Insights); Hero
  (V2.17), Summary Cards (V2.18), Module Grid (V2.19), Statistics
  Panel (V2.20), Recent Activity (V2.21), Upcoming Tasks (V2.22),
  Notifications (V2.23), Automation Center (V2.24), AI Command Center
  (V2.25) & Health Score (V2.26) tidak ikut berubah;
  `dashboard-hub.js`/`index.html`/`app_production.html` tetap tidak
  tersentuh.
- **`DASHBOARD-V2-PREDICTIVE-DATA.md`** — dokumentasi deliverable
  tahap ini.

### Tidak diubah

`dashboard-v2-data-adapter.js` (dijamin identik dgn baseline V2.16 —
diverifikasi `diff` & test tanda tangan API), `dashboard-hub.js`,
`dashboard-v2-activation.js`, Hero, Summary Cards, Quick Actions,
Module Grid, Insight Panel, Recent Activity, Statistics Panel,
Upcoming Tasks, Notifications, Automation Center, AI Command Center,
Health Score (semua sub-komponen Main selain Predictive Insights),
`FEATURE_REGISTRY`/`dashboard-hub-registry.js`, `showPage()`, routing,
`index.html`, `app_production.html`. Tidak ada fetch, tidak ada
business logic baru (murni interpolasi field yang sudah dihitung
adapter), tidak ada state instance baru. Seluruh file test lama
(baseline V2.26) tidak satu pun diubah selain 2 assertion child-count
di `tests/dashboard-v2-predictive.test.js`, dan 9 assertion
guard-count di `tests/dashboard-v2-summary-data.test.js`,
`tests/dashboard-v2-module-grid-data.test.js`,
`tests/dashboard-v2-statistics-data.test.js`,
`tests/dashboard-v2-recent-activity-data.test.js`,
`tests/dashboard-v2-upcoming-tasks-data.test.js`,
`tests/dashboard-v2-notifications-data.test.js`,
`tests/dashboard-v2-automation-data.test.js`,
`tests/dashboard-v2-ai-data.test.js` &
`tests/dashboard-v2-health-data.test.js` — hanya 1 file test baru
ditambahkan.

### Hasil test

```
node --test tests/dashboard-v2-predictive-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1822
# pass 1822
# fail 0
```

## Tahap V2.28 — Dashboard Refresh Lifecycle

Baseline: ZIP V2.27 (`kw83-tahap0-feature-registry-28`), 1822/1822 test
PASS.

### Ditambahkan

- **`dashboard-v2-shell.js`** — satu method baru, `DashboardV2Shell.
  refresh()`, yang memperbarui ISI seluruh panel yang sudah memakai
  `dashboard-v2-data-adapter.js` (V2.16) — Hero (V2.17), Summary Cards
  (V2.18), Module Grid (V2.19), Statistics Panel (V2.20), Recent
  Activity (V2.21), Upcoming Tasks (V2.22), Notifications (V2.23),
  Automation Center (V2.24), AI Command Center (V2.25), Health Score
  (V2.26) & Predictive Insights (V2.27) — TANPA `destroy()`/`init()`/
  `render()` ulang & TANPA membuat root/main baru. Kontrak:
  - No-op (`return null`) kalau dipanggil sebelum `init()` (root belum
    ada) — sengaja TIDAK memanggil `init()` di dalam `refresh()`.
  - No-op (`return null`) kalau dipanggil sebelum `render()` (root ada
    tapi belum py anak `main`) — sengaja TIDAK memanggil `render()` di
    dalam `refresh()`.
  - Kalau sudah pernah `render()`: bangun instance baru dari
    `_buildMain(document)` (builder existing, 0 baris diubah/di-
    refactor), lalu pindahkan children-nya ke node `main` yang SUDAH
    ADA di DOM lewat `replaceChildren()` (fallback manual
    `removeChild`/`appendChild`, pola identik `render()`/`destroy()`).
  - `root`/`sidebar`/`header`/`main`/`bottomNav`/`fab` — identitas/
    referensi node top-level dijamin SAMA sebelum & sesudah
    `refresh()` (hanya isi/children `main` yang berubah).
  - Tidak membaca `D` langsung (satu-satunya jalur baca tetap lewat 4
    fungsi adapter — `getFinanceSummary()`/`getVehicleSummary()`/
    `getFamilySummary()`/`getDocumentSummary()` — dan itu pun hanya
    secara tidak langsung lewat builder-builder yang sudah ada, dengan
    guard `typeof fn === 'function'` yang sudah ada sejak V2.17–V2.24).
  - Tidak ada `fetch()`, `showPage()`, `FEATURE_REGISTRY`, `innerHTML`,
    atau query DOM global — sama sekali tidak dipakai/ditambah.
  - Tidak menyentuh Activation Switch (`isDashboardV2Enabled()`)
    ataupun atribut `hidden`/`data-dashboard-v2-state` di root — itu
    murni domain `render()` (V2.14B).
  - Idempotent: dipanggil berkali-kali aman, tidak menumpuk node.
  - Tidak ada state instance/global baru (murni memakai `this._root`
    yang sudah ada sejak V2.1).
- **`tests/dashboard-v2-refresh.test.js`** (file baru, 22 test) —
  ketersediaan `refresh()`; no-op sebelum `init()`/`render()`; tidak
  memanggil `init()`/`destroy()`/`render()` ulang; tidak membuat root
  baru; integrasi sungguhan dgn adapter ASLI (`D` berubah di antara
  `render()` & `refresh()`, 11 panel ter-update konsisten); fallback
  aman tanpa adapter ter-load; inspeksi source `refresh()` (tanpa
  `D.`/`D[`, `fetch(`, `showPage(`, `FEATURE_REGISTRY`, `innerHTML`,
  query DOM global, `isDashboardV2Enabled`); idempotency; Activation
  Switch tidak berubah; referensi root/sidebar/header/main/bottomNav/
  fab dipertahankan; Sidebar/Header/Bottom Nav tidak ikut ter-refresh;
  API `init()`/`render()`/`destroy()` lama tidak berubah.
- **`DASHBOARD-V2-REFRESH.md`** — dokumentasi deliverable tahap ini.

### Tidak diubah

`dashboard-v2-data-adapter.js`, `dashboard-hub.js`, `dashboard-v2-
activation.js` (byte-identik dgn baseline V2.27), seluruh builder
`_build*()` yang sudah ada (0 baris diubah/di-refactor — `refresh()`
murni memanggil `_buildMain()` apa adanya), Activation Switch, mount
lifecycle `init()`/`render()`/`destroy()`, `FEATURE_REGISTRY`/
`dashboard-hub-registry.js`, `showPage()`, routing, `index.html`,
`app_production.html` (selain versi build `?v=` yang disinkronkan
otomatis oleh `build.js`, di luar perubahan manual tahap ini). Tidak
ada fetch, tidak ada business logic baru, tidak ada state instance/
global baru. Seluruh file test lama (baseline V2.27) tidak satu pun
diubah — hanya 1 file test baru ditambahkan
(`tests/dashboard-v2-refresh.test.js`).

Diverifikasi dgn `diff -rq` antara baseline (akhir Tahap V2.27) dan
hasil akhir tahap ini: hanya `dashboard-v2-shell.js` (diubah, aditif
murni — 0 baris dihapus) + `tests/dashboard-v2-refresh.test.js` (baru)
+ `DASHBOARD-V2-REFRESH.md` (baru) + `CHANGELOG.md`/`FILES-
CHANGED.md` (diubah, aditif) yang berbeda secara manual — sisanya
(bundle `app-bundle-*.min.js`, `app_production.html`, `index.html`,
`sw.js`, `docs/FILE-MAP.md`, 6 file sinkronisasi versi) adalah efek
otomatis `node scripts/build.js` (bump versi build), bukan sentuhan
manual.

## Hasil test

```
node --test tests/dashboard-v2-refresh.test.js
# tests 22
# pass 22
# fail 0

node --test
# tests 1844
# pass 1844
# fail 0
```

## Tahap V2.29 — Dashboard Auto Refresh

Baseline: ZIP V2.28 (`kw83-tahap0-feature-registry-29`), 1844/1844 test
PASS.

### Ditambahkan

- **`dashboard-v2-shell.js`** — tiga method baru, `DashboardV2Shell.
  startAutoRefresh(intervalMs?)` / `stopAutoRefresh()` /
  `isAutoRefreshActive()`, plus konstanta `AUTO_REFRESH_DEFAULT_MS`
  (30000ms) & state instance `_autoRefreshTimer`, yang membungkus
  `refresh()` (V2.28) di dalam satu timer periodik supaya Dashboard V2
  otomatis memanggil `refresh()` tanpa caller manual memanggilnya tiap
  kali data berubah. Kontrak:
  - `startAutoRefresh(intervalMs?)` — mulai timer (`setInterval`) yang
    memanggil `this.refresh()` (V2.28, tidak diubah/di-refactor sama
    sekali) tiap `intervalMs` ms (default `AUTO_REFRESH_DEFAULT_MS`
    kalau argumen tidak diberi/tidak valid — bukan angka positif).
    Idempotent: dipanggil berkali-kali TIDAK menumpuk timer — timer
    lama selalu dibersihkan dulu (lewat `stopAutoRefresh()` internal)
    sebelum timer baru dibuat, jadi selalu tepat 1 timer aktif.
  - `stopAutoRefresh()` — hentikan timer aktif (kalau ada), reset
    `_autoRefreshTimer` ke `null`. Aman dipanggil berkali-kali / sebelum
    pernah `startAutoRefresh()` (no-op, `return null`).
  - `isAutoRefreshActive()` — murni membaca state timer (`!== null`),
    tidak membuat/menghapus timer apa pun.
  - Kenapa timer periodik (bukan hook ke titik tulis `D`): tidak ada
    satu pun titik "notify data berubah" terpusat di repo ini — `D`
    ditulis oleh banyak modul independen tanpa event bus/pub-sub apa
    pun, dan menambah hook semacam itu ke modul lain jelas di luar
    scope tahap ini (additive-only, tidak boleh menyentuh business
    logic/file lain). Timer periodik 100% self-contained di
    `dashboard-v2-shell.js` (pola sama dgn `setInterval(...)` 5 menit
    yang sudah ada di `features-sheets-pwa-selftest.js`).
  - Tiap tick timer HANYA memanggil `this.refresh()` — TIDAK pernah
    memanggil `init()`/`destroy()`/`render()` ulang, TIDAK membuat root
    baru. Kontrak no-op `refresh()` (before `init()`/`render()`, atau
    setelah `destroy()`) tetap berlaku penuh terhadap tick timer — kalau
    timer sempat tick sebelum root/main ada (atau setelah root
    ter-detach lewat `destroy()`), `refresh()` sendiri yang no-op
    (`return null`); tidak ada logic tambahan di sini untuk itu, dan
    Dashboard TIDAK diam-diam ter-mount ulang.
  - Tidak membaca `D` sama sekali (langsung maupun tidak langsung) —
    ketiga method baru hanya memanggil `setInterval`/`clearInterval`/
    `this.refresh()`, tidak pernah menyebut `D`, `getFinanceSummary`/
    `getVehicleSummary`/`getFamilySummary`/`getDocumentSummary`.
  - Tidak ada `fetch()`, `showPage()`, `FEATURE_REGISTRY`, `innerHTML`,
    atau query DOM global — sama sekali tidak dipakai/ditambah.
  - Guard `typeof setInterval/clearInterval === 'function'` — no-op
    aman di environment tanpa timer.
  - Opt-in murni: TIDAK auto-start sendiri saat file di-load (pola
    sama dgn Activation Switch V2.15) — caller yang memanggil
    `startAutoRefresh()` secara eksplisit.
  - `_buildMain()` tetap punya persis 3 kemunculan di kode aktif (1
    definisi + 1 call site `render()` + 1 call site `refresh()`) —
    tidak ada call site ke-4 yang ditambah oleh `startAutoRefresh()`
    (tidak menduplikasi logic pembangunan panel).
- **`tests/dashboard-v2-auto-refresh.test.js`** (file baru, 20 test) —
  ketersediaan API baru & `AUTO_REFRESH_DEFAULT_MS`; state awal
  (`isAutoRefreshActive()` false, `stopAutoRefresh()` sebelum start
  no-op); pendaftaran timer & aktivasi status; default vs custom vs
  fallback interval tidak valid; pembersihan timer oleh
  `stopAutoRefresh()`; idempotency `startAutoRefresh()` (tidak
  menumpuk timer); tiap tick memanggil `refresh()` persis 1x & TIDAK
  memanggil `init()`/`render()`/`destroy()`; tick aman sebelum
  `init()`/`render()` & setelah `destroy()`; integrasi sungguhan dgn
  adapter ASLI (`D` berubah di antara `render()` & tick, panel
  ter-update via `refresh()`); tidak membaca `D` langsung & tidak
  memakai `fetch()`/`showPage()`/`FEATURE_REGISTRY`/`innerHTML`
  (inspeksi source ketiga method baru); `startAutoRefresh()` secara
  tekstual hanya memanggil `refresh()`; environment tanpa
  `setInterval` aman; `_buildMain()` tidak dapat call site baru;
  idempotent end-to-end (banyak tick tidak menumpuk node).
- **`DASHBOARD-V2-AUTO-REFRESH.md`** — dokumentasi deliverable tahap
  ini.

### Tidak diubah

`refresh()` (V2.28), `init()`/`render()`/`destroy()`, seluruh
`_build*()` builder existing di `dashboard-v2-shell.js`,
`dashboard-v2-data-adapter.js`, `dashboard-hub.js`, `dashboard-v2-
activation.js` (byte-identik dgn baseline V2.28), Activation Switch,
`FEATURE_REGISTRY`/`dashboard-hub-registry.js`, `showPage()`, routing,
`index.html`, `app_production.html` (selain versi build `?v=` yang
disinkronkan otomatis oleh `build.js`, di luar perubahan manual tahap
ini). Tidak ada fetch, tidak ada business logic baru, `D` tidak dibaca
langsung. Seluruh file test lama (baseline V2.28) tidak satu pun
diubah — hanya 1 file test baru ditambahkan
(`tests/dashboard-v2-auto-refresh.test.js`).

Diverifikasi dgn `diff -rq` antara baseline (akhir Tahap V2.28) dan
hasil akhir tahap ini: hanya `dashboard-v2-shell.js` (diubah, aditif
murni — 0 baris dihapus) + `tests/dashboard-v2-auto-refresh.test.js`
(baru) + `DASHBOARD-V2-AUTO-REFRESH.md` (baru) + `CHANGELOG.md`/
`FILES-CHANGED.md` (diubah, aditif) yang berbeda secara manual —
sisanya (bundle `app-bundle-*.min.js`, `app_production.html`,
`index.html`, `sw.js`, `docs/FILE-MAP.md`, 6 file sinkronisasi versi)
adalah efek otomatis `node scripts/build.js` (bump versi build), bukan
sentuhan manual.

## Hasil test

```
node --test tests/dashboard-v2-auto-refresh.test.js
# tests 20
# pass 20
# fail 0

node --test
# tests 1864
# pass 1864
# fail 0

node scripts/build.js
# ✅ Build "kw83-tahap0-feature-registry-31" selesai & lolos cek sintaks

node --test   (setelah build)
# tests 1864
# pass 1864
# fail 0
```

## Tahap V2.30 — Interactive Dashboard Cards

Baseline: ZIP V2.29 (`kw83-tahap0-feature-registry-31`), 1864/1864 test
PASS.

### Ditambahkan

- **`dashboard-v2-shell.js`** — `_buildModuleGrid()` (Module Grid, Tahap
  V2.4/V2.19): 3 dari 6 kartu placeholder lama (Finance, Vehicle,
  Settings) sekarang klik-able, reuse 100% mekanisme navigasi yang
  sudah ada — TIDAK ada fungsi navigasi baru:
  1. Kartu diberi `role="button"`, `tabindex="0"`,
     `data-action="dashHubNavigateToFeature"`,
     `data-args='[{"page":"keuangan"}]'` (atau `"carnotes"`/
     `"settings"`) — pola atribut deklaratif yang sama persis dgn
     `data-action="openTxModal" data-args='["expense"]'` yang sudah
     dipakai puluhan tombol lain di `index.html`.
  2. Dispatcher klik global yang sudah ada
     (`features-helpers-global-security.js`,
     `document.addEventListener('click', ...)`, TIDAK diubah) membaca
     atribut itu & memanggil fungsi global sesuai nama.
  3. `dashHubNavigateToFeature({page})` (`dashboard-hub.js`, TIDAK
     diubah) memanggil `showPage(target.page, navItems[
     PAGE_NAV_IDX[target.page]] || null)`.
  4. `showPage()` (`modal-navigasi.js`, TIDAK diubah) — router utama
     app yang sudah dipakai puluhan tempat lain.
  - Akibatnya `dashboard-v2-shell.js` sendiri TIDAK PERNAH memanggil
    `showPage()`/`FEATURE_REGISTRY`/`addEventListener`/`.onclick=`
    secara tekstual — murni atribut deklaratif; regex-check regresi yang
    sudah ada sejak V2.3 (`tests/dashboard-v2-summary.test.js`) tetap
    lulus tanpa modifikasi.
  - 3 kartu lain (Reports, Family, Documents) SENGAJA dibiarkan
    `page: null` — tetap placeholder murni seperti sejak V2.4, karena
    tidak py 1 page tunggal yang tidak ambigu di `PAGE_NAV_IDX` tanpa
    keputusan produk baru (Reports = tab di dalam Keuangan, Family =
    bagian LifeOS di `dashboard-hub`, Documents = tersebar
    Vehicle/Pajak) — lihat `DASHBOARD-V2-INTERACTIVE-CARDS.md`
    §"Kenapa hanya 3 dari 6 kartu".
  - Tidak membaca `D` langsung — kartu hanya membawa nama page statis.
  - Additive murni — 0 baris kode existing dihapus; satu-satunya
    perubahan struktural adalah menambah field `page` di 6 entri
    `modules[]` & membungkus pembuatan kartu lama dalam
    `if (mod.page) {...} else {...}` dengan cabang `else` = kode lama
    persis tidak berubah.
- **`tests/dashboard-v2-interactive-cards.test.js`** (file baru, 1
  test) — test integrasi: memuat `dashboard-v2-shell.js` bersama
  `dashboard-hub.js` ASLI (bukan mock) di satu sandbox
  (`tests/helpers/loadSource.js`), benar-benar memanggil rantai
  `data-action` → `dashHubNavigateToFeature()` → `showPage()`
  (di-stub) utk ketiga kartu (Finance/Vehicle/Settings) & memverifikasi
  nama page yang benar terpanggil tepat 1x; juga memverifikasi
  Reports/Family/Documents tetap 0 `data-action`.
- **`DASHBOARD-V2-INTERACTIVE-CARDS.md`** — dokumentasi deliverable
  tahap ini.

### Diubah (update test obsolete)

- **`tests/dashboard-v2-summary.test.js`** — test "Module Grid: 6
  module card ... sesuai urutan & placeholder" diganti jadi
  memverifikasi Finance/Vehicle/Settings punya `role="button"`/
  `data-action`/`data-args` yang benar & TIDAK lagi match
  `/placeholder/i`, sedangkan Reports/Family/Documents tetap match
  `/placeholder/i` & 0 `data-action`.
- **`tests/dashboard-v2-module-grid-data.test.js`** — test "6 kartu
  lama ... tidak berubah" diganti jadi memverifikasi
  Finance/Vehicle/Settings punya `data-action` yang benar,
  Reports/Family/Documents tetap 0 `data-action`.
- Tidak ada test lain (di luar 2 file di atas) yang perlu diperbarui —
  semua regex-check global (`showPage(`, `addEventListener`,
  `.onclick =`, `FEATURE_REGISTRY`) di file test lain tetap valid tanpa
  modifikasi.

### Tidak diubah

`dashboard-hub.js`, `modal-navigasi.js`,
`features-helpers-global-security.js`, `modules-render.js`,
`dashboard-hub-registry.js`/`FEATURE_REGISTRY`, `refresh()`, `init()`/
`render()`/`destroy()`, seluruh `_build*()` builder lain di
`dashboard-v2-shell.js` (Hero, Summary Cards, Quick Actions, Insight
Panel, Recent Activity, Statistics Panel, Upcoming Tasks,
Notifications, AI Command Center, Health Score, Predictive Insights,
Automation Center, Sidebar, Header, Bottom Nav, Auto Refresh),
`index.html`, `app_production.html` (selain versi build `?v=` yang
disinkronkan otomatis oleh `build.js`). Tidak ada `fetch()`, tidak ada
business logic baru, `D` tidak dibaca langsung.

Diverifikasi dgn `diff -rq` antara baseline (akhir Tahap V2.29) dan
hasil akhir tahap ini: hanya `dashboard-v2-shell.js` (diubah, aditif —
0 baris dihapus) + `tests/dashboard-v2-summary.test.js` (diubah,
assersi obsolete diperbarui) + `tests/dashboard-v2-module-grid-
data.test.js` (diubah, assersi obsolete diperbarui) +
`tests/dashboard-v2-interactive-cards.test.js` (baru) +
`DASHBOARD-V2-INTERACTIVE-CARDS.md` (baru) + `CHANGELOG.md`/
`FILES-CHANGED.md` (aditif) yang berbeda secara manual — sisanya
(bundle `app-bundle-*.min.js`, `app_production.html`, `index.html`,
`sw.js`, `docs/FILE-MAP.md`, 6 file sinkronisasi versi) adalah efek
otomatis `node scripts/build.js` (bump versi build), bukan sentuhan
manual.

## Hasil test

```
node --test tests/dashboard-v2-interactive-cards.test.js
# tests 1
# pass 1
# fail 0

node --test
# tests 1865
# pass 1865
# fail 0

node scripts/build.js
# ✅ Build "kw83-tahap0-feature-registry-32" selesai & lolos cek sintaks

node --test   (setelah build)
# tests 1865
# pass 1865
# fail 0
```

## Tahap V2.31 — Hero Real Data

Baseline: Dashboard V2 V2.30.1 (Stable) — mutual-exclusion Dashboard Hub
↔ Dashboard V2 sudah selesai, 1870/1870 test PASS, build PASS.

### Diubah (REPLACE placeholder → data nyata, bukan menambah elemen baru)

- **`dashboard-v2-shell.js`** — `_buildHero()` SAJA yang disentuh (builder
  lain tidak diedit sama sekali):
  1. 4 variabel summary adapter (`getFinanceSummary`/`getVehicleSummary`/
     `getFamilySummary`/`getDocumentSummary`, `dashboard-v2-data-
     adapter.js`, V2.16, TIDAK diubah) dipindah ke ATAS blok `_buildHero`
     — dari lokasi lamanya di Tahap V2.17 — supaya di-REUSE oleh 4
     placeholder LAMA di bawah ini TANPA memanggil fungsi adapter 2x.
  2. 4 placeholder LAMA (title/healthScore/balance/insight, Tahap V2.2)
     sekarang diisi data nyata — id/class/`data-dashboard-v2-part` TIDAK
     berubah, hanya `textContent`/`aria-label` yang di-REPLACE:
     - **title**: `Selamat datang — {N} data tercatat` (N = jumlah akun +
       kendaraan + anak + dokumen SIM, dari 4 summary adapter).
     - **healthScore**: diisi ulang maknanya jadi **Skor Kelengkapan
       Data** — `{X}/4 kategori terisi` (X = jumlah domain
       Keuangan/Kendaraan/Keluarga/Dokumen yang py minimal 1 data).
       Adapter TIDAK punya fungsi skor "Hidup Seimbang" (itu ranah
       `LifeBalance.compute()` di `hidup-seimbang.js`, di luar adapter &
       di luar scope tahap ini — lihat `DASHBOARD-V2-HERO-REAL-DATA.md`
       §"Keputusan cakupan").
     - **balance**: `Saldo: Rp {totalBalance}` dari `getFinanceSummary()`.
     - **insight**: kalimat ringkasan gabungan 4 domain (akun/kendaraan/
       anak/SIM).
  3. Kalau adapter/`D` belum tersedia (guard `typeof fn === 'function'`
     gagal, pola sama persis dgn V2.17/V2.18), 4 elemen fallback ke teks
     placeholder ASLI V2.2 byte-identik — jalur ini yang dipakai
     `tests/dashboard-v2-hero.test.js` & `tests/dashboard-v2-hero-
     data.test.js` (keduanya me-load shell TANPA adapter), sehingga kedua
     file test lama TETAP lulus tanpa 1 baris pun diubah.
  4. 4 elemen data summary BARU (Tahap V2.17: `dashboardV2HeroFinance-
     Summary` dkk) tidak berubah perilakunya — tetap memakai variabel
     summary yang sama (reuse), bukan fetch ulang.
- **`tests/dashboard-v2-hero-real-data.test.js`** (file baru, 6 test) —
  integrasi sungguhan (`dashboard-v2-data-adapter.js` ASLI + `D` tiruan,
  tidak di-mock): 4 placeholder lama menampilkan data nyata & tidak lagi
  match `/placeholder/i`; healthScore parsial (3/4 domain terisi) dihitung
  benar; jalur "adapter tidak di-load" tetap fallback placeholder
  byte-identik; constraint check (`D` tidak dibaca langsung, adapter tidak
  diubah, `dashboard-hub.js` tidak diubah).
- **`DASHBOARD-V2-HERO-REAL-DATA.md`** — dokumentasi deliverable tahap
  ini, termasuk rasional keputusan cakupan Health Score.

### Tidak diubah (regresi non-obsolete)

- `dashboard-v2-data-adapter.js` — 0 byte diubah, tetap persis 5 fungsi
  (`_dashV2AdapterHasD`/`getFinanceSummary`/`getVehicleSummary`/
  `getFamilySummary`/`getDocumentSummary`) seperti baseline V2.16.
- `dashboard-hub.js` — tidak disentuh (masih V2.30.1, mutual-exclusion
  Hub↔V2 tidak berubah).
- `_buildSummaryCards()`/`_buildQuickActions()`/`_buildModuleGrid()`/
  seluruh `_build*()` builder lain di `dashboard-v2-shell.js` — tidak
  disentuh, hanya `_buildHero()` yang diedit.
- **Seluruh test lama** (baseline V2.30.1, 1870 test) — 0 file diubah;
  hanya 1 file test baru ditambahkan (`tests/dashboard-v2-hero-real-
  data.test.js`). `tests/dashboard-v2-hero.test.js` &
  `tests/dashboard-v2-hero-data.test.js` yang tadinya berisiko jadi
  obsolete ternyata TETAP lulus tanpa modifikasi — keduanya me-load shell
  tanpa adapter, sehingga tetap menguji jalur fallback placeholder yang
  tidak berubah.
- `index.html`, `app_production.html` (selain versi build `?v=` yang
  disinkronkan otomatis oleh `build.js`) — Hero tetap self-mounting via
  JS, 0 markup Dashboard V2 baru.
- Tidak ada `fetch()`, tidak ada routing/`showPage()`, tidak ada
  `FEATURE_REGISTRY`, tidak ada `D` dibaca langsung, tidak ada
  `innerHTML`, tidak ada business logic baru — healthScore/title/insight
  murni interpolasi presentasional dari field count yang sudah dihitung
  adapter, bukan formula/skor bisnis baru.

## Hasil test

```
node --test tests/dashboard-v2-hero-real-data.test.js
# tests 6 / pass 6 / fail 0

node --test tests/dashboard-v2-hero.test.js tests/dashboard-v2-hero-data.test.js
# tests 30 / pass 30 / fail 0  (regresi non-obsolete, 0 diubah)

node --test
# tests 1876 / pass 1876 / fail 0

node scripts/build.js
# ✅ Build "kw-v2-31-hero-real-data-1" selesai & lolos cek sintaks

node --test   (setelah build)
# tests 1876 / pass 1876 / fail 0
```

## Sesi 74 (2026-07-20) — Finance Intelligence Foundation (Batch 6)

Keputusan produk FINAL eksplisit user (target baru Batch 6, lanjutan
setelah Finance Account & Finance Category Foundation Sesi 73). Target:
Cash Flow Summary, Budget Summary, Income vs Expense, Financial Health
Score, Insight dasar — semua REUSE penuh atas service/registry/data yang
sudah ada, TIDAK ada framework baru, TIDAK duplikasi logic, TIDAK
mengubah struktur data `D`.

### Ditambahkan (PURE/read-only, tidak ada UI/tombol/wiring baru)

- `modules/finance/finance-intelligence.js` — objek `FinanceIntelligence`:
  - `incomeVsExpense(range?)` — total income/expense per rentang tanggal
    eksplisit `{from,to}` (default bulan berjalan). Satu-satunya logic
    genuinely baru sesi ini — sebelumnya tidak ada versi murni (non-DOM)
    dari agregasi ini.
  - `cashflowSummary()` — wrapper tipis `computeCashflowForecast()`
    (`modules/finance/tx-list-cashflow.js`) + `incomeVsExpense()` bulan
    berjalan.
  - `budgetSummary(month?, year?)` — wrapper tipis `Budget.getUsed()`/
    `Budget.getEffectiveLimit()` (`budget.js`) atas `D.budgets`.
  - `healthScore()` — skor 0-100 komposit 4 komponen (savings rate,
    budget adherence, rasio utang thd saldo via `totalDebtValue()`/
    `totalSaldoAkun()`, proyeksi cashflow 30 hari) — tiap komponen HANYA
    disertakan kalau service pendukungnya tersedia (guard `typeof`), skor
    diskalakan ulang dari bobot yang tersedia.
  - `insights()` — insight dasar (deficit/good_savings/budget_over/
    cashflow_negative/health_score) derivatif langsung dari 4 fungsi di
    atas. BUKAN duplikasi `FinCoach` (`modules/shared/modules-calc.js`) —
    FinCoach tetap widget Dashboard proaktif dgn state dismiss/persist &
    mencakup domain di luar finance murni.
  - `summary()` — satu pintu masuk gabungan ke-5 fungsi di atas.

### Diubah

- `scripts/build.js` — `GROUP_B` nambah `modules/finance/finance-
  intelligence.js`, diletakkan setelah `pajak-aset-ui-wrappers.js`
  (dependency `totalDebtValue()`) & sebelum `app-bootstrap.js`.

### Test

- `tests/finance-intelligence.test.js` (BARU, 17 test) — pola sama
  `tests/finance-predict.test.js`, dependency (`computeCashflowForecast`,
  `Budget`, `totalSaldoAkun`, `totalDebtValue`) di-mock lewat `loadSource`
  extraGlobals (isolasi murni per fungsi).

### Hasil test

```
node --test tests/finance-intelligence.test.js
# tests 17 / pass 17 / fail 0

node --test tests/*.test.js
# tests 2583 / pass 2583 / fail 0   (naik dari 2566)

node scripts/build.js kw74-batch6-finance-intelligence-foundation
# ✅ Build "kw74-batch6-finance-intelligence-foundation" selesai & lolos cek sintaks (?v=498)

node --test tests/*.test.js   (setelah build)
# tests 2583 / pass 2583 / fail 0
```

## Sesi 76 (2026-07-20) — Vehicle Intelligence Foundation (Batch 7)

Keputusan produk FINAL eksplisit user (target baru Batch 7, di luar
kandidat Batch 6 lama). Target: lapisan agregasi PURE domain VEHICLE —
vehicle overview, health score per kendaraan, ringkasan armada (fleet),
insight dasar — pola SAMA PERSIS `FinanceIntelligence` (Sesi 74, Batch 6),
cuma dipindah ke domain vehicle. TIDAK ada Dashboard, TIDAK ada
HTML/CSS, TIDAK ada AI Hook, TIDAK ada Reminder (eksplisit di luar scope
sesi ini).

### Ditambahkan (PURE/read-only, tidak ada UI/tombol/wiring baru)

- `modules/vehicle/vehicle-intelligence.js` — objek `VehicleIntelligence`:
  - `vehicleOverview(vehicleId)` — ringkasan 1 kendaraan: KM saat ini
    (`getVehicleKm()`), prediksi servis (`predictService()`), efisiensi
    BBM (`fuelEfficiency()`) — semua reuse murni, `{ok:false}` kalau
    kendaraan tidak ditemukan.
  - `healthScore(vehicleId)` — skor 0-100 komposit 2 komponen (service
    adherence dari status `predictService().items` — aman/segera/lewat,
    ketersediaan data BBM dari `fuelEfficiency()` ok/tidak), bobot 50/50,
    HANYA komponen yang tersedia disertakan (guard `ok`/`length`), skor
    diskalakan ulang dari bobot yang tersedia — pola sama persis
    `FinanceIntelligence.healthScore()`.
  - `fleetSummary()` — agregasi lintas SEMUA `D.vehicles`: total
    kendaraan, total item servis lewat jatuh tempo (reuse
    `predictService()` per kendaraan, status yang sama dgn
    `_vehicleOverdueCheck()`), rata-rata `healthScore()` armada. Belum
    ada versi murni (non-DOM, lintas-kendaraan) sebelum sesi ini —
    satu-satunya logic genuinely baru selain skoring komposit.
  - `insights(vehicleId?)` — insight dasar derivatif. Tanpa `vehicleId`:
    fleet-level (dari `fleetSummary()`). Dengan `vehicleId`: kendaraan
    itu saja (servis lewat, estimasi biaya BBM bulanan, skor kesehatan).
    BUKAN duplikasi rule `AIDecision` (`vehicle-service-overdue`/
    `vehicle-fuel-efficiency-drop` di `sparepart-servis.js`) — rule itu
    proaktif dgn cooldown/severity/registrasi, insight di sini derivatif
    ringan tanpa cooldown/registrasi apa pun.
  - `summary(vehicleId?)` — satu pintu masuk gabungan (fleet + insights,
    ditambah vehicle overview/healthScore/insights kendaraan kalau
    `vehicleId` diisi).

### Diubah

- `scripts/build.js` — `GROUP_B` nambah `modules/vehicle/vehicle-
  intelligence.js`, diletakkan setelah `modules/finance/finance-
  dashboard.js` & sebelum `app-bootstrap.js` (dependency `getVehicleKm`/
  `predictService`/`fuelEfficiency` dari `vehicle-core.js`/`sparepart-
  servis.js`, keduanya sudah dimuat lebih awal di urutan build).

### Test

- `tests/vehicle-intelligence.test.js` (BARU, 17 test) — pola sama
  `tests/finance-intelligence.test.js`, dependency (`getVehicleKm`,
  `predictService`, `fuelEfficiency`) di-mock lewat `loadSource`
  extraGlobals (isolasi murni per fungsi).

### Hasil test

```
node --test tests/vehicle-intelligence.test.js
# tests 17 / pass 17 / fail 0

node --test tests/*.test.js
# tests 2614 / pass 2614 / fail 0   (naik dari 2597)

node scripts/build.js kw76-batch7-vehicle-intelligence-foundation
# ✅ Build "kw76-batch7-vehicle-intelligence-foundation" selesai & lolos cek sintaks (?v=500)

node --test tests/*.test.js   (setelah build)
# tests 2614 / pass 2614 / fail 0
```

## Catatan dokumentasi — gap Sesi 77–83 (CHANGELOG.md)

`CHANGELOG.md` sempat berhenti di entri Sesi 76 (Vehicle Intelligence
Foundation) — 7 sesi berikutnya (77 Vehicle Dashboard Foundation, 78
Vehicle Reminder Foundation, 79 Vehicle AI Hook Foundation, 80 Vehicle
AI Dashboard Integration, 81 Vehicle Analytics Foundation, 82 Vehicle
Decision Engine Foundation, 83 Vehicle Automation Foundation) TIDAK
pernah ditambahkan ke file ini, padahal semuanya sudah lengkap tercatat
di `docs/CLAUDE.md`/`docs/BATCH_PLAN.md`/`docs/NEXT_SESSION.md` (pola
gap dokumentasi yang sama seperti insiden Sesi 39/41/44/46/47/60/67 —
gap murni dokumentasi, BUKAN gap keputusan produk atau kode). Detail
lengkap ke-7 sesi itu: lihat `docs/BATCH_PLAN.md` § Batch 7 (tabel Sesi
77-83). Ditandai di sini transparan supaya sesi dokumentasi-sinkronisasi
berikutnya bisa mengisi retroaktif kalau diperlukan — TIDAK diisi penuh
di sesi ini (Sesi 84) krn scope sesi ini adalah implementasi Vehicle
Dashboard Final Integration, bukan audit/backfill dokumentasi lintas-sesi.

## Sesi 84 (2026-07-20) — Vehicle Dashboard Final Integration (Batch 7)

Keputusan produk FINAL eksplisit user: lanjutan Batch 7 setelah Vehicle
Automation Foundation (Sesi 83) — menutup gap yang dicatat eksplisit
Sesi 83: Service Reminder & Fuel Reminder (`VehicleReminder`, Sesi 78)
belum pernah menembak notifikasi browser NYATA (hanya Tax Reminder yang
sudah, lewat jalur ad-hoc lama di `reminder-notif.js`).

### Ditambahkan

- `modules/vehicle/vehicle-notif-bridge.js` — objek `VehicleNotifBridge`:
  - `items(vehicleId?, firedIds?)` — lapisan penerjemah PURE (tidak
    pernah memanggil `fireNotif()`/`Notification`/`localStorage`
    sendiri), 100% reuse `VehicleReminder.serviceReminders()`/
    `.fuelReminders()` (Sesi 78) apa adanya. HANYA severity `'overdue'`
    diambil (pola sama ambang tagihan/pajak yang sudah ada — hanya H-0
    s/d lewat yang aktif tembak notif push, `'due-soon'`/`'info'` tetap
    murni domain dashboard/insight feed). Hasil diterjemahkan jadi
    bentuk generik `{fireKey,title,body}`, difilter `firedIds` (dedupe
    hari yang sama, disuplai pemanggil dari `kw_notif_fired.ids`).
    `taxReminders()` SENGAJA TIDAK disertakan — jalur ad-hoc lama di
    `reminder-notif.js` (baca `D.vehicles`+`VEHTAX_ITEMS` langsung,
    mendahului `VehicleReminder`) sudah menembak notif pajak;
    menyertakannya lagi lewat modul ini akan dobel-tembak utk tipe yang
    sama (format `fireKey` beda, tidak saling terdeteksi lewat
    `firedIds` yang sama).

### Diubah

- `reminder-notif.js` `checkAndFireReminders()` — 1 blok baru
  ditambahkan setelah blok SPT Tahunan, SEBELUM
  `localStorage.setItem('kw_notif_fired'...)`: guard `typeof
  VehicleNotifBridge!=='undefined'`, panggil
  `VehicleNotifBridge.items(undefined, fired.ids)`, lalu `fireNotif()`
  tiap item + push `fireKey` ke `fired.ids` — pola identik blok
  tagihan/LDR/pajak-kendaraan/SIM/SPT yang sudah ada di file yang sama.
  TIDAK ada perubahan ke blok pajak kendaraan (`VEHTAX_ITEMS`) yang
  sudah ada.
- `scripts/build.js` — `GROUP_B` nambah
  `modules/vehicle/vehicle-notif-bridge.js`, diletakkan setelah
  `vehicle-reminder.js`, sebelum `vehicle-ai-hook.js` (posisi
  `reminder-notif.js` sendiri di `GROUP_B` TIDAK dipindah — referensi
  `VehicleNotifBridge` di `checkAndFireReminders()` diresolusi saat
  fungsi DIPANGGIL, bukan saat file di-parse, pola sama persis
  referensi `VEHTAX_ITEMS`/`predictService` yang sudah ada sebelumnya
  di file yang sama).

### Test

- `tests/vehicle-notif-bridge.test.js` (BARU, 10 test) — pola sama
  `tests/vehicle-ai-hook.test.js`, dependency `VehicleReminder`
  di-mock lewat `loadSource` extraGlobals (isolasi murni). Catatan
  teknis: 2 assersi awal (array kosong) sempat gagal krn array hasil
  sandbox `vm` beda realm dari array host (pola sama catatan
  `tests/vehicle-reminder.test.js` Sesi 78) — diperbaiki pakai
  `.length===0`/`Array.from()` sebelum `deepEqual`, bukan
  `deepEqual([],[])` langsung.

### Hasil test

```
node --test tests/vehicle-notif-bridge.test.js
# tests 10 / pass 10 / fail 0

node --test tests/*.test.js
# tests 2826 / pass 2826 / fail 0   (naik dari 2816)

node scripts/build.js kw84-batch7-vehicle-dashboard-final-integration
# ✅ Build "kw84-batch7-vehicle-dashboard-final-integration" selesai & lolos cek sintaks (?v=508)

node --test tests/*.test.js   (setelah build)
# tests 2826 / pass 2826 / fail 0
```

## Sesi 133 (2026-07-22) — Reorganisasi Insight AI: Vehicle & Finance dipindah ke tab fitur masing-masing

**Catatan gap dokumentasi:** entri kronologis di `CHANGELOG.md` berhenti
di Sesi 84 (Batch 7) — source code sudah berjalan sampai `?v=554`
(build `kw130-data-management-core-backup-history-health-7`) saat sesi
ini dimulai, gap Sesi 85-132 TIDAK di-backfill di sesi ini (di luar
scope, lihat `docs/PROJECT_STATE.md` § Backfill S85–S110 untuk gap
serupa sebelumnya). **Tidak ada folder `tests/` di ZIP yang diterima
sesi ini** — regression test `node --test` TIDAK BISA dijalankan;
verifikasi sesi ini murni manual (syntax check `node --check`, audit
grep referensi ID, verifikasi div balance & keunikan ID di HTML,
`node scripts/build.js` lolos cek sintaks bundle). **User WAJIB
menjalankan `npm test` sendiri sebelum menganggap perubahan ini final.**

### Konteks

Permintaan eksplisit user: "pindahkan semua insight AI ke navigasi baru
atau pindahkan ke tab masing-masing fitur". Audit menemukan sub-tab
"insight" di Dashboard Hub (`SECTION_GROUPS.insight`,
`modules/dashboard-hub/dashboard-hub.js`) menumpuk 26 card lintas-domain
jadi satu (Finance×10, Vehicle×8, Cross×6, LifeOS×1, EIE×1) tanpa
pengelompokan. Keputusan (dikonfirmasi user): card yang murni 1 domain
dipindah ke tab fitur terkait; card lintas-domain (Cross/LifeOS/EIE)
TETAP di sub-tab "insight" Dashboard Hub karena tidak punya "rumah" 1
fitur tunggal.

### Diubah

- **`modules/dashboard-hub/dashboard-hub.js`** — 18 baris pemanggilan
  `render()` (`FinanceDashboard`, `FinancialForecastPresenter`,
  `BudgetRecommendationPresenter`, `CashFlowProjectionPresenter`,
  `FinancialGoalPresenter`, `InvestmentPlannerPresenter`,
  `DebtOptimizerPresenter`, `RetirementPlannerPresenter`,
  `FinancialHealthScorePresenter`, `FinancialRiskDashboardPresenter`,
  `VehicleDashboard`, `VehicleInsightPresenter`, `VehicleDailyBrief`,
  `VehicleAlertPanel`, `VehicleInsightFeed`,
  `VehicleAnalyticsPresenter`, `VehicleDecisionPresenter`,
  `VehicleAutomationPresenter`) DIHAPUS dari `DashboardHub.render()`
  (dipindah ke `renderKeuangan()`/`renderCnTab()` — lihat di bawah).
  `SECTION_GROUPS.insight` dikurangi dari 26 jadi 8 entry (hanya
  `lifeOSWrap`/`eieWrap`/`crossDashWrap`/`crossBriefWrap`/
  `crossInsightWrap`/`personalOverviewWrap`/`crossWidgetsWrap`/
  `lifePriorityWrap` — murni lintas-domain). **TIDAK ADA logic/rumus
  presenter yang diubah** — murni pindah LOKASI pemanggilan `render()`,
  fungsi presenter itu sendiri 0 perubahan.
- **`modules/shared/modules-render.js`** — `renderKeuangan()` nambah 10
  baris pemanggilan render Finance presenter di atas (persis sama,
  hanya pindah lokasi panggilan). `renderCnTab()` nambah 8 baris
  pemanggilan render Vehicle presenter di atas (persis sama, hanya
  pindah lokasi panggilan).
- **`index.html` / `app_production.html`** (disinkronkan, 0 diff) — 18
  container `<div class="dashhub-wrap">` (findashWrap dst, vehdashWrap
  dst) DIPINDAH dari section Dashboard Hub ke: 10 container Finance →
  `#page-keuangan` > `#keuanganTab-laporan` (sub-tab "📊 Laporan"); 8
  container Vehicle → `#page-carnotes` (dekat `#mobilInsightCard`).
  Lokasi lama diganti komentar penanda (bukan dihapus total tanpa
  jejak). Verifikasi: 0 ID duplikat, div `<div>`/`</div>` tetap seimbang
  (1768/1768), tiap 18 ID container muncul tepat 1×.
- Versi build: `?v=554` → `?v=556` (2× jalan `build.js`, sekali auto-
  increment tanpa nama eksplisit lalu di-build ulang dgn nama sesi yang
  benar — lihat catatan di bawah).

### Tidak diubah

Semua fungsi `.render()`/`.summary()`/API presenter (Finance/Vehicle
Intelligence dkk) — 100% reuse, tidak ada baris logic di dalamnya yang
disentuh. `crossDashWrap`/`crossBriefWrap`/`crossInsightWrap`/
`personalOverviewWrap`/`crossWidgetsWrap`/`lifePriorityWrap`/
`lifeOSWrap`/`eieWrap` TETAP di Dashboard Hub (keputusan produk sesi
ini — lintas-domain, bukan diabaikan). `propertyManagementWrap`/
`rentalManagementWrap`/`assetPortfolioWrap`/`assetMaintenanceWrap`/
`recommendationPanelWrap`/`actionQueueWrap` (di luar `SECTION_GROUPS`
sejak sebelum sesi ini — gap pre-existing, bukan scope sesi ini) TIDAK
disentuh.

### Hasil verifikasi (TANPA `tests/` — lihat catatan gap di atas)

```
node --check modules/dashboard-hub/dashboard-hub.js   # OK
node --check modules/shared/modules-render.js         # OK
node scripts/build.js kw133-insight-ai-reorganisasi-vehicle-finance-ke-tab-fitur
# ✅ Build selesai & lolos cek sintaks bundle (node --check), ?v=556
# index.html & app_production.html identik (0 diff)
# 0 ID HTML duplikat, div balance 1768/1768 seimbang
```

**PENTING:** sesi berikutnya (atau user sendiri) WAJIB menjalankan
`npm test` penuh dgn folder `tests/` yang lengkap sebelum rilis
dianggap final — sesi ini tidak bisa memverifikasi regression test
sama sekali krn ZIP yang diterima tidak menyertakan `tests/`.

## Sesi 134 (2026-07-22) — Gap fix: live-wiring `renderDashboard()` dobel-render 18 presenter Finance/Vehicle pasca-Sesi 133

**Konteks:** Audit terpisah (bukan lanjutan alur kerja sesi biasa) menemukan
Sesi 133 hanya menghapus 18 pemanggilan `render()` (Finance ×10, Vehicle
×8) dari `DashboardHub.render()` (`dashboard-hub.js`) lalu menambahkannya
ke `renderKeuangan()`/`renderCnTab()` — TAPI tidak menghapus 18 baris yang
SAMA dari blok "DASHBOARD HUB — LIVE WIRING" di dalam `renderDashboard()`
(`modules/shared/modules-render.js`). Blok live-wiring itu awalnya dibuat
supaya card Dashboard Hub tetap ter-update kalau user menyimpan data dari
halaman lain, tapi sejak Sesi 133 card Finance/Vehicle sudah tidak lagi
tinggal di Dashboard Hub — jadi 18 baris itu jadi murni duplikasi kerja:
`renderDashboard()` dipanggil dari puluhan titik `save()` di seluruh app
(bukan cuma pas buka tab Keuangan/Kendaraan), jadi tiap kali user simpan
data apa pun di halaman mana pun, `FinanceIntelligence`/`VehicleIntelligence`
dkk dihitung ulang DUA KALI (sekali di sini, sekali lagi nanti oleh
`renderKeuangan()`/`renderCnTab()` yang dipanggil dari titik `save()` yang
sama). Tidak merusak tampilan (elemen tetap ketemu lewat `getElementById`
krn container-nya cuma pindah lokasi, bukan dihapus), tapi bertentangan
dengan tujuan efisiensi reorganisasi Sesi 133 & klaim "DIPINDAH" (harusnya
dihapus dari lokasi lama, bukan diduplikasi).

### Diubah

- **`modules/shared/modules-render.js`** — 18 baris pemanggilan `render()`
  (`FinanceDashboard`, `FinancialForecastPresenter`,
  `BudgetRecommendationPresenter`, `CashFlowProjectionPresenter`,
  `FinancialGoalPresenter`, `InvestmentPlannerPresenter`,
  `DebtOptimizerPresenter`, `RetirementPlannerPresenter`,
  `FinancialHealthScorePresenter`, `FinancialRiskDashboardPresenter`,
  `VehicleDashboard`, `VehicleInsightPresenter`, `VehicleDailyBrief`,
  `VehicleAlertPanel`, `VehicleInsightFeed`, `VehicleAnalyticsPresenter`,
  `VehicleDecisionPresenter`, `VehicleAutomationPresenter`) DIHAPUS dari
  blok live-wiring `renderDashboard()`. `PropertyManagementPresenter`/
  `RentalManagementPresenter`/`AssetPortfolioPresenter`/
  `AssetMaintenancePresenter`/`CrossDashboardCard`/dst (card yang MASIH
  tinggal di Dashboard Hub) TIDAK disentuh — tetap live-wiring seperti
  semula. Komentar blok (`~25 presenter`) diperbarui jadi `~18 presenter`
  + catatan gap fix ditambahkan di titik penghapusan.
- **7 file `modules/vehicle/vehicle-*.js`** (`vehicle-alert-panel.js`,
  `vehicle-analytics-presenter.js`, `vehicle-automation-presenter.js`,
  `vehicle-daily-brief.js`, `vehicle-decision-presenter.js`,
  `vehicle-insight-feed.js`, `vehicle-insight-presenter.js`) +
  `vehicle-dashboard.js` — komentar header "Dipanggil dari
  DashboardHub.render() & live-wiring renderDashboard()" (SUDAH BASI sejak
  Sesi 133, tidak sempat diperbarui sesi itu) diperbarui jadi "Dipanggil
  dari renderCnTab()" + catatan live-wiring dihapus.
- **9 file `modules/finance/*-presenter.js`** (`budget-recommendation-`,
  `debt-optimizer-`, `finance-dashboard.js`, `financial-forecast-`,
  `financial-goal-`, `financial-health-score-`, `financial-risk-dashboard-`,
  `investment-planner-`, `retirement-planner-presenter.js`) — komentar
  header senada, diperbarui jadi "Dipanggil dari renderKeuangan()".

### Tidak diubah

Logic/rumus di dalam presenter itu sendiri — 0 baris disentuh, murni
menghapus pemanggilan duplikat + memperbarui komentar. Container HTML,
`SECTION_GROUPS`, dan struktur tab dari Sesi 133 tidak disentuh (sudah
benar, terverifikasi saat audit).

### Hasil verifikasi

```
node --check modules/shared/modules-render.js   # OK
node --check modules/vehicle/vehicle-*.js (8 file)   # OK semua
node --check modules/finance/*-presenter.js (9 file) # OK semua
node scripts/build.js kw134-gap-fix-live-wiring-dobel-finance-vehicle
# ✅ Build selesai & lolos cek sintaks bundle (node --check), ?v=557
# index.html & app_production.html identik (0 diff)
# grep app-bundle-a/b.min.js: FinanceDashboard.render()/VehicleDashboard.render()
#   dst masing-masing HANYA 1 titik panggil (sebelumnya 2) — duplikasi hilang
```

**PENTING (masih berlaku dari Sesi 133):** folder `tests/` TETAP tidak ada
di ZIP yang diterima sesi ini — regression `node --test` TIDAK BISA
dijalankan. Verifikasi murni manual (syntax check + grep + build).
**User WAJIB menjalankan `npm test` penuh sebelum menganggap gap fix ini
final**, terutama utk memastikan card Finance/Vehicle di tab Keuangan/
Kendaraan tetap live-update dgn benar tanpa live-wiring `renderDashboard()`.

## Sesi 135 (2026-07-22) — Perf fix: `renderDashboard()` sinkron tanpa syarat di `showMain()` bikin PIN-unlock lambat

**Konteks:** User melaporkan "setelah input PIN, masuk ke dashboard utama
lama". Audit menemukan `showMain()` (dipanggil begitu PIN benar, lihat
`modules/shared/keamanan-pin.js`) memanggil `renderDashboard()` SINKRON
tanpa syarat — padahal landing page default app ini BUKAN Beranda
(`page-dashboard`), tapi Dashboard Hub (`page-dashboard-hub`, lihat
komentar di `modules/finance/tangga-keuangan.js` & `docs/PROJECT_STATE.md`).
Beberapa baris di bawahnya, `refreshCurrentPage()` merender halaman yang
BENERAN aktif — kalau itu Dashboard Hub, artinya `DashboardHub.render()`
(sendiri berat: bangun ulang seluruh grid fitur + 15+ presenter) baru
mulai dieksekusi SETELAH `renderDashboard()` selesai menghitung & menggambar
seluruh konten Beranda (Advisor/LifeBalance/AIWidget/FinCoach/
AIRecommendCard/AIDailyBriefingCard + loop `DASH_RENDER_ORDER` 17 kartu)
ke halaman yang TIDAK kelihatan sama sekali (ketutup Dashboard Hub). Pada
skenario paling umum (buka app dari kondisi tertutup/PWA baru dibuka, PIN
muncul di landing page default), ini kerja dua kali lipat berturutan
SEBELUM konten yang benar-benar dilihat user sempat tergambar — kandidat
kuat penyebab jeda "lama" pasca-PIN yang dilaporkan.

### Diubah

- **`modules/shared/features-helpers-global-security.js`** (`showMain()`)
  — pemanggilan `renderDashboard()` sekarang dicek dulu: kalau Beranda
  BUKAN halaman aktif saat unlock (`!document.querySelector('.page.active
  #page-dashboard')` — kasus paling umum), `renderDashboard()` disusulkan
  lewat `runDeferredOrNow()` yang sama dgn 6 pemanggilan non-inti
  (checkBackup/checkBills/dst) yang sudah dijadwalkan di sini sejak
  sebelumnya — TIDAK memblokir `refreshCurrentPage()` yang merender
  halaman yang benar-benar dilihat user. Kalau Beranda MEMANG halaman
  aktif (PIN cuma overlay, bukan reload — kalau user mengunci app saat
  lagi di Beranda, `.page.active` tetap keingat), `renderDashboard()` di
  sini DILEWATI (bukan dihapus) — dibiarkan `refreshCurrentPage()` di
  bawah yang merender via `renderPageContent('dashboard')` seperti biasa,
  sekaligus membereskan gap duplikat lama (renderDashboard() sebelumnya
  terpanggil 2× berturutan kalau kebetulan Beranda yang aktif — gap ini
  sudah ada dari sebelum sesi ini, ikut dibereskan sekalian karena
  triggernya sama persis).

### Tidak diubah

`renderDashboard()` itu sendiri — 0 baris logic/rumus di dalamnya
disentuh. `refreshCurrentPage()`, `DashboardHub.render()`, urutan render
`DASH_RENDER_ORDER`, dan semua presenter — 0 perubahan. Murni KAPAN/
berapa kali `renderDashboard()` dipanggil dari `showMain()`.

### Hasil verifikasi

```
node --check modules/shared/features-helpers-global-security.js   # OK
node scripts/build.js kw135-perf-fix-renderdashboard-sinkron-saat-pin-unlock
# ✅ Build selesai & lolos cek sintaks bundle (node --check), ?v=558
# index.html & app_production.html identik (0 diff)
```

**PENTING (masih berlaku dari Sesi 133/134):** folder `tests/` TETAP tidak
ada di ZIP — regression `node --test` TIDAK BISA dijalankan, verifikasi
murni manual. **User WAJIB menjalankan `npm test` + tes manual buka app
dari kondisi tertutup (cold start) DAN dari kondisi terkunci saat di
Beranda**, supaya kedua skenario (`_berandaAktifSaatUnlock` true/false)
sama-sama tervalidasi sebelum dianggap final. Kalau setelah ini jeda
pasca-PIN masih terasa lama, kemungkinan besar bottleneck-nya ada di
`DashboardHub.render()` sendiri (grid fitur + 15+ presenter, semua
sinkron) — kandidat optimasi lanjutan yang belum disentuh sesi ini.

## Sesi 136 (2026-07-22) — Gap fix: kartu "Tangga Ternak Uang" macet lebih lama di "Menghitung..." (regresi dari Sesi 135)

**Konteks:** User melaporkan kartu "Tangga Keuangan" masih "cuma
menghitung" pasca perbaikan Sesi 135. Audit menemukan Sesi 135 (perf fix
PIN-unlock) tanpa sengaja memperlambat kartu ini: `#tanggaKeuanganCard`
secara FISIK ada di dalam `#page-dashboard-hub`, tapi satu-satunya titik
yang merender isinya adalah live-wiring di dalam `renderDashboard()`
(`modules/shared/modules-render.js`) — bukan dipanggil langsung dari
`DashboardHub.render()` (`dashboard-hub.js`) seperti SEMUA kartu lain yang
juga tinggal di Dashboard Hub (Hero/Summary/Analytics/Property/Rental/
Asset/dst — semua itu double-wired: sekali langsung di `DashboardHub.render()`,
sekali lagi di live-wiring `renderDashboard()` utk live-update lintas
halaman). Ini gap peninggalan Sesi 121 (S121 cuma menambahkan ke live-
wiring, lupa menambahkan panggilan langsung yang jadi pola standar semua
kartu Dashboard Hub lainnya) — sebelum Sesi 135 "cukup cepat ketutupan"
karena `renderDashboard()` selalu sinkron, jadi live-wiring-nya cuma
telat 1 frame. Sesi 135 membuat `renderDashboard()` DITUNDA lewat
`runDeferredOrNow()` saat Dashboard Hub yang aktif (kasus paling umum) —
kartu ini jadi kena tunda DUA KALI berturutan (nunggu `renderDashboard()`
dulu, baru nunggu live-wiring di dalamnya), jadi jeda "Menghitung..."-nya
makin terasa/lama.

### Diubah

- **`modules/dashboard-hub/dashboard-hub.js`** (`DashboardHub.render()`) —
  ditambahkan `if (typeof TanggaKeuangan !== 'undefined')
  TanggaKeuangan.render();` LANGSUNG di dalam fungsi ini (pola sama persis
  Hero/Summary/Analytics/Property/dst di atasnya), sehingga kartu ini
  selalu ikut ter-render di frame yang SAMA dengan kartu Dashboard Hub
  lain begitu halaman ini ditampilkan — tidak lagi bergantung pada timing
  `renderDashboard()`. Panggilan `TanggaKeuangan.render()` di live-wiring
  `renderDashboard()` (`modules/shared/modules-render.js`, ditambahkan S121)
  TIDAK dihapus — tetap dipertahankan utk skenario user tetap di Dashboard
  Hub lalu simpan data dari halaman lain (live-update), pola sama dgn
  DecisionCenterHome/UnifiedDashboardHome dkk.

### Tidak diubah

`TanggaKeuangan.compute()`/`render()` itu sendiri — 0 baris logic/rumus
disentuh. Sesi 135 (kondisi `_berandaAktifSaatUnlock`) tidak di-revert —
tetap berlaku utk mempercepat first-paint Dashboard Hub, cuma sekarang
kartu Tangga Keuangan tidak lagi ikut kena delay tambahan dari situ.

### Hasil verifikasi

```
node --check modules/dashboard-hub/dashboard-hub.js   # OK
node scripts/build.js kw136-gap-fix-tangga-keuangan-menghitung-macet
# ✅ Build selesai & lolos cek sintaks bundle (node --check), ?v=559
# index.html & app_production.html identik (0 diff)
# grep app-bundle-a.min.js: TanggaKeuangan.render() sekarang 2 titik
#   panggil (langsung di DashboardHub.render() + live-wiring), sesuai pola
#   standar kartu Dashboard Hub lain
```

**PENTING (masih berlaku dari sesi-sesi sebelumnya):** folder `tests/`
TETAP tidak ada di ZIP — regression `node --test` TIDAK BISA dijalankan.
**User WAJIB coba manual: buka app dari kondisi tertutup (cold start),
masuk PIN, dan cek kartu "Tangga Ternak Uang" langsung terisi (BUKAN lagi
"Menghitung...") begitu Dashboard Hub tampil** — ini skenario yang paling
kena dampak gap ini.

## Sesi 156d (2026-07-22) — Konsolidasi tab Car Notes: vehicle selector ke atas, gabung Alert/InsightFeed/Decision, Analytics & Fuel card collapsible

**Konteks:** tindak lanjut butir #2 catatan `docs/NEXT_SESSION.md` § S156b
("11 card AI/insight ditumpuk vertikal SEBELUM vehicle selector &
odometer"). User memilih 3 dari 4 saran yang tercatat di sana untuk
dikerjakan sesi ini (saran ke-4, gabung Fuel Briefing ke Fuel
Intelligence Card, SENGAJA belum dikerjakan — di luar scope sesi ini).

**Catatan gap dokumentasi:** entri kronologis `CHANGELOG.md` sebelum ini
berhenti di Sesi 136 — source code sudah berjalan sampai build
`kw156b-fuel-buttons-window-expose-fix-587` (`?v=588`) saat sesi ini
dimulai, gap Sesi 137-156b TIDAK di-backfill di sesi ini (di luar scope,
riwayatnya ada di `docs/NEXT_SESSION.md` § catatan sync tiap sesi).

### Ditambahkan

- **`modules/vehicle/vehicle-attention-presenter.js`** (BARU) —
  `VehicleAttentionPresenter.render()`, gabungan tampilan
  `VehicleAlertPanel` + `VehicleInsightFeed` + `VehicleDecisionPresenter`
  jadi SATU card ranked "🧭 Perlu Perhatian". 100% reuse
  `VehicleRecommendationEngine.recommendations()` ->
  `VehiclePriorityScoring.rank()` -> `VehicleActionRecommendation.
  withAction()` (persis alur `VehicleDecisionPresenter` lama — sumber ini
  sudah mencakup reminder overdue/due-soon + insight type 'warning',
  lihat komentar `_fromReminders()`/`_fromInsights()` di
  `vehicle-recommendation-engine.js`) + `VehicleAIHook.fleetSummary()`
  utk sisa insight type 'info'/'positive' yang sengaja dilewati
  `VehicleRecommendationEngine`. 0 rumus/skoring baru. Silent kalau
  kosong (pola sama panel lama).

### Diubah

- **`index.html`/`app_production.html`:**
  - Blok `.vehicle-select`/odometer/tombol "+ Kelola Kendaraan" dipindah
    ke paling atas `#page-carnotes` (setelah `#mobilInsightCard`, sebelum
    `#vehdashWrap`) — murni perubahan urutan DOM, 0 perubahan id/logic.
  - `#vehAlertWrap` + `#vehInsightFeedWrap` dihapus, `#vehDecisionWrap`
    (yang lama ada di bawah `#vehAutomationWrap`) dihapus & dipindah —
    ketiganya diganti 1 container baru `#vehAttentionWrap`/
    `#vehAttentionBody`, diisi `VehicleAttentionPresenter.render()`.
  - `#vehAnalyticsWrap`, `#fuelDashWrap`, `#fuelCompareWrap`,
    `#fuelTrendWrap` dijadikan collapsible (pola `card-collapse-toggle`/
    `card-collapse-body` yang sama persis `vehSpecCard`), default
    TERTUTUP (key: `vehAnalyticsCard`, `fuelDashCard`, `fuelCompareCard`,
    `fuelTrendCard`).
- **`modules/shared/modal-navigasi.js`** — `toggleCardCollapse()`/
  `applyOneCardCollapsePref()`/`applyCardCollapsePrefs()` di-extend
  dengan `CARD_COLLAPSE_DEFAULT_CLOSED` (array key yang defaultnya
  TERTUTUP kalau user belum pernah tap toggle-nya sama sekali/belum ada
  entry di `localStorage.cardCollapsePrefs`). Card di luar daftar ini
  perilakunya 0 berubah (tetap default terbuka). Preferensi user yang
  sudah tersimpan (baik true maupun false) tetap prioritas di atas
  default ini — tidak menimpa pilihan user.
- **`modules/shared/modules-render.js`** (`renderCnTab()`) — panggilan
  `VehicleAlertPanel.render()`/`VehicleInsightFeed.render()`/
  `VehicleDecisionPresenter.render()` (3 baris terpisah) diganti 1
  panggilan `VehicleAttentionPresenter.render()`. File lama
  (`vehicle-alert-panel.js`/`vehicle-insight-feed.js`/
  `vehicle-decision-presenter.js`) TIDAK dihapus (histori/rollback,
  0 test yang mereferensikannya) — cuma tidak lagi dipanggil dari sini.
- **`scripts/build.js`** — `modules/vehicle/vehicle-attention-presenter.js`
  didaftarkan di `GROUP_A`, tepat setelah
  `modules/vehicle/vehicle-decision-presenter.js`.

### Tidak diubah

0 rumus/skoring/engine BBM & kendaraan disentuh — sesi ini murni
presentasi (urutan DOM, konsolidasi 3 card jadi 1, default collapse).
`FuelBriefing`/`FuelIntelligenceCard` (saran ke-4 yang belum dikerjakan)
TIDAK disentuh.

### Hasil verifikasi

```
node --test tests/*.test.js
# tests 371 / pass 371 / fail 0   (sebelum & sesudah build, 0 regresi)

node scripts/build.js
# ✅ Build "kw156b-fuel-buttons-window-expose-fix-588" selesai & lolos
#    cek sintaks bundle (node --check), ?v=589
# index.html & app_production.html identik (0 diff, ditulis ulang
#    otomatis oleh build.js)
```

**ZIP:** `kw_release_sesi156c_car-notes-consolidation_v589.zip`

**Known Issue (masih berlaku dari sesi-sesi sebelumnya):** `npm run
lint`/esbuild tetap tidak bisa dijalankan (tanpa akses internet di
sandbox ini) — bundle hasil build TANPA minifikasi.

**Sengaja di luar scope sesi ini (next TODO):**
1. Saran ke-4 yang belum dikerjakan: gabung Fuel Briefing ke Fuel
   Intelligence Card (2 card sama-sama soal BBM kendaraan aktif).
2. Butir #1 catatan `docs/NEXT_SESSION.md` § S156b — audit menyeluruh
   pola `const Nama = {...}` + `data-action` tanpa expose `window` di
   seluruh project (belum tersentuh sesi ini).
