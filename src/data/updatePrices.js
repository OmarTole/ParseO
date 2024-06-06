// updatePrices.js

const puppeteer = require('puppeteer');
const db = require('./database');
const { logPriceReport } = require('./price-reports');
// import puppeteer from 'puppeteer';
// import db from './database';
// import { logPriceReport } from './price-reports';
// const { authorize } = require('./authorize');

// const newPriceDefer = 100;
const priceDefer = 1;
const wholeDefer = 100;
const myName = 'ИП ЕРБОЛАТ';
// let isStopped = false;
const login = 'erbolat.91.kz@mail.ru';
const password = '250691Erbolat';

async function authorize(page, log) {
  let success = false;
  let attempt = 0;
  log(login, password);

  while (!success && attempt < 2) {
    attempt++;
    log(`Попытка авторизации #${attempt}`);
    await page.goto('https://omarket.kz/auth/?backurl=/');
    await page.$eval('[name="USER_LOGIN"]', input => input.value = '');
    await page.type('[name="USER_LOGIN"]', login);
    await page.$eval('[name="USER_PASSWORD"]', input => input.value = '');
    await page.type('[name="USER_PASSWORD"]', password);
    await page.click('#auth-btn');
    await page.waitForNavigation();

    const confirmationElement = await page.$('a[href="/personal/cabinet_preorder.php"]');
    const errorElement = await page.$('.bx-authform .alert-danger');

    if (confirmationElement) {
      log('Авторизация прошла успешно!');
      success = true;
    } else if (errorElement) {
      log('Ошибка при авторизации: Неверный логин или пароль');
    } else {
      log('Ошибка при авторизации: Неизвестная ошибка');
    }
  }

  return success;
}

async function startUpdatePrices(log, login, password, showBrowser, isParsing) {
  const browser = await puppeteer.launch({
    headless: !showBrowser,
    args: ['--start-maximized']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    const success = await authorize(page, log, login, password);
    if (!success) {
      throw new Error('Не удалось авторизоваться');
    }

    const products = await getProductsFromDB();
    // const totalProducts = products.length;
    // let completedProducts = 0;

    await page.click('.user-geo-position-value-link');
    await delay(300);
    await page.click('[data-parse-value="г.Экибастуз"]');
    await delay(300);
    await page.click('.geo-location-window-button');
    await delay(300);
    log(`Локация изменена на г.Экибастуз`);

    for (const product of products) {
      if (isParsing) {
        log('Процесс остановлен пользователем');
        break;
      }
      try {
        if (!product.min_price || !product.compare_link) {
          await logPriceReport(product.name, null, null, 'Пропущен', 'Отсутствует минимальная цена или ссылка на сравнение');
          continue;
        }

        let success = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const response = await page.goto(product.compare_link, { waitUntil: 'networkidle2', timeout: 60000 });
            if (response.ok()) {
              log(`Переход к товару ${product.name} успешно на попытке ${attempt + 1}`);
              success = true;
              break;
            } else {
              log(`Ошибка при доступе к товару ${product.name}: Статус ${response.status()}`);
            }
          } catch (error) {
            log(`Ошибка при переходе к товару ${product.name} на попытке ${attempt + 1}: ${error.message}`);
          }
        }
        if (!success) {
          log(`Не удалось перейти к товару ${product.name} после 3 попыток`);
          continue;
        }

        await page.waitForSelector('.table-bordered tbody tr');
        const listBordered = await page.evaluate(() => {
          const cells = document.querySelectorAll('.table-bordered tbody tr');
          if (cells.length >= 2) {
            const listTd1 = cells[0].querySelectorAll('td');
            const tdName1 = cells[0].querySelectorAll('td a')[0].textContent.trim();
            const tdPrice1 = listTd1[1].textContent.replace(/\s+/g, '');
            const listTd2 = cells[1].querySelectorAll('td');
            const tdName2 = cells[1].querySelectorAll('td a')[0].textContent.trim();
            const tdPrice2 = listTd2[1].textContent.replace(/\s+/g, '');
            return [tdName1, tdPrice1, tdName2, tdPrice2];
          }
          return null;
        });

        if (listBordered !== null) {
          await priceComparison(page, product, listBordered);
        } else {
          log(`Нет данных для сравнения для ${product.name}`);
          await logPriceReport(product.name, null, null, 'Пропущен', 'Нет конкурента');
        }
        // completedProducts++;
      } catch (error) {
        log(`Ошибка при обработке товара ${product.name}: ${error.message}`);
        continue; // Продолжаем выполнение цикла при возникновении ошибки
      }
    }

    log('Список завершён!!!');
  } catch (error) {
    console.error('Ошибка при выполнении скрипта:', error.message);
  } finally {
    await browser.close();
  }
}

async function getProductsFromDB() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM products', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function priceComparison(page, product, listBordered) {
  const minPrice = product.min_price;

  if (listBordered[0] === myName) {
    if (listBordered[3] - 90 > listBordered[1]) {
      await updatePrice(page, product, 3, minPrice);
    } else {
      await logPriceReport(product.name, minPrice, null, 'Не установлен', 'Нет конкурента');
    }
  } else {
    await updatePrice(page, product, 1, minPrice);
  }

  async function updatePrice(page, product, num, minPrice) {
    const newPrice = listBordered[num] - priceDefer;
    const reason = newPrice < product.min_price ? 'Цена ниже минимальной' : 'Цена установлена успешно';

    if (product.min_price <= listBordered[num]) {
      log(`Установка цены для ${product.name} на ${newPrice}`);
      await page.evaluate((price) => {
        localStorage.setItem('price', price);
      }, newPrice);
      await page.goto(product.edit_link);
      await setNewPrice(page, newPrice);

      await logPriceReport(product.name, minPrice, newPrice, 'Установлен', reason);
    } else {
      if (num === 1) {
        await updatePrice(page, product, 3, minPrice);
      } else {
        await logPriceReport(product.name, minPrice, null, 'Не установлен', reason);
      }
    }
  }
}

async function setNewPrice(page, instPrice) {
  const error = await page.$('#error404');

  if (error) {
    log('Ошибка: Страница не найдена');
    return;
  }

  await applyPrice(page, instPrice);
}

async function applyPrice(page, instPrice) {
  const wholePrice = instPrice - wholeDefer;
  try {
    await page.waitForSelector('#optOfferCheckbox');
    
    await page.evaluate(() => {
      document.querySelector('#optOfferCheckbox').checked = true;
    });

    await clearAndType(page, '#price_no_nds_all', instPrice.toString());

    await page.evaluate(() => {
      document.querySelector('[name="pos_all"]').checked = true;
    });

    await page.click('.optModalBtn');
    await delay(500);

    await page.waitForSelector('[name="opt[3][QUANTITY_FROM]"]');
    await clearAndType(page, '[name="opt[3][QUANTITY_FROM]"]', '2');

    await clearAndType(page, '[name="opt[3][PRICE]"]', wholePrice.toString());
    await delay(500);

    await page.waitForSelector('#optModal .modal-footer button');
    await page.click('#optModal .modal-footer button');
    await delay(500);

    await page.waitForSelector('.active-save-btn');
    await page.click('.active-save-btn');
    log('Цена успешно установлена на ' + instPrice);
    await delay(500);
  } catch (error) {
    console.error('Ошибка при установке цены:', error.message);
    log('Ошибка при установке цены: ' + error.message);
  }
}

async function clearAndType(page, selector, value) {
  await page.$eval(selector, input => input.value = '');
  await page.type(selector, value);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

module.exports = { startUpdatePrices, authorize };
