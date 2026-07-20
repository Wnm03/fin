'use strict';
// tests/eie-notif-settings.test.js — Test EIENotifSettings (fase 3):
// toggle Pengaturan -> tulis eie-store.notificationsEnabled -> aktif/
// nonaktifkan NotificationService (yang dari fase 1 memang sudah dibuat
// siap pakai tinggal enable()/disable()). Fungsi yang baca/tulis DOM
// (render()) SENGAJA tidak dites detail nilainya di sini — sesuai catatan
// di tests/helpers/loadSource.js, itu ranahnya smoke-test.js/QA browser;
// yang dites di sini murni logika non-DOM (store + wiring NotificationService).
const { test } = require('node:test');
const assert = require('node:assert');
const { loadSource } = require('../helpers/loadSource');

function makeFakeIDBStore(initial = {}) {
  const data = { ...initial };
  return {
    async get(key) {
      return data[key];
    },
    async set(key, value) {
      data[key] = value;
      return true;
    },
    _raw: data,
  };
}

function loadEieNotifModule({ storeSeed = {}, toastLog = [] } = {}) {
  const IDBStore = makeFakeIDBStore(storeSeed);
  const ctx = loadSource(
    [
      'economic-intelligence/eie-bus.js',
      'economic-intelligence/eie-store.js',
      'economic-intelligence/services/notification-service.js',
      'economic-intelligence/ui/eie-notif-settings.js',
    ],
    {
      IDBStore,
      toast: (msg) => toastLog.push(msg),
    },
    ['EIENotifSettings', 'EIEBus', 'NotificationService'],
  );
  return { ctx, IDBStore, toastLog };
}

test('EIENotifSettings.toggle(true) — mengaktifkan store + NotificationService, publish event memicu toast', async () => {
  const { ctx, IDBStore, toastLog } = loadEieNotifModule();
  await ctx.EIENotifSettings.toggle(true);

  // Tersimpan ke store (lewat IDBStore.set, bukan D).
  const persisted = await IDBStore.get('eie:store');
  assert.strictEqual(persisted.notificationsEnabled, true);

  // NotificationService beneran ter-subscribe: emit event harus memicu toast.
  ctx.EIEBus.emit('eie:scores-updated', { insights: [{ severity: 'warning', message: 'Tes insight' }] });
  assert.ok(toastLog.some((m) => m.includes('Tes insight')), 'toast dari insight harus terkirim setelah toggle ON');
});

test('EIENotifSettings.toggle(false) — menonaktifkan, publish event TIDAK memicu toast insight', async () => {
  const { ctx, IDBStore, toastLog } = loadEieNotifModule();
  await ctx.EIENotifSettings.toggle(true);
  toastLog.length = 0; // buang toast konfirmasi "diaktifkan"
  await ctx.EIENotifSettings.toggle(false);

  const persisted = await IDBStore.get('eie:store');
  assert.strictEqual(persisted.notificationsEnabled, false);

  toastLog.length = 0; // buang toast konfirmasi "dimatikan"
  ctx.EIEBus.emit('eie:scores-updated', { insights: [{ severity: 'critical', message: 'Insight setelah OFF' }] });
  assert.ok(!toastLog.some((m) => m.includes('Insight setelah OFF')), 'tidak boleh ada toast insight setelah dimatikan');
});

test('EIENotifSettings.bootstrap() — menyalakan ulang NotificationService kalau sebelumnya sudah ON (persist antar sesi)', async () => {
  // Simulasikan sesi baru: store sudah punya notificationsEnabled:true dari
  // sesi sebelumnya (bukan hasil toggle di sesi ini).
  const { ctx, toastLog } = loadEieNotifModule({ storeSeed: { 'eie:store': { notificationsEnabled: true } } });

  // Sebelum bootstrap: NotificationService belum aktif sama sekali di sesi baru ini.
  ctx.EIEBus.emit('eie:scores-updated', { insights: [{ severity: 'info', message: 'Sebelum bootstrap' }] });
  assert.ok(!toastLog.some((m) => m.includes('Sebelum bootstrap')), 'belum bootstrap -> belum ada listener aktif');

  await ctx.EIENotifSettings.bootstrap();

  ctx.EIEBus.emit('eie:scores-updated', { insights: [{ severity: 'info', message: 'Setelah bootstrap' }] });
  assert.ok(toastLog.some((m) => m.includes('Setelah bootstrap')), 'setelah bootstrap, preferensi ON tersimpan harus langsung aktif lagi');
});

test('EIENotifSettings.bootstrap() — tidak menyalakan apa pun kalau preferensi tersimpan OFF (default)', async () => {
  const { ctx, toastLog } = loadEieNotifModule(); // store default -> notificationsEnabled:false
  await ctx.EIENotifSettings.bootstrap();
  ctx.EIEBus.emit('eie:scores-updated', { insights: [{ severity: 'critical', message: 'Harusnya diam' }] });
  assert.ok(!toastLog.some((m) => m.includes('Harusnya diam')), 'default OFF -> bootstrap tidak boleh menyalakan notifikasi');
});
