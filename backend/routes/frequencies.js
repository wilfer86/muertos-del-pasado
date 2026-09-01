const express = require('express');
const router = express.Router();
const { getDeadFrequencies } = require('../services/ituService');

// GET /api/frequencies
router.get('/', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const frequencies = await getDeadFrequencies(lat, lon);
    res.json(frequencies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
