const mongoose = require('mongoose');

const capturaSchema = new mongoose.Schema({
  fecha: {
    type: Date,
    default: Date.now
  },
  ubicacion: {
    lat: {
      type: Number,
      required: true
    },
    lon: {
      type: Number,
      required: true
    }
  },
  frecuenciasDetectadas: [{
    frecuencia: String,
    estado: String,
    ultimaActividad: String,
    ubicacion: String,
    descripcion: String
  }],
  intensidadMaxima: {
    type: Number,
    default: 0
  },
  duracion: {
    type: Number,
    default: 0 // en segundos
  },
  audioUrl: {
    type: String,
    default: null
  },
  analisisIA: {
    type: String,
    default: null
  },
  potencialEnergetico: {
    type: String,
    enum: ['alto', 'medio', 'bajo'],
    default: 'bajo'
  },
  notas: {
    type: String,
    default: ''
  },
  userId: {
    type: String,
    default: 'anonimo'
  },
  timestamp: {
    type: Number,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índice para búsquedas rápidas por ubicación
capturaSchema.index({ 'ubicacion.lat': 1, 'ubicacion.lon': 1 });
capturaSchema.index({ fecha: -1 });

module.exports = mongoose.model('Captura', capturaSchema);
