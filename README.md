# Muertos del Pasado

Arqueología de señales de radio muertas usando datos ITU/FCC + streams SDR públicos.

## Estructura
- `backend/`: API Node.js + procesamiento de frecuencias históricas
- `frontend/`: PWA con espectrograma en tiempo real

## Stack
- Backend: Express + dotenv + cors
- Frontend: Web Audio API + Canvas FFT
- Deploy: Render (API proxy seguro)