'use strict';
// tests/chat-action.test.js — cakupan pertama untuk chat-action.js (61 baris,
// murni parsing/format blok [[ACTION]] dari balasan AI Chat, TIDAK menyentuh DOM).
// Sebelumnya nol test sama sekali (lihat FILE-MAP.md / audit "modul nol-test").
//
// Dipakai bareng format-tema.js (fmtFull ASLI, bukan stub) & helper-teks.js
// (escapeHtml ASLI) supaya format Rupiah & escaping yang dites benar-benar
// implementasi produksi, bukan re-implementasi manual di file test.
// CHAT_ACTION_HANDLERS/CHAT_ACTION_LABELS (didefinisikan di
// chat-action-handlers.js, tidak di-load di sini biar
// ringan) di-stub minimal via extraGlobals — cukup untuk menguji
// extractChatAction()/chatActionInnerHTML() yang cuma BACA kedua objek itu,
// tidak mengeksekusi handler-nya (itu ranah confirmChatAction, di luar
// cakupan file ini).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeChatAction(extraGlobals = {}) {
  const ctx = loadSource(
    ['modules/shared/format-tema.js', 'modules/shared/helper-teks.js', 'modules/ai/chat-action.js'],
    {
      CHAT_ACTION_LABELS: { add_transaksi: '💸 Usul: Tambah Transaksi' },
      CHAT_ACTION_HANDLERS: { add_transaksi: () => 'ok' },
      ...extraGlobals,
    },
    ['chatInited', '_pendingChatActions']
  );
  return ctx;
}

// ---------- chatActionSummary ----------
test('chatActionSummary — add_transaksi: format income vs expense + note opsional', () => {
  const ctx = makeChatAction();
  const income = ctx.chatActionSummary('add_transaksi', { type: 'income', amount: 50000, category: 'Gaji' });
  assert.equal(income, 'Pemasukan Rp 50.000 — Gaji');
  const expenseWithNote = ctx.chatActionSummary('add_transaksi', { type: 'expense', amount: 15000, category: 'Makan', note: 'nasi goreng' });
  assert.equal(expenseWithNote, 'Pengeluaran Rp 15.000 — Makan (nasi goreng)');
});

test('chatActionSummary — fallback kategori "Lainnya" kalau category kosong', () => {
  const ctx = makeChatAction();
  const s = ctx.chatActionSummary('add_transaksi', { type: 'expense', amount: 1000 });
  assert.equal(s, 'Pengeluaran Rp 1.000 — Lainnya');
});

test('chatActionSummary — add_tagihan', () => {
  const ctx = makeChatAction();
  const s = ctx.chatActionSummary('add_tagihan', { name: 'Listrik', amount: 200000, nextDue: '2026-08-01' });
  assert.equal(s, 'Listrik — Rp 200.000, jatuh tempo 2026-08-01');
});

test('chatActionSummary — add_tagihan fallback nama "Tagihan" kalau kosong', () => {
  const ctx = makeChatAction();
  const s = ctx.chatActionSummary('add_tagihan', { amount: 100000 });
  assert.equal(s, 'Tagihan — Rp 100.000, jatuh tempo -');
});

test('chatActionSummary — add_servis', () => {
  const ctx = makeChatAction();
  const s = ctx.chatActionSummary('add_servis', { item: 'Ganti Oli', vehicleName: 'Vario 125', cost: 75000 });
  assert.equal(s, 'Ganti Oli — Vario 125 — Rp 75.000');
});

test('chatActionSummary — add_target', () => {
  const ctx = makeChatAction();
  const s = ctx.chatActionSummary('add_target', { name: 'Dana Darurat', amount: 6000000 });
  assert.equal(s, 'Dana Darurat — target Rp 6.000.000');
});

test('chatActionSummary — add_catatan_anak (teks dibungkus tanda kutip)', () => {
  const ctx = makeChatAction();
  const s = ctx.chatActionSummary('add_catatan_anak', { text: 'mulai jalan' });
  assert.equal(s, '"mulai jalan"');
});

test('chatActionSummary — add_wishlist: label kebutuhan vs keinginan', () => {
  const ctx = makeChatAction();
  const kebutuhan = ctx.chatActionSummary('add_wishlist', { name: 'Sepatu Kerja', price: 300000, cat: 'kebutuhan' });
  assert.equal(kebutuhan, 'Sepatu Kerja — Rp 300.000 · 🛠️ Kebutuhan');
  const keinginan = ctx.chatActionSummary('add_wishlist', { name: 'Headset', price: 500000, cat: 'keinginan' });
  assert.equal(keinginan, 'Headset — Rp 500.000 · ✨ Keinginan');
});

test('chatActionSummary — type tak dikenal -> fallback JSON.stringify(data)', () => {
  const ctx = makeChatAction();
  const s = ctx.chatActionSummary('unknown_type', { foo: 'bar' });
  assert.equal(s, JSON.stringify({ foo: 'bar' }));
});

// ---------- extractChatAction ----------
test('extractChatAction — tidak ada blok [[ACTION]] -> action null, text apa adanya', () => {
  const ctx = makeChatAction();
  const r = ctx.extractChatAction('Halo, ini balasan biasa tanpa action.');
  assert.equal(r.action, null);
  assert.equal(r.actionError, false);
  assert.equal(r.text, 'Halo, ini balasan biasa tanpa action.');
});

test('extractChatAction — blok valid, type dikenal -> action terisi, blok dibuang dari text', () => {
  const ctx = makeChatAction();
  const reply = 'Oke, saya catat ya. [[ACTION]]{"type":"add_transaksi","data":{"amount":10000}}[[/ACTION]] Semoga membantu.';
  const r = ctx.extractChatAction(reply);
  assert.equal(r.actionError, false);
  assert.deepEqual(JSON.parse(JSON.stringify(r.action)), { type: 'add_transaksi', data: { amount: 10000 } });
  assert.equal(r.text, 'Oke, saya catat ya.  Semoga membantu.');
});

test('extractChatAction — JSON dalam blok rusak tapi bisa diperbaiki _repairLooseJson (single quote & trailing comma)', () => {
  const ctx = makeChatAction();
  const reply = "[[ACTION]]{type:'add_transaksi',data:{amount:5000,}}[[/ACTION]]";
  const r = ctx.extractChatAction(reply);
  assert.equal(r.actionError, false);
  assert.ok(r.action);
  assert.equal(r.action.type, 'add_transaksi');
  assert.equal(r.action.data.amount, 5000);
});

test('extractChatAction — JSON benar-benar rusak (tidak bisa diperbaiki) -> actionError true, action null', () => {
  const ctx = makeChatAction();
  const reply = '[[ACTION]]{{{{ bukan json sama sekali [[/ACTION]]';
  const r = ctx.extractChatAction(reply);
  assert.equal(r.actionError, true);
  assert.equal(r.action, null);
});

test('extractChatAction — type di luar CHAT_ACTION_HANDLERS -> actionError true, action null', () => {
  const ctx = makeChatAction();
  const reply = '[[ACTION]]{"type":"add_hal_asing","data":{}}[[/ACTION]]';
  const r = ctx.extractChatAction(reply);
  assert.equal(r.actionError, true);
  assert.equal(r.action, null);
});

test('extractChatAction — "data" bukan objek (mis. string) -> actionError true', () => {
  const ctx = makeChatAction();
  const reply = '[[ACTION]]{"type":"add_transaksi","data":"bukan objek"}[[/ACTION]]';
  const r = ctx.extractChatAction(reply);
  assert.equal(r.actionError, true);
  assert.equal(r.action, null);
});

test('extractChatAction — field "data" tidak ada sama sekali -> actionError true', () => {
  const ctx = makeChatAction();
  const reply = '[[ACTION]]{"type":"add_transaksi"}[[/ACTION]]';
  const r = ctx.extractChatAction(reply);
  assert.equal(r.actionError, true);
});

// ---------- _repairLooseJson ----------
test('_repairLooseJson — smart quotes dinormalisasi ke quote biasa', () => {
  const ctx = makeChatAction();
  const fixed = ctx._repairLooseJson('{\u201Ctype\u201D:\u2018add_transaksi\u2019}');
  assert.equal(JSON.parse(fixed).type, 'add_transaksi');
});

test('_repairLooseJson — trailing comma sebelum } atau ] dibuang', () => {
  const ctx = makeChatAction();
  const fixed = ctx._repairLooseJson('{"a":1,"b":[1,2,],}');
  assert.doesNotThrow(() => JSON.parse(fixed));
  assert.deepEqual(JSON.parse(fixed), { a: 1, b: [1, 2] });
});

test('_repairLooseJson — key tanpa quote dikasih quote', () => {
  const ctx = makeChatAction();
  const fixed = ctx._repairLooseJson('{type:"add_transaksi",amount:5000}');
  assert.deepEqual(JSON.parse(fixed), { type: 'add_transaksi', amount: 5000 });
});

// ---------- chatActionInnerHTML ----------
test('chatActionInnerHTML — label dari CHAT_ACTION_LABELS, ringkasan di-escape, 3 tombol dgn data-args', () => {
  const ctx = makeChatAction();
  const html = ctx.chatActionInnerHTML('act1', 'add_transaksi', { type: 'expense', amount: 1000, category: '<b>X</b>' });
  assert.ok(html.includes('💸 Usul: Tambah Transaksi'));
  assert.ok(!html.includes('<b>X</b>'), 'kategori mengandung HTML mentah harus di-escape');
  assert.ok(html.includes('&lt;b&gt;X&lt;/b&gt;'));
  assert.ok(html.includes('data-action="confirmChatAction"'));
  assert.ok(html.includes('data-action="editChatAction"'));
  assert.ok(html.includes('data-action="cancelChatAction"'));
  assert.ok(html.includes(JSON.stringify(['act1']).replace(/"/g, '&quot;')));
});

test('chatActionInnerHTML — label fallback "Usul Aksi" kalau type tidak ada di CHAT_ACTION_LABELS', () => {
  const ctx = makeChatAction();
  const html = ctx.chatActionInnerHTML('act2', 'type_asing', { amount: 1 });
  assert.ok(html.includes('Usul Aksi'));
});
