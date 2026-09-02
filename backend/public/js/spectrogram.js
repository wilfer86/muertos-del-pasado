class Spectrogram {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    this.data = [];
    this.maxDataPoints = 150;
    this.animationId = null;
    this.signalDetected = false;
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = rect.width - 50;
    this.height = isMobile() ? 250 : 350;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  clear() {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.data = [];
    this.signalDetected = false;
  }

  addData(intensity) {
    this.data.push(intensity);
    if (this.data.length > this.maxDataPoints) {
      this.data.shift();
    }
  }

  draw() {
    // Fondo con gradiente sutil
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(1, '#000000');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Cuadrícula más sutil
    this.ctx.strokeStyle = '#1a1a1a';
    this.ctx.lineWidth = 0.5;
    for (let i = 0; i < this.width; i += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, this.height);
      this.ctx.stroke();
    }
    for (let i = 0; i < this.height; i += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, i);
      this.ctx.lineTo(this.width, i);
      this.ctx.stroke();
    }

    // Dibujar espectro con variación
    const barWidth = this.width / this.maxDataPoints;
    
    this.data.forEach((intensity, index) => {
      // Crear patrón de "señal" con picos
      const gray = Math.floor(intensity * 200 + 55);
      const alpha = 0.4 + (intensity * 0.6);
      
      // Gradiente vertical para cada barra
      const barGradient = this.ctx.createLinearGradient(0, this.height, 0, this.height - (intensity * this.height));
      barGradient.addColorStop(0, `rgba(${gray}, ${gray}, ${gray}, ${alpha})`);
      barGradient.addColorStop(1, `rgba(${gray + 30}, ${gray + 30}, ${gray + 30}, ${alpha * 0.7})`);
      
      this.ctx.fillStyle = barGradient;
      
      const barHeight = intensity * this.height;
      const x = index * barWidth;
      const y = this.height - barHeight;
      
      this.ctx.fillRect(x, y, barWidth + 0.5, barHeight);
    });

    // Línea de umbral (indica qué es "señal" vs "ruido")
    this.ctx.strokeStyle = '#555555';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([3, 3]);
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height * 0.3);
    this.ctx.lineTo(this.width, this.height * 0.3);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Etiqueta de umbral
    this.ctx.fillStyle = '#666666';
    this.ctx.font = '10px monospace';
    this.ctx.fillText('UMBRAL DE SEÑAL', 5, this.height * 0.3 - 5);
  }

  simulateScan() {
    let frame = 0;
    let signalPhase = 0;
    
    const animate = () => {
      frame++;
      signalPhase += 0.05;
      
      // Simular detección de señal periódica (cada ~100 frames)
      const signalCycle = Math.sin(signalPhase) * 0.5 + 0.5;
      const isSignalActive = signalCycle > 0.7;
      
      let intensity;
      if (isSignalActive) {
        // Señal detectada: picos altos con variación
        intensity = 0.5 + Math.random() * 0.4 + Math.sin(frame * 0.2) * 0.1;
        this.signalDetected = true;
      } else {
        // Solo ruido de fondo
        intensity = 0.1 + Math.random() * 0.2;
        this.signalDetected = false;
      }
      
      this.addData(Math.max(0.05, Math.min(0.95, intensity)));
      this.draw();
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
    };
  }

  isSignalDetected() {
    return this.signalDetected;
  }
}

function isMobile() {
  return window.innerWidth <= 768;
}

export default Spectrogram;
