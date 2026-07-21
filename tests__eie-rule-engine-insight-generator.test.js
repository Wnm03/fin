'use strict';
// tests/eie-rule-engine-insight-generator.test.js — RuleEngine.evaluate()
// (engine/rule-engine.js) & InsightGenerator (engine/insight-generator.js).
// Keduanya sebelumnya 0 test sama sekali. Di-load via loadSource dengan
// EIE_RULES/eieGetStore/dst di-stub (fake store in-memory), bukan
// reimplementasi logic — pola sama seperti test EIE lain.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function fakeStore(initial = {}) {
  return { ruleCooldowns: {}, insights: [], ...initial };
}

function loadRuleEngine(rules, store) {
  return loadSource(
    ['economic-intelligence/engine/rule-engine.js'],
    {
      EIE_RULES: rules,
      eieGetStore: () => store,
      console: { warn: () => {} },
    },
    ['RuleEngine'],
  );
}

test('RuleEngine.evaluate — rule enabled & condition true -> triggered dgn message/recommendationId dari action()', () => {
  const store = fakeStore();
  const rules = [{
    id: 'R1', enabled: true, severity: 'warning', weight: 5, cooldownDays: 7,
    condition: () => true,
    action: () => ({ message: 'halo', recommendationId: 'REC-X' }),
  }];
  const { RuleEngine } = loadRuleEngine(rules, store);
  const out = RuleEngine.evaluate({}, {});
  assert.equal(out.length, 1);
  assert.equal(out[0].ruleId, 'R1');
  assert.equal(out[0].message, 'halo');
  assert.equal(out[0].recommendationId, 'REC-X');
});

test('RuleEngine.evaluate — rule disabled tidak pernah dievaluasi sama sekali', () => {
  const store = fakeStore();
  let conditionCalled = false;
  const rules = [{
    id: 'R1', enabled: false, severity: 'info', weight: 1, cooldownDays: 0,
    condition: () => { conditionCalled = true; return true; },
    action: () => ({ message: 'x' }),
  }];
  const { RuleEngine } = loadRuleEngine(rules, store);
  const out = RuleEngine.evaluate({}, {});
  assert.equal(out.length, 0);
  assert.equal(conditionCalled, false);
});

test('RuleEngine.evaluate — condition false tidak triggered & cooldown tidak ditandai', () => {
  const store = fakeStore();
  const rules = [{
    id: 'R1', enabled: true, severity: 'info', weight: 1, cooldownDays: 7,
    condition: () => false,
    action: () => ({ message: 'x' }),
  }];
  const { RuleEngine } = loadRuleEngine(rules, store);
  RuleEngine.evaluate({}, {});
  assert.equal(store.ruleCooldowns.R1, undefined);
});

test('RuleEngine.evaluate — rule yang baru saja triggered tidak triggered lagi selama cooldownDays', () => {
  const store = fakeStore({ ruleCooldowns: { R1: Date.now() } }); // baru saja
  const rules = [{
    id: 'R1', enabled: true, severity: 'info', weight: 1, cooldownDays: 7,
    condition: () => true,
    action: () => ({ message: 'x' }),
  }];
  const { RuleEngine } = loadRuleEngine(rules, store);
  const out = RuleEngine.evaluate({}, {});
  assert.equal(out.length, 0);
});

test('RuleEngine.evaluate — cooldown sudah lewat (di luar cooldownDays) -> triggered lagi', () => {
  const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
  const store = fakeStore({ ruleCooldowns: { R1: eightDaysAgo } });
  const rules = [{
    id: 'R1', enabled: true, severity: 'info', weight: 1, cooldownDays: 7,
    condition: () => true,
    action: () => ({ message: 'x' }),
  }];
  const { RuleEngine } = loadRuleEngine(rules, store);
  const out = RuleEngine.evaluate({}, {});
  assert.equal(out.length, 1);
});

test('RuleEngine.evaluate — mode simulated:true (What-If) mengabaikan cooldown & tidak menulis cooldown baru', () => {
  const store = fakeStore({ ruleCooldowns: { R1: Date.now() } }); // masih dalam cooldown
  const rules = [{
    id: 'R1', enabled: true, severity: 'info', weight: 1, cooldownDays: 7,
    condition: () => true,
    action: () => ({ message: 'x' }),
  }];
  const { RuleEngine } = loadRuleEngine(rules, store);
  const before = store.ruleCooldowns.R1;
  const out = RuleEngine.evaluate({}, {}, { simulated: true });
  assert.equal(out.length, 1); // tetap triggered walau lagi cooldown, krn simulasi
  assert.equal(store.ruleCooldowns.R1, before); // cooldown tidak ikut ditulis ulang
});

test('RuleEngine.evaluate — rule yang condition()-nya throw error di-skip, rule lain tetap jalan', () => {
  const store = fakeStore();
  const rules = [
    { id: 'R-ERR', enabled: true, severity: 'critical', weight: 9, cooldownDays: 0,
      condition: () => { throw new Error('boom'); }, action: () => ({ message: 'x' }) },
    { id: 'R-OK', enabled: true, severity: 'info', weight: 1, cooldownDays: 0,
      condition: () => true, action: () => ({ message: 'y' }) },
  ];
  const { RuleEngine } = loadRuleEngine(rules, store);
  const out = RuleEngine.evaluate({}, {});
  assert.equal(out.length, 1);
  assert.equal(out[0].ruleId, 'R-OK');
});

test('RuleEngine.evaluate — hasil diurutkan severity tertinggi dulu (critical > warning > info)', () => {
  const store = fakeStore();
  const mk = (id, severity) => ({
    id, enabled: true, severity, weight: 1, cooldownDays: 0,
    condition: () => true, action: () => ({ message: id }),
  });
  const rules = [mk('R-INFO', 'info'), mk('R-CRIT', 'critical'), mk('R-WARN', 'warning')];
  const { RuleEngine } = loadRuleEngine(rules, store);
  const out = RuleEngine.evaluate({}, {});
  // Array.from() dipanggil di sini (host realm) supaya hasilnya array
  // "asli" Node, bukan array dari realm vm (deepEqual bisa gagal gara2
  // prototype beda realm walau isinya sama -- lihat catatan yg sama di
  // tests/pph21-pbb.test.js).
  assert.deepEqual(Array.from(out, (o) => o.ruleId), ['R-CRIT', 'R-WARN', 'R-INFO']);
});

test('RuleEngine.evaluate — action() tanpa return value tidak throw, message/recommendationId default kosong/null', () => {
  const store = fakeStore();
  const rules = [{
    id: 'R1', enabled: true, severity: 'info', weight: 1, cooldownDays: 0,
    condition: () => true, action: () => undefined,
  }];
  const { RuleEngine } = loadRuleEngine(rules, store);
  const out = RuleEngine.evaluate({}, {});
  assert.equal(out[0].message, '');
  assert.equal(out[0].recommendationId, null);
});

// --- InsightGenerator ---

function loadInsightGenerator(store) {
  return loadSource(
    ['economic-intelligence/engine/insight-generator.js'],
    {
      eieEnsureLoaded: async () => {},
      eieGetStore: () => store,
      eieSave: async () => {},
    },
    ['InsightGenerator'],
  );
}

test('InsightGenerator.generate — passthrough, langsung kembalikan message dari rule ter-trigger', () => {
  const { InsightGenerator } = loadInsightGenerator(fakeStore());
  assert.equal(InsightGenerator.generate({ message: 'pesan asli' }), 'pesan asli');
});

test('InsightGenerator.list — urut dari createdAt terbaru, filter onlyUnread membuang yang sudah read', async () => {
  const store = fakeStore({
    insights: [
      { id: 'a', createdAt: 1, read: true },
      { id: 'b', createdAt: 3, read: false },
      { id: 'c', createdAt: 2, read: false },
    ],
  });
  const { InsightGenerator } = loadInsightGenerator(store);
  const all = await InsightGenerator.list();
  assert.deepEqual(Array.from(all, (i) => i.id), ['b', 'c', 'a']);
  const unread = await InsightGenerator.list({ onlyUnread: true });
  assert.deepEqual(Array.from(unread, (i) => i.id), ['b', 'c']);
});

test('InsightGenerator.markRead — set read:true pada insight yg cocok id, insight lain tak tersentuh', async () => {
  const store = fakeStore({ insights: [{ id: 'a', read: false }, { id: 'b', read: false }] });
  const { InsightGenerator } = loadInsightGenerator(store);
  const res = await InsightGenerator.markRead('a');
  assert.equal(res.read, true);
  assert.equal(store.insights.find((i) => i.id === 'a').read, true);
  assert.equal(store.insights.find((i) => i.id === 'b').read, false);
});

test('InsightGenerator.markRead/dismiss — id tidak ditemukan -> return null, tidak throw', async () => {
  const store = fakeStore({ insights: [] });
  const { InsightGenerator } = loadInsightGenerator(store);
  assert.equal(await InsightGenerator.markRead('tidak-ada'), null);
  assert.equal(await InsightGenerator.dismiss('tidak-ada'), null);
});

test('InsightGenerator.dismiss — set dismissed:true pada insight yg cocok id', async () => {
  const store = fakeStore({ insights: [{ id: 'a', dismissed: false }] });
  const { InsightGenerator } = loadInsightGenerator(store);
  const res = await InsightGenerator.dismiss('a');
  assert.equal(res.dismissed, true);
});
