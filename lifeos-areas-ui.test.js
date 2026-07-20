'use strict';
// tests/lifeos-areas-ui.test.js — LifeOSAreas.render() (lifeos/ui/areas.js,
// BARU Sesi 39 "Executive Dashboard Integration"). Fokus: (1) render()
// murni konsumsi areaAdapterList(D) (area-adapter.js, registry-driven lewat
// LIFEOS_AREAS) — TIDAK baca D langsung; (2) #lifeOSAreasGrid diisi 1 kartu
// per area dgn label/icon/itemCount yang benar; (3) area kosong -> pesan
// empty state, tidak throw; (4) el tidak ada di DOM -> tidak throw (guard
// awal sama pola dgn ui/goals.js dkk).
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');
const { createFakeDocument } = require('../helpers/fakeDom');

function load(D, fakeDocument) {
  return loadSource(
    ['lifeos/lifeos-registry.js', 'lifeos/adapters/area-adapter.js', 'lifeos/ui/areas.js'],
    {
      D,
      escapeHtml: (s) => String(s),
      document: fakeDocument,
    },
    ['LifeOSAreas', 'LIFEOS_AREAS'],
  );
}

test('LifeOSAreas.render(): #lifeOSAreasGrid diisi 1 kartu per area dari areaAdapterList(D), bukan hardcode', () => {
  const D = { transactions: [{ id: 1 }, { id: 2 }], vehicles: [{ id: 1 }] };
  const fakeDocument = createFakeDocument({ lifeOSAreasGrid: {} });
  const ctx = load(D, fakeDocument);
  ctx.LifeOSAreas.render();
  const html = fakeDocument.getElementById('lifeOSAreasGrid').innerHTML;
  assert.match(html, /Finance/);
  assert.match(html, /Kendaraan/);
  assert.match(html, /2 item/); // finance: transactions (2)
  assert.match(html, /1 item/); // kendaraan: vehicles (1)
});

test('LifeOSAreas.render(): D kosong -> semua area tetap muncul dgn 0 item, tidak throw', () => {
  const fakeDocument = createFakeDocument({ lifeOSAreasGrid: {} });
  const ctx = load({}, fakeDocument);
  assert.doesNotThrow(() => ctx.LifeOSAreas.render());
  const html = fakeDocument.getElementById('lifeOSAreasGrid').innerHTML;
  assert.match(html, /0 item/);
});

test('LifeOSAreas.render(): #lifeOSAreasGrid tidak ada di DOM -> tidak throw (guard awal)', () => {
  const fakeDocument = createFakeDocument({});
  fakeDocument.getElementById = () => null;
  const ctx = load({}, fakeDocument);
  assert.doesNotThrow(() => ctx.LifeOSAreas.render());
});

test('LifeOSAreas.render(): registry-driven — kalau LIFEOS_AREAS bertambah 1 area baru, kartu barunya otomatis ikut dirender', () => {
  const D = { bebasArr: [{ id: 1 }, { id: 2 }, { id: 3 }] };
  const fakeDocument = createFakeDocument({ lifeOSAreasGrid: {} });
  const ctx = load(D, fakeDocument);
  ctx.LIFEOS_AREAS.push({ key: 'bebas', label: 'Area Bebas', icon: '🆕', dSources: ['bebasArr'] });
  ctx.LifeOSAreas.render();
  const html = fakeDocument.getElementById('lifeOSAreasGrid').innerHTML;
  assert.match(html, /Area Bebas/);
  assert.match(html, /3 item/);
});
