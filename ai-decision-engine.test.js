'use strict';
// tests/ai-decision-engine.test.js — modules/ai/ai-decision-engine.js
// (Sesi 2/6 Smart Delivery Engine: AIDecision.rules/.recommend/.learn +
// decide()). Belum ada rule domain terpasang (itu Sesi 4-5) — test ini
// memastikan mesinnya sendiri (registry, evaluator, cooldown, learning
// ringan, orkestrasi persist+emit) benar sebelum ada pendaftar nyata.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');

function loadDecisionEngine(idbData) {
  const idbCalls = [];
  const busEmits = [];
  const fakeIDBStore = {
    async get() { return idbData; },
    async set(key, value) { idbCalls.push([key, value]); return true; },
  };
  const ctx = loadSource(
    ['modules/ai/ai-core.js', 'modules/ai/ai-decision-engine.js'],
    { IDBStore: fakeIDBStore },
    ['AIDecision', 'AIBus', 'aiGetStore', 'aiEnsureLoaded', 'validateAIRuleShape'],
  );
  // AIBus dideklarasikan lewat `const` DI DALAM ai-core.js, jadi bindingnya
  // lexical (bukan properti sandbox yang bisa ditimpa dari luar) — cara
  // yang benar buat mengamati emit() adalah subscribe ke AIBus ASLI lewat
  // .on(), bukan mengganti objeknya.
  ctx.AIBus.on('ai:decision-made', (payload) => busEmits.push(['ai:decision-made', payload]));
  return { ctx, idbCalls, busEmits };
}

function validRule(overrides = {}) {
  return Object.assign({
    id: 'R-TEST-001',
    category: 'test',
    severity: 'warning',
    weight: 5,
    cooldownHours: 24,
    condition: () => true,
    action: () => ({ message: 'pesan test', recommendationId: 'REC-TEST' }),
  }, overrides);
}

test('validateAIRuleShape — rule lengkap & valid tidak menghasilkan error', () => {
  const { ctx } = loadDecisionEngine(undefined);
  const errors = ctx.validateAIRuleShape(validRule());
  assert.equal(JSON.stringify(errors), '[]');
});

test('validateAIRuleShape — rule tanpa condition/action/severity/weight/cooldownHours ditolak', () => {
  const { ctx } = loadDecisionEngine(undefined);
  const errors = ctx.validateAIRuleShape({ id: 'x', category: 'y' });
  assert.ok(errors.length >= 4);
});

test('rules.register — menerima rule valid, menolak duplikat id, menolak rule invalid', () => {
  const { ctx } = loadDecisionEngine(undefined);
  assert.equal(ctx.AIDecision.rules.register(validRule()), true);
  assert.equal(ctx.AIDecision.rules.register(validRule()), false); // id duplikat
  assert.equal(ctx.AIDecision.rules.register({ id: 'bad' }), false); // invalid
  assert.equal(ctx.AIDecision.rules.getAll().length, 1);
});

test('rules.register — enabled default true, bisa dimatikan eksplisit', () => {
  const { ctx } = loadDecisionEngine(undefined);
  ctx.AIDecision.rules.register(validRule({ id: 'R-A' }));
  ctx.AIDecision.rules.register(validRule({ id: 'R-B', enabled: false }));
  const all = ctx.AIDecision.rules.getAll();
  assert.equal(all.find((r) => r.id === 'R-A').enabled, true);
  assert.equal(all.find((r) => r.id === 'R-B').enabled, false);
});

test('rules.unregister — menghapus rule terdaftar, return false kalau id tidak ada', () => {
  const { ctx } = loadDecisionEngine(undefined);
  ctx.AIDecision.rules.register(validRule());
  assert.equal(ctx.AIDecision.rules.unregister('R-TEST-001'), true);
  assert.equal(ctx.AIDecision.rules.getAll().length, 0);
  assert.equal(ctx.AIDecision.rules.unregister('tidak-ada'), false);
});

test('rules.evaluate — rule enabled & condition true masuk hasil, severity menentukan urutan', () => {
  const { ctx } = loadDecisionEngine(undefined);
  ctx.AIDecision.rules.register(validRule({ id: 'R-INFO', severity: 'info', condition: () => true }));
  ctx.AIDecision.rules.register(validRule({ id: 'R-CRIT', severity: 'critical', condition: () => true }));
  ctx.AIDecision.rules.register(validRule({ id: 'R-SKIP', condition: () => false }));
  const triggered = ctx.AIDecision.rules.evaluate({});
  assert.equal(JSON.stringify(triggered.map((t) => t.ruleId)), JSON.stringify(['R-CRIT', 'R-INFO']));
});

test('rules.evaluate — rule disabled tidak pernah dievaluasi', () => {
  const { ctx } = loadDecisionEngine(undefined);
  ctx.AIDecision.rules.register(validRule({ enabled: false }));
  assert.equal(JSON.stringify(ctx.AIDecision.rules.evaluate({})), '[]');
});

test('rules.evaluate — error di condition/action tidak melempar, rule lain tetap dievaluasi', () => {
  const { ctx } = loadDecisionEngine(undefined);
  ctx.AIDecision.rules.register(validRule({ id: 'R-ERR', condition: () => { throw new Error('boom'); } }));
  ctx.AIDecision.rules.register(validRule({ id: 'R-OK' }));
  let triggered;
  assert.doesNotThrow(() => { triggered = ctx.AIDecision.rules.evaluate({}); });
  assert.equal(JSON.stringify(triggered.map((t) => t.ruleId)), JSON.stringify(['R-OK']));
});

test('rules.evaluate — cooldown mencegah rule yang sama trigger 2x berturut sebelum masanya habis', async () => {
  const { ctx } = loadDecisionEngine(undefined);
  await ctx.aiEnsureLoaded();
  ctx.AIDecision.rules.register(validRule({ cooldownHours: 999 }));
  const first = ctx.AIDecision.rules.evaluate({});
  const second = ctx.AIDecision.rules.evaluate({});
  assert.equal(first.length, 1);
  assert.equal(second.length, 0); // masih dalam cooldown
});

test('rules.evaluate — ctx.simulated=true tidak menandai cooldown (bisa trigger berkali-kali)', async () => {
  const { ctx } = loadDecisionEngine(undefined);
  await ctx.aiEnsureLoaded();
  ctx.AIDecision.rules.register(validRule({ cooldownHours: 999 }));
  const first = ctx.AIDecision.rules.evaluate({ simulated: true });
  const second = ctx.AIDecision.rules.evaluate({ simulated: true });
  assert.equal(first.length, 1);
  assert.equal(second.length, 1);
});

test('recommend.register/getById — hanya menerima def dengan label string, target opsional', () => {
  const { ctx } = loadDecisionEngine(undefined);
  assert.equal(ctx.AIDecision.recommend.register('REC-A', { label: 'Cek A', target: { page: 'x' } }), true);
  assert.equal(ctx.AIDecision.recommend.register('REC-B', { label: 'Cek B' }), true);
  assert.equal(ctx.AIDecision.recommend.register('REC-C', {}), false);
  assert.equal(JSON.stringify(ctx.AIDecision.recommend.getById('REC-A')), JSON.stringify({ label: 'Cek A', target: { page: 'x' } }));
  assert.equal(JSON.stringify(ctx.AIDecision.recommend.getById('REC-B')), JSON.stringify({ label: 'Cek B', target: null }));
  assert.equal(ctx.AIDecision.recommend.getById('tidak-ada'), null);
});

test('learn.recordOutcome/getStats/getConfidence — rasio dihitung benar, default netral 0.5', async () => {
  const { ctx } = loadDecisionEngine(undefined);
  assert.equal(await ctx.AIDecision.learn.getConfidence('R-X'), 0.5); // belum ada data
  await ctx.AIDecision.learn.recordOutcome('R-X', 'accepted');
  await ctx.AIDecision.learn.recordOutcome('R-X', 'accepted');
  await ctx.AIDecision.learn.recordOutcome('R-X', 'rejected');
  await ctx.AIDecision.learn.recordOutcome('R-X', 'ignored'); // tidak masuk hitungan rasio
  const stats = await ctx.AIDecision.learn.getStats('R-X');
  assert.equal(stats.accepted, 2);
  assert.equal(stats.rejected, 1);
  assert.equal(stats.ignored, 1);
  const confidence = await ctx.AIDecision.learn.getConfidence('R-X');
  assert.ok(Math.abs(confidence - (2 / 3)) < 1e-9);
});

test('learn.recordOutcome — outcome tidak valid diabaikan (return null, tidak menulis apa pun)', async () => {
  const { ctx, idbCalls } = loadDecisionEngine(undefined);
  const result = await ctx.AIDecision.learn.recordOutcome('R-X', 'salah');
  assert.equal(result, null);
  assert.equal(idbCalls.length, 0);
});

test('decide — evaluate + tulis decisionLog + persist ke IDBStore + emit ai:decision-made', async () => {
  const { ctx, idbCalls, busEmits } = loadDecisionEngine(undefined);
  ctx.AIDecision.rules.register(validRule());
  const result = await ctx.AIDecision.decide({});
  assert.equal(result.simulated, false);
  assert.equal(result.decisions.length, 1);
  assert.equal(result.decisions[0].ruleId, 'R-TEST-001');
  assert.equal(result.decisions[0].message, 'pesan test');
  assert.ok(idbCalls.length >= 1, 'decide() harus persist ke IDBStore');
  assert.equal(JSON.stringify(busEmits.map((e) => e[0])), JSON.stringify(['ai:decision-made']));
});

test('decide — tidak ada rule trigger -> tidak emit event, tapi tetap persist lastRunAt', async () => {
  const { ctx, idbCalls, busEmits } = loadDecisionEngine(undefined);
  const result = await ctx.AIDecision.decide({});
  assert.equal(JSON.stringify(result.decisions), '[]');
  assert.equal(busEmits.length, 0);
  assert.ok(idbCalls.length >= 1);
});

test('decide — ctx.simulated=true tidak menulis apa pun ke IDBStore & tidak emit event', async () => {
  const { ctx, idbCalls, busEmits } = loadDecisionEngine(undefined);
  ctx.AIDecision.rules.register(validRule());
  const result = await ctx.AIDecision.decide({ simulated: true });
  assert.equal(result.simulated, true);
  assert.equal(result.triggered.length, 1);
  assert.equal(JSON.stringify(result.decisions), '[]');
  assert.equal(idbCalls.length, 0);
  assert.equal(busEmits.length, 0);
});
