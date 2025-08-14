const fs = require("fs");
const path = require("path");

// Функция для расчета времени парома
function calculateFerryTime(distance) {
  const maxSpeed = 40; // км/ч (крейсерская скорость)
  const acceleration = 0.2; // м/с² (ускорение и торможение)

  // Перевод скорости в м/с
  const maxSpeedMS = (maxSpeed * 1000) / 3600;

  // Расчет расстояния разгона и торможения (s = v² / 2a)
  const accelDistance = maxSpeedMS ** 2 / (2 * acceleration) / 1000; // км

  // Время разгона и торможения (t = v / a)
  const accelTime = maxSpeedMS / acceleration / 60; // в минутах

  // Проверка, достаточно ли расстояния для выхода на крейсерскую скорость
  if (distance <= 2 * accelDistance) {
    // Если расстояние слишком мало, то считаем, что паром не достигает крейсерской скорости
    const adjustedTime = Math.sqrt((2 * distance * 1000) / acceleration) / 60;
    return Math.round(adjustedTime); // Округляем до целого числа
  }

  // Расстояние на крейсерской скорости
  const cruiseDistance = distance - 2 * accelDistance;

  // Время на крейсерской скорости (t = s / v)
  const cruiseTime = (cruiseDistance / maxSpeed) * 60; // в минутах

  // Итоговое время
  const totalTime = accelTime * 2 + cruiseTime;
  return Math.round(totalTime); // Округляем до целого числа
}

// Функция для расчета цены
function calculatePrice(time) {
  const basePrice = 4; // Минимальная цена
  const pricePer30Minutes = 1; // Цена за каждые 30 минут
  const additionalPrice = Math.ceil(time / 20); // Количество 30-минутных интервалов
  return basePrice + additionalPrice;
}

// Чтение и обновление файлов
function processSiiFiles(directory) {
  // Получаем список всех файлов в текущей директории
  fs.readdir(directory, (err, files) => {
    if (err) {
      console.error("Ошибка при чтении директории:", err);
      return;
    }

    // Фильтруем только файлы с расширением .sii
    const siiFiles = files.filter(
      (file) => path.extname(file).toLowerCase() === ".sii",
    );

    // Обрабатываем каждый файл
    siiFiles.forEach((file) => {
      const filePath = path.join(directory, file);

      // Читаем содержимое файла
      fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
          console.error(`Ошибка при чтении файла ${file}:`, err);
          return;
        }

        // Извлекаем значение distance
        const distanceMatch = data.match(/distance:\s*(\d+)/);
        if (!distanceMatch) {
          console.warn(`В файле ${file} не найдено значение distance`);
          return;
        }

        const distance = parseFloat(distanceMatch[1]);
        if (isNaN(distance)) {
          console.warn(`Некорректное значение distance в файле ${file}`);
          return;
        }

        // Вычисляем новые значения time и price
        const newTime = calculateFerryTime(distance);
        const newPrice = calculatePrice(newTime);

        // Обновляем значения в тексте файла
        let updatedData = data.replace(/price:\s*\d+/, `price: ${newPrice}`);
        updatedData = updatedData.replace(/time:\s*\d+/, `time: ${newTime}`);

        // Сохраняем обновленные данные обратно в файл
        fs.writeFile(filePath, updatedData, "utf8", (err) => {
          if (err) {
            console.error(`Ошибка при записи в файл ${file}:`, err);
            return;
          }
          console.log(
            `Файл ${file} успешно обновлен. Новые значения: price = ${newPrice}, time = ${newTime}`,
          );
        });
      });
    });
  });
}

// Запускаем обработку файлов в текущей директории
processSiiFiles(path.join(__dirname, "def", "ferry", "connection"));
