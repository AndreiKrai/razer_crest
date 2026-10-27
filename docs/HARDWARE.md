# HARDWARE.md — Rasor Crest physical build: state, decisions, open items

This file describes the hardware as it is **actually wired or decided**: components, power, the three
perfboards, pin maps, motor rules and open items. It is the source of truth for anything physical.
Where it disagrees with the code, check with the user: the code (`firmware/`) reflects what's on the bench today.

**Working with the user on hardware:**

- Explain hardware steps physically and concretely: which wire goes from which pin to which pin.
- Items marked **TBD** are unverified. Never present them as facts. Ask, or flag them.

---

## 1. Components

| Part | Exact model | Footprint on 2.54 mm perfboard | Notes |
|---|---|---|---|
| MCU | ESP32 DevKit V1 clone, silkscreen **HW-394**, ESP32-WROOM-32D, **30 pins**, USB-C, CH340 USB-UART | **15 × 11 holes** (rows 10 pitches apart) | The user has **two** ESP32 boards (see below). MicroPython v1.29 |
| Motor driver | **TB6612FNG** breakout (red, marked "177"), 10 µF tantalum on board | **8 × 7 holes** (2 rows of 8, rows 6 pitches apart) | Sold as "DRV8833", but it's a TB6612FNG. Earlier DRV8833 advice is obsolete |
| LED driver | **SparkFun TLC5940 Breakout**, 16 ch, 12-bit | **9 × 24 holes** (INPUT row 1, OUTPUT row 24) | Channel pins sit off-grid (half-pitch offset) and don't plug into perfboard |
| Buck converter | **DD4012SA** (green, 10 µH inductor), **5V** solder jumper bridged | 1 × 3 pins: **Vo, Gnd, Vi**. Stands vertically (SIP, like a 7805): **19 mm** from pin tips to top edge, ≈ 16 mm above the board once inserted (estimate). Vertical vs bent flat on board 3: **TBD** (O17) | "V1" on the silkscreen means **Vi**. Pin order looks mirrored between front and back. Rated current **TBD** (~1 A typical) |
| Battery | Mould King M0019 Power Module 6.0 ([product](https://www.amazon.de/dp/B09L8K1JT4)) | — | 2S lithium, see §2 |
| Motors | Mould King DC motors (brushed, 2 wires used: C1/C2) | — | Engine (2 spinners in parallel), door, 2 servos or plain motors, see §4 |

### Two ESP32 boards

The user has two ESP32 boards. Firmware is portable between them: both are ESP32 (same GPIO
numbers, same MicroPython build), and every GPIO used below exists on a 30-pin DevKit.
What differs is the **physical pin layout**, which only matters for the board 1 shield (§3).

- **HW-394** (30-pin, USB-C): the board the §3 geometry is drawn for.
- The other board: the LED setup was first done on it. Exact model **TBD** (an earlier note said
  "ESP32-D0WD-V3 DevKit, CH340, 4 MB flash"; that chip usually sits on a WROOM-32E).
- **TBD (O13):** which board goes into the ship. Board 1 must be laid out for that one.

Both use CH340, so the port is `/dev/cu.usbserial-<N>` (seen: `/dev/cu.usbserial-10`).
`mpremote connect auto` picks it automatically, so the board choice doesn't affect the commands.

### ESP32 HW-394 pinout (top view, chip side up, USB at top)

| Left column (top → bottom) | Right column (top → bottom) |
|---|---|
| 3V3, GND, D15, D2, D4, D16, D17, D5, D18, D19, D21, RX0, TX0, D22, D23 | VIN, GND, D13, D12, D14, D27, D26, D25, D33, D32, D35, D34, VN, VP, EN |

GPIO constraints:

- **Never GPIO 12**: strapping pin; if it's high at reset, the ESP32 won't boot.
- **No motors on GPIO 14**: it outputs PWM during boot, so a motor twitches.
- GPIO 0, 2, 5, 15 are strapping or noisy at boot. Use them only for signals that tolerate that.
- 34, 35, VP (36), VN (39) are **input-only**.
- RX0/TX0 are the REPL UART.

### TB6612FNG breakout pinout (from the back silkscreen; mirrored when viewed from the top)

| Left row | Right row |
|---|---|
| PWMA, AIN2, AIN1, STBY, BIN1, BIN2, PWMB, GND | VM, VCC, GND, AO1, AO2, BO2, BO1, GND |

- `VM` = motor supply (battery +). `VCC` = **logic supply, 2.7–5.5 V → ESP32 3V3**, never the battery.
- `STBY`, `PWMA`, `PWMB` → 3V3 (see §4). Left floating, the motors won't run.
- All GND pins on the board are the same net.
- Limits: VM 2.5–13.5 V; 1.2 A continuous / 3.2 A peak per channel; thermal shutdown.
- Swapping AIN1/AIN2 or BO1/BO2 only flips direction (fixed in software), so it's not a safety issue,
  but board 3 wiring must follow the real order. Check the orientation when inserting (O12).

### SparkFun TLC5940 Breakout layout (top view, chip side up)

```
        1    2    3    4     5     6     7     8     9
  1    GND  VCC  SCLK SIN  BLANK  XLAT GSCLK XERR  VPRG   ← INPUT (used)
  2–3  (empty)
  4–19 channels 0–15, each: [GND hole, unpopulated] [V+] [OUT]   (cols ~1–3, off-grid)
  20–23 (empty)
 24    GND  VCC  SCLK SOUT BLANK  XLAT GSCLK XERR  VPRG   ← OUTPUT (daisy-chain; unused)
```

- Header pins point **away** from the chip side, so the board plugs into perfboard chip-side up.
- Channels 0–7 are in use (cabin1 0–2, cabin2 3–5, cabin3 6–7, see `main.py`); 8–15 are free.
  LEDs connect through 2-pin Dupont plugs (red = V+/anode, black = OUT/cathode). The TLC sinks current.
- VPRG is wired to **GND** (grayscale mode; `hw.py` never drives it). XERR is not connected.
- More channels later: a second TLC5940 daisy-chains from the OUTPUT row on the same 5 GPIOs
  (`hw.py` would need `NUM_CHANNELS = 32` and to shift 32 channels).
- The breakout has two mounting holes on the chip side, near each end.

### TLC5940 VCC: currently 5 V, which is out of spec for 3.3 V logic (O2)

TLC5940 inputs need **VIH ≥ 0.8 × VCC**. At VCC = 5 V that's 4.0 V, and the ESP32 drives 3.3 V.
It works on the bench, but with no margin: it may fail with a longer ribbon, noise or heat.

Fix: **TLC VCC → 3V3** (the TLC5940 runs at 3.0–5.5 V; VIH becomes 2.64 V). LED anodes (V+) can
stay on 5 V, because the OUT pins tolerate up to 17 V. **TBD:** whether the breakout's channel `V+`
pins are joined to `VCC` or are a separate rail. Check with a multimeter (continuity between INPUT
`VCC` and any channel `V+`). If they're joined, all LEDs move to 3V3 together; that's fine at the
current low brightness, but the 3V3 regulator then carries the LED current.

---

## 2. Power

### Battery

Mould King M0019 "6.0" module: a 2S lithium pack. "6.0" is the system generation, not volts.

| | Value | Source |
|---|---|---|
| Nominal | 7.2–7.4 V | 2S lithium standard; [Eurobricks thread](https://www.eurobricks.com/forum/forums/topic/189216-mold-king-powered-module) |
| Full charge | ~8.4 V (a forum user's multimeter reading) | same thread |
| Empty | ~6.0–6.4 V (typical 2S cutoff) | general figure, **not measured on this pack** |
| Capacity, max current, built-in protection | unknown | not published |

The motor rail swings ~8.4 → ~6 V over a discharge, which is within TB6612 VM limits; LEGO-style motors
are made for "9 V". Forum users report the module's own outputs are weak (motors stall easily), so the
pack may have current limiting (unconfirmed).

**TBD (O7):** where the battery wires attach. The user believes they come from one of the module's
**motor ports**. Those ports may be switched or PWM'd by the module (speed control), which would make
them an unreliable supply for the ESP32. Check with a multimeter: the voltage at the port should be
steady and close to the pack voltage, and must not change when the module's controls are used.

### Topology (decided)

```
Battery (+) ──[SWITCH ≥3 A]──[FUSE 2.5 A PPTC]──┬──► TB6612 VM (×2) ──► motors
                                                 ├──► 220 µF / ≥16 V electrolytic ──► GND
                                                 └──► DD4012SA Vi
                                                        Vo ──►|── (Schottky 1N5819/SS34) ──► 5V line → ESP32 VIN
Battery (−) ───────────────────────────────────────► common GND
ESP32 3V3 ──► TB6612 VCC, STBY, PWMA, PWMB; TLC5940 VCC (planned, see O2)
```

Installed today: battery → TB6612 VM and buck Vi; buck Vo → ESP32 VIN (direct, **no diode yet**);
TLC VCC on 5 V. **Not installed yet:** switch, fuse, bulk capacitor, Schottky diode.

- **Motors are fed straight from the battery** through VM, never through the buck. The buck powers
  only the electronics (~200–500 mA total), so one DD4012SA is enough.
- **Common ground everywhere** (battery, buck, ESP32, TB6612, TLC). Run a direct ESP32 GND → TB6612 GND
  wire as well; don't rely on the path through the buck, which disappears when the buck is unplugged.
  Joining battery GND with the PC's USB GND is fine, because the battery is isolated.
- ESP32's onboard 3V3 regulator is linear. If LEDs ever run bright, take LED V+ from 5 V, not 3V3.

### ⚠️ Power rule: USB and buck Vo are mutually exclusive (until the diode is fitted)

**Back-feed incident (real):** with USB connected and buck Vo wired to VIN, USB 5 V flowed back
through the buck into the Mould King battery. Its blue LED came on and its button stopped
responding until everything was disconnected.

| Mode | Buck Vo → ESP32 VIN | USB to PC |
|---|---|---|
| Development (flash / REPL / tests) | **disconnected** | connected |
| Standalone run | connected | **disconnected** |

In development the battery still powers the TB6612 (motors); the ESP32 runs from USB.

**Fix (planned): a Schottky diode Vo → VIN** (band towards VIN). It drops ~0.3–0.45 V, so VIN sees
~4.6 V, which is still enough for the onboard 3V3 regulator. **Until the diode is installed and the user
confirms it, never tell them to connect USB and buck Vo at the same time.**

### Brownout

Battery sag when motors start can reset the ESP32. Mitigations: the bulk capacitor, soft-start ramps,
and staggering motor starts by 100–200 ms. `test_standalone.py` signals a non-power-on reset with
5 fast LED blinks.

### Fire / thermal safety (LEGO is ABS: softens ~90–100 °C, flammable)

- **Fuse** close to the battery on the + lead. This is the main protection against a short.
- **Mechanical power switch** on the + lead, somewhere reachable on the model (expo kill switch).
- 2–3 mm air gap between boards and plastic (headers/standoffs); Kapton tape where solder joints touch plastic.
- Firmware: max-runtime limit (30 s planned) and a comms watchdog that stops motors.
- First run: 10–15 min supervised. TB6612, buck and the ESP32 regulator should stay ≲ 50–60 °C.
- At the expo: don't leave the model powered unattended.
- Motor cables carry battery + on their 9V contact (see §4). Keep exposed plug contacts away from metal.

---

## 3. Mechanical design: three small perfboards (variant A, hand-soldered)

Space is tight, so the electronics are split into three boards linked by ribbon cables.
Use **double-sided, plated-through-hole perfboard**.

| Board | Size | Mounting | Contents |
|---|---|---|---|
| **1. ESP32 shield** | ~15 × 11 holes (ESP32 footprint) | The **ESP32 lies chip side down on a LEGO frame, pins pointing up**; board 1 plugs onto those pins | Female headers on the **bottom** (cols 1 & 11) for the ESP32; male output headers on **top**, in **two parallel rows along the board length**, one connector per destination |
| **2. TLC** | **11 × 20 holes** | **Inside** a LEGO frame (inner opening 28 × 52 mm; dividers ignored, one solid board), pins down | 1×9 female header for TLC INPUT (row 1, cols 1–9); ribbon connector along **col 11**; TLC fixed by INPUT header + **M2 standoff** in one TLC mounting hole |
| **3. Motors + power** | **11 × 20 holes** | Inside a LEGO frame, same size, pins down | 2 × TB6612 stacked lengthwise (16 × 7), buck, diode, bulk cap, battery connector, motor outputs, ribbon connector. **Tight**: JST-XH housings probably won't fit side by side, so some connectors will be plain pin headers |

LEGO reference part: window frame 1 × 4 × 6 with three panes (outer ≈ 32 × 57.6 mm, inner 28 × 52 mm).
Max component height above a board: **12–20 mm**. Modules may overhang the perfboard.

### Coordinate convention (all boards)

`R<row>C<col>`. Row 1 is the top edge, Col 1 is the left edge, **viewed from the board's TOP side**
(the side facing away from the LEGO frame, where the outward connectors are). 2.54 mm pitch.
Always state which side you are looking at. Mirroring mistakes are the #1 risk on this build.

### Board 1: ESP32 shield, pin coordinates

The ESP32 is mounted **chip side towards the LEGO frame, pins pointing out** (confirmed by the user).
Board 1 sits on those pins, so from board 1's top you see the ESP32 **from below**, and **left/right are
mirrored** relative to the ESP32's printed top view. USB end = row 1. Drawn for the **HW-394**; redo it
if the other board goes in (O13).

| Row | **C1** (ESP32 *right* column seen from its top) | Use | **C11** (ESP32 *left* column seen from its top) | Use |
|---|---|---|---|---|
| R1 | VIN | 5V from board 3 | 3V3 | to boards 2 & 3 |
| R2 | GND | | GND | |
| R3 | GPIO13 | motor 1 AIN2 | GPIO15 | TLC GSCLK |
| R4 | GPIO12 ⛔ strapping | — | GPIO2 ⚠ strapping | free |
| R5 | GPIO14 ⚠ boot PWM | — | GPIO4 | TLC BLANK |
| R6 | GPIO27 | motor 1 BIN1 | GPIO16 | motor 2 BIN1 (proposed) |
| R7 | GPIO26 | motor 1 AIN1 | GPIO17 | motor 2 BIN2 (proposed) |
| R8 | GPIO25 | motor 1 BIN2 | GPIO5 ⚠ strapping | TLC XLAT |
| R9 | GPIO33 | motor 2 AIN1 (proposed) | GPIO18 | TLC SCLK |
| R10 | GPIO32 | motor 2 AIN2 (proposed) | GPIO19 | free |
| R11 | GPIO35 (input only) | (TLC XERR, optional) | GPIO21 | free |
| R12 | GPIO34 (input only) | free | RX0 ⛔ REPL | — |
| R13 | VN / GPIO39 (input only) | free | TX0 ⛔ REPL | — |
| R14 | VP / GPIO36 (input only) | free | GPIO22 | free |
| R15 | EN ⛔ reset | — | GPIO23 | TLC SIN |

- Female headers 1×15 at C1 and C11 go on the **bottom** side. Columns C2–C10 on top are free for the
  two output connector rows (running along the length, R1–R15).

### Board 2: TLC, pin coordinates

Top view, chip side up, INPUT at the board's top edge.

| Hole | TLC INPUT pin | Goes to |
|---|---|---|
| R1C1 | GND | GND |
| R1C2 | VCC | 3V3 (planned, O2; currently 5V) |
| R1C3 | SCLK | GPIO 18 |
| R1C4 | SIN | GPIO 23 |
| R1C5 | BLANK | GPIO 4 |
| R1C6 | XLAT | GPIO 5 |
| R1C7 | GSCLK | GPIO 15 |
| R1C8 | XERR | not connected |
| R1C9 | VPRG | GND (on board 2) |

- Ribbon connector to board 1: along **C11, starting at R1**. Pin order **TBD**, the same on both ends.
  C10 is left free as a gap. Wiring R1Cx → C11 runs on the bottom side.
- LED channel headers (off-grid, pointing up) are on the C1 side of the TLC. LED cables exit over the C1 edge.
- The TLC is ~61 mm long, so it **overhangs board 2 by ~4 rows (~10 mm)**; the OUTPUT row is off-board.
  It's held by the INPUT header plus a standoff (hole position **TBD**, O4).
- **Channel headers get re-soldered to point UP** (towards the chip side), so LEDs plug directly into the TLC.
  Prefer **right-angle (90°) double-row headers** so the LED cables exit sideways and the stack stays low.
  Re-soldering: cut the plastic strip, desolder pins one by one, clear the holes with wick or a pump.
  Only channels 0–7 (+ a few spares) need it.
- The space under the TLC (~11 mm clearance) can hold low parts and wiring.
- Recommended: 10 kΩ pull-up from BLANK to 3V3, so the LEDs stay off while the ESP32 boots and
  GPIO 4 floats.

### Board 3: motors + power, pin coordinates (geometry not final)

Top view. Proposed placement:

| Item | Holes |
|---|---|
| TB6612 #1 (left row = PWMA…GND, right row = VM…GND, **verify orientation** (O12), the silkscreen is on the back) | R1–R8, C1 (left row) & C7 (right row) |
| TB6612 #2 | R9–R16, C1 & C7 |
| Free strip for buck, diode, cap, battery connector, fuse (if on board) | R17–R20, C1–C11 |
| Free columns beside the drivers for motor outputs and the ribbon connector | C8–C11, R1–R16 (tight; plain pin headers, not JST-XH) |

TB6612 #1 row by row (mounted with PWMA at R1):

| Row | C1 | C7 |
|---|---|---|
| R1 | PWMA → 3V3 | VM → battery + (after fuse) |
| R2 | AIN2 → GPIO 13 | VCC → 3V3 |
| R3 | AIN1 → GPIO 26 | GND |
| R4 | STBY → 3V3 | AO1 → engine C1 |
| R5 | BIN1 → GPIO 27 | AO2 → engine C2 |
| R6 | BIN2 → GPIO 25 | BO2 → door C2 |
| R7 | PWMB → 3V3 | BO1 → door C1 |
| R8 | GND | GND |

TB6612 #2: same pattern at R9–R16: AIN1 → GPIO 33, AIN2 → GPIO 32, BIN1 → GPIO 16, BIN2 → GPIO 17
(proposed), outputs → servo/motor 1 and servo/motor 2.

### Ribbon cables / connectors (decided)

- **Keyed connectors** so a cable can't be reversed or shifted (JST-XH single row, or shrouded IDC).
  The two connectors have **different pin counts**, so the TLC and motor cables can't be swapped.
- **Keep the same pin order on both ends** of each cable.
- Put several GND wires in each ribbon, interleaved with signals (GSCLK runs at 500 kHz). Keep cables ≤ 15–20 cm.
- Battery power **does not** go through the ribbons. The battery connects only to board 3 with a thicker 2-pin lead.
  Board 3 sends **5V + GND** to board 1 over the motor ribbon.

| Cable | Signals | Count |
|---|---|---|
| Board 1 ↔ Board 2 (TLC) | GND, 3V3, SCLK, SIN, BLANK, XLAT, GSCLK + extra GND (VPRG tied on board 2, XERR unused) | ~8–9 |
| Board 1 ↔ Board 3 (motors) | 5V (to VIN), GND ×2, 3V3, AIN1/AIN2/BIN1/BIN2 × 2 drivers | 12 |

Exact pin order: **TBD**.

---

## 4. Motors

### Channel plan

One TB6612 channel drives one motor, or several motors that always move together.

| Driver | Channel | Load | IN1 / IN2 GPIO | State |
|---|---|---|---|---|
| TB6612 #1 | A | **engine**: 2 spinners in parallel | 26 / 13 | installed |
| TB6612 #1 | B | **door** | 27 / 25 | installed (BIN1 moved off GPIO 14) |
| TB6612 #2 | A | servo 1 (or a plain rotating motor) | 33 / 32 | planned, pins proposed |
| TB6612 #2 | B | servo 2 (or a plain rotating motor) | 16 / 17 | planned, pins proposed |

PWM budget: 8 motor pins + GSCLK = 9 of the ESP32's 16 LEDC channels.

- **Engine pair:** currents add up on one channel (TB6612: 1.2 A continuous, 3.2 A peak). The start-up
  surge and a stall are the risk, so the engine uses a longer ramp. If the driver gets hot or the motors
  cut out, lower the maximum speed or give each spinner its own channel. If the two spinners turn opposite
  ways, swap the wires on **one** of them (software can only flip both together).
- **Door:** no end stops. Position is timed: a main stroke, then a short low-speed push into the mechanical
  stop, which re-syncs the position on every move so errors don't accumulate.
- **Servos (LEGO Power Functions style):** the angle follows the signed drive level, and with no drive the
  servo springs back to centre, so holding an angle means keeping the channel driven. The servo's 9V/GND
  power its electronics (**TBD**: check on the bench).
- Motor polarity is arbitrary. Fix direction in software (`invert=True`), not by rewiring.

### Motor cable (4-wire LEGO-style connector)

Order in the PF cable: GND, C1, C2, 9V (Mould King plugs may differ; they have 6 contacts).

| Wire | Goes to |
|---|---|
| C1 / C2 | TB6612 xO1 / xO2 |
| 9V | battery + (after fuse) |
| GND | common GND |

A plain motor uses only C1/C2; its 9V/GND are pass-through, so feeding them is harmless and lets the same
cable serve a servo. **Check with a multimeter before connecting**: C1–C2 reads a few ohms (the winding),
9V–GND reads open, and 9V/GND to C1/C2 read open. Battery + on C1/C2 would short a TB6612 output.

### Firmware rules (decided)

- **TB6612 in 4-GPIO mode:** `PWMA`/`PWMB` tied to 3V3, PWM goes on `xIN1`/`xIN2`.

  | IN1 | IN2 | Result (PWMx = H) |
  |---|---|---|
  | PWM | 0 | Forward, speed = duty |
  | 0 | PWM | Reverse, speed = duty |
  | 0 | 0 | Stop (coast) |
  | 1 | 1 | Short brake |

- `PWM(Pin(n), freq=1000)`: brushed motors prefer 1–2 kHz. Use `duty_u16()` (0–65535), the portable API in
  MicroPython 1.29.
- Init every motor pin at duty 0 at boot; force 0 in `finally` / on stop.
- **Soft start:** ramp 0 → target over ~200–300 ms. **Stagger starts** of different motors by 100–200 ms.
- Max-runtime limit per motor (30 s planned for doors). The comms watchdog stops all motors (see §5).
- Motor code lives in **`firmware/motor.py`**, not `hw.py`. What's implemented so far: `FIRMWARE.md` §5.

---

## 5. Phone app communication

Decided: **BLE** (not Wi-Fi). The whole link spec lives in `PROTOCOL.md`. Hardware-relevant points:
the motor watchdog (no heartbeat for 1–2 s → motors stop) and dropping `wifi.py` when BLE goes in (RAM).

---

## 6. Rejected approaches (don't reintroduce)

An earlier AI-written motor proposal (deleted; it's in git history) contained these errors:

- GPIO 12 for a motor: strapping pin, breaks boot.
- "TB6612 VREF" current-sense output: **doesn't exist**. There is no current sensing; if needed, add an INA219.
- TB6612 wiring without PWMA/PWMB: the motors won't run (we tie them high).
- "6 V" battery: it's 2S lithium, 7.2–7.4 V nominal, ~8.4 V full.
- 5 kHz PWM and the `pwm + dir` scheme: replaced by §4.
- STBY "to 5V": use 3V3.
- L298N: obsolete, the build uses TB6612FNG.
- `hw.init_motors()` / `hw.set_motor()` in `hw.py`, or motors driven by ship status: motors live in
  `motor.py` and are command-driven.
- TLC5940 GSCLK at 4 MHz with BLANK every ~1200 µs: the code uses 500 kHz and 6000 µs (`FIRMWARE.md` §4).

---

## 7. Open items

| # | Item | Blocks | Status |
|---|---|---|---|
| O1 | TLC5940 GPIO pins | GPIO map | ✅ Kept from `hw.py`: SIN 23, SCLK 18, XLAT 5, BLANK 4, GSCLK 15; VPRG → GND; XERR unused |
| O2 | **TLC5940 VCC: move from 5V to 3V3** (out of spec today, §1); is channel V+ joined to VCC? | Board 2 power | ❓ Check V+ ↔ VCC continuity |
| O3 | Number of motors | Board 3 | ✅ 4 channels, 2 × TB6612 (§4) |
| O4 | Which TLC mounting hole lands on board 2 | Standoff position | ❓ User to check |
| O5 | Battery voltage (idle and under load) | Cap rating, buck headroom | ❓ Measure |
| O6 | Serial port | `mpremote` commands | ✅ CH340, `/dev/cu.usbserial-<N>`, `mpremote connect auto` |
| O7 | Battery wires come from a Mould King **motor port**? Switched/PWM'd? | Power reliability | ❓ Measure (§2) |
| O8 | DD4012SA rated current | Power budget | ❓ Check listing |
| O9 | Fuse 2.5 A PPTC + switch ≥3 A on the battery + lead | Safety | 🛒 Buy; choose a switch location |
| O10 | Bulk cap 220 µF ≥16 V, Schottky 1N5819/SS34, right-angle 2×N headers, JST-XH kit, M2 nylon standoffs, Kapton | Build | 🛒 Buy |
| O11 | ESP32 mounting orientation | Board 1 layout | ✅ Chip side to the frame, pins up |
| O12 | TB6612 orientation on board 3 (silkscreen on the back) | Board 3 wiring | ❓ Verify physically |
| O13 | **Which ESP32 board goes into the ship** (HW-394 or the other) | Board 1 layout | ❓ User to decide |
| O14 | Motor-pin assignment for TB6612 #2 (33/32/16/17 proposed) | Motor ribbon | ⏳ Proposed |
| O15 | Run `test_motor.py` / `test_standalone.py` on the bench (with BIN1 on GPIO 27) | Motor bring-up | ⏳ Not run yet |
| O16 | Servos: do their 9V/GND need power? | Motor cable | ❓ Bench check |
| O17 | Buck orientation on board 3: vertical needs ≥ ~17 mm clearance above R17–R20; otherwise bend the pins and lay it flat (Kapton underneath, may overhang the board edge) | Board 3 layout | ❓ Measure the clearance there |

## 8. Next steps (suggested order)

1. Bench: run the motor tests (O15), measure the battery and its source port (O5, O7).
2. Move TLC VCC to 3V3 (O2), add the BLANK pull-up.
3. Decide the ESP32 for the ship (O13); fix the ribbon pin orders (same order on both ends, interleave GND).
4. Draft the board 3 layout (11 × 20): component placement, then signals.
5. Hole-by-hole map for each board, underside wiring list (from → to, colour, purpose), solder order, and a
   multimeter check before first power-up.
6. Firmware: staggering, runtime limit, watchdog and actuators in `motor.py`; then the BLE service.
