'use strict';
// tests/recommendation-panel-chat-wiring.test.js — S114 (Batch 13, Unified
// Recommendation Panel Integration). Cakupan: recommendationPanelChatContext()
// (ai-chat.js) — jembatan MURNI BACA ke RecommendationPanel.getRecommendations()
// (modules/cross/recommendation-panel.js), dipakai dari initChat() (bubble
// sambutan) & systemPrompt (_sendChatInner()). Fokus test: guard
// `typeof RecommendationPanel==='undefined'`/getRecommendations bukan fungsi,
// meneruskan pesan apa adanya (format pakai RecommendationPanel._icon(), TIDAK
// duplikasi logic ikon) kalau `ok:true` & ada isi, null kalau `ok:false`/kosong,
// dan TIDAK throw kalau getRecommendations() sendiri melempar error. TIDAK
// menguji RecommendationPanel.getRecommendations()/DecisionCenterAPI.summary()
// sendiri (sudah dites tests/recommendation-panel.test.js) — file ini murni
// menguji lapisan wiring tipis di ai-chat.js. Pola sama persis
// tests/unified-briefing-chat-wiring.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ RecommendationPanel } = {}) {
  const extraGlobals = {};
  if (RecommendationPanel !== undefined) extraGlobals.RecommendationPanel = RecommendationPanel;
  const c = loadSource(['ai-chat.js'], extraGlobals, ['recommendationPanelChatContext']);
  return c.recommendationPanelChatContext;
}

test('recommendationPanelChatContext() — null kalau RecommendationPanel belum dimuat', () => {
  const fn = makeCtx();
  assert.equal(fn(), null);
});

test('recommendationPanelChatContext() — null kalau getRecommendations bukan fungsi', () => {
  const fn = makeCtx({ RecommendationPanel: {} });
  assert.equal(fn(), null);
});

test('recommendationPanelChatContext() — null kalau getRecommendations() ok:false', () => {
  const fn = makeCtx({
    RecommendationPanel: { getRecommendations: () => ({ ok: false, recommendations: [] }), _icon: () => 'ℹ️' },
  });
  assert.equal(fn(), null);
});

test('recommendationPanelChatContext() — null kalau recommendations kosong', () => {
  const fn = makeCtx({
    RecommendationPanel: { getRecommendations: () => ({ ok: true, recommendations: [] }), _icon: () => 'ℹ️' },
  });
  assert.equal(fn(), null);
});

test('recommendationPanelChatContext() — format pesan pakai _icon() apa adanya (0 duplikasi logic ikon)', () => {
  const fn = makeCtx({
    RecommendationPanel: {
      getRecommendations: () => ({
        ok: true,
        recommendations: [
          { type: 'warning', message: 'Budget hampir habis' },
          { type: 'warning', message: 'Servis lewat jatuh tempo' },
        ],
      }),
      _icon: (t) => (t === 'warning' ? '🟡' : 'ℹ️'),
    },
  });
  assert.equal(fn(), '🟡 Budget hampir habis\n🟡 Servis lewat jatuh tempo');
});

test('recommendationPanelChatContext() — null (bukan throw) kalau getRecommendations() melempar error', () => {
  const fn = makeCtx({
    RecommendationPanel: { getRecommendations: () => { throw new Error('boom'); }, _icon: () => 'ℹ️' },
  });
  assert.doesNotThrow(() => fn());
  assert.equal(fn(), null);
});
