# AI_DECISIONS.md — Keputusan produk final (bootstrapped Sesi 000)

Ringkasan kerja dari `docs/PRODUCT_DECISIONS.md` (487 baris, dokumen
lengkap TETAP di sana sbg sumber detail penuh — file ini murni index
cepat supaya tidak perlu baca ulang semuanya tiap sesi). Kalau ada
detail yang dibutuhkan lebih dari ringkasan di bawah, buka
`docs/PRODUCT_DECISIONS.md` langsung.

## Keputusan FINAL (boleh langsung diimplementasikan tanpa tanya ulang)

- **Navigasi Smart AI**: reuse `FEATURE_REGISTRY`/`showPage()`
  existing, TIDAK ada router/menu AI baru.
- **`dailyBriefing()` struktur 5 bagian**: Finance Summary
  (`financialSummary`) / Delivery Summary (`deliverySummary`) /
  Reminder Summary (`todayAdapterList()` dari LifeOS, diangkat apa
  adanya) / Target Summary (`goalAdapterList()` dari LifeOS, diangkat
  apa adanya) / Recommendation Summary (`recommendations`). Kelimanya
  SUDAH terimplementasi.
- **Reminder Priority**: urutan domain `Finance → Vehicle → Shop →
  Asset → Goal → LifeOS`.
- **LifeOS zero-touch terhadap `D`**: LifeOS boleh MEMBACA `D` lewat
  adapter, TIDAK PERNAH menulis balik. AI boleh membaca LifeOS, LifeOS
  TIDAK boleh dependency balik ke `modules/ai/*`. Aturan arsitektur
  PERMANEN — lihat `AI_CONTEXT.md`.
- **Goal source `pensiun`/`fi`/`debt`** (LifeOS, Sesi 49) — final,
  sudah diimplementasikan 6/6.
- **Life Object `sourceRef`** (Sesi 57) & **CRUD Service Layer** (Sesi
  58) & **UI** (Sesi 59) — final, sudah diimplementasikan, 7/7 domain
  sourceRef terdaftar (finance/financeAccount/financeCategory/goal/
  knowledge/project/review).
- **Finance Domain Foundation/Builder Filter/Finance Account & Category**
  (Batch 6, Sesi 71–73) — final, sudah diimplementasikan.
- **Finance Dashboard & AI Hook Foundation** (Sesi 75) — final, sudah
  diimplementasikan (`FinanceDashboard.getAIHook()` ada, TAPI wiring
  nyata ke `ai-chat.js` BELUM — lihat `AI_TASK_QUEUE.md` #1).
- **Larangan duplikasi (semua track, PERMANEN)**: tidak boleh duplicate
  helper/function/storage/registry/adapter/event — selalu reuse kode
  existing.

## Belum ada keputusan / masih terbuka (JANGAN ditebak)

Daftar lengkap ada di `AI_TASK_QUEUE.md` (semua `STATUS=BLOCKED`):
wiring AI Hook Vehicle/Finance ke briefing, chart visual trend
kendaraan, wiring Decision Engine ke ai-chat, Insight Priority Scoring
lanjutan, Plugin Marketplace, kind Life Object baru selain
generic/ref.

## Status Smart AI & Smart Logistics

Semua Tahap 1–8 **100%** sejak Sesi 51 (lihat `IMPLEMENTATION_STATUS.md`
root repo utk detail per-tahap). Tidak ada gap implementasi tersisa di
track ini — hanya item "lanjutan opsional" di atas yang butuh
keputusan produk baru.

## Catatan pola berulang (utk dihindari sesi mendatang)

`docs/PRODUCT_DECISIONS.md`/riwayat sesi mencatat BERKALI-KALI insiden
"ringkasan persentase/status stale vs checklist/kode yang sudah
lengkap" (Sesi 39/41/44/46/47/51, dst). Kalau audit menemukan
dokumentasi tidak sinkron dgn kode, itu BUKAN otomatis berarti ada
kerja implementasi baru — verifikasi dulu ke kode/test langsung
sebelum menyimpulkan ada gap nyata.
