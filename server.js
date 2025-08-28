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
      throw new Error('Configuración de Google API no encontrada. Verifica las variables de entorno.');
    }

    const doc = new GoogleSpreadsheet('1SsUUtsYqFBdXj6ho9LIiLpMgSTw8JwnTH9k8yOERErs');
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    });

    await doc.loadInfo();
    console.log('Documento cargado:', doc.title);

    // 🔍 Explorar todas las hojas y mostrar encabezados
    doc.sheetsByIndex.forEach((s, i) => {
      console.log(`Hoja[${i}] -> titulo="${s.title}", encabezados:`, s.headerValues);
    });

    // ⚠️ De momento seguimos usando la primera hoja
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    console.log(`Filas obtenidas en "${sheet.title}":`, rows.length);

    // Solo devolver la fila cruda como prueba (para inspeccionar)
    const firmas = rows.map((row, index) => {
      return { ...row };
    });

    res.json({
      hojaSeleccionada: sheet.title,
      totalHojas: doc.sheetCount,
      totalFilas: rows.length,
      muestra: firmas.slice(0, 5), // primeras 5 filas como muestra
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

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});
