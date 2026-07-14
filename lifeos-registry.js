// lifeos-registry.js — taksonomi FUNGSIONAL Life OS (beda dari
// FEATURE_REGISTRY yang taksonomi NAVIGASI — keduanya sengaja terpisah,
// lihat personal-life-os-blueprint.md Langkah 1).
//
// PENTING: file ini MURNI DATA. Tidak ada logic, tidak ada akses D di sini
// — cuma daftar "field mana yang jadi sumber apa", dikonsumsi oleh
// adapters/*.js. Tidak mengubah D, tidak mengubah FEATURE_REGISTRY.

// AREAS — domain yang tidak pernah "selesai". dSources = nama array D.*
// yang jadi sumber data Area ini (read-only, lihat masing-masing adapter).
const LIFEOS_AREAS = [
  { key: 'finance',   label: 'Finance',   icon: '💰', dSources: ['transactions', 'accounts', 'budgets', 'budgetReko', 'bills', 'billsArchive', 'debts', 'debtStrategy', 'piutang', 'pajakZakat'] },
  { key: 'business',  label: 'Business',  icon: '🛒', dSources: ['cobek', 'cobekKategori', 'produsen', 'products', 'sewaKios'] },
  { key: 'kendaraan', label: 'Kendaraan', icon: '🚗', dSources: ['vehicles', 'bbmLogs', 'servisLogs', 'kmLogs', 'simList', 'partsStock', 'sparepartCats', 'torsiChecklist', 'jalanLogs'] },
  { key: 'family',    label: 'Family',    icon: '👨‍👩‍👧', dSources: ['milestones', 'tukangWorkers', 'tukangAbsensi', 'tukangBorHargaMemory'] },
  { key: 'health',    label: 'Health',    icon: '🏃', dSources: ['refleksi', 'lifeBalanceSnapshots'] },
  { key: 'spiritual', label: 'Spiritual', icon: '🕌', dSources: ['pajakZakat', 'refleksi'] },
];

// TODAY — irisan waktu, bukan penyimpanan sendiri. Tiap entri nunjuk ke
// array D.* + label; today-adapter.js yang menentukan logic "urgent hari
// ini" per sumber.
const LIFEOS_TODAY_SOURCES = [
  { key: 'bills',     dArr: 'bills',              label: 'Tagihan jatuh tempo' },
  { key: 'reminders', dArr: 'reminders',           label: 'Pengingat umum' },
  { key: 'selfcare',  dArr: 'refleksi',            label: 'Checklist Self-Care & Jurnal Syukur' },
  { key: 'payroll',   dArr: 'gajiMingguanHistory', label: 'Reset Gaji Mingguan' },
  { key: 'tukang',    dArr: 'tukangAbsensi',       label: 'Absensi Tukang/pekerja lepas' },
];

// GOALS — sumber D.* per jenis goal (adapter murni, lihat
// adapters/goal-adapter.js — tidak menyimpan apa pun, dihitung on-the-fly).
const LIFEOS_GOAL_SOURCES = [
  { key: 'target',    dArr: 'targets',           areaKey: 'finance' },
  { key: 'eduFund',   dArr: 'eduFunds',          areaKey: 'finance' },
  { key: 'pensiun',   dArr: 'pensiun',           areaKey: 'finance' },
  { key: 'fi',        dArr: 'finansialFreedom',  areaKey: 'finance' },
  { key: 'wishlist',  dArr: 'wishlist',          areaKey: 'finance' },
  { key: 'debt',      dArr: 'debtStrategy',      areaKey: 'finance' },
];

// PROJECTS — sumber legacy (Renovasi) yang di-merge dengan
// LifeOSStore.projects lewat project-adapter.js.
const LIFEOS_PROJECT_LEGACY_SOURCE = { key: 'renovasi', dArr: 'renovProjects', areaKey: 'business' };

// REVIEW — histori pasif existing yang jadi bahan sesi review.
const LIFEOS_REVIEW_SOURCES = [
  { key: 'wealth',      dArr: 'wealthSnapshots' },
  { key: 'lifeBalance', dArr: 'lifeBalanceSnapshots' },
  { key: 'assetAlloc',  dArr: 'assetAllocation' },
];

// KNOWLEDGE — referensi (bukan sumber tulis) ke catatan privat lama.
const LIFEOS_KNOWLEDGE_REF_SOURCE = { key: 'catatan', dArr: 'catatan' };
