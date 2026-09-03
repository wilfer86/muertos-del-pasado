require('./config/env');
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const frequencyRoutes = require('./routes/frequencies');
const capturasRoutes = require('./routes/capturas');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Para recibir audios grandes

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => console.error('❌ Error MongoDB:', err));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de la API
app.use('/api/frequencies', frequencyRoutes);
app.use('/api/capturas', capturasRoutes);

// Ruta raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Muertos del Pasado API running on port ${PORT}`));
