const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Configuración de Google Sheets
const doc = new GoogleSpreadsheet('1SsUUtsYqFBdXj6ho9LIiLpMgSTw8JwnTH9k8yOERErs');

// Ruta para obtener los datos de las firmas
app.get('/api/firmas', async (req, res) => {
  try {
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
    
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Respuestas de formulario 1']; // Ajusta este nombre si es necesario
    
    const rows = await sheet.getRows();
    const firmas = rows.map(row => ({
      timestamp: row['Marca de tiempo'],
      nombre: row['Nombre completo'],
      codigo: row['Código de persona colegiada']
    }));
    
    res.json(firmas);
  } catch (error) {
    console.error('Error al obtener las firmas:', error);
    res.status(500).json({ error: 'Error al obtener los datos' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});