# PRODUCT.md — Rasor Crest: product vision, companion app, system architecture

The product brief: what we're building and why, the domain model, the app's modes, and how the app and the
ESP32 split the work. Related: `FIRMWARE.md` (firmware), `HARDWARE.md` (boards, pins, power),
`PROTOCOL.md` (the BLE contract between app and firmware).

- Items marked **DECISION** are proposals from the design conversation. Confirm them before building on them.
  Items marked **OPEN** need the user's answer.

---

## 1. Vision

A **visual construction kit for LEGO electronics**. The end user knows **nothing about electronics**.
They get ready-made boards and keyed ribbon cables. The app tells them how to plug everything together,
lets them describe what is attached (lights, motors…), lets them build actions and sequences,
and then switches into a **Play mode**: a themed screen with big action buttons.

**It is a general product, not a one-off for one model.** Target users are teens and adults (not small kids)
who own any LEGO sets and want to bring **their own custom builds** to life. Any project can be configured:
a starship, a house, a train station, a castle…

The **Rasor Crest starship** (cabins with lights, doors/hatches, engines driven by motors) is the first real model.
It ships as a **sample project / template**. Nothing about it may be hard-coded in the app or firmware.

Product implications:

- **Generic over specific.** Devices, names, sequences, statuses and Play screens are user data. The firmware
  ships with no model-specific modules (today's `firmware/modules/cabin/*` become the starship sample config).
- **Self-explanatory onboarding.** Users can't ask the developer, so the wiring guide, device test and errors
  must stand on their own. Never show GPIO numbers or electronics jargon.
- **Languages:** at least English and Ukrainian from the start (i18n built in, no hard-coded strings).
- **Project templates:** start from a sample (Starship) or from scratch. Duplicate, export and import projects.
- **Extensible catalogs:** new boards and presets (servo, sound, sensors…) can be added in later app versions
  without breaking existing projects (versioned catalogs and config schema).
- **Several projects per user,** each bound to its own ESP32. Each controller needs a unique, user-renamable BLE name.

## 2. Platform

- **React Native + Expo**, TypeScript. iOS and Android.
- BLE requires an **Expo development build** (EAS), not Expo Go. Library: `react-native-ble-plx`.
- Talks to the ESP32 (MicroPython) over **BLE** (see `PROTOCOL.md`). The phone keeps its internet;
  there's no Wi-Fi setup.
- Offline-first: projects are stored locally on the phone. Export/import as a file (JSON).

## 3. Core concepts (domain model)

| Concept | Meaning | Example |
|---|---|---|
| **Board** | A physical module on one of our perfboards, known to the app with its ports | ESP32 controller (board 1), Lighting board / TLC5940 (board 2, 16 channels), Motor board / 1 or 2× TB6612 (board 3, 2 or 4 motor ports; the user picks the driver count) |
| **Port / channel** | A connection point on a board that one device can occupy | TLC channel 0–15; motor port M1–M4 |
| **Cable** | A known connection between boards, keyed and with a fixed pin order | Ribbon "Lights" (board 1 ↔ 2), Ribbon "Motors" (board 1 ↔ 3), Cable "Power" (board 1 ↔ 4), Battery lead → board 4 |
| **Preset (device type)** | A kind of thing the user attaches, with its own actions and settings | **Light**, **Motor**, later **Servo**, Sound… |
| **Device** | A named instance of a preset bound to a port | "Cabin 1 lamp" → TLC ch 0; "Rear hatch" → Motor M1 |
| **Action** | A single command to one device | Light: on / off / brightness / effect (blink, pulse, flicker…). Motor: run(direction, speed, duration), stop |
| **Sequence** | An ordered list of steps; a step is an action, a wait, or a parallel group | "Engine start" = servo nozzle → motor forward 1 s → reverse 1 s → engine lights pulse → motors full speed |
| **Status / scene** | A named state that sets many devices at once (matches the firmware `Status` concept) | idle, loading, error, damaged, off |
| **Play layout** | Background image + buttons; each button triggers a sequence or a status | Starship screen with "Launch", "Open rear hatch", "Cabin error"… |
| **Project** | Everything above for one model | "Rasor Crest" |

### Port occupancy (key UX rule)

- A port can hold **one device**. When a device is bound, the port is shown as **occupied**,
  with the device name, its icon and **live activity** (on/off, brightness, motor direction/speed).
- Occupied ports can't be chosen again; the picker greys them out with the reason.
- The board view is the main map: tapping a port shows its device, or offers "Attach device here".
- Validation: unknown/unplugged boards, too many devices, motors without a motor board, and so on, are shown
  as friendly warnings, not errors in technical terms.

**What the app already does with ports:** `APP_WORKFLOW.md` (the "Outputs and devices" sheet and its rules).
Still to build: device test button, actions/effects, statuses, sequences, saving, and compiling devices into the
config for the ESP32 (`PROTOCOL.md` §6).

### Board budget (decided, in the app)

The user may add several boards of one kind. The controller has a fixed set of GPIO pins, so the app
recalculates what still fits on every change and **dims** boards that don't, with the reason ("No space left on
the controller"). It does the same for the motor-driver count (1 or 2) of a placed motor board. The pin map and
the capacity table are in `HARDWARE.md` §3 ("GPIO allocation by module"); the code is `app/src/project/budget.ts`
and `app/src/catalog/gpio.ts`. The user never sees GPIO numbers.

- **Lighting boards daisy-chain** from the previous one and share the same 5 pins, so the second costs no pins.
  Limited to **2** until the chain length is measured (`HARDWARE.md` O19).
- **Motor boards** each have their own socket on the controller, with fixed pins: socket A takes up to 2 drivers,
  socket B 1 driver. A cable carries only the lines of the drivers fitted. The pins don't overlap with the lighting
  chain, so lights and up to 3 drivers (6 motors) work together. Socket B uses GPIO 2, which is unverified on the
  bench (`HARDWARE.md` O20).
- **OPEN:** the second socket and its board aren't designed in hardware yet (`HARDWARE.md` O18).

### Power (decided in the app, hardware not designed)

Power is independent of the motors. The controller has one **Power** socket: the user picks the **Power board**
(battery, switch, fuse, buck) or **USB power** (the controller's own USB-C port, for lights and sound). Never both
(`HARDWARE.md` §2). The power cable is one wide keyed cable (5V, motor supply, GND); the controller passes the motor
supply on to the motor boards without the ESP32 touching it, so the schematic draws it from the power board
through the controller to the motor boards. Motor boards **require the Power board** (motors run from the battery),
and are removed with it. Pin counts, wire gauge and the board layout aren't designed (`HARDWARE.md` O21).

## 4. Modes

### 4.1 Setup mode (constructor)

1. **My hardware.** The user picks which boards they have (or the app reads it from the ESP32, see §6).
2. **Connect it.** An illustrated, step-by-step wiring guide, generated from the chosen boards:
   which cable goes from which board to which, which way the battery plugs in, where the power switch is.
   Pictures of the real boards, highlighted connectors, a "Done → next" flow, and a final checklist
   ("switch off, plug battery, switch on, blue LED…").
3. **Attach devices.** Pick a preset (Light, Motor…), name it, choose a free port on the board view.
4. **Test.** Every device has a test button (blink the lamp, nudge the motor) to confirm the right thing moved.
   This also helps the user discover which port is which.
5. **Build actions & sequences.** A visual editor: add steps, set durations, reorder, parallel groups,
   preview/run on the model.
6. **Design Play screen.** Choose a background image (bundled themes or the user's photo), add buttons,
   assign each to a sequence or status, choose icon/colour, arrange the layout.

### 4.2 Play mode

- Full-screen themed image + large action buttons. No technical details.
- For the starship, example buttons: **Launch ship, Open rear hatch, Close rear hatch, Workstation,
  Cabin loading, Cabin error, Engines error, Move, Start engines**.
- A button shows progress while its sequence runs. Running sequences can be cancelled.
- A connection indicator (connected / reconnecting) is always visible.
- **OPEN (A8):** an always-visible STOP-all button, and a deliberate gesture to leave Play mode
  (e.g. a long press, so visitors at an expo don't fall into Setup). Maybe both as user settings.
  Regardless of the UI, the firmware's motor watchdog and runtime limits stay mandatory.

## 5. Bundled knowledge (catalogs shipped with the app)

Static, versioned data files in the app:

- **Board catalog:** id, name, picture, ports (type, count, labels), connectors, which cable fits which connector,
  power requirements. Source of truth for pins is `HARDWARE.md`. The **user never sees GPIO numbers**.
- **Cable catalog:** id, name, colour/label, the two connectors it joins.
- **Preset catalog:** device types, their actions, parameters (with safe ranges), default effects,
  the port type they need (Light → TLC channel, Motor → motor port, Servo → servo port).
- **Effect library:** must match the firmware effects (`firmware/effects.py`): Steady, Blink, RandomBlink, Pulse, Flicker,
  Sweep, LoadingSteps, Delay. The app and firmware share effect ids and parameters.

## 5a. Hardware kits & automatic board detection (decided)

**Kits.** Users buy **ready-made kits**: pre-soldered boards, keyed cables, firmware pre-installed. A kit's hardware
is fixed. The user never solders or changes boards. Consequences:

- The board catalog describes exact kit SKUs (photos of the real boards, exact connectors). The wiring guide can be
  precise and photo-based. No DIY or soldering content in the app.
- The user's freedom is in **what they attach to the ports** (lights, motors) and **what the model does**
  (devices, sequences, Play screen), not in the electronics.
- Firmware updates (later): the app should be able to tell when the firmware is outdated. OTA over BLE is a future item.

**Automatic board detection.** The ESP32 detects which board is plugged into each ribbon connector of the controller:

- Each ribbon carries one **ID line**. Each peripheral board has a resistor of a type-specific value from ID to GND.
  The controller has a pull-up to 3V3 and reads the voltage with an **ADC input-only pin** (GPIO 34/35/36/39). These pins
  can't drive outputs anyway, so detection costs **no output GPIO**.
- Voltage → board type, e.g. "Lighting board (TLC5940)", "Motor board, 1 driver", "Motor board, 2 drivers".
  **Decided:** the motor board is one board type with room for two TB6612 drivers (2 motors each). In the app the
  user picks 1 or 2 drivers on the placed board; detection must later report the driver count so the app can
  check it against that choice.
  ~3.3 V = **nothing connected**. Use a few well-separated levels: the ESP32 ADC is noisy and non-linear.
- Detection runs at boot and periodically (cheap). Plugging cables with the power on is still discouraged.
- `hello` / State reports `boards: [{connector, type, revision?}]`. The app then:
  - skips manual board selection and shows only what is physically present;
  - warns in plain words when a project needs a board that isn't connected ("Plug in the Motor board to use the
    rear hatch"), and disables those devices instead of failing;
  - uses detection inside the wiring guide: a step turns green when the ESP32 sees that board.
- Firmware must **refuse to drive a port whose board isn't detected** (no motor PWM into an empty connector).

## 6. App ↔ ESP32 architecture

**DECIDED (confirmed by the user): sequences run on the ESP32, not on the phone.**

- In Setup, the app compiles the project into a **compact config** (devices, bindings, sequences, statuses) and
  **uploads it over BLE**. The ESP32 stores it in flash (e.g. `config.json`) and runs it after reboot even without the phone.
- In Play, a button sends only **"run sequence <id>"** / **"set status <id>"** / **"stop all"**.
- Why: timing stays exact (the 30 ms tick loop), a BLE drop doesn't break a running sequence, and the
  motor safety logic lives next to the motors.
- Consequence for firmware: the current hard-coded cabin modules (`firmware/modules/cabin/*.py`, `main.py` mapping)
  evolve into a **data-driven interpreter** that builds modules/effects from the uploaded config. This is a large
  firmware change. Plan it as its own milestone.

The BLE protocol (GATT layout, commands, state notifications, reliability, config versioning, pairing)
is specified in `PROTOCOL.md`.

## 7. Safety rules the app must enforce

- Motor speed/duration are limited to safe ranges from the preset catalog. A sequence can't run a motor forever.
- Optional soft start; motor starts in a sequence are staggered by ≥100–200 ms (reduces battery sag and brownouts).
- A STOP-all command exists in the protocol and is reachable from the app (exact Play-mode UI: A8).
- The wiring guide always says: **switch off before plugging cables**. It also shows the battery polarity check.

## 8. Hardware reality check (from `HARDWARE.md`)

- Board 2 (TLC5940): 16 light channels; **8 are wired today** (cabins 1–3). LEDs plug directly into the TLC.
- Board 3: up to **4 DC motors** (2× TB6612). The motor count is still OPEN.
- **Servo is not supported by the current boards.** It needs a free GPIO (PWM, 50 Hz) and a 5 V supply.
  The GPIO budget on the ESP32 is nearly exhausted (13 of 14 safe outputs planned). **OPEN:** add a servo port,
  or a PCA9685 servo/PWM board on I²C (2 pins, 16 servo channels).
- Single ESP32 per model for now. Multiple ships = multiple projects, each bound to its own ESP32 (unique BLE name).

## 9. Suggested milestones

1. **BLE link:** connect, `hello`, heartbeat, `stop_all`, `set_status` with the existing hard-coded statuses
   (works with today's firmware).
2. **Board view + device binding:** catalogs, port occupancy, device test commands.
3. **Wiring guide:** generated from the selected boards and cables.
4. **Config upload + data-driven firmware:** devices and statuses from the config.
5. **Sequence editor + on-device sequence runner.**
6. **Play mode:** themed screens, buttons, progress, STOP-all.
7. **Polish for the expo:** the Rasor Crest theme, kiosk-like Play mode lock, reconnect UX.

## 10. Open questions

| # | Question | Status |
|---|---|---|
| A1 | Sequences stored and executed on the ESP32 | ✅ Decided: yes (§6) |
| A2 | Servo support: extra GPIO port or a PCA9685 board (I²C, 16 channels)? Needed for e.g. "engine start" with a servo | ⏳ Open, servo itself still undecided |
| A3 | Can the ESP32 detect which boards are connected? | ✅ Decided: yes, auto-detect via an ID resistor on each ribbon (§5a; ID-resistor values and pins not yet in `HARDWARE.md`) |
| A4 | Who is the end user? | ✅ Decided: general product for any LEGO builders (teens/adults, not small kids), any custom project (§1) |
| A5 | Play screen images: bundled art per template, the user's own photos, or both? | ⏳ Open |
| A6 | Should Play mode control several models at once? (default: no, one model) | ⏳ Open |
| A7 | Number of motors on the starship sample (also `HARDWARE.md` O3) | ⏳ Open |
| A8 | Play-mode safety UI: always-visible STOP-all button; deliberate gesture to leave Play mode | ⏳ Open |
| A9 | How users get the hardware | ✅ Decided: **ready kit**. Pre-built boards and cables, sold as fixed sets that the user doesn't modify (§5a) |
