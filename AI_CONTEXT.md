# AI_CONTEXT.md — Konteks project (bootstrapped Sesi 000)

Sumber: `README.md`, `docs/PROJECT_STATE.md`, `docs/AI_SCOPE.md`,
`docs/LIFEOS_SCOPE.md`, `docs/FILE-MAP.md`, struktur `modules/*` hasil
scan repo langsung per Sesi 000 (2026-07-22).

## Apa aplikasi ini

Aplikasi Personal Operating System berbasis web (single-page,
local-first/offline-first — lihat `sw.js`/IndexedDB), Bahasa Indonesia,
mencakup domain: Keuangan (transaksi/anggaran/tagihan/piutang-utang/
pajak-zakat), Kendaraan (BBM/servis/pajak), Shop/Bisnis (kasir/etalase/
payroll/absensi), Aset & Kekayaan, Smart AI (rekomendasi/simulasi/
health check), Smart Logistics, dan LifeOS (Today/Goals/Projects/
Review/Knowledge — "personal operating layer" di atas semua domain
lain).

## Struktur tingkat tinggi

```
modules/
  shared/       — helper lintas-domain, render loop utama (modules-render.js),
                  storage/backup, keamanan, format
  ai/           — Smart AI (ai-core/ai-service/ai-decision-engine/chat)
  finance/      — Keuangan (transaksi, budget, tagihan, pajak, dst)
  business/     — Shop/Kasir/Payroll
  asset/        — Aset & Kekayaan
  vehicle/      — Kendaraan (servis, pajak, BBM, reminder)
  home/         — Hidup Seimbang, Refleksi & Selfcare, Renovasi
  cross/        — agregasi lintas-domain (finance+vehicle+home+LifeOS)
  dashboard-hub/— Dashboard Feature Hub (registry taksonomi + navigasi +
                  render sub-tab)
  self-reward/  — Reward Engine
lifeos/         — LifeOS (registry+adapters+ui+services+plugins+life-objects),
                  READ-ONLY terhadap D, storage sendiri (LifeOSStore)
tests/          — node:test, load source ASLI lewat vm (tests/helpers/loadSource.js)
scripts/        — build.js (bundler GROUP_A/GROUP_B -> app-bundle-a/b.min.js),
                  release.sh, rollback.sh
docs/           — dokumentasi historis lengkap (SESSION_RULES/PROJECT_STATE/
                  PRODUCT_DECISIONS/BATCH_PLAN/NEXT_SESSION/CHECKPOINT/dst)
.ai/            — workspace kerja AI (file ini & sekitarnya), bootstrapped
                  Sesi 000 dari docs/ di atas
```

## Dua track paralel (arsitektur permanen, JANGAN dicampur)

- **Smart AI & Smart Logistics** — scope: `docs/AI_SCOPE.md`. Source of
  truth detail: `IMPLEMENTATION_STATUS.md`/`ROADMAP.md`/`TODO.md`
  (root repo). Status per Sesi 51: **semua Tahap 1–8 100%.**
- **LifeOS** — scope: `docs/LIFEOS_SCOPE.md`. Source of truth:
  `docs/PROJECT_STATE.md` § LifeOS. Aturan arsitektur PERMANEN:
  LifeOS boleh MEMBACA `D` (lewat adapter) tapi TIDAK PERNAH menulis
  balik ke `D` ("zero-touch terhadap D"); AI boleh membaca LifeOS,
  LifeOS TIDAK boleh punya dependency balik ke `modules/ai/*`.

## Build & Test

- `node --test tests/*.test.js` — jalankan seluruh test. **Catatan
  penting**: ZIP kerja yang beredar SEJAK Sesi 138 hanya membawa
  subset `tests/*.test.js` yang tersedia (bukan full suite ribuan
  test yang disebut riwayat sesi-sesi lama di `docs/CHECKPOINT.md`).
  Jumlah test aktual = apa pun yang dilaporkan `AI_STATE.md` terkini,
  BUKAN angka riwayat lama.
- `node scripts/build.js <nama-build>` — build kedua bundle
  (`app-bundle-a.min.js` dari `GROUP_A`, `app-bundle-b.min.js` dari
  `GROUP_B`), sinkronkan `?v=` di `index.html`/`app_production.html`/
  `sw.js`, regenerasi `docs/FILE-MAP.md`. Sudah ada beberapa linter
  bawaan (mis. cek pola bug "u-dnone vs inline style.display", cek
  field user dirender tanpa `escapeHtml()`) — JANGAN dihapus/dilonggarkan.
- `esbuild` biasanya TIDAK tersedia di sandbox → bundle dibuat TANPA
  minifikasi (fallback otomatis, tetap valid).

## Dual Documentation (sengaja dipertahankan paralel)

Repo ini punya DUA sistem dokumentasi status sesi yang berjalan
BERSAMAAN sejak Sesi 000:

1. **`docs/*` (lama, per-sesi naratif)** — `docs/CHECKPOINT.md`
   (status granular sesi berjalan), `CHANGELOG.md`/`FILES-CHANGED.md`
   (riwayat newest-first / append), `docs/NEXT_SESSION.md` (kandidat
   sesi berikutnya). TETAP diupdate tiap sesi (kebiasaan lama, dibaca
   manusia/histori).
2. **`.ai/*` (baru, mesin-dulu)** — file ini & sekitarnya, dioptimalkan
   utk dibaca AI di AWAL sesi tanpa perlu audit ulang seluruh
   `docs/*`/`modules/*`.

Kalau ada isi FAKTUAL yang beda (mis. jumlah test/versi build), yang
BENAR adalah hasil verifikasi LANGSUNG (`node --test`/`node scripts/build.js`)
di sesi berjalan — bukan salah satu dokumen begitu saja. Update KEDUANYA
tiap sesi (lihat `AI_RULES.md` § SESSION WORKFLOW langkah 8).

## Baseline per Sesi 000 (2026-07-22, setelah Sesi 140 selesai)

Lihat `.ai/AI_STATE.md` utk angka terkini — jangan duplikasi di sini,
supaya tidak ada 2 sumber yang bisa basi berbeda.
