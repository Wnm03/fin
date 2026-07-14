// adapters/project-adapter.js — merge READ-ONLY antara dua sumber:
//   1. D.renovProjects        (legacy, milik renovasi.js — tidak disentuh)
//   2. LifeOSStore.projects   (generic, milik Life OS — lihat services/project-service.js untuk tulis)
//
// Adapter ini hanya membaca kedua sumber & menyatukan bentuknya. Tidak
// pernah menulis ke D.renovProjects. Penulisan project generik lewat
// project-service.js, bukan di sini.

function projectAdapterList(D, lifeOSStore) {
  const legacy = (D.renovProjects || []).map((p) => ({
    id: `renovasi:${p.id}`, kind: 'renovasi', sourceRef: { arr: 'renovProjects', id: p.id },
    name: p.name, areaKey: 'business', status: 'active',
    dueDate: null, createdAt: p.createdAt,
    checklistCount: (p.items || []).length,
  }));

  const generic = (lifeOSStore.projects || []).map((p) => ({
    id: `generic:${p.id}`, kind: 'generic', sourceRef: null,
    name: p.name, areaKey: p.areaKey, status: p.status,
    dueDate: p.dueDate || null, createdAt: p.createdAt,
    checklistCount: (p.checklist || []).length,
  }));

  return [...legacy, ...generic];
}

function projectAdapterFindOne(D, lifeOSStore, id) {
  return projectAdapterList(D, lifeOSStore).find((p) => p.id === id) || null;
}
