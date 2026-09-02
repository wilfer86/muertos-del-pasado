const https = require('https');

// Función para hacer peticiones HTTP
function fetchFromFCC(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Obtener frecuencias abandonadas cerca de una ubicación
export const getDeadFrequencies = async (lat, lon) => {
  try {
    // Si no hay coordenadas, usar ubicación por defecto (Nueva York)
    const latitude = lat || 40.7128;
    const longitude = lon || -74.0060;
    const radius = 100; // km alrededor

    // Consulta a la FCC API - licencias canceladas/expiradas
    const url = `https://api.fcc.gov/api/v1/license?latitude=${latitude}&longitude=${longitude}&radius=${radius}&status=cancelled&limit=10`;
    
    const response = await fetchFromFCC(url);
    
    // Procesar resultados
    if (response.results && response.results.length > 0) {
      const frequencies = response.results.map((license, index) => ({
        id: String(index + 1),
        frequency: `${license.frequency || 'Unknown'} MHz`,
        status: 'DEAD',
        lastActive: license.dateCancelled || license.dateExpired || 'Unknown',
        location: `${license.city || 'Unknown'}, ${license.state || ''}`,
        description: `Licencia ${license.radioServiceCode || ''} cancelada. Operador: ${license.applicantName || 'Desconocido'}`,
        callSign: license.callSign || 'N/A',
        originalPurpose: license.radioServiceCode || 'Broadcast'
      }));
      
      return {
        frequencies,
        message: `Frecuencias abandonadas encontradas cerca de ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
        searchRadius: `${radius} km`
      };
    } else {
      // Si no hay resultados, devolver mensaje informativo
      return {
        frequencies: [],
        message: `No se encontraron licencias canceladas en ${radius}km alrededor de tu ubicación. Intenta con otra zona.`,
        searchRadius: `${radius} km`
      };
    }
  } catch (error) {
    console.error('Error consultando FCC:', error);
    return {
      frequencies: [],
      message: 'Error al conectar con la base de datos FCC. Intenta de nuevo.',
      error: error.message
    };
  }
};
