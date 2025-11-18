const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");

// URL к твоему локальному серверу
const url = "http://192.168.0.8:8080";

// Путь для сохранения JSON
const outputFile = "./diesel_prices.json";

async function fetchAndParse() {
  try {
    // Загружаем HTML
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Парсим данные с текущей страницы
    const names = $(".graph_outside_link")
      .map((i, el) => $(el).text().trim())
      .get();

    const prices = $(
      '#graphic [style="position: absolute; top: 2px; left: 7px; height: 15px; color: #000000;"]',
    )
      .map((i, el) => parseFloat($(el).text().trim()))
      .get();

    // Если количество имён и цен не совпадает — ошибка
    if (names.length !== prices.length) {
      console.warn("⚠️ Количество имён и цен не совпадает");
    }

    // Формируем мапу новых данных { name: price }
    const newData = {};
    names.forEach((name, i) => {
      newData[name] = prices[i];
    });

    // Читаем старый JSON, если он есть
    let existingData = [];
    if (fs.existsSync(outputFile)) {
      const raw = fs.readFileSync(outputFile, "utf-8");
      existingData = JSON.parse(raw);
    }

    // Обновляем цены в существующих записях
    const updatedData = existingData.map((entry) => {
      const newName = entry.name; // не меняем имя
      const newPrice = newData[newName]; // ищем новую цену по оригинальному имени

      return {
        ...entry,
        price: newPrice !== undefined ? newPrice : entry.price,
      };
    });

    // Сохраняем результат
    fs.writeFileSync(outputFile, JSON.stringify(updatedData, null, 2), "utf-8");
    console.log(
      `✅ Обновлено ${updatedData.length} записей. Сохранено в ${outputFile}`,
    );
  } catch (error) {
    console.error(
      "❌ Ошибка при загрузке или парсинге страницы:",
      error.message,
    );
  }
}

fetchAndParse();
