const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/api/firmas', async (req, res) => {
  try {
    console.log('Iniciando obtención de firmas...');

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error('Faltan credenciales de Google API en las variables de entorno.');
    }

    const doc = new GoogleSpreadsheet('1SsUUtsYqFBdXj6ho9LIiLpMgSTw8JwnTH9k8yOERErs');
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    });

    await doc.loadInfo();
    console.log('Documento cargado:', doc.title);

    // Usar la hoja "Firmas recolectadas"
    const sheet = doc.sheetsByIndex[0];
    console.log(`Usando hoja: ${sheet.title}`);

    const rows = await sheet.getRows();
    console.log(`Filas obtenidas: ${rows.length}`);

    if (rows.length > 0) {
      console.log('Ejemplo fila[0]._rawData:', rows[0]._rawData);
      console.log('Ejemplo fila[1]._rawData:', rows[1]?._rawData);
    }

    // Mapear datos: cada fila como array
    const firmas = rows.map((row, index) => {
      const raw = row._rawData; // array con celdas de la fila
      // Ejemplo: [ "26/08/2025 09:45:00", "Juan Pérez", "12345" ]
      return {
        timestamp: raw[0] || '',
        nombre: raw[1] || '',
        codigo: raw[2] || '',
      };
    });

    res.json({
      hojaSeleccionada: sheet.title,
      totalFilas: rows.length,
      muestra: firmas.slice(0, 5), // primeras 5 firmas
    });

  } catch (error) {
    console.error('Error detallado al obtener las firmas:', error);
    res.status(500).json({
      error: 'Error al obtener los datos',
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? '' : error.stack
    });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});
