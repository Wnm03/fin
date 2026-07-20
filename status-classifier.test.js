'use strict';
// tests/status-classifier.test.js — classifyEconomicStatus() (domain/
// status-classifier.js, sebelumnya weather-classifier.js/classifyWeather()
// — istilah "weather" diganti "status"/"kondisi" ekonomi, konsisten dgn
// label yang sudah dipakai di UI kartu "Kondisi Ekonomi"). File ini SEBELUM
// rename ini belum punya test sama sekali — ditambahkan sekalian di sini.
// Pure function, tidak butuh DOM/D — di-load langsung via loadSource().
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');

function load() {
  return loadSource(
    ['economic-intelligence/domain/status-classifier.js'],
    {},
    ['classifyEconomicStatus', 'STATUS_META'],
  );
}

test('classifyEconomicStatus — EES/ERI tinggi, PEHS rendah: impactScore tinggi -> status risiko_tinggi', () => {
  const { classifyEconomicStatus } = load();
  const r = classifyEconomicStatus(100, 0, 100);
  assert.equal(r.status, 'risiko_tinggi');
  assert.equal(r.impactScore, 100);
});

test('classifyEconomicStatus — EES/ERI rendah, PEHS tinggi: impactScore rendah -> status normal', () => {
  const { classifyEconomicStatus } = load();
  const r = classifyEconomicStatus(0, 100, 0);
  assert.equal(r.status, 'normal');
  assert.equal(r.impactScore, 0);
});

test('classifyEconomicStatus — impactScore tepat di ambang 35/65: batas waspada terpenuhi dgn benar', () => {
  const { classifyEconomicStatus } = load();
  // EES=70,ERI=0,PEHS=0 -> impact = 70*0.5 = 35 -> masuk kategori waspada (>=35)
  const atLower = classifyEconomicStatus(70, 0, 0);
  assert.equal(atLower.impactScore, 35);
  assert.equal(atLower.status, 'waspada');

  // EES=130,ERI=0,PEHS=0 -> impact = clamp(65,0,100)=65 -> masuk risiko_tinggi (>=65)
  const atUpper = classifyEconomicStatus(130, 0, 0);
  assert.equal(atUpper.impactScore, 65);
  assert.equal(atUpper.status, 'risiko_tinggi');
});

test('classifyEconomicStatus — impactScore diclamp ke [0,100], tidak pernah negatif/lewat 100', () => {
  const { classifyEconomicStatus } = load();
  const negative = classifyEconomicStatus(0, 1000, 0); // PEHS ekstrem -> would-be negative
  assert.equal(negative.impactScore, 0);
  assert.equal(negative.status, 'normal');

  const over100 = classifyEconomicStatus(1000, 1000, 0);
  assert.equal(over100.impactScore, 100);
});

test('STATUS_META — 3 status (normal/waspada/risiko_tinggi) semuanya punya icon & label', () => {
  const { STATUS_META, classifyEconomicStatus } = load();
  for (const key of ['normal', 'waspada', 'risiko_tinggi']) {
    assert.ok(STATUS_META[key], `STATUS_META harus punya entri "${key}"`);
    assert.equal(typeof STATUS_META[key].icon, 'string');
    assert.equal(typeof STATUS_META[key].label, 'string');
  }
  // Konsistensi: setiap kemungkinan `status` hasil classifyEconomicStatus()
  // harus selalu ada padanannya di STATUS_META (tidak ada status yatim).
  const r = classifyEconomicStatus(50, 50, 50);
  assert.ok(STATUS_META[r.status]);
});
