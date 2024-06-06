const express = require('express');
const bodyParser = require('body-parser');
const { parseAndStore } = require('../src/data/parser');
const { startUpdatePrices } = require('../src/data/updatePrices');
const db = require('../src/data/database');
const {
  createPriceReportsTable,
  clearPriceReportsTable,
  getPriceReports,
} = require('../src/data/price-reports');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

let logs = [];

function log(message) {
  const timestamp = new Date().toISOString();
  logs.push(`[${timestamp}] ${message}`);
  console.log(`[${timestamp}] ${message}`);
}

// Initialize the price_reports table
createPriceReportsTable();

app.get('/api/logs', (req, res) => {
  res.json(logs);
});

let totalProducts = 0;
let completedProducts = 0;

app.post('/api/start-parser', async (req, res) => {
  const { showBrowser } = req.body;
  try {
    await parseAndStore(log, showBrowser);
    res.status(200).send('Парсинг товаров успешно завершен.');
  } catch (error) {
    console.error('Ошибка при парсинге товаров:', error);
    res.status(500).send('Произошла ошибка при парсинге товаров.');
  }
});

app.post('/api/start-update-prices', async (req, res) => {
  const { login, password, showBrowser, isParsing } = req.body;
  try {
    await clearPriceReportsTable();
    await startUpdatePrices(log, login, password, showBrowser, isParsing);
    log('Обновление цен на товары успешно завершено.');
    res.status(200).send('Обновление цен на товары успешно завершено.');
  } catch (error) {
    console.error('Ошибка при обновлении цен на товары:', error);
    log(`Ошибка при обновлении цен на товары: ${error.message}`);
    res.status(500).send('Произошла ошибка при обновлении цен на товары.');
  }
});

app.get('/api/progress', (req, res) => {
  res.json({ totalProducts, completedProducts });
});


app.get('/api/products', (req, res) => {
  const search = req.query.search || '';
  const query = search
    ? 'SELECT * FROM products WHERE name LIKE ?'
    : 'SELECT * FROM products';

  const params = search ? [`%${search}%`] : [];

  db.all(query, params, (err, rows) => {
    if (err) {
      log(`Ошибка при получении продуктов: ${err.message}`);
      return res.status(500).send('Ошибка при получении продуктов.');
    }
    res.json(rows);
  });
});

app.post('/api/update-price/:id', (req, res) => {
  const { id } = req.params;
  const { min_price, compare_link } = req.body;

  console.log('ID продукта:', id);
  console.log('Минимальная цена:', min_price);
  console.log('Ссылка для сравнения:', compare_link);

  db.run('UPDATE products SET min_price = ?, compare_link = ? WHERE id = ?', [min_price, compare_link, id], function (err) {
    if (err) {
      log(`Ошибка при обновлении продукта с ID ${id}: ${err.message}`);
      return res.status(500).send('Произошла ошибка при обновлении данных.');
    }
    log(`Минимальная цена для товара с ID ${id} обновлена на ${min_price}`);
    log(`Ссылка для товара с ID ${id} обновлена на ${compare_link}`);
    res.sendStatus(200);
  });
});


app.get('/api/reports', async (req, res) => {
  const search = req.query.search || '';
  const reason = req.query.reason || '';
  try {
    const reports = await getPriceReports();
    let filteredReports = reports;

    if (search) {
      filteredReports = filteredReports.filter(report => report.product_name.toLowerCase().includes(search.toLowerCase()));
    }

    if (reason) {
      filteredReports = filteredReports.filter(report => report.reason === reason);
    }

    const filteredReasons = [...new Set(filteredReports.map(report => report.reason))];

    res.json({ reports: filteredReports, filteredReasons });
  } catch (error) {
    log(`Ошибка при получении отчетов: ${error.message}`);
    res.status(500).send('Ошибка при получении отчетов.');
  }
});

app.post('/api/clear-reports', async (req, res) => {
  try {
    await clearPriceReportsTable();
    log('Все отчеты очищены');
    res.sendStatus(200);
  } catch (error) {
    log(`Ошибка при очистке отчетов: ${error.message}`);
    res.status(500).send('Ошибка при очистке отчетов.');
  }
});

app.get('/api/all-reports', async (req, res) => {
  try {
    const reports = await getPriceReports();
    res.json(reports);
  } catch (error) {
    log(`Ошибка при получении всех отчетов: ${error.message}`);
    res.status(500).send('Ошибка при получении всех отчетов.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  log(`Сервер запущен на http://localhost:${PORT}`);
});
