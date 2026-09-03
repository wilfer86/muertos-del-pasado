// Base de datos local (IndexedDB) - Versión corregida
// Guarda capturas de frecuencias, audio, GPS y análisis

class Database {
  constructor() {
    this.dbName = 'MuertosDelPasadoDB';
    this.dbVersion = 1;
    this.storeName = 'capturas';
    this.db = null;
    this.inicializado = false;
  }

  // Inicializar la base de datos
  async init() {
    if (this.inicializado && this.db) {
      console.log('✅ BD ya está inicializada');
      return this.db;
    }

    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName, this.dbVersion);

        request.onerror = () => {
          console.error(' Error al abrir BD:', request.error);
          reject(request.error);
        };
        
        request.onsuccess = () => {
          this.db = request.result;
          this.inicializado = true;
          console.log('✅ Base de datos inicializada correctamente');
          resolve(this.db);
        };

        request.onupgradeneeded = (event) => {
          console.log('🔧 Creando/actualizando estructura de BD...');
          const db = event.target.result;
          
          // Eliminar store existente si hay
          if (db.objectStoreNames.contains(this.storeName)) {
            db.deleteObjectStore(this.storeName);
          }
          
          // Crear nuevo almacén
          const store = db.createObjectStore(this.storeName, { 
            keyPath: 'id',
            autoIncrement: true 
          });
          
          // Crear índices
          store.createIndex('fecha', 'fecha', { unique: false });
          store.createIndex('ubicacion', 'ubicacion.lat', { unique: false });
          
          console.log('✅ Estructura de BD creada');
        };
      } catch (error) {
        console.error('❌ Error crítico en init():', error);
        reject(error);
      }
    });
  }

  // Guardar una captura científica
  async guardarCaptura(captura) {
    if (!this.inicializado) {
      await this.init();
    }

    const capturaCompleta = {
      ...captura,
      fecha: captura.fecha || new Date().toISOString(),
      version: '1.0',
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.add(capturaCompleta);

        request.onsuccess = () => {
          console.log('✅ Captura guardada con ID:', request.result);
          resolve(request.result);
        };
        
        request.onerror = () => {
          console.error(' Error al guardar:', request.error);
          reject(request.error);
        };
        
        transaction.oncomplete = () => {
          console.log('💾 Transacción completada');
        };
      } catch (error) {
        console.error('❌ Error en transacción:', error);
        reject(error);
      }
    });
  }

  // Obtener todas las capturas
  async obtenerTodas() {
    if (!this.inicializado) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          const capturas = request.result.sort((a, b) => b.timestamp - a.timestamp);
          console.log(' Capturas obtenidas:', capturas.length);
          resolve(capturas);
        };
        
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Obtener conteo de capturas
  async contarCapturas() {
    if (!this.inicializado) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Eliminar una captura
  async eliminarCaptura(id) {
    if (!this.inicializado) {
      await this.init();
    }

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
    if (!this.inicializado) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log(' Base de datos limpiada');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Exportar a JSON
  async exportarAJSON() {
    const capturas = await this.obtenerTodas();
    return JSON.stringify(capturas, null, 2);
  }
}

// Instancia única global
window.muertosDB = new Database();
export default window.muertosDB;
