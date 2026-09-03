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
    statusText.textContent = ` ${userLocation.lat.toFixed(4)}, ${userLocation.lon.toFixed(4)}`;
    
    // 2. Captura de audio real
    audioCapture = new AudioCapture();
    const micOk = await audioCapture.start();
    
    if (!micOk) {
      throw new Error('No se pudo acceder al micrófono');
    }
    
    // 3. Iniciar grabación
    await startRecording();
    
    // 4. Espectrograma
    spectrogram = new Spectrogram('spectrogram');
    spectrogram.clear();
    drawRealAudio();
    
    // 5. Esperar 5 segundos
    statusText.textContent = '️ Capturando datos (5s)...';
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 6. Detener grabación
    const audioBlob = await stopRecording();
    
    // 7. Obtener frecuencias FCC
    const data = await fetchFrequencies(userLocation.lat, userLocation.lon);
    
    // 8. Guardar en IndexedDB (local)
    const capturaLocal = {
      fecha: new Date().toISOString(),
      ubicacion: userLocation,
      frecuenciasDetectadas: data?.frequencies || [],
      intensidadMaxima: 0.8,
      duracion: 5,
      audioBlob: audioBlob,
      notas: 'Captura automática'
    };
    
    const idLocal = await database.guardarCaptura(capturaLocal);
    console.log('💾 Guardado local ID:', idLocal);
    
    // 9. ENVIAR A MONGODB (nuevo)
    try {
      // Convertir blob a base64 para enviar
      const audioBase64 = audioBlob ? await blobToBase64(audioBlob) : null;
      
      const capturaMongo = {
        fecha: new Date().toISOString(),
        ubicacion: userLocation,
        frecuenciasDetectadas: data?.frequencies || [],
        intensidadMaxima: 0.8,
        duracion: 5,
        audioUrl: audioBase64, // En base64
        notas: 'Captura desde app',
        userId: 'anonimo_' + Date.now()
      };
      
      console.log('📤 Enviando a MongoDB...');
      
      const response = await fetch('/api/capturas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(capturaMongo)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Guardado en MongoDB:', result.data._id);
        statusText.textContent = `✅ Guardado local #${idLocal} + MongoDB`;
      } else {
        console.error('❌ Error al enviar a MongoDB');
      }
    } catch (error) {
      console.error('Error MongoDB:', error);
      // No falla la app si MongoDB falla
    }
    
    // 10. Mostrar resultados
    if (data && data.frequencies && data.frequencies.length > 0) {
      statusDiv.className = 'status success';
      statusIcon.textContent = '✅';
      statusText.textContent = `${data.frequencies.length} señal(es) | ID: ${idLocal}`;
      displayResults(data.frequencies);
    } else {
      statusDiv.className = 'status success';
      statusIcon.textContent = '💾';
      statusText.textContent = `Datos guardados localmente (ID: ${idLocal})`;
    }
    
  } catch (error) {
    statusDiv.className = 'status error';
    statusIcon.textContent = '❌';
    statusText.textContent = 'Error: ' + error.message;
    console.error(error);
  }
});

// Helper: convertir Blob a Base64
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
