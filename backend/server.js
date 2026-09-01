require('./config/env');
const express = require('express');
const cors = require('cors');
const frequencyRoutes = require('./routes/frequencies');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/frequencies', frequencyRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Muertos del Pasado API running on port ${PORT}`));