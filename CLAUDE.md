# CLAUDE.md

Rasor Crest: MicroPython firmware for an ESP32 running the lights (and, later, motors) in a LEGO spaceship. The LEDs are driven through a TLC5940 16-channel 12-bit PWM sink driver.

More background, written for Copilot:
- `.copilot/copilot-instructions.md`: hardware, power budget, the planned motor pins, and the status table.
- `.copilot/MOTOR_CONTROL_PROPOSAL.md`: H-bridge options for the motors, which aren't implemented yet.

Those files describe the *planned* design, and some of their numbers are out of date. When they disagree with the code, go by the code (see "Known doc drift" below).

## Runtime constraints

- This is **MicroPython on ESP32**, not CPython. Only use modules that exist there: `machine`, `_thread`, `time.ticks_ms/ticks_add/ticks_diff/sleep_ms/sleep_us`, `network`, `socket`. Don't use `random`, `dataclasses`, `typing` or f-strings with complex expressions. Use `.format()`, as the existing code does.
- Memory is tight. Effects use a hand-rolled LCG instead of `random` for this reason.
- There's no test framework. The `test_*.py` files are scripts you run on the device.

## Deploy / run (mpremote)

The serial port is `/dev/cu.SLAB_USBtoUART`.

```sh
# upload everything and run
mpremote connect /dev/cu.SLAB_USBtoUART cp main.py hw.py system.py module.py effects.py drivers.py :/ + cp modules/__init__.py :/modules/ + cp modules/cabin/__init__.py :/modules/cabin/ + cp modules/cabin/cabin1.py modules/cabin/cabin2.py modules/cabin/cabin3.py :/modules/cabin/ + run main.py

# run main and drop into the REPL
mpremote connect /dev/cu.SLAB_USBtoUART run main.py + repl

# hardware test scripts (no upload needed)
mpremote connect /dev/cu.SLAB_USBtoUART run test_channels.py
```

In the REPL: `ship.set_status('idle')`, `ship.set_status(Status.ERROR)`, `ship.stop()`.

When you add a new file, add it to the upload command in `README.md` too.

## Architecture

```
main.py      builds ShipSystem, registers cabin modules, runs ship.run(sequence) on a _thread
system.py    Status constants + ShipSystem (status broadcast, tick loop, LOADING→IDLE auto-transition)
module.py    Module: status_map {status: Effect|None}, channels, driver, sub_modules (hierarchical)
effects.py   Effects: Steady, Blink, RandomBlink, Pulse, Flicker, Sweep, LoadingSteps, Delay(wrapper)
drivers.py   TLCDriver (hw.set_channel), GPIODriver, ServoDriver — Module writes via driver.set(ch, value)
hw.py        TLC5940 bit-bang: set_channel/update/all_off; background _blank_loop thread owns the bus
wifi.py      AP "RasorCrest" + HTTP buttons at 192.168.4.1 (not wired into main.py yet)
modules/cabin/cabinN.py   create(channels, driver=None) → parent Module with one sub-Module per LED
```

The key contracts:
- **Status** values are lowercase strings (`Status.IDLE == "idle"`). In code, use the `Status.*` constants. If you add a status, add it to `STATUSES` in `system.py` too.
- **Effect interface:** a `reset()` method and a `done` attribute, plus either `tick(now_ms) -> int` (0–4095, applied to every channel in the module) or `tick_multi(now_ms) -> list[int]` (one value per channel). `Module.tick` checks for `tick_multi` with `hasattr`.
- A `None` effect in `status_map` means that module's channels are off for that status.
- **Auto-transition:** while in `LOADING`, once every module reports `done` (only `Sweep` ever sets it), the ship moves to `IDLE`. Effects that loop forever keep `done = False`.
- **Each `Effect` instance is stateful.** Never share one instance between two sub-modules. Create a new one in each `status_map` entry.
- **hw.py threading:** only `_blank_loop` touches the TLC5940 pins. Everything else calls `hw.set_channel()` and then `hw.update()`, which just sets a dirty flag. Don't shift data to the chip from any other thread.
- **Timing:** the ship ticks every 30 ms. GSCLK runs at 500 kHz and BLANK pulses every 6 ms, which has to stay under the 8.19 ms that 4096 GSCLK ticks take, or the LEDs go dark.
- Channels are 0–15. `main.py` currently maps cabin1 to 0–2, cabin2 to 3–5 and cabin3 to 6–7.

## Conventions

- Log lines look like `print("[module_name] message")`.
- Every file starts with a module docstring (`"""file.py — purpose"""`).
- Cabin files keep their tuning constants (`_LOAD_FREQ`, `_*_BRIGHTNESS`) at module level. Brightness is set deliberately low (15–50 out of 4095).
- Comments explain *why*, not what.

## Known doc drift (the code wins)

- The Copilot doc says GSCLK is 4 MHz and BLANK fires every ~1200 µs. The code uses 500 kHz and 6000 µs.
- The Copilot doc says the tick is ~20 ms and describes a `render()` method. The code ticks every 30 ms and has no `render()`: modules use `tick(now_ms)` and write through their driver.
- The effect names in the Copilot doc (`pulse()`, `fade()`, `strobe()`) don't match the classes in `effects.py`.
- The docstrings in the cabin files are copy-pasted and wrong: they mention "cabin11", "LED3" and 4 channels, but each module actually takes 3 or 2 channels.
- Motor control (`hw.init_motors`, `set_motor`) is planned and doesn't exist yet.
