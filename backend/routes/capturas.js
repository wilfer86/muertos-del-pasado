const express = require('express');
const router = express.Router();
const Captura = require('../models/Captura');

// POST: Guardar una nueva captura
router.post('/', async (req, res) => {
  try {
    const {
      fecha,
      ubicacion,
      frecuenciasDetectadas,
      intensidadMaxima,
      duracion,
      audioUrl,
      analisisIA,
      potencialEnergetico,
      notas,
      userId
    } = req.body;

    const nuevaCaptura = new Captura({
      fecha: fecha || new Date(),
      ubicacion,
      frecuenciasDetectadas: frecuenciasDetectadas || [],
      intensidadMaxima: intensidadMaxima || 0,
      duracion: duracion || 0,
      audioUrl: audioUrl || null,
      analisisIA: analisisIA || null,
      potencialEnergetico: potencialEnergetico || 'bajo',
      notas: notas || '',
      userId: userId || 'anonimo'
    });

    const capturaGuardada = await nuevaCaptura.save();
    
    res.status(201).json({
      success: true,
      message: 'Captura guardada exitosamente',
      data: capturaGuardada
    });
  } catch (error) {
    console.error('Error al guardar captura:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar captura',
      error: error.message
    });
  }
});

// GET: Obtener todas las capturas (para tu estudio)
router.get('/', async (req, res) => {
  try {
    const capturas = await Captura.find()
      .sort({ fecha: -1 })
      .limit(100);
    
    res.status(200).json({
      success: true,
      count: capturas.length,
      data: capturas
    });
  } catch (error) {
    console.error('Error al obtener capturas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener capturas',
      error: error.message
    });
  }
});

// GET: Obtener estadísticas
router.get('/stats', async (req, res) => {
  try {
    const total = await Captura.countDocuments();
    const conAudio = await Captura.countDocuments({ audioUrl: { $ne: null } });
    const porPotencial = await Captura.aggregate([
      { $group: { _id: '$potencialEnergetico', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        total,
        conAudio,
        porPotencial
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
