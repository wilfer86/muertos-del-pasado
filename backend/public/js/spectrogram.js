class Spectrogram {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    this.data = [];
    this.maxDataPoints = 200;
    this.animationId = null;
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = rect.width - 50; // Restar padding
    this.height = isMobile() ? 250 : 350;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  clear() {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.data = [];
  }

  addData(intensity) {
    this.data.push(intensity);
    if (this.data.length > this.maxDataPoints) {
      this.data.shift();
    }
  }

  draw() {
    // Fondo negro
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Dibujar líneas de cuadrícula
    this.ctx.strokeStyle = '#1a1a1a';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < this.width; i += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, this.height);
      this.ctx.stroke();
    }
    for (let i = 0; i < this.height; i += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, i);
      this.ctx.lineTo(this.width, i);
      this.ctx.stroke();
    }

    // Dibujar datos del espectro
    const barWidth = this.width / this.maxDataPoints;
    
    this.data.forEach((intensity, index) => {
      // Gradiente de gris
      const gray = Math.floor(intensity * 255);
      const alpha = 0.3 + (intensity * 0.7);
      this.ctx.fillStyle = `rgba(${gray}, ${gray}, ${gray}, ${alpha})`;
      
      const barHeight = intensity * this.height;
      const x = index * barWidth;
      const y = this.height - barHeight;
      
      this.ctx.fillRect(x, y, barWidth + 1, barHeight);
    });

    // Línea central de referencia
    this.ctx.strokeStyle = '#444444';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height / 2);
    this.ctx.lineTo(this.width, this.height / 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  simulateScan() {
    let frame = 0;
    const animate = () => {
      frame++;
      // Generar patrón de onda más realista
      const intensity = 0.1 + Math.random() * 0.6 + Math.sin(frame * 0.1) * 0.2;
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
}

// Helper para detectar móvil
function isMobile() {
  return window.innerWidth <= 768;
}

export default Spectrogram;
