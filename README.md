# Rasor Crest

Конструктор електроніки для LEGO: плати (ESP32, TLC5940, TB6612), прошивка на MicroPython і застосунок на Expo.
Перша модель — зореліт Rasor Crest.

## Структура

- `firmware/` — прошивка ESP32 (вміст папки = корінь файлової системи плати)
- `docs/` — документація: `PRODUCT.md`, `FIRMWARE.md`, `HARDWARE.md`, `PROTOCOL.md`, `TODO.md`
- `AGENTS.md` — правила й карта проєкту для AI-агентів
- `app/` — застосунок Expo (TypeScript, Expo Router, Node 22)

## Шпаргалка mpremote

Усі команди запускати з папки `firmware/`:

```sh
cd firmware
```

⚠️ USB і VO бака → VIN ніколи не підключати одночасно.

Один раз для плати: бібліотека BLE (завантажується з ПК і пишеться в `/lib` на платі):

```sh
mpremote connect auto mip install aioble
```

Теж один раз, на чистій платі: створити папки (інакше `cp` у `modules/` дасть «destination is not a directory»):

```sh
mpremote connect auto mkdir :modules + mkdir :modules/cabin
```

Завантажити всі файли:

```sh
mpremote connect auto cp main.py ble.py hw.py system.py module.py effects.py drivers.py motor.py :/ + cp modules/__init__.py :/modules/ + cp modules/cabin/__init__.py :/modules/cabin/ + cp modules/cabin/cabin1.py modules/cabin/cabin2.py modules/cabin/cabin3.py :/modules/cabin/
```

Завантажити і запустити (блокує термінал; Ctrl-C зупиняє):

```sh
mpremote connect auto cp main.py ble.py hw.py system.py module.py effects.py drivers.py motor.py :/ + cp modules/__init__.py :/modules/ + cp modules/cabin/__init__.py :/modules/cabin/ + cp modules/cabin/cabin1.py modules/cabin/cabin2.py modules/cabin/cabin3.py :/modules/cabin/ + run main.py
```

`cp` — copy (копіювати файл). `:/` — корінь файлової системи ESP32 (як `/` на комп'ютері, але `:` означає «на пристрої»).
Тобто `cp main.py :/` = скопіювати `main.py` з комп'ютера в корінь ESP32.

Статуси задає застосунок по BLE (екран «Налагодження» в проєкті). Корабель стартує вимкненим (`off`).
REPL із `ship` більше немає: `main.py` блокує термінал.

Тест каналів (без завантаження):

```sh
mpremote connect auto run test_channels.py
```

Тест моторів (`motor.py` має бути на платі):

```sh
mpremote connect auto cp motor.py :/ + run test_motor.py
```

Автономний тест (без ПК, запускається сам при ввімкненні) — ставиться замість `main.py`:

```sh
mpremote connect auto cp hw.py motor.py :/ + cp test_standalone.py :main.py
```

Потім відключи USB і живи ESP32 від бака (VO → VIN). USB і VO ніколи разом.
Повернути корабель: команда «Завантажити всі файли» вище (перезапише `main.py`).

## Застосунок (Expo)

```sh
cd app
nvm use          # Node 22 з .nvmrc
npm install
npx expo start
```

BLE працює лише на справжньому iPhone/Android (у симуляторі й вебі застосунок імітує модель). Збірка dev build на
iPhone, підключеного кабелем (потрібен Xcode і Developer Mode на телефоні; безкоштовного Apple ID вистачає, підпис
діє 7 днів):

```sh
npx expo run:ios --device
```
