// Servicio para conectar a streams SDR públicos
// Por ahora retorna información de ejemplo

export const getAvailableStreams = async () => {
  return {
    streams: [
      {
        name: 'WebSDR Twente',
        url: 'https://websdr.ewi.utwente.nl:8901/',
        location: 'Netherlands',
        status: 'active'
      }
    ]
  };
};
