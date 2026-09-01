require('dotenv').config();
// En Render, las variables se inyectan automáticamente.
// Localmente, crea un archivo .env (añadido a .gitignore)
module.exports = {
  ITU_API_KEY: process.env.ITU_API_KEY,
  SDR_STREAM_URL: process.env.SDR_STREAM_URL
};