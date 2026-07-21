'use strict';
// tests/decision-center-home.test.js — DecisionCenterHome (modules/cross/
// decision-center-home.js). Sesi 90 (Batch 8) — Personal Decision Center
// Foundation: orchestrator tipis, memanggil RecommendationPanel.render()/
// ActionQueue.render() berurutan. Pola sama persis
// tests/unified-dashboard-home.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  const ctx = loadSource(['modules/cross/decision-center-home.js'], {
    ...opts,
  }, ['DecisionCenterHome']);
  return { DecisionCenterHome: ctx.DecisionCenterHome };
}

test('decision-center-home.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — kedua presenter belum dimuat: tidak throw', () => {
  const { DecisionCenterHome } = makeCtx({ RecommendationPanel: undefined, ActionQueue: undefined });
  assert.doesNotThrow(() => DecisionCenterHome.render());
});

test('render() — memanggil RecommendationPanel.render() & ActionQueue.render() berurutan', () => {
  const calls = [];
  const RecommendationPanel = { render: () => calls.push('recommendation') };
  const ActionQueue = { render: () => calls.push('actionQueue') };
  const { DecisionCenterHome } = makeCtx({ RecommendationPanel, ActionQueue });
  DecisionCenterHome.render();
  assert.deepEqual(calls, ['recommendation', 'actionQueue']);
});

test('render() — hanya RecommendationPanel dimuat: hanya itu yang dipanggil, tidak throw', () => {
  const calls = [];
  const RecommendationPanel = { render: () => calls.push('recommendation') };
  const { DecisionCenterHome } = makeCtx({ RecommendationPanel, ActionQueue: undefined });
  assert.doesNotThrow(() => DecisionCenterHome.render());
  assert.deepEqual(calls, ['recommendation']);
});
