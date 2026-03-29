Завантаж і підключись до REPL
mpremote connect /dev/cu.SLAB_USBtoUART run main.py + repl

Вводиш команди напряму:
ship.set_status('idle')
ship.set_status('error')
ship.set_status('loading')
ship.set_status('off')

Завантажити всі файли:
mpremote connect /dev/cu.SLAB_USBtoUART cp main.py hw.py system.py module.py effects.py drivers.py :/ + cp modules/__init__.py :/modules/ + cp modules/cabin/__init__.py :/modules/cabin/ + cp modules/cabin/cabin1.py modules/cabin/cabin2.py modules/cabin/cabin3.py :/modules/cabin/

Завантажити і запустити:
mpremote connect /dev/cu.SLAB_USBtoUART cp main.py hw.py system.py module.py effects.py drivers.py :/ + cp modules/__init__.py :/modules/ + cp modules/cabin/__init__.py :/modules/cabin/ + cp modules/cabin/cabin1.py modules/cabin/cabin2.py modules/cabin/cabin3.py :/modules/cabin/ + run main.py

Запустити тест каналів:
cp — copy (копіювати файл)
:/ — корінь файлової системи ESP32 (як / на комп'ютері, але : означає "на пристрої")

Тобто cp main.py :/ = скопіювати main.py з комп'ютера в корінь ESP32.
Запустити тест (повторно, без завантаження):
mpremote connect /dev/cu.SLAB_USBtoUART run test_channels.py