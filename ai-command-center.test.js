'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// ai-command-center.js — Sprint 3 Tahap 3.1 (AI Command Center Foundation).
// Murni registry logic (tidak ada DOM), jadi cukup loadSource biasa +
// `expose` utk ambil binding `const AICommandCenter` dari sandbox (file ini
// TIDAK deklarasi lewat `function`, jadi tidak otomatis nempel ke context
// vm — lihat catatan di tests/helpers/loadSource.js).
//
// Setiap test load ulang source dari nol (loadSource dipanggil per-test,
// bukan sekali di scope module) supaya registry `_commands` selalu mulai
// kosong & test tidak saling bocor state satu sama lain — TIDAK
// mengandalkan clear() sebagai satu-satunya isolasi.

// plain() — konversi hasil sandbox vm (realm beda dari host, lihat catatan
// cross-realm di tests/helpers/loadSource.js) jadi struktur host biasa
// sebelum dibandingkan pakai assert.deepEqual (pola sama dgn
// tests/dashboard-hub-favorit-view.test.js).
function plain(x) { return JSON.parse(JSON.stringify(x)); }

function freshCenter() {
  const ctx = loadSource(['ai-command-center.js'], {}, ['AICommandCenter']);
  return ctx.AICommandCenter;
}

test('registry AICommandCenter kosong di awal (Foundation tidak mendaftarkan command bawaan apa pun)', () => {
  const center = freshCenter();
  assert.deepEqual(plain(center.getCommands()), []);
});

test('registerCommand: berhasil mendaftarkan command valid, muncul di getCommands()', () => {
  const center = freshCenter();
  const ok = center.registerCommand({ id: 'cmd-a', label: 'Command A', run: () => 'hasil-a' });
  assert.equal(ok, true);
  const list = center.getCommands();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 'cmd-a');
  assert.equal(list[0].label, 'Command A');
  assert.equal(list[0].description, ''); // default
  assert.equal(list[0].category, 'general'); // default
});

test('registerCommand: description & category custom tersimpan apa adanya', () => {
  const center = freshCenter();
  center.registerCommand({
    id: 'cmd-b', label: 'Command B', description: 'Deskripsi B', category: 'zakat', run: () => {},
  });
  const cmd = center.getCommand('cmd-b');
  assert.equal(cmd.description, 'Deskripsi B');
  assert.equal(cmd.category, 'zakat');
});

test('registerCommand: id duplikat ditolak (silent, return false), entry pertama tetap utuh', () => {
  const center = freshCenter();
  assert.equal(center.registerCommand({ id: 'dup', label: 'Pertama', run: () => 1 }), true);
  assert.equal(center.registerCommand({ id: 'dup', label: 'Kedua', run: () => 2 }), false);
  const list = center.getCommands();
  assert.equal(list.length, 1);
  assert.equal(list[0].label, 'Pertama');
});

test('registerCommand: menolak input tidak valid (id kosong, label kosong, run bukan function, cmd null)', () => {
  const center = freshCenter();
  assert.equal(center.registerCommand(null), false);
  assert.equal(center.registerCommand({ label: 'Tanpa id', run: () => {} }), false);
  assert.equal(center.registerCommand({ id: 'no-label', run: () => {} }), false);
  assert.equal(center.registerCommand({ id: 'no-run', label: 'Tanpa run' }), false);
  assert.equal(center.registerCommand({ id: '   ', label: 'id kosong setelah trim', run: () => {} }), false);
  assert.deepEqual(plain(center.getCommands()), []);
});

test('getCommand: id tidak ditemukan -> null', () => {
  const center = freshCenter();
  assert.equal(center.getCommand('tidak-ada'), null);
});

test('getCommands()/getCommand() mengembalikan copy, bukan referensi internal (tidak bisa dimutasi dari luar)', () => {
  const center = freshCenter();
  center.registerCommand({ id: 'cmd-c', label: 'Command C', run: () => {} });
  const list = center.getCommands();
  list[0].label = 'DIUBAH DARI LUAR';
  list.push({ id: 'injeksi', label: 'x', run: () => {} });
  assert.equal(center.getCommands().length, 1);
  assert.equal(center.getCommand('cmd-c').label, 'Command C');
});

test('unregisterCommand: menghapus command yang ada -> true, hilang dari getCommands()', () => {
  const center = freshCenter();
  center.registerCommand({ id: 'cmd-d', label: 'Command D', run: () => {} });
  assert.equal(center.unregisterCommand('cmd-d'), true);
  assert.deepEqual(plain(center.getCommands()), []);
});

test('unregisterCommand: id tidak ada -> false, registry tidak berubah', () => {
  const center = freshCenter();
  center.registerCommand({ id: 'cmd-e', label: 'Command E', run: () => {} });
  assert.equal(center.unregisterCommand('tidak-ada'), false);
  assert.equal(center.getCommands().length, 1);
});

test('execute: command ditemukan & run() sukses -> { ok:true, result }, argumen diteruskan apa adanya', () => {
  const center = freshCenter();
  center.registerCommand({ id: 'sum', label: 'Sum', run: (a, b) => a + b });
  const out = center.execute('sum', 2, 3);
  assert.deepEqual(plain(out), { ok: true, result: 5 });
});

test('execute: id tidak ditemukan -> { ok:false, error: "not_found" }', () => {
  const center = freshCenter();
  const out = center.execute('tidak-ada');
  assert.deepEqual(plain(out), { ok: false, error: 'not_found' });
});

test('execute: run() melempar exception -> ditangkap, { ok:false, error: message }, tidak throw ke pemanggil', () => {
  const center = freshCenter();
  center.registerCommand({
    id: 'boom', label: 'Boom', run: () => { throw new Error('sengaja gagal'); },
  });
  const out = center.execute('boom');
  assert.equal(out.ok, false);
  assert.equal(out.error, 'sengaja gagal');
});

test('clear(): mengosongkan seluruh registry', () => {
  const center = freshCenter();
  center.registerCommand({ id: 'cmd-f', label: 'Command F', run: () => {} });
  center.registerCommand({ id: 'cmd-g', label: 'Command G', run: () => {} });
  center.clear();
  assert.deepEqual(plain(center.getCommands()), []);
});

test('AICommandCenter TIDAK menyentuh FEATURE_REGISTRY (independen, tidak membaca global itu sama sekali)', () => {
  const ctx = loadSource(['ai-command-center.js'], { FEATURE_REGISTRY: undefined }, ['AICommandCenter']);
  // Loading tidak error meski FEATURE_REGISTRY undefined -> file ini
  // benar-benar tidak bergantung padanya (beda dari modul yang konsumsi
  // FEATURE_REGISTRY, mis. dashboard-hub-favorit-view.js).
  assert.equal(typeof ctx.AICommandCenter.registerCommand, 'function');
});
