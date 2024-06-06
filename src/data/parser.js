const puppeteer = require('puppeteer');
const db = require('../data/database');
// const { authorize } = ('./authorize');

const notShowBrowser = true;

async function authorize(page, log, login, password) {
  let success = false;
  let attempt = 0;

  while (!success && attempt < 2) {
    attempt++;
    log(`Попытка авторизации #${attempt}`);
    await page.goto('https://omarket.kz/auth/?backurl=/');
    await page.$eval('[name="USER_LOGIN"]', input => input.value = '');
    await page.type('[name="USER_LOGIN"]', 'erbolat.91.kz@mail.ru');
    await page.$eval('[name="USER_PASSWORD"]', input => input.value = '');
    await page.type('[name="USER_PASSWORD"]', '250691Erbolat');
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

async function fetchProducts(page, log) {
  log('Сбор списка опубликованных товаров');
  await page.goto('https://omarket.kz/personal/cabinet_trade_offers.php?TYPE=15&search%5Bstatus%5D=3&is_search=Y&PAGE_SIZE=10&nav-more-news=page-1');
  await page.waitForSelector('.item-selected');
  const totalProducts = await page.evaluate(() => {
    const element = document.querySelector('.item-selected a[href*="search%5Bstatus%5D=3"]');
    const text = element.textContent;
    const match = text.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  });

  const urlPrice = `https://omarket.kz/personal/cabinet_trade_offers.php?TYPE=15&search%5Bstatus%5D=3&is_search=Y&PAGE_SIZE=${totalProducts}&nav-more-news=page-1`;
  await page.goto(urlPrice);
  await page.waitForSelector('#my_offers');

  const products = await page.evaluate(() => {
    const productsList = [];
    document.querySelectorAll('.getFastView').forEach(item => {
      if (item) {
        const productName = item.textContent;
        const articleIndex = productName.indexOf(',');
        const article = articleIndex !== -1 ? productName.substring(0, articleIndex).trim() : '';
        const productId = item.dataset.id;
        const editLink = `https://omarket.kz//personal/trade/moffers/add_price.php?ELEMENT_ID=${productId}`;
        const compareLink = ``;
        productsList.push({ name: productName, article, editLink, compareLink });
      }
    });
    return productsList;
  });

  log(`Найдено товаров: ${products.length}`);
  return products;
}

async function parseAndStore(log, login, password, ) {
  const browser = await puppeteer.launch({ headless: notShowBrowser });
  const page = await browser.newPage();

  try {
    const success = await authorize(page, log, login, password);

    if (!success) {
      log('Авторизация не удалась после нескольких попыток.');
      return;
    }

    const products = await fetchProducts(page, log);
    log('Список товаров получен, сохраняем в базу данных');

    db.serialize(() => {
      const stmt = db.prepare("INSERT OR IGNORE INTO products (name, article, edit_link, compare_link) VALUES (?, ?, ?, ?)");
      products.forEach(product => {
        stmt.run(product.name, product.article, product.editLink, product.compareLink, (err) => {
          if (err) {
            log(`Ошибка при вставке товара: ${product.name}. Ошибка: ${err.message}`);
          }
        });
      });
      stmt.finalize();
    });

    log('Товары успешно сохранены в базу данных');
  } catch (error) {
    log(`Ошибка при выполнении скрипта: ${error.message}`);
  } finally {
    await browser.close();
  }
}

module.exports = { parseAndStore };

