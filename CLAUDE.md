# Instruksi untuk Claude Code — Repo Keluarga W

Repo ini adalah PWA client-side (tanpa backend) untuk manajemen keuangan,
zakat, bisnis, dan kendaraan keluarga. Source dipecah per fitur, lalu
digabung jadi `app-bundle-a.min.js` / `app-bundle-b.min.js` oleh `build.js`.

## Perintah penting
- `npm install` — sekali di awal (untuk eslint/esbuild).
- `npm run lint` — ESLint (`eslint.config.js`).
- `npm test` — `node --test tests/*.test.js`, unit test asli (bukan mock).
- `npm run build` — jalankan `build.js`, hasilkan bundle.
- `npm run check` — lint && test && build, jalankan semua sekaligus.

## Tugas default kalau diminta "perbaiki bug" / "self-test" / "fix sampai hijau"
1. Jalankan `npm run check`.
2. Kalau ada yang gagal:
   - Baca error paling atas dulu (biasanya akar masalah).
   - Untuk error test: baca pesan `_selfTestAssert` di `tests/*.test.js`
     (sudah deskriptif dalam Bahasa Indonesia), lalu cari fungsi terkait
     di **file sumber**, BUKAN di `app-bundle-a.min.js` / `app-bundle-b.min.js`
     — file itu hasil build otomatis dan akan tertimpa lagi tiap build.
   - Untuk error lint: ikuti aturan `eslint.config.js`.
   - Untuk error build: cek `build.js` dan urutan GROUP_A/GROUP_B di komentar
     paling atas tiap file `features-*.js` — banyak modul saling referensi
     jadi urutan load penting, jangan diubah sembarangan.
3. Buat perubahan sekecil mungkin yang menyelesaikan akar masalah.
4. Jalankan lagi `npm run check`, ulangi sampai semua pass, 0 fail, build sukses.
5. Kalau perbaikan yang "benar" butuh keputusan produk (bukan sekadar bug
   teknis, misal aturan pajak/zakat berubah) — STOP dan tanya dulu, jangan menebak.
6. Di akhir, ringkas: apa yang rusak, kenapa, dan file apa saja yang diubah.

## Yang tidak boleh disentuh langsung
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — hasil build, edit di source lalu build ulang.
- Urutan file di `build.js` (GROUP_A/GROUP_B) — hanya diubah kalau memang ada alasan struktural yang jelas.

## Cara resmi bikin zip rilis/patch — WAJIB pakai `npm run release`
JANGAN pernah bikin zip rilis dengan cara select-file-manual/copy folder kerja.
Dua insiden pernah terjadi persis karena itu:
- Sebuah paket patch pernah dikirim tanpa `app-bundle-a.min.js` & belasan file
  source lain (folder kerja ≠ apa yg sudah di-commit).
- Sebuah paket patch lain ("collapse-fixed") ternyata dibuat dari branch/commit
  LAMA yg belum di-rebase ke `main` terbaru → 2 bugfix yg sudah pernah selesai
  (chicken-egg OCR di `scan-ocr.js`, false-positive nama aset Bibit) ke-revert
  tanpa disadari.

Jalankan `npm run release` (= `scripts/release.sh`) setiap kali mau membuat zip
utk dikirim keluar. Script ini otomatis:
1. Menolak jalan kalau branch bukan `main` atau ketinggalan dari `origin/main`
   (mencegah patch dari base basi seperti insiden ke-2 di atas).
2. Menjalankan `npm run check` penuh — build akan berhenti sendiri kalau ada
   regresi ke pola bug yg sudah pernah ada guard-nya (lihat lint-lint di
   `build.js`: u-dnone/style.display, escapeHtml, chicken-egg Tesseract, dst).
3. Meng-commit otomatis perubahan versi/bundle hasil build, lalu bikin zip
   lewat `git archive` dari commit itu — jadi isi zip dijamin = isi commit,
   tidak mungkin ada file kerja lokal yg ketinggalan/nyelip.

Kalau menemukan kelas bug yang sudah pernah terjadi & sempat ke-revert/muncul
lagi (seperti insiden chicken-egg OCR di atas), pertimbangkan menambah lint
guard baru di `build.js` (pola: `lintXxx()` yang dipanggil di `main()` dan
`process.exit(1)` kalau ketemu) supaya build gagal keras kalau bug itu balik
lagi — bukan cuma mengandalkan komentar `// BUGFIX:` yang bisa hilang saat di-diff/revert.

## Upload dari HP (tanpa CLI) — WAJIB kalau tidak pakai `npm run release`

Kalau update dikirim ke GitHub lewat upload manual di HP (GitHub mobile
app/web, tanpa akses terminal/git), `npm run release` tidak bisa dijalankan.
Supaya 2 insiden lama (file source ketinggalan, patch dari base basi) tidak
terulang lewat jalur ini, WAJIB ikuti:

1. **Selalu lewat branch baru + Pull Request, jangan langsung upload ke
   `main`.** Buka PR, biarkan CI (`npm run check` dari `.github/workflows/ci.yml`)
   jalan otomatis — ini pengganti `npm run release` yang tidak bisa jalan di HP.
2. **Jangan merge PR sebelum status check CI hijau.** Jangan tergesa-gesa
   merge dari HP sebelum centang hijau muncul di PR.
3. **Cocokkan jumlah & nama file sebelum upload** dengan isi commit terakhir
   di `kw/` (terutama `*.js` di root, bukan di `backups/`/`archive/`) — supaya
   file yang "ketinggalan" ketahuan sebelum upload, bukan sesudah.
4. **Jangan upload `kw/backups/` atau `kw/archive/` secara manual.** Upload
   lewat GitHub app tidak otomatis skip file yang di-gitignore seperti
   `git add` — file di dua folder ini harus dikeluarkan manual dari daftar
   yang diupload/ditimpa.
5. **Jangan edit `app-bundle-a.min.js` / `app-bundle-b.min.js` langsung** di
   editor GitHub mobile. File ini hasil build otomatis — edit source-nya,
   biarkan CI/`build.js` yang generate ulang bundle.
6. **Tulis di pesan commit: asal upload & versi/build dasar**, misal
   `"upload dari Claude mobile, base build #173"` — supaya kalau ternyata
   base-nya stale, gampang dilacak (persis insiden ke-2 di atas).
7. **Setelah merge, cek `FILE-MAP.md` ikut ter-update otomatis oleh CI** —
   ini bukti build step benar-benar jalan, bukan cuma file mentah ketimpa
   manual.

## CI & branch protection
`.github/workflows/ci.yml` menjalankan `npm run check` (termasuk
`--require-minify`, lihat catatan esbuild di bawah) di setiap push & PR.
Supaya ini benar-benar jadi gerbang wajib (bukan sekadar informatif), aktifkan
di GitHub: Settings → Branches → Branch protection rule utk `main` → centang
"Require status checks to pass before merging" → pilih job `check` dari
workflow ini. Tanpa ini, PR/patch dari branch basi tetap bisa di-merge/dikirim
walau CI merah.

## Catatan esbuild (minifikasi)
`build.js` fallback otomatis ke bundle TANPA minifikasi kalau `esbuild` tidak
terpasang — aman utk dev sehari-hari, tapi BAHAYA kalau kejadian diam-diam di
CI/rilis produksi (`optionalDependencies` esbuild bisa gagal pasang tanpa bikin
`npm install` exit non-zero). Karena itu `ci.yml` & `scripts/release.sh` sama-sama
memanggil build dengan flag `--require-minify` (atau `REQUIRE_MINIFY=1`) —
build akan GAGAL keras kalau esbuild ternyata tidak terpasang, daripada diam-diam
mengirim bundle besar tanpa ada yang sadar.

## Catatan kerja — 2026-07-10/11: review & test dasar Car Notes (BBM/Servis)

Konteks: diminta review kode fitur Car Notes (Catatan BBM & Servis di
`features-budget-laporan-carnotes-pelanggan.js` + helper terkait di
`transaksi.js` / `features-tukang-kendaraan-storage.js`). Semua check
(`npm run check`) sudah hijau sebelum & sesudah kerjaan ini — TIDAK ada bug
yang diperbaiki di sesi ini, murni menambah test yang sebelumnya nol utk
area ini.

**Temuan review (status per 2026-07-11):**
1. ✅ SELESAI (lihat catatan kerja 2026-07-11 di bawah) — Catatan BBM yang
   "yatim" (kehilangan `txLinkId`) sekarang dibuatkan ulang transaksinya
   & di-sambung lagi saat diedit, tidak silently unsynced lagi.
2. ✅ SELESAI (lihat catatan kerja 2026-07-11 bagian ke-2 di bawah) —
   `resolveVehicleTxCategory` sekarang pakai link stabil `linkedVehicleId`
   di kategori, bukan cocok-nama string doang, jadi tidak lagi fragile
   kalau kategorinya di-rename (atau nanti kendaraannya, kalau suatu saat
   ada fitur rename kendaraan — saat ini belum ada UI utk itu).

**Test yang ditambahkan (0 → 48 test khusus Car Notes, total suite 103 → 151):**
- `tests/bbm-log.test.js` — `recordBbmLog()` (transaksi.js): catatan baru,
  auto-init `D.bbmLogs`, harga auto-hitung dari cost/liter vs harga manual,
  edit di tempat (tidak dobel entry), `txLinkId` tidak ikut ketimpa saat
  edit, fallback `vehicleId` lama, `existingBbmId` yang tidak ketemu.
- `tests/bbm-renderlist.test.js` — `BBM.renderList()`: total liter/biaya
  terfilter per kendaraan & rentang tanggal, rata-rata km/L (kasus normal
  ≥2 isi-penuh & fallback <2 isi-penuh), badge km/L per baris, empty state.
- `tests/servis-calc.test.js` — fungsi pengingat servis
  (`servisLogMatchesCat`, `getEffectiveIntervalKm`, `hasIntervalOverride`,
  `getLastServiceKm`, `estimateKmPerDay`, `estimateServiceDateISO`) di
  `features-tukang-kendaraan-storage.js`; `Servis.applyStockUsage` /
  `Servis.revertStockUsage` (pemakaian & pengembalian stok sparepart,
  termasuk jalur konfirmasi saat stok kurang); dan `Servis._saveInner`
  penuh (catatan baru vs edit, kategori pengingat cocok/baru/nama-kendaraan,
  sinkron interval, sinkron transaksi Keuangan, tukar part yg dipakai saat
  edit, pembatalan simpan kalau user batal konfirmasi stok kurang).

Sisa area Car Notes yg masih belum ada test: `BBM.openModal`/`Servis.openModal`
(prefill form saat edit — murni DOM-write, nilai gunanya lebih rendah drpd
yg sudah dites) dan bagian "Jalan"/Torsi baut kalau ada logikanya sendiri
(belum dicek).

Semua test baru pakai `loadSource()`/`extractFunction()` yang sudah ada di
`tests/helpers/` (load file source ASLI, bukan re-implementasi logic) —
lihat catatan lengkap caranya di `tests/helpers/loadSource.js`.

## Catatan kerja — 2026-07-11: fix temuan #1 (BBM "yatim" tidak tersinkron ulang saat diedit)

Konteks: mengerjakan temuan #1 dari review sesi sebelumnya (lihat di atas).
Sebelum fix, `npm run check` (test+build; lint tidak bisa dijalankan di
sandbox ini krn tidak ada akses internet utk `npm install`) sudah hijau —
bug ini murni belum ke-cover test, bukan regresi yang kelihatan dari CI.

**Akar masalah** (`BBM._saveInner` di
`features-budget-laporan-carnotes-pelanggan.js`): saat edit, `txId` diambil
dari `existing.txLinkId||null`. Kalau catatan BBM kehilangan `txLinkId`
(mis. transaksi terkaitnya kehapus manual di luar alur normal, atau data
lama sebelum field ini ada), `txId` jatuh ke `null` → cabang
`if(txId){...update tx...}` dilewati begitu saja → tidak ada transaksi baru
dibuat, catatan tetap "yatim" selamanya walau berkali-kali diedit, tanpa
pesan error apapun ke user.

**Fix**: tambah deteksi `wasOrphan = isEdit && !existing.txLinkId`. Kalau
`wasOrphan`, generate `txId` baru (`uid()`) dan buat transaksi baru persis
seperti alur catatan baru (push ke `D.transactions`, kategori dari
`resolveVehicleTxCategory(veh)`, subcategory `'Bensin'`), lalu sambung lagi
`D.bbmLogs[..].txLinkId` ke `txId` yang baru itu — krn `recordBbmLog()`
(transaksi.js) SENGAJA tidak menyentuh `txLinkId` saat edit (lihat test
`recordBbmLog — edit TIDAK mengubah txLinkId...` di `bbm-log.test.js`),
jadi penyambungan ulang ini harus terjadi di `_saveInner`, bukan di
`recordBbmLog`. Toast dibedakan (`"...& disinkron ulang ke Keuangan"`) biar
user sadar ada transaksi baru yang otomatis dibuat. Alur edit normal
(`txLinkId` sudah ada) tidak berubah sama sekali.

**Test baru**: `tests/bbm-saveinner.test.js` (0 → 5 test, total suite
151 → 156) — sebelumnya `BBM._saveInner` belum ada test sama sekali (beda
dgn `recordBbmLog` yang sudah dites di `bbm-log.test.js`). Cakupan: tolak
simpan kalau KM/liter/biaya kosong, catatan baru (log+transaksi dibuat,
`txLinkId` tersambung), edit normal (update di tempat, tidak dobel
transaksi), **edit catatan yatim (kasus bugfix ini — transaksi baru
dibuat & `txLinkId` tersambung ulang)**, dan `editId` yang tidak ketemu di
`D.bbmLogs`. Pola test: `createFakeDocument` dari `tests/helpers/fakeDom.js`
+ stub `recordBbmLog` lokal di file test (implementasi disalin persis dari
`transaksi.js`, krn fungsi itu di file lain) — sama seperti pola
`Servis._saveInner` di `servis-calc.test.js`.

`npm test` & `npm run build` sudah dicek hijau (156/156 pass, build sukses)
setelah perubahan ini. `npm run lint` TIDAK bisa dijalankan di sesi ini krn
sandbox tanpa akses internet (`npm install` gagal 403) — tolong jalankan
`npm run check` penuh (atau minimal `npm run lint`) sebelum merge/release
utk memastikan tidak ada pelanggaran `eslint.config.js` dari perubahan ini.

Temuan #2 (`resolveVehicleTxCategory` fragile thd rename kendaraan) masih
belum dikerjakan — lihat catatan status di atas.

## Catatan kerja — 2026-07-11 (bagian ke-2): fix temuan #2 (kategori kendaraan fragile thd rename)

**Klarifikasi penting sebelum fix**: dicek dulu apakah "rename kendaraan"
itu nyata bisa terjadi dari UI — ternyata SAAT INI tidak ada fitur rename
nama kendaraan sama sekali (`features-tukang-kendaraan-storage.js` cuma
punya `saveVehicle` (tambah baru), `editVehicleInterval` (cuma interval
servis, bukan nama), dan `delVehicle`). Jadi jalur bug yang BENAR-BENAR
bisa kejadian sekarang bukan "kendaraan di-rename", tapi **kategorinya**
di-rename lewat menu Kategori (`kategori.js:saveCat`) — fitur itu SUDAH ada
dan sengaja menyesuaikan transaksi LAMA ke nama kategori baru
(`D.transactions.forEach(t=>{if(t.category===oldName)t.category=name})`),
tapi tidak tahu-menahu soal `resolveVehicleTxCategory` yang nyari kategori
kendaraan lewat cocok-nama-persis. Akibatnya: user rename kategori
"Vario 125" jadi "Motor Harian" (murni alasan estetika di Keuangan) →
transaksi LAMA ikut ganti nama (benar), tapi catatan BBM/servis
BERIKUTNYA utk kendaraan itu tidak nemu lagi kategori itu → jatuh diam-diam
ke kategori "Transport" umum, tercampur dgn kendaraan lain, TANPA pesan
error apapun ke user. Ini bug teknis konkret (bukan keputusan produk soal
aturan pajak/zakat), jadi dikerjakan langsung tanpa nanya dulu — TAPI kalau
suatu saat mau nambah fitur rename kendaraan, itu tetap bisa dipakai lewat
mekanisme yang sama (lihat di bawah), tidak perlu perubahan lagi.

**Fix** (`resolveVehicleTxCategory` di `transaksi.js`): kategori kendaraan
sekarang disimpan pakai field baru `linkedVehicleId` begitu ketemu/dibuat
pertama kali (lewat cocok nama, sama seperti sebelumnya). Urutan pencarian
kategori jadi: (1) cari dulu via `c.linkedVehicleId===vehicle.id` — stabil,
tidak peduli nama kategori berubah; (2) kalau belum ada link (data lama/
pertama kali), fallback ke cocok-nama-persis seperti sebelumnya, LALU
langsung di-stamp `linkedVehicleId`-nya biar next call pakai jalur (1); (3)
kalau tetap tidak ketemu, fallback ke kategori "Transport" bersama (TIDAK
di-stamp link, krn ini kategori bersama utk semua kendaraan yg belum py
kategori sendiri, bukan punya 1 kendaraan tertentu). `kategori.js:saveCat`
tidak perlu diubah — field `linkedVehicleId` otomatis ikut kepertahankan
krn baris itu sudah pakai spread `{...D.categories[type][catEditIdx],
name,emoji}`.

**Test baru**: `tests/vehicle-tx-category.test.js` (0 → 6 test, total suite
156 → 162) — sebelumnya `resolveVehicleTxCategory` belum ada test sama
sekali. Cakupan: belum ada kategori sama sekali (fallback Transport, TIDAK
di-link), kategori cocok nama & ke-link, **kategori sudah di-link lalu
NAMANYA diubah => tetap ketemu via link (kasus bugfix ini)**, 2 kendaraan
beda tidak saling ke-link, kendaraan tanpa kategori khusus tetap fallback
Transport bersama, dan subs (Bensin/Servis & Oli/Pajak) tidak dobel kalau
dipanggil berkali-kali. (Catatan teknis: `Array.from(...)` dipakai sebelum
`assert.deepEqual` pada array yg berasal dari dalam vm sandbox, krn array
lintas-realm bikin `deepEqual`/`deepStrictEqual` gagal walau isinya sama
persis — pola yg sama dipakai di `fi-calc.test.js`.)

`npm test` & `npm run build` sudah dicek hijau (162/162 pass, build
sukses) setelah perubahan ini. `npm run lint` TIDAK bisa dijalankan di
sesi ini krn sandbox tanpa akses internet (`npm install` gagal 403) —
tolong jalankan `npm run check` penuh sebelum merge/release.

## Catatan kerja — 2026-07-11 (bagian ke-3): fix sinkronisasi BBM ↔ Transaksi ↔ Car Notes

Konteks: mengerjakan item "BELUM DIKERJAKAN" dari `CATATAN-CEK-CLAUDE.md` —
"Sinkronisasi BBM ↔ Transaksi ↔ Car Notes: belum diuji ulang secara
otomatis". Ini arah SEBALIKNYA dari temuan #1 (yang itu: edit dari sisi
Car Notes/`BBM._saveInner` → Keuangan; ini: edit dari sisi Keuangan/form
Transaksi → Car Notes).

**Akar masalah** (`_saveTxInner` di `transaksi.js`): saat edit transaksi
yang sudah tertaut ke catatan BBM (`existingTx.bbmLinkId`), sinkronisasi ke
`D.bbmLogs` HANYA terjadi lewat `applyTxBbmFromTx()`, dan fungsi itu
early-return total kalau checkbox "Sinkron ke Catatan Mobil" (`txSyncBbm`)
tidak tercentang atau panel BBM disembunyikan (mis. krn kategori transaksi
diganti keluar dari BBM saat edit). Akibatnya: user ubah jumlah/tanggal
transaksi, tapi checkbox itu kebetulan mati → `D.bbmLogs` (dipakai Car
Notes) TIDAK ikut ter-update, jadi beda nilai dari `D.transactions`
(dipakai Keuangan) walau `bbmLinkId` masih menghubungkan keduanya —
silent desync, ketauan cuma kalau user buka Car Notes & Keuangan
berdampingan. Ini INKONSISTEN dgn link sejenis: `servisLinkId` (baris
tepat di atasnya) SELALU sinkron field dasar (cost/date/accountId) TANPA
syarat, tidak digantung checkbox apapun — jadi bukan keputusan produk
baru, cuma menyamakan BBM dgn pola yang sudah dipakai utk Servis.

**Fix**: tambah blok sinkron TANPA SYARAT tepat setelah blok `servisLinkId`
yang sudah ada — kalau `existingTx.bbmLinkId` ada, field dasar
(`cost`/`date`/`accountId`) di `D.bbmLogs` yang bersangkutan selalu
di-`Object.assign` mengikuti transaksi, TERLEPAS dari checkbox. Checkbox
`txSyncBbm` tetap seperti semula — cuma ngatur field DETAIL BBM
(km/liter/harga/spbu/fullTank/kendaraan) lewat `applyTxBbmFromTx()` yang
tetap jalan setelahnya (kalau checkbox nyala, field detail ikut sinkron
juga di atas field dasar; kalau mati, field detail dibiarkan apa adanya).

**Test baru**: `tests/tx-bbm-sync.test.js` (0 → 3 test, total suite
162 → 165) — sebelumnya `_saveTxInner`/`saveTx` (fungsi utama form
Transaksi Keuangan) belum ada test otomatis SAMA SEKALI. Cakupan: **edit
transaksi ber-`bbmLinkId` dgn checkbox MATI → field dasar BBM tetap ikut
sinkron, field detail TIDAK disentuh (kasus bugfix ini)**; edit dgn
checkbox NYALA → field dasar & detail dua2nya sinkron (perilaku lama,
tetap jalan); dan edit transaksi tanpa `bbmLinkId` → `D.bbmLogs` sama
sekali tidak disentuh. Cakupan sengaja dibatasi ke jalur "tunai" (bukan
cicilan/langganan/stok/cobek) biar fokus & jelas — banyak dependency
lintas-file (`WorthIt`, `SewaKios`, `Tukang`, `Renov`,
`applyTxCobekStockFromTx`, dst) di-stub sebagai no-op, BUKAN test
integrasi lintas file sungguhan.

Sisa item `CATATAN-CEK-CLAUDE.md` yg masih belum dikerjakan: evaluasi
split `transaksi.js` (butuh keputusan desain besar, sengaja belum
dieksekusi) & Logic Torsi Sparepart (belum ada test otomatis).

`npm test` & `npm run build` sudah dicek hijau (165/165 pass, build
sukses) setelah perubahan ini. `npm run lint` TIDAK bisa dijalankan di
sesi ini krn sandbox tanpa akses internet — tolong jalankan `npm run
check` penuh sebelum merge/release.

## Catatan kerja — 2026-07-11 (bagian ke-4): test otomatis Logic Torsi Sparepart

Konteks: mengerjakan item terakhir yang tersisa "BELUM DIKERJAKAN" di
`CATATAN-CEK-CLAUDE.md` — "Logic Torsi Sparepart (katalog 60+ spesifikasi
torsi Honda Vario 125, kalibrasi kunci torsi fisik MOLLAR MLR-B11950):
belum ada pengujian fungsional otomatis terhadap kalkulator ekstensi
(`Torsi.calcExt`) atau mode checklist servis." Item lain yg masih tersisa
("Evaluasi split `transaksi.js`") sengaja TIDAK dikerjakan di sesi ini krn
itu keputusan desain/refactor besar yang menurut `CLAUDE.md` sendiri
seharusnya dikonfirmasi dulu ke user, bukan ditebak — jadi dibiarkan
sebagai satu-satunya sisa item di `CATATAN-CEK-CLAUDE.md`.

`npm run check` (test+build; lint tidak bisa jalan di sandbox ini krn tidak
ada akses internet) sudah hijau sebelum sesi ini — jadi ini murni menambah
test yang sebelumnya nol utk modul `Torsi` (kalkulator torsi sparepart &
mode checklist servis di `features-budget-laporan-carnotes-pelanggan.js`),
TIDAK ada bug yang ditemukan/diperbaiki di kode aplikasinya.

**Test baru**: `tests/torsi-calc.test.js` (0 → 22 test, total suite
165 → 187). Cakupan:
- `Torsi.calcExt()` — rumus `setting = target × L ÷ (L + A)` (kalkulator
  ekstensi/sambungan batang kunci torsi), termasuk kasus L/A kosong &
  belum ada target (hasil disembunyikan, tidak dihitung), serta jalur mode
  manual (`this.mode==='manual'`) selain mode katalog.
- `Torsi.fmt()` — pembulatan 2 desimal & fallback `–` utk null/NaN.
- `Torsi.currentTargetNm()` — baca `this.selected.nm` di mode katalog vs
  baca input `trsManualTorsiInput` di mode manual.
- `Torsi.renderGaugeValues()` — konversi N·m → kgf·m/lbf·ft/lbf·in (angka
  konversi persis, mis. 98,0665 N·m = 10 kgf·m persis), badge catatan
  `'oli'`/`'new'`, & kasus nm null (semua nilai jadi `–`).
- `Torsi.setCalcMode()` — toggle class aktif tombol katalog/manual & show/
  hide panel input manual, termasuk auto-sync gauge saat pindah ke manual
  dgn input yg sudah terisi.
- `Torsi.itemKey()`, `Torsi.selectPart()` (part `noTorque` sengaja
  diabaikan, tidak ke-load ke kalkulator).
- Mode checklist servis: `Torsi.updateSummary()` (progres `done/count` &
  total biaya HANYA dari item yg tercentang), `Torsi.toggleCheck()` &
  `Torsi.updateBiaya()` (mutasi state + ikut `persist()` ke
  `D.torsiChecklist[curVehicleId]`, termasuk fallback biaya ke 0 kalau
  input invalid), `Torsi.setPageMode()` (toggle normal/checklist),
  `Torsi.loadPersisted()` (baca kembali state per kendaraan — kendaraan
  lain tidak ikut ketukar — & default aman kalau kendaraan belum pernah
  punya record).

Pola test: `loadSource()` me-load file source ASLI
(`features-budget-laporan-carnotes-pelanggan.js`, tempat modul `Torsi`
didefinisikan) ke sandbox vm, PLUS `createFakeDocument()` dari
`tests/helpers/fakeDom.js` (baca/tulis elemen DOM kalkulator yg
dipakai `Torsi.calcExt`/`renderGaugeValues` dst). Modul `Torsi` sengaja
TIDAK butuh `D`/`curVehicleId` sama sekali di method kalkulatornya (murni
`this.mode`/`this.selected`/DOM) — jadi file GROUP_A ini bisa di-load
SENDIRIAN tanpa `features-tukang-kendaraan-storage.js` (GROUP_B, penyedia
asli `TORSI_DB`/`findTorsiDb`/`MY_WRENCH_SCALE` saat runtime). Konstanta
lintas-bundle (`TORSI_NM_PER_KGF/LBFT/LBIN`, `MY_WRENCH_SCALE`) yang
aslinya baru didefinisikan belakangan di bundle B (tapi dipakai method
`Torsi` yg baru jalan setelah kedua bundle ter-load penuh di browser)
disuntikkan lewat `extraGlobals` — `MY_WRENCH_SCALE` dibangun ulang persis
rumus aslinya (bukan di-mock kosong) supaya `renderWrenchNote()` yang
otomatis terpanggil tiap `renderGaugeValues()` tidak crash. Cakupan
`computeCats()` (butuh `findTorsiDb` lintas-bundle) & `renderList()`/
`renderRow()` (murni string HTML) sengaja TIDAK dites di sini — test
checklist di atas menyuntik `Torsi.cats` manual dgn array kecil buatan
sendiri, fokus ke logika kalkulator/state, bukan re-verifikasi isi katalog
torsi (yang sudah "benar krn disalin dari buku manual resmi", bukan logika
yg bisa salah).

`npm test` → 187/187 pass, 0 fail. `node build.js` → sintaks bundle valid,
versi naik ke 147 (`kw80-merge-advisor-card-dashcards-22`). `npm run lint`
TIDAK bisa dijalankan di sesi ini krn sandbox tanpa akses internet —
tolong jalankan `npm run check` penuh (atau minimal `npm run lint`)
sebelum merge/release.

Dengan ini, semua item "BELUM DIKERJAKAN" di `CATATAN-CEK-CLAUDE.md` sudah
selesai KECUALI "Evaluasi split `transaksi.js`" yang memang butuh
konfirmasi desain dulu dari user sebelum dieksekusi.

## Catatan kerja — 2026-07-11 (bagian ke-5): split `transaksi.js` → `cicilan.js`

Konteks: user secara eksplisit meminta item terakhir yang tersisa di
`CATATAN-CEK-CLAUDE.md` ("Evaluasi split `transaksi.js`") dieksekusi —
ini keputusan desain/refactor besar yang sebelumnya sengaja ditahan
(lihat catatan bagian ke-3/ke-4 di atas) sampai ada konfirmasi user.

**Evaluasi:** `transaksi.js` sebelum split ≈1165 baris / 79+ fungsi —
file dengan risiko maintainability tertinggi menurut audit sebelumnya.
Dipilih memisahkan **logika form Cicilan** (paling mandiri & paling
gampang dikenali batasnya) ke `cicilan.js` baru:
`validateCicilanFields`, `calcCicilanPerBulanFromTotal`,
`calcCicilanTotalFromPerBulan`, `syncCicilanPreview`,
`getCicilanSharedMine`, `toggleCicilanSharedFields`, `syncCicilanDate`,
`openCicilanHistoryFromTx`. Bagian lain `transaksi.js` (BBM, stok
sparepart, stok/penjualan Cobek, transfer, target, dll) SENGAJA belum
dipisah di sesi ini — masing-masing area itu punya saling-ketergantungan
berbeda & butuh evaluasi terpisah supaya tidak jadi satu PR raksasa yang
susah di-review; cicilan dipilih duluan karena scope-nya paling jelas
(cuma dipakai lewat panel Cicilan di txModal + dipanggil balik dari
`_saveTxInner`/`editTx`/`setPayMethod`/`openTxModal` di transaksi.js).

**Kenapa aman dipindah (bukan cuma dipindah tanpa dicek):**
- Semua fungsi cicilan murni fungsi global (bukan namespace/module) —
  SAMA PERSIS sebelum & sesudah split, jadi tiap pemanggil (baik dari
  `transaksi.js` sendiri maupun dari atribut `data-action`/`onchange`/
  `oninput` di HTML `modals.js`) tidak perlu diubah sama sekali.
- Variabel state `cicilanLastInput`/`cicilanSharedLastInput`/
  `cicilanDateLinked` TETAP di `features-helpers-global-security.js`
  (tidak ikut dipindah) — file itu sudah dimuat lebih dulu di
  `build.js` sebelum `cicilan.js`/`transaksi.js`, jadi tidak ada
  masalah urutan load/referensi belum terdefinisi.
- `cicilan.js` didaftarkan di `GROUP_B` (`build.js`), tepat sebelum
  `transaksi.js` (posisi lama fungsi-fungsi ini) — build tetap satu
  bundle global, jadi tidak ada perubahan konsep module/namespace baru
  yang bisa bikin file lain (`worthit.js`, `modals.js`, dst) putus.
- Dicek referensi silang tiap fungsi cicilan ke SEMUA file source
  (`grep`) sebelum & sesudah pindah — tidak ada file lain yang
  meng-assume fungsi ini ada di `transaksi.js` secara spesifik (semua
  akses lewat nama fungsi global, bukan lewat isi file).
- `tests/tx-bbm-sync.test.js` (`loadSource(['transaksi.js'], ...)`)
  tetap hijau tanpa diubah — jalur yang dites sengaja "tunai" (bukan
  cicilan), dan pemanggilan `getCicilanSharedMine` di `_saveTxInner`
  ada di dalam cabang `curPayMethod==='cicilan'` yang tidak pernah
  tereksekusi di test itu, jadi tidak butuh `cicilan.js` ikut di-load.

**Hasil:** `transaksi.js` 1165 → 1070 baris, `cicilan.js` baru 112
baris (8 fungsi, semuanya dipindah verbatim — TIDAK ada perubahan
logika/perilaku, murni pengelompokan ulang file).

`npm test` → 187/187 pass, 0 fail (tidak ada test yang perlu diubah).
`node build.js` → sukses, sintaks kedua bundle valid, versi naik ke 148
(`kw80-merge-advisor-card-dashcards-23`). `npm run lint` TIDAK bisa
dijalankan di sesi ini krn sandbox tanpa akses internet (`npm install`/
`npx eslint` gagal 403) — tolong jalankan `npm run check` penuh (atau
minimal `npm run lint`) sebelum merge/release, supaya style file baru
`cicilan.js` ikut divalidasi terhadap `eslint.config.js`.

Sisa area besar `transaksi.js` (BBM, stok sparepart/Cobek, transfer,
target/tabungan, dll) belum dievaluasi untuk split lebih lanjut —
kalau mau dilanjutkan, sebaiknya satu area per sesi (sama seperti
pendekatan cicilan ini) supaya masing-masing tetap gampang di-review &
di-verifikasi lewat `npm run check`.

## Catatan kerja — 2026-07-11 (bagian ke-6): split `transaksi.js` → `tx-bbm.js`

Konteks: lanjutan sesi split `transaksi.js` (bagian ke-5), area kedua yang
dipisah adalah **panel sinkron BBM** pada form Transaksi — dipilih setelah
cicilan karena scope-nya juga jelas & sudah ada test yang mengunci
perilakunya (`tests/bbm-log.test.js`, `tests/tx-bbm-sync.test.js`).

**Fungsi yang dipindah** ke `tx-bbm.js` baru: `populateTxBbmVehicleSelect`,
`toggleTxBbmFields`, `syncTxBbmAmt`, `syncTxAmtToLiter`,
`syncTxAmtToLiterForce`, `recordBbmLog`, `applyTxBbmFromTx`. Semua tetap
fungsi global verbatim (tidak ada perubahan logika), dipanggil sama persis
dari `transaksi.js` (`updateTxVehiclePanels`, `editTx`, `openTxModal`,
`_saveTxInner`), dari HTML (`modals.js`, atribut `oninput`/`onchange`), dan
dari file lintas-bundle `features-budget-laporan-carnotes-pelanggan.js`
(`BBM._saveInner` memanggil `recordBbmLog`).

**Kenapa aman dipindah:**
- `recordBbmLog` dipanggil dari `features-budget-laporan-carnotes-pelanggan.js`
  (GROUP_A) walau kini didefinisikan di `tx-bbm.js` (GROUP_B, dimuat
  setelah GROUP_A) — ini AMAN karena pemanggilannya baru terjadi lazy saat
  user menyimpan form BBM (setelah kedua bundle sudah selesai di-load di
  browser), bukan saat file GROUP_A pertama kali di-parse.
- `tx-bbm.js` didaftarkan di `GROUP_B` (`build.js`) tepat sebelum
  `transaksi.js` (posisi lama fungsi-fungsi ini, setelah `cicilan.js`).
- Dicek referensi silang tiap fungsi ke SEMUA file source sebelum & sesudah
  pindah — tidak ada file lain yang meng-assume fungsi ini ada persis di
  `transaksi.js`.
- **2 file test yang sebelumnya `loadSource(['transaksi.js'])` diupdate**
  supaya ikut memuat `tx-bbm.js`:
  - `tests/bbm-log.test.js` — sekarang `loadSource(['tx-bbm.js'], ...)`
    (recordBbmLog pindah lokasi, tapi test-nya sendiri TIDAK berubah
    assersinya sama sekali, cuma path file sumber).
  - `tests/tx-bbm-sync.test.js` — sekarang
    `loadSource(['tx-bbm.js', 'transaksi.js'], ...)` supaya
    `applyTxBbmFromTx`/`recordBbmLog` yang dipanggil dari dalam
    `_saveTxInner` tetap terdefinisi di sandbox test yang sama.

**Hasil:** `transaksi.js` 1070 → 1000 baris, `tx-bbm.js` baru 92 baris (7
fungsi, dipindah verbatim).

`npm test` → 187/187 pass, 0 fail (2 file test disesuaikan path
`loadSource`, TIDAK ada assersi/skenario test yang diubah). `node build.js`
→ sukses, sintaks kedua bundle valid, versi naik ke 149
(`kw80-merge-advisor-card-dashcards-24`). `npm run lint` TIDAK bisa
dijalankan di sesi ini krn sandbox tanpa akses internet — tolong jalankan
`npm run check` penuh (atau minimal `npm run lint`) sebelum merge/release.

Sisa area `transaksi.js` yang belum dipisah: stok sparepart, stok/penjualan
Cobek, transfer antar akun, target/tabungan. Direkomendasikan tetap satu
area per sesi.

## Catatan kerja — 2026-07-11 (bagian ke-7): split `transaksi.js` → `tx-stok-sparepart.js`

Konteks: lanjutan sesi split `transaksi.js` (bagian ke-5/ke-6), area ketiga
yang dipisah adalah **panel "Tambah ke Stok Sparepart juga?"** pada form
Transaksi.

**Fungsi yang dipindah** ke `tx-stok-sparepart.js` baru:
`populateTxStockSelect`, `onTxStockItemChange`, `toggleTxStockFields`,
`applyTxStockFromTx`. Semua tetap fungsi global verbatim, dipanggil sama
persis dari `transaksi.js` (`updateTxVehiclePanels`, `_saveTxInner` — 3
titik panggil `applyTxStockFromTx` di jalur cicilan/langganan/tunai), dari
HTML (`modals.js`), dan dari `scan-ocr.js` (auto-centang panel stok saat
hasil scan struk terdeteksi sparepart).

**Kenapa aman dipindah:**
- Tidak ada test yang sebelumnya memanggil fungsi-fungsi ini langsung, TAPI
  `applyTxStockFromTx` dipanggil TANPA SYARAT di dalam `_saveTxInner`
  (baru early-return di dalam fungsinya sendiri kalau checkbox mati) —
  jadi `tests/tx-bbm-sync.test.js` (yang menjalankan `_saveTxInner` penuh)
  akan **ReferenceError** kalau `tx-stok-sparepart.js` tidak ikut di-load.
  Diupdate: `loadSource(['tx-bbm.js', 'tx-stok-sparepart.js',
  'transaksi.js'], ...)`. Skenario/assersi test itu sendiri TIDAK berubah
  (checkbox stok tetap `false` di semua kasusnya, jadi
  `applyTxStockFromTx` tetap early-return seperti sebelumnya — cuma
  memastikan fungsinya ADA/terdefinisi di sandbox).
- `tx-stok-sparepart.js` didaftarkan di `GROUP_B` (`build.js`) tepat
  sebelum `transaksi.js` (setelah `cicilan.js`, `tx-bbm.js`).
- `scan-ocr.js` (juga GROUP_B, dimuat lebih dulu di `build.js` daripada
  `tx-stok-sparepart.js`) memanggil `onTxStockItemChange`/
  `toggleTxStockFields` secara lazy (dalam handler hasil scan, bukan saat
  file di-parse) — aman terlepas dari urutan definisi.

**Hasil:** `transaksi.js` 1000 → 943 baris, `tx-stok-sparepart.js` baru 72
baris (4 fungsi, dipindah verbatim).

`npm test` → 187/187 pass, 0 fail (1 file test disesuaikan path
`loadSource`). `node build.js` → sukses, sintaks kedua bundle valid, versi
naik ke 150 (`kw80-merge-advisor-card-dashcards-25`). `npm run lint` TIDAK
bisa dijalankan di sesi ini krn sandbox tanpa akses internet — tolong
jalankan `npm run check` penuh sebelum merge/release.

Sisa area `transaksi.js` yang belum dipisah: stok/penjualan Cobek, transfer
antar akun, target/tabungan. Direkomendasikan tetap satu area per sesi.

## Catatan kerja — 2026-07-11 (bagian ke-8): split `transaksi.js` → `tx-transfer.js`

Konteks: lanjutan sesi split `transaksi.js` (bagian ke-5/6/7), area keempat
yang dipisah adalah **modal "⇄ Transfer Antar Akun"** (`transferModal`) —
dipilih karena scope-nya paling kecil & paling berdiri sendiri dari sisa
area yang belum dipecah (stok/penjualan Cobek, target/tabungan), jadi
risiko regresinya paling rendah.

**Fungsi yang dipindah** ke `tx-transfer.js` baru: `openTransferModal`,
`saveTransfer`. Keduanya tetap fungsi global verbatim (tidak ada perubahan
logika), dipanggil sama persis dari HTML (`modals.js`, atribut
`data-action="openTransferModal"` / `data-action="saveTransfer"`).

**Kenapa aman dipindah:**
- Tidak ada file source lain (`grep` menyeluruh) maupun test yang memanggil
  `openTransferModal`/`saveTransfer` — keduanya hanya dipanggil dari
  `data-action` di HTML, jadi tidak ada referensi langsung ke isi
  `transaksi.js` yang perlu disesuaikan.
- `tx-transfer.js` didaftarkan di `GROUP_B` (`build.js`) tepat setelah
  `tx-stok-sparepart.js` dan sebelum `transaksi.js` (posisi lama fungsi
  ini) — build tetap satu bundle global, urutan load tidak berubah utk
  modul lain.
- Tidak ada test yang perlu diupdate (tidak ada file test yang
  `loadSource(['transaksi.js'])` lalu memanggil salah satu dari 2 fungsi
  ini secara langsung).

**Hasil:** `transaksi.js` 943 → 924 baris, `tx-transfer.js` baru 32 baris (2
fungsi, dipindah verbatim, disisakan komentar penunjuk di lokasi lama).

`npm test` → 187/187 pass, 0 fail (tidak ada file test yang perlu diubah).
`node build.js` → sukses, sintaks kedua bundle valid (`node --check`),
lint bawaan `build.js` (u-dnone vs style.display, escapeHtml, chicken-egg
Tesseract) lolos tanpa temuan, versi naik ke 151
(`kw80-merge-advisor-card-dashcards-26`). Dicek manual: `openTransferModal`
& `saveTransfer` masing-masing cuma muncul 1x di source (`tx-transfer.js`)
& 1x di `app-bundle-b.min.js` (0x di `app-bundle-a.min.js`). `npm run lint`
TIDAK bisa dijalankan di sesi ini krn sandbox tanpa akses internet
(`npm install`/`npx eslint` gagal 403 Forbidden) — tolong jalankan
`npm run check` penuh (atau minimal `npm run lint`) sebelum merge/release.

Sisa area `transaksi.js` yang belum dipisah: stok/penjualan Cobek,
target/tabungan (`openTargetModal`, `onTargetAccChange`,
`onTargetDanaDaruratToggle`, `saveTarget`, `showTargetAccountTx`, dan
helper terkait `changeMonth`/`getTxListRange`/dst kalau mau dipisah jadi
domain "List Transaksi & Cashflow Forecast" tersendiri). Direkomendasikan
tetap satu area per sesi, dan **WAJIB** coba manual di browser (`?dev=1`):
buka form Transaksi → Transfer Antar Akun, isi & simpan transfer antar 2
akun, pastikan saldo kedua akun berubah dengan benar & muncul di riwayat
Keuangan — sandbox ini tidak punya browser jadi belum bisa diverifikasi
visual, hanya lolos cek sintaks & unit test.

## Catatan kerja — 2026-07-11 (bagian ke-9): split `transaksi.js` → `tx-cobek.js` + `tx-target.js`

Konteks: lanjutan sesi split `transaksi.js` (bagian ke-5/6/7/8), diminta
kerjakan dua area sisa sekaligus dalam satu sesi: **stok/penjualan Cobek**
dan **target/tabungan**.

**Temuan penting soal area Cobek:** berbeda dari BBM/Stok Sparepart, fungsi
panel form Cobek (`populateTxCobekStockSelect`, `onTxCobekStockItemChange`,
`toggleTxCobekStockFields`, `resetCobekStockCart`, `applyTxCobekStockFromTx`,
`populateTxCobekSaleSelect`, `onTxCobekSaleItemChange`,
`toggleTxCobekSaleFields`, `resetTxCobekSaleCart`, `applyTxCobekSaleFromTx`,
dst) **SUDAH ada di `cobek.js` sejak awal**, bukan hasil split sesi ini —
`transaksi.js` cuma memanggilnya. Satu-satunya bagian domain Cobek yang
murni tersisa di source `transaksi.js` adalah detektor
`isCobekStockCatName(catName,subName)` (dipakai `updateTxVehiclePanels()`
utk menentukan kapan panel Stok/Penjualan Cobek muncul) — jadi itu satu2nya
yang dipindah.

**Fungsi yang dipindah ke `tx-cobek.js` baru:** `isCobekStockCatName`.

**Fungsi yang dipindah ke `tx-target.js` baru:** `openTargetModal`,
`onTargetAccChange`, `onTargetDanaDaruratToggle`, `saveTarget`,
`showTargetAccountTx`, `addTarget`, `delTarget`. Fungsi domain lain yang
kebetulan tergabung historis di lokasi yang sama (`toggleMs`/milestone,
`delReminder`/pengingat, `saveCatatan`/`saveReminder`/`saveLDR`) **TIDAK**
ikut dipindah — beda domain, sengaja dibiarkan di `transaksi.js`.

**Kenapa aman dipindah:**
- Semua fungsi tetap global verbatim (tidak ada perubahan logika sama
  sekali), dipanggil sama persis dari HTML (`modals.js`, atribut
  `onchange`/`data-action`) dan dari `modules-render.js` (tombol
  `showTargetAccountTx`/`addTarget`/`delTarget` di kartu Target Pengaturan).
- `openTargetModal`/`onTargetDanaDaruratToggle` juga dipanggil lintas-bundle
  dari `modules-calc.js` & `aset.js` (banner "belum ada Dana Darurat") — ini
  AMAN karena panggilannya lazy (event klik), bukan saat file di-parse.
- `grep` menyeluruh: tidak ada file test yang `loadSource` lalu memanggil
  salah satu dari fungsi-fungsi ini secara langsung — **tidak ada file test
  yang perlu diubah** sama sekali di sesi ini.
- `tx-cobek.js` & `tx-target.js` didaftarkan di `GROUP_B` (`build.js`) tepat
  setelah `tx-transfer.js` dan sebelum `transaksi.js` (posisi lama fungsi
  ini) — urutan load modul lain tidak berubah.

**Hasil:** `transaksi.js` 924 → 864 baris, `tx-cobek.js` baru 28 baris (1
fungsi), `tx-target.js` baru 67 baris (7 fungsi), semua dipindah verbatim.

`npm test` → 187/187 pass, 0 fail (tidak ada file test yang perlu diubah
sama sekali). `node build.js` → sukses, sintaks kedua bundle valid (`node
--check`), lint bawaan `build.js` (u-dnone vs style.display, escapeHtml,
chicken-egg Tesseract) lolos tanpa temuan, versi naik ke 152
(`kw80-merge-advisor-card-dashcards-27`). Dicek manual: tiap fungsi yang
dipindah muncul tepat 1x di source & hanya di `app-bundle-b.min.js` (0x di
`app-bundle-a.min.js`). `npm run lint` TIDAK bisa dijalankan di sesi ini krn
sandbox tanpa akses internet (`npm install`/`npx eslint` gagal) — tolong
jalankan `npm run check` penuh (atau minimal `npm run lint`) sebelum
merge/release.

**Sisa area `transaksi.js` yang belum dipisah:** transfer antar akun
sudah selesai (bagian ke-8), stok/Cobek & target/tabungan selesai di sesi
ini — domain besar yang tersisa hanyalah **"List Transaksi & Cashflow
Forecast"** (`changeMonth`, `setTxListPeriode`, `getTxListRange`,
`setPeriode`, `getRange`, `computeCashflowForecast`, `txHTML`, `delTx`,
`setKeuanganTab`) kalau memang mau dipecah jadi file tersendiri — scope-nya
lebih besar & lebih tersebar (dipakai banyak render function), jadi
disarankan direview dulu cross-reference-nya sebelum dieksekusi, sesi
terpisah. **WAJIB** coba manual di browser (`?dev=1`) untuk kedua area yang
baru dipindah sesi ini: (1) buka form Transaksi dengan kategori bernama
"Cobek"/"Shop", pastikan panel Stok/Penjualan Cobek tetap muncul & bisa
disimpan; (2) buka Pengaturan → Target, tambah target baru (dgn & tanpa
centang Dana Darurat, dgn & tanpa akun terkait), edit progres tabungan,
lihat transaksi akun terkait — sandbox ini tidak punya browser jadi belum
bisa diverifikasi visual, hanya lolos cek sintaks & unit test.

## Catatan kerja — 2026-07-11 (bagian ke-10): verifikasi browser split `tx-cobek.js` + `tx-target.js`

Lanjutan langsung bagian ke-9 di atas — sesi itu menutup dengan catatan
"WAJIB coba manual di browser" karena sandbox saat itu tidak punya
Chrome/Playwright. Sesi ini ternyata punya akses Chrome cache Puppeteer
(`/home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/...`) dan
Playwright terpasang global, jadi kedua skenario itu langsung dijalankan
nyata (bukan mock, bukan cuma baca kode). **Tidak ada perubahan kode di
sesi ini — murni verifikasi.**

- `isCobekStockCatName`: dites pakai kategori Cobek asli di data
  (`Bisnis › Cobek`, id `sub_cb_cobek`) → `true`. Dites nama kategori/sub
  yang tidak nyambung sama sekali → `false`. Dites skenario intinya —
  rename total nama kategori & sub (mis. jadi "Bisnis Kios Renovasi" /
  "Peralatan Rumah Tangga") tanpa ganti id → tetap `true` lewat fallback
  id `sub_cb_cobek`/`sub_cbb_cobek`. Ini membuktikan fallback rename-proof
  yang jadi alasan fungsi ini ditulis memang betul jalan.
- Semua 7 fungsi `tx-target.js` (`openTargetModal`, `onTargetAccChange`,
  `onTargetDanaDaruratToggle`, `saveTarget`, `showTargetAccountTx`,
  `addTarget`, `delTarget`) ke-expose ke `window` (`typeof === 'function'`).
  Alur nyata: buka modal → isi nama & nominal → `saveTarget()` → 1 target
  baru masuk `D.targets` dengan field benar → toggle Dana Darurat memicu
  hint rekomendasi (angka & teks masuk akal) → `delTarget()` menghapus
  bersih dari array tanpa nyisa.
- 0 `pageerror` di console selama semua skenario di atas. Smoke-test
  internal tetap `✅ OK — 992 referensi getElementById() & 55 data-action
  semuanya valid`. `npm test` → 187/187 pass. `node build.js` → sukses,
  versi naik ke 153.

**Kesimpulan: tidak ada kekurangan (fungsi hilang/nyangkut) maupun
kelebihan (duplikat/sisa deklarasi ganda) di split `tx-cobek.js` +
`tx-target.js`.** File split ini sudah tuntas & terverifikasi penuh
(sintaks, unit test, DAN browser). Area split yang masih tersisa dari
`transaksi.js` tetap sama seperti disebut di bagian ke-9: **"List
Transaksi & Cashflow Forecast"** (`changeMonth`, `setTxListPeriode`,
`getTxListRange`, `setPeriode`, `getRange`, `computeCashflowForecast`,
`txHTML`, `delTx`, `setKeuanganTab`) — scope-nya lebih besar & lebih
tersebar dipakai banyak render function, jadi tetap disarankan sesi
terpisah dengan review cross-reference dulu sebelum eksekusi.

## Catatan kerja — 2026-07-11 (bagian ke-11): split `transaksi.js` → `tx-list-cashflow.js`

Konteks: eksekusi area terakhir yang disebut belum dipisah di bagian ke-9/
ke-10 — **"List Transaksi & Cashflow Forecast"**. Atas permintaan eksplisit
user ("jalankan pisah list transaksi").

**Fungsi yang dipindah ke `tx-list-cashflow.js` baru (9 fungsi + 1
variabel state):** `txHTML`, `delTx`, `changeMonth`, `txListPeriode` (let),
`setTxListPeriode`, `getTxListRange`, `setPeriode`, `getRange`,
`computeCashflowForecast`, `setKeuanganTab`. Semua dipindah verbatim, tidak
ada perubahan logika.

**Yang SENGAJA TIDAK ikut dipindah** (dipakai modul lain sejak sebelum
sesi ini, tetap di tempat asal): `curMonth`/`curYear` (deklarasi asli di
`features-helpers-global-security.js`), `txListPage`
(`filter-laporan.js`), `filterPeriode` (`features-helpers-global-security.js`),
`resetTxPageAndRender` (`filter-laporan.js`). Hanya `txListPeriode` yang
ikut pindah karena murni lokal punya `transaksi.js` & cuma dipakai bareng
`setTxListPeriode`/`getTxListRange`.

**Kenapa aman dipindah:**
- Semua fungsi tetap global verbatim, dipanggil sama persis dari HTML
  (`app_production.html`/`index.html`: `onclick="changeMonth(...)"`,
  `setTxListPeriode`, `setPeriode`, `setKeuanganTab`), dari
  `modules-render.js` (`renderKeuangan`/`renderLaporan`/
  `renderCashflowForecast` masing2 makai `getTxListRange`/`getRange`/
  `computeCashflowForecast`), dari `backup-restore.js` & `cobek.js`
  (`getRange`/`txHTML`/`computeCashflowForecast` utk ekspor & kartu shop),
  dan `features-sheets-pwa-selftest.js` (self-test makai `setKeuanganTab`).
- `deleteTxFromModal()` (tetap di `transaksi.js`) memanggil `delTx(id)` —
  aman karena deklarasi fungsi di-hoist di seluruh scope bundle gabungan,
  tidak tergantung urutan file selama satu bundle (sama seperti pola sesi
  sebelumnya).
- `grep` menyeluruh test suite: tidak ada test yang `loadSource` lalu
  memanggil salah satu dari 9 fungsi ini secara langsung — **tidak ada
  file test yang perlu diubah** sama sekali di sesi ini.
- `tx-list-cashflow.js` didaftarkan di `GROUP_B` (`build.js`) tepat
  setelah `tx-target.js` dan sebelum `transaksi.js` (posisi lama fungsi
  ini) — urutan load modul lain tidak berubah.

**Hasil:** `transaksi.js` 864 → 729 baris, `tx-list-cashflow.js` baru 159
baris (9 fungsi + 1 var). `npm test` → 187/187 pass, 0 fail (tidak ada
file test yang perlu diubah). `node build.js` → sukses, sintaks kedua
bundle valid, versi naik ke 154.

**Diverifikasi lewat browser nyata (Playwright + Chrome headless), bukan
cuma baca kode:**
- Semua 9 fungsi + `txListPeriode` ke-expose ke `window`.
- `changeMonth(-1)` → `curMonth`/`curYear` berubah benar (lintas tahun
  baru dites implisit lewat logic wrap month 0-11).
- `getTxListRange()` & `getRange()` mengembalikan objek `{from,to}` dengan
  `Date` valid.
- `computeCashflowForecast()` jalan tanpa error, field lengkap
  (`incAvg`/`expAvg`/`saldoNow`/`billsDue`/`upcoming`/`projected`).
- `txHTML(t)` dites dgn data transaksi contoh → HTML keluar benar, ada
  `data-action="editTx"` & `data-action="delTx"` dgn `data-args` ter-escape
  rapi.
- `setKeuanganTab('laporan')` → panel Laporan kebuka, `setKeuanganTab('kelola')`
  → balik ke panel Kelola, keduanya tanpa error.
- `delTx()` dites end-to-end: tambah transaksi dummy → hapus →
  `D.transactions` balik ke jumlah semula, tanpa nyisa.
- Smoke-test internal tetap `✅ OK — 992 referensi getElementById() & 55
  data-action semuanya valid`. 0 `pageerror` di seluruh skenario di atas.

**Kesimpulan: split ke-11 (List Transaksi & Cashflow Forecast) bersih,
tidak ada kekurangan (fungsi hilang/nyangkut) maupun kelebihan (duplikat/
sisa deklarasi ganda).** Dengan ini, **seluruh area besar dari roadmap
split `transaksi.js` (bagian ke-5 s/d ke-11) sudah tuntas** — `transaksi.js`
kini isinya murni form Tambah/Edit Transaksi (`setTxType`, autocomplete
kategori/produk, `updateTxVehiclePanels`, `openTxModal`/`editTx`/`saveTx`/
`_saveTxInner`) + beberapa fungsi kecil lintas-domain (`saveCatatan`,
`saveReminder`, `saveLDR`, `toggleMs`, `delReminder`) yang sengaja
dibiarkan gabung karena skalanya kecil & tidak cukup besar utk jadi file
sendiri.

## Catatan kerja — 2026-07-11 (bagian ke-12): housekeeping dokumentasi + `FILE-MAP.md` otomatis

Konteks: user tanya "apa yang belum dikerjakan" & minta saran supaya sesi
AI berikutnya tidak kebingungan cari file. 3 perbaikan, atas persetujuan
eksplisit user:

**1. Beresin `CATATAN-CEK-CLAUDE.md`:** 2 item ("Sinkronisasi BBM ↔
Transaksi ↔ Car Notes", "Logic Torsi Sparepart") sudah ditandai ✅ tapi
kesasar nangkring di bagian "BELUM DIKERJAKAN" (harusnya di "SUDAH
SELESAI" sesuai aturan file itu sendiri). Dipindah ke tempat yang benar,
"BELUM DIKERJAKAN" sekarang kosong (tidak ada item pending).

**2. Arsipkan `PEMISAHAN-FILE-ROADMAP.md` (2170 baris) — sudah basi
total.** Dokumen ini nyebut file (`features-etalase-piutang-renovai.js`,
`features-gaji-cobek-tagihan.js`, `features-renovasi-pajak-aset-order.js`,
dst) sebagai "belum dipecah" padahal file-file itu **sudah tidak ada** —
sudah dipecah jadi `cobek.js`/`aset.js`/`piutang-utang.js`/`renovasi.js`/
`gaji-calc.js`/`tagihan-kalender.js`/`akun.js`/`kategori.js`/dll di
sesi-sesi lain yang tidak balik update dokumen ini. Dipindah ke
`archive/PEMISAHAN-FILE-ROADMAP.md.OBSOLETE-2026-07-11.md` dengan header
peringatan besar di atasnya (bukan dihapus total — riwayat tetap ada,
cuma dikeluarkan dari jalur baca utama). `eslint.config.js` (`ignores`)
diupdate dari nama file spesifik jadi `archive/**` (lebih tahan lama,
otomatis nutupin apapun yang taruh di situ nanti).

**3. `FILE-MAP.md` — peta file & fungsi global auto-generated (perbaikan
utama).** Script baru `scripts/generate-file-map.js`, reuse
`getAllSourceFiles()`/`collectFromFile()` dari `scripts/collect-app-globals.js`
yang sudah ada (jadi cuma 1 implementasi parser top-level declaration,
tidak dobel). Kedua fungsi itu diexport tambahan dari
`collect-app-globals.js` (perubahan aditif, tidak mengubah perilaku
lama). Output `FILE-MAP.md` di root, 2 bagian:
  - Tabel file berurutan sesuai `GROUP_A`+`GROUP_B` (urutan load asli),
    tiap baris: jumlah baris + ringkasan 1-2 kalimat diekstrak otomatis
    dari komentar header file (`// nama-file.js — deskripsi...` yang
    memang sudah konsisten ditulis di kebanyakan file).
  - Index abjad semua identifier top-level (`function`/`const`/`let`/`var`)
    → nama file tempatnya dideklarasikan (852 identifier, 50 file per
    hitungan sesi ini).
  Dipanggil OTOMATIS di akhir `build.js` (setelah pesan "Build ... selesai
  & lolos cek sintaks", dibungkus try/catch supaya kegagalan generate
  peta TIDAK menggagalkan build produksi — cuma warning). Jadi peta ini
  selalu fresh tanpa langkah manual tambahan, sepanjang kebiasaan "jalankan
  `node build.js` tiap habis ubah source" (yang memang sudah jadi pola
  baku tiap sesi) tetap dijalankan.

**Kenapa ini lebih baik dari dokumen prosa manual:** peta yang
di-generate dari source tidak bisa basi seperti
`PEMISAHAN-FILE-ROADMAP.md` — kalau source berubah, generate ulang
otomatis ikut berubah. Sesi Claude berikutnya (atau manusia) tinggal
`grep nama_fungsi FILE-MAP.md` buat tahu ada di file mana, jauh lebih
cepat & akurat daripada `grep -rn` manual ke puluhan file source.

**Diverifikasi:**
- `node --check` lolos di `scripts/generate-file-map.js`, `build.js`,
  `scripts/collect-app-globals.js`.
- `node build.js` → sukses, `FILE-MAP.md` ke-generate ulang otomatis di
  akhir, versi naik ke 155. Isi dicek manual: fungsi hasil split
  bagian ke-9/ke-11 (`isCobekStockCatName`→`tx-cobek.js`,
  `openTargetModal`→`tx-target.js`, `txHTML`/`setKeuanganTab`/
  `computeCashflowForecast`→`tx-list-cashflow.js`) muncul benar.
- `npm test` → 187/187 pass, 0 fail.
- Smoke-test browser (Playwright + Chrome headless): `✅ OK — 992
  referensi getElementById() & 55 data-action semuanya valid`, 0
  `pageerror`. (Perubahan sesi ini murni tooling/dokumentasi + `build.js`,
  tidak menyentuh kode runtime app sama sekali, jadi risiko regresi UI
  nol — smoke-test cuma buat mastiin build.js yang diedit tidak
  merusak proses build/bundling.)
- `npm run lint`/`npx eslint` TIDAK bisa dites di sesi ini (sandbox tanpa
  internet, `npm install`/`npx eslint` gagal 403) — sama seperti
  keterbatasan sesi-sesi sebelumnya, tolong jalankan `npm run lint`
  sebelum merge/release utk mastiin `eslint.config.js` yang diedit
  (`ignores: 'archive/**'`) valid.

**Untuk sesi berikutnya:** kalau nambah/pindah/hapus file source lagi,
TIDAK perlu update dokumen manapun secara manual soal "file ini isinya
apa" — cukup pastikan `node build.js` dijalankan sampai selesai (sudah
kebiasaan baku), `FILE-MAP.md` otomatis ikut sinkron. Kalau perlu cari
sebuah fungsi/variabel global, cek `FILE-MAP.md` bagian 2 dulu sebelum
`grep -rn` manual.

## Catatan kerja — 2026-07-11 (bagian ke-13): validasi `eslint.config.js` manual + audit cakupan test

Konteks: user minta cek apakah `eslint.config.js` yang diedit sesi
sebelumnya valid (tanpa bisa `npm install` di sandbox ini), lalu minta
audit apakah `tests/*.test.js` sudah mencakup semua fitur/modul.

**1. Validasi `eslint.config.js` tanpa eslint asli (sandbox tetap tanpa
internet — `npm install` gagal 403 ke registry.npmjs.org, konsisten
dengan keterbatasan sesi-sesi sebelumnya):**
- `node --check eslint.config.js` & `node --check
  scripts/collect-app-globals.js` — syntax OK.
- `require('./eslint.config.js')` dieksekusi manual → 3 config block,
  struktur key sesuai schema flat config ESLint v9 (`ignores` /
  `files+languageOptions+rules` / `files+languageOptions`).
- `collectAppGlobals()` jalan tanpa error → 852 global app-specific +
  51 global browser = 903 total; semua value (`readonly`/`writable`)
  & semua key (nama identifier JS) valid — 0 invalid.
- **BELUM tervalidasi** (butuh eslint asli, tidak bisa disimulasikan):
  hasil lint SEBENARNYA (`no-undef`, `no-unused-vars`, dll) di seluruh
  source. Wajib jalankan `npm install && npm run lint` di mesin lokal
  (Node ≥20) sebelum merge/release.

**2. Audit cakupan `tests/*.test.js` (dijalankan pakai `node --test`
bawaan Node, tidak butuh `npm install`) → 187/187 pass, 0 fail, tapi
cakupan modul TIDAK lengkap.**

Modul yang SUDAH ada unit test (13 dari ~48 file fitur): `tx-bbm.js`,
`tx-stok-sparepart.js`, `transaksi.js`,
`features-budget-laporan-carnotes-pelanggan.js`,
`features-tukang-kendaraan-storage.js`, `modules-calc.js`,
`format-tema.js`, `gaji-calc.js`, `helper-teks.js`, `data-default.js`,
`features-helpers-global-security.js`, `pajak-pbb-zakat.js`,
`scan-ocr.js`. `modules-render.js` cuma dicek statis (registry check di
`dash-card-registry.test.js`, bukan logic test). `smoke-test.js`
structural check di browser (dev mode) — cek DOM id & window exposure,
bukan logic bisnis.

**Modul TANPA unit test sama sekali (~30+ file), 2 paling prioritas:**
- **`keamanan-pin.js`** — logic enkripsi PIN (PBKDF2+AES-GCM), paling
  security-sensitive di seluruh app, nol test.
- **`refleksi-selfcare.js`** — modul baru yang lagi aktif dikembangkan
  (gratitude journal, streak self-care, catatan PIN-encrypted), nol test.

Sisanya juga tanpa test: `akun.js`, `aset.js`, `cicilan.js`, `cobek.js`,
`piutang-utang.js`, `tx-target.js`, `tx-transfer.js`, `tx-cobek.js`,
`tx-list-cashflow.js`, `backup-restore.js`, `payroll-absensi.js`,
`kasir.js`, `sewakios.js`, `renovasi.js`, `worthit.js`,
`tagihan-kalender.js`, `reset-gaji-mingguan.js`, `modals.js`,
`modal-navigasi.js`, `onboarding.js`, `profil-pengaturan.js`,
`kategori.js`, `kategorisasi-ai.js`, `linktx.js`, `kalkulator-input.js`,
`filter-laporan.js`, `hidup-seimbang.js`, `edukasi-dana.js`,
`diagnostik-versi.js`, `debug-console.js`, `error-handler.js`,
`features-aiwidget-reminder-gdrive-search.js`,
`features-sheets-pwa-selftest.js`.

**Saran untuk sesi berikutnya:** prioritaskan test buat `keamanan-pin.js`
(enkripsi/dekripsi PIN, forgot-PIN flow, edge case PIN salah) dan
`refleksi-selfcare.js` (streak logic, gratitude entry CRUD, PIN-encrypted
notes) dulu sebelum modul lain — keduanya security/data-integrity
sensitive dan `refleksi-selfcare.js` masih aktif berubah. File
`PRE-MERGE-LINT-CHECK.md` (baru, root) dibuat sebagai pengingat cepat
command yang harus dijalankan sebelum merge: `npm install && npm run
lint` (dan opsional `npm run check` buat lint+test+build sekaligus).

**Diverifikasi:**
- `node --check` lolos untuk `eslint.config.js` &
  `scripts/collect-app-globals.js`.
- `require('./eslint.config.js')` + `collectAppGlobals()` dieksekusi
  manual tanpa error, hasil di atas.
- `node --test tests/*.test.js` → 187/187 pass, 0 fail (tidak ada
  perubahan kode dilakukan sesi ini, murni audit + dokumentasi).
- `npm run lint`/`npx eslint` TIDAK bisa dites di sesi ini (sandbox tanpa
  internet) — sama seperti sebelumnya, tolong jalankan di lokal sebelum
  merge.

## Catatan kerja — 2026-07-11 (bagian ke-14): test buat bagian RINGAN `refleksi-selfcare.js`

Konteks: lanjutan bagian ke-13 (audit cakupan test), user minta "kerjakan
saran yg ringan dulu" — dari 2 modul prioritas tanpa test
(`keamanan-pin.js`, `refleksi-selfcare.js`), dipilih mengerjakan bagian
yang PALING RINGAN dulu: logic murni (tanpa kripto) di
`refleksi-selfcare.js`, bukan `keamanan-pin.js` (lebih berat karena butuh
mock Web Crypto/PBKDF2+AES-GCM async).

**File baru: `tests/refleksi-selfcare.test.js` (16 test, semua pass).**
Cakupan SENGAJA dibatasi ke bagian ringan:
- `Refleksi.computeStreak()` — pure logic (6 test): streak 0 hari,
  streak lanjut walau hari ini belum dicentang ("grace" utk hari
  berjalan), streak putus kalau kemarin JUGA belum dicentang, streak 5
  hari berturut-turut, array kosong dihitung sama dgn tidak checklist.
- `SelfCareReko.compute()` — widget rekomendasi (3 test): `ready:false`
  kalau data <5 hari, item "weakest" terdeteksi benar, `gratitudeCount`
  cuma hitung catatan DALAM window 14 hari.
- Jurnal Syukur `addGratitude`/`deleteGratitude` (4 test, pakai fakeDom):
  teks kosong ditolak, teks valid tersimpan & input dikosongkan,
  batal/konfirmasi hapus.
- Checklist `toggleSelfCare` (3 test, pakai fakeDom): toggle
  nyala/mati, key hari itu dihapus total dari `selfCareLog` saat item
  terakhir di-uncheck (bukan disisakan array kosong).

**SENGAJA belum dicakup** (lebih berat, disisakan utk sesi lanjutan):
bagian "Catatan Privat" (`addNote`/`toggleNoteView`/`deleteNote`) —
butuh mock `encryptApiKeyWithPin`/`decryptApiKeyWithPin`/
`_sessionRawPin` (skema kripto sama dgn `keamanan-pin.js`). Test buat
`keamanan-pin.js` sendiri juga masih kosong — itu jadi PR berikutnya yg
lebih berat (async Web Crypto).

**2 jebakan yang ketemu & diperbaiki selama nulis test ini (dicatat biar
sesi berikutnya tidak mengulang):**
1. Array yang lahir dari `push()` DI DALAM vm context (lewat
   `loadSource()`) constructor-nya beda realm dgn `Array` host walau
   `Array.isArray()`/isinya identik — `assert.deepEqual` (alias
   `deepStrictEqual` di mode `'assert/strict'`) gagal walau isi sama
   persis. Solusi: bungkus `Array.from(...)` dulu sebelum
   `assert.deepEqual`.
2. `createFakeDocument(initial)` MEMBUAT elemen fake baru lalu
   `Object.assign` nilai `initial` ke situ — BUKAN reuse referensi objek
   yg dioper. Jadi kalau mau baca nilai akhir suatu field (mis. `value`)
   setelah dipanggil kode yang dites, harus baca lewat
   `fakeDocument.getElementById(id)`, bukan variabel lokal yang tadinya
   dioper sbg initial value (itu tetap objek terpisah, tidak ikut
   berubah).

**Diverifikasi:**
- `node --check tests/refleksi-selfcare.test.js` — syntax OK.
- `node --test tests/*.test.js` → **203/203 pass, 0 fail** (naik dari
  187 sebelum sesi ini, +16 test baru, 0 regresi ke test lama).
- `npm run lint`/`npx eslint` masih TIDAK bisa dites di sesi ini
  (sandbox tanpa internet) — tolong jalankan `npm run lint` di lokal
  sebelum merge, terutama karena ada file baru (`tests/refleksi-selfcare.test.js`).

**Untuk sesi berikutnya:** modul tanpa test yang masih tersisa (lihat
bagian ke-13 utk daftar lengkap). Kalau lanjut ke bagian "berat" dari
`refleksi-selfcare.js` (catatan privat) atau ke `keamanan-pin.js`
langsung, siapkan dulu mock untuk `crypto.subtle`
(`importKey`/`deriveKey`/`encrypt`/`decrypt` — Node punya
`require('node:crypto').webcrypto` yang API-compatible, bisa dipakai
langsung sbg `crypto` global di `loadSource()` tanpa perlu mock manual).

## Catatan kerja — 2026-07-11 (bagian ke-15): test "Catatan Privat" (kripto asli, tanpa mock)

Konteks: lanjutan bagian ke-14, user minta lanjut ke bagian "berat" yang
disisakan — Catatan Privat terenkripsi di `refleksi-selfcare.js`.

**File baru: `tests/refleksi-catatan-privat.test.js` (9 test, semua
pass).** Kunci teknis: Node 22 punya `globalThis.crypto` (Web Crypto
ASLI) + `TextEncoder`/`TextDecoder`/`atob`/`btoa` built-in — jadi
`keamanan-pin.js` (sumber `encryptApiKeyWithPin`/`decryptApiKeyWithPin`)
di-load APA ADANYA tanpa mock kripto sama sekali. Round-trip
enkripsi→dekripsi di test ini BENERAN jalan (PBKDF2 100rb iterasi +
AES-GCM), bukan stub yang pura-pura berhasil. Ini sekaligus jadi test
PERTAMA yang menyentuh `encryptApiKeyWithPin`/`decryptApiKeyWithPin` —
belum ada test khusus buat `keamanan-pin.js` sendiri (PIN screen,
lockout, `gantiPin`, migrasi skema lama→baru — itu jadi PR terpisah,
lihat "untuk sesi berikutnya" di bawah).

Cakupan test:
- `addNote` (3 test): sesi PIN tidak aktif → ditolak; teks kosong →
  ditolak SEBELUM cek sesi PIN; sesi aktif + teks valid → tersimpan
  **terenkripsi** (diverifikasi eksplisit: `JSON.stringify(note.enc)`
  TIDAK mengandung judul/isi asli sama sekali, baik plaintext maupun
  base64-nya — ini yang paling penting, mastiin tidak ada kebocoran data
  mentah ke storage), input judul+teks ikut dikosongkan.
- `toggleNoteView` (4 test): PIN sesi sama → dekripsi sukses, judul+isi
  balik SAMA PERSIS (round-trip nyata); toggle 2x (buka→tutup) → balik
  status tersembunyi; PIN sesi BEDA (simulasi PIN sudah diganti) →
  dekripsi gagal, toast error, isi TIDAK ditampilkan; sesi PIN tidak
  aktif sama sekali → ditolak tanpa mencoba dekripsi.
- `deleteNote` (2 test): batal vs konfirmasi hapus, `_revealed` state
  ikut dibersihkan pas delete.

**Jebakan teknis yang ditemukan & solusinya:** `_sessionRawPin` di
`keamanan-pin.js` dideklarasikan `let` di top-level — vm TIDAK
menempelkannya ke context object (sama seperti catatan soal
const/let di `loadSource.js`), dan parameter `expose` di `loadSource()`
cuma bisa BACA nilai, bukan SET nilai baru dari luar test. Solusinya:
`vm.runInContext('_sessionRawPin = "1234";', ctx)` dijalankan langsung
ke context yang sama (`ctx` yang di-return `loadSource()` adalah
objek yang sudah di-`vm.createContext()`, jadi bisa dipakai lagi lewat
`vm.runInContext()` biasa) — ini dipakai sbg helper `setSessionPin(pin)`
di test buat simulasi "sesi PIN aktif/tidak aktif/berubah".

**Diverifikasi:**
- `node --check tests/refleksi-catatan-privat.test.js` — syntax OK.
- `node --test tests/*.test.js` → **212/212 pass, 0 fail** (naik dari
  203 di bagian ke-14, +9 test baru, 0 regresi).
- `npm run lint`/`npx eslint` masih TIDAK bisa dites di sesi ini
  (sandbox tanpa internet) — tolong jalankan `npm run lint` di lokal
  sebelum merge (ada 2 file test baru dari bagian ke-14 & ke-15).

**Untuk sesi berikutnya — sisa PR test yang belum dikerjakan:**
1. `keamanan-pin.js` sendiri masih tanpa test langsung: `hashPin`
   (deterministik, gampang), lockout PIN salah (`_pinLockState`/
   `_pinLockRemainingMs`/`updatePinLockUI` — perlu stub
   `localStorage`/`setInterval`), `gantiPin` (re-enkripsi API key lama
   ke PIN baru), `loadAndMigrateApiKeyOnUnlock` (migrasi skema lama →
   baru). Pola test kripto real (tanpa mock) yang dipakai di bagian
   ke-15 ini bisa langsung dipakai ulang.
2. Modul lain yang masih tanpa test sama sekali: lihat daftar lengkap di
   bagian ke-13 (masih ~28 file, dikurangi `refleksi-selfcare.js` yang
   sekarang sudah full tercakup — bagian ringan bagian ke-14 + bagian
   berat bagian ke-15 ini).

## Catatan kerja — 2026-07-11 (bagian ke-16): test `keamanan-pin.js` — hashPin, gantiPin, migrasi API key

Konteks: lanjutan saran prioritas #1 dari bagian ke-15 — `keamanan-pin.js`
sendiri masih tanpa test langsung. User setuju lanjut.

**File baru: `tests/keamanan-pin.test.js` (13 test, semua pass).** Sama
seperti bagian ke-15, pakai Web Crypto ASLI Node (`globalThis.crypto`),
BUKAN mock — round-trip enkripsi/dekripsi beneran jalan.

Cakupan:
- `hashPin` (3 test): deterministik (PIN sama → hash sama), PIN beda →
  hash beda, format hex SHA-256 valid (64 karakter 0-9a-f).
- `gantiPin` (4 test): batal (prompt kosong) → tidak ada perubahan sama
  sekali; PIN baru tidak valid (bukan 4 digit angka) → ditolak dgn
  alert; PIN baru valid tanpa API key lama → hash PIN baru tersimpan +
  sesi diupdate; PIN baru valid DENGAN API key lama → **re-enkripsi
  berhasil** (diverifikasi: hasil enkripsi baru beda dari yg lama krn
  salt/iv baru, TAPI tetap bisa dibuka dgn PIN baru & sudah TIDAK BISA
  dibuka lagi dgn PIN lama).
- `loadAndMigrateApiKeyOnUnlock` (6 test): sesi PIN tidak aktif → no-op;
  belum ada apa-apa tersimpan & belum ada apiKey → no-op; belum ada
  tersimpan tapi `D.profile.apiKey` sudah terisi manual → otomatis
  dienkripsi & disimpan; data tersimpan & PIN sesi cocok → dimuat apa
  adanya; **skema LAMA** (kunci enkripsi = hash PIN via `kw_pin`, bukan
  PIN mentah) → berhasil dimigrasi otomatis ke skema baru (dibaca via
  fallback legacy, lalu di-re-enkripsi ke skema baru, diverifikasi bisa
  dibuka lagi dgn skema baru setelahnya); skema baru MAUPUN lama
  dua-duanya gagal (PIN beneran berubah/data rusak) → `apiKey` TIDAK
  diisi, toast peringatan muncul (di-trigger sinkron di test dgn
  override `setTimeout` jadi langsung panggil, bukan nunggu 400ms
  beneran).

Pola helper baru di file ini: `makeFakeLocalStorage()` — mock in-memory
sederhana (`getItem`/`setItem`/`removeItem`) yang BENERAN dipakai
baca-tulis (bukan permissive no-op stub dari `loadSource.js` default),
karena `gantiPin`/`loadAndMigrateApiKeyOnUnlock` baca-tulis
`localStorage` langsung utk kunci `'kw_pin'` & `kw_apikey_enc`. Juga
`safeSetItem` di-stub supaya TETAP menulis ke `fakeLocalStorage` (bukan
cuma spy kosong) sambil tetap dicatat tiap panggilannya buat verifikasi.

**SENGAJA belum dicakup di sesi ini:** layar PIN interaktif & lockout
percobaan salah (`pinPress`/`pinBack`/`checkPin`/`updatePinLockUI`/
`_pinLockState`/`_pinLockRemainingMs`) — lebih banyak berurusan dgn
DOM keypad + timer interval, beda karakter testing-nya dari 3 fungsi di
atas (yang murni logic + kripto). `persistApiKeyEncrypted` (autosave
debounce 500ms) juga belum, tapi kecil kemungkinan berisiko tinggi
(cuma wrapper tipis di atas `encryptApiKeyWithPin` yg sudah teruji).

**Diverifikasi:**
- `node --check tests/keamanan-pin.test.js` — syntax OK.
- `node --test tests/*.test.js` → **225/225 pass, 0 fail** (naik dari
  212 di bagian ke-15, +13 test baru, 0 regresi).
- `npm run lint`/`npx eslint` masih TIDAK bisa dites di sesi ini
  (sandbox tanpa internet) — tolong jalankan `npm run lint` di lokal
  sebelum merge (sekarang ada 3 file test baru dari bagian ke-14/15/16
  yang menumpuk belum divalidasi lint-nya).

**Untuk sesi berikutnya:** kalau mau lanjut cakupan `keamanan-pin.js`
100%, sisanya lockout PIN (`_pinLockState` dkk, butuh fake
`setInterval`/`Date.now` yg bisa dimaju-mundurkan) & layar PIN
interaktif (`pinPress`/`checkPin`, butuh fakeDom + `pinBuffer` yg
juga `let` top-level, pola `setSessionPin`-nya sama persis dgn yg
dipakai di sini). Modul lain yg masih nol test: lihat daftar di bagian
ke-13 (sekarang berkurang 1 lagi: `keamanan-pin.js` bagian intinya sudah
tercakup, meski belum 100%).

## Catatan kerja — 2026-07-11 (bagian ke-17): test `tx-cobek.js` — `isCobekStockCatName`

Konteks: user minta "kerjakan saran yg ringan dulu" lagi. Dari 2 opsi
sisa di catatan bagian ke-16 (lanjut `keamanan-pin.js` — lockout PIN +
layar PIN interaktif, keduanya lebih berat krn butuh fake
`setInterval`/`Date.now` & fakeDom+`pinBuffer`; ATAU pilih salah satu
modul nol-test lain dari daftar bagian ke-13), dipilih yang PALING
RINGAN dari semuanya: `tx-cobek.js` (28 baris, satu fungsi murni
`isCobekStockCatName`, tidak baca/tulis DOM sama sekali — cuma baca
`D.categories`), bukan lanjut `keamanan-pin.js`.

**File baru: `tests/tx-cobek.test.js` (10 test, semua pass).** Fungsi ini
menentukan kapan panel Stok/Penjualan Cobek/Shop muncul di form
Transaksi (dipanggil dari `updateTxVehiclePanels()` di `transaksi.js`).
Cakupan:
- Cocok langsung by nama kategori/subkategori mengandung "cobek" atau
  "shop" (case-insensitive), termasuk saat `D.categories` kosong sama
  sekali (bagian ini tidak butuh lookup ke `D` sama sekali).
- `catName`/`subName` `undefined`/`null`/tidak diisi → tidak error,
  balik `false` (fallback ke string kosong sebelum di-regex).
- Fallback lewat ID internal (`sub_cb_cobek`/`sub_cbb_cobek`) tetap
  `true` walau nama kategori & subkategori SUDAH di-rename user jadi
  sama sekali tidak mengandung kata "cobek"/"shop" — ini bagian paling
  penting krn fitur rename kategori memang ada di app (beda dari kasus
  kendaraan di `resolveVehicleTxCategory` yg belum ada UI rename-nya).
- Fallback ID diverifikasi jalan baik dari `D.categories.expense`
  maupun `D.categories.income`.
- Kategori ketemu by nama tapi `sub.id` bukan salah satu dari 2 id yg
  dikenali → `false` (tidak asal true krn kategorinya "mirip").
- `subName` yang diberikan tidak ada di daftar `subs` kategori yg
  ketemu → `false`, tidak error/throw.

**Tidak ada bug ditemukan** — `isCobekStockCatName` sudah benar sesuai
komentar di source-nya sendiri; sesi ini murni menambah test yang
sebelumnya nol utk fungsi ini (sama seperti pola "review tanpa bug" di
catatan kerja Car Notes 2026-07-10/11 di atas).

**Diverifikasi:**
- `node --check tests/tx-cobek.test.js` — syntax OK.
- `node --test tests/*.test.js` → **235/235 pass, 0 fail** (naik dari
  225 di bagian ke-16, +10 test baru, 0 regresi).
- `node build.js` → sukses, 0 error dari 3 lint guard bawaan (u-dnone,
  escapeHtml, chicken-egg OCR), versi naik otomatis ke
  `kw80-merge-advisor-card-dashcards-31` (build #156), kedua bundle
  lolos `node --check` sintaks, `FILE-MAP.md` diregenerasi (50 file,
  852 identifier global).
- `npm run lint`/`npx eslint` masih TIDAK bisa dites di sesi ini
  (sandbox tanpa internet, `npm install` gagal 403 ke registry) —
  tolong jalankan `npm run lint` di lokal sebelum merge/release (ada 1
  file test baru dari bagian ke-17 yg menumpuk dgn bagian ke-14/15/16
  yg juga belum divalidasi lint-nya di mesin lokal).

**Untuk sesi berikutnya — pilihan saran, urut dari paling ringan:**
1. **(RINGAN)** Modul kecil lain yg masih nol test dari daftar bagian
   ke-13, kandidat murni-logic tanpa DOM berat: `tx-transfer.js` (32
   baris, mirip pola `tx-cobek.js`), lalu file "kalkulator" yg
   kemungkinan besar pure-function: `kalkulator-input.js` (140 baris),
   `worthit.js` (467 baris), `edukasi-dana.js` (173 baris),
   `hidup-seimbang.js` (218 baris) — belum dicek detail isinya, perlu
   baca dulu sebelum pilih.
2. **(SEDANG)** Modul transaksi/CRUD sedang (100–350 baris) yg
   kemungkinan butuh fakeDom spt pola `tests/refleksi-selfcare.test.js`:
   `akun.js`, `cicilan.js`, `tx-target.js`, `piutang-utang.js`,
   `aset.js`.
3. **(BERAT)** Lanjut cakupan `keamanan-pin.js` ke 100%: lockout PIN
   (`_pinLockState`/`_pinLockRemainingMs`/`updatePinLockUI`, butuh fake
   `setInterval`/`Date.now` yg bisa dimaju-mundurkan) & layar PIN
   interaktif (`pinPress`/`pinBack`/`checkPin`, butuh fakeDom +
   `pinBuffer` yg jg `let` top-level — pola `setSessionPin` di
   `tests/keamanan-pin.test.js` bisa dipakai ulang).
4. `cobek.js` (1261 baris, file fitur terbesar yg masih nol test) —
   disisakan paling akhir krn ukurannya jauh lebih besar dari yg lain,
   butuh sesi tersendiri utk dipetakan dulu strukturnya sebelum nulis
   test.

Daftar modul nol-test yg TERSISA (dikurangi `tx-cobek.js` yg baru
selesai bagian ke-17 ini) dari bagian ke-13: `akun.js`, `aset.js`,
`cicilan.js`, `cobek.js`, `piutang-utang.js`, `tx-target.js`,
`tx-transfer.js`, `tx-list-cashflow.js`, `backup-restore.js`,
`payroll-absensi.js`, `kasir.js`, `sewakios.js`, `renovasi.js`,
`worthit.js`, `tagihan-kalender.js`, `reset-gaji-mingguan.js`,
`modals.js`, `modal-navigasi.js`, `onboarding.js`,
`profil-pengaturan.js`, `kategori.js`, `kategorisasi-ai.js`,
`linktx.js`, `kalkulator-input.js`, `filter-laporan.js`,
`hidup-seimbang.js`, `edukasi-dana.js`, `diagnostik-versi.js`,
`debug-console.js`, `error-handler.js`,
`features-aiwidget-reminder-gdrive-search.js`,
`features-sheets-pwa-selftest.js`.

## Catatan kerja — 2026-07-11 (bagian ke-18): test `tx-transfer.js` — `openTransferModal` & `saveTransfer`

Konteks: lanjutan bagian ke-17, user minta lanjut saran berikutnya. Dari
daftar prioritas di catatan bagian ke-17 (opsi 1, "RINGAN": `tx-transfer.js`
dulu sebelum kalkulator2 yg belum dicek isinya), dipilih `tx-transfer.js`
(32 baris, 2 fungsi: `openTransferModal` & `saveTransfer`). Beda dari
`tx-cobek.js` (murni tanpa DOM), dua fungsi ini baca/tulis DOM langsung
(`getElementById`) — jadi dites pakai `fakeDom`, pola sama seperti
`tests/refleksi-selfcare.test.js`, tetap tergolong "ringan" krn tidak ada
kripto/timer/async rumit.

**File baru: `tests/tx-transfer.test.js` (12 test, semua pass).**
Cakupan:
- `openTransferModal` (4 test): reset `trAmt`/`trNote` jadi kosong,
  `trDate` di-set ke tanggal hari ini (ISO), manggil
  `populateAccFilters()` & `openModal('transferModal')`, `trTo.selectedIndex`
  diarahkan ke akun kedua HANYA kalau akun >1 (kalau cuma 1 akun,
  `selectedIndex` tidak disentuh sama sekali).
- `saveTransfer` validasi (3 test): jumlah kosong/nol ditolak, jumlah
  negatif ditolak, akun asal===tujuan ditolak — ketiganya via toast,
  tidak menambah transaksi apa pun.
- `saveTransfer` jalur sukses (5 test): tepat 2 transaksi baru
  (`transfer_out` dari akun asal + `transfer_in` ke akun tujuan) dgn
  jumlah/tanggal/kategori sama persis; catatan kosong → default
  `"Transfer"` + nama akun lawan diselipkan (`→`/`←`); catatan custom
  dipertahankan bukan ditimpa; nama akun di catatan di-`escapeHtml()`
  (dicek eksplisit tag `<b>` tidak lolos mentah); efek samping lengkap
  (`save()`, `closeModal('transferModal')`, `renderDashboard()`,
  `renderKeuangan()`, toast sukses) semua terpanggil.

**Tidak ada bug ditemukan** — sama seperti bagian ke-17, sesi ini murni
menambah test yang sebelumnya nol utk `tx-transfer.js`.

**Diverifikasi:**
- `node --check tests/tx-transfer.test.js` — syntax OK.
- `node --test tests/*.test.js` → **247/247 pass, 0 fail** (naik dari
  235 di bagian ke-17, +12 test baru, 0 regresi).
- `node build.js` → sukses, 0 error dari 3 lint guard bawaan, versi naik
  otomatis ke `kw80-merge-advisor-card-dashcards-32` (build #157), kedua
  bundle lolos `node --check` sintaks, `FILE-MAP.md` diregenerasi (50
  file, 852 identifier global).
- `npm run lint`/`npx eslint` masih TIDAK bisa dites di sesi ini
  (sandbox tanpa internet) — tolong jalankan `npm run lint` di lokal
  sebelum merge/release (sekarang ada 2 file test baru menumpuk dari
  bagian ke-17/ke-18 yg belum divalidasi lint-nya, ditambah sisa dari
  bagian ke-14/15/16 sebelumnya).

**Untuk sesi berikutnya — pilihan saran, urut dari paling ringan:**
1. **(RINGAN, belum dicek isinya)** Kandidat kalkulator murni-logic dari
   opsi 1 bagian ke-17 yg tersisa: `kalkulator-input.js` (140 baris),
   `edukasi-dana.js` (173 baris), `hidup-seimbang.js` (218 baris),
   `worthit.js` (467 baris) — perlu dibaca dulu isinya sebelum pilih
   mana yg paling ringan (blm tentu semuanya pure-function spt namanya).
2. **(SEDANG)** Modul transaksi/CRUD sedang (100–350 baris) yg
   kemungkinan butuh fakeDom spt pola bagian ke-18 ini: `akun.js`,
   `cicilan.js`, `tx-target.js`, `piutang-utang.js`, `aset.js`.
3. **(BERAT)** Lanjut cakupan `keamanan-pin.js` ke 100%: lockout PIN
   (`_pinLockState`/`_pinLockRemainingMs`/`updatePinLockUI`, butuh fake
   `setInterval`/`Date.now` yg bisa dimaju-mundurkan) & layar PIN
   interaktif (`pinPress`/`pinBack`/`checkPin`, butuh fakeDom +
   `pinBuffer` yg jg `let` top-level — pola `setSessionPin` di
   `tests/keamanan-pin.test.js` bisa dipakai ulang).
4. `cobek.js` (1261 baris, file fitur terbesar yg masih nol test) —
   disisakan paling akhir, butuh sesi tersendiri utk dipetakan dulu
   strukturnya sebelum nulis test.

Daftar modul nol-test yg TERSISA (dikurangi `tx-cobek.js` bagian ke-17 &
`tx-transfer.js` bagian ke-18 ini): `akun.js`, `aset.js`, `cicilan.js`,
`cobek.js`, `piutang-utang.js`, `tx-target.js`, `tx-list-cashflow.js`,
`backup-restore.js`, `payroll-absensi.js`, `kasir.js`, `sewakios.js`,
`renovasi.js`, `worthit.js`, `tagihan-kalender.js`,
`reset-gaji-mingguan.js`, `modals.js`, `modal-navigasi.js`,
`onboarding.js`, `profil-pengaturan.js`, `kategori.js`,
`kategorisasi-ai.js`, `linktx.js`, `kalkulator-input.js`,
`filter-laporan.js`, `hidup-seimbang.js`, `edukasi-dana.js`,
`diagnostik-versi.js`, `debug-console.js`, `error-handler.js`,
`features-aiwidget-reminder-gdrive-search.js`,
`features-sheets-pwa-selftest.js`.

## Catatan kerja — 2026-07-11 (bagian ke-19): test `kalkulator-input.js` — bagian ringan (`safeCalc`/`normalizeAmtToken`/preview/`evalAmtExpr`)

Konteks: lanjutan bagian ke-18, user minta lanjut lagi. Dari opsi 1 di
catatan bagian ke-18 (4 kandidat kalkulator belum dicek isinya), dibaca
dulu isi ke-4 file: `kalkulator-input.js` (140 baris) ternyata isinya
paling pas dgn "ringan" — parser ekspresi murni (`safeCalc`,
`normalizeAmtToken`) + 2 fungsi DOM-ringan (`updateAmtPreview`,
`evalAmtExpr`) TANPA state top-level `let` — jadi dipilih duluan drpd
`worthit.js`/`edukasi-dana.js`/`hidup-seimbang.js` yg belum tentu
sesederhana itu.

**Cakupan file ini SENGAJA dibatasi**, sama pola-nya dgn split
ringan/berat di `refleksi-selfcare.js` (bagian ke-14/15): popup
kalkulator interaktif (`openCalc`/`calcPress`/`calcClear`/
`calcBackspace`/`calcEquals`/`calcUseResult`/`calcRenderDisplay`) pakai
`let calcExpr`/`calcTargetId` top-level yg perlu di-reset lewat
`vm.runInContext` (pola sama dgn `_sessionRawPin`/`pinBuffer` di
`keamanan-pin.js`) — disisakan utk sesi lanjutan yg lebih "sedang"
beratnya, TIDAK dikerjakan di sesi ini.

**File baru: `tests/kalkulator-input.test.js` (26 test, semua pass).**
Cakupan:
- `safeCalc` (10 test): tambah/kurang, precedence kali/bagi vs
  tambah/kurang, tanda kurung, pembagian dgn 0 → `NaN` (bukan
  `Infinity`), unary minus/plus, ekspresi tidak lengkap (`"2+"`) →
  `NaN`, karakter di luar whitelist (huruf/simbol lain, termasuk upaya
  injeksi kayak `"alert(1)"`/`"2;3"`) → `NaN`, input bukan
  string/kosong/whitespace-only → `NaN`, token tersisa yg tidak
  konsisten (`"2 3"`) → `NaN`, angka desimal biasa dihitung benar.
- `safeCalc` gaya pemisah ribuan ala Indonesia (2 test, ini bagian yg
  paling gampang salah kalau di-refactor tanpa test): `"1.000"` →
  dinormalisasi jadi `1000` (BUKAN `1.0`), `"1.000.000"` → `1000000`.
- `normalizeAmtToken` (4 test, akses fungsi ini langsung terpisah dari
  `safeCalc` krn dia top-level `function` sendiri): tanpa titik apa
  adanya, segmen terakhir 1-2 digit dianggap desimal, segmen terakhir
  3+ digit dianggap ribuan (titik dibuang semua), kombinasi ribuan+desimal
  (`"1.000.50"` → `"1000.50"`).
- `calcPreviewValue` (3 test): falsy/kosong → 0, ekspresi tidak valid →
  0 (bukan `NaN`, penting krn dipakai langsung sbg angka di UI),
  ekspresi valid → hasil hitungnya.
- `updateAmtPreview` (3 test, pakai fakeDom): elemen tidak ketemu →
  no-op tanpa error, hasil >0 → preview terisi `"= " + fmt(hasil)`,
  hasil 0/negatif → preview dikosongkan (termasuk kasus preview
  sebelumnya ada isi lama, harus ke-reset).
- `evalAmtExpr` (5 test, pakai fakeDom + `class FakeEvent` yg di-inject
  manual krn vm sandbox `loadSource()` tidak menyediakan `Event`
  bawaan): elemen tidak ketemu → no-op; value tanpa karakter
  operator/titik (mis. `"500"` polos) → TIDAK diubah & TIDAK dispatch
  event (regex trigger `/[+\-*/.]/ `sengaja butuh minimal satu operator
  atau titik); ekspresi valid → value ditimpa hasil hitung & dispatch
  event `"input"` dgn `bubbles:true`; ekspresi invalid (hasil `NaN`) →
  value TIDAK diubah, tidak dispatch event; hasil dibulatkan 2 desimal
  (`"10/3"` → `"3.33"`).

**Tidak ada bug ditemukan** — sama seperti bagian ke-17/18, sesi ini
murni menambah test yg sebelumnya nol utk bagian ringan file ini.

**Diverifikasi:**
- `node --check tests/kalkulator-input.test.js` — syntax OK.
- `node --test tests/*.test.js` → **273/273 pass, 0 fail** (naik dari
  247 di bagian ke-18, +26 test baru, 0 regresi).
- `node build.js` → sukses, 0 error dari 3 lint guard bawaan, versi naik
  otomatis ke `kw80-merge-advisor-card-dashcards-33` (build #158), kedua
  bundle lolos `node --check` sintaks, `FILE-MAP.md` diregenerasi (50
  file, 852 identifier global).
- `npm run lint`/`npx eslint` masih TIDAK bisa dites di sesi ini
  (sandbox tanpa internet) — tolong jalankan `npm run lint` di lokal
  sebelum merge/release (sekarang ada 3 file test baru menumpuk dari
  bagian ke-17/18/19 yg belum divalidasi lint-nya).

**Untuk sesi berikutnya — pilihan saran, urut dari paling ringan:**
1. **(SEDANG)** Lanjut `kalkulator-input.js` bagian yg disisakan: popup
   kalkulator interaktif (`openCalc`/`calcPress`/`calcClear`/
   `calcBackspace`/`calcEquals`/`calcUseResult`/`calcRenderDisplay`) —
   butuh helper `vm.runInContext('calcExpr = "...";', ctx)` spt pola
   `setSessionPin` di `tests/keamanan-pin.test.js`, tapi TIDAK butuh
   kripto/timer async — jadi masih lebih ringan drpd sisa
   `keamanan-pin.js` (opsi 3 di bawah).
2. **(RINGAN, belum dicek isinya)** 3 kandidat kalkulator lain yg belum
   dicek: `edukasi-dana.js` (173 baris), `hidup-seimbang.js` (218
   baris), `worthit.js` (467 baris, paling besar dari yg "kalkulator").
3. **(SEDANG)** Modul transaksi/CRUD sedang (100–350 baris) yg
   kemungkinan butuh fakeDom spt pola bagian ke-18: `akun.js`,
   `cicilan.js`, `tx-target.js`, `piutang-utang.js`, `aset.js`.
4. **(BERAT)** Lanjut cakupan `keamanan-pin.js` ke 100%: lockout PIN
   (butuh fake `setInterval`/`Date.now` yg bisa dimaju-mundurkan) &
   layar PIN interaktif (`pinPress`/`pinBack`/`checkPin`).
5. `cobek.js` (1261 baris, file fitur terbesar yg masih nol test) —
   disisakan paling akhir, butuh sesi tersendiri utk dipetakan dulu
   strukturnya sebelum nulis test.

Daftar modul nol-test yg TERSISA (dikurangi `tx-cobek.js`/`tx-transfer.js`
bagian ke-17/18; `kalkulator-input.js` bagian ke-19 ini SEBAGIAN sudah
tercakup, popup interaktifnya belum): `akun.js`, `aset.js`, `cicilan.js`,
`cobek.js`, `piutang-utang.js`, `tx-target.js`, `tx-list-cashflow.js`,
`backup-restore.js`, `payroll-absensi.js`, `kasir.js`, `sewakios.js`,
`renovasi.js`, `worthit.js`, `tagihan-kalender.js`,
`reset-gaji-mingguan.js`, `modals.js`, `modal-navigasi.js`,
`onboarding.js`, `profil-pengaturan.js`, `kategori.js`,
`kategorisasi-ai.js`, `linktx.js`, `filter-laporan.js`,
`hidup-seimbang.js`, `edukasi-dana.js`, `diagnostik-versi.js`,
`debug-console.js`, `error-handler.js`,
`features-aiwidget-reminder-gdrive-search.js`,
`features-sheets-pwa-selftest.js`.

## Catatan kerja — 2026-07-11 (bagian ke-20): test `kalkulator-input.js` — popup interaktif (`kalkulator-input.js` 100% tercakup)

Konteks: lanjutan bagian ke-19, user minta lanjut lagi. Sesuai opsi 1 di
catatan bagian ke-19 ("SEDANG": lanjut popup kalkulator interaktif —
lebih ringan drpd sisa `keamanan-pin.js` krn tidak ada kripto/timer
async), dikerjakan sekarang: `openCalc`/`closeCalc`/`calcPress`/
`calcClear`/`calcBackspace`/`calcEquals`/`calcUseResult`/
`calcRenderDisplay` — semuanya baca/tulis 2 variabel top-level `let
calcTargetId, calcExpr`.

**Teknik:** sama persis pola `setSessionPin`/`getSessionPin` di
`tests/keamanan-pin.test.js` (bagian ke-16) — `vm.runInContext('calcExpr
= ...;', ctx)` utk nulis, `vm.runInContext('calcExpr', ctx)` utk baca,
krn `let` top-level TIDAK otomatis nempel ke objek context vm (beda dari
`function`/`var`). Helper `setCalcExpr`/`getCalcExpr`/`setCalcTargetId`/
`getCalcTargetId` dibungkus di `makeCalcPopup()`.

**File baru: `tests/kalkulator-popup.test.js` (24 test, semua pass).**
`kalkulator-input.js` sekarang 100% tercakup (gabungan dgn
`tests/kalkulator-input.test.js` bagian ke-19). Cakupan:
- `openCalc`/`closeCalc` (5 test): target berisi angka murni (boleh
  titik, TANPA operator) → `calcExpr` diisi dari value target itu;
  target berisi ekspresi (ada operator, mis. `"2+3"`) → `calcExpr` mulai
  kosong (regex `/^[0-9.]+$/` sengaja menolak apa pun selain
  digit/titik); target kosong → kosong; `openModal('calcModal')` &
  `calcRenderDisplay()` ikut terpanggil; `closeCalc` → `closeModal('calcModal')`.
- `calcRenderDisplay` (4 test): `calcExpr` kosong → valEl `"0"`;
  berakhiran operator → valEl apa adanya, exprEl kosong; ekspresi
  lengkap & valid → exprEl tampilkan ekspresi, valEl tampilkan hasil;
  ekspresi tidak valid (`"5//3"`, walau tidak mungkin lahir dari
  `calcPress` normal) → tidak crash, fallback tampilkan `calcExpr`
  mentah di kedua elemen.
- `calcPress` (5 test): tekan operator saat kosong → diberi awalan
  `"0"`; tekan angka/titik → cuma di-append; tekan operator saat SUDAH
  berakhiran operator → operator lama diganti (bukan ditumpuk, mis.
  `"5+"` + tekan `"*"` → `"5*"`, bukan `"5+*"`); tekan operator normal →
  ditambahkan di akhir; DOM ikut ter-update tiap tekan (manggil
  `calcRenderDisplay` di dalamnya).
- `calcClear`/`calcBackspace` (3 test): clear total apa pun isinya;
  backspace hapus 1 karakter terakhir; backspace saat sudah kosong →
  tidak error, tetap kosong.
- `calcEquals` (3 test): ekspresi valid → `calcExpr` ditimpa hasil akhir
  (dibulatkan 2 desimal); ekspresi belum lengkap (berakhiran operator,
  hasil `NaN`) → `calcExpr` TIDAK berubah (diabaikan, user masih bisa
  lanjut mengetik); pembagian desimal dibulatkan benar (`"10/3"` →
  `"3.33"`).
- `calcUseResult` (4 test): `calcTargetId` belum di-set (`null`) → cuma
  nutup modal, tidak nyentuh elemen; `calcExpr` angka murni (tanpa
  operator/titik) → dipakai apa adanya (TIDAK dilewatkan `safeCalc` lagi
  — regex trigger butuh minimal 1 operator/titik); `calcExpr` ekspresi
  valid → dihitung dulu, hasilnya yg dipakai; `calcExpr` tidak valid
  (`NaN`) → value target sama sekali TIDAK disentuh (tetap nilai lama),
  tapi modal tetap ditutup (`closeCalc()` selalu jalan di akhir apa pun
  hasilnya).

**Tidak ada bug ditemukan** — sama seperti bagian ke-17/18/19, sesi ini
murni menambah test yg sebelumnya nol utk bagian popup file ini.

**Diverifikasi:**
- `node --check tests/kalkulator-popup.test.js` — syntax OK.
- `node --test tests/*.test.js` → **297/297 pass, 0 fail** (naik dari
  273 di bagian ke-19, +24 test baru, 0 regresi).
- `node build.js` → sukses, 0 error dari 3 lint guard bawaan, versi naik
  otomatis ke `kw80-merge-advisor-card-dashcards-34` (build #159), kedua
  bundle lolos `node --check` sintaks, `FILE-MAP.md` diregenerasi (50
  file, 852 identifier global).
- `npm run lint`/`npx eslint` masih TIDAK bisa dites di sesi ini
  (sandbox tanpa internet) — tolong jalankan `npm run lint` di lokal
  sebelum merge/release (sekarang ada 4 file test baru menumpuk dari
  bagian ke-17/18/19/20 yg belum divalidasi lint-nya).

**Untuk sesi berikutnya — pilihan saran, urut dari paling ringan:**
1. **(RINGAN, belum dicek isinya)** 3 kandidat kalkulator lain yg belum
   dicek: `edukasi-dana.js` (173 baris), `hidup-seimbang.js` (218
   baris), `worthit.js` (467 baris).
2. **(SEDANG)** Modul transaksi/CRUD sedang (100–350 baris) yg
   kemungkinan butuh fakeDom: `akun.js`, `cicilan.js`, `tx-target.js`,
   `piutang-utang.js`, `aset.js`.
3. **(BERAT)** Lanjut cakupan `keamanan-pin.js` ke 100%: lockout PIN
   (butuh fake `setInterval`/`Date.now` yg bisa dimaju-mundurkan) &
   layar PIN interaktif (`pinPress`/`pinBack`/`checkPin`).
4. `cobek.js` (1261 baris, file fitur terbesar yg masih nol test) —
   disisakan paling akhir, butuh sesi tersendiri utk dipetakan dulu
   strukturnya sebelum nulis test.

`kalkulator-input.js` SEKARANG SUDAH tidak lagi masuk daftar nol-test —
dikeluarkan dari daftar di bawah. Daftar modul nol-test yg TERSISA (sebelum
bagian ke-21 di bawah):
`akun.js`, `aset.js`, `cicilan.js`, `cobek.js`, `piutang-utang.js`,
`tx-target.js`, `tx-list-cashflow.js`, `backup-restore.js`,
`payroll-absensi.js`, `kasir.js`, `sewakios.js`, `renovasi.js`,
`worthit.js`, `tagihan-kalender.js`, `reset-gaji-mingguan.js`,
`modals.js`, `modal-navigasi.js`, `onboarding.js`,
`profil-pengaturan.js`, `kategori.js`, `kategorisasi-ai.js`,
`linktx.js`, `filter-laporan.js`, `hidup-seimbang.js`, `edukasi-dana.js`,
`diagnostik-versi.js`, `debug-console.js`, `error-handler.js`,
`features-aiwidget-reminder-gdrive-search.js`,
`features-sheets-pwa-selftest.js`.

## Catatan kerja — 2026-07-11 (bagian ke-21): test `edukasi-dana.js` (EduFund) & `hidup-seimbang.js` (LifeBalance) — 2 kandidat paling ringan dari opsi 1 bagian ke-20

Konteks: user minta "kerjakan saran yg paling ringan" dari 2 file dulu. Dari
opsi 1 di catatan bagian ke-20 ("3 kandidat kalkulator lain yg belum dicek:
`edukasi-dana.js` 173 baris, `hidup-seimbang.js` 218 baris, `worthit.js` 467
baris"), dipilih 2 yg PALING RINGAN (baris paling sedikit): `edukasi-dana.js`
dan `hidup-seimbang.js`. `worthit.js` (467 baris, terbesar dari 3 kandidat)
sengaja belum dikerjakan, disisakan utk sesi berikutnya.

**Tidak ada bug ditemukan** — sama seperti bagian ke-17/18/19/20, sesi ini
murni menambah test yg sebelumnya nol utk kedua modul ini, tidak ada
perubahan di kode aplikasi.

**File baru: `tests/edukasi-dana.test.js` (18 test, `EduFund`).** Cakupan:
`calc()` (5 test: tahun target lewat/tahun ini → `pmtBulanan` = kekurangan
sekaligus; kasus normal pakai rumus anuitas inflasi≠return; kasus
inflasi==return → dibagi rata per bulan; terkumpul melebihi target →
kekurangan diklem 0; `accountId` terisi → terkumpul diambil dari
`recalcAccBalance()` bukan field manual), `updatePreview()` (3 test: pesan
warning kalau tahun target lewat, preview normal, `eduSavedWrap`
tampil/sembunyi sesuai akun dipilih), `save()` (5 test: validasi nama &
biaya kosong, entry baru, mode edit update di tempat, `accountId` terisi
→ `terkumpul` dipaksa 0), `del()` (1 test), `renderDashMini()` (2 test:
card disembunyikan kalau kosong, total/pct dihitung benar), `render()`
(2 test: empty state, linkTag akun ikut dirender). `openModal()` (murni
prefill form dari data existing — pola sama dgn BBM.openModal/
Servis.openModal yg sudah didokumentasikan nilai gunanya lebih rendah) dan
`checkAI()` (butuh mock `callAIProviderRaw`/`RefAI._parseJSON`/
`showPromptModal` async, ranah test terpisah yg lebih berat) SENGAJA belum
dites, konsisten dgn pola pembatasan cakupan di bagian-bagian sebelumnya.

**File baru: `tests/hidup-seimbang.test.js` (29 test, `LifeBalance`).**
Cakupan: `compute()` (11 test: Dana Darurat kosong/50%/>100% diklem;
DSR income belum ada → netral 13 + `thin:true`, DSR normal & filter
cicilan yg `sisaTenor` null/bukan `kind:'cicilan'` diabaikan; No Spend
histori <7 hari → netral+thin, No Spend normal; Kerja-Istirahat tanpa
Absensi → netral+thin, kerja penuh 7 hari → 0 poin, 2+ hari istirahat →
poin penuh diklem; total & level di 4 ambang batas Seimbang/Cukup
Baik/Perlu Perhatian/Waspada — termasuk catatan penting: **field `thin`
HANYA ada di 3 komponen (DSR/No-Spend/Kerja), Dana Darurat TIDAK PERNAH
`thin` krn kosongnya sudah tercermin lewat `ddPts:0`, bukan nilai netral**),
`getFocusAreas()` (2 test: filter pct<70% urut naik maks 2, semua ≥70% →
kosong), `render()`/`renderFocus()` (4 test: skor & ring ter-tulis,
`lbDataNote` tampil/sembunyi sesuai ada-tidaknya komponen `thin`, pesan
"Pertahankan" kalau tidak ada area fokus), `saveSnapshot()` (3 test:
entry baru, update snapshot tanggal yg sama termasuk flag `auto` ketimpa
saat manual, auto-save tidak toast), `autoSnapshotIfNeeded()` (3 test:
skip kalau app masih kosong total, skip kalau sudah ada snapshot bulan
ini, buat baru kalau syarat terpenuhi), `deleteSnapshot()` (2 test:
konfirmasi vs batal), `renderTrendBadge()` (3 test: <2 snapshot
disembunyikan, delta naik/turun). `renderHistoryModal()` (chart SVG +
list riwayat, murni DOM-write dari data yg sudah dites lewat
`saveSnapshot()`) SENGAJA belum dites detail — nilai gunanya lebih rendah.

**Catatan teknis satu kesalahan yg kejadian & diperbaiki SAAT menulis test
(bukan bug di kode aplikasi)**: draft awal test skenario total/level salah
asumsi keempat komponen "netral" bernilai 13 semua (13×4=52). Ternyata
Dana Darurat TIDAK punya jalur netral — kalau belum ada Target Dana
Darurat, `ddPts` langsung 0 (bukan 13), jadi total kondisi "semua data
kosong" yg benar adalah 0+13+13+13=**39** (level Waspada), bukan 52.
Ketahuan sendiri lewat `node --test` gagal (assertion mismatch), lalu
draft test dikoreksi mengikuti perilaku source yg sebenarnya (source TIDAK
diubah).

**Diverifikasi:**
- `node --test tests/*.test.js` → **344/344 pass, 0 fail** (naik dari 297
  di bagian ke-20, +47 test baru dari 2 file test baru ini, 0 regresi).
- `node build.js` → sukses, 0 error dari 3 lint guard bawaan, versi naik
  otomatis ke `kw80-merge-advisor-card-dashcards-35` (build #160), kedua
  bundle lolos `node --check` sintaks, `FILE-MAP.md` diregenerasi (50
  file, 852 identifier global).
- `npm run lint`/`npx eslint` masih TIDAK bisa dites di sesi ini (sandbox
  tanpa internet) — tolong jalankan `npm run lint` di lokal sebelum
  merge/release (sekarang ada 2 file test baru menumpuk dari bagian
  ke-21 ini yg belum divalidasi lint-nya, ditambah tumpukan dari
  bagian ke-17/18/19/20 yg juga belum divalidasi).

**Untuk sesi berikutnya — pilihan saran, urut dari paling ringan:**
1. **(RINGAN)** `worthit.js` (467 baris) — kandidat "kalkulator" terakhir
   yg tersisa dari daftar bagian ke-19/20, belum dicek isinya sama sekali.
2. **(SEDANG)** Modul transaksi/CRUD sedang (100–350 baris) yg
   kemungkinan butuh fakeDom: `akun.js`, `cicilan.js`, `tx-target.js`,
   `piutang-utang.js`, `aset.js`.
3. **(BERAT)** Lanjut cakupan `keamanan-pin.js` ke 100%: lockout PIN
   (butuh fake `setInterval`/`Date.now` yg bisa dimaju-mundurkan) &
   layar PIN interaktif (`pinPress`/`pinBack`/`checkPin`).
4. `cobek.js` (1261 baris, file fitur terbesar yg masih nol test) —
   disisakan paling akhir, butuh sesi tersendiri utk dipetakan dulu
   strukturnya sebelum nulis test.

`edukasi-dana.js` & `hidup-seimbang.js` SEKARANG SUDAH tidak lagi masuk
daftar nol-test. Daftar modul nol-test yg TERSISA (sebelum bagian ke-22
di bawah): `akun.js`, `aset.js`, `cicilan.js`, `cobek.js`,
`piutang-utang.js`, `tx-target.js`, `tx-list-cashflow.js`,
`backup-restore.js`, `payroll-absensi.js`, `kasir.js`, `sewakios.js`,
`renovasi.js`, `worthit.js`, `tagihan-kalender.js`,
`reset-gaji-mingguan.js`, `modals.js`, `modal-navigasi.js`,
`onboarding.js`, `profil-pengaturan.js`, `kategori.js`,
`kategorisasi-ai.js`, `linktx.js`, `filter-laporan.js`,
`diagnostik-versi.js`, `debug-console.js`, `error-handler.js`,
`features-aiwidget-reminder-gdrive-search.js`,
`features-sheets-pwa-selftest.js`.

## Catatan kerja — 2026-07-11 (bagian ke-22): test `worthit.js` (WorthIt) — kandidat terakhir dari daftar "kalkulator" bagian ke-19/20/21

Konteks: user minta "lanjutkan" dari catatan bagian ke-21. Sesuai opsi 1
di catatan bagian ke-21 ("(RINGAN) `worthit.js` 467 baris — kandidat
kalkulator terakhir yg tersisa"), dikerjakan sekarang. Dgn ini, seluruh
daftar "3 kandidat kalkulator" dari bagian ke-19 (`edukasi-dana.js`,
`hidup-seimbang.js`, `worthit.js`) sudah selesai semua.

**Tidak ada bug ditemukan** — sama seperti bagian ke-17/18/19/20/21, sesi
ini murni menambah test yg sebelumnya nol utk modul ini, tidak ada
perubahan di kode aplikasi.

**File baru: `tests/worthit.test.js` (47 test, `WorthIt`).** Cakupan:
- `incomeAvg()` (2 test): filter HANYA transaksi `type:'income'` dlm
  rentang bulan efektif, dibagi rata sesuai `FI.effectiveMonths()`.
- `computeScore()` (10 test, fungsi scoring Prioritas Belanja): poin dasar
  kebutuhan vs keinginan, urgensi mendesak/bisa_nunggu/nice_to_have,
  pengurang `sudahPunya` (poin & teks alasan custom), diskon 3 ambang
  (≥30% hijau naik faktor beda tergantung `sudahPunya` 0.4 vs 0.2, 10-30%
  orange, <10% merah "diskon palsu"), tekanan saldo 2 ambang (>50%/25-50%
  merah/orange), dan skor selalu diklem ke rentang 0-100.
- `hitung()` (14 test, verdict & issue list "Cek Sebelum Beli" single-item):
  validasi harga kosong, Dana Darurat kosong/100%/<100% (beda level merah
  vs orange tergantung kategori keinginan/kebutuhan), DSR sesudah cicilan
  baru >35% → verdict TUNDA DULU, saldo terkuras >50%, metode tunai
  surplus positif (estimasi bulan nabung) & negatif (data cukup vs belum
  cukup → beda pesan), selisih bunga cicilan vs tunai, diskon valid
  (hemat besar) & invalid (Harga Normal ≤ harga), saran "tunggu 3 hari"
  utk kategori keinginan, kondisi ideal → WORTH IT, dan `WorthIt._last`
  tersimpan setelah hitung sukses (dipakai `catatBeli()`/`simpanDulu()`
  yg TIDAK dites di sini, lihat catatan cakupan di atas file test).
- CRUD Prioritas Belanja (12 test): `addToList()` (validasi nama/harga,
  entry baru, deteksi duplikat nama dgn konfirmasi setuju/batal, mode
  edit update di tempat), `editListItem()`/`cancelEditList()` (prefill
  form & reset), `deleteListItem()` (hapus + auto-cancel kalau item yg
  dihapus sedang diedit).
- `renderList()` (4 test): empty state, item `bought:true` tidak ikut
  tampil di list aktif, urutan skor tertinggi→terendah & badge prioritas
  sesuai ambang, ringkasan total harga & warning kalau melebihi saldo.
- `applyBuyLink()`/`onLinkedTxEdited()`/`onLinkedTxDeleted()` (3 test):
  sinkronisasi status/harga/tanggal item wishlist dgn transaksi Keuangan
  yg tertaut (pola sama dgn `bbmLinkId`/`servisLinkId` di `transaksi.js`
  yg sudah dites di bagian ke-3/tx-bbm-sync).
- `undoBought()` (2 test): konfirmasi vs batal, transaksi Keuangan yg
  sudah tercatat SENGAJA tidak ikut terhapus saat undo (uangnya memang
  sudah keluar — dijelaskan di pesan konfirmasi sendiri).
- `renderBoughtList()` (2 test): empty state, urutan tanggal beli
  terbaru dulu.

SENGAJA belum dites (didokumentasikan di komentar atas file test):
`open()`/`switchTab()`/`reset()`/`onMethodChange()`/`toggleDiskon()`/
`toggleDiskonList()`/`toggleSudahPunya()`/`toggleBoughtView()` (murni
toggle tampilan modal tanpa logic hitung, nilai guna rendah spt
BBM.openModal/Servis.openModal), `syncDiskon()`/`syncDiskonList()`
(duplikat exact logic preview diskon yg sudah dites via jalur diskon di
`hitung()`/`computeScore()`), `catatBeli()`/`catatBeliList()`/
`simpanDulu()` (integrasi lintas modul ke form Transaksi — butuh mock
`openTxModal`/`setPayMethod`/`syncCicilanPreview`/
`guessCategoryFromReceiptText`/`selectTxCat` sekaligus, ranah test
integrasi terpisah yg lebih berat), dan `openLinkTxModal()` (cuma
delegasi 1 baris ke `LinkTx.open()`).

**Catatan teknis 1 kegagalan yg kejadian & diperbaiki SAAT menulis test
(bukan bug di kode aplikasi)**: test `editListItem` awalnya gagal dgn
error `scrollIntoView is not a function` — elemen generik dari
`createFakeElement()` di `tests/helpers/fakeDom.js` memang tidak
menyediakan stub utk `scrollIntoView` (cuma `focus()`/`click()`), padahal
`WorthIt.editListItem()` memanggilnya di elemen `wlName` sbg bagian dari
alur UX (auto-scroll ke form saat mulai edit). Diperbaiki dgn override
manual `scrollIntoView:()=>{}` khusus di test itu (bukan mengubah
`fakeDom.js` global, krn baru 1 tempat yg butuh — kalau modul lain nanti
butuh pola sama, pertimbangkan tambah `scrollIntoView` ke default
`createFakeElement()`).

**Diverifikasi:**
- `node --test tests/*.test.js` → **391/391 pass, 0 fail** (naik dari 344
  di bagian ke-21, +47 test baru, 0 regresi).
- `node build.js` → sukses, 0 error dari 3 lint guard bawaan, versi naik
  otomatis ke `kw80-merge-advisor-card-dashcards-36` (build #161), kedua
  bundle lolos `node --check` sintaks, `FILE-MAP.md` diregenerasi (50
  file, 852 identifier global).
- `npm run lint`/`npx eslint` masih TIDAK bisa dites di sesi ini (sandbox
  tanpa internet) — tolong jalankan `npm run lint` di lokal sebelum
  merge/release (sekarang ada 3 file test baru menumpuk dari bagian
  ke-21/22 yg belum divalidasi lint-nya, ditambah tumpukan sebelumnya).

**Untuk sesi berikutnya — pilihan saran, urut dari paling ringan:**
1. **(SEDANG)** Modul transaksi/CRUD sedang (100–350 baris) yg
   kemungkinan butuh fakeDom, pola sama dgn `edukasi-dana.js`/
   `worthit.js` sesi ini: `akun.js`, `cicilan.js`, `tx-target.js`,
   `piutang-utang.js`, `aset.js`.
2. **(BERAT)** Lanjut cakupan `keamanan-pin.js` ke 100%: lockout PIN
   (butuh fake `setInterval`/`Date.now` yg bisa dimaju-mundurkan) &
   layar PIN interaktif (`pinPress`/`pinBack`/`checkPin`).
3. `cobek.js` (1261 baris, file fitur terbesar yg masih nol test) —
   disisakan paling akhir, butuh sesi tersendiri utk dipetakan dulu
   strukturnya sebelum nulis test.

`worthit.js` SEKARANG SUDAH tidak lagi masuk daftar nol-test — dgn ini,
SEMUA kandidat "kalkulator" dari bagian ke-19 SUDAH selesai. Daftar modul
nol-test yg TERSISA: `akun.js`, `aset.js`, `cicilan.js`, `cobek.js`,
`piutang-utang.js`, `tx-target.js`, `tx-list-cashflow.js`,
`backup-restore.js`, `payroll-absensi.js`, `kasir.js`, `sewakios.js`,
`renovasi.js`, `tagihan-kalender.js`, `reset-gaji-mingguan.js`,
`modals.js`, `modal-navigasi.js`, `onboarding.js`,
`profil-pengaturan.js`, `kategori.js`, `kategorisasi-ai.js`,
`linktx.js`, `filter-laporan.js`, `diagnostik-versi.js`,
`debug-console.js`, `error-handler.js`,
`features-aiwidget-reminder-gdrive-search.js`,
`features-sheets-pwa-selftest.js`.

## Catatan kerja — 2026-07-11 (bagian ke-23): test `akun.js` & `tx-target.js` — 2 modul pertama dari opsi 1 (SEDANG) di saran bagian ke-22

Konteks: user minta kerjakan saran di CLAUDE.md, 2 file dulu. Sesuai opsi 1
di catatan bagian ke-22 ("(SEDANG) Modul transaksi/CRUD sedang (100–350
baris) yg kemungkinan butuh fakeDom: `akun.js`, `cicilan.js`, `tx-target.js`,
`piutang-utang.js`, `aset.js`"), dipilih 2 file terkecil di daftar itu:
`akun.js` (111 baris) & `tx-target.js` (67 baris).

**Tidak ada bug ditemukan** — sama seperti sesi-sesi sebelumnya, sesi ini
murni menambah test yg sebelumnya nol utk 2 modul ini, tidak ada perubahan
di kode aplikasi.

**File baru: `tests/akun.test.js` (27 test, seluruh fungsi `akun.js`).**
Cakupan: `recalcAccBalance()` (akun tak ditemukan, baseBalance vs fallback
`balance`, filter income/expense/transfer_in/transfer_out per akun),
`populateAccFilters()` (isi opsi ke `fAcc`/`txAcc`/`trFrom`/`trTo`/`wrAcc`,
placeholder & preservasi value lama di `tAcc`/`assetAccId`, panggil
`populateKeuFilters()`, aman kalau elemen tidak ada), `linkedAssetAccountIds()`/
`isAccLinkedToAsset()`, `totalSaldoAkun()` (exclude akun `includeInBalance:false`
& akun tertaut aset), `quickToggleInclude()` (blok+toast kalau tertaut aset &
masih included, boleh toggle balik kalau sudah dikecualikan manual, toggle
bebas utk akun biasa, id tak ketemu), `openAccModal()` (mode tambah vs edit,
prefill, label saldo, hint tertaut aset, `editAccIdx` tersimpan — dibuktikan
via `_saveAccInner()` sesudahnya krn `editAccIdx`/`accIncludeState` adalah
`let` modul-scope yg TIDAK bisa dibaca langsung dari luar `vm` context, lihat
catatan teknis di bawah), `toggleAccInclude()`/`updateAccIncludeBtn()`,
`_saveAccInner()` (validasi nama kosong, tambah baru + fallback emoji, edit
dgn baseBalance dihitung ulang spy saldo tampil = nominal input meski ada
transaksi berjalan, includeInBalance ikut state toggle), dan `delAcc()`
(guard minimal 1 akun, batal konfirmasi, hapus + pindahkan transaksi/tagihan/
BBM/servis/cobek ke akun fallback, aman kalau list terkait undefined semua).

**File baru: `tests/tx-target.test.js` (25 test, seluruh fungsi
`tx-target.js`).** Cakupan: `openTargetModal()` (reset semua field ke
default), `onTargetAccChange()` (tampil/sembunyi `tSavedWrap` sesuai akun
dipilih/tidak), `onTargetDanaDaruratToggle()` (sembunyi hint saat unchecked;
saat checked — rekomendasi 6× rata-rata pengeluaran bulanan dari `FI`, pesan
generik kalau data kosong, isi nama/emoji/amt HANYA kalau masih kosong/default
(tidak menimpa input user), peringatan kalau ada target Dana Darurat lain yg
tandanya akan pindah), `saveTarget()` (validasi nama/amt kosong, `saved` dari
input manual vs dipaksa 0 kalau tertaut akun, fallback emoji, mematikan
`isDanaDarurat` di target lain, memanggil `AlokasiAset.renderAll()` kalau
tersedia & aman kalau tidak), `showTargetAccountTx()` (return awal kalau
target/akun tak ketemu atau tidak tertaut akun, filter+urut transaksi
terbaru dulu, ringkasan jumlah & saldo, empty state), `addTarget()` (batal
prompt, input tak valid, input valid nambah `saved`), dan `delTarget()`
(batal konfirmasi vs hapus).

**Catatan teknis — kenapa `editAccIdx`/`accIncludeState` tidak dites via
akses langsung `ctx.editAccIdx`:** keduanya dideklarasikan `let` di
top-level `akun.js`. Sesuai catatan di `tests/helpers/loadSource.js`, node
`vm` TIDAK otomatis menempelkan binding `let`/`const` ke objek context (beda
dari `function`/`var`), dan parameter `expose` di `loadSource()` cuma
mengambil SNAPSHOT nilai sekali sesaat sesudah semua file dimuat — jadi
`ctx.editAccIdx` tidak pernah ikut ter-update stelah `openAccModal()`
dipanggil, dan assignment manual `ctx.editAccIdx = 0` dari luar juga TIDAK
memengaruhi variabel `let` asli di dalam sandbox (cuma nambah property baru
di objek `ctx`, terpisah dari binding aslinya). Percobaan pertama nulis test
dgn pola ini gagal 4x dgn cara yg membingungkan (nilai balik ke default,
atau assignment "seperti kepakai" tapi ternyata tidak) — diperbaiki dgn
selalu memverifikasi state itu secara TIDAK LANGSUNG lewat efek sampingnya
yg teramati dari luar (teks tombol `accIncludeBtn`, atau hasil nyata
`_saveAccInner()` sesudahnya: apakah update akun yg sudah ada atau malah
nambah akun baru). Kalau modul lain nanti butuh pola serupa (module-state
`let` yg perlu dites lintas pemanggilan fungsi), pakai pendekatan yg sama:
verifikasi lewat efek yg terlihat dr luar, jangan andalkan baca/tulis
`ctx.<namaVariabelLet>` langsung.

**Diverifikasi:**
- `node --test tests/*.test.js` → **443/443 pass, 0 fail** (naik dari 391
  di bagian ke-22, +52 test baru, 0 regresi).
- `node build.js` → sukses, 0 error dari lint guard bawaan, versi naik
  otomatis ke `kw80-merge-advisor-card-dashcards-37` (build #162), kedua
  bundle lolos `node --check` sintaks, `FILE-MAP.md` diregenerasi.
- `npm run lint`/`npx eslint` masih TIDAK bisa dites di sesi ini (sandbox
  tanpa internet, `npm install` gagal 403) — tolong jalankan `npm run lint`
  di lokal sebelum merge/release (sudah menumpuk beberapa file test baru
  dari bagian ke-21/22/23 yg belum divalidasi lint-nya).

**Untuk sesi berikutnya — pilihan saran, urut dari paling ringan:**
1. **(SEDANG)** Sisa modul dari opsi 1 bagian ke-22 yg belum dikerjakan:
   `cicilan.js` (112 baris), `piutang-utang.js` (351 baris), `aset.js`
   (350 baris) — pola sama dgn `akun.js`/`tx-target.js` sesi ini.
2. **(BERAT)** Lanjut cakupan `keamanan-pin.js` ke 100%: lockout PIN
   (butuh fake `setInterval`/`Date.now` yg bisa dimaju-mundurkan) &
   layar PIN interaktif (`pinPress`/`pinBack`/`checkPin`).
3. `cobek.js` (1261 baris, file fitur terbesar yg masih nol test) —
   disisakan paling akhir, butuh sesi tersendiri utk dipetakan dulu
   strukturnya sebelum nulis test.

`akun.js` & `tx-target.js` SEKARANG SUDAH tidak lagi masuk daftar nol-test.
Daftar modul nol-test yg TERSISA: `aset.js`, `cicilan.js`, `cobek.js`,
`piutang-utang.js`, `tx-list-cashflow.js`, `backup-restore.js`,
`payroll-absensi.js`, `kasir.js`, `sewakios.js`, `renovasi.js`,
`tagihan-kalender.js`, `reset-gaji-mingguan.js`, `modals.js`,
`modal-navigasi.js`, `onboarding.js`, `profil-pengaturan.js`, `kategori.js`,
`kategorisasi-ai.js`, `linktx.js`, `filter-laporan.js`,
`diagnostik-versi.js`, `debug-console.js`, `error-handler.js`,
`features-aiwidget-reminder-gdrive-search.js`,
`features-sheets-pwa-selftest.js`.

## Catatan kerja — 2026-07-11 (bagian ke-24): test `cicilan.js` & `piutang-utang.js` — 2 file dari sisa opsi 1 (SEDANG) di saran bagian ke-23

Konteks: user minta kerjakan saran di CLAUDE.md, 2 file dulu. Dari sisa opsi
1 bagian ke-23 (`cicilan.js` 112 baris, `piutang-utang.js` 351 baris,
`aset.js` 350 baris), dipilih `cicilan.js` (jelas terkecil) & `piutang-utang.js`
— BUKAN `aset.js` walau baris nyaris sama (350 vs 351), karena `aset.js`
juga memuat `IDBStore` (helper generik IndexedDB async, co-located tapi
beda domain) yg butuh mock `indexedDB` terpisah & menambah kompleksitas
signifikan tanpa menambah nilai test yg sepadan — lebih pas disisakan sesi
tersendiri (lihat saran #1 di bawah).

**Tidak ada bug ditemukan** — sesi ini murni menambah test yg sebelumnya
nol utk 2 modul ini, tidak ada perubahan di kode aplikasi.

**File baru: `tests/cicilan.test.js` (32 test, seluruh fungsi `cicilan.js`).**
Cakupan: `validateCicilanFields()` (total kosong/≤0, tenor invalid, bunga
negatif — masing2 toast+focus sesuai field, bunga kosong dianggap 0/valid),
`calcCicilanPerBulanFromTotal()`/`calcCicilanTotalFromPerBulan()` (kalkulasi
murni dgn & tanpa bunga), `syncCicilanPreview()` (sumber 'total' vs
'perbulan', nilai 0/kosong -> sembunyikan preview & kosongkan field lawan,
label "Lunas setelah ini" saat tenor 1, porsi shared mode pct vs nominal —
termasuk field mana yg ditulis-ulang vs dibiarkan sbg input asli user,
efek src='sharedPct'/'sharedNominal' ke `cicilanSharedLastInput`),
`getCicilanSharedMine()` (checkbox off, mode pct & nominal dgn clamp
1-99%/0..perBulanFull), `toggleCicilanSharedFields()`, `syncCicilanDate()`
(guard curPayMethod≠cicilan & cicilanDateLinked, sinkron 2 arah tanggal),
dan `openCicilanHistoryFromTx()` (guard billId kosong, buka riwayat).

**File baru: `tests/piutang-utang.test.js` (45 test, seluruh fungsi
`piutang-utang.js` — Piutang/Debt/DebtStrategy/Bill).** Cakupan:
`Piutang.{openModal,toggleLunas,save,delete,totalValue,overdueDays,
sortedActive,renderList}` (validasi nama, edit vs tambah, urutan prioritas
tagih berdasar overdue×nilai lalu jatuh tempo lalu nilai, banner "Prioritas
tagih"), `Debt.{openModal,toggleLunas,save,syncBill,delete,totalValue,
totalCicilanBulanan,renderList}` — termasuk `syncBill()` yg TIDAK dites
terpisah tapi dibuktikan lewat efeknya di `save()`: auto-bikin `Bill` saat
ada cicilan & belum lunas, auto-hapus `Bill` saat ditandai lunas/cicilan
jadi 0, update (bukan duplikat) `Bill` existing & segarkan `nextDue` kalau
sudah lewat, `DebtStrategy.{setMethod,onExtraInput,activeDebts,
computeOrder,computeDSR,simulate,render}` (avalanche vs snowball order,
DSR dari `Debt.totalCicilanBulanan()`+bill cicilan lain / `WorthIt.incomeAvg()`,
simulasi amortisasi bulanan dgn & tanpa dana ekstra, `Debt.renderList()`
memicu `DebtStrategy.render()` otomatis via `typeof` guard), dan
`Bill.openLinkTxModal()` (guard `curBillHistoryId` kosong, buka `LinkTx`).

**Catatan teknis — `Piutang`/`Debt`/`DebtStrategy`/`Bill` perlu `expose` di
`loadSource()`:** keempatnya dideklarasikan `const` di top-level
`piutang-utang.js`. Beda dari `function` (otomatis nempel ke context vm),
`const` TIDAK otomatis jadi properti context (sudah didokumentasikan di
`loadSource.js`, sama kasusnya dgn `MONTHS_FULL` di catatan lama) — kalau
lupa, `ctx.Piutang` dkk jadi `undefined` & manggil method-nya lempar
`TypeError: Cannot read properties of undefined`. Solusi: tambahkan
`['Piutang','Debt','DebtStrategy','Bill']` sbg parameter `expose` ke-3 di
`loadSource()`. Beda dgn kasus `editAccIdx` (module-scope `let` yg butuh
verifikasi TIDAK LANGSUNG lewat efek samping), di sini `expose` CUKUP krn
`Piutang` dkk adalah objek (referensi) yg method-nya bisa dipanggil
langsung dari luar sesudah di-`expose`, bukan primitif yg di-reassign.

**Catatan teknis lain — hindari `assert.deepEqual`/`deepStrictEqual` utk
objek yg dibuat DI DALAM vm context:** percobaan awal `getCicilanSharedMine()`
ditest dgn `assert.deepEqual(r, {shared:false,pct:null,mine:500000})` GAGAL
walau isinya identik ("same structure but not reference-equal") — sebabnya
objek literal yg dibuat kode di dalam sandbox vm punya `Object.prototype`
dari REALM berbeda (sandbox), sedangkan objek pembanding di test dibuat di
realm Node biasa; `deepStrictEqual` (dipakai `node:assert/strict`) ikut
membandingkan prototype makanya gagal walau isi sama. Diperbaiki dgn
assert per-field (`assert.equal(r.shared,...)` dst) — pola yg sama harus
dipakai kalau modul lain nanti mengembalikan objek literal dari dalam vm.

**Diverifikasi:**
- `node --test tests/*.test.js` → **520/520 pass, 0 fail** (naik dari 443
  di bagian ke-23, +77 test baru [32 cicilan + 45 piutang-utang], 0 regresi).
- `node build.js` → sukses, 0 error dari lint guard bawaan, versi naik
  otomatis ke `kw80-merge-advisor-card-dashcards-38` (build #163), kedua
  bundle lolos `node --check` sintaks, `FILE-MAP.md` diregenerasi.
- `npm run lint`/`npx eslint` masih TIDAK bisa dites di sesi ini (sandbox
  tanpa internet, `npm install` gagal 403) — tolong jalankan `npm run lint`
  di lokal sebelum merge/release (sudah menumpuk beberapa file test baru
  dari bagian ke-21/22/23/24 yg belum divalidasi lint-nya).

**Untuk sesi berikutnya — pilihan saran, urut dari paling ringan:**
1. **(SEDANG-BERAT)** `aset.js` (350 baris, TERSISA dari opsi 1 bagian
   ke-22/23) — pola sama dgn modul lain, TAPI perlu extra effort utk
   `IDBStore` (helper generik IndexedDB async yg co-located di file yg
   sama): perlu mock `indexedDB` (mis. via `fake-indexeddb` package kalau
   tersedia offline, atau stub manual `indexedDB.open()`), sedangkan
   `AlokasiAset`/`Aset`/`TimelineW` bisa pakai pola fakeDocument biasa.
   Pertimbangkan pisah jadi 2 test file (`aset.test.js` utk 3 modul sync,
   `idb-store.test.js` khusus async) biar lebih rapi.
2. **(BERAT)** Lanjut cakupan `keamanan-pin.js` ke 100%: lockout PIN
   (butuh fake `setInterval`/`Date.now` yg bisa dimaju-mundurkan) &
   layar PIN interaktif (`pinPress`/`pinBack`/`checkPin`).
3. `cobek.js` (1261 baris, file fitur terbesar yg masih nol test) —
   disisakan paling akhir, butuh sesi tersendiri utk dipetakan dulu
   strukturnya sebelum nulis test.

`cicilan.js` & `piutang-utang.js` SEKARANG SUDAH tidak lagi masuk daftar
nol-test. Daftar modul nol-test yg TERSISA: `aset.js`, `cobek.js`,
`tx-list-cashflow.js`, `backup-restore.js`, `payroll-absensi.js`,
`kasir.js`, `sewakios.js`, `renovasi.js`, `tagihan-kalender.js`,
`reset-gaji-mingguan.js`, `modals.js`, `modal-navigasi.js`, `onboarding.js`,
`profil-pengaturan.js`, `kategori.js`, `kategorisasi-ai.js`, `linktx.js`,
`filter-laporan.js`, `diagnostik-versi.js`, `debug-console.js`,
`error-handler.js`, `features-aiwidget-reminder-gdrive-search.js`,
`features-sheets-pwa-selftest.js`.

## Catatan kerja — 2026-07-11 (bagian ke-25): test `aset.js` — saran #1 (SEDANG-BERAT) dari bagian ke-24

Konteks: user minta kerjakan saran di CLAUDE.md, 2 file. Dari saran bagian
ke-24, dipilih saran #1: `aset.js` (350 baris, TERSISA terakhir dari opsi 1
bagian ke-22/23/24) — dipecah jadi **2 file test** persis seperti yang
disarankan, karena `IDBStore` (helper generik IndexedDB async, co-located di
file yang sama tapi beda domain) butuh mock `indexedDB` async terpisah dari
3 modul sync lain (`AlokasiAset`/`Aset`/`TimelineW`) yang cukup pakai pola
fakeDocument biasa.

**Tidak ada bug ditemukan** — sesi ini murni menambah test yg sebelumnya nol
utk `aset.js`, tidak ada perubahan di kode aplikasi.

**File baru: `tests/aset.test.js` (47 test, 3 modul sync `aset.js`).**
Cakupan: `ALOKASI_PRESETS` (sanity tiap preset total 100%), `AlokasiAset.{
setRisk,onDanaInput,renderOne,renderAll,init}` (render ulang setelah ganti
risiko/dana, chip aktif sesuai index risk konservatif/moderat/agresif, risk
tidak dikenal -> box TIDAK ditulis ulang, dana fallback ke `totalSaldoAkun()`
kalau belum ada tersimpan, banner ajakan buat target Dana Darurat vs progress
ddInfo kalau sudah ada termasuk jalur `accountId` via `recalcAccBalance`),
`Aset.{openModal,updateProfitPreview,toggleZakatable,save,delete,renderList,
totalValue}` (mode tambah vs edit, hitung untung/rugi & class green/red,
validasi nama kosong, hitung `keuntungan`/`keuntunganPct` dari modalInvestasi
kalau ada, editId yang aset-nya sudah hilang, badge zakat & untung/rugi &
status akun tertaut/terhapus di renderList), `PORTFOLIO_LABELS` (regex label
kolom scan portofolio), dan `TimelineW.{avgSurplus,goals,waterfall,
addMonthsToDate,render}` (delegasi ke `Pensiun.avgSurplus()` kalau modul itu
ada, gabungan goal dari proyek Renov & target non-Dana-Darurat, cursor
akumulatif antar goal di waterfall, blok Pensiun on-track vs kurang di render).

**File baru: `tests/idb-store.test.js` (12 test, `IDBStore`).** Mock
`indexedDB` MANUAL dibuat sendiri di file test (bukan pakai package
`fake-indexeddb` — sandbox ini tidak ada akses internet utk `npm install`,
lihat catatan `npm run lint` di bawah) — cukup minimal utk simulasikan
`open()` sukses/gagal, `get`/`put` lewat `transaction()`, dan trigger
`onversionchange`/`onclose` sesuai kontrak yang dipakai `IDBStore`. Cakupan:
`_open()` (`window.indexedDB` tidak ada, cache promise supaya `open()` cuma
sekali, `open()` gagal -> cache di-reset, `onversionchange`/`onclose` ->
db ditutup & cache di-reset), `get`/`set` jalur sukses biasa, dan
`_withRetry()` — bagian paling penting: error biasa TIDAK retry, tapi
`InvalidStateError` ATAU pesan mengandung "closing" (khas Safari) dianggap
koneksi basi -> buang cache & retry SEKALI, kalau percobaan ke-2 juga gagal
baru menyerah & balikin fallback (`undefined` utk `get`, `false` utk `set` —
beda default sesuai yg di-pass masing2 pemanggil).

**Catatan teknis — expose semua modul `const` di `aset.js`, bukan cuma yang
langsung relevan:** selain `ALOKASI_PRESETS`/`PORTFOLIO_LABELS` yang jelas
dibutuhkan, `AlokasiAset`/`Aset`/`TimelineW`/`IDBStore` SEMUA dideklarasikan
`const` di top-level file ini jadi SEMUA perlu masuk parameter `expose` ke-3
`loadSource()` (bukan cuma yang mau dites langsung di 1 file test) — sempat
lupa expose `AlokasiAset`/`Aset`/`TimelineW` di awal & muncul error
`ctx.AlokasiAset`/`ctx.Aset`/`ctx.TimelineW` adalah `undefined`.

**Catatan teknis lain — `AlokasiAset.renderOne()` TIDAK merender
`preset.label`** (cuma `preset.desc` + item2), jadi assert render ulang di
test `setRisk`/`init`/`renderAll` pakai potongan teks `preset.desc` (mis.
"Seimbang antara peluang pertumbuhan..."), BUKAN nama preset ("⚖️ Moderat")
— sempat salah asumsi di percobaan pertama.

**Catatan teknis lain — urutan `openModal()` vs isi field form saat test edit
`Aset.save()`:** `Aset.openModal(id)` PREFILL semua field dari data aset
lama (termasuk nama/nilai), jadi kalau field form di-set duluan lewat
`domValues` SEBELUM `openModal()` dipanggil, nilainya bakal KETIMPA lagi oleh
data lama. Pola yang benar (sama seperti `_saveAccInner` edit test di
`akun.test.js`): panggil `openModal(id)` dulu, BARU ubah `fakeDocument.
getElementById(...).value` sesudahnya utk simulasikan user mengedit.

**Diverifikasi:**
- `node --test tests/*.test.js` → **579/579 pass, 0 fail** (naik dari 520 di
  bagian ke-24, +59 test baru [47 aset.test.js + 12 idb-store.test.js],
  0 regresi).
- `node build.js` → sukses, 0 error dari lint guard bawaan, versi naik
  otomatis ke `kw80-merge-advisor-card-dashcards-39` (build #164), kedua
  bundle lolos `node --check` sintaks, `FILE-MAP.md` diregenerasi (`aset.js`
  otomatis hilang dari daftar "nol-test" begitu digenerate ulang — cek
  daftar di bawah, bukan di FILE-MAP.md, krn itu bukan yg dilacaknya).
- `npm run lint`/`npx eslint` masih TIDAK bisa dites di sesi ini (sandbox
  tanpa internet, `npm install`/`npx eslint` gagal 403) — tolong jalankan
  `npm run lint` di lokal sebelum merge/release (sudah menumpuk beberapa
  file test baru dari bagian ke-21/22/23/24/25 yg belum divalidasi lint-nya).

**Untuk sesi berikutnya — pilihan saran, urut dari paling ringan:**
1. **(BERAT)** Lanjut cakupan `keamanan-pin.js` ke 100%: lockout PIN (butuh
   fake `setInterval`/`Date.now` yg bisa dimaju-mundurkan) & layar PIN
   interaktif (`pinPress`/`pinBack`/`checkPin`).
2. `cobek.js` (1261 baris, file fitur terbesar yg masih nol test) — disisakan
   paling akhir, butuh sesi tersendiri utk dipetakan dulu strukturnya sebelum
   nulis test.
3. Modul menengah yg masih nol test (350 baris ke bawah, pola serupa modul yg
   sudah dites): `tx-list-cashflow.js`, `backup-restore.js`,
   `payroll-absensi.js`, `kasir.js`, `sewakios.js`, `renovasi.js`,
   `tagihan-kalender.js`.

`aset.js` SEKARANG SUDAH tidak lagi masuk daftar nol-test (baik 3 modul
sync-nya maupun `IDBStore`). Daftar modul nol-test yg TERSISA: `cobek.js`,
`tx-list-cashflow.js`, `backup-restore.js`, `payroll-absensi.js`, `kasir.js`,
`sewakios.js`, `renovasi.js`, `tagihan-kalender.js`, `reset-gaji-mingguan.js`,
`modals.js`, `modal-navigasi.js`, `onboarding.js`, `profil-pengaturan.js`,
`kategori.js`, `kategorisasi-ai.js`, `linktx.js`, `filter-laporan.js`,
`diagnostik-versi.js`, `debug-console.js`, `error-handler.js`,
`features-aiwidget-reminder-gdrive-search.js`, `features-sheets-pwa-selftest.js`.
(`keamanan-pin.js` TIDAK termasuk daftar ini — sudah PARSIAL ada test dari
sesi lebih lama, cek `tests/keamanan-pin.test.js` & catatan kerja terkait utk
lihat fungsi apa saja yg masih kosong.)

## Catatan kerja — 2026-07-11 (bagian ke-26): test `tx-list-cashflow.js` (dipecah jadi 2 file test)

Konteks: user minta kerjakan 2 file "menengah" dari daftar nol-test di
bagian ke-25. Dipilih `tx-list-cashflow.js` (160 baris, 9 fungsi: `txHTML`,
`delTx`, `changeMonth`, `setTxListPeriode`, `getTxListRange`, `setPeriode`,
`getRange`, `computeCashflowForecast`, `setKeuanganTab`) — sebelumnya nol
test sama sekali.

**Tidak ada bug ditemukan** — sesi ini murni menambah test yg sebelumnya nol
utk `tx-list-cashflow.js`, tidak ada perubahan di kode aplikasi.

**Dipecah jadi 2 file test** (bukan 1), pola sama seperti `aset.js` →
`aset.test.js` + `idb-store.test.js` di bagian ke-25 — file ini punya 2
kelompok fungsi dgn kebutuhan mock yg beda jauh:

**File baru: `tests/tx-list-cashflow-render.test.js` (22 test).** Kelompok
render/filter yg cukup di-stub DOM sederhana: `txHTML` (icon/warna sesuai
tipe & kategori, transfer selalu ⇄, fallback icon default kalau kategori tak
ketemu, acc-chip, subcategory/note, badge payMethod), `changeMonth` (wrap
bulan/tahun ke depan & ke belakang), `setTxListPeriode`+`getTxListRange`
(selamanya/bulan/hari/minggu/tahun/custom), `setPeriode`+`getRange` (versi
Laporan, elemen DOM beda dari List Transaksi tapi logic serupa),
`setKeuanganTab` (toggle panel kelola vs laporan, fallback pilih tombol dari
querySelectorAll kalau `el` tidak diberikan).

**File baru: `tests/tx-list-cashflow-deltx.test.js` (24 test).** Kelompok
side-effect berat: `delTx` (18 test mencakup semua cabang: batal konfirmasi,
tanpa link, bbmLinkId, stockItems multi-produk + clamp ke 0, stockProductId
single-produk, cobekLinkId dgn/tanpa items dgn/tanpa entry ketemu,
servisLinkId dgn/tanpa usedPartId dgn/tanpa D.servisLogs, renovItemLinkId/
wishlistLinkId/sewaKiosLinkId/tukangPaymentEntryIds beserta suffix toast
masing2) & `computeCashflowForecast` (6 test: default vs BudgetReko
terdefinisi, incAvg/expAvg dari transaksi dlm rentang, billsDue dari
tagihan ≤30 hari, projected).

**Catatan teknis — 2 edge case toast `delTx` yg gampang salah asumsi kalau
cuma baca sekilas:**
- `stockProductId` set tapi produknya sudah tidak ada di `D.products`:
  TIDAK ADA toast sama sekali (bukan toast generik "🗑 Dihapus") — toast
  stok butuh `p` ketemu, sedangkan toast generik di baris akhir ditekan
  krn kondisinya cuma cek `t.stockProductId` truthy, TIDAK peduli apakah
  produknya ketemu atau tidak.
- `servisLinkId` set tapi `D.servisLogs` tidak ada sama sekali: seluruh
  blok servis (termasuk toast "🔧 Catatan servis...") dilewati krn guard
  `&&D.servisLogs`, TAPI toast generik di akhir JUGA ikut tertekan (kondisi
  akhir cuma cek `t.servisLinkId`, tidak peduli `D.servisLogs` ada atau
  tidak) — hasilnya TIDAK ADA toast sama sekali di kasus ini, sempat salah
  tebak di percobaan pertama (dikira toast generik tetap muncul).

**Catatan teknis lain — variabel global bebas vs module-scoped `let`:**
`curMonth`/`curYear`/`txListPage`/`filterPeriode` dideklarasikan di
`features-helpers-global-security.js` (bukan di `tx-list-cashflow.js`),
diassign langsung tanpa `let` di file ini — sama pola dgn
`cicilanLastInput` dkk di `cicilan.test.js`: bisa diinject & dibaca balik
langsung lewat `extraGlobals` `loadSource()`, TANPA trik `expose`.
`txListPeriode` BEDA — itu `let txListPeriode='bulan'` module-scoped DI
DALAM `tx-list-cashflow.js` sendiri, jadi dites lewat parameter `expose`
`loadSource()` (dibaca via `ctx.txListPeriode` setelah `expose:
['txListPeriode']`) — beda dari pola `editAccIdx` di `akun.test.js` yg
sengaja TIDAK dibaca langsung (di sini dibaca langsung krn tidak perlu
verifikasi lewat pemanggil kedua, cukup baca state akhir).

**Diverifikasi:**
- `node --test tests/*.test.js` → **625/625 pass, 0 fail** (naik dari 579
  di bagian ke-25, +46 test baru [22 render + 24 deltx/forecast], 0 regresi).
- `node build.js` → sukses, versi naik otomatis ke
  `kw80-merge-advisor-card-dashcards-40` (build #165), kedua bundle lolos
  `node --check` sintaks, `FILE-MAP.md` diregenerasi (52 file — 2 file test
  baru ikut kehitung di index fungsi global, `tx-list-cashflow.js` otomatis
  hilang dari daftar nol-test).
- `node --check tx-list-cashflow.js` → sintaks OK (tidak ada kode aplikasi
  yg diubah sesi ini).
- `npm run lint`/`npx eslint` TIDAK bisa dites di sesi ini (sandbox tanpa
  internet, `npm install`/`npx eslint` gagal 403) — sama seperti
  keterbatasan sesi-sesi sebelumnya, tolong jalankan `npm run lint` sebelum
  merge/release.
- Smoke-test browser TIDAK dijalankan ulang sesi ini — perubahan murni
  penambahan file test, tidak menyentuh kode runtime app sama sekali
  (`tx-list-cashflow.js` tidak diubah), jadi risiko regresi UI nol.

**Untuk sesi berikutnya — daftar modul nol-test yg TERSISA (2 sudah
selesai sesi ini):** `cobek.js` (1261 baris, terbesar, disisakan paling
akhir — butuh sesi tersendiri utk dipetakan strukturnya dulu),
`backup-restore.js`, `payroll-absensi.js`, `kasir.js`, `sewakios.js`,
`renovasi.js`, `tagihan-kalender.js`, `reset-gaji-mingguan.js`, `modals.js`,
`modal-navigasi.js`, `onboarding.js`, `profil-pengaturan.js`, `kategori.js`,
`kategorisasi-ai.js`, `linktx.js`, `filter-laporan.js`,
`diagnostik-versi.js`, `debug-console.js`, `error-handler.js`,
`features-aiwidget-reminder-gdrive-search.js`,
`features-sheets-pwa-selftest.js`.

## Catatan kerja — 2026-07-11 (bagian ke-27): test `kategori.js` + `kategorisasi-ai.js`

Konteks: user minta kerjakan 2 file "kecil" dari daftar nol-test di bagian
ke-26. Dipilih `kategori.js` (167 baris, 19 fungsi: CRUD Kategori & Subkategori
+ filter dropdown) dan `kategorisasi-ai.js` (185 baris, objek `AutoKat` dgn
6 method: AI auto-kategorisasi dari catatan bebas Input Transaksi) —
sebelumnya nol test sama sekali utk keduanya.

**Tidak ada bug ditemukan** — sesi ini murni menambah test yg sebelumnya
nol utk kedua file, tidak ada perubahan di kode aplikasi.

**File baru: `tests/kategori.test.js` (56 test).** Cakupan: `getAllCats`/
`getCatsByType`/`getCat`/`getCatByType` (termasuk kasus nama kategori
duplikat di income & expense — dipilih yg subs-nya paling banyak),
`uniqueCatList`/`subNamesForCat`, `populateCatSelect`/`populateSubSelect`
(preserve value lama kalau masih valid, reset ke "semua" kalau tidak),
`openCatModal`/`delCatFromModal`/`setCatModalType`/`refreshTxCatIfOpen`,
`saveCat`/`delCat` (rename kategori ikut menyesuaikan `category` di
transaksi & bills, pesan konfirmasi beda utk kategori bawaan/default vs
kategori yg masih dipakai transaksi), `openSubCatModal`/`saveSubCat`/
`delSubCat` (rename subkategori ikut menyesuaikan `subcategory` di
transaksi & bills — HANYA yg `category`-nya juga cocok), `toggleCatGroup`,
`filterCat`.

**File baru: `tests/kategorisasi-ai.test.js` (34 test).** Cakupan seluruh
method `AutoKat`: `onNoteInput` (debounce 750ms, tebakan lokal instan hanya
utk expense & field kategori kosong), `hideSuggest`, `runAiSuggest`
(guard: catatan <4 char, tanpa API key, catatan sama dgn query terakhir,
tidak ada kategori sama sekali, AI balas kategori di luar daftar yg
diizinkan → diabaikan, respons gagal/error/JSON tidak valid → ditangkap
diam-diam, field Keterangan berubah sejak request dikirim → saran basi
tidak ditampilkan, token check request basi), `renderSuggest`, `apply`
(isi kategori+subkategori via `selectTxCat`/`selectTxSubCat` atau fallback
`txCat.value` langsung, lalu "belajar" ke `D.learnedItemCat`), `learnFromNote`
(filter stopword/angka/kata <4 huruf, maksimal 4 kata kunci per catatan).

**Catatan teknis — dependency lintas-file yg perlu di-stub manual:**
- `kategori.js`: state module-scoped (`catEditIdx`/`curCatModalType`/
  `catModalCallback`/`subCatParentId`/`subCatParentType`/`subCatEditId`/
  `curCatFilter`) TIDAK dideklarasikan `let` di file ini sendiri (dideklarasikan
  di `features-helpers-global-security.js`) — pola sama dgn `curMonth`/
  `curYear` di `tx-list-cashflow.test.js`: diinject & dibaca balik langsung
  lewat `extraGlobals` `loadSource()`, tanpa trik `expose`.
- `kategori.js`: `DEFAULT_CATS` didefinisikan di `renovasi.js` (di luar
  cakupan test ini) — di-stub `{income:[],expense:[]}` per default, sama
  pola dgn `identitas.test.js`.
- `kategori.js`: `populateCatSelect` baca `[...sel.options]` (bukan cuma
  `innerHTML`) buat cek value lama masih valid — `fakeDom.js` TIDAK
  mem-parsing `innerHTML` jadi elemen beneran, jadi ditambah helper lokal
  `withOptionsSupport(el)` (override `innerHTML` jadi accessor yg
  meng-extract `<option value="...">` via regex ke `el.options`) khusus
  test file ini, TIDAK diubah di `helpers/fakeDom.js` bersama (supaya tidak
  mempengaruhi test lain).
- `kategorisasi-ai.js`: `getCatsByType` berasal dari `kategori.js` (tidak
  di-load bareng) — di-stub baca langsung dari `D.categories[type]`.
- `kategorisasi-ai.js`: `setTimeout`/`clearTimeout` bawaan `loadSource()`
  cuma stub no-op (return 0, TIDAK menjalankan callback) — disuntik fake
  timer LOKAL (simpan `{id,fn,ms}`, TIDAK auto-invoke) via `extraGlobals`,
  supaya `onNoteInput` bisa dites bagian debounce-nya (terjadwal/clearTimeout)
  terpisah dari `runAiSuggest` yg dites LANGSUNG (tanpa lewat timer) — pola
  sama semangatnya dgn `_saveAccInner`/`_saveInner` di file lain.

**Catatan teknis — jebakan yg sempat salah di percobaan pertama:**
- Field DOM (`catName`/`catEmoji`) yg di-set lewat `domValues` SEBELUM
  `openCatModal()` dipanggil ketimpa lagi oleh `openCatModal()` (persis
  peringatan yg sudah didokumentasikan di bagian ke-24 soal `openModal()`
  vs `domValues`) — diperbaiki: panggil `openCatModal()` dulu, baru set
  `fakeDocument.getElementById(...).value` sesudahnya.
- Return value function yg lahir di dalam vm context (array/objek dari
  `getCat`/`uniqueCatList`/`subNamesForCat`) TIDAK bisa dibandingkan pakai
  `assert.deepEqual`/`deepStrictEqual` (beda prototype/realm dgn host,
  sudah didokumentasikan di `aset.test.js`/`fi-calc.test.js`) — dipakai
  helper lokal `sameJson()` (`JSON.stringify` kedua sisi) di
  `kategori.test.js`.
- `opts.selectTxCat || defaultFn` di helper `makeAutoKat` awalnya bikin
  test "selectTxCat tidak tersedia (fallback ke txCat.value)" gagal karena
  `undefined || defaultFn` tetap balik `defaultFn` — diperbaiki pakai
  `'selectTxCat' in opts ? opts.selectTxCat : defaultFn` supaya `undefined`
  yg SENGAJA dioper tidak diam-diam ketimpa.

**Diverifikasi:**
- `node --test tests/*.test.js` → **715/715 pass, 0 fail** (naik dari 625
  di bagian ke-26, +90 test baru [56 kategori + 34 kategorisasi-ai], 0 regresi).
- `node build.js` → sukses, versi naik otomatis ke
  `kw80-merge-advisor-card-dashcards-41` (build #166), kedua bundle lolos
  `node --check` sintaks, `FILE-MAP.md` diregenerasi (50 file, 852
  identifier — `kategori.js`/`kategorisasi-ai.js` otomatis hilang dari
  daftar nol-test).
- `npm run lint`/`npx eslint` TIDAK bisa dites di sesi ini (sandbox tanpa
  internet, `npm install`/`npx eslint` gagal 403) — sama seperti
  keterbatasan sesi-sesi sebelumnya, tolong jalankan `npm run lint` sebelum
  merge/release.
- Smoke-test browser TIDAK dijalankan ulang sesi ini — perubahan murni
  penambahan file test, tidak menyentuh kode runtime app sama sekali
  (`kategori.js`/`kategorisasi-ai.js` tidak diubah), jadi risiko regresi
  UI nol.

**Untuk sesi berikutnya — daftar modul nol-test yg TERSISA (2 sudah
selesai sesi ini):** `cobek.js` (1261 baris, terbesar, disisakan paling
akhir — butuh sesi tersendiri utk dipetakan strukturnya dulu),
`backup-restore.js`, `payroll-absensi.js`, `kasir.js`, `sewakios.js`,
`renovasi.js`, `tagihan-kalender.js`, `reset-gaji-mingguan.js`, `modals.js`,
`modal-navigasi.js`, `onboarding.js`, `profil-pengaturan.js`, `linktx.js`,
`filter-laporan.js`, `diagnostik-versi.js`, `debug-console.js`,
`error-handler.js`, `features-aiwidget-reminder-gdrive-search.js`,
`features-sheets-pwa-selftest.js`.

## Catatan kerja — 2026-07-11 (bagian ke-28): test `error-handler.js` + `onboarding.js`

Konteks: lanjutan daftar modul nol-test dari bagian ke-27, dikerjakan dari yang
paling RINGAN dulu (urutan baris): `modals.js` (6 baris, dilewati — murni array
string HTML modal statis, tidak ada logic buat dites) → `error-handler.js` (37
baris) → `onboarding.js` (40 baris). Kedua file ini sebelumnya nol test sama
sekali.

**Tidak ada bug ditemukan** — sesi ini murni menambah test yg sebelumnya nol
utk kedua file, tidak ada perubahan di kode aplikasi.

**File baru: `tests/error-handler.test.js` (11 test).** Cakupan
`_friendlyErrorNotice`: pesan normal (toast dgn detail & durasi 5000ms),
pesan `undefined` (detail dikosongkan, bukan jadi string `": undefined"`),
pesan >120 karakter dipotong, throttle 3 detik (panggilan kedua dlm window
diabaikan, tepat di batas 3000ms jalan lagi), fallback ke `console.warn`
kalau `toast` belum jadi function, error yg dilempar `toast()` sendiri
ditangkap diam-diam (tidak crash). Juga dites 2 listener global
`window.addEventListener('error'/'unhandledrejection', ...)`: format
`console.error` yg benar (`e.error||e.message` utk listener error,
`e.reason` utk unhandledrejection), serta bukti kedua listener berbagi
throttle counter yang sama (`_lastErrorToastAt` global, bukan per-listener).

**File baru: `tests/onboarding.test.js` (7 test).** Cakupan
`updateOnboardPreview`: guard elemen `obPreviewBox` tidak ada (return dini
tanpa error), rumus estimasi (`gaji×26` hari kerja, dikurangi `kirim×4`),
warna hijau/merah sesuai tanda hasil, fallback `||0` utk input
kosong/non-angka. Cakupan `finishOnboard`: PIN bukan 4 digit ditolak (tidak
menyimpan apapun, `showAlertModal` dipanggil dgn pesan yg benar), alur
sukses (profil tersimpan persis sesuai field, PIN di-hash via `hashPin`,
`_sessionRawPin` ke-set, `kw_pin`/`kw_setup` ke-`safeSetItem`, `save()` &
`showMain()` terpanggil, elemen `#onboard` disembunyikan), & default value
nama/gaji/kiriman kalau field dikosongkan.

**Catatan teknis — kenapa `window`/`Date` perlu di-mock manual utk
`error-handler.js`:** stub bawaan `loadSource()` (`makePermissiveStub`)
sengaja permisif tapi TIDAK stateful — `window.addEventListener(...)`
selalu balik stub baru tanpa nyimpen handler-nya, jadi listener yg
didaftarkan tidak bisa dipanggil balik dari test. Begitu juga `Date.now()`
asli tidak bisa dimaju-mundurkan tanpa nunggu beneran (throttle-nya 3
detik). Solusinya: `extraGlobals: { window: fakeWindow, Date: fakeDate }`
dgn `fakeWindow.addEventListener` yg nyimpen handler ke object biasa
(`listeners[evt]=fn`) & `fakeDate={now:()=>t}` (bisa diubah lewat closure
`setTime()`) — cukup krn `error-handler.js` cuma pakai `Date.now()`, tidak
perlu tiruan class `Date` penuh.

**Catatan teknis — jebakan yg sempat salah di percobaan pertama:**
- Beberapa test awal pakai `time: 1000` sbg waktu awal, tapi
  `_lastErrorToastAt` module-scoped mulai dari `0` — jadi `now(1000)-0=1000`
  masih `<3000`, throttle nge-blok toast PERTAMA yang harusnya lolos.
  Diperbaiki: waktu awal test non-throttle dinaikkan ke `>=3000` (dipakai
  `5000`) supaya panggilan pertama tidak keblokir throttle residual dari
  `_lastErrorToastAt=0`.
- `assert.deepEqual(D.profile, {...})` di `onboarding.test.js` gagal
  (`reference-equal` check) krn `D.profile` lahir di dalam vm context, beda
  prototype/realm dgn object literal host — pola yg sama persis sudah
  didokumentasikan di `aset.test.js`/`fi-calc.test.js`/`kategori.test.js`.
  Diperbaiki: bandingkan lewat `JSON.stringify` kedua sisi.
- `modals.js` (6 baris efektif, isinya cuma 1 array `MODAL_HTML` berisi
  string HTML mentah blok modal) SENGAJA dilewati — bukan "belum sempat",
  tapi memang tidak ada logic murni utk dites di sana (beda dari file lain
  di daftar nol-test yang semuanya punya fungsi).

**Diverifikasi:**
- `node --test tests/*.test.js` → **733/733 pass, 0 fail** (naik dari 715
  di bagian ke-27, +18 test baru [11 error-handler + 7 onboarding], 0 regresi).
- `node build.js` → sukses, versi naik otomatis ke
  `kw80-merge-advisor-card-dashcards-42` (build #167), kedua bundle lolos
  `node --check` sintaks, `FILE-MAP.md` diregenerasi (50 file, 852
  identifier — `error-handler.js`/`onboarding.js` otomatis hilang dari
  daftar nol-test).
- `npm run lint`/`npx eslint` TIDAK bisa dites di sesi ini (sandbox tanpa
  internet, `npm install`/`npx eslint` gagal 403) — sama seperti
  keterbatasan sesi-sesi sebelumnya, tolong jalankan `npm run lint` sebelum
  merge/release.
- Smoke-test browser TIDAK dijalankan ulang sesi ini — perubahan murni
  penambahan file test, tidak menyentuh kode runtime app sama sekali
  (`error-handler.js`/`onboarding.js` tidak diubah), jadi risiko regresi
  UI nol.

**Untuk sesi berikutnya — daftar modul nol-test yg TERSISA (2 sudah
selesai sesi ini, `modals.js` dilewati krn murni data statis tanpa
logic):** `debug-console.js` (48 baris), `diagnostik-versi.js` (76 baris),
`profil-pengaturan.js` (81 baris), `reset-gaji-mingguan.js` (86 baris),
`filter-laporan.js` (220 baris), `kasir.js` (221 baris), `sewakios.js` (242
baris), `linktx.js` (244 baris), `modal-navigasi.js` (284 baris),
`payroll-absensi.js` (365 baris), `renovasi.js` (437 baris),
`tagihan-kalender.js` (443 baris), `backup-restore.js` (718 baris),
`cobek.js` (1261 baris, terbesar, disisakan paling akhir — butuh sesi
tersendiri utk dipetakan strukturnya dulu),
`features-aiwidget-reminder-gdrive-search.js` (1586 baris),
`features-sheets-pwa-selftest.js` (2361 baris). Lanjutkan urutan
ringan→berat: `debug-console.js` berikutnya.

## Catatan kerja — 2026-07-11 (bagian ke-29): test `debug-console.js` + perbaikan test basi Kekayaan Bersih

Konteks: lanjutan daftar modul nol-test dari bagian ke-28, urutan ringan→berat:
`debug-console.js` (48 baris) berikutnya. Sesi ini juga memperbaiki 1 test
in-app (`getSelfTestCases()` di `features-sheets-pwa-selftest.js`) yang gagal
karena rumus ekspektasinya basi, ketinggalan dari formula asli `renderBersih()`.

**Perbaikan test basi (bukan bug aplikasi):** test "Buku Aset: totalAssetValue()
& Kekayaan Bersih konsisten" cuma bandingkan `saldoAkun+totalAset-utangManual`,
padahal `Kekayaan.renderBersih()` (modules-calc.js) sudah lama diperluas ikut
memasukkan `totalPiutangValue()` (piutang menambah) dan `totalDebtValue()`
(utang tercatat lain, bukan cuma `utangJT` manual) ke rumus Kekayaan Bersih.
Diperbaiki: rumus ekspektasi di test disamakan dgn `renderBersih()` +
pesan assert ditambah nilai aktual vs ekspektasi biar lebih gampang didiagnosis
kalau gagal lagi nanti.

**File baru: `tests/debug-console.test.js` (14 test).** Cakupan
`updateDebugConsoleBtn` (tombol tidak ada -> return dini, teks sesuai status
aktif/tidak) & `toggleDebugConsole`: alur mematikan (hapus key, `eruda.destroy()`
dipanggil HANYA kalau `window.eruda` ada, error dari `destroy()` ditangkap diam-diam),
alur mengaktifkan saat eruda SUDAH pernah dimuat (`window.eruda` ada -> langsung
`eruda.init()`, tidak bikin `<script>` baru), dan alur lazy-load CDN saat eruda
BELUM pernah dimuat (key `kw_debug_console` di-set OPTIMIS duluan sebelum script
selesai load, `<script>` di-append ke `document.head` kalau ada / fallback ke
`document.documentElement`, `onload` sukses vs `onload` yg `eruda.init()`-nya
error tetap toast+update tombol tapi pesannya beda, `onerror` rollback key +
toast pesan butuh internet).

**Catatan teknis — kenapa `window.eruda` & `eruda` (bare global) perlu disuntik
manual biar konsisten:** di browser asli, `window` ADALAH global object, jadi
`window.eruda` dan bare `eruda` otomatis nunjuk objek yang sama begitu script
CDN eruda selesai load. Stub `loadSource()` yang dipakai di sini `window` cuma
objek biasa terpisah dari context vm top-level, jadi kalau tidak disamakan
manual, `if(window.eruda)` (dipakai `toggleDebugConsole` utk pre-check) & bare
`eruda.init()`/`eruda.destroy()` (dipakai langsung, bukan lewat `window.`) bisa
nunjuk 2 objek beda dan test jadi salah baca. Solusi: helper `setEruda()`/opsi
`erudaPresent` di test set KEDUANYA (`fakeWindow.eruda` dan `ctx.eruda`) ke
objek yang sama.

**Diverifikasi:**
- `node --test tests/*.test.js` → **747/747 pass, 0 fail** (naik dari 733 di
  bagian ke-28, +14 test baru [debug-console], 0 regresi).
- `node build.js` → sukses, versi naik otomatis, kedua bundle lolos
  `node --check` sintaks, `FILE-MAP.md` diregenerasi (`debug-console.js`
  otomatis hilang dari daftar nol-test).
- `npm run lint`/`npx eslint` TIDAK bisa dites di sesi ini (sandbox tanpa
  internet, `npm install` gagal) — tolong jalankan `npm run lint` sebelum
  merge/release.
- Smoke-test browser TIDAK dijalankan ulang sesi ini — perubahan test murni
  tidak menyentuh `debug-console.js`/`modules-calc.js` (logic asli tidak
  diubah, cuma rumus ekspektasi di 1 test in-app), risiko regresi UI nol.

**Untuk sesi berikutnya — daftar modul nol-test yg TERSISA (1 sudah selesai
sesi ini):** `diagnostik-versi.js` (76 baris), `profil-pengaturan.js` (81
baris), `reset-gaji-mingguan.js` (86 baris), `filter-laporan.js` (220 baris),
`kasir.js` (221 baris), `sewakios.js` (242 baris), `linktx.js` (244 baris),
`modal-navigasi.js` (284 baris), `payroll-absensi.js` (365 baris),
`renovasi.js` (437 baris), `tagihan-kalender.js` (443 baris),
`backup-restore.js` (718 baris), `cobek.js` (1261 baris, terbesar, disisakan
paling akhir), `features-aiwidget-reminder-gdrive-search.js` (1586 baris),
`features-sheets-pwa-selftest.js` (2361 baris). Lanjutkan urutan
ringan→berat: `diagnostik-versi.js` berikutnya.

## Catatan kerja — 2026-07-11 (bagian ke-30): test `diagnostik-versi.js`

Konteks: lanjutan daftar modul nol-test dari bagian ke-29, urutan ringan→berat:
`diagnostik-versi.js` (76 baris) berikutnya. Tidak ada bug ditemukan — murni
menambah test yg sebelumnya nol, tidak ada perubahan di kode aplikasi.

**File baru: `tests/diagnostik-versi.test.js` (17 test).** Cakupan
`getHtmlSnapshotForSelfTest` (proxy tipis ke `document.documentElement.outerHTML`),
`computeProductionSyncStatus` (sinkron vs ketinggalan, format label beda antara
2 cabang — cabang sinkron pakai prefix `v` sebelum nomor versi, cabang
ketinggalan TIDAK), `computeModuleSyncStatus` (semua sinkron, 1 modul
ketinggalan, variabel versi modul belum ke-load sama sekali via
`typeof x!=='undefined'`), IIFE `_checkModuleVersionSync` yang **jalan
otomatis saat file di-load** (semua sinkron → tidak ada warn/toast; 1 atau
lebih modul beda versi → console.warn + toast durasi 6000 berisi daftar file
bermasalah; `toast` belum jadi function → tetap warn, tidak crash; error tak
terduga di dalam cek → ditangkap `catch` luar, lapor via `console.error`), dan
`computeFileSizeStatus` (boundary persis di `FILE_SIZE_WARN_BYTES`=2.0MB &
`FILE_SIZE_ACTION_BYTES`=2.5MB, termasuk kasus off-by-one 1 byte di bawah
tiap ambang).

**Catatan teknis — kenapa test file ini beda pola dari file lain:** IIFE
top-level `_checkModuleVersionSync()` di `diagnostik-versi.js` jalan sekali
otomatis PERSIS saat `loadSource()` mengeksekusi file (bukan saat fungsi
dipanggil manual seperti file lain) — jadi tiap skenario kombinasi versi beda
butuh `loadSource()` BARU (tidak bisa reuse 1 `ctx` utk banyak `test()` spt
pola file lain di repo ini), karena side-effect-nya sudah "kejadian" di
load-time, tidak bisa di-reset.

**Catatan teknis — jebakan yg sempat salah di percobaan pertama:** versi test
awal dipakai `'v100'`/`'v50'` dst sbg NILAI variabel (mis.
`MODAL_VERSION='v99'`), padahal source-nya sendiri sudah nambahin prefix `'v'`
di beberapa tempat (`'...v'+modalVersion`) — hasilnya jadi dobel `vv99` di
pesan. Diperbaiki: nilai versi di test pakai angka polos tanpa prefix
(`'100'`, `'99'`, dst), meniru cara `APP_BUILD_VERSION` asli dipakai
(angka/label build, prefix `v` cuma ditambah di template string tempat
dipakai, tidak di value-nya). Juga 1 test awal cuma nge-override
`APP_BUILD_VERSION` sendirian tanpa nyamain versi modul lain ke nilai yg sama
→ salah nangkep `allOk` jadi `false` padahal maksudnya semua-sinkron;
diperbaiki dgn override eksplisit ke-5 variabel versi ke nilai yg sama.

**Diverifikasi:**
- `node --test tests/*.test.js` → **764/764 pass, 0 fail** (naik dari 747 di
  bagian ke-29, +17 test baru [diagnostik-versi], 0 regresi).
- `node build.js` → sukses, versi naik otomatis, kedua bundle lolos
  `node --check` sintaks, `FILE-MAP.md` diregenerasi (`diagnostik-versi.js`
  otomatis hilang dari daftar nol-test).
- `npm run lint`/`npx eslint` TIDAK bisa dites di sesi ini (sandbox tanpa
  internet) — tolong jalankan `npm run lint` sebelum merge/release.
- Smoke-test browser TIDAK dijalankan ulang sesi ini — perubahan test murni,
  `diagnostik-versi.js` tidak diubah sama sekali, risiko regresi UI nol.

**Untuk sesi berikutnya — daftar modul nol-test yg TERSISA (1 sudah selesai
sesi ini):** `profil-pengaturan.js` (81 baris), `reset-gaji-mingguan.js` (86
baris), `filter-laporan.js` (220 baris), `kasir.js` (221 baris), `sewakios.js`
(242 baris), `linktx.js` (244 baris), `modal-navigasi.js` (284 baris),
`payroll-absensi.js` (365 baris), `renovasi.js` (437 baris),
`tagihan-kalender.js` (443 baris), `backup-restore.js` (718 baris),
`cobek.js` (1261 baris, terbesar, disisakan paling akhir),
`features-aiwidget-reminder-gdrive-search.js` (1586 baris),
`features-sheets-pwa-selftest.js` (2361 baris). Lanjutkan urutan
ringan→berat: `profil-pengaturan.js` berikutnya.

## Catatan kerja — 2026-07-11 (bagian ke-31): test `profil-pengaturan.js`

Konteks: lanjutan daftar modul nol-test dari bagian ke-30, urutan
ringan→berat: `profil-pengaturan.js` (81 baris) berikutnya. Tidak ada bug
ditemukan — murni menambah test yg sebelumnya nol, tidak ada perubahan di
kode aplikasi.

**File baru: `tests/profil-pengaturan.test.js` (31 test).** Cakupan
`autoSaveProfile` (baca semua input form profil & tulis ke `D.profile`,
fallback default nama/gaji/kiriman kalau kosong/non-angka, field opsional
lembur/tarif-minggu/tanggal-lahir/API-key/provider yg masing2 dijaga guard
`if(el)` sendiri, `persistApiKeyEncrypted()` cuma jalan kalau elemen
`sApiKey` ada, `save()` tepat 1x), `profilePTKPStatus`/`profileJiwaKeluarga`
(pasangan fungsi murni yg SAMA-SAMA baca `statusKawin`/`tanggungan` tapi beda
aturan clamp — PTKP status di-clamp maksimal 3 tanggungan buat kode `TK0`..`K3`,
sedangkan hitung jiwa keluarga TIDAK di-clamp sama sekali), `updateProfilPTKPPreview`
(format tampilan beda antara cabang `TK`/`K`, mis. `TK0`→`TK/0` vs `K2`→`K/2`),
`updateUsiaPreview` (sembunyi kalau tanggal lahir kosong, tampil + panggil
`fiCalcAge` kalau ada), `selectStatusKawin`/`selectTanggungan`/`selectStatusPekerjaan`
(toggle chip aktif via `querySelectorAll`, update state, panggil `save()`,
`selectStatusPekerjaan` tambahan panggil `renderPajakRekomendasi(true)`), dan
`toggleApiKeyHint` (placeholder & link bantuan beda antara provider `gemini`
vs lainnya).

**Catatan teknis — jebakan yg sempat salah di percobaan pertama:**
`fakeDom.js` punya `getElementById` yg SELALU meng-auto-vivifikasi elemen
kosong (tidak pernah balik `null`/`undefined`), jadi 2 test awal yg
mengasumsikan "elemen opsional tidak didaftarkan di `domInitial` → guard
`if(el)` gagal" ternyata salah — elemen tetap ada (kosong), guard tetap lolos,
cuma fallback ke nilai default krn `value` kosong. Diperbaiki dgn pola yg
sudah ada di file test lain (`akun.test.js`/`aset.test.js`): override
`fakeDocument.getElementById` secara eksplisit supaya balik `null` utk id
tertentu, baru guard-nya beneran teruji. Juga 1 test `classList` awal salah
pakai array literal langsung di `domInitial` (`createFakeDocument` internal
pakai `Object.assign` yg menimpa objek `classList` bawaan jadi array biasa
tanpa `contains()`/`remove()`) — diperbaiki dgn `createFakeElement({classList:[...]})`
eksplisit sebelum di-passing (pola sama spt `fi-calc.test.js`).

**Diverifikasi:**
- `node --test tests/*.test.js` → **795/795 pass, 0 fail** (naik dari 764 di
  bagian ke-30, +31 test baru [profil-pengaturan], 0 regresi).
- `node build.js` → sukses, versi naik ke `kw80-merge-advisor-card-dashcards-47`
  (build #172), kedua bundle lolos `node --check` sintaks, `FILE-MAP.md`
  diregenerasi (`profil-pengaturan.js` otomatis hilang dari daftar nol-test).
- Smoke-test browser (Playwright + Chrome headless,
  `/home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome`)
  → `✅ [smoke-test] OK — 992 referensi getElementById() & 55 data-action
  semuanya valid`, 0 `pageerror`.
- `npm run lint`/`npx eslint` TIDAK bisa dites di sesi ini (sandbox tanpa
  internet, `npm install` gagal dgn 403) — tolong jalankan `npm run lint`
  sebelum merge/release.

**Untuk sesi berikutnya — daftar modul nol-test yg TERSISA (1 sudah selesai
sesi ini):** `reset-gaji-mingguan.js` (86 baris), `filter-laporan.js` (220
baris), `kasir.js` (221 baris), `sewakios.js` (242 baris), `linktx.js` (244
baris), `modal-navigasi.js` (284 baris), `payroll-absensi.js` (365 baris),
`renovasi.js` (437 baris), `tagihan-kalender.js` (443 baris),
`backup-restore.js` (718 baris), `cobek.js` (1261 baris, terbesar, disisakan
paling akhir), `features-aiwidget-reminder-gdrive-search.js` (1586 baris),
`features-sheets-pwa-selftest.js` (2361 baris). Lanjutkan urutan
ringan→berat: `reset-gaji-mingguan.js` berikutnya.

## Catatan kerja — 2026-07-11 (bagian ke-32): test `reset-gaji-mingguan.js`

Konteks: lanjutan daftar modul nol-test dari bagian ke-31, urutan
ringan→berat: `reset-gaji-mingguan.js` (86 baris) berikutnya. Tidak ada bug
ditemukan — murni menambah test yg sebelumnya nol, tidak ada perubahan di
kode aplikasi.

**File baru: `tests/reset-gaji-mingguan.test.js` (18 test).** Cakupan
`getWeekRange` (rentang Minggu 00:00:00.000 s/d Sabtu 23:59:59.999, sama utk
input hari apa saja dlm minggu itu), `checkWeeklySalaryReset` (guard "bukan
hari Sabtu" & "sudah di-prompt hari ini" sama2 return awal tanpa efek
samping, filter absensi yg BENAR-BENAR jatuh di rentang minggu berjalan
[absensi minggu lalu sengaja diselipkan sbg kontrol negatif], render ringkasan
ke DOM + buka modal, `wrAccWrap`/`wrAcc` kondisional ke `D.accounts.length`),
`openWeeklyResetManual` (toast peringatan kalau kosong vs alur lengkap kalau
ada: `populateAccFilters()`, isi ringkasan, tutup 2 modal sumber lalu buka
modal reset), dan `confirmWeeklyReset` (cabang `yes=false` cuma catat prompt
date + re-render tanpa sentuh `D.workDays`/`renderKeuangan`; cabang
`yes=true` selalu reset `D.workDays` minggu ini terlepas dari status
auto-income, TAPI transaksi Pemasukan & `renderKeuangan()` cuma jalan kalau
checkbox aktif DAN total>0; kategori dicari via regex `/gaji/i` dgn 2 lapis
fallback [kategori income pertama, lalu literal `'Gaji'`]; `accountId`
fallback ke akun pertama atau `null` kalau `D.accounts` kosong).

**Catatan teknis — kenapa test file ini beda pola dari file lain:** file ini
pakai `new Date()` (tanpa argumen) utk deteksi "sekarang" (hari Sabtu?,
rentang minggu berjalan), TAPI juga pakai `new Date(x)` dgn argumen (parsing
tanggal absensi via `new Date(w.date)`, copy-constructor `new Date(start)`)
yg harus tetap berperilaku spt Date asli (`getDay`/`setDate`/`setHours` dst).
Stub `Date.now()` sederhana (pola `error-handler.test.js`) tidak cukup —
dibuat `class FakeDate extends Date` yg cuma meng-override constructor
tanpa-argumen ke waktu tetap, delegasi ke `super(...args)` utk selebihnya.
Sandbox Node ini kebetulan ber-TZ UTC (offset 0, dicek via
`new Date().getTimezoneOffset()`), jadi string ISO `'YYYY-MM-DD'` polos aman
dipakai konsisten tanpa geser hari.

Var modul `_wrLastTotal`/`_wrLastCount` dideklarasikan pakai `let` (bukan
implicit-global spt `_sessionRawPin` di `onboarding.js`), jadi TIDAK
menempel ke objek context vm & tidak bisa di-inject langsung dari test.
Solusinya: test `confirmWeeklyReset` selalu memanggil `openWeeklyResetManual()`
dulu (yg secara alami mengisi kedua var itu lewat closure) sebelum memanggil
`confirmWeeklyReset()` — pola ini juga meniru urutan pemakaian ASLI di app
(tombol buka modal reset selalu dipencet dulu sebelum tombol konfirmasi).

**Diverifikasi:**
- `node --test tests/*.test.js` → **813/813 pass, 0 fail** (naik dari 795 di
  bagian ke-31, +18 test baru [reset-gaji-mingguan], 0 regresi).
- `node build.js` → sukses, versi naik ke build #173, kedua bundle lolos
  `node --check` sintaks, `FILE-MAP.md` diregenerasi
  (`reset-gaji-mingguan.js` otomatis hilang dari daftar nol-test).
- Smoke-test browser (Playwright + Chrome headless) → `✅ [smoke-test] OK —
  992 referensi getElementById() & 55 data-action semuanya valid`, 0
  `pageerror`.
- `npm run lint`/`npx eslint` TIDAK bisa dites di sesi ini (sandbox tanpa
  internet, `npm install` gagal dgn 403) — tolong jalankan `npm run lint`
  sebelum merge/release.

**Untuk sesi berikutnya — daftar modul nol-test yg TERSISA (1 sudah selesai
sesi ini):** `filter-laporan.js` (220 baris), `kasir.js` (221 baris),
`sewakios.js` (242 baris), `linktx.js` (244 baris), `modal-navigasi.js` (284
baris), `payroll-absensi.js` (365 baris), `renovasi.js` (437 baris),
`tagihan-kalender.js` (443 baris), `backup-restore.js` (718 baris),
`cobek.js` (1261 baris, terbesar, disisakan paling akhir),
`features-aiwidget-reminder-gdrive-search.js` (1586 baris),
`features-sheets-pwa-selftest.js` (2361 baris). Lanjutkan urutan
ringan→berat: `filter-laporan.js` berikutnya.

## Catatan kerja — 2026-07-11 (bagian ke-33): test `pengaturan-search.js`

Konteks: diminta jalankan test "dari yg terkecil" mengikuti pola sesi
sebelumnya. Ketemu `pengaturan-search.js` (72 baris) — modul ini KELEWAT
dari daftar "sesi berikutnya" bagian ke-32 (kemungkinan krn dipindah dari
`features-helpers-global-security.js` v73 belakangan, jadi belum sempat
tercatat di daftar itu) — TAPI ternyata masih nol test dan LEBIH KECIL dari
`filter-laporan.js` (220 baris) yg tercatat sbg "berikutnya". Diverifikasi
dgn cek langsung: cari semua file source yg tidak direferensikan
`loadSource([...])` di `tests/*.test.js` manapun. Dipilih `pengaturan-search.js`
krn genuinely terkecil, mengikuti aturan ringan→berat apa adanya (bukan cuma
ikut daftar tercatat). Tidak ada bug ditemukan — murni menambah test yg
sebelumnya nol, tidak ada perubahan di kode aplikasi.

**File baru: `tests/pengaturan-search.test.js` (23 test).** Cakupan
`toggleStgGroup` (toggle kelas `open` + `aria-expanded` di `.stg-group-head`,
guard `id` tidak ketemu, guard head tidak ada), `toggleSingleCardCollapse`
(pola sama tapi utk `.card-collapse-head`), `stgSearch` (query kosong
sembunyikan hasil, resultEl tidak ada, tidak ada kartu cocok vs ada,
case-insensitive + trim, kartu di dalam grup tertutup ikut dibuka tapi TIDAK
di-toggle tertutup lagi kalau grup sudah terbuka, kartu `card-collapse` ikut
dibuka, highlight pencarian sebelumnya dibersihkan tiap pencarian baru,
hasil pertama jadwalkan `scrollIntoView` via `setTimeout`), dan listener
`keydown` top-level (Enter/Spasi di `.stg-group-head,.card-collapse-head` →
`preventDefault()` + `head.click()`, tombol lain/target tidak cocok/
`target.closest` tidak ada → no-op).

**Catatan teknis — 2 jebakan `fakeDom.js` yg bikin salah di percobaan
pertama:**
1. `createFakeDocument({id: objekBuatanSendiri})` melakukan
   `Object.assign(elemenAutoVivify, objekBuatanSendiri)` di dalam `ensure()`
   — properti PRIMITIF (`textContent` string) di-copy NILAI-nya ke objek
   auto-vivify yg BEDA dari variabel lokal test, jadi assert langsung ke
   variabel lokal `resultEl.textContent` setelah manggil `stgSearch()` selalu
   baca nilai lama (`''`). Field OBJEK (`style`/`classList`) tetap aman
   dibaca dari variabel lokal krn Object.assign cuma copy REFERENCE utk
   objek, bukan primitif. Fix: ambil ulang elemen via
   `fakeDocument.getElementById(id)` SETELAH pemanggilan fungsi yg dites,
   baru assert `textContent`-nya.
2. Konfirmasi ulang jebakan `classList` dari catatan bagian ke-31: passing
   literal `{classList:['u-dnone']}` sbg value `initial` ke
   `createFakeDocument` menimpa `classList` jadi array polos tanpa
   `contains()`/`remove()` — harus `createFakeElement({classList:[...]})`
   dulu baru dipassing sbg value `initial`.
3. `assert.deepEqual`/`deepStrictEqual` GAGAL membandingkan object literal
   yg dibuat DI DALAM `vm` sandbox (mis. argumen `scrollIntoView({behavior,
   block})` yg dipanggil dari source app yg jalan di context vm) dgn object
   literal host Node biasa — walau isinya identik, prototype `Object`-nya
   beda REALM jadi dianggap tidak sama. Fix: assert per-field alih-alih
   `deepEqual` utk nilai yg berasal dari dalam sandbox vm.

**Diverifikasi:**
- `node --test tests/*.test.js` → **864/864 pass, 0 fail** (naik dari 841,
  +23 test baru [pengaturan-search], 0 regresi).
- Sanity-check tambahan: sengaja rusak 1 baris logika `stgSearch` (ganti
  pesan hasil jadi string statis) → 3 test relevan langsung merah, lalu
  dikembalikan → hijau lagi. Konfirmasi test baru ini benar-benar menguji
  perilaku, bukan cuma lolos scaffolding kosong.
- `node build.js kw83-test-pengaturan-search-1` → sukses (versi lama
  `kw82-test-tx-stok-sparepart` tidak berakhiran `-angka` jadi auto-increment
  gagal, dikasih nama versi manual sesuai saran error `build.js`), build
  #185, kedua bundle lolos `node --check` sintaks, `FILE-MAP.md` diregenerasi
  (`pengaturan-search.js` otomatis hilang dari daftar nol-test).
- `npm run lint`/`npx eslint` & smoke-test browser (Playwright) TIDAK bisa
  dites di sesi ini (sandbox tanpa internet/`node_modules`/Chrome
  terpasang) — tolong jalankan sebelum merge/release.

**Untuk sesi berikutnya — daftar modul nol-test yg TERSISA:**
`filter-laporan.js` (220 baris), `kasir.js` (221 baris), `sewakios.js` (242
baris), `linktx.js` (244 baris), `modal-navigasi.js` (284 baris),
`payroll-absensi.js` (365 baris), `renovasi.js` (437 baris),
`tagihan-kalender.js` (443 baris), `backup-restore.js` (718 baris),
`cobek.js` (1261 baris, terbesar, disisakan paling akhir),
`features-aiwidget-reminder-gdrive-search.js` (1586 baris),
`features-sheets-pwa-selftest.js` (2361 baris). Lanjutkan urutan
ringan→berat: `filter-laporan.js` berikutnya. **PENTING:** cek ulang daftar
ini dgn cara yg sama spt bagian ke-33 (cari file source yg tidak
direferensikan `loadSource([...])` di test manapun) sebelum mulai, jangan
cuma percaya daftar tercatat — sudah kejadian 1x (`pengaturan-search.js`)
kelewat dari daftar.

## Catatan kerja — 2026-07-12: fitur baru — Export/Import data di 📋 Buku Aset

Konteks: permintaan user "tambahkan fitur export import data di data aset".
Sebelum ini, satu-satunya jalur export/import utk data `D.assets` adalah lewat
modal Backup Data umum (`backupModal`, modul "🏦 Aset, Utang & Piutang" di
`backup-restore.js`) yang menggabung SEMUA jenis data sekaligus — tidak ada
tombol export/import yang scoped khusus ke Buku Aset saja di kartunya
sendiri.

**Perubahan (`aset.js`):** 3 method baru di objek `Aset` (menyusul
`totalValue()`, di ujung objek):
- `Aset.exportJSON()` — download `D.assets` apa adanya sbg file JSON
  (`aset-W-YYYY-MM-DD.json`). Guard kosong -> toast peringatan, tidak bikin
  file.
- `Aset.exportCSV()` — versi CSV (kolom Nama/Jenis/Lokasi/Nilai/Modal
  Investasi/Harga Beli/Jumlah Unit/Tanggal/Zakatable/Akun Tertaut), pola
  escaping sama persis dgn `toCSVRow` di `runBackup()` (backup-restore.js).
- `Aset.importJSON(e)` — baca file dari `<input type=file>` (event
  `change`), terima array polos ATAU objek `{assets:[...]}` (jadi file hasil
  `exportJSON()` maupun hasil export modul "Aset" di Backup Data umum
  dua-duanya bisa langsung dipakai). Validasi minimal per-entri (`name` &
  `nilai` numerik wajib ada), baris yg tidak valid dilewati (dihitung &
  disebut di toast, tidak menggagalkan seluruh import). `askConfirm()` dulu
  sebelum benar-benar menambahkan. **Sengaja SELALU DITAMBAHKAN** (bukan
  menimpa/menggantikan `D.assets` yg sudah ada) dgn `id` BARU
  (`uid()`) per entri — menghindari id bentrok kalau file diimport 2x atau
  berasal dari device lain.

**Keputusan desain penting — `accountId` SENGAJA di-null-kan saat import,
tidak dipakai apa adanya dari file:** id akun (`D.accounts[].id`) unik per
instalasi/device, bukan nilai stabil lintas backup. Kalau `accountId` dari
file dipakai mentah-mentah, ada risiko nyata (silent, tanpa peringatan)
aset ke-link ke akun yang SALAH di device tujuan (kebetulan ada akun dgn id
yg sama tapi beda akun) — akibatnya nilai Kekayaan Bersih bisa salah tanpa
ada indikasi error apapun ke user. Lebih aman user tautkan ulang manual
lewat modal Edit Aset (field "Tautkan ke Akun") kalau memang perlu, drpd
app menebak & berpotensi menautkan ke akun yg keliru.

**UI (`index.html`, sumber tunggal — `app_production.html` otomatis
disalin ulang oleh `build.js`):** 2 tombol baru (`⬇️ Export Aset (JSON)` /
`⬆️ Import Aset`) ditambah tepat di bawah `#assetList`, sebelum tombol
"📋 Impor Nota Emas (Massal)" yg sudah ada — dipilih JSON sbg format
export utama (bukan CSV) krn JSON bisa langsung di-import balik lewat
`Aset.importJSON` (round-trip), CSV cuma satu-arah (mis. dibuka Excel).
Tombol Import memicu klik ke `<input type=file id=assetImportFile
style=display:none>` yg tersembunyi (pola sama dgn `importShopExcelFile`
di `importShopExcelModal`), bukan modal preview tersendiri — dipertimbangkan
cukup krn `askConfirm()` sudah menampilkan ringkasan (jumlah aset valid/
dilewati) sebelum commit, beda dgn `goldImportModal`/`importKatalogModal`
yg butuh preview lebih detail krn parsing teks bebas (bukan JSON
terstruktur).

**Test baru: `tests/aset.test.js` (+20 test, disisipkan sesudah blok test
`totalValue`).** Helper baru `makeAsetIO()` (terpisah dari `makeAset()` yg
sudah ada di file yg sama) krn 3 method baru ini butuh mock tambahan yg
tidak dipakai method `Aset` lain: `document.createElement('a')` (link
download, dicatat ke array `anchors` biar bisa diverifikasi `.click()`/
`.download`), `Blob`/`URL.createObjectURL` (isi file yg mau didownload,
lewat array `blobs`), dan `FileReader` (baca file upload — class
`FakeFileReader` per-test yg `onload` nya dipanggil sinkron dgn teks isi
file yg ditentukan test, bukan lewat browser beneran). Cakupan: kedua
fungsi export (kosong -> toast peringatan, ada isi -> Blob+anchor+toast
benar), dan `importJSON` (file batal dipilih -> no-op, JSON rusak, format
tak dikenali, semua/sebagian entri invalid, user batal konfirmasi, sukses
normal dgn verifikasi eksplisit `accountId` di-null-kan & `id` baru bukan
`id` lama, format `{assets:[...]}` jg didukung, `keuntungan`/
`keuntunganPct` dihitung ulang dari `modalInvestasi` yg diimport).

**Jebakan teknis yg ditemukan saat menulis test (dicatat biar sesi
berikutnya tidak mengulang):**
1. `global.FileReader = FakeFileReader` di luar `vm` TIDAK berpengaruh ke
   kode yg jalan di dalam sandbox `loadSource()` (beda realm/global) — harus
   dioper eksplisit lewat parameter `extraGlobals` (`FileReader:
   FakeFileReader`) SEBELUM `loadSource()` dipanggil, bukan di-set ke global
   Node biasa sesudahnya. Konsekuensinya: `FakeFileReader` harus dibikin
   duluan (dari `makeFakeFileInputEvent()`) baru `makeAsetIO()` dipanggil
   dgn `{FileReader: FakeFileReader}`, bukan urutan sebaliknya spt pola test
   lain di file yg sama (mis. `askConfirm` bisa di-oper belakangan krn itu
   memang parameter `opts` biasa, bukan soal realm).
2. `importJSON()` yg sukses memanggil `Aset.renderList()` di akhir (bagian
   dari efek samping normal, sama spt `save()` biasa) — `renderList()`
   butuh `fmt()` (format Rupiah) yg SEBELUMNYA tidak perlu di-stub di
   `makeAsetIO()` (beda dari `makeAset()` yg sudah lama menyediakannya utk
   test `renderList()` langsung) — ketauan dari error `fmt is not defined`
   sampai ditambahkan ke `extraGlobals`.

**Diverifikasi:**
- `node --test tests/*.test.js` → **1100/1100 pass, 0 fail** (naik dari
  1080 sebelum sesi ini — tepatnya dari jumlah sebelum ditambah, +20 test
  baru murni fitur ini, 0 regresi ke test lama).
- `node build.js` → sukses, 0 error dari 3 lint guard bawaan (u-dnone,
  escapeHtml, chicken-egg Tesseract), versi naik ke
  `kw83-test-pengaturan-search-33` (build #214), kedua bundle lolos `node
  --check` sintaks, `app_production.html` disalin ulang otomatis dari
  `index.html` (sekarang identik lagi), `FILE-MAP.md` diregenerasi (51
  file, 878 identifier global — 3 method baru `Aset.exportJSON`/
  `Aset.exportCSV`/`Aset.importJSON` masih di bawah nama objek `Aset` yg
  sama, jadi tidak nambah baris baru di index abjad FILE-MAP, cuma nambah
  isi method di dalamnya).
- `npm run lint`/`npx eslint` TIDAK bisa dijalankan di sesi ini krn sandbox
  tanpa akses internet (`npm install` gagal 403 ke registry) — sama seperti
  keterbatasan hampir semua sesi sebelumnya di file ini, tolong jalankan
  `npm run lint` (atau `npm run check` penuh) di lokal sebelum merge/
  release.
- Smoke-test browser TIDAK dijalankan ulang sesi ini (sandbox tanpa Chrome/
  Playwright terpasang) — **disarankan dicoba manual di browser (`?dev=1`)
  sebelum rilis**: buka halaman Kekayaan/Zakat → kartu 📋 Buku Aset → tap
  "⬇️ Export Aset (JSON)" (pastikan file ke-download & isinya bener), lalu
  tap "⬆️ Import Aset" pilih file itu lagi (pastikan aset dobel muncul di
  list dgn id baru, `askConfirm()` muncul dulu, saldo Kekayaan Bersih ikut
  ter-update).

**Belum dikerjakan / sengaja di luar cakupan:** export/import per-item
lain di Buku Aset (mis. hanya aset ber-tag zakatable saja) — kalau nanti
dibutuhkan, ikuti pola `askConfirm()` + validasi per-entri yg sama.

## Catatan kerja — 2026-07-11 (bagian ke-34): test `filter-laporan.js` (di-port dari snapshot v174 ke v187 pasca-redesign Etalase)

Konteks: daftar nol-test ringan→berat dari saran akhir bagian ke-33 bilang
`filter-laporan.js` berikutnya, tapi cabang kerja proyek ini sempat belok
duluan ke redesign tampilan kartu produk Etalase (lihat entri
`CATATAN-CEK-CLAUDE.md` [2026-07-11] "Redesign tampilan kartu produk
Etalase") sebelum akhirnya sesi ini balik menuntaskan `filter-laporan.js`.
Testnya sendiri SEBELUMNYA sudah ditulis & diverifikasi penuh di sesi lain
pd snapshot proyek yg lebih lama (sebelum redesign Etalase, versi build
#173→#174) — sesi ini murni **port** file test itu ke snapshot v187/188 ini,
bukan menulis dari nol. Tidak ada bug ditemukan di kode aplikasi baik dulu
maupun sekarang — murni menambah test yg sebelumnya nol.

**Kenapa perlu porting, bukan copy-paste polos:** redesign Etalase mengganti
penamaan `cobek`→`shop` di beberapa tempat yg disentuh `goToList()`:
`#page-cobek`→`#page-shop`, `setCobekTab()`→`setShopTab()`, parameter
`cobekTabName`→`shopTabName`. Selain baris itu, `filter-laporan.js` di v187
ini 100% identik dgn versi lama (`diff` cuma nunjukkan 2 baris beda, isinya
cuma rename itu — dicek eksplisit sebelum mulai port, bukan asumsi). Jadi
proses port-nya: copy `tests/filter-laporan.test.js` apa adanya, lalu
`sed` rename semua `cobek*`/`Cobek*`/`#page-cobek` jadi `shop*`/`Shop*`/
`#page-shop` (termasuk nama variabel test internal spt `cobekTabs`→
`shopTabs`, `cobekCalls`→`shopCalls`), lalu jalankan test-nya — 51/51 pass
tanpa perlu perubahan lain. `tests/helpers/loadSource.js` &
`tests/helpers/fakeDom.js` di v187 ini ternyata BYTE-IDENTICAL dgn versi
lama (dicek pakai `diff`), jadi tidak ada penyesuaian pola test yg
dibutuhkan di luar rename cobek→shop itu.

**Cakupan test (51 test, `tests/filter-laporan.test.js`):** filter panel
Keuangan (`kf*`) & Laporan (`f*`) — `txMatchesFilters`/`txMatchesSearch`
(murni; catatan kontrak — `txMatchesSearch` cuma me-lowercase haystack-nya,
BUKAN query-nya, pemanggil wajib lowercase query duluan spt yg dilakukan
`getKeuFilters()`), `getLaporanFilters`/`getKeuFilters`,
`resetLaporanFilter`/`resetKeuFilter`, `populateCatFilter`/
`populateKeuFilters` (termasuk cabang pertahankan-vs-fallback akun terpilih
lama di `<select>`), `onFKatChange`/`onKfKatChange`, `toggleKeuFilter`
(termasuk kuirk nyata: klik pertama pada panel yg `style.display` awalnya
kosong `''` justru men-set eksplisit ke `'none'`, bukan `'block'` —
dikonfirmasi ini perilaku production asli lewat browser, bukan bug test),
simpan/pulihkan preferensi filter ke `localStorage` (`saveKeuFilterPrefs`/
`loadKeuFilterPrefsIntoDOM`, dgn guard sekali-muat `_keuFilterPrefsLoaded`),
badge jumlah filter aktif (`updateKfBadge`), paginasi list (`loadMoreTx`/
`loadMoreLapTx`/`resetTxPageAndRender`, debounce pencarian 250ms
`onKfSearchInput`), navigasi antar-list dgn scroll+flash-highlight
(`goToList`, termasuk cabang `pageName`+`navIdx`, tab Shop [`etalase`/
`produsen`/`riwayat`/`pelanggan`/fallback index 0], tab Car Notes [`servis`/
lainnya], & elemen target yg tidak ada di DOM), dan modal ringkasan
transaksi terfilter dari 3 scope dashboard/keuangan/laporan dgn paginasi
100 per batch (`showFilteredTx`).

**Catatan teknis (dipindah dari sesi penulisan test aslinya, masih relevan
di sini) — 2 jebakan lintas-realm `vm`:**
1. Variabel `let`/`const` top-level yg dideklarasikan DI DALAM file sumber
   yg di-load (bukan lewat `extraGlobals`) — spt `txListPage`, `lapTxPage`,
   `_keuFilterPrefsLoaded` di `filter-laporan.js` — TIDAK otomatis nempel
   ke objek context vm yg dikembalikan `loadSource()`. Solusi:
   `vm.runInContext('namaVar', ctx)` / `vm.runInContext('namaVar=...', ctx)`
   ke context yg SAMA (`ctx` dari `loadSource()` IS objek context-nya) —
   pola sudah ada di `tests/kalkulator-popup.test.js`.
2. Objek plain yg DIBUAT & DI-RETURN oleh kode yg berjalan di dalam sandbox
   vm (mis. `getKeuFilters()`) py `[[Prototype]]` beda dari realm host test
   file, jadi `assert.deepEqual`/`deepStrictEqual` (mode strict) SELALU
   gagal walau isinya identik ("same structure but are not
   reference-equal"). Solusi: JSON round-trip (helper `plain()` di
   `tests/filter-laporan.test.js`) sebelum dibandingkan.

Juga: `createFakeDocument()` (`tests/helpers/fakeDom.js`) menerapkan
`initial` lewat `Object.assign(newElement, initial)` — MERATAKAN accessor
getter/setter kustom (elemen `<select>` tiruan yg py `.options` "hidup",
dibutuhkan `populateKeuFilters()` yg baca `[...kfAcc.options]` SETELAH
nulis `.innerHTML`) jadi cuma snapshot statis. Elemen yg butuh accessor
beneran harus disuntik lewat override `getElementById` langsung, bukan
lewat parameter `initial`.

**Diverifikasi:**
- `node --test tests/*.test.js` → **1020/1020 pass, 0 fail** (naik dari 969
  sebelum sesi ini, +51 test baru [filter-laporan], 0 regresi).
- `node build.js` → sukses, versi naik dari `kw83-test-pengaturan-search-3`
  ke `kw83-test-pengaturan-search-4`, build #188, kedua bundle lolos
  `node --check` sintaks, `FILE-MAP.md` diregenerasi (`filter-laporan.js`
  otomatis hilang dari daftar nol-test).
- Smoke-test browser (Playwright + Chrome headless) → `✅ [smoke-test] OK —
  999 referensi getElementById() & 56 data-action semuanya valid`, 0
  `pageerror`. Dicoba juga live di browser (bukan cuma smoke-test generik):
  `showPage('keuangan',...)` → `toggleKeuFilter()` → `resetKeuFilter()` →
  `showFilteredTx('dashboard','all','Test Dashboard')` (modal kebuka, judul
  benar) → `goToList('page-etalase',null,undefined,'etalase')` (fungsi
  `setShopTab` pasca-redesign terkonfirmasi ada & jalan) — semua tanpa
  error.
- `npm run lint`/`npx eslint` TIDAK bisa dites di sesi ini (sandbox tanpa
  internet, `npm install`/`npx` gagal 403) — tolong jalankan `npm run lint`
  sebelum merge/release. (Sudah beberapa sesi berturut2 tidak bisa dites
  krn keterbatasan sandbox yg sama.)

**Untuk sesi berikutnya — daftar modul nol-test yg TERSISA** (dicek ulang
sesi ini via pola `loadSource(['nama-file.js']` di seluruh `tests/*.test.js`,
BUKAN cuma percaya catatan lama — sesuai pesan peringatan di saran bagian
ke-33 yg bilang `pengaturan-search.js` pernah kelewat): `kasir.js`,
`sewakios.js`, `linktx.js`, `modal-navigasi.js`, `payroll-absensi.js`,
`renovasi.js`, `tagihan-kalender.js`, `backup-restore.js`,
`features-aiwidget-reminder-gdrive-search.js`. Catatan tambahan: `cobek.js`
SUDAH dapat test (`tests/cobek.test.js`, ditambahkan bareng redesign
Etalase) jadi TIDAK perlu dikerjakan lagi; `features-sheets-pwa-selftest.js`
SEBAGIAN tercakup (`parsePzNum`/`parseDecStr` via `extractFunction` di
`tests/parse-angka.test.js`) tapi belum full coverage kalau mau digarap
menyeluruh. Ukuran file (buat estimasi urutan ringan→berat, belum diverifikasi
ulang barisnya krn tidak semua file dicek `wc -l` sesi ini): `kasir.js` &
`sewakios.js` termasuk yg lebih ringan, `backup-restore.js` &
`features-aiwidget-reminder-gdrive-search.js` termasuk yg terberat di sisa
daftar ini.

## Catatan kerja — 2026-07-12: Dashboard Feature Hub — Tahap 0 (FEATURE_REGISTRY)

Konteks: mulai implementasi `blueprint-dashboard-hub.md` (dokumen final, sudah
direvisi berdasarkan audit implementasi). Tahap 0 = "Finalisasi taksonomi §1
jadi 1 sumber data ... Tidak ada elemen visual baru dirender" — murni data,
tanpa UI. Tahap 1 (bangun `dashboard-hub.js` yang mengkonsumsi registry ini)
BELUM dikerjakan, menunggu sesi terpisah sesuai aturan "jangan mengerjakan
lebih dari satu tahap sekaligus".

**File baru: `dashboard-hub-registry.js`** — `const FEATURE_REGISTRY`, array 10
kategori (persis blueprint §1) → daftar fitur, tiap fitur
`{key, label, desc, target}`. Setiap `target` (page/tab/goTo/group/dashKey/
action) HANYA diisi berdasarkan navigasi yang sudah nyata ada & diverifikasi
manual lewat `grep` ke `index.html`/`app_production.html` (`showPage`,
`setKeuanganTab`/`setShopTab`/`setPajakTab`, `toggleStgGroup`,
`DASH_CARD_DEFS` di `modules-render.js`) — bukan tebakan. 2 temuan audit yang
memengaruhi bentuk data (dicatat di komentar header file, bukan cuma di sini):
- Fitur kategori 📦 Aset & sebagian 🌱 Personal (Piutang/Utang, Strategi
  Pelunasan) ternyata **nempel di `page-pajak` tab `zakat`**, bukan halaman
  sendiri — halaman itu campur Pajak+Zakat+Aset+Piutang/Utang.
- `WorthIt` (Worth It? & Prioritas Belanja) **murni modal**
  (`WorthIt.open()`, dipicu dari Quick Switcher) — tidak ada kartu/section
  di page manapun sama sekali, jadi target-nya `{action:'WorthIt.open'}`
  tanpa `page`, beda skema dari fitur lain.

**File baru: `tests/dashboard-hub-registry.test.js`** (8 test) — bukan cuma
validasi struktur (key unik, field wajib ada, 10 kategori sesuai blueprint
§1), tapi **cross-check tiap `target` ke kode nyata**: `target.page` dicek ke
`id="page-<page>"` di kedua file HTML, `target.tab` dicek ke daftar tab
terverifikasi per halaman, `target.goTo` dicek elemen id-nya benar ada,
`target.group` (Settings) dicek id `stgGroup*` ada, `target.dashKey` dicek
cocok dgn key nyata di `DASH_CARD_DEFS` (parse langsung dari
`modules-render.js`), dan `target.action` dicek ada sbg `data-action="..."`
atau deklarasi function di source. Ini guard supaya kalau nanti UI Tahap 1+
dibangun berdasarkan registry ini lalu source-nya berubah/direname, test jadi
merah duluan (bukan ketauan pas smoke-test browser). Sanity-check manual:
sengaja rusak 1 `goTo` jadi id palsu → test #4 langsung merah → dikembalikan
→ hijau lagi (bukti test ini menguji sungguhan, bukan scaffolding kosong).

**File diubah: `scripts/build.js`** — tambah `'dashboard-hub-registry.js'` di
akhir array `GROUP_B` (1 baris, urutan file lama tidak diubah), sesuai
blueprint §6.

**Tidak disentuh:** `index.html`, `app_production.html`, `styles.css`,
`manifest.json`, `sw.js` — tidak ada elemen visual baru, sesuai definisi
Tahap 0. Blueprint & Design System juga tidak diubah (tidak ditemukan bug).

**Diverifikasi:**
- `node --test tests/*.test.js` → **1114/1114 pass, 0 fail** (naik dari 1094
  sebelum sesi ini — 20 test baru dari `dashboard-hub-registry.test.js`
  [8 test] tercampur dgn beberapa file test lain yg sudah ada sebelumnya di
  snapshot ini, 0 regresi).
- `node build.js kw83-tahap0-feature-registry-1` → sukses, build #223, kedua
  bundle lolos `node --check` sintaks, `index.html`/`app_production.html`
  tetap identik, `FILE-MAP.md` diregenerasi otomatis (60 file, 886 identifier
  — `FEATURE_REGISTRY` masuk index abjad).
- `node --check` lolos utk `dashboard-hub-registry.js`,
  `tests/dashboard-hub-registry.test.js`, `scripts/build.js`.
- `collectAppGlobals()` dijalankan manual → `FEATURE_REGISTRY` otomatis
  masuk daftar globals ESLint (tidak perlu edit `eslint.config.js` manual).
- `npm run lint`/`npx eslint` TIDAK bisa dijalankan di sesi ini (sandbox
  tanpa akses internet, `eslint` belum terpasang) — sama seperti
  keterbatasan hampir semua sesi sebelumnya di file ini. Karena
  `no-unused-vars` di `eslint.config.js` levelnya `warn` (bukan `error`) dan
  `FEATURE_REGISTRY` belum dipakai modul manapun sampai Tahap 1 nanti, kalau
  lint dijalankan kemungkinan besar cuma muncul 1 warning ringan (bukan
  error) — tapi tetap **tolong jalankan `npm run lint` (atau `npm run check`
  penuh) di lokal sebelum lanjut ke Tahap 1**, supaya dipastikan.
- Smoke-test browser TIDAK dijalankan ulang sesi ini (sandbox tanpa Chrome/
  Playwright terpasang) — risiko regresi UI nol karena tidak ada file
  HTML/CSS yang diubah & tidak ada fungsi render/DOM baru yang dipanggil di
  mana pun (file baru murni data, belum dikonsumsi kode lain).

**Untuk Tahap 1 (sesi berikutnya):** bangun `dashboard-hub.js` yang
mengkonsumsi `FEATURE_REGISTRY` (Feature Grid), sesuai urutan teknis blueprint
§7 ("`FEATURE_REGISTRY` → `dashboard-hub.js` → `sidebar-nav.js` &
`dashboard-hub-search.js`"). Ingat aturan Tahap 1 blueprint §5: hub dibangun
sbg halaman terpisah dulu (belum jadi default), semua Feature Card reuse
`showPage`/`goToList`/`setKeuanganTab` dst yang sudah ada — tidak menulis
ulang logic halaman manapun.

## Catatan kerja — 2026-07-12: Dashboard Hub Tahap 5 (Responsive & UI Polish)

Scope: hanya responsive + polish CSS untuk Dashboard Hub (blueprint
`docs/blueprint-dashboard-hub.md` §4/§5). Tidak ada redesign, fitur baru,
perubahan business logic/registry/routing/render lifecycle.

**Audit (desktop/tablet/mobile, Playwright + chromium lokal @ /opt/pw-browsers):**
- Project ini **belum pernah punya `@media` sama sekali** di `styles.css`
  (dikonfirmasi `grep -c "@media"` = 0 sebelum sesi ini) — sesuai catatan
  blueprint §5 Tahap 5.
- BUG NYATA: `.dashhub-feature-grid` hardcode `repeat(2,1fr)` tanpa breakpoint
  → di tablet (768px) & desktop (1280px/1920px) grid TETAP 2 kolom, card jadi
  kotak kosong raksasa (screenshot: card lebar >600px isinya cuma judul+desc
  kecil di pojok kiri). Halaman hub juga tidak punya container/max-width →
  melebar penuh 1920px di layar besar, search dropdown ikut melebar absurd.
- Minor: `.dashhub-feature-name`/`.dashhub-feature-desc` belum ada
  line-clamp/ellipsis (spec §3 Feature Card Anatomi minta "maks 2 baris" &
  "1 baris, ellipsis") — label panjang (mis. "Absensi Harian & Kalkulator
  Gaji", "Kategorisasi Transaksi Otomatis") berisiko wrap tidak rapi di kolom
  sempit mobile.
- Minor: `.dashhub-feature-card` tidak ada hover state (mobile-only asalnya,
  wajar) — begitu desktop grid diperbaiki, mouse-hover jadi realistis dipakai
  tapi belum ada feedback visual.
- Tidak ditemukan: horizontal scroll/overflow (dicek `scrollWidth==
  clientWidth` di 360/390/768/900/1280/1920px, semua match), widget bertumpuk
  di Pinned Widgets (mobile/desktop dicek via screenshot penuh), spacing antar
  kategori vs Pinned Widgets (dicek konsisten ~16-24px, bukan bug).
- DITUNDA (bukan diperbaiki sesi ini): `.dashhub-feature-card` &
  `.dashhub-search-item` adalah `<div data-action=...>` TANPA
  `role="button" tabindex="0"` (pola yang sudah dipakai di `.stg-group-head`
  dkk) — jadi tidak bisa di-*keyboard-focus*. TAPI: bahkan elemen yang
  SUDAH punya `tabindex="0"` di app ini juga tidak bisa diaktifkan lewat
  Enter/Space (cuma ada global listener utk `click` di
  `features-helpers-global-security.js` + `keydown` utk `Escape` saja di
  `modal-navigasi.js`, tidak ada handler Enter/Space generik). Ini gap
  aksesibilitas app-wide pra-existing, bukan spesifik Dashboard Hub, dan
  perbaikan yang benar butuh nyentuh dispatcher global (di luar scope file
  Tahap 5 & butuh keputusan desain: role="button" custom vs ganti ke
  `<button>` asli). Dicatat di sini biar tidak hilang, bukan ditebak sepihak.

**Perbaikan (CSS-only, `styles.css`, semua diberi selector scoped
`#page-dashboard-hub .dashhub-*` supaya TIDAK berdampak ke halaman lain):**
1. `@media (min-width:600px)` → grid fitur jadi 3 kolom (tablet, sesuai
   tabel §4 "3-4 kolom" — dipilih 3, bukan rentang, biar 1 aturan pasti).
2. `@media (min-width:1024px)` → grid fitur jadi 5 kolom (desktop, sesuai
   §4 "5-6 kolom" — dipilih 5) + `#page-dashboard-hub{max-width:1080px;
   margin:auto}` supaya konten tidak melebar penuh layar (ini container
   pertama di app ini, sengaja discope HANYA ke halaman hub, bukan global).
3. `-webkit-line-clamp:2` di `.dashhub-feature-name`, ellipsis 1-baris di
   `.dashhub-feature-desc` — sesuai spec §3, cegah wrap tidak rapi.
4. `@media (hover:hover) and (pointer:fine)` → hover state
   `.dashhub-feature-card` (border+bg berubah), digated supaya tidak jadi
   sticky-hover di layar sentuh.

**Verifikasi:**
- `node --test tests/*.test.js` → 1189/1189 PASS (sebelum & sesudah build,
  tidak ada test baru — perubahan murni CSS, tidak ada pola test CSS di
  project ini utk didupliksi/diperluas).
- `node scripts/build.js` → sukses, v231→v232, `index.html` &
  `app_production.html` identik.
- Playwright smoke (manual, lihat cara di `CATATAN-CEK-CLAUDE.md`): tidak
  ada horizontal scroll di 6 lebar viewport (360/390/768/900/1280/1920),
  Feature Search tetap filter & klik-navigasi jalan, klik Feature Card grid
  tetap navigasi jalan, tidak ada `pageerror` baru. Satu warning smoke-test
  bawaan (`OngkirCalc` tidak ke-`window`) tetap muncul seperti sebelumnya —
  bug lama pra-Tahap 4, sesuai catatan di awal task, tidak disentuh.

Tahap 5 SELESAI untuk scope Dashboard Hub. Sidebar responsif (blueprint §6
`sidebar-nav.js`) belum pernah dibuat sama sekali di codebase ini — di luar
scope task Tahap 5 kali ini (task hanya minta Dashboard Hub), jadi tidak
disentuh/tidak dianggap "temuan tertunda" — murni belum sampai gilirannya.

## Catatan kerja — 2026-07-17: Split tab halaman 🏠 Aset (page-aset)

Konteks: dari audit "halaman/tab mana yang kepanjangan ke bawah" (jumlah
card & baris per tab), `page-aset` adalah SATU-SATUNYA halaman utama yang
masih scroll panjang tanpa tab/accordion sama sekali — 8 card ditumpuk
(Insight, Dashboard Aset, Ringkasan Investasi, Penyusutan, Pajak Aset,
Histori Kekayaan, Buku Aset, Laporan Aset, Rekomendasi Alokasi). Dipecah jadi
3 tab, pola **SAMA PERSIS** dengan `setKeuanganTab`/`setShopTab`/`setCnTab`/
`setPajakTab` yang sudah ada (`.cn-tabs` + `.cn-tab[data-action]` + toggle
`u-dnone` per pane) — TIDAK ADA business logic baru, murni reorganisasi DOM:

- **📊 Ringkasan** (`#asetTab-ringkasan`) — Insight Aset, Dashboard Aset,
  Ringkasan Performa Investasi, Histori Kekayaan & Growth Rate.
- **📋 Buku Aset** (`#asetTab-buku`) — kartu Buku Aset (daftar aset +
  tambah/export/import/impor nota emas).
- **🧮 Analisis & Pajak** (`#asetTab-analisis`) — Penyusutan Aset, Pajak
  Aset, Laporan Aset, Rekomendasi Alokasi Aset.

**File yang diubah:**
1. `index.html` & `app_production.html` — restrukturisasi `#page-aset`:
   tambah `.cn-tabs` nav (3 tombol, `data-action="setAsetTab"`), bungkus
   kartu-kartu jadi 3 `<div id="asetTab-xxx">`. Semua `id` kartu/elemen di
   dalamnya (mis. `assetList`, `wealthSnapshotList`, `aaResult`, dst) TIDAK
   diubah sama sekali — supaya semua fungsi render yang sudah ada
   (`Aset.renderList()`, `AlokasiAset.init()`, `renderWealthSnapshots()`,
   dst, dipanggil dari `renderPageContent('aset')` di `modules-render.js`)
   tetap jalan apa adanya tanpa modifikasi, terlepas dari tab mana yang lagi
   aktif (sama seperti pola kartu ber-collapse yang sudah ada — kontennya
   tetap ke-render, cuma disembunyikan lewat CSS).
2. `aset.js` — tambah `const ASET_TAB_ORDER` + `function setAsetTab(t,el)`
   (persis pola `setKeuanganTab` di `tx-list-cashflow.js`), taruh sebelum
   `Object.assign(window,{...})` di akhir file.
3. `dashboard-hub.js` — tambah `const ASET_TAB_IDX` + cabang
   `target.page === 'aset'` di `dashHubNavigateToFeature()` supaya kartu
   fitur Dashboard Hub kategori "Aset" auto-switch ke tab yang benar
   sebelum `goTo`/scroll-highlight (pola sama dgn keuangan/shop/carnotes/
   pajak yang sudah ada).
4. `dashboard-hub-registry.js` — tambah field `tab` ke 4 entry kategori
   "Aset" (`aset-buku`→`buku`, `aset-histori`→`ringkasan`,
   `aset-alokasi`→`analisis`, `aset-emas`→`buku`) + update komentar "TAB
   REFERENSI" (sebelumnya `page:'aset' -> tanpa tab`, sekarang
   `'ringkasan'|'buku'|'analisis'`).
5. `features-sheets-pwa-selftest.js` — daftarkan `page-aset` ke self-test
   generik "panel tab benar-benar terlihat (computed display) setelah tab
   diklik" (grup `groups[]` yang sudah ada, cuma nambah 1 entry
   `{page:'#page-aset', fn:setAsetTab, paneId:t=>'asetTab-'+t}`).
6. `tests/dashboard-hub-registry.test.js` — tambah `aset: ['ringkasan',
   'buku', 'analisis']` ke `KNOWN_TABS` (whitelist yang dipakai test
   cross-check `target.tab` valid).

**Kenapa `index.html` & `app_production.html` diedit terpisah tapi identik
persis:** kedua file itu memang harus tetap 100% identik (ada test khusus
"HTML parity" utk ini) — jadi restrukturisasi HTML-nya dikerjakan sekali di
Python lalu ditempel ke kedua file dengan potongan yang SAMA PERSIS, bukan
diketik ulang manual dua kali (rawan typo beda antara keduanya).

**Verifikasi:** `node --test tests/*.test.js` → 1712/1712 PASS (termasuk
test parity index.html/app_production.html & test cross-check
FEATURE_REGISTRY target.tab). `node scripts/build.js` → sukses, v372→v373,
`index.html` & `app_production.html` tetap identik setelah build. **Catatan:
`npm run lint` (eslint) TIDAK dijalankan sesi ini** — `node_modules` belum
terpasang di environment kerja & tidak ada akses internet buat `npm install`
saat itu; jalankan `npm run check` penuh (atau minimal `npm run lint`)
sebelum rilis/PR sungguhan utk sesi ini supaya tetap sesuai alur wajib di
atas.

Sisa 3 kandidat dari audit yang sama (Keuangan > tab Laporan, Keuangan > tab
Kelola, Pajak & Zakat > tab 🧾 Pajak) BELUM dikerjakan — di luar scope sesi
ini, lihat ringkasan prioritas di percakapan sesi ini kalau mau lanjut.

## Catatan kerja — 2026-07-17 (bagian ke-2): split sub-tab 📊 Laporan (dalam page-keuangan)

Konteks: user minta kerjakan 1 saran tab-split paling urgent dari sisa 3
kandidat di atas. Dipilih **tab Laporan (Keuangan)** — bukan Kelola atau
Pajak — berdasarkan audit ulang jumlah baris & kartu per kandidat (dicek
langsung dari `index.html`, bukan tebakan): Laporan ≈136 baris/6 kartu utama
(Saldo Akun, Aset Keluarga, Grafik 6 Bulan, Proyeksi Arus Kas, Per Kategori,
Daftar Transaksi + Export) vs Kelola ≈145 baris/~3 kartu besar vs tab Pajak
(PPh 21) ≈117 baris/2 kartu — Laporan py kartu TERBANYAK & paling beragam
fungsinya, paling sesuai kriteria split yang sama dipakai utk `page-aset`
sebelumnya (banyak kartu berbeda fungsi ditumpuk, bukan cuma panjang scroll).

**Sub-tab baru (nested DI DALAM tab Laporan yang sudah ada, pola SAMA PERSIS
dgn `setAsetTab`/`asetTab-*`):**
- **📊 Ringkasan** (`#laporanTab-ringkasan`) — Saldo Akun, Aset Keluarga,
  stat Masuk/Keluar/Bersih, Grafik 6 Bulan.
- **📅 Arus Kas & Kategori** (`#laporanTab-aruskas`) — Proyeksi Arus Kas 30
  Hari, Per Kategori.
- **📋 Transaksi & Export** (`#laporanTab-transaksi`) — kartu jumlah
  transaksi/rata-rata, Daftar Transaksi, Export.

Filter/FAB/periode di bagian atas tab Laporan (chip periode, custom range,
select Tipe/Kategori/Sub/Akun/Metode, reset filter) **TETAP di luar
sub-tab** — satu state filter berlaku ke ketiga sub-tab sekaligus (bukan
per-sub-tab), karena `renderLaporan()` tetap 1x mengisi semua kartu di
ketiga sub-tab tiap kali filter berubah, terlepas dari sub-tab mana yang lagi
kelihatan (sama seperti kartu-kartu Aset yang tetap ke-render semua walau
disembunyikan CSS).

**Kenapa grouping-nya begini (bukan sekedar 3 kartu/3 kartu/3 kartu rata):**
ada 2 referensi `goToList(...)` di DALAM tab Laporan sendiri (bukan lewat
Dashboard Hub) — `lapAccTotal`→`lapAccList` & `lapCount`/`lapAvg`→`lapTx` —
`goToList()` (filter-laporan.js) TIDAK diberi parameter sub-tab baru (scope
sengaja dibatasi, lihat di bawah), jadi tiap pasangan goTo-target WAJIB
berakhir di sub-tab yang SAMA supaya `scrollIntoView` tidak nyasar ke elemen
yang lagi disembunyikan `u-dnone`. Karena itu "Jumlah transaksi/Rata-rata"
(goTo `lapTx`) ditaruh di **Transaksi & Export** (bareng `lapTx`), BUKAN di
Ringkasan seperti pengelompokan pertama yang sempat dipertimbangkan.

**File yang diubah:**
1. `index.html` & `app_production.html` — restrukturisasi `#keuanganTab-laporan`:
   tambah `.cn-tabs.lap-subtabs` nav (3 tombol, `data-action="setLaporanTab"`,
   class tombol **`.lap-subtab`, SENGAJA BUKAN `.cn-tab`**), bungkus 6 kartu
   jadi 3 `<div id="laporanTab-xxx">`. Semua `id` kartu/elemen di dalamnya
   (`lapAccList`, `grafikBars`, `cfBody`, `lapKat`, `lapTx`, dst) TIDAK
   diubah — fungsi render yang sudah ada (`renderLaporan()`,
   `renderCashflowForecast()`, dst, `modules-render.js`) tetap jalan apa
   adanya. Direstrukturisasi sekali di Python lalu ditempel SAMA PERSIS ke
   kedua file (pola sama dgn split Aset kemarin), diverifikasi `diff` 0.
2. `styles.css` — tambah `.lap-subtabs`/`.lap-subtab`/`.lap-subtab.active`,
   **class terpisah dari `.cn-tab`** (bukan cuma varian) — supaya query
   `#page-keuangan .cn-tab` yang dipakai `setKeuanganTab()`, `KEU_TAB_IDX`,
   & self-test generik TIDAK ikut menangkap tombol sub-tab bersarang ini
   (kalau ikut ketangkap: index tab top-level Kelola/Tagihan/dst jadi
   salah hitung & `classList.remove('active')` bakal ikut nge-reset tombol
   sub-tab). Pola isolasi class ini sudah ada presedennya di app ini
   (`.budget-tab-btn`, sub-tab Budget List/Rekomendasi) — bukan pola baru.
3. `tx-list-cashflow.js` — tambah `const LAPORAN_SUBTAB_ORDER` + `function
   setLaporanTab(t,el)`, persis pola `setAsetTab`, taruh setelah
   `setKeuanganTab`.
4. `dashboard-hub.js` — tambah `const LAPORAN_SUBTAB_IDX` + di dalam cabang
   `target.page === 'keuangan'`: kalau `target.tab==='laporan'` DAN
   `target.subtab` terisi, panggil `setLaporanTab()` juga (setelah
   `setKeuanganTab()`) — supaya kartu fitur Dashboard Hub yang nunjuk ke
   dalam tab Laporan (Saldo Akun, Grafik, Arus Kas, Per Kategori, Export)
   auto-buka sub-tab yang benar sebelum `goTo`/scroll-highlight, BUKAN
   nyasar ke sub-tab Ringkasan (default) kalau kontennya sebenarnya ada di
   sub-tab lain.
5. `dashboard-hub-registry.js` — tambah field `subtab` ke 4 entry kategori
   Keuangan yang nunjuk ke dalam tab Laporan (`keu-saldo-akun`→`ringkasan`,
   `keu-grafik`→`ringkasan`, `keu-cashflow`→`aruskas`,
   `keu-laporan-kategori`→`aruskas`, `keu-export`→`transaksi`) + update
   komentar "TAB REFERENSI".
6. `features-sheets-pwa-selftest.js` — tambah 1 entry ke `groups[]` self-test
   generik "panel tab benar-benar terlihat setelah tab diklik":
   `{page:'#keuanganTab-laporan', fn:setLaporanTab, paneId:t=>'laporanTab-'+t,
   btnClass:'.lap-subtab'}` — reuse harness yang sudah ada (presedennya
   entry `BudgetTabs.switchTo`/`.budget-tab-btn`), tidak menulis self-test
   baru dari nol.
7. `tests/dashboard-hub-registry.test.js` — tambah `KNOWN_SUBTABS =
   {'keuangan.laporan': ['ringkasan','aruskas','transaksi']}` + test baru
   cross-check `target.subtab` (valid sesuai whitelist DAN id
   `laporanTab-<subtab>` nyata ada di DOM), pola sama persis dgn test
   `target.tab` yang sudah ada.

**Kenapa TIDAK mengubah `goToList()` (filter-laporan.js):** sempat
dipertimbangkan nambah parameter sub-tab ke `goToList()` biar lebih generik,
tapi itu fungsi bersama dipakai BANYAK pemanggil lintas halaman (Shop, Car
Notes, Aset, dst) — mengubah signature-nya menambah risiko regresi di luar
scope sub-tab Laporan. Sebagai gantinya, 2 pemanggilan `goToList()` yang ada
DI DALAM tab Laporan sengaja diatur supaya goTo-target-nya selalu di
sub-tab yang sama dgn kartu pemanggilnya (lihat penjelasan grouping di
atas) — cukup lewat pengaturan DOM, tanpa nyentuh `goToList()` sama sekali.

**Diverifikasi:**
- `node --test tests/*.test.js` → **1713/1713 pass, 0 fail** (naik dari 1712
  sebelum sesi ini, +1 test baru [`target.subtab` cross-check], 0 regresi).
- `node scripts/build.js kw83-split-laporan-subtab-1` → sukses, v373→v374,
  kedua bundle lolos `node --check` sintaks, `index.html` &
  `app_production.html` tetap identik setelah build, `FILE-MAP.md`
  diregenerasi otomatis.
- Sanity-check manual (regex hitung tombol dalam blok `#page-keuangan`):
  6 tombol `.cn-tab` (top-level) vs 3 tombol `.lap-subtab` (nested) —
  dikonfirmasi TIDAK ada tabrakan class/selector.
- Smoke-test browser (Playwright) & `npm run lint` **TIDAK dijalankan sesi
  ini** — sandbox tanpa Chrome/Playwright terpasang & tanpa akses internet
  utk `npm install`/`eslint`, sama seperti keterbatasan hampir semua sesi
  sebelumnya di file ini. **Tolong jalankan smoke-test browser manual**
  (buka `?dev=1`, klik ketiga tombol sub-tab Laporan, pastikan kartu yang
  benar tampil & konten tetap terisi setelah filter diubah) **+
  `npm run lint`/`npm run check`** sebelum merge/release.

Sisa 2 kandidat dari audit sebelumnya (Keuangan > tab Kelola, Pajak & Zakat >
tab 🧾 Pajak) BELUM dikerjakan — di luar scope sesi ini.

## Catatan kerja — 2026-07-17 (bagian ke-3): split sub-tab 💰 Kelola (dalam page-keuangan)

Konteks: user minta lanjut 1 saran tab-split berikutnya. Dari 2 sisa
kandidat (Kelola, Pajak PPh21), dipilih **Kelola** — audit ulang jumlah
baris/kartu (dicek langsung dari `index.html`): Kelola ≈145 baris/~18
elemen bertanda `class="card...` (Insight, Saldo Bersih, Absensi Gaji,
Semua Transaksi + filter besar, Kelola Kategori, Import Data, Kekayaan
Bersih) vs tab Pajak (PPh 21) ≈117 baris/~15 — Kelola tetap yang
terpanjang & terbanyak kartunya dari sisa 2 kandidat.

**Sub-tab baru (nested DI DALAM tab Kelola yang sudah ada, pola SAMA PERSIS
dgn `setLaporanTab`/`setAsetTab`):**
- **📊 Ringkasan** (`#kelolaTab-ringkasan`) — Insight Keuangan, header
  month-nav, stat Pemasukan/Pengeluaran, Saldo Bersih, Gaji dari Absensi,
  Kekayaan Bersih.
- **💸 Transaksi** (`#kelolaTab-transaksi`) — tombol cepat Masuk/Keluar/
  Transfer, Kalkulator Gaji, Absensi Harian, kartu Semua Transaksi
  (filter+search+list+load more).
- **🏷️ Kelola Data** (`#kelolaTab-pengaturan`) — Kelola Kategori &
  Subkategori, Import Data dari Aplikasi Lain (keduanya sudah `<details>`
  collapse dari awal).

**Kenapa grouping-nya begini:** ada 2 pasangan `goToList()`/aksi DALAM tab
Kelola sendiri yang WAJIB tetap 1 sub-tab (`goToList()` TIDAK diberi
parameter sub-tab, sama seperti keputusan di split Laporan kemarin) —
tapi keduanya kebetulan sudah otomatis aman: `kbPiutang`/`kbTotalAset`/
`kbSaldoAkun`/`kbInventori` di kartu Kekayaan Bersih semua `goToList()`/
`showPage()` ke tab/halaman LAIN (bukan balik ke elemen di dalam Kelola
sendiri), jadi TIDAK ada kasus goTo-target yang kepisah sub-tab kayak
`lapCount→lapTx` kemarin. Header month-nav (`changeMonth`) sengaja ditaruh
di **Ringkasan** (bareng stat Pemasukan/Pengeluaran yang dipengaruhinya),
BUKAN di Transaksi — karena kartu "Semua Transaksi" py filter periode
sendiri (`txListPeriodeChips`/`setTxListPeriode`), independen dari
month-nav (`curMonth`/`curYear`, dipakai `mIncome`/`mExpense`/`mNet` saja).

**File yang diubah:**
1. `index.html` & `app_production.html` — restrukturisasi
   `#keuanganTab-kelola`: tambah `.cn-tabs.kel-subtabs` nav (3 tombol,
   `data-action="setKelolaTab"`, class tombol **`.kel-subtab`** — beda lagi
   dari `.cn-tab` MAUPUN `.lap-subtab`, alasan sama dgn split Laporan:
   cegah tabrakan query `#page-keuangan .cn-tab`), bungkus kartu-kartu jadi
   3 `<div id="kelolaTab-xxx">`. Semua `id` elemen di dalamnya TIDAK diubah
   — `renderKeuangan()` (modules-render.js) tetap mengisi `monthLabel`,
   `mIncome`/`mExpense`/`mNet`, `allTx`, dst di ketiga sub-tab sekaligus,
   terlepas dari mana yang aktif. Direstrukturisasi sekali di Python lalu
   ditempel SAMA PERSIS ke kedua file, `diff` 0.
2. `styles.css` — tambah `.kel-subtabs`/`.kel-subtab`/`.kel-subtab.active`,
   class terpisah dari `.cn-tab` & `.lap-subtab` (bukan varian keduanya).
3. `tx-list-cashflow.js` — tambah `const KELOLA_SUBTAB_ORDER` + `function
   setKelolaTab(t,el)`, persis pola `setLaporanTab`/`setAsetTab`.
4. `dashboard-hub.js` — tambah `const KELOLA_SUBTAB_IDX` + cabang baru
   `target.tab==='kelola' && target.subtab` (else-if setelah cabang
   `laporan`) yang panggil `setKelolaTab()` sesudah `setKeuanganTab()`.
5. `dashboard-hub-registry.js` — tambah `subtab: 'transaksi'` ke 3 entry
   yang nunjuk tab Kelola dgn `action:'openTxModal'` (`keu-transaksi`,
   `ai-kategorisasi`, `ai-scan-ocr`) — bukan krn goTo butuh (ketiganya
   modal-only, tidak goTo), tapi supaya konteks tab yang kebuka DI
   BELAKANG modal sesuai (kartu Semua Transaksi), bukan default Ringkasan.
   Update juga komentar "TAB REFERENSI".
6. `features-sheets-pwa-selftest.js` — tambah 1 entry ke `groups[]`:
   `{page:'#keuanganTab-kelola', fn:setKelolaTab, paneId:t=>'kelolaTab-'+t,
   btnClass:'.kel-subtab'}`.
7. `tests/dashboard-hub-registry.test.js` — `KNOWN_SUBTABS` diperluas
   dgn `'keuangan.kelola': ['ringkasan','transaksi','pengaturan']` + test
   `target.subtab` yang sudah ada (dari split Laporan) DIGENERALISASI
   (tambah `SUBTAB_PANE_PREFIX` map, bukan hardcode `laporanTab-`) supaya
   otomatis ikut cross-check subtab Kelola juga, tanpa duplikasi test.

**Diverifikasi:**
- `node --test tests/*.test.js` → **1713/1713 pass, 0 fail** (sama dgn
  sebelum sesi ini — tidak ada test BARU ditambahkan krn test
  `target.subtab` yang sudah ada digeneralisasi, bukan diduplikasi; 0
  regresi).
- `node scripts/build.js kw83-split-kelola-subtab-1` → sukses, v374→v375,
  kedua bundle lolos `node --check`, `index.html`/`app_production.html`
  tetap identik, `FILE-MAP.md` diregenerasi otomatis.
- Sanity-check manual (regex hitung tombol dalam blok `#page-keuangan`):
  6 `.cn-tab` (top-level) vs 3 `.lap-subtab` (Laporan) vs 3 `.kel-subtab`
  (Kelola) — dikonfirmasi TIDAK ada tabrakan class/selector antar
  ketiganya.
- Smoke-test browser (Playwright) & `npm run lint` **TIDAK dijalankan sesi
  ini** — sandbox tanpa Chrome/Playwright & tanpa akses internet, sama
  seperti sesi-sesi sebelumnya. **Tolong jalankan smoke-test browser
  manual** (buka `?dev=1`, klik ketiga tombol sub-tab Kelola, pastikan
  kartu yang benar tampil, tombol +Masuk/-Keluar/Transfer masih berfungsi,
  & filter/search transaksi tetap jalan) **+ `npm run lint`/`npm run
  check`** sebelum merge/release.

Sisa 1 kandidat dari audit sebelumnya (Pajak & Zakat > tab 🧾 Pajak PPh 21)
BELUM dikerjakan — di luar scope sesi ini.

## Catatan kerja — 2026-07-17 (bagian ke-4): split sub-tab 🧾 Pajak (PPh 21) (dalam page-pajak)

Konteks: user minta lanjut kandidat TERAKHIR dari daftar tab-split
(Keuangan > Laporan ✅, Keuangan > Kelola ✅, sisa: Pajak & Zakat > tab 🧾
Pajak PPh 21). Tab ini SENGAJA cuma dipecah 2 sub-tab (bukan 3 seperti
Laporan/Kelola/Aset) — audit ulang isi (dicek dari `index.html`) cuma
ketemu 2 kartu utama (🧾 Estimasi PPh 21, 🏛️ PBB) + 2 `<details>` terkait
(📖 Tabel Referensi PTKP & Tarif, 🏪 Pajak Bisnis Shop/UMKM), jadi
dikelompokkan jadi 2 sub-tab bertema, bukan dipaksa 3.

**Sub-tab baru (nested DI DALAM tab 🧾 Pajak yang sudah ada, pola SAMA
PERSIS dgn `setLaporanTab`/`setKelolaTab`/`setAsetTab`):**
- **🧾 PPh 21** (`#pjkTab-pph21`) — kartu Estimasi PPh 21 (Orang Pribadi) +
  `<details>` Tabel Referensi PTKP & Tarif.
- **🏛️ PBB & UMKM** (`#pjkTab-pbb`) — kartu PBB (Pajak Bumi & Bangunan) +
  `<details>` Pajak Bisnis Shop (UMKM).

**Kartu `pajakRekomendasiCard` (rekomendasi dinamis berdasar Status
Pekerjaan di Profil) SENGAJA ditaruh DI LUAR kedua sub-tab**, tetap di atas
nav sub-tab, persis di bawah `pajakRekomendasiCard` lama — karena isinya
lintas sub-tab (`renderPajakRekomendasi()` di `modules-render.js` bisa
merujuk baik kalkulator PPh 21 MAUPUN PPh Final UMKM sekaligus, tergantung
`D.profile.statusPekerjaan`: karyawan/freelance/keduanya). Kalau kartu ini
ikut dipindah ke salah satu sub-tab, rekomendasi yang menyebut kalkulator
di sub-tab LAIN jadi tidak terlihat user tanpa pindah tab dulu.

**Reorganisasi urutan DOM:** sebelumnya urutan kartu di `index.html` adalah
PPh21 → PBB → Tabel PTKP&Tarif → UMKM (PBB nyempil DI ANTARA PPh21 & tabel
referensinya). Supaya pengelompokan sub-tab masuk akal, urutan diubah jadi
PPh21 → Tabel PTKP&Tarif (sub-tab PPh 21) lalu PBB → UMKM (sub-tab PBB &
UMKM). Semua `id` kartu/elemen di dalamnya (`pjPPh21Card`, `pphResultBox`,
`pjPBBCard`, `pbbAssetPick`, `umkmDetails`, dst) TIDAK diubah sama sekali —
`renderPajakZakat()`/`renderPajakRekomendasi()`/`pilihAsetPBB()` dst
(dipanggil dari `renderPageContent('pajak')` di `modules-render.js`) tetap
jalan apa adanya, terlepas dari sub-tab mana yang aktif.

**File yang diubah:**
1. `index.html` & `app_production.html` — restrukturisasi `#pajakTab-pajak`
   (nested di dalam tab top-level 🧾 Pajak (PPh 21), yang sendiri nested di
   dalam `#page-pajak`): tambah `.cn-tabs.pjk-subtabs` nav (2 tombol,
   `data-action="setPjkTab"`, class tombol **`.pjk-subtab`** — beda lagi
   dari `.cn-tab`/`.lap-subtab`/`.kel-subtab`, alasan sama dgn split
   Laporan/Kelola: cegah tabrakan query `#page-pajak .cn-tab` yang dipakai
   `setPajakTab()`/`PAJAK_TAB_IDX`/self-test buat tab Zakat/Pajak
   tingkat-atas), bungkus & reorder kartu jadi 2 `<div id="pjkTab-xxx">`.
   Direstrukturisasi sekali di Python lalu ditempel SAMA PERSIS ke kedua
   file, `diff` 0.
2. `styles.css` — tambah `.pjk-subtabs`/`.pjk-subtab`/`.pjk-subtab.active`,
   class terpisah dari `.cn-tab`/`.lap-subtab`/`.kel-subtab` (bukan varian
   salah satunya).
3. `features-sheets-pwa-selftest.js` — tambah `const PJK_SUBTAB_ORDER` +
   `function setPjkTab(t,el)` (persis pola `setLaporanTab`/`setKelolaTab`),
   ditaruh tepat setelah `setPajakTab()` yang sudah ada di file yang sama
   (file ini SUDAH jadi rumah `setPajakTab`/`hitungPPh21`/`hitungPBB` dkk
   dari sesi-sesi lampau — bukan file baru, ikut lokasi yang sudah ada).
   Juga tambah 1 entry ke `groups[]` self-test generik "panel tab
   benar-benar terlihat setelah tab diklik": `{page:'#pajakTab-pajak',
   fn:setPjkTab, paneId:t=>'pjkTab-'+t, btnClass:'.pjk-subtab'}`.
4. `dashboard-hub.js` — tambah `const PJK_SUBTAB_IDX` + cabang baru di
   dalam blok `target.page === 'pajak'` yang panggil `setPjkTab()` kalau
   `target.tab==='pajak' && target.subtab`, sesudah `setPajakTab()` (pola
   sama dgn cabang `laporan`/`kelola` di dalam blok `keuangan`).
5. `dashboard-hub-registry.js` — tambah `subtab: 'pph21'` ke entry
   `pz-pph21` & `subtab: 'pbb'` ke entry `pz-pbb` (2 entry kategori Pajak &
   Zakat yang nunjuk ke tab `pajak`). Update juga komentar "TAB REFERENSI".
6. `tests/dashboard-hub-registry.test.js` — `KNOWN_SUBTABS` diperluas dgn
   `'pajak.pajak': ['pph21','pbb']` + `SUBTAB_PANE_PREFIX` diperluas dgn
   `'pajak.pajak': 'pjkTab-'` — REUSE test `target.subtab` yang sudah
   digeneralisasi di split Kelola (bukan test baru, otomatis ikut
   cross-check sub-tab Pajak juga).

**Kenapa TIDAK mengubah `goToList()`/fungsi navigasi lain:** tidak ada
pemanggilan `goToList()` DI DALAM tab Pajak yang menunjuk balik ke elemen
lain di dalam tab Pajak sendiri (beda dari kasus `lapCount→lapTx` di split
Laporan) — `pbbAssetPick` (dropdown pilih aset) manggil `pilihAsetPBB()`
murni baca `D.assets`, bukan navigasi; entry registry `pz-*` semua
`goTo` ke elemen di sub-tab yang SAMA dgn `subtab` barunya sendiri. Jadi
tidak ada penyesuaian selain menambah field `subtab` di 2 entry di atas.

**Diverifikasi:**
- `node --test tests/*.test.js` → **1713/1713 pass, 0 fail** (sama dgn
  sebelum sesi ini — tidak ada test BARU krn test `target.subtab` yang
  sudah ada di-reuse via `KNOWN_SUBTABS`/`SUBTAB_PANE_PREFIX`, bukan
  diduplikasi; 0 regresi).
- `node scripts/build.js kw84-split-pajak-subtab-1` → sukses, v375→v376,
  kedua bundle lolos `node --check` sintaks, `index.html` &
  `app_production.html` tetap identik setelah build, `FILE-MAP.md`
  diregenerasi otomatis.
- Sanity-check manual (regex hitung tombol dalam `index.html`): 19
  `.cn-tab` (top-level, semua halaman) vs 3 `.lap-subtab` (Laporan) vs 3
  `.kel-subtab` (Kelola) vs 2 `.pjk-subtab` (Pajak) — dikonfirmasi TIDAK
  ada tabrakan class/selector antar keempatnya.
- Smoke-test browser (Playwright) & `npm run lint`/`npm install` (esbuild)
  **TIDAK dijalankan sesi ini** — sandbox tanpa Chrome/Playwright terpasang
  & tanpa akses internet, sama seperti sesi-sesi split sebelumnya (build di
  atas otomatis fallback ke bundle TANPA minifikasi krn esbuild tidak
  ketemu, sesuai catatan esbuild di atas — bundle tetap valid & aman
  dipakai, cuma lebih besar). **Tolong jalankan smoke-test browser manual**
  (buka `?dev=1`, buka Pajak & Zakat > tab 🧾 Pajak (PPh 21), klik kedua
  tombol sub-tab, pastikan kartu yang benar tampil, kalkulator PPh 21 & PBB
  tetap jalan, kartu rekomendasi tetap muncul di kedua sub-tab sesuai
  Status Pekerjaan) **+ `npm install --save-dev esbuild` lalu `npm run
  check` penuh (lint + test + build minified)** sebelum merge/release.

Dengan ini SEMUA 4 kandidat dari audit "halaman/tab kepanjangan" (page-aset,
Keuangan > Laporan, Keuangan > Kelola, Pajak & Zakat > Pajak PPh 21) SUDAH
selesai dipecah jadi tab/sub-tab. Belum ada audit baru dijalankan setelah
ini utk cari kandidat split berikutnya (kalau ada) — di luar scope sesi ini.

## AUDIT + RENCANA KERJA BERTAHAP — Split tab 🧭 Dashboard Hub (landing page) — BELUM DIKERJAKAN

Konteks: user minta saran split tab lanjutan utk **Dashboard Hub**
(`#page-dashboard-hub`), landing page default aplikasi (bukan salah satu
dari 4 kandidat di atas — itu semua tab DI DALAM page lain, Dashboard Hub
adalah page-nya sendiri). Sesi ini **HANYA audit + rencana kerja**, TIDAK
ADA perubahan kode — pengelompokan sub-tab adalah keputusan produk (lihat
aturan "STOP dan tanya dulu" di bagian atas file ini), jadi ditulis dulu di
sini utk dikonfirmasi sebelum dieksekusi.

### 1. Temuan audit

`#page-dashboard-hub` (index.html baris 2193–2508, **≈316 baris** — lebih
panjang dari SEMUA 4 kandidat yang sudah dipecah sebelumnya sebelum
dipecah: Aset ~? kartu/8, Laporan ≈136 baris, Kelola ≈145 baris, Pajak
≈117 baris) berisi, urut dari atas:

1. **Hero Card** (`dashHubHeroCard`) — saldo semua akun + pemasukan/
   pengeluaran bulan ini. Diisi `DashboardHubHero.render()`.
2. **🪜 Tangga Ternak Uang** (`tanggaKeuanganCard`) — kartu besar
   background image, diisi script terpisah (`tangga-keuangan.js`, load
   SETELAH bundle).
3. **Quick Actions** (`dashHubQuickActions`) — 4 tombol (Transaksi,
   Backup, Cari, AI). Murni markup, tidak ada modul JS sendiri.
4. **Summary Cards** (`dashHubSummaryGrid`) — diisi
   `DashboardHubSummary.render()`.
5. **Analytics row** (`dashHubAnalyticsRow`) — diisi
   `DashboardHubAnalytics.render()`.
6. **🔍 Search fitur** (`dashHubSearchInput` + `dashHubSearchResults`).
7. **⭐ Favorit** (`dashHubFavoritSection`, `u-dnone` default sampai user
   nge-favorit sesuatu) — diisi `DashboardHubFavoritView.render()`.
8. **Tab switcher yang SUDAH ADA**: 🗂️ Semua Fitur ↔ 📌 Pinned Widget
   (`dashHubMainTabsRow`, pola `chip-btn` + `DashboardHub.setMainTab()`/
   `applyMainTab()` di `dashboard-hub.js`, preferensi diingat di
   `localStorage['dashHubMainTab']`, default `'fitur'`). Ini BUKAN pola
   `.cn-tab`/`.lap-subtab` dkk yang dipakai di 4 split sebelumnya — sistem
   beda, dibuat sesi lampau (lihat `QUICK-ACTIONS.md`/`PINNED-WIDGETS.md`),
   TIDAK disentuh sesi ini, murni didata ulang di sini.
   - Pane **"Semua Fitur"** (`dashHubMainGridCard`) — grid kategori fitur
     (`dashboardHubGrid`), collapsible sendiri (`card-collapse-toggle`).
   - Pane **"Pinned Widget"** (`dashboardHubPinnedWrap`) — **6 kartu besar
     ditumpuk**: 🧭 Penasihat (`advisorCard`), 🎯 Skor Hidup Seimbang
     (`lifeBalanceCard`), 🌱 Refleksi & Self-Care (`refleksiCard`), 🎯
     Kebebasan Finansial (`dashFiCard`), 🏖️ Dana Pensiun
     (`dashPensiunCard`), 📅 Absensi Harian (`dashAbsensiCard`).
9. **🌱 Life OS** (`lifeOSWrap`, `u-dnone` default, toggle di Setelan) —
   DI LUAR tab switcher #8, jadi selalu ada di DOM (kadang tersembunyi via
   toggle setting, BUKAN via tab Fitur/Pinned).
10. **🌦️ Kondisi Ekonomi / EIE** (`eieWrap`) — DI LUAR tab switcher #8
    juga, SELALU tampil (tidak ada toggle sembunyi seperti Life OS).

**Kenapa terasa panjang:** item #1–7 SEMUA selalu tampil sebelum user
sampai ke tab switcher #8, lalu #9–10 (Life OS + EIE) juga selalu tampil
lagi SETELAH pane #8 — jadi walau sudah ada 1 tab switcher, total ada 3
"section besar" (item 1-7, pane Pinned Widget yang isinya 6 kartu, lalu
Life OS+EIE) yang semuanya numpuk berurutan, bukan benar-benar tersembunyi
lewat tab.

**`DashboardHub.render()` (dashboard-hub.js) memanggil SEMUA render()
modul di atas tanpa syarat** (LifeOSHome, DashboardHubFavoritView,
DashboardHubHero, DashboardHubSummary, DashboardHubAnalytics,
EIEDashboard, dst) — baru di baris PALING BAWAH toggle visibility Fitur/
Pinned dijalankan (`applyMainTab`). Pola ini match dgn split-split
sebelumnya (Laporan/Kelola/Aset/Pajak): render tetap isi SEMUA sub-tab
sekaligus, cuma visibility yang di-toggle — jadi split baru bisa REUSE
pola yang sama, tidak perlu ubah cara render.

### 2. Kenapa risiko lebih tinggi dari 4 split sebelumnya

- **13 file test** khusus menyentuh `page-dashboard-hub`
  (`tests/dashboard-hub*.test.js`) — jauh lebih banyak dari test yang
  disentuh tiap split sebelumnya (Laporan/Kelola cuma nambah ke 1 file
  `dashboard-hub-registry.test.js`).
- Ini **landing page default** (`class="page active"` saat startup) —
  bug di sini langsung kelihatan tiap buka app, beda dari tab yang perlu
  diklik dulu.
- Sudah dicek: `tests/dashboard-hub-quickactions.test.js` &
  `tests/dashboard-hub-pinned-widgets.test.js`/`pinnedwidgets.test.js`
  TIDAK menuntut struktur DOM parent-child yang kaku — mereka cek (a)
  **urutan posisi string** (`heroIdx < qaIdx < searchIdx`, aman dilewati
  asal urutan elemen tidak dibalik) dan (b) **elemen tsb ADA DI DALAM
  `#page-dashboard-hub`** (aman dilewati asal tetap nested di situ, boleh
  dibungkus wrapper div baru). Jadi risikonya **bisa dikelola** asal
  urutan DOM tidak dibalik & tidak ada elemen yang dipindah KELUAR dari
  `#page-dashboard-hub` — sama seperti prinsip yang sudah dipakai di split
  Aset/Laporan/Kelola/Pajak (index/id kartu tidak diubah, cuma dibungkus).

### 3. Usulan pengelompokan sub-tab (masih perlu dikonfirmasi user)

Hero Card + Quick Actions + Search **diusulkan TETAP selalu tampil di
atas** (tidak ikut dipecah) — itu yang paling sering dibutuhkan sekali
lihat begitu buka app, beda karakter dari kartu2 lain yang sifatnya lebih
"jelajah fitur".

| Sub-tab baru | Isi |
|---|---|
| *(selalu tampil, di atas nav sub-tab)* | Hero Card, Quick Actions, Search |
| 📊 Ringkasan | Summary Cards, Analytics row, 🪜 Tangga Ternak Uang |
| 🗂️ Fitur | ⭐ Favorit, lalu switcher **Semua Fitur ↔ Pinned Widget yang SUDAH ADA (tidak diubah)** |
| 🌦️ Insight | 🌱 Life OS, 🌦️ Kondisi Ekonomi (EIE) |

Opsional tahap lanjutan (kalau pane Pinned Widget masih dirasa panjang
setelah split di atas): pecah 6 kartu Pinned Widget jadi 2 grup kecil pakai
sistem sub-sub-tab yang sama (mis. "Finansial": Kebebasan Finansial/Dana
Pensiun/Absensi vs "Personal": Penasihat/Skor Hidup Seimbang/Refleksi) —
TIDAK termasuk rencana Fase 1-6 di bawah, nunggu evaluasi setelah Fase 1-6
selesai & dirasakan langsung.

**Pertanyaan produk yang perlu dijawab user sebelum eksekusi:**
1. Setuju grouping 3-sub-tab di atas, atau ada preferensi lain (mis.
   Favorit digabung ke section selalu-tampil, bukan masuk sub-tab Fitur)?
2. Nama/emoji sub-tab boleh diubah sesuai selera (📊 Ringkasan / 🗂️ Fitur /
   🌦️ Insight cuma usulan awal).
3. Switcher Fitur↔Pinned Widget yang sudah ada — tetap dipertahankan APA
   ADANYA di dalam sub-tab "🗂️ Fitur" (opsi di rencana ini), atau
   sekalian mau dilebur jadi sub-tab baru (bukan chip-switcher lagi)?

### 4. Rencana kerja bertahap (tiap fase independen, bisa di-`npm run
check` & commit terpisah — SAMA PERSIS filosofi "perubahan sekecil
mungkin" di bagian atas file ini)

**Fase 1 — Tambah nav sub-tab + bungkus DOM (index.html/app_production.html)**
- Tambah `.cn-tabs.dhb-subtabs` (2 tombol dulu, `.dhb-subtab`, class baru
  lagi — pola sama alasan sama dgn `.lap-subtab`/`.kel-subtab`/
  `.pjk-subtab`: cegah tabrakan `#page-dashboard-hub .cn-tab` andai nanti
  ada `.cn-tab` lain di page ini) diletakkan **setelah** Search/Favorit,
  **sebelum** tab switcher Fitur/Pinned lama (#8 di atas).
- Bungkus (TANPA reorder — urutan DOM existing dipertahankan) jadi 3
  `<div id="dashHubTab-xxx">`:
  - `dashHubTab-ringkasan`: Summary Cards + Analytics + Tangga Ternak Uang.

    ⚠️ Catatan urutan: Tangga Ternak Uang ada di ATAS Quick Actions di DOM
    saat ini (lihat temuan #2 vs #3 di atas), sementara Summary/Analytics
    (#4-5) ada di BAWAH Quick Actions. Kalau mau digabung 1 sub-tab
    Ringkasan tanpa reorder DOM, Tangga Ternak Uang TETAP di posisi
    asalnya (sebelum Quick Actions, di luar area selalu-tampil) — berarti
    definisi "selalu tampil di atas" di §3 perlu disesuaikan jadi Hero →
    Tangga Ternak Uang ATAU Tangga Ternak Uang ikut masuk sub-tab
    Ringkasan (butuh reorder kecil: pindah ke bawah Analytics). Pilih
    salah satu saat eksekusi Fase 1 — dicatat di sini supaya tidak
    kelewat, BUKAN diputuskan sepihak di rencana ini.
  - `dashHubTab-fitur`: Favorit + tab switcher Fitur/Pinned Widget lama
    (utuh, tidak diubah isinya).
  - `dashHubTab-insight`: Life OS wrap + EIE wrap.
- Tambah `DashboardHub.setSectionTab(tab)` / `applySectionTab(tab)` di
  `dashboard-hub.js` — method BARU di object `DashboardHub` yang sudah
  ada (pola sama persis dgn `setMainTab`/`applyMainTab` yang sudah ada di
  situ, TAPI localStorage key BEDA: `dashHubSectionTab`, supaya tidak
  tabrakan dgn `dashHubMainTab` yang sudah ada). Dipanggil dari
  `DashboardHub.render()` di baris paling akhir (setelah
  `this.applyMainTab(...)` yang sudah ada), pola "render semua dulu, baru
  toggle visibility" tetap sama.
- CSS: `styles.css` tambah `.dhb-subtabs`/`.dhb-subtab`/
  `.dhb-subtab.active`, copy pola persis dari `.pjk-subtabs` dkk.

**Fase 2 — Self-test & test generalisasi**
- `features-sheets-pwa-selftest.js`: tambah 1 entry ke `groups[]`
  (`{page:'#page-dashboard-hub', fn:DashboardHub.setSectionTab,
  paneId:t=>'dashHubTab-'+t, btnClass:'.dhb-subtab'}` — cek dulu apakah
  harness `groups[]` support `fn` berupa method object (`Xxx.yyy`), kalau
  cuma support fungsi global perlu wrapper tipis).
- `tests/dashboard-hub-registry.test.js`: **kemungkinan besar TIDAK perlu
  diubah** — Dashboard Hub bukan target navigasi (`target.page:
  'dashboard-hub'` dgn `subtab`) dari page lain di `FEATURE_REGISTRY`
  setahu audit ini (perlu di-grep ulang saat eksekusi: `grep "page:
  'dashboard-hub'" dashboard-hub-registry.js` — kalau ADA entry semacam
  itu, baru perlu tambah `subtab` + masuk `KNOWN_SUBTABS`/
  `SUBTAB_PANE_PREFIX` pakai key `'dashboard-hub.<tab>'`).
- Test yang WAJIB dicek manual satu-satu (bukan auto-fix, baca dulu
  assert-nya) karena posisi/containment-sensitive (lihat §2):
  `dashboard-hub-quickactions.test.js`,
  `dashboard-hub-pinned-widgets.test.js`,
  `dashboard-hub-pinnedwidgets.test.js`,
  `dashboard-hub-default-landing.test.js`,
  `dashboard-hub-advisor-lifebalance-migration.test.js`.

**Fase 3 — `npm run check` penuh + smoke-test manual**
- `node --test tests/*.test.js` sampai 0 fail (baseline sebelum mulai:
  1713/1713 — catat angka SEBELUM Fase 1 mulai, supaya jelas berapa test
  baru/berubah).
- `node scripts/build.js` → cek versi naik, `index.html`/
  `app_production.html` tetap identik, bundle lolos `node --check`.
- Smoke-test browser manual WAJIB (lebih kritis dari split sebelumnya
  krn ini landing page): buka app dari awal (bukan `?dev=1` doang),
  pastikan Hero/Quick Actions/Search langsung kelihatan tanpa perlu klik
  apa-apa, klik ketiga sub-tab baru, pastikan grid Semua Fitur & Pinned
  Widget (switcher lama) masih jalan seperti biasa DI DALAM sub-tab
  Fitur, pastikan Favorit/Life OS/EIE masih render datanya, pastikan
  reload app balik ke sub-tab terakhir yang aktif (via localStorage,
  konsisten dgn perilaku `dashHubMainTab` yang sudah ada).

**Fase 4 (opsional, TIDAK termasuk scope awal)** — pecah pane Pinned
Widget (6 kartu) jadi 2 sub-sub-tab, lihat §3 "Opsional tahap lanjutan".
Hanya dikerjakan kalau setelah Fase 1-3 dirasa masih kurang & user minta
lanjut.

### 5. Status

**Fase 1 SELESAI** (lihat catatan kerja 2026-07-17 bagian ke-5 di bawah).
**Fase 2 SELESAI/diverifikasi — TIDAK ada perubahan kode** (lihat catatan
kerja 2026-07-17 bagian ke-6 di bawah): harness `groups[]` dikonfirmasi
memang tidak cocok (1 pane id per tab, bukan beberapa id tersebar) —
cakupan setara sudah dipenuhi `dashboard-hub-sectiontabs.test.js` yang
dibuat di Fase 1, jadi generalisasi harness lama ditutup sebagai "sengaja
dilewati", bukan utang. `dashboard-hub-registry.test.js` dikonfirmasi
TIDAK perlu diubah (di-grep ulang, tidak ada entry `subtab` yang
dibutuhkan). Fase 3 (npm run check penuh + smoke-test manual) — bagian
`test`+`build` SUDAH dijalankan & hijau (lihat bagian ke-6), `lint` &
smoke-test browser manual **masih BELUM** (lihat catatan "belum
dikerjakan" di bagian ke-6).

## Catatan kerja — 2026-07-17 (bagian ke-5): eksekusi Fase 1 — split tab 🧭 Dashboard Hub (landing page)

Konteks: lanjutan audit di atas ("BELUM DIKERJAKAN"). User minta lanjut
eksekusi Fase 1 langsung (tanpa menunggu jawaban 1-per-1 dari 3 pertanyaan
produk di §3) — keputusan di bawah diambil mengikuti opsi berisiko-paling-
rendah/paling-sesuai filosofi "perubahan sekecil mungkin" di atas, BUKAN
keputusan sepihak soal selera produk.

**Keputusan yang diambil (menjawab §3 & catatan ambiguitas Tangga Ternak
Uang di Fase 1):**
1. Grouping 3-sub-tab dipakai APA ADANYA sesuai usulan §3 (📊 Ringkasan /
   🗂️ Fitur / 🌦️ Insight) — nama/emoji belum diubah, gampang di-rename user
   kapan saja (tinggal ganti teks tombol di index.html/app_production.html,
   key internal `ringkasan`/`fitur`/`insight` tidak perlu ikut berubah).
2. **Tangga Ternak Uang TETAP jadi bagian "selalu tampil" (Hero → Tangga →
   Quick Actions → Search), TIDAK ikut masuk sub-tab Ringkasan** — opsi ini
   dipilih (bukan opsi "pindah ke bawah Analytics") krn 0 reorder DOM, vs
   opsi satunya butuh reorder kecil. Kalau ternyata maunya Tangga ikut masuk
   Ringkasan (supaya area "selalu tampil" lebih ringkas), tinggal bilang —
   perubahannya kecil (pindah 1 blok + tambah 1 id ke daftar grup Ringkasan
   di `applySectionTab()`).
3. Switcher Fitur↔Pinned Widget yang sudah ada **dipertahankan APA ADANYA**
   di dalam sub-tab Fitur (tidak dilebur jadi sub-tab baru) — opsi paling
   rendah risiko dari 2 opsi di §3 poin 3.

**Keputusan implementasi (beda dari draf rencana awal Fase 1 di atas, dgn
alasan):** draf awal menyebut "bungkus jadi 3 `<div id="dashHubTab-xxx">`".
Setelah dicek ulang, itu TIDAK dieksekusi persis begitu — SENGAJA TIDAK ada
`<div id="dashHubTab-xxx">` wrapper baru sama sekali. Alasan:
- Section yang perlu dikelompokkan TIDAK bersebelahan di DOM (Summary/
  Analytics ada SEBELUM search bar, Favorit tepat SEBELUM nav baru, tab
  switcher Fitur/Pinned tepat SESUDAHNYA, LifeOS/EIE jauh di bawah lagi) —
  membungkusnya jadi 3 wrapper div yang benar2 nempel ke nav butuh reorder
  DOM yang lebih besar dari yang tersirat di draf, & lebih berisiko ke test
  containment/urutan yang sudah ada (lihat §2 di atas).
- Sebagai gantinya, `DashboardHub.setSectionTab(tab)`/`applySectionTab(tab)`
  (2 method BARU di object `DashboardHub` yang sudah ada di
  `dashboard-hub.js`, pola sama persis dgn `setMainTab`/`applyMainTab` yang
  sudah ada) toggle class `u-dnone` LANGSUNG ke 8 id section yang SUDAH ADA
  (`dashHubSummaryGrid`, `dashHubAnalyticsRow`, `dashHubFavoritSection`,
  `dashHubMainTabsRow`, `dashHubMainGridCard`, `dashboardHubPinnedWrap`,
  `lifeOSWrap`, `eieWrap`) — 0 reorder, 0 wrapper baru, markup/id semua
  section itu sendiri TIDAK disentuh sama sekali.
- `dashHubMainGridCard`/`dashboardHubPinnedWrap` (switcher Fitur/Pinned)
  & `dashHubFavoritSection` (Favorit) punya visibility SENDIRI yang
  data-driven (tunduk ke `dashHubMainTab`, atau kosong-kalau-belum-ada-
  favorit) — `applySectionTab()` SENGAJA memanggil ulang
  `applyMainTab()`/`DashboardHubFavoritView.render()` di akhir supaya
  keputusan itu tetap dihormati saat sub-tab "Fitur" aktif lagi, bukan
  ketimpa jadi selalu-tampil oleh toggle generik.
- Konsekuensi: harness self-test generik `groups[]` yang sudah ada di
  `features-sheets-pwa-selftest.js` (dipakai `setLaporanTab`/`setKelolaTab`/
  `setPjkTab` dkk, cek `document.getElementById(g.paneId(tabName))`) TIDAK
  cocok dipakai di sini (butuh 1 pane id per tab, bukan beberapa id
  tersebar) — SENGAJA tidak ditambah entry baru ke situ. Sebagai gantinya,
  perilaku toggle dites lewat `tests/dashboard-hub-sectiontabs.test.js`
  (loadSource + document/localStorage tiruan, pola sama dgn
  `tests/dashboard-hub.test.js`) — cakupannya setara (tiap section
  dipastikan tampil/sembunyi yang benar per sub-tab + persist
  localStorage), cuma harnessnya beda.

**File yang diubah:**
1. `index.html` & `app_production.html` — tambah nav `.cn-tabs.dhb-subtabs`
   (3 tombol `.dhb-subtab`, id `dashHubSectionTabBtn-ringkasan/fitur/
   insight`, `data-action="DashboardHub.setSectionTab"`) tepat di antara
   `#dashHubFavoritSection` & `#dashHubMainTabsRow`. TIDAK ADA elemen lain
   yang dipindah/dihapus — restrukturisasi sekali lalu ditempel SAMA PERSIS
   ke kedua file (`diff` 0, dites `tests/dashboard-hub-sectiontabs.test.js`).
2. `styles.css` — tambah `.dhb-subtabs`/`.dhb-subtab`/`.dhb-subtab.active`,
   copy pola persis dari `.pjk-subtabs` dkk (class terpisah, cegah tabrakan
   `#page-dashboard-hub .cn-tab`).
3. `dashboard-hub.js` — tambah `DashboardHub.setSectionTab(tab)` &
   `DashboardHub.applySectionTab(tab)`, dipanggil dari `DashboardHub.render()`
   baris paling akhir (setelah `applyMainTab(...)` yang sudah ada). Pilihan
   diingat via `localStorage['dashHubSectionTab']` (default `'ringkasan'`),
   pola sama dgn `dashHubMainTab`.
4. `tests/dashboard-hub-sectiontabs.test.js` (BARU) — 14 test: struktur
   markup (posisi nav, 3 tombol & id/data-args-nya, Hero/Tangga/Quick
   Actions/Search tidak tersentuh, semua section masih ada di dalam
   `#page-dashboard-hub`, `index.html`=`app_production.html`), token CSS,
   & perilaku `setSectionTab`/`applySectionTab` (toggle per grup + interaksi
   dgn `dashHubMainTab` yang sudah ada + persist localStorage).

**Yang TIDAK diubah (sengaja, di luar scope Fase 1):**
- `dashboard-hub-registry.js`/`tests/dashboard-hub-registry.test.js` — tidak
  ada entry `target.page:'dashboard-hub'` yang butuh field `subtab` baru
  (semua entry ke halaman ini pakai `goTo`/`dashKey`, bukan konsep sub-tab);
  dicek via `grep "page: 'dashboard-hub'" dashboard-hub-registry.js`.
- Harness self-test generik `groups[]` di `features-sheets-pwa-selftest.js`
  — lihat alasan di atas (bentuk datanya tidak cocok, 1 section pane per
  tab).
- Interaksi `goTo` (klik hasil pencarian/Favorit yang menuju kartu di dalam
  Pinned Widget, mis. `advisorCard`) dgn `dashHubMainTab` **sudah punya gap
  sebelum sesi ini** (tidak otomatis switch `dashHubMainTab` ke `'pinned'`
  kalau target ada di situ) — Fase 1 ini TIDAK memperbesar gap itu (perilaku
  sama persis sebelum & sesudah), cuma menambahkan 1 lapis kondisi baru
  (`dashHubSectionTab` harus `'fitur'` juga) di atas gap yang sudah ada.
  Perbaikan gap ini (kalau memang mau dibereskan) lebih tepat jadi sesi
  terpisah krn menyentuh `dashHubNavigateToFeature()`/registry, bukan
  sekadar split tab.

**Diverifikasi:**
- `node --test tests/*.test.js` → **1727/1727 pass, 0 fail** (baseline
  sebelum sesi ini: 1713 pass; +14 test baru dari
  `dashboard-hub-sectiontabs.test.js`, 0 regresi ke 1713 test lama).
- `node scripts/build.js kw85-dashboardhub-sectiontabs-fase1-1` → sukses,
  v376→v377, kedua bundle lolos `node --check` sintaks & lint-guard bawaan
  build (`u-dnone` permanen kosong / `escapeHtml` / chicken-egg Tesseract),
  `index.html` & `app_production.html` tetap identik setelah build,
  `FILE-MAP.md` diregenerasi otomatis (112 file, 1063 identifier global).
- Sanity-check manual (regex hitung tombol dalam `index.html`): 28 `.cn-tab`
  vs 3 `.lap-subtab` vs 3 `.kel-subtab` vs 2 `.pjk-subtab` vs **3
  `.dhb-subtab`** — dikonfirmasi tidak ada tabrakan class/selector.
- `npm run lint` (ESLint) & `npm install --save-dev esbuild` **TIDAK
  dijalankan sesi ini** — sandbox tanpa akses internet & tanpa `eslint`
  terpasang (sama seperti sesi-sesi split sebelumnya; build di atas
  otomatis fallback ke bundle TANPA minifikasi krn esbuild tidak ketemu,
  bundle tetap valid & aman, cuma lebih besar). **Tolong jalankan `npm
  install` (esbuild+eslint) → `npm run check` penuh, lalu smoke-test browser
  manual** (buka `?dev=1`, klik ketiga sub-tab baru di Beranda, pastikan
  Hero/Tangga/Quick Actions/Search tetap kelihatan tanpa klik apa-apa, grid
  Semua Fitur & Pinned Widget switcher masih jalan DI DALAM sub-tab Fitur,
  Favorit/Life OS/EIE masih render datanya, reload app balik ke sub-tab
  terakhir yang aktif) **sebelum merge/release** — belum dijalankan sesi
  ini, persis catatan yang sama di tiap split sebelumnya.

Fase 2 (opsional, generalisasi harness `groups[]` bawaan) SENGAJA dilewati
(lihat alasan "Yang TIDAK diubah" di atas, bukan kelupaan). Fase 4 (pecah
Pinned Widget jadi 2 sub-sub-tab) masih menunggu evaluasi setelah Fase 1 ini
dirasakan langsung, sesuai rencana awal.

## Catatan kerja — 2026-07-17 (bagian ke-6): eksekusi Fase 2 — verifikasi self-test/test generalisasi (split tab Dashboard Hub)

Konteks: lanjutan dari bagian ke-5. User minta lanjut ke Fase 2 sesuai
rencana bertahap di §4. Rencana awal Fase 2 (di §4) berisi 3 item: (a)
tambah entry ke harness `groups[]` di `features-sheets-pwa-selftest.js`,
(b) cek `dashboard-hub-registry.test.js`, (c) cek manual 5 file test yang
posisi/containment-sensitive. Ketiganya dikerjakan sebagai **verifikasi**,
BUKAN penulisan kode baru — hasilnya nihil perubahan kode, sesuai yang
sudah diantisipasi & diputuskan di catatan bagian ke-5 ("Fase 2 SENGAJA
dilewati").

**(a) Harness `groups[]` — dikonfirmasi ulang TIDAK cocok, keputusan
lama tetap berlaku:**
Dibaca `groups.forEach()` di `features-sheets-pwa-selftest.js`
(baris ~1697-1730): tiap entry hanya boleh punya **1 pane id per nama
tab** (`document.getElementById(g.paneId(tabName))`, singular). Sub-tab
Dashboard Hub tidak begitu — 1 sub-tab = beberapa id section tersebar
(mis. "Ringkasan" = `dashHubSummaryGrid` + `dashHubAnalyticsRow`,
"Fitur" = `dashHubFavoritSection` + `dashHubMainTabsRow` +
`dashHubMainGridCard`/`dashboardHubPinnedWrap`, "Insight" = `lifeOSWrap`
+ `eieWrap`). Menambah entry `dashboard-hub` ke `groups[]` apa adanya
akan salah assert (cuma cek 1 id, id lain kelewat) — harus ubah bentuk
harness (`paneId` jadi array) yang berisiko ke 4 entry lain yang sudah
ada (`carnotes`/`shop`/`pajak`/`keuangan` dkk), padahal 14 test di
`dashboard-hub-sectiontabs.test.js` (dibuat Fase 1) SUDAH mengecek hal
yang sama (visible/hidden per grup id + persist localStorage) dengan
harness khusus yang cocok bentuk datanya. Kesimpulan: **cakupan test
sudah setara, generalisasi harness lama ditutup sebagai keputusan sadar,
bukan item yang masih terutang.** (Catatan: `fn` sebagai method object
seperti `Xxx.yyy`, mis. `DashboardHub.setSectionTab`, sebenarnya SUDAH
didukung harness ini — ada preseden `BudgetTabs.switchTo` di entry yang
sudah ada. Yang jadi ganjalan murni bentuk `paneId` singular di atas,
bukan bentuk `fn`.)

**(b) `dashboard-hub-registry.test.js` — dikonfirmasi TIDAK perlu
diubah:**
`grep "page: 'dashboard-hub'" dashboard-hub-registry.js` → semua 6 entry
yang ditemukan pakai `target:{page:'dashboard-hub', goTo:'...'}` atau
`dashKey:'...'` (mis. `advisorCard`, `lifeBalanceCard`, `refleksiCard`,
`dashFiCard`, `dashAbsensiCard`) — TIDAK ADA satupun yang pakai field
`subtab`, jadi tidak ada yang perlu ditambah ke `KNOWN_SUBTABS`/
`SUBTAB_PANE_PREFIX`, konsisten dgn dugaan di rencana awal §4 Fase 2.
(Di luar scope Fase 2, sekadar dicatat sebagai temuan: entry `goTo` di
atas semuanya mengarah ke kartu yang sekarang ada DI DALAM sub-tab
"Fitur" atau "Insight" — ini gap navigasi `dashHubSectionTab` yang SUDAH
disebut di catatan bagian ke-5 sebagai "sudah ada sebelum sesi ini, TIDAK
diperbesar Fase 1", tetap di luar scope sesi ini juga, biar jadi sesi
terpisah kalau mau dibereskan.)

**(c) 5 file test posisi/containment-sensitive — dibaca satu-satu,
dikonfirmasi aman:**
`dashboard-hub-quickactions.test.js`, `dashboard-hub-pinned-widgets.test.js`,
`dashboard-hub-pinnedwidgets.test.js`, `dashboard-hub-default-landing.test.js`,
`dashboard-hub-advisor-lifebalance-migration.test.js` — semua pakai cek
posisi string (`html.indexOf('id="..."')` + perbandingan urutan index) atau
containment sederhana (index section A < index elemen B, artinya B ada "di
dalam" A), BUKAN struktur parent-child DOM yang kaku. Karena Fase 1 sengaja
TIDAK reorder DOM & TIDAK menambah wrapper baru (toggle `u-dnone` langsung
ke 8 id section existing), asumsi di kelima file test ini tetap valid tanpa
perlu diubah.

**Diverifikasi (bagian test & build dari Fase 3, dijalankan lebih awal
sebagai bagian verifikasi Fase 2 di atas):**
- `node --test tests/*.test.js` → **1727/1727 pass, 0 fail** — sama persis
  dgn baseline akhir Fase 1 (tidak ada regresi, karena memang tidak ada
  perubahan kode di Fase 2 ini).
- `node scripts/build.js` sempat dijalankan sbg smoke-check tambahan →
  sukses, sintaks kedua bundle lolos `node --check`, `index.html`/
  `app_production.html` tetap identik satu sama lain. **Hasil build ini
  SENGAJA DIBUANG/di-revert** (versi kembali ke 377, bundle balik ke isi
  semula) karena tidak ada perubahan source yang perlu dibundel — menjaga
  filosofi "perubahan sekecil mungkin", bukan naikin nomor versi tanpa
  alasan fungsional.
- `npm run lint` (ESLint) **TIDAK dijalankan** — sandbox sesi ini tanpa
  akses internet & tanpa `node_modules`/`eslint` terpasang (`npm install`
  butuh network yang tidak tersedia di sandbox ini), sama seperti
  keterbatasan yang dicatat di sesi-sesi split sebelumnya.
- Smoke-test browser manual (buka app dari awal, klik 3 sub-tab baru,
  pastikan Hero/Quick Actions/Search & switcher Fitur/Pinned & Favorit/Life
  OS/EIE semua masih jalan, reload balik ke sub-tab terakhir) **BELUM
  dijalankan** — perlu lingkungan browser sungguhan, di luar kapasitas
  sandbox ini. **WAJIB dilakukan manual sebelum merge/release**, sama
  seperti catatan yang berulang di sesi-sesi sebelumnya.

**File yang diubah sesi ini:** hanya `docs/CLAUDE.md` (dokumentasi status
Fase 2 di atas). **Tidak ada file source/test/bundle lain yang berubah.**

**Sisa pekerjaan sebelum rilis (bukan lagi bagian Fase 1/2, ini murni Fase
3 poin verifikasi manual yang minta akses di luar sandbox):**
1. `npm install` (sekali, butuh internet) lalu `npm run lint` — cek ESLint
   belum pernah jalan utk perubahan split tab ini sama sekali.
2. Smoke-test browser manual (lihat daftar di atas).
3. Setelah 1 & 2 hijau, baru `npm run build` / `npm run release` beneran
   (bukan run-lalu-buang seperti verifikasi sesi ini) utk naikin versi &
   bikin bundle rilis yang sesungguhnya.

## Catatan kerja — 2026-07-17 (bagian ke-7): eksekusi Fase 3 — sejauh mana bisa diverifikasi dari sandbox tanpa akses CLI/git/browser

Konteks: user minta lanjut eksekusi Fase 3 (3 poin di atas) dari sesi
sebelumnya. Sandbox sesi ini (chat, bukan Claude Code) punya batasan lebih
ketat dari sandbox split-tab sebelumnya: **tanpa akses jaringan sama sekali**
(bukan cuma "tanpa `node_modules` terpasang") dan **tanpa `.git`** (zip
diekstrak langsung, bukan clone). Jadi dari 3 poin Fase 3, cuma sebagian
yang benar-benar bisa dikerjakan di sini:

**1. `npm install` + `npm run lint` — TIDAK BISA dijalankan di sandbox ini.**
`npm install` gagal keras (`403 Forbidden` ke `registry.npmjs.org`) karena
jaringan dimatikan total di sandbox chat ini — beda dgn sandbox sesi
sebelumnya yg setidaknya bisa akses internet tapi belum sempat install.
ESLint tetap 0% tercoverage utk seluruh perubahan split tab Dashboard Hub
(Fase 1) sejak awal. **Ini WAJIB dijalankan oleh user sendiri di mesin dgn
akses internet** sebelum rilis — bukan sekadar item verifikasi opsional.

**2. Smoke-test browser manual — TIDAK BISA dijalankan langsung oleh
Claude (tidak ada browser sungguhan di sandbox ini), tapi disiapkan agar
user bisa jalankan sendiri dgn 1 klik:**
Menjalankan ulang `node scripts/build-preview.js` dari source APA ADANYA
(tanpa perubahan kode apa pun, versi tetap 377 — TIDAK di-build-release
krn poin 1 & 2 belum hijau, konsisten dgn aturan "Setelah 1 & 2 hijau, baru
build/release beneran" di atas) → menghasilkan `keluarga-w-preview.html`
baru (1 file HTML self-contained, semua JS inline) yg BISA dibuka langsung
oleh user sbg preview/artifact utk menjalankan sendiri checklist smoke-test
manual yg sudah dicatat di bagian ke-5/ke-6 (buka `?dev=1`, klik 3 sub-tab
baru di Beranda, pastikan Hero/Tangga/Quick Actions/Search tetap kelihatan,
grid Semua Fitur & Pinned Widget switcher jalan DI DALAM sub-tab Fitur,
Favorit/Life OS/EIE render datanya, reload balik ke sub-tab terakhir aktif).

**3. `npm run build` / `npm run release` beneran — SENGAJA BELUM
dijalankan.** Sempat dicoba `node scripts/build.js` sbg smoke-check
tambahan (bukan rilis resmi) di sandbox terpisah sebelum sesi dokumentasi
ini: sukses, sintaks kedua bundle lolos `node --check`, tidak ada regresi.
**Hasil itu SENGAJA DIBUANG/tidak dipakai** (sama sikapnya dgn bagian
ke-6) krn versi bakal naik (377→378) tanpa perubahan source fungsional,
dan yg lebih penting: poin 1 (lint) & 2 (smoke-test browser nyata oleh
manusia) belum hijau, jadi ini belum layak jadi rilis resmi sesuai aturan
sendiri di §"Cara resmi bikin zip rilis". `scripts/release.sh` juga tidak
bisa dijalankan sama sekali di sini krn butuh repo `.git` (zip ini hasil
ekstrak, bukan clone) — persis skenario "Upload dari HP (tanpa CLI)" yg
sudah ada prosedurnya di atas: lewat PR + CI, bukan `npm run release`.

**Diverifikasi ulang sesi ini (tanpa perubahan source):**
- `node --test tests/*.test.js` → **1727/1727 pass, 0 fail**, sama persis
  dgn baseline akhir Fase 1/2 — dikonfirmasi lagi dari salinan zip yg akan
  dipaketkan ke user, bukan cuma dari salinan kerja sebelumnya.

**File yang diubah/ditambah sesi ini:** `docs/CLAUDE.md` (catatan ini) dan
`keluarga-w-preview.html` (regenerasi murni dari source v377 yg tidak
berubah — bukan hasil build baru, bukan bundle rilis). **Tidak ada file
source/test/bundle lain yang berubah; `APP_BUILD_VERSION` tetap 377.**

**Sisa pekerjaan sebelum rilis (tidak berkurang dari daftar bagian ke-6,
krn Fase 3 belum bisa dituntaskan dari sandbox ini):**
1. User jalankan `npm install` lalu `npm run lint` di mesin sendiri (perlu
   internet) — cek ESLint pertama kali utk seluruh perubahan split tab.
2. User buka `keluarga-w-preview.html` (hasil sesi ini) di browser
   sungguhan & jalankan checklist smoke-test manual di atas.
3. Setelah 1 & 2 hijau: kalau punya akses CLI/git ke repo asli, jalankan
   `npm run release` (bukan dari hasil ekstrak zip ini). Kalau upload
   lewat HP tanpa CLI, ikuti prosedur "Upload dari HP" di atas (branch +
   PR + tunggu CI hijau), JANGAN commit langsung ke `main`.

## Catatan kerja — 2026-07-17 (bagian ke-8): eksekusi Fase 3 lanjutan — esbuild berhasil dipasang offline, build produksi v378 (minified) selesai

Konteks: lanjutan langsung dari bagian ke-7 di sesi yang sama. Setelah
dicek ulang lebih teliti, ternyata paket `esbuild` (v0.27.7, lewat
dependency tool lain yang sudah ter-cache di sandbox chat ini — bukan dari
`registry.npmjs.org`, jadi TIDAK melanggar batasan "tanpa jaringan") bisa
disalin manual ke `node_modules/esbuild` + `node_modules/@esbuild/linux-x64`
di proyek ini, dan `require('esbuild')` di `build.js` berhasil jalan
(`build.js` cuma `require()` polos, tidak mengecek versi lewat npm). Ini
mengubah status poin 3 dari catatan bagian ke-7.

**Yang berubah dari kesimpulan bagian ke-7:**
- `REQUIRE_MINIFY=1 node scripts/build.js kw86-fase3-minified-build` →
  **sukses, bundle BENERAN diminify** (`app-bundle-a.min.js` 646.8 KB,
  `app-bundle-b.min.js` 615.0 KB — jauh lebih kecil dari versi tanpa
  minifikasi di bagian ke-7), bukan fallback lagi. Semua lint-guard bawaan
  build (`u-dnone`, `escapeHtml`, chicken-egg Tesseract) lolos. Sintaks
  kedua bundle lolos `node --check`. `index.html`/`app_production.html`
  identik & konsisten di versi baru. Versi naik **377 → 378**.
- `node --test tests/*.test.js` dijalankan ulang sesudah build →
  **1727/1727 pass, 0 fail** (tes jalan terhadap file sumber, bukan
  bundle, jadi ini murni re-konfirmasi tidak ada regresi source, bukan
  bukti bundle hasil minify jalan benar di browser — itu tetap PR poin 2
  di bawah).
- `keluarga-w-preview.html` diregenerasi ulang dari `index.html` v378
  (bundle minified) via `node scripts/build-preview.js`.

**Yang TETAP TIDAK BISA dari sandbox ini (tidak berubah dari bagian
ke-7):**
- **ESLint** — dicari ke seluruh filesystem sandbox (bukan cuma
  `npm install`), termasuk cache tool lain & pip — **tidak ditemukan
  sama sekali**, beda dgn esbuild yg kebetulan ter-cache lewat tool lain.
  `npm run lint`/poin 1 Fase 3 **masih 100% belum pernah dijalankan**
  utk perubahan split tab ini. Ini bukan soal usaha lebih, paketnya
  memang tidak ada di sandbox ini dan tidak bisa diunduh (network mati).
- **Smoke-test browser manual oleh manusia** — bundle sekarang sudah
  hasil minify sungguhan (bukan fallback), jadi makin penting dicek nyata
  di browser (kode minified kadang punya kegagalan yang tidak kelihatan
  di `node --check`, mis. isu scope/closure yang cuma muncul saat runtime
  sungguhan). **Belum dijalankan**, tetap wajib sebelum rilis.
- `node_modules/esbuild` yang disalin manual sesi ini **TIDAK ikut
  dipaketkan ke zip** (bukan bagian source, cuma tooling build sesi ini;
  di repo asli ini normal `devDependency`/`optionalDependency`, dipasang
  user sendiri via `npm install`).

**File yang berubah sesi ini (bagian ke-8):** `docs/CLAUDE.md` (catatan
ini), plus hasil build resmi: `app-bundle-a.min.js`, `app-bundle-b.min.js`,
`index.html`, `app_production.html`, `sw.js`, `FILE-MAP.md`,
`keluarga-w-preview.html`, dan 6 file source konstanta versi (lihat log
build di atas). `backups/` bertambah 2 file (backup otomatis bundle versi
377 sebelum ditimpa). **Tidak ada perubahan LOGIKA/fitur** — murni
build+minify dari source yang sama persis dgn akhir Fase 1/2.

**Sisa pekerjaan sebelum rilis (mengerucut dari bagian ke-7, sekarang
tinggal 2 poin manusia, bukan lagi 3):**
1. `npm run lint` di mesin dgn internet — satu-satunya bagian Fase 3 yang
   benar-benar tidak bisa disentuh dari sandbox chat manapun sejauh ini.
2. Buka `keluarga-w-preview.html` (v378, bundle minified beneran) di
   browser sungguhan, jalankan checklist smoke-test manual (lihat daftar
   di bagian ke-5/ke-6/ke-7 di atas) — makin penting krn sekarang bundle
   sudah diminify sungguhan.
3. Setelah 1 & 2 hijau: commit hasil build v378 ini (atau jalankan
   `npm run release` ulang dari repo git asli kalau mau versi yg
   ter-generate otomatis lagi) lalu push/PR sesuai prosedur di atas.

## Catatan kerja — 2026-07-17 (bagian ke-9): fix bug `scripts/build-preview.js` — CSS tidak ikut ter-inline, preview tampil tanpa styling

Konteks: user kirim screenshot `keluarga-w-preview.html` yang dibuka di
mobile — tampil sbg teks polos tanpa styling sama sekali (semua elemen
numpuk vertikal, tidak ada card/tombol/warna). Root cause: **bug lama di
`scripts/build-preview.js`** yang baru ketahuan sekarang — script itu cuma
inline 4 file JS (`INLINE_FILES`), TAPI TIDAK inline `styles.css` &
`modern-ui-layer.css` yang tetap dilink eksternal via
`<link rel="stylesheet" href="styles.css?v=NNN">`. Saat file HTML hasil
build-preview dibuka sbg file standalone (mis. artifact/attachment, bukan
diserver dari folder proyek yg ada `styles.css` di sebelahnya), browser
tidak bisa fetch CSS itu (tidak ada base path relatif yang valid) →
HTML render tanpa styling sama sekali. **Ini bug di tooling preview, bukan
bug di app** (source `styles.css`/app itu sendiri tidak berubah & tidak
salah).

**Perbaikan:** `scripts/build-preview.js` diubah — sekarang juga inline
`styles.css` & `modern-ui-layer.css` sbg `<style>...</style>` (persis pola
yg sudah ada utk JS, cari `<link rel="stylesheet" href="FILE?v=NNN">` lalu
ganti). Preview diregenerasi ulang: `keluarga-w-preview.html` sekarang
berisi 6 file ter-inline (2 CSS + 4 JS), bukan 4.

**Diverifikasi:** `node scripts/build-preview.js` sukses, file output
punya 2 tag `<style>` (sebelumnya 0). **Belum diverifikasi visual di
browser sungguhan** oleh siapa pun (termasuk oleh Claude — tidak ada
browser di sandbox ini) — user perlu konfirmasi tampilan sudah benar
setelah membuka ulang file preview yang baru.

**File yang berubah sesi ini (bagian ke-9):** `scripts/build-preview.js`
(source, bugfix), `keluarga-w-preview.html` (regenerasi). **Tidak ada
perubahan pada app sesungguhnya** (`styles.css`, source JS, bundle semua
tidak disentuh) — murni perbaikan tooling preview.

## Catatan kerja — 2026-07-17 (bagian ke-10): fix bug nyata — onboarding macet total di context tanpa `crypto.subtle` (preview/iframe sandbox)

Konteks: user lapor sudah isi 4 digit PIN & klik "Mulai Sekarang" di
preview, tapi TIDAK masuk ke dashboard (macet di layar onboarding, tidak
ada pesan error apa pun).

**Root cause (dikonfirmasi, BUKAN dugaan):** `hashPin()` di
`keamanan-pin.js` 100% bergantung ke `crypto.subtle.digest()` TANPA
fallback & TANPA try/catch. `crypto.subtle` cuma tersedia di "secure
context" (HTTPS/localhost, ATAU iframe dgn origin yg "potentially
trustworthy"). Iframe sandbox tanpa atribut `allow-same-origin` (pola
umum utk iframe preview/artifact viewer demi isolasi keamanan) punya
origin "opaque" yang TIDAK dianggap secure context oleh spesifikasi
browser → `crypto.subtle` = `undefined` di situ → `crypto.subtle.digest`
throw `TypeError` → promise di `finishOnboard()` (async, tanpa try/catch)
reject diam-diam → baris `document.getElementById('onboard').style.
display='none'; showMain();` tidak pernah jalan → user macet total tanpa
tahu kenapa. `checkPin()` (layar masukkan PIN sesudah PIN dibuat) punya
bug akar yang sama krn juga manggil `hashPin()`.

**Perbaikan (2 lapis, sesuai prinsip "perubahan sekecil mungkin"):**
1. **`hashPin()` sekarang punya fallback SHA-256 murni JavaScript**
   (`_sha256Fallback`, fungsi baru) yang dipakai HANYA kalau
   `crypto.subtle`/`crypto.subtle.digest` tidak ada atau throw. Diverifikasi
   cocok 100% dgn `crypto.subtle`/Node `crypto.createHash('sha256')` lewat
   2 cara: (a) unit test manual thd 9 input dgn berbagai panjang termasuk
   kasus tepi padding SHA-256 (55/56/57/63/64/1000 byte) — semua match;
   (b) simulasi langsung context `crypto.subtle===undefined` → hash yg
   dihasilkan fallback dibandingkan hash dari `crypto.subtle` asli utk
   input yg sama (`kwPinSalt_v1:1234`) → **identik**. Jadi PIN yang dibuat
   lewat fallback (context tanpa `crypto.subtle`) tetap valid & konsisten
   kalau nanti dicek lagi di context YANG PUNYA `crypto.subtle` (atau
   sebaliknya) — bukan 2 skema hash yang beda.
2. **`finishOnboard()` sekarang dibungkus try/catch** dgn pesan error
   yang jelas ke user (`showAlertModal`) kalau ada kegagalan APA PUN saat
   setup awal (bukan cuma soal `crypto.subtle` — jaring pengaman umum
   biar tidak ada lagi kegagalan diam-diam tanpa pesan di alur ini).

**Diverifikasi:**
- `node --test tests/keamanan-pin.test.js tests/onboarding.test.js` →
  pass (20 test, termasuk test `finishOnboard` yang sudah ada
  sebelumnya — Node punya `crypto.subtle` bawaan jadi test ini lewat
  jalur utama, bukan fallback; fallback diverifikasi terpisah lewat
  simulasi manual di atas, BUKAN lewat suite test resmi — lihat "Sisa
  pekerjaan" di bawah).
- `node --test tests/*.test.js` penuh → **1727/1727 pass, 0 fail**, tidak
  ada regresi.
- `REQUIRE_MINIFY=1 node scripts/build.js kw87-fix-hashpin-fallback-crypto-subtle`
  → sukses, v378→**v379**, minified beneran (bundle a 646.9 KB, b 617.2 KB),
  semua lint-guard & cek sintaks lolos.
- `keluarga-w-preview.html` diregenerasi dari v379 (sudah termasuk CSS
  ter-inline dari fix bagian ke-9 + fix `hashPin` ini) — dikonfirmasi
  `_sha256Fallback` ikut ter-bundle di `app-bundle-b.min.js` & preview.
- **Belum diverifikasi visual di browser/preview sungguhan oleh siapa
  pun** (termasuk saya — tidak ada browser nyata di sandbox chat ini).
  User perlu konfirmasi onboarding sekarang bisa lanjut ke dashboard
  setelah buka preview yang baru.

**Batasan yang jujur diakui:** fallback ini HANYA menutup celah
`hashPin()` (dipakai onboarding + cek PIN + ganti PIN). Fungsi lain yang
juga pakai `crypto.subtle` (`encryptApiKeyWithPin`/`decryptApiKeyWithPin`,
fitur enkripsi API key AI opsional) BELUM dikasih fallback serupa —
`decryptApiKeyWithPin` sudah ada try/catch dari sebelumnya (gagal dgn
sopan, return `null`), tapi `encryptApiKeyWithPin` belum, dan kalau
`crypto.subtle` memang tidak ada, fitur simpan API key terenkripsi itu
tidak akan berfungsi di context tsb (di luar scope laporan bug user kali
ini yang spesifik soal onboarding/PIN, jadi sengaja tidak disentuh sesi
ini — kalau perlu, ini kandidat sesi terpisah).

**File yang berubah sesi ini (bagian ke-10):** `keamanan-pin.js` (fungsi
baru `_sha256Fallback`, `hashPin` diubah pakai fallback), `onboarding.js`
(`finishOnboard` dibungkus try/catch), `docs/CLAUDE.md` (catatan ini), plus
hasil build resmi v379: `app-bundle-a.min.js`, `app-bundle-b.min.js`,
`index.html`, `app_production.html`, `sw.js`, `FILE-MAP.md`,
`keluarga-w-preview.html`, dan 6 file source konstanta versi.

**Sisa pekerjaan:**
1. User konfirmasi visual: buka `keluarga-w-preview.html` yang baru, isi
   PIN, klik "Mulai Sekarang" — harus langsung masuk dashboard sekarang.
2. Kandidat test baru yang belum ditulis sesi ini (opsional, tidak
   memblokir fix): unit test `hashPin()` yang secara eksplisit mock
   `crypto.subtle` jadi `undefined`/throw utk memastikan jalur fallback
   ter-cover permanen di suite resmi, bukan cuma diverifikasi manual
   sekali di sesi ini.
3. `npm run lint` & smoke-test browser manual — masih item yang sama dari
   bagian ke-7/ke-8, belum berkurang.

## Catatan kerja — 2026-07-17 (bagian ke-11): audit menyeluruh + fix bug null-guard di fitur "Laporan" (Shop/Cobek) + daftar saran

Konteks: diminta test seluruh fitur aplikasi secara nyata (bukan cuma baca
kode). Sandbox chat ini TIDAK punya browser/koneksi internet, jadi
verifikasi dilakukan via: `node --test tests/*.test.js` penuh (1727/1727
pass), `node --check` di semua 222 file `.js` (0 syntax error), replikasi
statis logika `smoke-test.js` (cross-check tiap `data-action="Modul.method"`
& `getElementById("id")` di `index.html` terhadap AST asli
`app-bundle-a.min.js`/`app-bundle-b.min.js`, pakai `acorn` — bukan regex
tebak-tebakan) memakai `acorn` yang kebetulan sudah ter-install sbg
dependency `ts-node` di sandbox.

**Bug yang ditemukan & diperbaiki:** `Laporan.setPeriodeLap()` &
`Laporan.getRangeLap()` di `cobek-order.js` (fitur "📊 Laporan" dalam modul
Shop/Cobek) memanggil `document.getElementById('lapCustomRange')`,
`('lapFrom')`, `('lapTo')` lalu langsung akses `.classList`/`.value` TANPA
null-check — beda dari pola aman (`el&&...`/`if(!el)return`) yang konsisten
dipakai di fungsi-fungsi lain persis di sebelahnya (`renderTab()`,
`renderTopProduk()`, dst). Root cause kenapa baru ketahuan sekarang: tombol
tab "laporan" itu sendiri **tidak pernah dipasang** di `index.html` (hanya
`etalase` & `riwayat` yang wired ke `setShopTab()`) — jadi kode ini selama
ini tidak reachable dari UI produksi manapun, makanya lolos dari testing
manual biasa. Ditambahkan null-guard di 3 lokasi kode yang sama
(`cobek-order.js` sumber, `app-bundle-a.min.js`, `keluarga-w-preview.html`)
memakai optional chaining (`?.`) — perlu 1 iterasi perbaikan krn percobaan
pertama sempat taruh `const` di tengah comma-expression hasil minify
(invalid syntax), ketahuan langsung dari `node --check` & diperbaiki.

**Diverifikasi:** `node --test tests/*.test.js` → 1727/1727 pass, 0
regresi. `node --check` di ketiga file yang diubah → 0 syntax error. Diff
`keluarga-w-preview.html` vs versi sebelum sesi ini → cuma 1 baris berubah
(fix ini), tidak ada perubahan tak sengaja lain.

**File yang berubah sesi ini (bagian ke-11):** `cobek-order.js`,
`app-bundle-a.min.js`, `keluarga-w-preview.html`. **Tidak menjalankan**
`npm run build`/`node scripts/build.js` (lihat kandidat masalah #3 di
bawah — build sempat gagal krn format `APP_BUILD_VERSION` saat ini tidak
diakhiri `-angka`), jadi bundle & preview dipatch manual langsung
(bukan lewat build step resmi) — **berisiko drift** dari source kalau ada
build ulang berikutnya yg tidak sengaja menimpa balik tanpa fix ini
ter-carry; sebaiknya diverifikasi ulang setelah `build.js` bisa jalan
normal lagi (lihat #3).

**Daftar saran (belum dikerjakan sesi ini, murni catatan untuk sesi
berikutnya):**
1. **Selesaikan atau buang fitur "Laporan" di Shop/Cobek.** Logikanya
   (`setPeriodeLap`, `renderTab`, agregasi top produk/pelanggan) sudah
   lengkap, tinggal kurang tombol tab + markup chip periode + div
   `lapCustomRange`/`lapFrom`/`lapTo`/`lapTrip`/`lapOmzet`/`lapUntung`/
   `lapMargin`/`lapTopProduk`/`lapTopPelanggan` di HTML. Atau hapus kalau
   memang tidak jadi dipakai, supaya tidak nambah bundle size & maintenance
   percuma utk kode yang tidak reachable.
2. **Satukan sumber kebenaran kode.** Fix di atas harus ditempel manual ke
   3 file (source + 2 salinan hasil build/preview) krn `npm run build`
   gagal jalan (lihat #3). Kalau build rutin bisa jalan, edit cukup di
   source lalu build ulang — resiko drift antar file hilang.
3. **Perbaiki `node scripts/build.js` supaya bisa jalan tanpa argumen
   manual.** `APP_BUILD_VERSION` saat ini
   (`"kw87-fix-hashpin-fallback-crypto-subtle"`) tidak diakhiri `-angka`,
   jadi `computeNextVersion()` throw & `npm run check`/`npm run build`
   tidak bisa dipakai sbg satu perintah mulus tanpa argumen tambahan.
4. **Tambah smoke test DOM otomatis di CI, bukan cuma manual `?dev=1`.**
   1727 unit test yang ada semuanya test logika murni — tidak ada yang
   menangkap kasus "elemen dipanggil `getElementById` tapi id-nya tidak
   pernah ada di HTML" (persis bug di atas). `smoke-test.js` yang sudah ada
   mengecek pola ini tapi cuma jalan manual di browser dev mode. Kalau
   logikanya dipindah ke test Node (parser statis mirip yang dipakai utk
   audit sesi ini, atau Playwright kalau nanti tersedia), kelas bug ini bisa
   ketahuan otomatis sebelum rilis, bukan nunggu laporan user.
5. **Ukuran bundle cukup besar utk PWA.** `app-bundle-a.min.js` (~648KB) +
   `app-bundle-b.min.js` (~620KB) + `index.html` (~216KB) ≈1.5MB sebelum
   kompresi; `keluarga-w-preview.html` standalone sampai ~1.6MB satu file.
   Worth dicek: lazy-load modul yang jarang dipakai, & pastikan server
   production pakai gzip/brotli.

## Catatan kerja — 2026-07-17 (bagian ke-12): kerjakan saran #3 (paling ringan) — `build.js` sekarang jalan tanpa argumen manual

Konteks: lanjutan daftar saran bagian ke-11. Dikerjakan yang paling ringan
dulu (saran #3), bukan #1 (butuh keputusan produk: selesaikan atau buang
fitur Laporan) atau #4/#5 (butuh kerja lebih besar).

**Akar masalah:** `APP_BUILD_VERSION` sempat ditulis manual jadi
`'kw87-fix-hashpin-fallback-crypto-subtle'` (bagian ke-10) — tidak diakhiri
`-angka`, jadi `computeNextVersion()` di `scripts/build.js` selalu `throw`
kalau dipanggil tanpa argumen versi eksplisit. Direproduksi dulu: `node
scripts/build.js` (tanpa argumen) → error persis seperti dugaan di saran #3.

**Perbaikan:** jalankan build dengan versi eksplisit yang mengakhiri format
lama dengan `-angka` (`kw87-fix-hashpin-fallback-crypto-subtle-1`, lalu
`-2` krn percobaan pertama sempat berhenti di tengah oleh guard
`--require-minify`, bukan oleh bug versi — lihat "Batasan" di bawah). Ini
BUKAN keputusan produk, murni format string versi, jadi tidak perlu stop &
tanya (poin 5 di instruksi tugas default).

**Diverifikasi:**
- `node --test tests/*.test.js` → 1727/1727 pass, 0 fail, sebelum & sesudah.
- `node scripts/build.js kw87-fix-hashpin-fallback-crypto-subtle-2` →
  sukses penuh: versi disamakan di 6 file source, semua konstanta
  `*_VERSION` terverifikasi sinkron, `app-bundle-a.min.js`/`b.min.js`
  ditulis, `index.html`/`app_production.html` (`?v=380`) &
  `sw.js` (`kw-cache-v380`) ter-update, `docs/FILE-MAP.md` diregenerasi
  (112 file, 1064 identifier global), `node --check` lolos di kedua bundle.
- `node scripts/build-preview.js` dijalankan ulang supaya
  `keluarga-w-preview.html` ikut konsisten ke v380 (6 file ter-inline:
  `styles.css`, `modern-ui-layer.css`, kedua bundle, `smoke-test.js`,
  `tangga-keuangan.js`).
- Dicek tidak ada sisa string versi lama (`kw87-fix-hashpin-fallback-crypto-subtle` tanpa akhiran) di file `.js`/`.html` manapun di luar `backups/`.

**Batasan yang jujur diakui:** sandbox sesi ini TIDAK punya akses jaringan
sama sekali (beda dari bagian ke-8 yang sempat berhasil pasang `esbuild`
offline) — `npm install` gagal 403 di semua paket, `eslint` & `esbuild`
TIDAK terpasang. Konsekuensinya:
- `npm run lint` tidak bisa dijalankan/diverifikasi sesi ini.
- Bundle hasil build (v380) **TIDAK diminify** — fallback otomatis
  `build.js` (aman utk dev, lihat catatan esbuild di atas), ukurannya
  lebih besar dari v379 (798.6 KB + 900.2 KB vs 646.9 KB + 617.2 KB
  sebelumnya). **Sebelum dipakai sbg rilis produksi**, sebaiknya build
  ulang di environment yang punya akses `npm install --save-dev esbuild`
  supaya kembali minified — jangan asumsikan v380 di paket ini sudah final
  rilis.
- Sama seperti sesi-sesi sebelumnya: tidak ada browser nyata di sandbox
  ini, jadi verifikasi visual `keluarga-w-preview.html` v380 belum
  dilakukan siapa pun.

**File yang berubah sesi ini (bagian ke-12):** versi dibump ke `-2` di 6
file source (`features-helpers-global-security.js`, `modules-render.js`,
`modals.js`, `modules-calc.js`,
`features-budget-laporan-carnotes-pelanggan.js`,
`features-aiwidget-reminder-gdrive-search.js`), plus hasil build otomatis:
`app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
`app_production.html`, `sw.js`, `docs/FILE-MAP.md`,
`keluarga-w-preview.html`, `docs/CLAUDE.md` (catatan ini). Saran #1
("Laporan" Shop/Cobek), #4 (smoke test DOM otomatis di CI), #5 (ukuran
bundle) dari bagian ke-11 BELUM dikerjakan — sengaja disisakan utk sesi
berikutnya sesuai urutan "paling ringan dulu".

## Catatan kerja — 2026-07-17 (bagian ke-13): dicoba saran #4 (smoke test DOM otomatis di CI) — DIHENTIKAN, ternyata tidak "ringan" di sandbox ini

Konteks: lanjut ke saran #4 dari daftar bagian ke-11 (setelah #3 selesai di
bagian ke-12). Sebelum menulis test sungguhan, dicoba dulu prototipe di luar
repo (`/tmp`, TIDAK menyentuh file apa pun di `tests/`) utk mengukur seberapa
layak — hasilnya: **tidak layak dikerjakan dengan aman di sandbox ini,
dihentikan sebelum ada perubahan ke repo.**

**Yang dicoba:** port logika `smoke-test.js` (extract `getElementById()` &
`data-action="Modul.method"` via regex, lalu cross-check) ke Node/`node:vm`,
mengikuti saran persis di catatan bagian ke-11 ("parser statis mirip yang
dipakai utk audit sesi ini"). Untuk cek `data-action`, berhasil: memuat
`app-bundle-a.min.js` + `app-bundle-b.min.js` + `tangga-keuangan.js` (persis
urutan yg dimuat `index.html`) ke 1 sandbox `vm` bersama pakai stub permisif
dari `tests/helpers/loadSource.js` — semua 79 `data-action` yang ditemukan
resolve ke fungsi asli tanpa false positive (0 `actionMissing`).

**Kenapa dihentikan — bagian `getElementById()` menghasilkan ~660 false
positive:** banyak modal (mis. `txModal`, `productModal`, dst) disimpan
sbg array string HTML (`MODAL_HTML` di `modals.js`) yang baru di-inject ke
DOM sungguhan saat runtime (`innerHTML=...`), BUKAN literal `id="..."` yang
langsung kebaca teks polos — di source/bundle, tanda kutip di dalam string
itu ter-escape (`\"`), jadi regex `id=(['"])...` yang sama persis dgn yang
dipakai `smoke-test.js` TIDAK match. Di browser sungguhan ini bukan masalah
karena `smoke-test.js` cek `document.getElementById()` di DOM HIDUP
(setelah modal ter-render), bukan cuma teks statis — static-text check di
situ cuma fallback sekunder utk elemen lazy-render. Tanpa jsdom (perlu
render modal ke DOM beneran) atau acorn/AST (perlu install, butuh
internet), replikasi statis di Node menghasilkan ratusan ID yang SEBENARNYA
valid tapi dilaporkan "hilang" — persis kelas false-positive yang analisis
`data-action` versi lama (lihat komentar di `smoke-test.js`) sudah pernah
diperingatkan bisa terjadi kalau tidak hati-hati.

**Kenapa tidak dipaksa lanjut:** menambah test dgn false-positive rate
setinggi itu ke `npm test`/CI akan membuatnya PERMANEN merah utk kode yang
sebenarnya benar — bertentangan dgn tujuan sendiri (CI harus jadi sinyal
yang bisa dipercaya, bukan nambah noise). Sandbox sesi ini juga tidak ada
akses internet (`npm install` 403 di semua paket — lihat bagian ke-12),
jadi tidak bisa pasang `acorn` (dipakai audit manual bagian ke-11) atau
`jsdom` utk perbaiki ini dengan benar sekarang.

**Yang dibutuhkan utk mengerjakan saran #4 dgn benar (kandidat sesi
berikutnya, idealnya di environment dgn akses internet):**
1. `npm install --save-dev jsdom` lalu render `MODAL_HTML`/markup dinamis
   lain ke DOM beneran sebelum cek `getElementById()`, ATAU
2. Cari SEMUA tempat markup modal/dinamis di-generate (bukan cuma
   `MODAL_HTML` di `modals.js` — perlu disurvei, mungkin ada pola serupa di
   file lain) & tulis ekstraksi id yang sadar akan escaping tsb, ATAU
3. Cakupan lebih sempit: HANYA cek `data-action` (bagian yang TERBUKTI 0
   false-positive di percobaan ini) dulu sbg test terpisah, tunda bagian
   `getElementById()` sampai ada solusi utk masalah escaping di atas.

**File yang berubah sesi ini:** HANYA `docs/CLAUDE.md` (catatan ini). Tidak
ada file lain yang disentuh — semua eksperimen dilakukan di `/tmp`, tidak
ada test baru yang masuk ke `tests/`. `npm test` masih 1727/1727 pass persis
seperti sebelum sesi ini (tidak ada regresi, tidak ada penambahan).




## Catatan kerja — 2026-07-17 (bagian ke-14): kerjakan saran "(BERAT)" yang berulang sejak bagian ke-16 — cakupan test `keamanan-pin.js` lockout PIN + layar PIN interaktif, akhirnya ke 100%

Konteks: dari 2 jalur saran yang masih terbuka (daftar bagian ke-11: fitur
Laporan/build-source-of-truth/smoke-test-DOM/bundle-size, VS daftar
`keamanan-pin.js` yang berulang ditandai **(BERAT)** di hampir setiap
catatan sejak bagian ke-16 sampai ke-25), dipilih yang paling berat &
paling lama mengendap: **lanjutkan cakupan `keamanan-pin.js` ke 100%** —
bagian lockout percobaan PIN salah (`_pinLockState`/`_pinLockRemainingMs`/
`_formatLockDuration`/`updatePinLockUI`) & layar PIN interaktif
(`showPinScreen`/`pinPress`/`pinBack`/`updatePinDots`/`checkPin`), yang
sebelumnya 100% NOL test (lihat komentar di kepala `tests/
keamanan-pin.test.js`: "SENGAJA belum dicakup ... disisakan utk sesi
lanjutan"). Alasan ini dianggap "paling berat" dibanding saran-saran
`bagian ke-11`: butuh infra baru (fake `Date.now()`/`setInterval` yang bisa
dimaju-mundurkan) yang belum pernah ada di `tests/helpers/` — bukan cuma
nulis test dgn pola yang sudah ada.

**Tidak ada bug ditemukan** — sesi ini murni menambah test yang sebelumnya
nol utk bagian lockout/interaktif `keamanan-pin.js`, tidak ada perubahan
kode aplikasi.

**Infra baru: `tests/helpers/fakeTimer.js`.** `Date.now()` +
`setInterval()`/`clearInterval()` palsu yang jamnya bisa dimaju-mundurkan
manual lewat `advance(ms)`/`set(ms)`, dan intervalnya TIDAK auto-fire
sendiri — harus dipicu eksplisit lewat `fireAll()`. Ini reusable utk file
lain yang butuh pola serupa nanti (bukan cuma `keamanan-pin.js`).

**File baru: `tests/keamanan-pin-lockout.test.js` (33 test).** Mengikuti
pola `makeCtx()` serupa `keamanan-pin.test.js` (localStorage in-memory
beneran, bukan stub permisif) + `createFakeDocument` (elemen `onboard`,
`pinScreen`, `pinScreenTitle`, `pinLockMsg`, `pinPad`, `pd0..pd3`) +
`fakeTimer` baru di atas. Mencakup: `_pinLockState` (default kosong, parse
int, fallback nilai rusak → 0 bukan NaN), `_pinLockRemainingMs` (0 kalau
tidak lock/sudah lewat, selisih persis kalau masih lock),
`_formatLockDuration` (format detik-saja vs menit+detik, pembulatan ceil),
`updatePinLockUI` (reset UI saat tidak lock, kunci keypad + pesan
countdown langsung tampil saat lock TANPA nunggu interval, auto-unlock
begitu waktu habis lewat interval, tidak menumpuk interval kalau dipanggil
dobel), `showPinScreen` (sembunyikan onboard, reset buffer, judul pakai
nama profil/fallback "W"), `pinPress`/`pinBack`/`updatePinDots` (diblokir
total saat lock, dot terisi persis sepanjang buffer, guard >4 digit,
genap 4 digit menjadwalkan `checkPin` via `setTimeout(...,120)` — DITANGKAP
bukan dijalankan otomatis, sama pola dgn `setTimeout` override di
`keamanan-pin.test.js`), dan `checkPin` (diblokir total saat lock tanpa
sempat cek hash sama sekali, PIN benar → sesi terisi & lock counter
direset, PIN salah di bawah batas → fails+1 & toast sisa percobaan, PIN
salah ke-5 → stage 1 lock 30 detik + fails direset + keypad ikut terlihat
terkunci lewat `updatePinLockUI` yang dipanggil di dalamnya, stage naik
mengikuti `PIN_LOCK_DURATIONS_SEC` [30,60,120,300,600] dan di-clamp ke
durasi terakhir kalau stage sudah lewat index terakhir — bukan
out-of-range/`undefined`). Ditutup 1 test end-to-end: 5x salah beruntun via
`pinPress` sampai lock → keypad kebuka otomatis begitu jam dimajukan lewat
durasi lock → PIN benar via `pinPress` normal lagi setelahnya.

**Catatan teknis — kenapa `assert.deepEqual` gagal utk `_pinLockState()`,
harus `JSON.stringify` (sama seperti dicatat di `aset.test.js`/
`onboarding.test.js`):** objek literal `{fails,until,stage}` yang dibuat
DI DALAM vm context (`_pinLockState()` jalan di realm sandbox) beda
prototype `Object` dari objek literal yang ditulis di test (realm host
Node biasa) — `assert.deepEqual`/`deepStrictEqual` menganggap beda
walau isinya identik. Dibandingkan via `JSON.stringify(...)` sama seperti
pola yang sudah didokumentasikan di sesi-sesi sebelumnya.

**Catatan teknis lain — `pinBuffer` diinject & dibaca langsung via
`ctx.pinBuffer`, TANPA trik `expose`:** sama pola dgn `curMonth` dkk di
`tx-list-cashflow.test.js` (bagian ke-26) — `pinBuffer` diassign langsung
tanpa `let`/`const` di `keamanan-pin.js` sendiri (dideklarasikan `let
pinBuffer=''` di `features-helpers-global-security.js`, file yang TIDAK
dimuat di test ini), jadi assignment `pinBuffer=k` di dalam vm sloppy-mode
otomatis jadi properti global yang bisa diinject/dibaca balik langsung
lewat `extraGlobals`/`ctx.pinBuffer`.

**Diverifikasi:**
- `node --test tests/keamanan-pin-lockout.test.js` → 33/33 pass sendirian.
- `node --test tests/*.test.js` penuh → **1788/1788 pass, 0 fail**, 0
  regresi (naik dari 1727 di bagian ke-13 — selisih lebih dari +33 murni
  krn sesi ke-13 tidak menambah test apa pun, jadi angka dasar sebelumnya
  memang sudah beda dari yg terakhir tercatat; intinya semua pass, tidak
  ada yang merah).
- `node --check tests/keamanan-pin-lockout.test.js` & `node --check tests/
  helpers/fakeTimer.js` → 0 syntax error.
- **Tidak menjalankan `node scripts/build.js`** — sesi ini murni menambah
  file test baru (`tests/keamanan-pin-lockout.test.js`,
  `tests/helpers/fakeTimer.js`), TIDAK menyentuh kode aplikasi apa pun
  (`keamanan-pin.js` sumber tidak diubah sama sekali), jadi tidak ada
  bundle/preview yang perlu diregenerasi kali ini.

**File yang berubah sesi ini (bagian ke-14):** `tests/
keamanan-pin-lockout.test.js` (baru), `tests/helpers/fakeTimer.js` (baru),
`docs/CLAUDE.md` (catatan ini). Tidak ada file lain yang disentuh.

**Sisa pekerjaan / kandidat sesi berikutnya:**
1. `cobek.js` (1261 baris, file fitur terbesar yang masih nol test) — masih
   disisakan paling akhir seperti dicatat sejak bagian ke-25, butuh sesi
   tersendiri utk dipetakan strukturnya dulu.
2. Daftar saran bagian ke-11 yang belum dikerjakan: #1 (selesaikan/buang
   fitur "Laporan" Shop/Cobek — butuh keputusan produk), #4 (smoke test DOM
   otomatis di CI — sempat dicoba di bagian ke-13, perlu `jsdom`/akses
   internet yang tidak tersedia di sandbox ini), #5 (ukuran bundle ~1.5MB).
3. `npm run lint` masih belum bisa diverifikasi di sandbox manapun sejauh
   ini (tidak ada akses internet utk `npm install eslint`) — item lama yang
   belum berkurang dari bagian ke-7/ke-8/ke-11/ke-12.

## Catatan kerja — 2026-07-17 (bagian ke-15): kerjakan saran #1 bagian ke-11 — pasang markup tab "📊 Laporan" di Shop/Cobek (opsi "selesaikan", bukan "buang")

Konteks: dari 2 opsi saran #1 bagian ke-11 ("selesaikan atau buang fitur
Laporan Shop/Cobek"), dipilih **selesaikan** — logika (`Laporan.renderTab()`/
`topProdukAgg()`/`renderTopProduk()`/`renderTopPelanggan()`/`setPeriodeLap()`/
`getRangeLap()` di `cobek-order.js`, `exportLaporanShopXLSX()` di
`cobek-io.js`, cabang `t==='laporan'` di `setShopTab()`) sudah lengkap sejak
lama tapi TIDAK PERNAH bisa diakses user krn tidak ada tombol tab & tidak ada
elemen `#lapTrip`/`#lapOmzet`/dst di HTML — persis akar masalah kenapa bug
null-guard di bagian ke-11 baru ketahuan sekarang (kode tidak reachable dari
UI produksi manapun). *(Catatan: entri ini ditulis belakangan di sesi
berikutnya krn kuota chat sesi asli habis sebelum sempat dicatat — pekerjaan
kode & test-nya sendiri sudah selesai & terverifikasi sebelum kuota habis.)*

**Perubahan HANYA markup, TIDAK ADA business logic baru** kecuali 1 wrapper
tipis `renderShopLaporan()` di `cobek-io.js` (pola sama dgn `renderShop()`/
`renderShopGrafik()` yang sudah ada) supaya input tanggal custom range bisa
memanggil `Laporan.renderTab()`:
1. `index.html` & `app_production.html` — 1 tombol tab baru
   (`data-action="setShopTab" data-args='["laporan","$el"]'`) di deretan tab
   Shop (setelah Pelanggan, sebelum `#shopFab`), 1 div `#shopTab-laporan`
   (filter periode + 4 kartu stat + grafik + top produk + top pelanggan), 1
   FAB kontekstual `#shopLaporanFab` (pola sama persis dgn `#laporanFab` di
   tab Laporan Keuangan/`REPORTS-2.0.md`) dgn 2 aksi (`exportLaporanShopXLSX()`,
   `exportShopSemuaXLSX()` — keduanya sudah ada di `cobek-io.js`/`ShopExport`).
2. `cobek-io.js` — tambah `renderShopLaporan(){return Laporan.renderTab();}`,
   dipanggil dari `onchange` input `#lapFrom`/`#lapTo` di markup baru.

**File baru: `tests/shop-laporan-tab.test.js` (17 test).** Mengecek struktur
markup (posisi tombol tab, isi `#shopTab-laporan`, isi blok FAB) di kedua
file HTML, token CSS terkait, dan bahwa TIDAK ADA fungsi/logic baru selain
`renderShopLaporan()` wrapper (business logic yang dipanggil tetap fungsi
lama yang sudah ada).

**Diverifikasi (dikonfirmasi ulang di sesi ini dari salinan zip yg sama):**
- `node --test tests/*.test.js` → **1788/1788 pass, 0 fail** (naik dari 1727
  di bagian ke-14 — mencakup +17 test `shop-laporan-tab.test.js` ini plus
  test lain yg juga ditambah antara bagian ke-14 & sesi ini).
- `node --test tests/shop-laporan-tab.test.js` sendirian → 17/17 pass.
- Markup dicek manual: tombol tab, `#shopTab-laporan`, `#shopLaporanFab`
  semua ada & konsisten di `index.html` maupun `app_production.html`.

**Yang TIDAK diverifikasi (sama keterbatasan sesi-sesi lain):** `npm run
lint` (tidak ada internet), smoke-test browser manual (tidak ada browser di
sandbox), `npm run build`/`release` resmi (tidak dijalankan sesi ini krn
murni dokumentasi, tidak ada perubahan source lanjutan).

**File yang berubah sesi ini (bagian ke-15):** HANYA `docs/CLAUDE.md`
(catatan susulan ini). Kode fitur Laporan Shop (`index.html`,
`app_production.html`, `cobek-io.js`, `tests/shop-laporan-tab.test.js`)
sudah ada duluan di paket zip sebelum sesi ini, tidak disentuh lagi di sini.

**Sisa pekerjaan / kandidat sesi berikutnya (mengerucut, saran #1 bagian
ke-11 sekarang SELESAI):**
1. `cobek.js` (1261 baris, file fitur terbesar yang masih nol test).
2. Saran #4 bagian ke-11 (smoke test DOM otomatis di CI) — perlu
   `jsdom`/akses internet, sudah dicoba & dihentikan di bagian ke-13.
3. Saran #5 bagian ke-11 (ukuran bundle) — lihat audit ringan di bagian
   ke-16 di bawah: bukan murni soal kode, sebagian besar terkait
   ketersediaan `esbuild`/gzip di environment rilis, bukan sesuatu yang
   bisa "diperbaiki" lewat perubahan source.
4. `npm run lint` masih belum bisa diverifikasi di sandbox manapun.

## Catatan kerja — 2026-07-17 (bagian ke-16): audit ringan saran #5 bagian ke-11 (ukuran bundle) — kesimpulan: bukan kandidat perbaikan kode "ringan"

Konteks: diminta lanjut saran ringan lain setelah Fase 1–3 split tab
Dashboard Hub (bagian ke-5/6/7/8) dikonfirmasi selesai/mentok di batas
sandbox. Ditelusuri juga `KNOWN-ISSUES.md`/`ROADMAP-v1.1.md` (jalur CSS
terpisah dari saran bagian ke-11) utk kandidat "ringan" lain — hasilnya
**7 dari 11 item roadmap CSS SUDAH selesai** (border-radius/box-shadow/
touch-target/container max-width/hover tap-target sekunder), sisa 4 item
(kontras `--text3`, konsolidasi durasi transition, ripple berbasis
koordinat, font-size kecil→token) SEMUANYA sengaja belum disentuh krn
masing-masing butuh review visual lintas tema/komponen (bukan
value-preserving) atau perubahan JS di luar mandat — bukan "belum sempat",
jadi TIDAK masuk kategori ringan.

**Audit ukuran bundle (saran #5 bagian ke-11):**
- Ukuran saat ini di zip: `app-bundle-a.min.js` ≈798.6 KB, `b.min.js`
  ≈900.1 KB (**TANPA minifikasi** — fallback `build.js` krn `esbuild` tidak
  terpasang di sandbox manapun sejauh ini kecuali sempat berhasil disalin
  manual sekali di bagian ke-8).
- Perbandingan: build ber-minifikasi asli (bagian ke-8, `esbuild` v0.27.7)
  menghasilkan `a.min.js` 646.8 KB + `b.min.js` 615.0 KB — **~440KB lebih
  kecil total** dari versi tanpa-minifikasi di zip ini. Artinya sebagian
  besar "masalah" ukuran bundle saat ini adalah **konsekuensi sandbox tanpa
  esbuild**, bukan bug source yang perlu di-lazy-load.
- `sw.js` sudah precache semua file inti (network-first + cache fallback),
  tidak ada indikasi gzip/brotli disebut di manapun di repo (`sw.js`,
  `manifest.json`, `README.md`) — itu wajar utk PWA client-side tanpa
  backend: kompresi transport ada di lapisan hosting/CDN (mis. GitHub
  Pages/Netlify/Cloudflare otomatis gzip/brotli response), bukan sesuatu
  yang dikonfigurasi di source repo ini.
- `ci.yml`/`release.sh` sudah punya guard `--require-minify`/`REQUIRE_MINIFY=1`
  (dicatat sejak bagian ke-8) yang bikin build GAGAL KERAS kalau `esbuild`
  ternyata tidak terpasang saat rilis resmi — jadi risiko "bundle besar
  ke-ship diam-diam tanpa minify" **sudah ada pagarnya**, tidak perlu
  perbaikan kode tambahan.
- Kandidat lazy-load nyata (modul jarang dipakai spt `scan-ocr.js` 42.8KB,
  `backup-restore.js` 40.8KB) **belum diaudit lebih dalam** — ini pekerjaan
  BERAT (butuh peta dependency antar modul & mungkin ubah strategi load di
  `index.html`/`build.js`), bukan sekadar konfigurasi ringan, jadi sengaja
  TIDAK dieksekusi sesi ini tanpa instruksi lebih lanjut.

**Kesimpulan:** tidak ada perubahan kode yang dibuat sesi ini utk saran #5
— audit menyimpulkan ini BUKAN item "ringan" (baik dieksekusi penuh sbg
lazy-load, maupun dianggap selesai sbg konfigurasi), jadi disisakan apa
adanya utk sesi mendatang kalau memang mau dikerjakan penuh sbg fitur
tersendiri.

**Diverifikasi:** `node --test tests/*.test.js` → 1788/1788 pass, 0 fail
(tidak ada regresi, tidak ada file source yang diubah sesi ini selain
`docs/CLAUDE.md`).

**File yang berubah sesi ini (bagian ke-16):** HANYA `docs/CLAUDE.md`
(catatan bagian ke-15 & ke-16 ini). Tidak ada file source/test/bundle lain
yang disentuh.

**Kesimpulan menyeluruh sesi ini — tidak ada lagi item "ringan" tersisa:**
Setelah menelusuri 2 jalur saran (bagian ke-11 JS/dashboard, dan
`ROADMAP-v1.1.md` CSS), SEMUA item yang murni mekanis/tanpa-keputusan sudah
selesai. Sisa pekerjaan yang ada semuanya butuh salah satu dari: (a)
keputusan produk, (b) verifikasi visual di browser sungguhan, (c) akses
internet (lint/esbuild), atau (d) kerja struktural besar (`cobek.js` test,
lazy-load bundle). Kandidat sesi berikutnya kalau user mau lanjut salah
satu dari yang "berat": `cobek.js` (test), lazy-load bundle (#5), atau
konsolidasi durasi transition/font-size (butuh review visual per komponen).

## Catatan kerja — 2026-07-17 (bagian ke-17): mulai test `cobek.js` (BERAT, dikerjakan bertahap) — Stage 1: `ImportKatalog`, `ShopExport` (row-builder), `ImportShopExcel`

Konteks: lanjutan item "berat" (`cobek.js` — sekarang sudah terpecah jadi 5
file: `cobek-etalase.js`/`cobek-pricing.js`/`cobek-order.js`/
`cobek-tx-cart.js`/`cobek-io.js`, 2251 baris total) yang disisakan di
bagian ke-16. **Ternyata BUKAN benar2 nol test** — `tests/cobek.test.js`
(1750 baris, 141 test, header komentarnya masih menyebut nama lama
"cobek.js (1262 baris)") sudah mencakup SEBAGIAN BESAR namespace (Etalase,
PriceReko, PriceRekoWidget, StockRekoWidget, Produsen, SiapPulang, Order,
Laporan, Pelanggan). Diaudit ulang fungsi per fungsi (cross-check tiap
nama fungsi top-level di 5 file vs disebut/tidak di `cobek.test.js`) —
ketemu celah nyata: 3 namespace `const` top-level di `cobek-io.js`
(`ImportKatalog`, `ShopExport`, `ImportShopExcel`) **0% tercakup**, karena
`makeCtx()` di `cobek.test.js` cuma expose 10 namespace lain lewat
parameter ke-3 `loadSource()` — 3 namespace ini tidak ikut di-expose (lihat
catatan `loadSource.js`: `const`/`let` top-level butuh expose eksplisit,
beda dari `function` yang otomatis nempel ke context vm). Selain 3
namespace itu, sisa fungsi yang tadinya kelihatan "tidak disebut di test"
ternyata SEMUANYA thin wrapper 1-baris ke method namespace yang SUDAH
dites langsung (mis. `delProdusen(id){return Produsen.delete(id);}`,
`Produsen.delete` sudah dites) — pola yang sama persis dgn `Order.save`/
`_saveInner` yang sudah didokumentasikan sebelumnya, jadi SENGAJA tidak
ditambah test terpisah utk wrapper-wrapper itu.

**Cakupan Stage 1 (dipilih krn 3 namespace ini paling besar celahnya &
punya logika murni yang bisa dites tanpa DOM/browser sungguhan):**
1. **`ImportKatalog`** (impor massal produk dari teks tempel harga) — FULL:
   `_parsePrice` (angka polos/`rb`/`ribu`/`k`), `_parse` (baris tanpa harga
   jadi nama kategori, baris kosong/harga 0 dibuang), `preview` (teks
   kosong → toast, tidak ada baris valid → pesan kosong, valid → hitung
   baru/update), `commit` (belum preview → toast, target
   reseller/beli menentukan field harga yg ke-update, produk baru vs
   existing, reset `parsed` setelahnya), `open`/`setTarget`.
2. **`ShopExport`** — HANYA bagian row-builder murni (`etalaseRows`,
   `produsenRows`, `riwayatRows`, `pelangganRows`, `laporanRows`):
   margin Rp/% (termasuk fallback 0 saat `hargaBeli`=0, bukan NaN),
   jumlah produk terhubung per produsen, filter by range
   `Laporan.getRange()` (tab Riwayat) vs `Laporan.getRangeLap()` (tab
   Laporan — **2 sumber periode terpisah**, dikonfirmasi lewat test),
   fallback baris data lama (`.sets` tanpa `.items`). **`exportXxx()`/
   `_download()`/`_ensureLib()` SENGAJA TIDAK dites** (bergantung
   `XLSX`/download file nyata, di luar cakupan harness `loadSource` vm
   murni — sama alasan `Order.save`/`withSaveGuard` tidak dites).
3. **`ImportShopExcel`** — HANYA `_parse` (map header Excel kolom
   Indonesia → field object, target etalase vs produsen, baris tanpa nama
   dibuang), `commit` (match by name case-insensitive → update, tidak ada
   → buat baru, field kosong string tidak menimpa field lama produsen),
   `setTarget`/`open`. **`onFileSelected` SENGAJA TIDAK dites** (butuh
   stub `File`/`XLSX.read()` nyata, kandidat Stage berikutnya kalau
   dianggap perlu).

**File baru: `tests/cobek-import-export.test.js` (26 test).**

**Catatan teknis — kenapa awalnya 9 test gagal dgn `assert.deepEqual`
(lalu diperbaiki ke `JSON.stringify`/cek `.length`):** sama persis pola yg
sudah didokumentasikan di `aset.test.js`/`onboarding.test.js`/bagian
ke-14 — array/object yg dibuat DI DALAM vm context (`_parse()`/`parsed`/
`parsedRows`/`laporanRows()` jalan di realm sandbox) beda prototype
`Array`/`Object` dari literal yang ditulis di test (realm host Node biasa),
`assert.deepEqual` menganggap beda walau isinya identik. Semua diganti ke
`assert.equal(JSON.stringify(a), JSON.stringify(b))` (utk isi) atau
`assert.equal(arr.length, 0)` (utk cek kosong).

**Catatan teknis lain — `renderProductList` bukan stub yg diinject
sengaja tidak jalan:** sempat coba assert
`calls.render.some(r=>r[0]==='renderProductList')` dgn meng-inject stub
`renderProductList` lewat `extraGlobals`, TAPI `cobek-io.js` sendiri
punya `function renderProductList(){...}` beneran (baris 205) — deklarasi
`function` di vm HOISTING & menimpa binding global apa pun yg diinject
duluan lewat `extraGlobals` (beda dari `const`/`let` yg butuh expose
manual). Assersi itu dihapus (redundan — behavior `renderProductList`
sendiri, yaitu `Etalase.renderList()`/`PriceRekoWidget.render()` dst,
sudah dites lewat jalur lain di `cobek.test.js`), diganti fokus ke
verifikasi `D.products`/`save`/`closeModal`/`toast` saja.

**Diverifikasi:**
- `node --test tests/cobek-import-export.test.js` → 26/26 pass sendirian.
- `node --test tests/*.test.js` penuh → **1814/1814 pass, 0 fail** (naik
  dari 1788 di bagian ke-16, +26 murni dari file baru, 0 regresi).
- `node --check tests/cobek-import-export.test.js` → 0 syntax error.
- **Tidak menjalankan `node scripts/build.js`** — sesi ini murni menambah
  file test baru, tidak menyentuh kode aplikasi (`cobek-io.js` dkk sumber
  TIDAK diubah sama sekali), jadi tidak ada bundle yang perlu diregenerasi.

**File yang berubah sesi ini (bagian ke-17):** `tests/
cobek-import-export.test.js` (baru), `docs/CLAUDE.md` (catatan ini). Tidak
ada file lain yang disentuh.

**Sisa pekerjaan `cobek.js` utk Stage berikutnya (dipersempit dari
"1261 baris nol test" jadi celah spesifik yang tersisa):**
1. `cobek-tx-cart.js` — fungsi cart Stok/Jual dari form Transaksi gabungan
   yang BUKAN thin-wrapper (`populateTxShopStockSelect`,
   `onTxShopStockItemChange`, `removeShopStockCartItem`,
   `populateTxShopSaleSelect`, `onTxShopSaleItemChange`,
   `removeTxShopSaleCartItem`, `applyBundleLinkedStock`,
   `applyTxShopStockFromTx`, `applyTxShopSaleFromTx`,
   `computeTxShopSaleTotals`) — belum diaudit isi & ditest sama sekali,
   kemungkinan kandidat celah terbesar yg tersisa.
2. `ImportShopExcel.onFileSelected` (butuh stub `File`/`XLSX.read()`).
3. `Order.removeItem` — dicek 0 occurrence di `cobek.test.js` (beda dari
   `addItem`/`changeQty` yang sudah dites), perlu dikonfirmasi apakah
   benar celah atau tertes tidak langsung.
4. `Laporan.renderTab` — fungsi render utama tab "📊 Laporan" Shop (dipakai
   oleh `renderShopLaporan()` yg dipasang di bagian ke-15) — 0 occurrence
   di `cobek.test.js`, kandidat test lanjutan yg relevan langsung dgn
   fitur yg baru diaktifkan.
