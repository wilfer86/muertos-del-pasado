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

// Función auxiliar global para convertir Blob a Base64
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
  
  // Inicializar Base de Datos Local
  try {
    await database.init();
    console.log('✅ BD Local inicializada');
  } catch (error) {
    console.error('❌ Error BD:', error);
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
      // Configuración de ALTA CALIDAD para investigación científica (sin filtros que borren frecuencias)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: 44100,
          sampleSize: 16
        }
      });
      
      audioRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000 // 128 kbps (buena calidad, tamaño manejable)
      });
      audioChunks = [];
      
      audioRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      audioRecorder.start();
    } catch (error) {
      console.error('❌ Error al iniciar grabación:', error);
    }
  }

  function stopRecording() {
    return new Promise((resolve) => {
      if (audioRecorder && audioRecorder.state !== 'inactive') {
        audioRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          resolve(audioBlob);
          // Liberar el micrófono
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
    statusText.textContent = 'Solicitando permisos...';
    resultsDiv.innerHTML = '';
    
    try {
      // 1. Obtener GPS
      await getLocation();
      statusText.textContent = `📍 GPS OK: ${userLocation.lat.toFixed(4)}, ${userLocation.lon.toFixed(4)}`;
      
      // 2. Iniciar captura de espectro
      audioCapture = new AudioCapture();
      const micOk = await audioCapture.start();
      
      if (!micOk) {
        throw new Error('No se pudo acceder al micrófono');
      }
      
      // 3. Iniciar grabación de audio
      await startRecording();
      
      // 4. Iniciar espectrograma visual
      spectrogram = new Spectrogram('spectrogram');
      spectrogram.clear();
      drawRealAudio();
      
      // 5. ESPERAR 60 SEGUNDOS (1 MINUTO)
      statusText.textContent = '🎙️ Capturando audio y espectro (60s)...';
      await new Promise(resolve => setTimeout(resolve, 60000));
      
      // 6. Detener grabación
      const audioBlob = await stopRecording();
      
      // 7. Obtener frecuencias de la API
      const data = await fetchFrequencies(userLocation.lat, userLocation.lon);
      
      // 8. Guardar en Base de Datos LOCAL (IndexedDB)
      const idLocal = await database.guardarCaptura({
        fecha: new Date().toISOString(),
        ubicacion: userLocation,
        frecuenciasDetectadas: data?.frequencies || [],
        intensidadMaxima: 0.8,
        duracion: 60,
        audioBlob: audioBlob,
        notas: 'Captura científica 60s'
      });
      console.log('💾 Guardado local ID:', idLocal);
      
      // 9. Enviar a MongoDB (NUBE) CON AUDIO
      try {
        console.log('🔄 Convirtiendo audio a base64 para la nube...');
        const audioBase64 = audioBlob ? await window.blobToBase64(audioBlob) : null;
        console.log('📦 Tamaño del audio:', audioBase64 ? (audioBase64.length / 1024 / 1024).toFixed(2) + ' MB' : '0 MB');

        const response = await fetch('/api/capturas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fecha: new Date().toISOString(),
            ubicacion: userLocation,
            frecuenciasDetectadas: data?.frequencies || [],
            intensidadMaxima: 0.8,
            duracion: 60,
            audioUrl: audioBase64, // ¡AUDIO INCLUIDO!
            notas: 'Captura científica con audio',
            userId: 'user_' + Date.now()
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ MongoDB + Audio guardado exitosamente:', result.data._id);
          statusText.textContent = `✅ Guardado Local #${idLocal} + Nube`;
        } else {
          const errorData = await response.json();
          console.error('❌ Error al enviar a MongoDB:', errorData);
        }
      } catch (e) {
        console.error('⚠️ Error de red enviando a MongoDB:', e.message);
      }
      
      // 10. Mostrar resultados en pantalla
      if (data && data.frequencies && data.frequencies.length > 0) {
        statusDiv.className = 'status success';
        statusIcon.textContent = '✅';
        statusText.textContent = `${data.frequencies.length} señal(es) | ID Local: ${idLocal}`;
        displayResults(data.frequencies);
      } else {
        statusDiv.className = 'status success';
        statusIcon.textContent = '💾';
        statusText.textContent = `Captura guardada (ID: ${idLocal})`;
      }
      
    } catch (error) {
      statusDiv.className = 'status error';
      statusIcon.textContent = '❌';
      statusText.textContent = 'Error: ' + error.message;
      console.error(error);
      isScanning = false;
      startBtn.disabled = false;
      stopBtn.disabled = true;
    }
  });

  stopBtn.addEventListener('click', () => {
    if (!isScanning) return;
    
    isScanning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    statusDiv.className = 'status';
    statusIcon.textContent = '⏸️';
    statusText.textContent = 'Captura detenida manualmente';
    
    if (audioCapture) audioCapture.stop();
    if (animationFrame) cancelAnimationFrame(animationFrame);
    if (audioRecorder && audioRecorder.state !== 'inactive') {
      audioRecorder.stop();
    }
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
