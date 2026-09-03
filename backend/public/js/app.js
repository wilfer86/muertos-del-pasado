import { fetchFrequencies } from './apiClient.js';
import Spectrogram from './spectrogram.js';
import AudioCapture from './audioCapture.js';

function isMobile() {
  return window.innerWidth <= 768;
}

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
  let audioCapture = null;
  let animationFrame = null;
  let isScanning = false;
  let userLocation = null;

  function getLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no disponible'));
        return;
      }
      
      statusIcon.textContent = '';
      statusText.textContent = 'Obteniendo ubicación GPS...';
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          userLocation = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };
          resolve(userLocation);
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  // Función para dibujar datos REALES del micrófono
  function drawRealAudio() {
    if (!audioCapture || !audioCapture.isCapturing) return;

    const frequencyData = audioCapture.getFrequencyData();
    
    if (frequencyData) {
      // Normalizar datos (0-255 → 0-1)
      const normalizedData = frequencyData.rawData.map(v => v / 255);
      
      // Dibujar en el espectrograma
      spectrogram.clear();
      normalizedData.forEach((intensity, index) => {
        spectrogram.addData(intensity);
      });
      spectrogram.draw();
    }

    animationFrame = requestAnimationFrame(drawRealAudio);
  }

  startBtn.addEventListener('click', async () => {
    if (isScanning) return;
    
    isScanning = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    
    statusDiv.className = 'status scanning';
    resultsDiv.innerHTML = '';
    
    try {
      // Paso 1: Obtener ubicación
      await getLocation();
      statusText.textContent = `Ubicación: ${userLocation.lat.toFixed(4)}, ${userLocation.lon.toFixed(4)}`;
      
      // Paso 2: Iniciar captura de audio REAL
      audioCapture = new AudioCapture();
      const micOk = await audioCapture.start();
      
      if (!micOk) {
        statusDiv.className = 'status error';
        statusIcon.textContent = '❌';
        statusText.textContent = 'No se pudo acceder al micrófono';
        isScanning = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        return;
      }
      
      statusText.textContent = '🎙️ Capturando audio real...';
      
      // Paso 3: Inicializar espectrograma
      spectrogram = new Spectrogram('spectrogram');
      spectrogram.clear();
      
      // Paso 4: Iniciar dibujo en tiempo real
      drawRealAudio();
      
      // Paso 5: Obtener frecuencias de la FCC
      await new Promise(resolve => setTimeout(resolve, 3000));
      const data = await fetchFrequencies(userLocation.lat, userLocation.lon);
      
      if (data && data.frequencies) {
        statusDiv.className = 'status success';
        statusIcon.textContent = '✅';
        statusText.textContent = `Se encontraron ${data.frequencies.length} señal(es) cerca de ti`;
        displayResults(data.frequencies);
      } else {
        statusDiv.className = 'status';
        statusIcon.textContent = '️';
        statusText.textContent = 'No se encontraron señales';
      }
    } catch (error) {
      statusDiv.className = 'status error';
      statusIcon.textContent = '❌';
      statusText.textContent = 'Error: ' + error.message;
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
    
    // Detener audio real
    if (audioCapture) {
      audioCapture.stop();
    }
    
    // Detener animación
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  });

  function displayResults(frequencies) {
    frequencies.forEach((freq, index) => {
      const card = document.createElement('div');
      card.className = 'frequency-card';
      card.innerHTML = `
        <h3> ${freq.frequency}</h3>
        <p><strong>Estado:</strong> ${freq.status}</p>
        <p><strong>Última actividad:</strong> ${freq.lastActive}</p>
        <p><strong>Ubicación:</strong> ${freq.location}</p>
        <p><strong>Descripción:</strong> ${freq.description}</p>
      `;
      resultsDiv.appendChild(card);
    });
  }
});
