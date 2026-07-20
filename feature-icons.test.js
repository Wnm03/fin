'use strict';
// tests/feature-icons.test.js — cakupan pertama untuk feature-icons.js (murni
// lookup emoji->SVG, tidak menyentuh DOM). Sebelumnya nol test sama sekali.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');

function makeFeatureIcons() {
  return loadSource(['modules/shared/feature-icons.js'], {}, ['FeatureIcons']);
}

test('FeatureIcons.svg — emoji yang ada di _MAP menghasilkan markup <svg> dengan inner path benar', () => {
  const ctx = makeFeatureIcons();
  const svg = ctx.FeatureIcons.svg('🏠');
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.endsWith('</svg>'));
  assert.ok(svg.includes('M3 11l9-8 9 8'));
  assert.ok(svg.includes('viewBox="0 0 24 24"'));
  assert.ok(svg.includes('stroke="currentColor"'));
  assert.ok(svg.includes('fill="none"'));
  assert.ok(svg.includes('aria-hidden="true"'));
  assert.ok(svg.includes('focusable="false"'));
});

test('FeatureIcons.svg — emoji yang TIDAK ada di _MAP -> null (bukan string kosong/error)', () => {
  const ctx = makeFeatureIcons();
  assert.equal(ctx.FeatureIcons.svg('🦄'), null);
  assert.equal(ctx.FeatureIcons.svg(''), null);
  assert.equal(ctx.FeatureIcons.svg(undefined), null);
});

test('FeatureIcons.svg — default size 20 kalau opts tidak diberikan', () => {
  const ctx = makeFeatureIcons();
  const svg = ctx.FeatureIcons.svg('🏠');
  assert.ok(svg.includes('width="20"'));
  assert.ok(svg.includes('height="20"'));
});

test('FeatureIcons.svg — size custom dari opts.size dipakai di width & height', () => {
  const ctx = makeFeatureIcons();
  const svg = ctx.FeatureIcons.svg('🏠', { size: 32 });
  assert.ok(svg.includes('width="32"'));
  assert.ok(svg.includes('height="32"'));
});

test('FeatureIcons.svg — opts diberikan tapi tanpa size -> tetap fallback ke 20', () => {
  const ctx = makeFeatureIcons();
  const svg = ctx.FeatureIcons.svg('🏠', {});
  assert.ok(svg.includes('width="20"'));
});

test('FeatureIcons.render — emoji dengan mapping -> hasil sama persis dengan svg()', () => {
  const ctx = makeFeatureIcons();
  assert.equal(ctx.FeatureIcons.render('🚗', { size: 24 }), ctx.FeatureIcons.svg('🚗', { size: 24 }));
});

test('FeatureIcons.render — emoji TANPA mapping -> fallback ke emoji itu sendiri apa adanya', () => {
  const ctx = makeFeatureIcons();
  assert.equal(ctx.FeatureIcons.render('🦄'), '🦄');
});

test('FeatureIcons.render — emoji kosong/undefined -> fallback string kosong (tidak pernah throw/undefined literal)', () => {
  const ctx = makeFeatureIcons();
  assert.equal(ctx.FeatureIcons.render(''), '');
  assert.equal(ctx.FeatureIcons.render(undefined), '');
  assert.equal(ctx.FeatureIcons.render(null), '');
});

test('FeatureIcons._MAP — semua entry punya markup path/circle/rect/ellipse non-kosong (sanity data)', () => {
  const ctx = makeFeatureIcons();
  const map = ctx.FeatureIcons._MAP;
  const keys = Object.keys(map);
  assert.ok(keys.length > 10, 'harus ada cukup banyak emoji yang dipetakan');
  for (const k of keys) {
    const v = map[k];
    assert.equal(typeof v, 'string');
    assert.ok(v.length > 0, `mapping untuk ${k} tidak boleh kosong`);
    assert.ok(/<(path|circle|rect|ellipse)/.test(v), `mapping untuk ${k} harus mengandung elemen SVG dasar`);
  }
});

test('FeatureIcons.svg — setiap emoji di _MAP bisa dirender jadi svg valid tanpa error (loop semua entry)', () => {
  const ctx = makeFeatureIcons();
  const map = ctx.FeatureIcons._MAP;
  for (const emoji of Object.keys(map)) {
    const svg = ctx.FeatureIcons.svg(emoji);
    assert.ok(svg && svg.startsWith('<svg') && svg.endsWith('</svg>'), `emoji ${emoji} harus hasilkan svg valid`);
  }
});
