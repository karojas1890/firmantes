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

    if (rows.length === 0) {
      return res.json([]);
    }

    // Debug: ver la estructura de la primera fila
    console.log('Estructura de la primera fila:', Object.keys(rows[0]));
    console.log('Datos de la primera fila:', rows[0]._rawData);

    // Google Forms crea una estructura donde:
    // - La primera fila es el título del formulario (lo ignoramos)
    // - La segunda fila son los encabezados reales
    // - Las filas siguientes son los datos

    // Para acceder a los datos correctamente, necesitamos usar los nombres de campo que Google Sheets genera
    // Los campos suelen ser: Timestamp, Nombre completo, Código de persona colegiada

    const firmas = rows.map((row) => {
      // Usar los nombres exactos de las columnas como están en Google Sheets
      const timestamp = row['Timestamp'] ? row['Timestamp'].trim() : 'N/A';
      const nombre = row['Nombre completo'] ? row['Nombre completo'].trim() : 'N/A';
      const codigo = row['Código de persona colegiada'] ? row['Código de persona colegiada'].trim() : 'N/A';

      return { timestamp, nombre, codigo };
    });

    // Filtrar la primera fila si es el título del formulario
    const firmasFiltradas = firmas.filter(firma => 
      firma.timestamp !== 'N/A' && 
      !firma.timestamp.includes('Firmas de la carta')
    );

    res.json(firmasFiltradas);

  } catch (error) {
    console.error('Error detallado al obtener las firmas:', error);
    res.status(500).json({
      error: 'Error al obtener los datos',
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? '' : error.stack
    });
  }
});

// Resto del código se mantiene igual...
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