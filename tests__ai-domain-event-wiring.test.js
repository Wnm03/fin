'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Pola sama dgn tests/dash-card-registry.test.js & tests/dashboard-hub-live-wiring.test.js:
// regex-parse source langsung, bukan VM (file domain terlalu besar/bergantung banyak modul).
//
// Sesi 6 RENCANA-SESI-RINGKAS.md ("wiring event dari titik save() masing-masing modul lewat
// AIBus") SUDAH dikerjakan di source (4 file domain di bawah sudah emit AIBus.emit(...) di titik
// save() aslinya) — tapi sebelumnya TIDAK ADA test yang menjaganya. tests/ai-service-wireevents.js
// yang sudah ada cuma menguji mekanisme AIBus.on()/wireEvents() sendiri (event palsu, bukan dari
// titik save() domain nyata) — kalau salah satu baris emit di bawah kehapus tanpa sengaja saat
// refactor, tidak ada test yang gagal. Test ini menutup celah itu.
const DOMAIN_EVENTS = [
  { file: 'modules/finance/transaksi.js', event: 'finance.updated', minCount: 1 },
  { file: 'modules/asset/aset.js', event: 'asset.updated', minCount: 1 },
  { file: 'modules/vehicle/sparepart-servis.js', event: 'vehicle.updated', minCount: 1 },
  { file: 'modules/shop/cobek-order.js', event: 'delivery.created', minCount: 1 },
];

test('titik save() domain (finance/asset/vehicle/shop) tetap memancarkan event AIBus Sesi 6', () => {
  for (const { file, event, minCount } of DOMAIN_EVENTS) {
    const src = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const re = new RegExp(
      `typeof AIBus!==["']undefined["']\\)AIBus\\.emit\\(["']${event.replace('.', '\\.')}["']`,
      'g'
    );
    const matches = src.match(re) || [];
    assert.ok(
      matches.length >= minCount,
      `${file} diharapkan punya >= ${minCount} pemanggilan guarded AIBus.emit('${event}', ...) — ditemukan ${matches.length}. Kalau baris ini sengaja dihapus/dipindah, update juga AIService.wireEvents() (ai-service.js) & RENCANA-SESI-RINGKAS.md.`
    );
  }
});

test('wireEvents() (ai-service.js) tetap subscribe ke keempat event yang di-emit domain', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'modules/ai/ai-service.js'),
    'utf8'
  );
  for (const { event } of DOMAIN_EVENTS) {
    assert.match(
      src,
      new RegExp(`['"]${event.replace('.', '\\.')}['"]`),
      `ai-service.js (wireEvents) tidak lagi menyebut event '${event}' — event dari domain tidak akan pernah sampai ke AIDecision.decide().`
    );
  }
});
