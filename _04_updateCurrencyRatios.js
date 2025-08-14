const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Путь к вашему файлу economy_data.sii
const FILE_PATH = path.join(__dirname, "def", "economy_data.sii");

// Целевая валюта, относительно которой будут рассчитываться коэффициенты (например EUR)
const BASE_CURRENCY = "EUR";

// Список кодов валют, которые нужно обновить
const CURRENCIES_TO_UPDATE = [
  "CHF",
  "CZK",
  "GBP",
  "PLN",
  "HUF",
  "DKK",
  "SEK",
  "NOK",
  "RUB",
  "BGN",
  "RON",
  "TRY",
  "ALL",
  "BAM",
  "MKD",
  "RSD",
  "UAH",
  "KZT",
  "BYN",
  "CNY",
];

const FIX_COEF = 1.0725010725010726;
// --- Загрузка данных из файла ---
function readFile() {
  return fs.readFileSync(FILE_PATH, "utf-8");
}

// --- Парсинг валют из содержимого файла ---
function parseCurrencies(content) {
  const lines = content.split("\n");
  let result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.startsWith("currency_code[]")) {
      const codeMatch = line.match(/"([^"]+)"/);
      if (!codeMatch) {
        i++;
        continue;
      }
      const code = codeMatch[1];
      const ratioLine = lines[i + 1]?.trim();

      const ratioMatch = ratioLine?.match(/currency_ratio\[\]: ([\d\.]+)/);
      const ratio = ratioMatch ? parseFloat(ratioMatch[1]) : 1;

      result.push({ code, ratio, start: i, end: i + 1 });
      console.log(`Код валюты: ${code}, Коэффициент: ${ratio}`);
      i += 2;
    } else {
      i++;
    }
  }

  return result;
}

// --- Получение актуальных курсов ---
async function fetchLatestRates() {
  try {
    const response = await axios.get(
      `https://api.exchangerate-api.com/v4/latest/${BASE_CURRENCY}`,
    );
    const rates = response.data.rates;

    return Object.fromEntries(
      Object.entries(rates).filter(([code]) =>
        CURRENCIES_TO_UPDATE.includes(code),
      ),
    );
  } catch (err) {
    throw new Error("Не удалось загрузить курсы валют: " + err.message);
  }
}

// --- Обновление значений currency_ratio в контенте ---
function updateContent(content, currencyData, latestRates) {
  let lines = content.split("\n");

  for (const entry of currencyData) {
    const { code, start } = entry;
    let rate = latestRates[code];
    console.log(`Код валюты: ${code}, Коэффициент: ${rate}`);
    if (code === "RUB") {
      rate = 100;
    } else {
      rate = (FIX_COEF * latestRates[code]).toFixed(2);
    }
    if (rate !== undefined) {
      lines[start + 1] = `	currency_ratio[]: ${rate}`;
    }
    console.log(`Код валюты: ${code}, Коэффициент: ${rate}`);
  }

  return lines.join("\n");
}

// --- Основная функция ---
async function main() {
  try {
    console.log("Чтение файла...");
    const content = readFile();
    const parsedCurrencies = parseCurrencies(content);

    console.log("Загрузка курсов валют...");
    const latestRates = await fetchLatestRates();

    console.log("Обновление данных...");
    const updatedContent = updateContent(
      content,
      parsedCurrencies,
      latestRates,
    );

    fs.writeFileSync(FILE_PATH, updatedContent);
    console.log("✅ Курсы валют успешно обновлены в файле economy_data.sii");
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
  }
}

main();
