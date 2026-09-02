require('./config/env');
const express = require('express');
const cors = require('cors');
const path = require('path'); // <-- AGREGA ESTA LÍNEA
const frequencyRoutes = require('./routes/frequencies');

const app = express();
app.use(cors());
app.use(express.json());

// ESTA ES LA LÍNEA MÁGICA: Sirve los archivos de la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/frequencies', frequencyRoutes);

// Esto hace que si entras a la raíz, te muestre el index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Muertos del Pasado API running on port ${PORT}`));
