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

document.addEventListener('DOMContentLoaded', async () => {
  applyBackground();
  window.addEventListener('resize', applyBackground);
  
  // Inicializar base de datos al cargar
  try {
    await database.init();
    console.log(' Base de datos lista');
  } catch (error) {
    console.error('Error al inicializar BD:', error);
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
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  // Iniciar grabación de audio
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
      console.error('Error al grabar audio:', error);
    }
  }

  // Detener grabación y obtener blob
  function stopRecording() {
    return new Promise((resolve) => {
      if (audioRecorder && audioRecorder.state !== 'inactive') {
        audioRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          resolve(audioBlob);
          // Liberar micrófono
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
    statusText.textContent = 'Iniciando captura científica...';
    resultsDiv.innerHTML = '';
    
    try {
      // 1. Ubicación GPS
      await getLocation();
      statusText.textContent = `📍 ${userLocation.lat.toFixed(4)}, ${userLocation.lon.toFixed(4)}`;
      
      // 2. Captura de audio real
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
      
      // 3. Iniciar grabación para guardar
      await startRecording();
      
      // 4. Espectrograma en tiempo real
      spectrogram = new Spectrogram('spectrogram');
      spectrogram.clear();
      drawRealAudio();
      
      // 5. Esperar 5 segundos de captura
      statusText.textContent = '🎙️ Capturando datos (5s)...';
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 6. Detener grabación
      const audioBlob = await stopRecording();
      
      // 7. Obtener frecuencias FCC
      const data = await fetchFrequencies(userLocation.lat, userLocation.lon);
      
      // 8. Guardar captura en base de datos local
      const captura = {
        fecha: new Date().toISOString(),
        ubicacion: userLocation,
        frecuenciasDetectadas: data?.frequencies || [],
        intensidadMaxima: audioCapture ? 0.8 : 0,
        duracion: 5,
        audioBlob: audioBlob,
        notas: 'Captura automática'
      };
      
      const idGuardado = await database.guardarCaptura(captura);
      console.log(' Captura guardada con ID:', idGuardado);
      
      // 9. Mostrar resultados
      if (data && data.frequencies && data.frequencies.length > 0) {
        statusDiv.className = 'status success';
        statusIcon.textContent = '✅';
        statusText.textContent = `${data.frequencies.length} señal(es) | Guardada en BD #${idGuardado}`;
        displayResults(data.frequencies);
      } else {
        statusDiv.className = 'status success';
        statusIcon.textContent = '💾';
        statusText.textContent = `Datos guardados localmente (ID: ${idGuardado})`;
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
    
    if (audioCapture) audioCapture.stop();
    if (animationFrame) cancelAnimationFrame(animationFrame);
  });

  function displayResults(frequencies) {
    frequencies.forEach((freq, index) => {
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
