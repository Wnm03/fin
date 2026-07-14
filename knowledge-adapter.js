// adapters/knowledge-adapter.js — READ-ONLY. D.catatan (catatan privat
// manual, milik keamanan-pin.js/refleksi-selfcare.js dll) dibaca sebagai
// REFERENSI saja — Knowledge base Life OS yang sebenarnya (insight AI
// tersimpan) hidup di LifeOSStore.knowledge, ditulis lewat
// services/knowledge-service.js. Tidak pernah menulis ke D.catatan.

function knowledgeAdapterList(lifeOSStore) {
  return (lifeOSStore.knowledge || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function knowledgeAdapterByTag(lifeOSStore, tag) {
  return knowledgeAdapterList(lifeOSStore).filter((k) => (k.tags || []).includes(tag));
}

function knowledgeAdapterCatatanRef(D) {
  // Referensi read-only ke catatan privat lama — ditampilkan sebagai
  // "lihat juga", bukan dimigrasikan/disalin ke LifeOSStore.
  return D.catatan || {};
}
