// fuel-modal.js — Fuel Modal (TASK-141, Fuel Intelligence Card).
//
// PRINSIP: orkestrasi TIPIS saja. Buka overlay #fuelIntelModal (markup di
// modals.js, sesi ini) & panggil FuelAnalytics.render()/FuelHistory.render()
// (sesi ini, keduanya 100% reuse FuelIntelligenceEngine/FuelStorage) utk
// isi bodinya. Reuse openModal()/closeModal() (SUDAH ADA, dipakai semua
// modal lain di project ini) apa adanya — TIDAK ada mekanisme modal baru.
const FuelModal = {

curVehicleId: null,

// open(vehicleId?) — vehicleId opsional, default curVehicleId (kendaraan
// aktif di tab Car Notes, SUDAH ADA — sama seperti default vehicleId di
// BBM.openModal()/txBbmVehicle). {ok:false} (toast, tidak jadi buka
// modal) kalau kendaraan tidak ditemukan.
open(vehicleId) {
  const vid = vehicleId || (typeof curVehicleId !== 'undefined' ? curVehicleId : null);
  if (typeof FuelIntelligenceEngine === 'undefined') return;
  const insight = FuelIntelligenceEngine.vehicleInsight(vid);
  if (!insight.ok) {
    if (typeof toast === 'function') toast('⚠️ Kendaraan tidak ditemukan');
    return;
  }
  this.curVehicleId = vid;
  const titleEl = document.getElementById('fuelIntelModalVeh');
  if (titleEl) titleEl.textContent = (insight.emoji ? insight.emoji + ' ' : '') + insight.name;
  if (typeof FuelAnalytics !== 'undefined') FuelAnalytics.render(vid);
  if (typeof FuelHistory !== 'undefined') FuelHistory.render(vid);
  if (typeof openModal === 'function') openModal('fuelIntelModal');
},

};
