'use strict';
// tests/lifeos-knowledge-ui.test.js — LifeOSKnowledge (lifeos/ui/knowledge.js)
// + knowledgeServiceSave/UpdateTags/Delete (lifeos/services/knowledge-service.js).
// Ditambahkan Sesi 52 (Batch 3) — hasil audit `docs/BATCH_PLAN.md`/
// `docs/PROJECT_STATE.md` § LifeOS "Knowledge — Ada, belum diaudit detail":
// kedua file ini sebelumnya 0 test sama sekali (dicek via grep, tidak ada
// `tests/*.test.js` yang me-`loadSource` salah satu dari keduanya).
//
// Tidak ada bug ditemukan selama audit — sesi ini murni menambah test yang
// sebelumnya nol, TIDAK ada perubahan kode aplikasi. Fokus:
// (1) LifeOSKnowledge.render() murni konsumsi knowledgeAdapterList(store)
//     (registry/adapter yang sudah ada & sudah tertes sendiri di
//     tests/lifeos-knowledge-adapter.test.js) — TIDAK baca store langsung;
// (2) urutan tampil ikuti urutan yang sudah dihasilkan adapter (terbaru
//     dulu), bukan diurutkan ulang di UI;
// (3) knowledge kosong -> empty state, tidak throw;
// (4) elemen tidak ada di DOM -> tidak throw (guard awal, pola sama dgn
//     ui/areas.js dkk);
// (5) saveInsight() SATU-SATUNYA jalur tulis (delegasi penuh ke
//     knowledgeServiceSave(), TIDAK ada logic tulis lain di UI) lalu
//     re-render;
// (6) knowledgeServiceSave/UpdateTags/Delete masing2 fungsi murni terhadap
//     store yang dioper `lifeOSGetStore()` (di-stub di test ini) + memanggil
//     `lifeOSSave()` (di-stub, dicatat pemanggilannya) tepat 1x per operasi
//     sukses, TIDAK dipanggil kalau entry tidak ketemu.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeStoreHarness(initialKnowledge) {
  const store = { projects: [], reviewLog: [], knowledge: initialKnowledge || [] };
  const saveCalls = [];
  const lifeOSGetStore = () => store;
  const lifeOSSave = () => {
    saveCalls.push(1);
    return Promise.resolve();
  };
  return { store, saveCalls, lifeOSGetStore, lifeOSSave };
}

function load({ D = {}, fakeDocument, store, lifeOSGetStore, lifeOSSave, uidSeq } = {}) {
  let uidCounter = 0;
  return loadSource(
    ['lifeos/lifeos-registry.js', 'lifeos/adapters/knowledge-adapter.js', 'lifeos/services/knowledge-service.js', 'lifeos/ui/knowledge.js'],
    {
      D,
      document: fakeDocument,
      escapeHtml: (s) => String(s),
      lifeOSGetStore,
      lifeOSSave,
      uid: () => (uidSeq ? uidSeq[uidCounter++] : `uid-${++uidCounter}`),
      // knowledge.js (baris paling akhir) meng-expose SEMUA modul UI
      // Life OS ke window sekaligus (LifeOSHome/Areas/Today/Goals/Projects/
      // Review/Knowledge) — file ini SENGAJA dimuat sendirian di sini (tidak
      // ikut memuat 6 file ui/*.js lain), jadi ke-6 nama itu perlu di-stub
      // supaya baris exposure-nya tidak ReferenceError. Tidak berpengaruh ke
      // apa pun yang dites di file ini (murni supaya file bisa di-load).
      LifeOSHome: undefined,
      LifeOSAreas: undefined,
      LifeOSToday: undefined,
      LifeOSGoals: undefined,
      LifeOSProjects: undefined,
      LifeOSReview: undefined,
    },
    ['LifeOSKnowledge'],
  );
}

test('LifeOSKnowledge.render(): #lifeOSKnowledgeList diisi dari knowledgeAdapterList(store), urutan & isi apa adanya (bukan hardcode)', () => {
  const { store, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'k1', title: 'Insight Lama', tags: ['finance'], createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'k2', title: 'Insight Baru', tags: ['vehicle', 'servis'], createdAt: '2026-02-01T00:00:00.000Z' },
  ]);
  const fakeDocument = createFakeDocument({ lifeOSKnowledgeList: {} });
  const ctx = load({ fakeDocument, store, lifeOSGetStore, lifeOSSave });
  ctx.LifeOSKnowledge.render();
  const html = fakeDocument.getElementById('lifeOSKnowledgeList').innerHTML;
  const idxBaru = html.indexOf('Insight Baru');
  const idxLama = html.indexOf('Insight Lama');
  assert.ok(idxBaru !== -1 && idxLama !== -1);
  // knowledgeAdapterList() urutkan terbaru dulu -> "Insight Baru" (2026-02)
  // harus muncul SEBELUM "Insight Lama" (2026-01) di HTML.
  assert.ok(idxBaru < idxLama);
  assert.match(html, /vehicle, servis/);
});

test('LifeOSKnowledge.render(): knowledge kosong -> empty state, tidak throw', () => {
  const { store, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSKnowledgeList: {} });
  const ctx = load({ fakeDocument, store, lifeOSGetStore, lifeOSSave });
  assert.doesNotThrow(() => ctx.LifeOSKnowledge.render());
  const html = fakeDocument.getElementById('lifeOSKnowledgeList').innerHTML;
  assert.match(html, /Belum ada insight tersimpan/);
});

test('LifeOSKnowledge.render(): judul/tag kosong (falsy) tidak melempar error (fallback string kosong)', () => {
  const { store, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'k1', title: null, tags: null, createdAt: '2026-01-01T00:00:00.000Z' },
  ]);
  const fakeDocument = createFakeDocument({ lifeOSKnowledgeList: {} });
  const ctx = load({ fakeDocument, store, lifeOSGetStore, lifeOSSave });
  assert.doesNotThrow(() => ctx.LifeOSKnowledge.render());
});

test('LifeOSKnowledge.render(): #lifeOSKnowledgeList tidak ada di DOM -> tidak throw (guard awal)', () => {
  const fakeDocument = createFakeDocument({});
  fakeDocument.getElementById = () => null;
  const { store, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const ctx = load({ fakeDocument, store, lifeOSGetStore, lifeOSSave });
  assert.doesNotThrow(() => ctx.LifeOSKnowledge.render());
});

test('LifeOSKnowledge.saveInsight(): delegasi penuh ke knowledgeServiceSave() lalu re-render — entry baru masuk store & tampil', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSKnowledgeList: {} });
  const ctx = load({ fakeDocument, store, lifeOSGetStore, lifeOSSave, uidSeq: ['new-1'] });
  await ctx.LifeOSKnowledge.saveInsight({
    sourceKind: 'ai-chat', title: 'Insight Baru dari AI', content: 'isi lengkap', tags: ['ai'],
  });
  assert.equal(store.knowledge.length, 1);
  assert.equal(store.knowledge[0].id, 'new-1');
  assert.equal(store.knowledge[0].title, 'Insight Baru dari AI');
  assert.equal(store.knowledge[0].sourceKind, 'ai-chat');
  assert.equal(saveCalls.length, 1); // lifeOSSave() dipanggil tepat 1x
  const html = fakeDocument.getElementById('lifeOSKnowledgeList').innerHTML;
  assert.match(html, /Insight Baru dari AI/); // render() dipanggil ulang otomatis
});

test('knowledgeServiceSave(): entry tersimpan dgn field lengkap (id/createdAt/relatedRefs default kosong)', async () => {
  const { store, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const ctx = load({ store, lifeOSGetStore, lifeOSSave, uidSeq: ['abc'] });
  const entry = await ctx.knowledgeServiceSave({ sourceKind: 'manual', title: 'T', content: 'C' });
  assert.equal(entry.id, 'abc');
  assert.equal(entry.sourceKind, 'manual');
  assert.equal(entry.tags.length, 0);
  assert.equal(entry.relatedRefs.length, 0);
  assert.equal(typeof entry.createdAt, 'string');
  assert.equal(store.knowledge.length, 1);
});

test('knowledgeServiceUpdateTags(): entry ketemu -> tags diganti & lifeOSSave() dipanggil; entry tidak ketemu -> null, TIDAK memanggil lifeOSSave()', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'k1', title: 'X', tags: ['lama'], createdAt: '2026-01-01T00:00:00.000Z' },
  ]);
  const ctx = load({ store, lifeOSGetStore, lifeOSSave });

  const result = await ctx.knowledgeServiceUpdateTags('k1', ['baru1', 'baru2']);
  assert.deepEqual(result.tags, ['baru1', 'baru2']);
  assert.deepEqual(store.knowledge[0].tags, ['baru1', 'baru2']);
  assert.equal(saveCalls.length, 1);

  const missing = await ctx.knowledgeServiceUpdateTags('tidak-ada', ['x']);
  assert.equal(missing, null);
  assert.equal(saveCalls.length, 1); // tidak nambah — tidak jadi memanggil lifeOSSave()
});

test('knowledgeServiceDelete(): menghapus entry sesuai id, entry lain tidak ikut terhapus', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'k1', title: 'Satu' },
    { id: 'k2', title: 'Dua' },
  ]);
  const ctx = load({ store, lifeOSGetStore, lifeOSSave });
  await ctx.knowledgeServiceDelete('k1');
  assert.equal(store.knowledge.length, 1);
  assert.equal(store.knowledge[0].id, 'k2');
  assert.equal(saveCalls.length, 1);
});

test('knowledgeServiceDelete(): id tidak ketemu -> tidak error, store tidak berubah (tetap memanggil lifeOSSave(), sama pola dgn filter() yang selalu jalan)', async () => {
  const { store, lifeOSGetStore, lifeOSSave } = makeStoreHarness([{ id: 'k1', title: 'Satu' }]);
  const ctx = load({ store, lifeOSGetStore, lifeOSSave });
  await assert.doesNotReject(() => ctx.knowledgeServiceDelete('tidak-ada'));
  assert.equal(store.knowledge.length, 1);
});
