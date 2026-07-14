'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const ctx = loadSource(['helper-teks.js'], {}, ['MONTHS', 'MONTHS_FULL']);

test('escapeHtml — meng-escape 5 karakter berbahaya', () => {
  assert.equal(
    ctx.escapeHtml(`<script>alert('x')&"y"</script>`),
    '&lt;script&gt;alert(&#39;x&#39;)&amp;&quot;y&quot;&lt;/script&gt;'
  );
});

test('escapeHtml — null/undefined jadi string kosong (bukan "null"/"undefined")', () => {
  assert.equal(ctx.escapeHtml(null), '');
  assert.equal(ctx.escapeHtml(undefined), '');
});

test('escapeHtml — angka/boolean dikonversi ke string dulu', () => {
  assert.equal(ctx.escapeHtml(123), '123');
  assert.equal(ctx.escapeHtml(false), 'false');
});

test('escapeHtml — string tanpa karakter spesial tidak berubah', () => {
  assert.equal(ctx.escapeHtml('nama pelanggan biasa'), 'nama pelanggan biasa');
});

test('dateToISO — format YYYY-MM-DD dengan padding 2 digit', () => {
  assert.equal(ctx.dateToISO(new Date(2026, 0, 5)), '2026-01-05'); // 5 Jan
  assert.equal(ctx.dateToISO(new Date(2026, 11, 31)), '2026-12-31'); // 31 Des
});

test('MONTHS / MONTHS_FULL — 12 bulan, konsisten urutan', () => {
  assert.equal(ctx.MONTHS.length, 12);
  assert.equal(ctx.MONTHS_FULL.length, 12);
  assert.equal(ctx.MONTHS[0], 'Jan');
  assert.equal(ctx.MONTHS_FULL[0], 'Januari');
  assert.equal(ctx.MONTHS[9], 'Okt');
  assert.equal(ctx.MONTHS_FULL[9], 'Oktober');
});
