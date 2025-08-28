const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Configuración de Google Sheets
const doc = new GoogleSpreadsheet('1SsUUtsYqFBdXj6ho9LIiLpMgSTw8JwnTH9k8yOERErs');

// Función para limpiar y formatear la clave privada
function formatPrivateKey(key) {
  // Si la clave ya tiene saltos de línea reales, devolver tal cual
  if (key.includes('-----BEGIN PRIVATE KEY-----')) {
    return key;
  }
  
  // Si la clave usa \n, reemplazarlos por saltos de línea reales
  if (key.includes('\\n')) {
    return key.replace(/\\n/g, '\n');
  }
  
  // Para otros formatos, intentar reconstruir la clave
  return `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
}

// Ruta para obtener los datos de las firmas
app.get('/api/firmas', async (req, res) => {
  try {
    // Verificar que las variables de entorno estén configuradas
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error('Configuración de Google API no encontrada');
    }
    
    // Formatear correctamente la clave privada
    const privateKey = formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY);
    
    console.log('Email:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
    console.log('Clave formateada:', privateKey);
    
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    });
    
    await doc.loadInfo();
    console.log('Título del documento:', doc.title);
    
    // Intenta encontrar la hoja correcta
    let sheet;
    try {
      sheet = doc.sheetsByTitle['Respuestas de formulario 1'];
    } catch (e) {
      // Si no encuentra por título, usa la primera hoja
      sheet = doc.sheetsByIndex[0];
    }
    
    console.log('Título de la hoja:', sheet.title);
    
    const rows = await sheet.getRows();
    console.log('Número de filas:', rows.length);
    
    const firmas = rows.map(row => ({
      timestamp: row['Marca de tiempo'] || row['Timestamp'] || '',
      nombre: row['Nombre completo'] || row['Nombre'] || '',
      codigo: row['Código de persona colegiada'] || row['Código'] || ''
    }));
    
    res.json(firmas);
  } catch (error) {
    console.error('Error al obtener las firmas:', error);
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