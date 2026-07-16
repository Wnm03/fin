// domain/weather-classifier.js — Pure function skor -> Economic Weather.
// Tidak ada I/O. Lihat §8 dokumen desain.

function classifyWeather(EES, PEHS, ERI) {
  const impactScore = Math.max(0, Math.min(100, (EES * 0.5 + ERI * 0.5) - (PEHS * 0.3)));
  let weather;
  if (impactScore < 35) weather = 'normal';
  else if (impactScore < 65) weather = 'waspada';
  else weather = 'risiko_tinggi';
  return { weather, impactScore: Math.round(impactScore * 10) / 10 };
}

const WEATHER_META = {
  normal:        { icon: '🟢', label: 'Normal' },
  waspada:       { icon: '🟡', label: 'Waspada' },
  risiko_tinggi: { icon: '🔴', label: 'Risiko Tinggi' },
};
