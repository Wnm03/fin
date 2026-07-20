'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');
const { createFakeDocument } = require('../helpers/fakeDom');

// dashboard-hub-favorit-view.js — render + toggle (Tahap 3, Langkah 7-8).
// Dites dgn document tiruan sendiri (pola sama dgn tests/dashboard-hub.test.js)
// krn file ini baca/tulis DOM. FEATURE_REGISTRY di sini SENGAJA kecil/tiruan
// (pola sama dgn tests/dashboard-hub.test.js) supaya test tidak ikut berubah
// kalau taksonomi asli direvisi.

// plain() — konversi array/objek hasil sandbox vm (realm beda dari host,
// lihat catatan cross-realm di tests/helpers/loadSource.js) jadi struktur
// host biasa sebelum dibandingkan pakai assert.deepEqual.
function plain(x) { return JSON.parse(JSON.stringify(x)); }

function registry() {
  return [
    {
      key: 'ai', label: 'AI', icon: '🤖', desc: 'Asisten AI',
      target: { page: 'ai' }, // kategori DENGAN target -> boleh difavoritkan
      features: [
        { key: 'ai-chat', label: 'Chat AI', desc: 'Tanya jawab', target: { page: 'ai', tab: 'chat' } },
      ],
    },
    {
      key: 'personal', label: 'Personal', icon: '🌱', desc: 'desc',
      // TIDAK ada target -> tidak boleh muncul sbg kartu Favorit (§4.2)
      features: [
        { key: 'per-worthit', label: 'Worth It?', desc: 'Cek layak beli', target: { action: 'WorthIt.open' } },
      ],
    },
  ];
}

function makeView(favoritKeys, opts = {}) {
  const fakeDocument = createFakeDocument({
    dashHubFavoritSection: {},
    dashHubFavoritList: {},
  });
  // classList mulai kosong dari createFakeElement() — seed 'u-dnone' di sini
  // (bukan lewat initial map createFakeDocument, yang meng-overwrite objek
  // classList dgn array mentah, lihat tests/helpers/fakeDom.js) supaya
  // sesuai kondisi awal nyata di index.html (section#dashHubFavoritSection
  // ber-class u-dnone by default).
  const sectionClasses = opts.sectionClasses || ['u-dnone'];
  sectionClasses.forEach((c) => fakeDocument.getElementById('dashHubFavoritSection').classList.add(c));
  const favoritStore = { keys: favoritKeys.slice() };
  const DashboardHubFavorit = {
    getFavoritKeys: () => favoritStore.keys,
    toggleFavorit: (key) => {
      const idx = favoritStore.keys.indexOf(key);
      if (idx !== -1) favoritStore.keys.splice(idx, 1); else favoritStore.keys.push(key);
    },
  };
  const ctx = loadSource(['modules/dashboard-hub/dashboard-hub-favorit-view.js'], {
    document: fakeDocument,
    FEATURE_REGISTRY: registry(),
    DashboardHubFavorit,
    escapeHtml: (s) => String(s === null || s === undefined ? '' : s),
    window: opts.window || {},
  }, ['DashboardHubFavoritView', 'resolveFavoritEntries']);
  return { ctx, fakeDocument, favoritStore, DashboardHubFavoritView: ctx.DashboardHubFavoritView };
}

test('resolveFavoritEntries() — favoritKeys kosong -> array kosong', () => {
  const { ctx } = makeView([]);
  assert.deepEqual(plain(ctx.resolveFavoritEntries([], registry())), []);
});

test('resolveFavoritEntries() — resolve kategori (dgn target) & fitur biasa', () => {
  const { ctx } = makeView([]);
  const entries = ctx.resolveFavoritEntries(['ai', 'ai-chat'], registry());
  assert.equal(entries.length, 2);
  assert.equal(entries[0].key, 'ai');
  assert.equal(entries[0].label, 'AI');
  assert.equal(entries[1].key, 'ai-chat');
  assert.equal(entries[1].label, 'Chat AI');
});

test('resolveFavoritEntries() — kategori TANPA target di-skip (§4.2), tidak error', () => {
  const { ctx } = makeView([]);
  const entries = ctx.resolveFavoritEntries(['personal'], registry());
  assert.deepEqual(plain(entries), []);
});

test('resolveFavoritEntries() — key basi (sudah dihapus dari registry) di-skip (§4.1 opsi A), tidak error', () => {
  const { ctx } = makeView([]);
  const entries = ctx.resolveFavoritEntries(['sudah-dihapus-developer'], registry());
  assert.deepEqual(plain(entries), []);
});

test('resolveFavoritEntries() — urutan hasil ikut urutan favoritKeys, BUKAN urutan registry (§4.4)', () => {
  const { ctx } = makeView([]);
  const entries = ctx.resolveFavoritEntries(['ai-chat', 'ai'], registry());
  assert.deepEqual(plain(entries.map((e) => e.key)), ['ai-chat', 'ai']);
});

test('resolveFavoritEntries() — TIDAK memutasi FEATURE_REGISTRY', () => {
  const { ctx } = makeView([]);
  const reg = registry();
  const before = JSON.stringify(reg);
  ctx.resolveFavoritEntries(['ai', 'ai-chat', 'personal', 'ga-ada'], reg);
  assert.equal(JSON.stringify(reg), before);
});

test('render() — favoritKeys kosong -> section disembunyikan (u-dnone) & list dikosongkan total, bukan cuma u-dnone', () => {
  const { DashboardHubFavoritView, fakeDocument } = makeView([], { sectionClasses: [] });
  DashboardHubFavoritView.render();
  const section = fakeDocument.getElementById('dashHubFavoritSection');
  const list = fakeDocument.getElementById('dashHubFavoritList');
  assert.equal(section.classList.contains('u-dnone'), true);
  assert.equal(list.innerHTML, '');
});

test('render() — ada favorit valid -> section muncul (u-dnone dilepas) & kartu terisi', () => {
  const { DashboardHubFavoritView, fakeDocument } = makeView(['ai-chat']);
  DashboardHubFavoritView.render();
  const section = fakeDocument.getElementById('dashHubFavoritSection');
  const list = fakeDocument.getElementById('dashHubFavoritList');
  assert.equal(section.classList.contains('u-dnone'), false);
  assert.match(list.innerHTML, /Chat AI/);
  assert.match(list.innerHTML, /data-action="DashboardHub\.open"/);
  assert.match(list.innerHTML, /data-args='\["ai-chat"\]'/);
});

test('render() — kartu Favorit membawa tombol \u2605 dgn data-action="DashboardHubFavoritView.toggle" + data-stop (ADR-001 §4: bukan executor kedua)', () => {
  const { DashboardHubFavoritView, fakeDocument } = makeView(['ai-chat']);
  DashboardHubFavoritView.render();
  const html = fakeDocument.getElementById('dashHubFavoritList').innerHTML;
  assert.match(html, /data-action="DashboardHubFavoritView\.toggle"/);
  assert.match(html, /data-stop/);
  assert.match(html, /is-fav/);
});

// BUGFIX (aksesibilitas): bintang favorit ini cuma berisi ikon ★, tanpa
// teks -- sebelumnya tidak punya aria-label, sehingga findMissingAriaLabels()
// (self-test.js) menandainya sbg pelanggaran ("screen
// reader tidak akan bisa menjelaskan fungsi tombol ini"). Fix: elemen
// .dashhub-fav-star di section Favorit sekarang selalu punya aria-label
// yang menyebutkan nama fiturnya.
test('render() — tombol \u2605 di section Favorit punya aria-label (aksesibilitas screen reader)', () => {
  const { DashboardHubFavoritView, fakeDocument } = makeView(['ai-chat']);
  DashboardHubFavoritView.render();
  const html = fakeDocument.getElementById('dashHubFavoritList').innerHTML;
  const starDiv = (html.match(/<div class="dashhub-fav-star[^>]*>/) || [])[0];
  assert.ok(starDiv, 'harus ada elemen .dashhub-fav-star di list');
  assert.match(starDiv, /aria-label="[^"]+"/);
  assert.match(starDiv, /Chat AI/);
});

test('render() — favoritKeys HANYA berisi key basi/kategori-tanpa-target -> hasil resolve kosong -> section tetap disembunyikan', () => {
  const { DashboardHubFavoritView, fakeDocument } = makeView(['personal', 'ga-ada']);
  DashboardHubFavoritView.render();
  const section = fakeDocument.getElementById('dashHubFavoritSection');
  assert.equal(section.classList.contains('u-dnone'), true);
});

test('render() tidak melempar exception kalau elemen section/list belum ada di DOM', () => {
  const fakeDocument = { getElementById: () => null };
  const ctx = loadSource(['modules/dashboard-hub/dashboard-hub-favorit-view.js'], {
    document: fakeDocument,
    FEATURE_REGISTRY: registry(),
    DashboardHubFavorit: { getFavoritKeys: () => ['ai-chat'], toggleFavorit: () => {} },
    escapeHtml: (s) => String(s),
    window: {},
  }, ['DashboardHubFavoritView']);
  assert.doesNotThrow(() => ctx.DashboardHubFavoritView.render());
});

test('toggle(key) — mendelegasikan ke DashboardHubFavorit.toggleFavorit(key), lalu render ulang section Favorit', () => {
  const { DashboardHubFavoritView, fakeDocument, favoritStore } = makeView([]);
  DashboardHubFavoritView.toggle('ai-chat');
  assert.deepEqual(favoritStore.keys, ['ai-chat']);
  assert.match(fakeDocument.getElementById('dashHubFavoritList').innerHTML, /Chat AI/);
});

test('toggle(key) dipanggil 2x pada key yang sama -> balik hapus, section kembali disembunyikan', () => {
  const { DashboardHubFavoritView, fakeDocument } = makeView([]);
  DashboardHubFavoritView.toggle('ai-chat');
  DashboardHubFavoritView.toggle('ai-chat');
  const section = fakeDocument.getElementById('dashHubFavoritSection');
  assert.equal(section.classList.contains('u-dnone'), true);
});

test('window.DashboardHubFavoritView TIDAK punya method open/launch/navigate (guard executor kedua, ADR-001 §4)', () => {
  const { ctx } = makeView([]);
  assert.equal(ctx.window.DashboardHubFavoritView.open, undefined);
  assert.equal(ctx.window.DashboardHubFavoritView.launch, undefined);
  assert.equal(ctx.window.DashboardHubFavoritView.navigate, undefined);
  assert.equal(typeof ctx.window.DashboardHubFavoritView.render, 'function');
  assert.equal(typeof ctx.window.DashboardHubFavoritView.toggle, 'function');
});
