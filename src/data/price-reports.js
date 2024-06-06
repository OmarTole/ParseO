// price-reports.js

const db = require('./database');
// import db from './database';

// Function to create the price_reports table if it doesn't exist
function createPriceReportsTable() {
  db.run(`CREATE TABLE IF NOT EXISTS price_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT,
    old_price REAL,
    new_price REAL,
    status TEXT,
    reason TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

// Function to clear the price_reports table
function clearPriceReportsTable() {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM price_reports', (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// Function to log a price report
function logPriceReport(product_name, old_price, new_price, status, reason) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO price_reports (product_name, old_price, new_price, status, reason) 
       VALUES (?, ?, ?, ?, ?)`,
      [product_name, old_price, new_price, status, reason],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

// Function to fetch all price reports
function getPriceReports() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM price_reports', [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

module.exports = {
  createPriceReportsTable,
  clearPriceReportsTable,
  logPriceReport,
  getPriceReports,
};

