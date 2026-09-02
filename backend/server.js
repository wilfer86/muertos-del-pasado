require('./config/env');
const express = require('express');
const cors = require('cors');
const path = require('path');
const frequencyRoutes = require('./routes/frequencies');

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Ruta de la API
app.use('/api/frequencies', frequencyRoutes);

// Ruta raíz - sirve el index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Muertos del Pasado API running on port ${PORT}`));
