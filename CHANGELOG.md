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
