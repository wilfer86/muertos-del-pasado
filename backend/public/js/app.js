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

// Generar ID único permanente para este dispositivo
function getDeviceId() {
  let deviceId = localStorage.getItem('mdp_device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('mdp_device_id', deviceId);
  }
  return deviceId;
}

document.addEventListener('DOMContentLoaded', async () => {
  applyBackground();
  window.addEventListener('resize', applyBackground);
  
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
  let direccionInfo = null;

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

  // Obtener dirección civil desde OpenStreetMap
  async function obtenerDireccion() {
    try {
      statusText.textContent = '📍 Obteniendo dirección...';
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.lat}&lon=${userLocation.lon}&zoom=18&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MuertosDelPasado-App/1.0'
        }
      });
      
      if (!response.ok) throw new Error('Error en geocoding');
      
      const data = await response.json();
      const address = data.address || {};
      
      const partes = [];
      if (address.road) partes.push(address.road);
      if (address.suburb || address.neighbourhood) partes.push(address.suburb || address.neighbourhood);
      if (address.city || address.town || address.village) partes.push(address.city || address.town || address.village);
      if (address.state) partes.push(address.state);
      if (address.country) partes.push(address.country);
      
      direccionInfo = {
        direccion: partes.join(', ') || 'Dirección desconocida',
        barrio: address.suburb || address.neighbourhood || 'Desconocido',
        ciudad: address.city || address.town || address.village || 'Desconocida',
        pais: address.country || 'Desconocido',
        nombreLugar: address.name || address.road || 'Sin nombre'
      };
      
      console.log('📍 Dirección:', direccionInfo.direccion);
    } catch (error) {
      console.error('Error geocoding:', error);
      direccionInfo = {
        direccion: `Coordenadas: ${userLocation.lat.toFixed(4)}, ${userLocation.lon.toFixed(4)}`,
        barrio: 'Desconocido',
        ciudad: 'Desconocida',
        pais: 'Desconocido',
        nombreLugar: 'Sin datos'
      };
    }
  }

  async function startRecording() {
    try {
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
        audioBitsPerSecond: 128000
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
      statusText.textContent = `📍 GPS: ${userLocation.lat.toFixed(4)}, ${userLocation.lon.toFixed(4)}`;
      
      // 2. Obtener dirección civil
      await obtenerDireccion();
      statusText.textContent = `📍 ${direccionInfo.direccion}`;
      
      // 3. Iniciar captura de espectro
      audioCapture = new AudioCapture();
      const micOk = await audioCapture.start();
      
      if (!micOk) {
        throw new Error('No se pudo acceder al micrófono');
      }
      
      // 4. Iniciar grabación de audio
      await startRecording();
      
      // 5. Iniciar espectrograma visual
      spectrogram = new Spectrogram('spectrogram');
      spectrogram.clear();
      drawRealAudio();
      
      // 6. ESPERAR 60 SEGUNDOS
      statusText.textContent = '🎙️ Capturando audio y espectro (60s)...';
      await new Promise(resolve => setTimeout(resolve, 60000));
      
      // 7. Detener grabación
      const audioBlob = await stopRecording();
      
      // 8. Obtener frecuencias de la API
      const data = await fetchFrequencies(userLocation.lat, userLocation.lon);
      
      // 9. Generar ID único del dispositivo
      const deviceId = getDeviceId();
      
      // 10. Guardar en Base de Datos LOCAL
      const idLocal = await database.guardarCaptura({
        fecha: new Date().toISOString(),
        ubicacion: userLocation,
        direccion: direccionInfo.direccion,
        frecuenciasDetectadas: data?.frequencies || [],
        intensidadMaxima: 0.8,
        duracion: 60,
        audioBlob: audioBlob,
        notas: 'Captura científica 60s'
      });
      console.log('💾 Guardado local ID:', idLocal);
      
      // 11. Enviar a MongoDB CON TODOS LOS DATOS
      let capturaMongoId = null;
      
      try {
        console.log('🔄 Convirtiendo audio a base64...');
        const audioBase64 = audioBlob ? await window.blobToBase64(audioBlob) : null;
        console.log(' Tamaño del audio:', audioBase64 ? (audioBase64.length / 1024 / 1024).toFixed(2) + ' MB' : '0 MB');

        const response = await fetch('/api/capturas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fecha: new Date().toISOString(),
            ubicacion: userLocation,
            direccionCivil: direccionInfo.direccion,
            barrio: direccionInfo.barrio,
            ciudad: direccionInfo.ciudad,
            pais: direccionInfo.pais,
            frecuenciasDetectadas: data?.frequencies || [],
            intensidadMaxima: 0.8,
            duracion: 60,
            audioUrl: audioBase64,
            notas: 'Captura científica con audio',
            userId: 'investigador_' + deviceId.substring(0, 15),
            deviceId: deviceId
          })
        });

        if (response.ok) {
          const result = await response.json();
          capturaMongoId = result.data._id;
          console.log('✅ MongoDB guardado:', capturaMongoId);
        } else {
          const errorData = await response.json();
          console.error('❌ Error MongoDB:', errorData);
        }
      } catch (e) {
        console.error('⚠️ Error de red MongoDB:', e.message);
      }
      
      // 12. Mostrar resultados CON BOTÓN DIRECTO A LA CAPTURA
      if (capturaMongoId) {
        // Si se guardó en MongoDB, mostrar botón para ver la captura
        const capturaUrl = window.location.origin + '/captura.html?id=' + capturaMongoId;
        
        statusDiv.className = 'status success';
        statusIcon.textContent = '✅';
        statusText.textContent = `Captura guardada: ${direccionInfo.direccion}`;
        
        resultsDiv.innerHTML = `
          <div style="background: #001a33; border: 2px solid #00d4ff; padding: 25px; border-radius: 10px; margin-top: 20px; text-align: center;">
            <h3 style="color: #00d4ff; margin-bottom: 15px;">🎧 Tu Captura está lista</h3>
            <p style="margin-bottom: 20px; color: #aaa;">
              Haz clic para ver y escuchar tu evidencia científica
            </p>
            <a href="${capturaUrl}" 
               style="background: #00d4ff; color: #000; padding: 15px 30px; border-radius: 5px; text-decoration: none; font-weight: bold; display: inline-block; margin: 10px 0;">
              🔬 Ver Mi Captura
            </a>
            <p style="margin-top: 20px; font-size: 0.85em; color: #666;">
              ID: ${capturaMongoId.substring(0, 8)}...
            </p>
          </div>
        `;
      } else {
        // Si solo se guardó localmente
        statusDiv.className = 'status success';
        statusIcon.textContent = '💾';
        statusText.textContent = `Captura guardada localmente: ${direccionInfo.direccion}`;
        
        resultsDiv.innerHTML = `
          <div style="background: #1a1a1a; border: 2px solid #666; padding: 25px; border-radius: 10px; margin-top: 20px; text-align: center;">
            <h3 style="color: #fff; margin-bottom: 15px;">💾 Captura guardada localmente</h3>
            <p style="color: #aaa;">
              ID Local: ${idLocal}
            </p>
            <p style="margin-top: 15px; font-size: 0.85em; color: #666;">
              La captura se guardó en tu dispositivo pero no se pudo enviar a la nube
            </p>
          </div>
        `;
      }
      
      // Mostrar frecuencias detectadas
      if (data && data.frequencies && data.frequencies.length > 0) {
        displayResults(data.frequencies);
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
