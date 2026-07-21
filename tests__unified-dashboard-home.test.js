'use strict';
// tests/unified-dashboard-home.test.js — UnifiedDashboardHome (modules/
// cross/unified-dashboard-home.js). Sesi 89 (Batch 8) — Personal Life
// Dashboard Foundation: entry point yang memanggil PersonalOverviewPresenter/
// CrossModuleWidgets/LifePriorityPanel berurutan. TIDAK ada logic/state
// sendiri — test ini murni verifikasi orchestration (dipanggil/tidak,
// guard typeof, tidak throw kalau salah satu belum dimuat).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  return loadSource(['modules/cross/unified-dashboard-home.js'], {
    PersonalOverviewPresenter: opts.PersonalOverviewPresenter,
    CrossModuleWidgets: opts.CrossModuleWidgets,
    LifePriorityPanel: opts.LifePriorityPanel,
  }, ['UnifiedDashboardHome']);
}

test('unified-dashboard-home.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — ketiga presenter belum dimuat: tidak throw', () => {
  const { UnifiedDashboardHome } = makeCtx({});
  assert.doesNotThrow(() => UnifiedDashboardHome.render());
});

test('render() — memanggil PersonalOverviewPresenter.render()/CrossModuleWidgets.render()/LifePriorityPanel.render() masing-masing tepat 1x', () => {
  let personalCalls = 0;
  let widgetsCalls = 0;
  let priorityCalls = 0;
  const PersonalOverviewPresenter = { render: () => { personalCalls += 1; } };
  const CrossModuleWidgets = { render: () => { widgetsCalls += 1; } };
  const LifePriorityPanel = { render: () => { priorityCalls += 1; } };
  const { UnifiedDashboardHome } = makeCtx({ PersonalOverviewPresenter, CrossModuleWidgets, LifePriorityPanel });
  UnifiedDashboardHome.render();
  assert.equal(personalCalls, 1);
  assert.equal(widgetsCalls, 1);
  assert.equal(priorityCalls, 1);
});

test('render() — hanya sebagian presenter dimuat: yang tersedia tetap dipanggil, tidak throw', () => {
  let widgetsCalls = 0;
  const CrossModuleWidgets = { render: () => { widgetsCalls += 1; } };
  const { UnifiedDashboardHome } = makeCtx({ CrossModuleWidgets });
  assert.doesNotThrow(() => UnifiedDashboardHome.render());
  assert.equal(widgetsCalls, 1);
});
