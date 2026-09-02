import { fetchFrequencies } from './apiClient.js';
import Spectrogram from './spectrogram.js';

// Detectar si es móvil o PC
function isMobile() {
  return window.innerWidth <= 768;
}

// Aplicar clase de fondo correcta
function applyBackground() {
  const body = document.body;
  if (isMobile()) {
    body.classList.remove('web-bg');
    body.classList.add('app-bg');
  } else {
    body.classList.remove('app-bg');
    body.classList.add('web-bg');
  }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  applyBackground();
  window.addEventListener('resize', applyBackground);
  
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusDiv = document.getElementById('status');
  const statusText = statusDiv.querySelector('.status-text');
  const statusIcon = statusDiv.querySelector('.status-icon');
  const resultsDiv = document.getElementById('results');
  
  let spectrogram = null;
  let stopScan = null;
  let isScanning = false;

  startBtn.addEventListener('click', async () => {
    if (isScanning) return;
    
    isScanning = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    
    statusDiv.className = 'status scanning';
    statusIcon.textContent = '🔍';
    statusText.textContent = 'Escaneando espectro de frecuencias...';
    resultsDiv.innerHTML = '';
    
    // Inicializar espectrograma
    spectrogram = new Spectrogram('spectrogram');
    spectrogram.clear();
    stopScan = spectrogram.simulateScan();
    
    try {
      // Simular delay de escaneo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Obtener datos del backend
      const data = await fetchFrequencies();
      
      if (data && data.frequencies) {
        statusDiv.className = 'status success';
        statusIcon.textContent = '✅';
        statusText.textContent = `Se encontraron ${data.frequencies.length} señal(es)`;
        displayResults(data.frequencies);
      } else {
        statusDiv.className = 'status';
        statusIcon.textContent = '⚠️';
        statusText.textContent = 'No se encontraron señales';
      }
    } catch (error) {
      statusDiv.className = 'status error';
      statusIcon.textContent = '❌';
      statusText.textContent = 'Error de conexión con el backend';
      console.error(error);
    }
  });

  stopBtn.addEventListener('click', () => {
    if (!isScanning) return;
    
    isScanning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    statusDiv.className = 'status';
    statusIcon.textContent = '⏸️';
    statusText.textContent = 'Escaneo detenido';
    
    if (stopScan) {
      stopScan();
    }
  });

  function displayResults(frequencies) {
    frequencies.forEach((freq, index) => {
      const card = document.createElement('div');
      card.className = 'frequency-card';
      card.style.animationDelay = `${index * 0.2}s`;
      card.innerHTML = `
        <h3>📡 ${freq.frequency}</h3>
        <p><strong>Estado:</strong> ${freq.status}</p>
        <p><strong>Última actividad:</strong> ${freq.lastActive}</p>
        <p><strong>Ubicación:</strong> ${freq.location}</p>
        <p><strong>Descripción:</strong> ${freq.description}</p>
      `;
      resultsDiv.appendChild(card);
    });
  }
});
