const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Ruta para obtener los datos de las firmas
app.get('/api/firmas', async (req, res) => {
  try {
    console.log('Iniciando obtención de firmas...');
    
    // Verificar que las variables de entorno estén configuradas
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error('Configuración de Google API no encontrada. Verifica las variables de entorno.');
    }

    console.log('Credenciales encontradas, inicializando documento...');
    
    // Inicializar el documento de Google Sheets
    const doc = new GoogleSpreadsheet('1SsUUtsYqFBdXj6ho9LIiLpMgSTw8JwnTH9k8yOERErs');
    
    // Formatear la clave privada
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    
    console.log('Autenticando con Google Sheets...');
    
    // Autenticar
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    });

    console.log('Autenticación exitosa, cargando información del documento...');
    
    // Cargar información del documento
    await doc.loadInfo();
    console.log('Documento cargado:', doc.title);
    
    // Obtener la primera hoja
    const sheet = doc.sheetsByIndex[0];
    console.log('Hoja seleccionada:', sheet.title);
    
    // Obtener filas
    console.log('Obteniendo filas...');
    const rows = await sheet.getRows();
    console.log('Filas obtenidas:', rows.length);
    
    // Verificar columnas disponibles
    if (rows.length > 0) {
      console.log('Campos disponibles:', Object.keys(rows[0]));
    }

    // Nombre exacto de la columna gigante
    const colName = 'Firmas de la carta de preocupación y firme inconformidad ante las declaraciones emitidas recientemente por el psiquiatra Francisco Golcher.';

    // Mapear datos
    const firmas = rows.map((row, index) => {
      const raw = row[colName] || '';
      
      // Intentar separar en partes
      let timestamp = '';
      let nombre = '';
      let codigo = '';

      if (raw.includes('-')) {
        const parts = raw.split('-').map(p => p.trim());
        timestamp = parts[0] || '';
        nombre = parts[1] || '';
        codigo = parts[2] || '';
      } else {
        // Si no hay separador, guardar todo en nombre
        nombre = raw;
      }

      // Debug por fila
      console.log(`Fila ${index}: raw="${raw}" -> { timestamp: "${timestamp}", nombre: "${nombre}", codigo: "${codigo}" }`);

      return { timestamp, nombre, codigo };
    });

    console.log('Datos procesados correctamente. Firmas encontradas:', firmas.length);
    res.json(firmas);
    
  } catch (error) {
    console.error('Error detallado al obtener las firmas:', error);
    res.status(500).json({ 
      error: 'Error al obtener los datos',
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? '' : error.stack
    });
  }
});

// Ruta de salud para verificar que el servidor funciona
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Ruta principal - sirve el frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});

