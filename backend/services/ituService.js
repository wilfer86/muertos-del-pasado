// Servicio para obtener frecuencias históricas muertas
// Por ahora retorna datos de ejemplo hasta integrar FCC API

export const getDeadFrequencies = async (lat, lon) => {
  // Datos de ejemplo - luego se reemplazan con FCC API
  return {
    frequencies: [
      {
        id: '1',
        frequency: '103.5 FM',
        status: 'DEAD',
        lastActive: '1995-03-15',
        location: 'Unknown',
        description: 'Señal abandonada desde 1995'
      }
    ],
    message: 'API en desarrollo - Datos de ejemplo'
  };
};
