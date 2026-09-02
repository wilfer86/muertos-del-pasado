// Visualización del espectrograma
class Spectrogram {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.offsetWidth;
    this.height = this.canvas.offsetHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.data = [];
    this.maxDataPoints = 200;
  }

  clear() {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.data = [];
  }

  addData(intensity) {
    // Intensidad entre 0 y 1
    this.data.push(intensity);
    if (this.data.length > this.maxDataPoints) {
      this.data.shift();
    }
  }

  draw() {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);

    const barWidth = this.width / this.maxDataPoints;
    
    this.data.forEach((intensity, index) => {
      // Gradiente de gris basado en intensidad
      const gray = Math.floor(intensity * 255);
      this.ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
      
      const barHeight = intensity * this.height;
      const x = index * barWidth;
      const y = this.height - barHeight;
      
      this.ctx.fillRect(x, y, barWidth, barHeight);
    });

    // Línea de referencia
    this.ctx.strokeStyle = '#333333';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height / 2);
    this.ctx.lineTo(this.width, this.height / 2);
    this.ctx.stroke();
  }

  simulateScan() {
    // Simula datos de escaneo para demostración
    const interval = setInterval(() => {
      const intensity = Math.random() * 0.8 + 0.1;
      this.addData(intensity);
      this.draw();
    }, 100);

    return () => clearInterval(interval);
  }
}

export default Spectrogram;
