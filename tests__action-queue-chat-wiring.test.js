'use strict';
// tests/action-queue-chat-wiring.test.js — S119 (Batch 13, Release
// Candidate Validation). Cakupan: actionQueueChatContext() (ai-chat.js) —
// jembatan MURNI BACA ke ActionQueue.getQueue() (modules/cross/
// action-queue.js), dipakai dari initChat() (bubble sambutan) &
// systemPrompt (_sendChatInner()). Fokus test: guard
// `typeof ActionQueue==='undefined'`/getQueue bukan fungsi, meneruskan
// pesan apa adanya (format pakai ActionQueue._label()/_vehicleIcon(),
// TIDAK duplikasi logic ikon/label) kalau `ok:true` & ada isi, null kalau
// `ok:false`/kosong, dan TIDAK throw kalau getQueue() sendiri melempar
// error. TIDAK menguji ActionQueue.getQueue()/DecisionCenterAPI.summary()
// sendiri (sudah dites tests/action-queue.test.js) — file ini murni
// menguji lapisan wiring tipis di ai-chat.js. Pola sama persis
// tests/recommendation-panel-chat-wiring.test.js/
// tests/unified-briefing-chat-wiring.test.js.
//
// Gap ditemukan sesi ini (S119, audit "AI Chat"/"Action Queue"):
// unifiedBriefingChatContext() & recommendationPanelChatContext() sudah
// masing2 punya test file wiring tipis sejak S111/S114 — actionQueueChatContext()
// (S115) belum pernah punya test setara sampai sesi ini. BUKAN bug
// perilaku (fungsi berjalan benar, dikonfirmasi test di bawah), murni
// gap coverage — ditutup sbg bagian validasi Release Candidate (checklist
// #13 "seluruh integration test PASS"), 0 perubahan ke ai-chat.js sendiri.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ ActionQueue } = {}) {
  const extraGlobals = {};
  if (ActionQueue !== undefined) extraGlobals.ActionQueue = ActionQueue;
  const c = loadSource(['ai-chat.js'], extraGlobals, ['actionQueueChatContext']);
  return c.actionQueueChatContext;
}

test('actionQueueChatContext() — null kalau ActionQueue belum dimuat', () => {
  const fn = makeCtx();
  assert.equal(fn(), null);
});

test('actionQueueChatContext() — null kalau getQueue bukan fungsi', () => {
  const fn = makeCtx({ ActionQueue: {} });
  assert.equal(fn(), null);
});

test('actionQueueChatContext() — null kalau getQueue() ok:false', () => {
  const fn = makeCtx({
    ActionQueue: {
      getQueue: () => ({ ok: false, priorityItems: [] }),
      _label: (item) => item.message,
      _vehicleIcon: () => '⛔',
    },
  });
  assert.equal(fn(), null);
});

test('actionQueueChatContext() — null kalau priorityItems kosong', () => {
  const fn = makeCtx({
    ActionQueue: {
      getQueue: () => ({ ok: true, priorityItems: [] }),
      _label: (item) => item.message,
      _vehicleIcon: () => '⛔',
    },
  });
  assert.equal(fn(), null);
});

test('actionQueueChatContext() — format pesan pakai _label()/_vehicleIcon() apa adanya (0 duplikasi logic ikon/label), bernomor urut', () => {
  const fn = makeCtx({
    ActionQueue: {
      getQueue: () => ({
        ok: true,
        priorityItems: [
          { kind: 'vehicle', vehicleType: 'service', message: 'Servis motor lewat jatuh tempo' },
          { kind: 'finance', name: 'Belanja Bulanan', message: 'tidak dipakai utk kind finance' },
        ],
      }),
      _label: (item) => (item.kind === 'finance' ? `Anggaran "${item.name}" sudah melebihi limit.` : item.message),
      _vehicleIcon: (type) => (type === 'service' ? '🔧' : '⛔'),
    },
  });
  assert.equal(
    fn(),
    '1. 🔧 Servis motor lewat jatuh tempo\n2. 💰 Anggaran "Belanja Bulanan" sudah melebihi limit.'
  );
});

test('actionQueueChatContext() — null (bukan throw) kalau getQueue() melempar error', () => {
  const fn = makeCtx({
    ActionQueue: { getQueue: () => { throw new Error('boom'); }, _label: () => '', _vehicleIcon: () => '⛔' },
  });
  assert.doesNotThrow(() => fn());
  assert.equal(fn(), null);
});
