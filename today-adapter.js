// adapters/today-adapter.js — READ-ONLY. TODAY bukan penyimpanan sendiri,
// cuma lensa waktu di atas AREAS/PROJECTS/GOALS (lihat
// personal-life-os-blueprint.md Langkah 2). Depends on: lifeos-registry.js
// (LIFEOS_TODAY_SOURCES). Tidak pernah menulis ke D.

function todayAdapterList(D) {
  const items = [];

  (D.bills || []).forEach((b) => {
    if (b.dueDate && isDueSoon(b.dueDate)) {
      items.push({ id: `bills:${b.id}`, sourceKind: 'bills', sourceId: b.id, label: b.name, dueDate: b.dueDate });
    }
  });

  (D.reminders || []).forEach((r) => {
    if (!r.done) items.push({ id: `reminders:${r.id}`, sourceKind: 'reminders', sourceId: r.id, label: r.text || r.title });
  });

  // NOTE: selfcare/payroll/tukang sourcenya (D.refleksi, D.gajiMingguanHistory,
  // D.tukangAbsensi) punya bentuk yang bervariasi per-tanggal — logic
  // "apakah item ini urgent hari ini" perlu dicek terhadap masing-masing
  // modul sumber sebelum diimplementasi penuh di sini. Placeholder:
  // items.push(...) ditambahkan bertahap per sumber setelah diverifikasi.

  return items;
}

function isDueSoon(dateStr, withinDays = 3) {
  const due = new Date(dateStr);
  const today = new Date();
  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  return diffDays <= withinDays;
}
