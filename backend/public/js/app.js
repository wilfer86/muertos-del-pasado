import { fetchFrequencies } from './apiClient.js';
import Spectrogram from './spectrogram.js';

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusDiv = document.getElementById('status');
  const resultsDiv = document.getElementById('results');
  
  let spectrogram = null;
  let stopScan = null;
  let isScanning = false;

  startBtn.addEventListener('click', async () => {
    if (isScanning) return;
    
    isScanning = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusDiv.textContent = '🔍 Escaneando espectro de frecuencias...';
    resultsDiv.innerHTML = '';
    
    // Inicializar espectrograma
    spectrogram = new Spectrogram('spectrogram');
    spectrogram.clear();
    stopScan = spectrogram.simulateScan();
    
    try {
      // Obtener datos del backend
      const data = await fetchFrequencies();
      
      if (data && data.frequencies) {
        statusDiv.textContent = `✅ Se encontraron ${data.frequencies.length} señal(es)`;
        displayResults(data.frequencies);
      } else {
        statusDiv.textContent = '⚠️ No se encontraron señales';
      }
    } catch (error) {
      statusDiv.textContent = '❌ Error de conexión con el backend';
      console.error(error);
    }
  });

  stopBtn.addEventListener('click', () => {
    if (!isScanning) return;
    
    isScanning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    statusDiv.textContent = '⏸️ Escaneo detenido';
    
    if (stopScan) {
      stopScan();
    }
  });

  function displayResults(frequencies) {
    frequencies.forEach((freq, index) => {
      const card = document.createElement('div');
      card.className = 'frequency-card';
      card.innerHTML = `
        <h3>📡 Señal #${index + 1}: ${freq.frequency}</h3>
        <p><strong>Estado:</strong> ${freq.status}</p>
        <p><strong>Última actividad:</strong> ${freq.lastActive}</p>
        <p><strong>Ubicación:</strong> ${freq.location}</p>
        <p><strong>Descripción:</strong> ${freq.description}</p>
      `;
      resultsDiv.appendChild(card);
    });
  }
});
