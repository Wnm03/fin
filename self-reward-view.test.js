'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');
const { createFakeDocument, createFakeElement } = require('../helpers/fakeDom');

// self-reward-view.js — UI layer utk self-reward-engine.js (logic TETAP murni,
// tidak disentuh/dites ulang di sini — sudah dites tersendiri di
// tests/self-reward-engine.test.js). Dua kelompok test, pola sama dgn
// tests/dashboard-hub-favorit-view.test.js:
//   1. Fungsi builder MURNI (buildEvaluationView/buildSettingsFormHtml/
//      buildModalBodyHtml) — loadSource() biasa, tanpa DOM.
//   2. SelfRewardView.render()/saveSettingsFromForm() (baca/tulis DOM) —
//      pakai fakeDom (getElementById-based). ensureMounted()/open() yang
//      butuh document.createElement/document.body SUNGGUHAN sengaja TIDAK
//      dites lewat harness ini (di luar cakupannya, sama seperti disclaimer
//      di tests/helpers/loadSource.js) — cukup diverifikasi lewat guard
//      "tidak melempar error kalau createElement tidak tersedia".

function eligibleResult() {
  return {
    eligible: true,
    reasons: [
      { key: 'budgetAman', label: 'Budget aman', ok: true },
      { key: 'cashflowPositif', label: 'Cashflow positif', ok: true },
    ],
    rewardLevel: 2,
    maxReward: 250000,
    surplus: 5000000,
    score: 110,
  };
}
function notEligibleResult() {
  return {
    eligible: false,
    reasons: [
      { key: 'budgetAman', label: 'Budget aman', ok: false },
      { key: 'cashflowPositif', label: 'Cashflow positif', ok: true },
    ],
    priorities: ['Budget aman'],
  };
}
function settingsObj(patch) {
  return Object.assign({ level1Pct: 2, level2Pct: 5, level3Pct: 10, graceDaysUtang: 0, graceDaysTagihan: 0 }, patch);
}

function ctx(extraGlobals = {}) {
  return loadSource(['modules/self-reward/self-reward-view.js'], extraGlobals, [
    'SelfRewardView',
    'buildEvaluationView',
    'buildSettingsFormHtml',
    'buildModalBodyHtml',
    'SELF_REWARD_LEVEL_LABEL',
  ]);
}

// ---------- buildEvaluationView (murni) ----------

test('buildEvaluationView — eligible: status/level/maxReward/surplus terformat, priorities kosong', () => {
  const { buildEvaluationView } = ctx({ fmt: (n) => 'Rp ' + n });
  const v = buildEvaluationView(eligibleResult());
  assert.equal(v.eligible, true);
  assert.equal(v.statusIcon, '🎉');
  assert.match(v.statusTitle, /Eligible/);
  assert.equal(v.levelLabel, 'Level 2 — Sehat');
  assert.equal(v.maxRewardFormatted, 'Rp 250000');
  assert.equal(v.surplusFormatted, 'Rp 5000000');
  assert.equal(v.priorities.length, 0);
  assert.equal(v.reasons.length, 2);
  assert.equal(v.reasons[0].icon, '✅');
});

test('buildEvaluationView — not eligible: priorities terisi, level/maxReward null, reasons campur ✅/❌', () => {
  const { buildEvaluationView } = ctx({ fmt: (n) => 'Rp ' + n });
  const v = buildEvaluationView(notEligibleResult());
  assert.equal(v.eligible, false);
  assert.equal(v.statusIcon, '🚫');
  assert.match(v.statusTitle, /Belum Layak/);
  assert.deepEqual(v.priorities, ['Budget aman']);
  assert.equal(v.levelLabel, null);
  assert.equal(v.maxRewardFormatted, null);
  assert.equal(v.reasons[0].icon, '❌');
  assert.equal(v.reasons[1].icon, '✅');
});

test('buildEvaluationView — fmt tidak tersedia, fallback ke format Rp bawaan', () => {
  const { buildEvaluationView } = ctx({});
  const v = buildEvaluationView(eligibleResult());
  assert.match(v.maxRewardFormatted, /^Rp /);
});

// ---------- buildSettingsFormHtml (murni) ----------

test('buildSettingsFormHtml — pre-fill value sesuai settings, id field sesuai kontrak saveSettingsFromForm', () => {
  const { buildSettingsFormHtml } = ctx({});
  const html = buildSettingsFormHtml(settingsObj({ level1Pct: 3, graceDaysUtang: 2 }));
  assert.match(html, /id="srLevel1Pct"[^>]*value="3"/);
  assert.match(html, /id="srLevel2Pct"[^>]*value="5"/);
  assert.match(html, /id="srGraceUtang"[^>]*value="2"/);
  assert.match(html, /data-action="SelfRewardView.saveSettingsFromForm"/);
});

// ---------- buildModalBodyHtml (murni) ----------

test('buildModalBodyHtml — eligible: menampilkan level & maksimum reward, TIDAK menampilkan blok prioritas', () => {
  const { buildModalBodyHtml } = ctx({ fmt: (n) => 'Rp ' + n, escapeHtml: (s) => s });
  const html = buildModalBodyHtml(eligibleResult(), settingsObj());
  assert.match(html, /Eligible — Kamu Layak Self Reward!/);
  assert.match(html, /Level 2 — Sehat/);
  assert.match(html, /Rp 250000/);
  assert.doesNotMatch(html, /Prioritas yang Harus Diselesaikan/);
  assert.match(html, /Budget aman/);
  assert.match(html, /srLevel1Pct/); // form pengaturan ikut dirender
});

test('buildModalBodyHtml — not eligible: menampilkan blok prioritas, TIDAK menampilkan nominal reward', () => {
  const { buildModalBodyHtml } = ctx({ fmt: (n) => 'Rp ' + n, escapeHtml: (s) => s });
  const html = buildModalBodyHtml(notEligibleResult(), settingsObj());
  assert.match(html, /Belum Layak Self Reward/);
  assert.match(html, /Prioritas yang Harus Diselesaikan/);
  assert.doesNotMatch(html, /Maksimum reward/);
});

// ---------- SelfRewardView (DOM, via fakeDom) ----------

function makeView({ evaluate, settings, saveSettings } = {}) {
  const fakeDocument = createFakeDocument({
    selfRewardModalBody: {},
    srLevel1Pct: { value: '4' },
    srLevel2Pct: { value: '8' },
    srLevel3Pct: { value: '15' },
    srGraceUtang: { value: '3' },
    srGraceTagihan: { value: '1' },
  });
  const saveCalls = [];
  const toastCalls = [];
  const openModalCalls = [];
  const SelfReward = {
    evaluate: evaluate || (() => eligibleResult()),
    getSettings: settings || (() => settingsObj()),
    saveSettings: saveSettings || ((partial) => { saveCalls.push(partial); }),
  };
  const extraGlobals = {
    document: fakeDocument,
    SelfReward,
    fmt: (n) => 'Rp ' + n,
    escapeHtml: (s) => String(s),
    toast: (...args) => toastCalls.push(args),
    openModal: (...args) => openModalCalls.push(args),
    closeModal: () => {},
  };
  const c = ctx(extraGlobals);
  return { view: c.SelfRewardView, fakeDocument, saveCalls, toastCalls, openModalCalls };
}

test('render() — menulis hasil evaluate()/getSettings() ke #selfRewardModalBody', () => {
  const { view, fakeDocument } = makeView({ evaluate: () => eligibleResult() });
  view.render();
  const body = fakeDocument.getElementById('selfRewardModalBody');
  assert.match(body.innerHTML, /Eligible — Kamu Layak Self Reward!/);
  assert.match(body.innerHTML, /Rp 250000/);
});

test('render() — tidak melempar error kalau SelfReward belum ter-load', () => {
  const fakeDocument = createFakeDocument({ selfRewardModalBody: {} });
  const c = ctx({ document: fakeDocument });
  assert.doesNotThrow(() => c.SelfRewardView.render());
});

test('saveSettingsFromForm() — baca nilai form via getElementById, delegasi ke SelfReward.saveSettings(), lalu re-render & toast', () => {
  const { view, saveCalls, toastCalls, fakeDocument } = makeView({ evaluate: () => eligibleResult() });
  view.saveSettingsFromForm();
  assert.equal(saveCalls.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(saveCalls[0])), { level1Pct: 4, level2Pct: 8, level3Pct: 15, graceDaysUtang: 3, graceDaysTagihan: 1 });
  assert.equal(toastCalls.length, 1);
  // re-render terpanggil -> body terisi lagi (bukan kosong)
  assert.ok(fakeDocument.getElementById('selfRewardModalBody').innerHTML.length > 0);
});

test('saveSettingsFromForm() — nilai input tidak valid (NaN) fallback ke setting yang lama', () => {
  const fakeDocument = createFakeDocument({
    selfRewardModalBody: {},
    srLevel1Pct: { value: 'abc' }, // tidak valid
    srLevel2Pct: { value: '9' },
    srLevel3Pct: { value: '20' },
    srGraceUtang: { value: '0' },
    srGraceTagihan: { value: '0' },
  });
  const saveCalls = [];
  const SelfReward = {
    evaluate: () => eligibleResult(),
    getSettings: () => settingsObj({ level1Pct: 2 }),
    saveSettings: (partial) => saveCalls.push(partial),
  };
  const c = ctx({ document: fakeDocument, SelfReward, fmt: (n) => 'Rp ' + n, escapeHtml: (s) => s });
  c.SelfRewardView.saveSettingsFromForm();
  assert.equal(saveCalls[0].level1Pct, 2); // fallback ke current, bukan NaN
  assert.equal(saveCalls[0].level2Pct, 9);
});

test('open() — TIDAK melempar error walau document.createElement tidak tersedia (fakeDom minimal)', () => {
  const { view, openModalCalls } = makeView({ evaluate: () => eligibleResult() });
  assert.doesNotThrow(() => view.open());
  assert.equal(openModalCalls.length, 1);
  assert.deepEqual(openModalCalls[0], ['selfRewardModal']);
});

// ---------- Mount (DOM sungguhan via stub createElement/body minimal) ----------

test('ensureMounted() — menempel elemen #selfRewardModal ke document.body sekali (idempoten)', () => {
  const appended = [];
  const fakeBody = { appendChild: (el) => appended.push(el) };
  const registered = new Map();
  const fakeDocument = {
    createElement: () => createFakeElement(),
    getElementById: (id) => registered.get(id) || null,
    body: fakeBody,
  };
  const c = ctx({ document: fakeDocument });
  c.SelfRewardView.ensureMounted();
  assert.equal(appended.length, 1);
  assert.equal(appended[0].id, 'selfRewardModal');
  assert.equal(appended[0].className, 'overlay');
  assert.match(appended[0].innerHTML, /selfRewardModalBody/);
  // panggil lagi -> tidak menempel elemen kedua kalinya
  c.SelfRewardView.ensureMounted();
  assert.equal(appended.length, 1);
});
