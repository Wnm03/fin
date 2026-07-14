'use strict';
/**
 * fakeDom.js — document.getElementById()/querySelectorAll() palsu buat nge-tes
 * fungsi kalkulator yang baca input & tulis hasil langsung ke elemen DOM
 * (bukan return value murni), misal calcGaji() di gaji-calc.js, PBB.hitung()
 * di pajak-pbb-zakat.js, atau FI.renderCatOptions()/FI.saveSettings() di
 * modules-calc.js.
 *
 * PENTING soal kenapa ini AMAN dipakai bareng loadSource() (vm context):
 * objek yang di-return di sini dibuat di LUAR vm context (host Node biasa),
 * lalu di-passing MASUK sebagai `document` lewat extraGlobals. Kode di
 * dalam vm yang manggil `document.getElementById(id).textContent = ...`
 * benar-benar menulis ke objek host ini (referensi objek, bukan disalin
 * masuk sandbox) — jadi setelah manggil fungsi yang dites, baca langsung
 * `fakeDocument.getElementById('someId').textContent` di luar vm untuk
 * verifikasi, TANPA perlu trik "expose" (yang cuma cocok buat baca
 * function/const top-level, bukan buat baca hasil tulis ke variabel primitif
 * yang di-reassign di dalam vm context — lihat catatan di loadSource.js).
 *
 * querySelectorAll DI SINI BUKAN mesin CSS selector asli (fakeDom ini
 * SENGAJA tidak mem-parsing HTML/innerHTML jadi elemen beneran — lihat
 * catatan di loadSource.js soal batasan yang disengaja). Sebagai gantinya,
 * test yang butuh querySelectorAll("...") HARUS registrasi manual: elemen apa
 * saja yang "match" selector itu, lewat parameter `queryGroups` di
 * createFakeDocument(initial, queryGroups). Ini cukup buat nge-tes method FI
 * yang manggil document.querySelectorAll('.fiCatChk') dst — TIDAK cukup
 * (dan tidak dimaksudkan) buat verifikasi hasil innerHTML di-render jadi DOM
 * beneran; itu di luar cakupan harness ini, cek innerHTML sbg string kalau
 * perlu.
 * Satu pengecualian selector yang DIPAHAMI otomatis (tanpa perlu didaftarkan
 * terpisah): akhiran pseudo-class ":checked" pada key yang sudah didaftarkan
 * — mis. daftarkan '.fiCatChk', lalu '.fiCatChk:checked' otomatis jadi
 * filter live `.checked===true` dari group yang sama (samsis dgn
 * getSelectedCatIds() yang query '.fiCatChk:checked').
 */
function createFakeElement(initial = {}) {
  const { classList: initialClassList, ...rest } = initial;
  const classes = new Set(Array.isArray(initialClassList) ? initialClassList : []);
  return {
    value: '',
    textContent: '',
    innerHTML: '',
    disabled: false,
    checked: false,
    style: {},
    dataset: {},
    classList: {
      add: (...names) => { names.forEach((n) => classes.add(n)); },
      remove: (...names) => { names.forEach((n) => classes.delete(n)); },
      toggle(name, force) {
        const has = classes.has(name);
        const want = force === undefined ? !has : !!force;
        if (want) classes.add(name); else classes.delete(name);
        return want;
      },
      contains: (name) => classes.has(name),
    },
    matches() { return false; },
    focus() {},
    click() {},
    ...rest,
  };
}

function createFakeDocument(initial = {}, queryGroups = {}) {
  const els = new Map();
  function ensure(id) {
    if (!els.has(id)) {
      els.set(id, createFakeElement());
    }
    return els.get(id);
  }
  for (const [id, val] of Object.entries(initial)) {
    Object.assign(ensure(id), val);
  }

  function querySelectorAll(selector) {
    if (queryGroups[selector]) return queryGroups[selector];
    const CHECKED_SUFFIX = ':checked';
    if (selector.endsWith(CHECKED_SUFFIX)) {
      const base = selector.slice(0, -CHECKED_SUFFIX.length);
      if (queryGroups[base]) return queryGroups[base].filter((el) => el.checked);
    }
    return [];
  }

  return {
    getElementById: (id) => ensure(id),
    querySelectorAll,
    querySelector: (selector) => querySelectorAll(selector)[0] || null,
  };
}

module.exports = { createFakeDocument, createFakeElement };
