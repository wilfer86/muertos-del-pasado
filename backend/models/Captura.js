const mongoose = require('mongoose');

const capturaSchema = new mongoose.Schema({
  fecha: {
    type: Date,
    default: Date.now
  },
  ubicacion: {
    lat: { type: Number, required: true },
    lon: { type: Number, required: true }
  },
  direccionCivil: {
    type: String,
    default: 'Desconocida'
  },
  barrio: {
    type: String,
    default: 'Desconocido'
  },
  ciudad: {
    type: String,
    default: 'Desconocida'
  },
  pais: {
    type: String,
    default: 'Desconocido'
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
    default: 0
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
  deviceId: {
    type: String,
    default: 'desconocido'
  },
  timestamp: {
    type: Number,
    default: Date.now
  }
}, {
  timestamps: true
});

capturaSchema.index({ 'ubicacion.lat': 1, 'ubicacion.lon': 1 });
capturaSchema.index({ fecha: -1 });
capturaSchema.index({ userId: 1 });

module.exports = mongoose.model('Captura', capturaSchema);
