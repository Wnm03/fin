# ROADMAP-v1.1.md — Backlog Versi Berikutnya

Backlog ini disusun dari seluruh temuan `FINAL-QA.md` (Tahap 8) dan
carry-over rekomendasi Tahap 6–7 yang tercatat di `KNOWN-ISSUES.md`.
Dikelompokkan berdasarkan prioritas dan jenis perubahan yang dibutuhkan.

Item yang **membutuhkan perubahan JavaScript** ditandai 🔴 dan seluruhnya
masuk kategori ini sesuai instruksi — karena versi v1.0 (Tahap 1–8)
sengaja dibatasi hanya CSS/HTML/Markdown tanpa menyentuh JS.

---

## High Priority

Isu yang berdampak langsung ke pengalaman pengguna atau aksesibilitas.

1. **🟡 Perbaiki kontras `--text3` di 10 tema warna** (accessibility,
   WCAG AA). Saat ini 2.45–3.8:1 terhadap `--bg`/`--surface2` di tema
   yang diuji, target ≥4.5:1 untuk teks normal. Butuh review visual
   per tema agar tetap harmonis dengan palet masing-masing.
   *Sumber: `KNOWN-ISSUES.md` §1.1.*

2. ~~🔴 Exit/closing animation untuk overlay & bottom sheet.~~ **✅
   Selesai Tahap 10** — lihat `MODAL-EXIT-ANIMATION.md`. Diimplementasi
   di `closeModal()` (`modal-navigasi.js`, via `animationend` +
   fallback `setTimeout`) & `styles.css` (`overlayOut`/`slideDown`),
   bukan di `modals.js` (file itu isinya cuma `MODAL_HTML[]` string,
   logika buka/tutup modal sudah dipindah ke `modal-navigasi.js` sejak
   sebelum tahap ini — lihat komentar header file tsb).
   *Sumber: `KNOWN-ISSUES.md` §5.1.*

3. **🔴 Ganti emoji `icon:` di `dashboard-hub-registry.js` (FEATURE_REGISTRY)
   dan file data lain dengan SVG konsisten**, menyamakan gaya ikon di
   seluruh aplikasi (Tahap 6 sudah menyelesaikan audit & satu
   perbaikan aman di HTML; sisanya di JavaScript).
   *Sumber: `KNOWN-ISSUES.md` §4.1.*

---

## Medium Priority

Konsistensi & polish yang meningkatkan kualitas kode tanpa mengubah
perilaku yang terlihat pengguna.

4. **🟢 Migrasikan literal `border-radius` → token `var(--r-*)`** yang
   sudah ada (16px→`--r-2xl`, 10px→`--r-md`, 20px→`--r-pill`,
   12px→`--r-lg`). Value-preserving, pola sama seperti 71 deklarasi
   yang sudah dimigrasi di Tahap 1.
   *Sumber: `KNOWN-ISSUES.md` §2.1.*

5. **🟢 Definisikan & pakai token `--shadow-xs…xl`** untuk 17 nilai
   `box-shadow` literal. Skala referensi sudah pernah disiapkan di
   Tahap 1, tinggal diaplikasikan ke komponen.
   *Sumber: `KNOWN-ISSUES.md` §2.2.*

6. **🟢 Konsolidasikan durasi `transition` non-token** ke skala
   `--dur-fast/base/moderate/slow` yang sudah ada (saat ini ≥15
   variasi durasi/easing tersebar).
   *Sumber: `KNOWN-ISSUES.md` §2.3.*

7. **🟢 Perbesar area sentuh `.chip-btn`/`.qs-btn`** mendekati 44×44px
   (tambah padding vertikal ±4–6px) tanpa mengubah ukuran visual
   ikon/teks di dalamnya.
   *Sumber: `KNOWN-ISSUES.md` §1.2.*

8. **🔴 Ripple berbasis koordinat sentuh asli** (bukan pulsa dari
   tengah) — butuh JS untuk membaca posisi klik/tap dan set custom
   property `--x`/`--y` pada elemen ripple.
   *Sumber: `KNOWN-ISSUES.md` §5.2.*

---

## Low Priority

Nice-to-have, dampak kecil terhadap pengguna akhir.

9. **🟢 Migrasikan literal `font-size` kecil** (11px, 12px, 13px,
   8.5px) ke token `--fs-*` terdekat yang sudah ada.
   *Sumber: `KNOWN-ISSUES.md` §2.4.*

10. **🟢 Tambahkan `max-width` container konsisten** untuk seluruh
    `.page` (bukan hanya `#page-dashboard-hub`) di layar ≥1024px,
    supaya kartu/list tidak melebar penuh di desktop.
    *Sumber: `KNOWN-ISSUES.md` §3.1.*

11. **🟢 Tambahkan hover/elevation pada tap-target sekunder** lain
    (`.stat-box.clickable`, `.budget-item.clickable`, dll.) yang
    sengaja dilewati di Tahap 7 supaya perubahan tetap minimal.
    *Sumber: `KNOWN-ISSUES.md` §5.3.*

---

## Ringkasan

| Prioritas | Jumlah item | 🟢 CSS-only | 🟡 Token warna | 🔴 Butuh JS |
|---|---|---|---|---|
| High | 3 | 0 | 1 | 2 |
| Medium | 5 | 4 | 0 | 1 |
| Low | 3 | 3 | 0 | 0 |
| **Total** | **11** | **7** | **1** | **3** |

**Catatan implementasi**: seluruh item 🟢/🟡 dapat dikerjakan sebagai
"Tahap 9" mengikuti pola kerja Tahap 1–8 (baseline tetap, perubahan
minimal per iterasi, `node --test` wajib 1228/1228 PASS sebelum &
sesudah). Item 🔴 membutuhkan sesi terpisah yang secara eksplisit
mengizinkan perubahan JavaScript, di luar mandat "tanpa mengubah kode"
yang berlaku untuk v1.0.
