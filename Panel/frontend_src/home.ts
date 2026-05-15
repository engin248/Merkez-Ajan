
import { renderArmorGrid } from './home/ui.ts';
import { initData, updateCharts } from './home/charts.ts';
import { connectWS, fetchPM2 } from './home/ws.ts';
import { initElectricEffects } from './home/electric.ts';
import { initBrainVeins } from './home/veins.ts';
import { initVoiceChat } from './home/voice.ts';
import { initNeuralConstellation } from './home/constellation.ts';
import { initHoloGlobe } from './home/globe.ts';
import { initHudTelemetry, updateHudTelemetry } from './home/hud.ts';

// ─── INIT ───
document.addEventListener('DOMContentLoaded', () => {
    try { renderArmorGrid(); } catch(e) { console.warn('renderArmorGrid hatası:', e); }
    try { initData(); } catch(e) { console.warn('initData hatası:', e); }
    try { updateCharts(); } catch(e) { console.warn('updateCharts hatası:', e); }
    try { connectWS(); } catch(e) { console.warn('connectWS hatası:', e); }
    try { fetchPM2(); } catch(e) { console.warn('fetchPM2 hatası:', e); }
    try { initElectricEffects(); } catch(e) { console.warn('initElectricEffects hatası:', e); }
    try { initBrainVeins(); } catch(e) { console.warn('initBrainVeins hatası:', e); }
    try { initHudTelemetry(); } catch(e) { console.warn('initHudTelemetry hatası:', e); }
    try { initNeuralConstellation(); } catch(e) { console.warn('initNeuralConstellation hatası:', e); }
    try { initHoloGlobe(); } catch(e) { console.warn('initHoloGlobe hatası:', e); }
    
    // Ses bileşenleri HTML ile bağımsız veya doğru yapıda, kesin başlatılmalı.
    try { initVoiceChat(); } catch(e) { console.error('initVoiceChat kritik hatası:', e); }

    // Döngüsel işlemler
    setInterval(() => {
        try { updateCharts(); } catch(e) {}
    }, 2000);
    setInterval(() => {
        try { fetchPM2(); } catch(e) {}
    }, 10000);
    setInterval(() => {
        try { updateHudTelemetry(); } catch(e) {}
    }, 2500);
});
