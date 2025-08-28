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

    // Debug: ver todos los campos disponibles de la primera fila
    console.log('Todos los campos de la primera fila:');
    const firstRow = rows[0];
    Object.keys(firstRow).forEach(key => {
      if (!key.startsWith('_')) { // Excluir campos internos
        console.log(`- ${key}: ${firstRow[key]}`);
      }
    });

    console.log('Datos crudos de la primera fila:', firstRow._rawData);

    // Procesar las filas
    const firmas = rows.map((row) => {
      try {
        // Usar los nombres exactos de las columnas como están en Google Sheets
        const timestamp = row['Timestamp'] ? row['Timestamp'].trim() : 'N/A';
        const nombre = row['Nombre completo '] ? row['Nombre completo '].trim() : 'N/A'; // ¡Note el espacio al final!
        
        // Buscar el código - puede estar en diferentes campos
        let codigo = 'N/A';
        
        // Intentar encontrar el campo que contiene el código
        Object.keys(row).forEach(key => {
          if (!key.startsWith('_') && 
              key !== 'Timestamp' && 
              key !== 'Nombre completo ' &&
              row[key] && 
              row[key].trim() !== '') {
            codigo = row[key].trim();
          }
        });

        return { timestamp, nombre, codigo };
      } catch (error) {
        console.error('Error procesando fila:', error);
        return { timestamp: 'Error', nombre: 'Error', codigo: 'Error' };
      }
    });

    // Filtrar filas vacías o de encabezado
    const firmasFiltradas = firmas.filter(firma => 
      firma.timestamp !== 'N/A' && 
      firma.timestamp !== 'Timestamp' && // Excluir encabezados
      !firma.timestamp.includes('Firmas de la carta')
    );

    console.log(`Firmas después de filtrar: ${firmasFiltradas.length}`);
    if (firmasFiltradas.length > 0) {
      console.log('Primera firma ejemplo:', firmasFiltradas[0]);
    }

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