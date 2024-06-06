// database.js

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./products.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      article TEXT,
      edit_link TEXT,
      compare_link TEXT,
      min_price REAL
    )
  `, (err) => {
    if (err) {
      console.error('Ошибка при создании таблицы:', err.message);
      return;
    }

    db.get("PRAGMA table_info(products);", (err, row) => {
      if (err) {
        console.error('Ошибка при получении информации о таблице:', err.message);
        return;
      }
    });
  });
});

module.exports = db;
