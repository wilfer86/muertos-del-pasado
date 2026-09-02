// Servicio para obtener frecuencias históricas muertas usando la API de la FCC
// Node.js 18+ tiene fetch nativo, no necesitamos importar 'https'

const getDeadFrequencies = async (lat, lon) => {
  try {
    // Si no hay coordenadas, usar ubicación por defecto (Nueva York como ejemplo)
    const latitude = lat || 40.7128;
    const longitude = lon || -74.0060;
    const radius = 100; // km alrededor

    // Consulta a la FCC API - licencias canceladas/expiradas
    const url = `https://api.fcc.gov/api/v1/license?latitude=${latitude}&longitude=${longitude}&radius=${radius}&status=cancelled&limit=10`;
    
    // Usamos fetch nativo de Node.js
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Procesar resultados
    if (data.results && data.results.length > 0) {
      const frequencies = data.results.map((license, index) => ({
        id: String(index + 1),
        frequency: `${license.frequency || 'Unknown'} MHz`,
        status: 'DEAD',
        lastActive: license.dateCancelled || license.dateExpired || 'Unknown',
        location: `${license.city || 'Unknown'}, ${license.state || ''}`,
        description: `Licencia ${license.radioServiceCode || ''} cancelada. Operador: ${license.applicantName || 'Desconocido'}`,
        callSign: license.callSign || 'N/A'
      }));
      
      return {
        frequencies,
        message: `Frecuencias abandonadas encontradas cerca de ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
        searchRadius: `${radius} km`
      };
    } else {
      return {
        frequencies: [],
        message: `No se encontraron licencias canceladas en ${radius}km. Intenta con otra zona.`,
        searchRadius: `${radius} km`
      };
    }
  } catch (error) {
    console.error('Error consultando FCC:', error);
    // Si falla, devolvemos un fallback para que la app no se rompa
    return {
      frequencies: [{
        id: '1',
        frequency: '103.5 FM',
        status: 'DEAD',
        lastActive: '1995-03-15',
        location: 'Desconocida',
        description: 'Señal de respaldo (API FCC no respondió)'
      }],
      message: 'Usando datos de respaldo por error de conexión a FCC.',
      error: error.message
    };
  }
};

// Exportación en formato CommonJS (el que usa tu server.js)
module.exports = { getDeadFrequencies };
