'use strict';
// tests/ai-service-wireevents.test.js — modules/ai/ai-service.js
// AIService.wireEvents() (Sesi 6/6 Smart Delivery Engine). Memastikan
// event bisnis ('finance.updated' dkk) yang di-emit lewat AIBus benar-benar
// memicu AIDecision.decide() lewat facade AIService, dan wireEvents()
// idempotent (subscribe cuma sekali walau dipanggil berkali-kali).
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function loadService() {
  const fakeIDBStore = {
    async get() { return null; },
    async set() { return true; },
  };
  const ctx = loadSource(
    [
      'modules/ai/ai-core.js',
      'modules/ai/ai-decision-engine.js',
      'modules/ai/ai-service.js',
    ],
    { IDBStore: fakeIDBStore, D: { some: 'thing' } },
    ['AIService', 'AIDecision', 'AIBus'],
  );
  return ctx;
}

test('wireEvents() memicu AIDecision.decide() saat AIBus.emit event bisnis', async () => {
  const ctx = loadService();
  const decideCalls = [];
  const originalDecide = ctx.AIDecision.decide.bind(ctx.AIDecision);
  ctx.AIDecision.decide = async (arg) => {
    decideCalls.push(arg);
    return originalDecide(arg);
  };

  ctx.AIService.wireEvents();
  ctx.AIBus.emit('finance.updated', { category: 'Makan' });
  // decide() async — beri kesempatan microtask queue jalan.
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(decideCalls.length, 1);
  assert.equal(decideCalls[0].event, 'finance.updated');
  assert.deepEqual(decideCalls[0].payload, { category: 'Makan' });
});

test('wireEvents() idempotent — panggil 2x tidak dobel-subscribe', async () => {
  const ctx = loadService();
  const decideCalls = [];
  const originalDecide = ctx.AIDecision.decide.bind(ctx.AIDecision);
  ctx.AIDecision.decide = async (arg) => {
    decideCalls.push(arg);
    return originalDecide(arg);
  };

  ctx.AIService.wireEvents();
  ctx.AIService.wireEvents();
  ctx.AIBus.emit('asset.updated', { jenis: 'Emas/Logam Mulia' });
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(decideCalls.length, 1);
});

test('wireEvents() aman kalau AIBus tidak tersedia (guard, tidak throw)', () => {
  const ctx = loadSource(
    ['modules/ai/ai-service.js'],
    { IDBStore: { async get() { return null; }, async set() { return true; } }, D: {} },
    ['AIService'],
  );
  assert.doesNotThrow(() => ctx.AIService.wireEvents());
});
