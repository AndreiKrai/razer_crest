# FIRMWARE.md — ESP32 MicroPython firmware: runtime, architecture, contracts

The firmware lives in `firmware/`. It drives the lights through a TLC5940 16-channel 12-bit PWM sink driver
and the motors through TB6612FNG H-bridges. Wiring, pins and power: `HARDWARE.md`.
The phone link (BLE): `PROTOCOL.md`.

Today the firmware is hard-coded for the Rasor Crest starship (`modules/cabin/*`). Per `PRODUCT.md` §6 it will
become a data-driven interpreter of a config uploaded from the app; the cabin modules then become the
starship sample config. Don't add new model-specific code without checking with the user.

---

## 1. Runtime constraints

- This is **MicroPython on ESP32** (v1.29), not CPython. Only use modules that exist there: `machine`, `_thread`,
  `time.ticks_ms/ticks_add/ticks_diff/sleep_ms/sleep_us`, `network`, `socket`, `bluetooth`. Don't use `random`,
  `dataclasses`, `typing` or f-strings with complex expressions. Use `.format()`, as the existing code does.
- Memory is tight. Effects use a hand-rolled LCG instead of `random` for this reason.
- There's no test framework. The `test_*.py` files are scripts you run on the device.

## 2. Deploy / run (mpremote)

**Run every command from `firmware/`** (`cd firmware`). The device paths (`:/…`) mirror the contents of
`firmware/`, so the device root holds `main.py`, `hw.py`, `modules/`…

`mpremote connect auto` picks the first USB serial port, so the commands don't depend on which USB socket the
board is plugged into. To see the actual port, run `ls /dev/cu.usb*` (CH340: `/dev/cu.usbserial-<N>`).

Remember the power rule in `AGENTS.md`: USB and the buck's Vo → VIN are never connected at the same time.

```sh
cd firmware

# upload everything and run
mpremote connect auto cp main.py hw.py system.py module.py effects.py drivers.py motor.py :/ + cp modules/__init__.py :/modules/ + cp modules/cabin/__init__.py :/modules/cabin/ + cp modules/cabin/cabin1.py modules/cabin/cabin2.py modules/cabin/cabin3.py :/modules/cabin/ + run main.py

# run main and drop into the REPL
mpremote connect auto run main.py + repl

# hardware test scripts (no upload needed)
mpremote connect auto run test_channels.py

# motor bench test (motor.py must be on the device)
mpremote connect auto cp motor.py :/ + run test_motor.py

# standalone self-test without a PC: installed as main.py, runs on power-up
mpremote connect auto cp hw.py motor.py :/ + cp test_standalone.py :main.py
```

In the REPL: `ship.set_status('idle')`, `ship.set_status(Status.ERROR)`, `ship.stop()`.

When you add a firmware file, add it to the upload command here **and** in `README.md`.

## 3. Architecture

```
main.py      builds ShipSystem, registers cabin modules, runs ship.run(sequence) on a _thread
system.py    Status constants + ShipSystem (status broadcast, tick loop, LOADING→IDLE auto-transition)
module.py    Module: status_map {status: Effect|None}, channels, driver, sub_modules (hierarchical)
effects.py   Effects: Steady, Blink, RandomBlink, Pulse, Flicker, Sweep, LoadingSteps, Delay(wrapper)
drivers.py   TLCDriver (hw.set_channel), GPIODriver, ServoDriver — Module writes via driver.set(ch, value)
motor.py     DRV8833Motor: one H-bridge channel, set(-100..100) + update() ramp, coast/brake, stop_all()
hw.py        TLC5940 bit-bang: set_channel/update/all_off; background _blank_loop thread owns the bus
wifi.py      AP "RasorCrest" + HTTP buttons at 192.168.4.1 (not wired in; to be replaced by BLE, see PROTOCOL.md)
modules/cabin/cabinN.py   create(channels, driver=None) → parent Module with one sub-Module per LED
test_*.py    on-device test scripts (test_standalone.py reports progress through the cabin LEDs, see its docstring)
```

## 4. Contracts

- **Status** values are lowercase strings (`Status.IDLE == "idle"`). In code, use the `Status.*` constants.
  If you add a status, add it to `STATUSES` in `system.py` too.
- **Effect interface:** a `reset()` method and a `done` attribute, plus either `tick(now_ms) -> int`
  (0–4095, applied to every channel in the module) or `tick_multi(now_ms) -> list[int]` (one value per channel).
  `Module.tick` checks for `tick_multi` with `hasattr`. Effect ids and parameters are shared with the app
  (`PRODUCT.md` §5); renaming one is a protocol change.
- A `None` effect in `status_map` means that module's channels are off for that status.
- **Auto-transition:** while in `LOADING`, once every module reports `done` (only `Sweep` ever sets it),
  the ship moves to `IDLE`. Effects that loop forever keep `done = False`.
- **Each `Effect` instance is stateful.** Never share one instance between two sub-modules.
  Create a new one in each `status_map` entry.
- **hw.py threading:** only `_blank_loop` touches the TLC5940 pins. Everything else calls `hw.set_channel()`
  and then `hw.update()`, which just sets a dirty flag. Don't shift data to the chip from any other thread.
- **Timing:** the ship ticks every 30 ms. GSCLK runs at 500 kHz and BLANK pulses every 6 ms, which has to stay
  under the 8.19 ms that 4096 GSCLK ticks take, or the LEDs go dark.
- Channels are 0–15. `main.py` currently maps cabin1 to 0–2, cabin2 to 3–5 and cabin3 to 6–7.
- **Motors** are command-driven, not driven by ship status. Motor code lives in `motor.py`, never in `hw.py`.
  The hardware-derived motor rules (4-GPIO mode, 1 kHz, ramps, staggering, limits) are in `HARDWARE.md` §4.

## 5. Motor code: current state

- `motor.py`: `DRV8833Motor` (the name predates identifying the chip as a TB6612; the logic is identical in
  4-GPIO mode): signed speed −100..100, 250 ms ramp, 100 ms pause on reversal, `coast()`, `brake()`, `stop_all()`.
- **Not yet implemented:** start staggering, max-runtime limit, watchdog, actuators (`Spinner`, `Door`, `Servo`),
  a motor manager, and the command layer.
- `test_motor.py`: bench test over USB: engine and door forward/reverse, then a direct reversal.
- `test_standalone.py`: the same test without a PC. Installed as `main.py`, it runs on power-up and reports
  progress through the cabin LEDs.

## 6. Conventions

- Log lines look like `print("[module_name] message")`.
- Every file starts with a module docstring (`"""file.py — purpose"""`).
- Cabin files keep their tuning constants (`_LOAD_FREQ`, `_*_BRIGHTNESS`) at module level.
  Brightness is set deliberately low (15–50 out of 4095).
- Comments explain *why*, not what.

## 7. Known quirks in the code

- The docstrings in the cabin files are copy-pasted and wrong: they mention "cabin11", "LED3" and 4 channels,
  but each module actually takes 3 or 2 channels.
