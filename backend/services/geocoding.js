// Servicio de Geocoding Inverso: Convierte coordenadas GPS en dirección civil legible
// Usa OpenStreetMap Nominatim (GRATIS, sin API key)

async function obtenerDireccionCivil(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MuertosDelPasado-App/1.0 (Scientific Research Project)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Construir dirección legible
    const address = data.address || {};
    const partes = [];
    
    if (address.road) partes.push(address.road);
    if (address.suburb || address.neighbourhood) partes.push(address.suburb || address.neighbourhood);
    if (address.city || address.town || address.village) partes.push(address.city || address.town || address.village);
    if (address.state) partes.push(address.state);
    if (address.country) partes.push(address.country);
    
    const direccionCompleta = partes.join(', ');
    
    return {
      direccion: direccionCompleta || 'Dirección desconocida',
      barrio: address.suburb || address.neighbourhood || 'Desconocido',
      ciudad: address.city || address.town || address.village || 'Desconocida',
      pais: address.country || 'Desconocido',
      tipo: address.type || 'desconocido',
      nombreLugar: address.name || address.road || 'Sin nombre'
    };
    
  } catch (error) {
    console.error('Error en geocoding:', error);
    return {
      direccion: `Coordenadas: ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      barrio: 'Desconocido',
      ciudad: 'Desconocida',
      pais: 'Desconocido',
      tipo: 'error',
      nombreLugar: 'Sin datos'
    };
  }
}

module.exports = { obtenerDireccionCivil };
