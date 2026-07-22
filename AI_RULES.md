# AI_RULES.md — Aturan kerja permanen (bootstrapped Sesi 000)

Sumber: `docs/SESSION_RULES.md` (source of truth asli, TIDAK diganti —
file ini murni salinan kerja utk workflow `.ai/*`, kalau ada
perbedaan `docs/SESSION_RULES.md` yang berlaku) + `docs/PRODUCT_DECISIONS.md`
§ "Umum — Larangan duplikasi" + protokol eksekusi sesi ini.

## Peran

Software Engineer yang MELANJUTKAN project existing:
- Jangan menjadi Architect / membuat desain baru.
- Jangan melakukan audit ulang seluruh project tiap sesi (state sudah
  ada di `AI_STATE.md`/`AI_TASK_QUEUE.md`).
- Gunakan project existing sebagai source of truth.

## Larangan mutlak

- Jangan tanya "mau dikerjakan apa" — ambil task pertama `STATUS=READY`
  di `AI_TASK_QUEUE.md`.
- Jangan audit ulang seluruh repository tiap sesi.
- Jangan redesign arsitektur / bikin roadmap baru.
- Jangan refactor besar / refactor kode yang tidak terkait task.
- Jangan duplicate: helper, function, storage, registry, adapter,
  event. Selalu reuse kode existing — kalau ada fungsi existing yang
  bisa dipakai ulang, WAJIB reuse.
- Jangan mengubah `FEATURE_REGISTRY` (`dashboard-hub-registry.js`)
  kecuali task eksplisit memintanya.
- Jangan mengubah Build System (`scripts/build.js`) kecuali task
  eksplisit memintanya.
- Jangan membuat placeholder/TODO/mock data di kode produksi.
- Jangan menebak fitur berikutnya — kalau `AI_TASK_QUEUE.md` kosong
  atau semua task `STATUS≠READY`, STOP (lihat AI_TASK_QUEUE.md §
  Fail-safe).
- Selalu backward compatible.
- Kalau bug ditemukan DI DALAM scope task yang sedang dikerjakan:
  perbaiki langsung. Kalau DI LUAR scope: catat di `AI_PROGRESS.md`
  sbg temuan, JANGAN diperbaiki di sesi yang sama (1 task = 1 sesi).

## SESSION WORKFLOW (urutan kerja wajib, tidak berubah dari SESSION_RULES.md)

1. Baca `.ai/AI_STATE.md` + `.ai/AI_TASK_QUEUE.md` + `.ai/AI_RULES.md`
   (file ini) + `.ai/AI_CONTEXT.md`.
2. Ambil task pertama `STATUS=READY` di `AI_TASK_QUEUE.md`.
3. Implementasikan HANYA task itu.
4. Jalankan test (`node --test tests/*.test.js`).
5. Jalankan build (`node scripts/build.js <nama-build>`).
6. Setelah build sukses, buat ZIP.
7. Tampilkan link download ZIP.
8. Update `.ai/AI_STATE.md`, `.ai/AI_TASK_QUEUE.md` (tandai task
   `STATUS=DONE`), `.ai/AI_PROGRESS.md` (+1 entry), dan dokumentasi
   lama yang relevan (`docs/CHECKPOINT.md`/`CHANGELOG.md`/
   `FILES-CHANGED.md`/`docs/NEXT_SESSION.md` — dua sistem dokumentasi
   ini SENGAJA dipertahankan paralel, lihat `AI_CONTEXT.md` § Dual
   Documentation).
9. STOP.

## RECOVERY MODE

Jika sesi terputus karena kuota/error:
- Jangan mengulang analisis yang sudah tercatat di `AI_PROGRESS.md`.
- Jangan mengulang implementasi yang sudah `STATUS=DONE`.
- Jangan mengulang test/build kalau tidak ada perubahan kode sejak
  hasil terakhir yang tercatat valid.
- Lanjutkan dari `AI_STATE.md` § Current Step.

## Otoritas dokumen (urutan prioritas)

1. `.ai/AI_RULES.md` (file ini)
2. `.ai/AI_STATE.md`
3. `.ai/AI_TASK_QUEUE.md`
4. `.ai/AI_CONTEXT.md`
5. `.ai/AI_DECISIONS.md`
6. Source code existing

`docs/SESSION_RULES.md`/`docs/PRODUCT_DECISIONS.md`/`docs/PROJECT_STATE.md`
dkk (root `docs/`) TETAP ada sbg dokumentasi historis lengkap
(pre-Sesi-000) — TIDAK dihapus, TIDAK dianggap otoritas lebih rendah
begitu ada konflik isi murni FAKTUAL (mis. jumlah test/versi build),
tapi utk KEPUTUSAN ALUR KERJA sesi berjalan, `.ai/*` yang dipakai.
