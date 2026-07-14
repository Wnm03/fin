// lifeos-store.js — SATU-SATUNYA tempat Life OS boleh MENULIS.
//
// ATURAN WAJIB:
// - Tidak pernah menyentuh D. Tidak ada property baru di D, tidak ada
//   perubahan struktur D sedikit pun.
// - Tidak pernah memanggil save() milik D.
// - Persist lewat IDBStore, key 'lifeos:store', terpisah total dari
//   siklus save/load milik D.
// - Semua modul lain di lifeos/ (adapters, services, ui) mengakses store
//   ini HANYA lewat lifeOSLoad()/lifeOSSave() di file ini — jangan
//   import/re-declare state terpisah di file lain.

let LifeOSStore = {
  projects: [],   // lihat adapters/project-adapter.js — kind:'generic'|'renovasi'
  reviewLog: [],  // lihat adapters/review-adapter.js
  knowledge: [],  // lihat adapters/knowledge-adapter.js
};

const LIFEOS_STORE_KEY = 'lifeos:store';
const LIFEOS_STORE_DEFAULT = { projects: [], reviewLog: [], knowledge: [] };

async function lifeOSLoad() {
  // CATATAN: IDBStore.get() cuma terima 1 argumen (lihat aset.js / tests/idb-store.test.js
  // — "get() pakai fallback=undefined"), jadi default HARUS diterapkan manual di sini,
  // bukan dioper sebagai argumen kedua ke IDBStore.get().
  const raw = await IDBStore.get(LIFEOS_STORE_KEY);
  LifeOSStore = raw || LIFEOS_STORE_DEFAULT;
  return LifeOSStore;
}

let _lifeOSLoaded = false;
// Dipanggil oleh UI entry point (LifeOSHome.render()) — load dari IDBStore
// SEKALI per sesi, bukan tiap render, supaya tidak round-trip IndexedDB tiap
// kali Dashboard Hub dibuka. Service (project/review/knowledge-service.js)
// tetap baca lewat lifeOSGetStore() seperti biasa setelah ini selesai.
async function lifeOSEnsureLoaded() {
  if (!_lifeOSLoaded) {
    await lifeOSLoad();
    _lifeOSLoaded = true;
  }
  return LifeOSStore;
}

async function lifeOSSave() {
  return IDBStore.set(LIFEOS_STORE_KEY, LifeOSStore);
}

function lifeOSGetStore() {
  return LifeOSStore;
}
