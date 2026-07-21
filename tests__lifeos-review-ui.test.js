'use strict';
// tests/lifeos-review-ui.test.js — LifeOSReview (lifeos/ui/review.js)
// + reviewServiceStartSession/Complete/AddActionItem
// (lifeos/services/review-service.js). Ditambahkan Sesi 53 (Batch 3,
// kandidat #2) — hasil audit `docs/NEXT_SESSION.md`/`docs/PROJECT_STATE.md`
// § LifeOS "Review — Ada, belum diaudit detail": kedua file ini sebelumnya
// 0 test sama sekali (dicek via grep, tidak ada `tests/*.test.js` yang
// me-`loadSource` salah satu dari keduanya — pola gap yang sama persis
// dgn LifeOS Knowledge di Sesi 52, lihat tests/lifeos-knowledge-ui.test.js).
//
// Tidak ada bug ditemukan selama audit — sesi ini murni menambah test yang
// sebelumnya nol, TIDAK ada perubahan kode aplikasi. Fokus:
// (1) LifeOSReview.render() murni konsumsi reviewAdapterLatestSnapshots(D)
//     & reviewAdapterIsOverdue(store,...) (adapter registry-driven yang
//     sudah tertes sendiri di tests/lifeos-review-adapter.test.js) — TIDAK
//     baca D/store langsung selain lewat adapter;
// (2) badge overdue weekly/monthly tampil sesuai kondisi masing2 (independen
//     satu sama lain), snapshot wealth/lifeBalance tampil hanya kalau ada;
// (3) elemen tidak ada di DOM -> tidak throw (guard awal, pola sama dgn
//     ui/knowledge.js dkk);
// (4) startWeekly() SATU-SATUNYA jalur tulis dari UI (delegasi penuh ke
//     reviewServiceStartSession(), TIDAK ada logic tulis lain), periodKey
//     berformat 'weekly-YYYY-MM-DD', lalu re-render;
// (5) reviewServiceStartSession/Complete/AddActionItem masing2 fungsi murni
//     terhadap store yang dioper `lifeOSGetStore()` (di-stub) + memanggil
//     `lifeOSSave()` (di-stub, dicatat pemanggilannya) tepat 1x per operasi
//     sukses, TIDAK dipanggil kalau sessionId tidak ketemu.
//
// Catatan audit (BUKAN bug): reviewServiceComplete()/reviewServiceAddActionItem()
// belum dipanggil dari UI manapun (dicek via grep ke seluruh source) — sama
// persis pola "write path service ada tapi belum ada tombol UI" seperti
// knowledgeServiceUpdateTags()/Delete() di knowledge-service.js (Sesi 52).
// Bukan gap yang butuh keputusan produk mendesak, TIDAK diubah sesi ini.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeStoreHarness(initialReviewLog) {
  const store = { projects: [], reviewLog: initialReviewLog || [], knowledge: [] };
  const saveCalls = [];
  const lifeOSGetStore = () => store;
  const lifeOSSave = () => {
    saveCalls.push(1);
    return Promise.resolve();
  };
  return { store, saveCalls, lifeOSGetStore, lifeOSSave };
}

function load({ D = {}, fakeDocument, lifeOSGetStore, lifeOSSave, uidSeq } = {}) {
  let uidCounter = 0;
  return loadSource(
    ['lifeos/lifeos-registry.js', 'lifeos/adapters/review-adapter.js', 'lifeos/services/review-service.js', 'lifeos/ui/review.js'],
    {
      D,
      document: fakeDocument,
      escapeHtml: (s) => String(s),
      lifeOSGetStore,
      lifeOSSave,
      uid: () => (uidSeq ? uidSeq[uidCounter++] : `uid-${++uidCounter}`),
    },
    ['LifeOSReview'],
  );
}

test('LifeOSReview.render(): tidak ada histori review sama sekali -> kedua badge overdue tampil, snapshot kosong tidak ditampilkan', () => {
  const { store, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSReviewPanel: {} });
  const ctx = load({ D: {}, fakeDocument, lifeOSGetStore, lifeOSSave });
  ctx.LifeOSReview.render();
  const html = fakeDocument.getElementById('lifeOSReviewPanel').innerHTML;
  assert.match(html, /Weekly Review jatuh tempo/);
  assert.match(html, /Monthly Review jatuh tempo/);
  assert.doesNotMatch(html, /Kekayaan terakhir/);
  assert.doesNotMatch(html, /Skor Hidup Seimbang terakhir tercatat/);
  assert.match(html, /Mulai Weekly Review/);
});

test('LifeOSReview.render(): weekly review baru selesai (<7 hari) -> badge weekly hilang, monthly tetap tampil (independen)', () => {
  const { store, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 's1', period: 'weekly', periodKey: 'weekly-x', completedAt: new Date().toISOString() },
  ]);
  const fakeDocument = createFakeDocument({ lifeOSReviewPanel: {} });
  const ctx = load({ D: {}, fakeDocument, lifeOSGetStore, lifeOSSave });
  ctx.LifeOSReview.render();
  const html = fakeDocument.getElementById('lifeOSReviewPanel').innerHTML;
  assert.doesNotMatch(html, /Weekly Review jatuh tempo/);
  assert.match(html, /Monthly Review jatuh tempo/);
});

test('LifeOSReview.render(): snapshot wealth/lifeBalance ada -> tampil, angka netWorth dibaca apa adanya dari reviewAdapterLatestSnapshots(D)', () => {
  const D = {
    wealthSnapshots: [{ netWorth: 12345678 }],
    lifeBalanceSnapshots: [{ score: 80 }],
  };
  const { lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSReviewPanel: {} });
  const ctx = load({ D, fakeDocument, lifeOSGetStore, lifeOSSave });
  ctx.LifeOSReview.render();
  const html = fakeDocument.getElementById('lifeOSReviewPanel').innerHTML;
  assert.match(html, /Kekayaan terakhir: 12345678/);
  assert.match(html, /Skor Hidup Seimbang terakhir tercatat/);
});

test('LifeOSReview.render(): netWorth 0 (falsy tapi valid) tetap tampil apa adanya, bukan dianggap kosong (?? bukan ||)', () => {
  const D = { wealthSnapshots: [{ netWorth: 0 }] };
  const { lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSReviewPanel: {} });
  const ctx = load({ D, fakeDocument, lifeOSGetStore, lifeOSSave });
  ctx.LifeOSReview.render();
  const html = fakeDocument.getElementById('lifeOSReviewPanel').innerHTML;
  assert.match(html, /Kekayaan terakhir: 0/);
});

test('LifeOSReview.render(): #lifeOSReviewPanel tidak ada di DOM -> tidak throw (guard awal)', () => {
  const fakeDocument = createFakeDocument({});
  fakeDocument.getElementById = () => null;
  const { lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const ctx = load({ D: {}, fakeDocument, lifeOSGetStore, lifeOSSave });
  assert.doesNotThrow(() => ctx.LifeOSReview.render());
});

test('LifeOSReview.startWeekly(): delegasi penuh ke reviewServiceStartSession() dgn periodKey weekly-YYYY-MM-DD, lalu re-render', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSReviewPanel: {} });
  const ctx = load({ D: {}, fakeDocument, lifeOSGetStore, lifeOSSave, uidSeq: ['sess-1'] });
  await ctx.LifeOSReview.startWeekly();
  assert.equal(store.reviewLog.length, 1);
  const s = store.reviewLog[0];
  assert.equal(s.id, 'sess-1');
  assert.equal(s.period, 'weekly');
  assert.match(s.periodKey, /^weekly-\d{4}-\d{2}-\d{2}$/);
  assert.equal(s.completedAt, null);
  assert.equal(saveCalls.length, 1);
  const html = fakeDocument.getElementById('lifeOSReviewPanel').innerHTML;
  // Setelah startWeekly(), sesi weekly baru belum completedAt -> masih overdue,
  // render() dipanggil ulang otomatis (badge weekly tetap tampil, bukti re-render).
  assert.match(html, /Weekly Review jatuh tempo/);
});

test('reviewServiceStartSession(): sesi tersimpan dgn field lengkap (snapshotRefs kosong, notes kosong, actionItems kosong)', async () => {
  const { store, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const ctx = load({ lifeOSGetStore, lifeOSSave, uidSeq: ['abc'] });
  const session = await ctx.reviewServiceStartSession('monthly', 'monthly-2026-07');
  assert.equal(session.id, 'abc');
  assert.equal(session.period, 'monthly');
  assert.equal(session.periodKey, 'monthly-2026-07');
  assert.equal(session.completedAt, null);
  assert.equal(session.notes, '');
  assert.equal(session.actionItems.length, 0);
  assert.equal(session.snapshotRefs.wealthSnapshotId, null);
  assert.equal(session.snapshotRefs.lifeBalanceSnapshotId, null);
  assert.equal(store.reviewLog.length, 1);
});

test('reviewServiceComplete(): sessionId ketemu -> completedAt/notes/snapshotRefs terisi & digabung (merge), lifeOSSave() dipanggil; sessionId tidak ketemu -> null, TIDAK memanggil lifeOSSave()', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 's1', period: 'weekly', periodKey: 'weekly-x', completedAt: null, notes: '', actionItems: [], snapshotRefs: { wealthSnapshotId: null, lifeBalanceSnapshotId: 'old' } },
  ]);
  const ctx = load({ lifeOSGetStore, lifeOSSave });

  const result = await ctx.reviewServiceComplete('s1', { notes: 'catatan review', snapshotRefs: { wealthSnapshotId: 'w1' } });
  assert.equal(typeof result.completedAt, 'string');
  assert.equal(result.notes, 'catatan review');
  // merge: wealthSnapshotId diisi baru, lifeBalanceSnapshotId lama TETAP dipertahankan (spread, bukan overwrite total)
  assert.equal(result.snapshotRefs.wealthSnapshotId, 'w1');
  assert.equal(result.snapshotRefs.lifeBalanceSnapshotId, 'old');
  assert.equal(saveCalls.length, 1);

  const missing = await ctx.reviewServiceComplete('tidak-ada');
  assert.equal(missing, null);
  assert.equal(saveCalls.length, 1); // tidak nambah — tidak jadi memanggil lifeOSSave()
});

test('reviewServiceComplete(): dipanggil tanpa argumen kedua -> notes default kosong, snapshotRefs default {} (tidak throw)', async () => {
  const { lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 's1', period: 'weekly', periodKey: 'weekly-x', completedAt: null, notes: '', actionItems: [], snapshotRefs: {} },
  ]);
  const ctx = load({ lifeOSGetStore, lifeOSSave });
  const result = await ctx.reviewServiceComplete('s1');
  assert.equal(result.notes, '');
  assert.equal(typeof result.completedAt, 'string');
});

test('reviewServiceAddActionItem(): item baru ditambahkan (done:false), sessionId tidak ketemu -> null tanpa memanggil lifeOSSave()', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 's1', period: 'weekly', periodKey: 'weekly-x', completedAt: null, notes: '', actionItems: [], snapshotRefs: {} },
  ]);
  const ctx = load({ lifeOSGetStore, lifeOSSave, uidSeq: ['item-1'] });

  const result = await ctx.reviewServiceAddActionItem('s1', 'Follow up cicilan');
  assert.equal(result.actionItems.length, 1);
  assert.equal(result.actionItems[0].id, 'item-1');
  assert.equal(result.actionItems[0].text, 'Follow up cicilan');
  assert.equal(result.actionItems[0].done, false);
  assert.equal(saveCalls.length, 1);

  const missing = await ctx.reviewServiceAddActionItem('tidak-ada', 'x');
  assert.equal(missing, null);
  assert.equal(saveCalls.length, 1);
});
