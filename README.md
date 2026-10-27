# Rasor Crest

Конструктор електроніки для LEGO: плати (ESP32, TLC5940, TB6612), прошивка на MicroPython і застосунок на Expo.
Перша модель — зореліт Rasor Crest.

## Структура

- `firmware/` — прошивка ESP32 (вміст папки = корінь файлової системи плати)
- `docs/` — документація: `PRODUCT.md`, `FIRMWARE.md`, `HARDWARE.md`, `PROTOCOL.md`, `TODO.md`
- `AGENTS.md` — правила й карта проєкту для AI-агентів
- `app/` — застосунок Expo (буде пізніше)

## Шпаргалка mpremote

Усі команди запускати з папки `firmware/`:

```sh
cd firmware
```

⚠️ USB і VO бака → VIN ніколи не підключати одночасно.

Завантажити всі файли:

```sh
mpremote connect auto cp main.py hw.py system.py module.py effects.py drivers.py motor.py :/ + cp modules/__init__.py :/modules/ + cp modules/cabin/__init__.py :/modules/cabin/ + cp modules/cabin/cabin1.py modules/cabin/cabin2.py modules/cabin/cabin3.py :/modules/cabin/
```

Завантажити і запустити:

```sh
mpremote connect auto cp main.py hw.py system.py module.py effects.py drivers.py motor.py :/ + cp modules/__init__.py :/modules/ + cp modules/cabin/__init__.py :/modules/cabin/ + cp modules/cabin/cabin1.py modules/cabin/cabin2.py modules/cabin/cabin3.py :/modules/cabin/ + run main.py
```

`cp` — copy (копіювати файл). `:/` — корінь файлової системи ESP32 (як `/` на комп'ютері, але `:` означає «на пристрої»).
Тобто `cp main.py :/` = скопіювати `main.py` з комп'ютера в корінь ESP32.

Запусти й підключись до REPL:

```sh
mpremote connect auto run main.py + repl
```

Команди в REPL:

```python
ship.set_status('idle')
ship.set_status('error')
ship.set_status('loading')
ship.set_status('off')
```

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
