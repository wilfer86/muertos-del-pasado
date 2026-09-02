// Cliente API para conectar con el backend
const API_BASE = window.location.origin;

export async function fetchFrequencies(lat = null, lon = null) {
  try {
    let url = `${API_BASE}/api/frequencies`;
    if (lat && lon) {
      url += `?lat=${lat}&lon=${lon}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Frecuencias obtenidas:', data);
    return data;
  } catch (error) {
    console.error('Error al obtener frecuencias:', error);
    return null;
  }
}

export async function analyzeSignal(signalData) {
  try {
    const response = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(signalData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error al analizar señal:', error);
    return null;
  }
}
