// Base de datos local (IndexedDB) para almacenamiento científico offline
// Guarda capturas de frecuencias, audio, GPS y análisis

class Database {
  constructor() {
    this.dbName = 'MuertosDelPasadoDB';
    this.dbVersion = 1;
    this.storeName = 'capturas';
    this.db = null;
  }

  // Inicializar la base de datos
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ Base de datos inicializada');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Crear almacén de objetos si no existe
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { 
            keyPath: 'id',
            autoIncrement: true 
          });
          
          // Índices para búsquedas rápidas
          store.createIndex('fecha', 'fecha', { unique: false });
          store.createIndex('frecuencia', 'frecuencia', { unique: false });
          store.createIndex('ubicacion', 'ubicacion', { unique: false });
        }
      };
    });
  }

  // Guardar una captura científica
  async guardarCaptura(captura) {
    if (!this.db) await this.init();

    const capturaCompleta = {
      ...captura,
      fecha: captura.fecha || new Date().toISOString(),
      version: '1.0'
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(capturaCompleta);

      request.onsuccess = () => {
        console.log('✅ Captura guardada con ID:', request.result);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Obtener todas las capturas
  async obtenerTodas() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        // Ordenar por fecha (más reciente primero)
        const capturas = request.result.sort((a, b) => 
          new Date(b.fecha) - new Date(a.fecha)
        );
        resolve(capturas);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Obtener captura por ID
  async obtenerPorId(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Eliminar captura
  async eliminarCaptura(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('🗑️ Captura eliminada:', id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Limpiar toda la base de datos
  async limpiar() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('🧹 Base de datos limpiada');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Exportar todas las capturas a JSON (para respaldo)
  async exportarAJSON() {
    const capturas = await this.obtenerTodas();
    
    // Convertir blobs a base64 para exportación
    const capturasExportables = await Promise.all(
      capturas.map(async (c) => ({
        ...c,
        audioBlob: c.audioBlob ? await this.blobToBase64(c.audioBlob) : null
      }))
    );

    const json = JSON.stringify(capturasExportables, null, 2);
    return json;
  }

  // Helper: convertir Blob a Base64
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Obtener estadísticas
  async obtenerEstadisticas() {
    const capturas = await this.obtenerTodas();
    
    return {
      total: capturas.length,
      conAudio: capturas.filter(c => c.audioBlob).length,
      conAnalisis: capturas.filter(c => c.analisisIA).length,
      porPotencial: {
        alto: capturas.filter(c => c.potencialEnergetico === 'alto').length,
        medio: capturas.filter(c => c.potencialEnergetico === 'medio').length,
        bajo: capturas.filter(c => c.potencialEnergetico === 'bajo').length
      }
    };
  }
}

// Instancia única (singleton)
const database = new Database();
export default database;
