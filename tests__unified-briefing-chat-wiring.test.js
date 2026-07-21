'use strict';
// tests/unified-briefing-chat-wiring.test.js — S111 (Batch 13, AI Daily
// Briefing Integration: Finance+Vehicle). Cakupan: unifiedBriefingChatContext()
// (ai-chat.js) — jembatan MURNI BACA ke UnifiedAIBriefing.generate(), dipakai
// dari initChat() (bubble sambutan) & systemPrompt (_sendChatInner()). Fokus
// test: guard `typeof UnifiedAIBriefing==='undefined'`, meneruskan
// `briefing.text` apa adanya kalau `ok:true`, null kalau `ok:false`, dan TIDAK
// throw kalau generate() sendiri melempar error. TIDAK menguji
// UnifiedAIBriefing.generate() sendiri (sudah dites tests/unified-ai-briefing.test.js)
// — file ini murni menguji lapisan wiring tipis di ai-chat.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ UnifiedAIBriefing } = {}) {
  const extraGlobals = {};
  if (UnifiedAIBriefing !== undefined) extraGlobals.UnifiedAIBriefing = UnifiedAIBriefing;
  const c = loadSource(['ai-chat.js'], extraGlobals, ['unifiedBriefingChatContext']);
  return c.unifiedBriefingChatContext;
}

test('unifiedBriefingChatContext() — null kalau UnifiedAIBriefing belum dimuat', () => {
  const fn = makeCtx();
  assert.equal(fn(), null);
});

test('unifiedBriefingChatContext() — meneruskan text apa adanya kalau generate() ok:true', () => {
  const fn = makeCtx({
    UnifiedAIBriefing: { generate: () => ({ ok: true, text: 'Skor kesehatan finansial 80/100 (Baik).', parts: ['x'] }) },
  });
  assert.equal(fn(), 'Skor kesehatan finansial 80/100 (Baik).');
});

test('unifiedBriefingChatContext() — null kalau generate() ok:false', () => {
  const fn = makeCtx({
    UnifiedAIBriefing: { generate: () => ({ ok: false, reason: 'Tidak ada data untuk briefing' }) },
  });
  assert.equal(fn(), null);
});

test('unifiedBriefingChatContext() — null (bukan throw) kalau generate() melempar error', () => {
  const fn = makeCtx({
    UnifiedAIBriefing: { generate: () => { throw new Error('boom'); } },
  });
  assert.doesNotThrow(() => fn());
  assert.equal(fn(), null);
});
