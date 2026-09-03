// Módulo de captura de audio científico
// Usa Web Audio API para análisis espectral real (FFT)

class AudioCapture {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.dataArray = null;
    this.isCapturing = false;
    this.frequencyRange = { min: 100, max: 10000 }; // Hz - rango de interés científico
  }

  // Solicitar permiso y iniciar captura
  async start() {
    try {
      // Pedir acceso al micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      // Crear contexto de audio
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Crear analizador FFT
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048; // Resolución del análisis
      this.analyser.smoothingTimeConstant = 0.3;

      // Conectar micrófono al analizador
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);

      // Preparar array para datos de frecuencia
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      this.isCapturing = true;
      console.log('✅ Captura de audio iniciada');
      return true;

    } catch (error) {
      console.error('❌ Error al acceder al micrófono:', error);
      return false;
    }
  }

  // Detener captura
  stop() {
    if (this.microphone) {
      this.microphone.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.isCapturing = false;
    console.log('⏹️ Captura detenida');
  }

  // Obtener datos de frecuencia en tiempo real
  getFrequencyData() {
    if (!this.isCapturing || !this.analyser) {
      return null;
    }

    this.analyser.getByteFrequencyData(this.dataArray);

    // Filtrar solo el rango de interés (100Hz - 10kHz)
    const sampleRate = this.audioContext.sampleRate;
    const binSize = sampleRate / this.analyser.fftSize;
    const minBin = Math.floor(this.frequencyRange.min / binSize);
    const maxBin = Math.floor(this.frequencyRange.max / binSize);

    const filteredData = Array.from(this.dataArray.slice(minBin, maxBin));
    
    return {
      rawData: filteredData,
      maxIntensity: Math.max(...filteredData) / 255,
      averageIntensity: filteredData.reduce((a, b) => a + b, 0) / filteredData.length / 255,
      sampleRate: sampleRate,
      binSize: binSize
    };
  }

  // Detectar picos anómalos (posibles psicofonías)
  detectAnomalies(threshold = 0.7) {
    const data = this.getFrequencyData();
    if (!data) return [];

    const anomalies = [];
    data.rawData.forEach((value, index) => {
      const normalizedValue = value / 255;
      if (normalizedValue > threshold) {
        const frequency = index * data.binSize;
        anomalies.push({
          frequency: frequency.toFixed(1),
          intensity: normalizedValue.toFixed(3),
          timestamp: Date.now()
        });
      }
    });

    return anomalies;
  }
}

export default AudioCapture;
