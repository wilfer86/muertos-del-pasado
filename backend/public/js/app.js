import { fetchFrequencies } from './apiClient.js';
import Spectrogram from './spectrogram.js';
import AudioCapture from './audioCapture.js';
import database from './database.js';

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

// Función auxiliar global
window.blobToBase64 = function(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

document.addEventListener('DOMContentLoaded', async () => {
  applyBackground();
  window.addEventListener('resize', applyBackground);
  
  // Inicializar BD
  try {
    await database.init();
    console.log('✅ BD inicializada');
  } catch (error) {
    console.error('Error BD:', error);
  }
  
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
  let audioRecorder = null;
  let audioChunks = [];

  function getLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no disponible'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          userLocation = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };
          resolve(userLocation);
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioRecorder = new MediaRecorder(stream);
      audioChunks = [];
      
      audioRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      audioRecorder.start();
    } catch (error) {
      console.error('Error grabación:', error);
    }
  }

  function stopRecording() {
    return new Promise((resolve) => {
      if (audioRecorder && audioRecorder.state !== 'inactive') {
        audioRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          resolve(audioBlob);
          audioRecorder.stream.getTracks().forEach(track => track.stop());
        };
        audioRecorder.stop();
      } else {
        resolve(null);
      }
    });
  }

  function drawRealAudio() {
    if (!audioCapture || !audioCapture.isCapturing) return;

    const frequencyData = audioCapture.getFrequencyData();
    
    if (frequencyData) {
      const normalizedData = frequencyData.rawData.map(v => v / 255);
      spectrogram.clear();
      normalizedData.forEach((intensity) => {
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
    statusIcon.textContent = '🔍';
    statusText.textContent = 'Iniciando...';
    resultsDiv.innerHTML = '';
    
    try {
      await getLocation();
      statusText.textContent = ` GPS OK`;
      
      audioCapture = new AudioCapture();
      const micOk = await audioCapture.start();
      
      if (!micOk) {
        throw new Error('No hay micrófono');
      }
      
      await startRecording();
      
      spectrogram = new Spectrogram('spectrogram');
      spectrogram.clear();
      drawRealAudio();
      
      statusText.textContent = '️ Capturando (5s)...';
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const audioBlob = await stopRecording();
      
      const data = await fetchFrequencies(userLocation.lat, userLocation.lon);
      
      // Guardar local
      const idLocal = await database.guardarCaptura({
        fecha: new Date().toISOString(),
        ubicacion: userLocation,
        frecuenciasDetectadas: data?.frequencies || [],
        intensidadMaxima: 0.8,
        duracion: 5,
        audioBlob: audioBlob,
        notas: 'Captura'
      });
      
      console.log('💾 Local ID:', idLocal);
      
      // Enviar a MongoDB (sin audio para evitar problemas de tamaño)
      try {
        const response = await fetch('/api/capturas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fecha: new Date().toISOString(),
            ubicacion: userLocation,
            frecuenciasDetectadas: data?.frequencies || [],
            intensidadMaxima: 0.8,
            duracion: 5,
            notas: 'Captura app',
            userId: 'user_' + Date.now()
          })
        });
        
        if (response.ok) {
          console.log('✅ MongoDB OK');
        }
      } catch (e) {
        console.log('⚠️ MongoDB offline:', e.message);
      }
      
      // Mostrar resultado
      if (data && data.frequencies && data.frequencies.length > 0) {
        statusDiv.className = 'status success';
        statusIcon.textContent = '✅';
        statusText.textContent = `${data.frequencies.length} señal(es) | ID: ${idLocal}`;
        displayResults(data.frequencies);
      } else {
        statusDiv.className = 'status success';
        statusIcon.textContent = '💾';
        statusText.textContent = `Guardado ID: ${idLocal}`;
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
    statusText.textContent = 'Detenido';
    
    if (audioCapture) audioCapture.stop();
    if (animationFrame) cancelAnimationFrame(animationFrame);
  });

  function displayResults(frequencies) {
    frequencies.forEach((freq) => {
      const card = document.createElement('div');
      card.className = 'frequency-card';
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
