'use strict';
// tests/cross-module-graph-static.test.js — Regression test S117
// (Dependency Graph Verification & Normalization, lanjutan S116).
//
// BEDA dgn tests/decision-center-dependency-graph.test.js (S116): file
// itu memuat & MENJALANKAN rantai runtime utk 1 sub-cabang (Decision
// Center) yang PERNAH kena bug siklus. File ini melengkapi dgn ANALISIS
// STATIS atas SELURUH modules/cross/*.js sekaligus — membaca source ASLI
// tiap file (bukan disalin manual), mengekstrak deklarasi modul
// (`const Nama = {`) & referensi antar-modul (`typeof Nama`), lalu
// menjalankan topological sort (Kahn's algorithm) ke SELURUH graph.
//
// Kenapa perlu 2 lapis (runtime + statis): runtime test (S116) memuat &
// MEMANGGIL fungsi sungguhan, tapi HANYA utk cabang yang sudah diketahui
// pernah bermasalah — kalau ada modul cross LAIN (di luar cabang itu)
// suatu saat menambah 1 baris `typeof XXX` yang membentuk siklus baru,
// runtime test S116 tidak akan menyentuhnya sama sekali. Test statis di
// sini SELALU membaca ULANG SEMUA file modules/cross/*.js tiap kali
// dijalankan (bukan daftar edge yang di-hardcode) — jadi siklus baru DI
// MANA PUN di lapisan cross otomatis ketahuan tanpa perlu menulis test
// baru tiap kali ada modul baru ditambah.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const CROSS_DIR = path.join(__dirname, '..', 'modules', 'cross');

function listCrossFiles() {
  return fs.readdirSync(CROSS_DIR).filter((f) => f.endsWith('.js')).sort();
}

// buildGraph() — baca ulang SEMUA file modules/cross/*.js dari disk,
// ekstrak nama modul (`const Nama = {` di top-level) & dependency
// (`typeof Nama` yang cocok dgn salah satu nama modul yang sudah
// dikenal). Regex sengaja SEDERHANA (bukan parser AST penuh) krn pola
// guard `typeof X === 'undefined'` konsisten dipakai di SELURUH
// codebase (lihat CLAUDE.md/pola guard tiap file) — cukup utk deteksi
// dependency antar modul cross, TIDAK dipakai utk transformasi/rename
// apa pun (murni alat audit test, tidak menyentuh source aplikasi).
function buildGraph() {
  const files = listCrossFiles();
  const sources = {};
  const moduleNames = new Set();
  const fileOfModule = {};

  for (const f of files) {
    const src = fs.readFileSync(path.join(CROSS_DIR, f), 'utf8');
    sources[f] = src;
    const m = src.match(/^const ([A-Za-z][A-Za-z0-9]*) = \{/m);
    if (m) {
      moduleNames.add(m[1]);
      fileOfModule[m[1]] = f;
    }
  }

  const edges = {}; // moduleName -> Set(moduleName yang dia butuhkan)
  for (const name of moduleNames) edges[name] = new Set();

  for (const [f, src] of Object.entries(sources)) {
    const selfMatch = src.match(/^const ([A-Za-z][A-Za-z0-9]*) = \{/m);
    if (!selfMatch) continue;
    const self = selfMatch[1];
    const typeofRefs = [...src.matchAll(/typeof\s+([A-Za-z][A-Za-z0-9]*)/g)].map((mm) => mm[1]);
    for (const ref of typeofRefs) {
      if (ref !== self && moduleNames.has(ref)) {
        edges[self].add(ref);
      }
    }
  }

  return { moduleNames, edges, fileOfModule };
}

// topoSort() — Kahn's algorithm. Return {ok:true, order:[...]} kalau DAG,
// {ok:false, remaining:[...]} (modul yang tersisa = bagian dari siklus)
// kalau ada cycle.
function topoSort(moduleNames, edges) {
  const indeg = {};
  for (const n of moduleNames) indeg[n] = edges[n].size;

  const reverseAdj = {}; // dependency -> [modul yang membutuhkannya]
  for (const n of moduleNames) reverseAdj[n] = [];
  for (const n of moduleNames) {
    for (const dep of edges[n]) reverseAdj[dep].push(n);
  }

  const queue = [...moduleNames].filter((n) => indeg[n] === 0).sort();
  const order = [];
  while (queue.length) {
    const n = queue.shift();
    order.push(n);
    for (const dependent of reverseAdj[n]) {
      indeg[dependent] -= 1;
      if (indeg[dependent] === 0) queue.push(dependent);
    }
  }

  if (order.length === moduleNames.size) return { ok: true, order };
  const remaining = [...moduleNames].filter((n) => !order.includes(n));
  return { ok: false, remaining };
}

test('seluruh modules/cross/*.js berhasil dibaca & modulnya terdeteksi', () => {
  const { moduleNames } = buildGraph();
  assert.ok(moduleNames.size >= 15, `Ekspektasi minimal 15 modul cross terdeteksi, dapat ${moduleNames.size}`);
  for (const name of ['ActionQueue', 'RecommendationPanel', 'DecisionCenterAPI',
    'UnifiedAIBriefing', 'UnifiedSummaryAPI', 'CrossAIHook', 'LifeDashboardSummaryAPI', 'PriorityEngine']) {
    assert.ok(moduleNames.has(name), `Modul ${name} harus terdeteksi dari source`);
  }
});

test('dependency graph modules/cross/*.js membentuk DAG (0 circular dependency)', () => {
  const { moduleNames, edges } = buildGraph();
  const result = topoSort(moduleNames, edges);
  if (!result.ok) {
    assert.fail(`Circular dependency terdeteksi, melibatkan modul: ${result.remaining.join(', ')}`);
  }
  assert.equal(result.ok, true);
});

test('UnifiedAIBriefing TIDAK bergantung pada DecisionCenterAPI maupun ActionQueue (guard permanen S116/S117)', () => {
  const { edges } = buildGraph();
  const deps = edges.UnifiedAIBriefing;
  assert.ok(deps, 'UnifiedAIBriefing harus terdeteksi di graph');
  assert.equal(deps.has('DecisionCenterAPI'), false);
  assert.equal(deps.has('ActionQueue'), false);
  assert.equal(deps.has('LifeDashboardSummaryAPI'), false);
});

test('DecisionCenterAPI adalah consumer (punya dependency), BUKAN root (0 modul cross yang bergantung balik ke DecisionCenterAPI lewat rantai yang berakhir di dirinya sendiri)', () => {
  const { moduleNames, edges } = buildGraph();
  assert.ok(edges.DecisionCenterAPI.size > 0, 'DecisionCenterAPI harus punya minimal 1 dependency (consumer, bukan root)');
  // DAG check di atas sudah menjamin tidak ada rantai balik ke dirinya sendiri;
  // di sini pastikan spesifik DecisionCenterAPI ada di dependency-nya sendiri: harus false.
  assert.equal(edges.DecisionCenterAPI.has('DecisionCenterAPI'), false);
  void moduleNames;
});

test('CrossSummaryAPI (root chain) tidak bergantung pada modul cross lain (murni titik masuk domain finance/vehicle)', () => {
  const { edges } = buildGraph();
  assert.equal(edges.CrossSummaryAPI.size, 0);
});
