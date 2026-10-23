# Rasor Crest Ship System — Copilot Instructions

## Project Overview

**Rasor Crest** is a LEGO spaceship with programmable lighting and motorized components controlled by an **ESP32** microcontroller running MicroPython.

### Key Hardware Components

| Component | Specification | Purpose |
|-----------|---------------|---------|
| **ESP32** | DevKit microcontroller | Main controller |
| **TLC5940** | 16-channel 12-bit PWM LED sink driver | LED brightness control |
| **Mould King Motors** | DC motors with integrated gearbox | Door actuators, engine effects |
| **Mould King 6.0 Power Module** | 6V regulated power supply | Power distribution for motors & ESP32 |
| **LEDs** | Single-color, 2-wire ~3V | Cabin/engine lighting effects |

---

## Hardware Architecture

### Power Distribution

- **Mould King 6.0 module** provides:
  - 6V output for motor power
  - 5V regulated tap (if available) or via stepdown to ESP32
  - GND common (all components share ground)
- **USB power** (development only): ESP32 via USB, expansion board USB
- **Standalone operation**: Single power source (Mould King 6.0)

### ESP32 Pin Mapping

#### TLC5940 LED Control (from hw.py)

| ESP32 GPIO | TLC5940 Pin | Function |
|-----------|-------------|----------|
| GPIO 23 | SIN | Serial data in (12 bits/channel) |
| GPIO 18 | SCLK | Serial clock |
| GPIO 5 | XLAT | Latch (commit data) |
| GPIO 4 | BLANK | PWM cycle reset (HIGH→LOW pulse) |
| GPIO 15 | GSCLK | Grayscale PWM clock (4MHz) |

#### Motor Control (to implement)

| ESP32 GPIO | Motor Component | Function | Notes |
|-----------|-----------------|----------|-------|
| GPIO 12 | Door Motor | PWM speed control | 0-1023 (0-6V motor voltage) |
| GPIO 13 | Door Motor | Direction/enable | HIGH=open, LOW=closed |
| GPIO 14 | Engine Motor | PWM speed control | Throttle effect (visual) |
| GPIO 25 | Engine Motor | Direction/enable | HIGH=forward, LOW=reverse |
| GPIO 26 | (Future) | Additional motor | Reserve for expansion |

**Motor Wiring:**
- Motor +6V → Mould King 6.0 (6V output)
- Motor GND → Mould King 6.0 (GND)
- Motor signal pins → ESP32 GPIOs
- All GNDs tied together (ESP32, TLC5940, power module)

---

## Architecture & Code Structure

### Module System

**ShipSystem** (system.py):
- Central orchestrator
- Manages global status (OFF, PRELOADING, LOADING, IDLE, ERROR, DAMAGED)
- Maintains module registry
- Runs main tick loop (~20ms cycle)
- Broadcasts status changes to all modules

### Module Interface

Each module implements:
- `name` (string)
- `on_status_change(status)` — called when ship status changes
- `on_tick()` — called every frame (~20ms)
- `render()` — returns channel data (0-4095 per LED)

### Subsystems

#### 1. **Hardware Layer** (hw.py)

Manages low-level hardware:
- TLC5940 initialization and data transmission
- PWM clock (GSCLK) and BLANK pulse timing
- Motor GPIO setup
- Channel data buffering & update timing

**Key functions to implement:**
```python
def init_motors()           # Initialize motor GPIO pins
def set_motor(id, speed, direction)  # Control motor speed (0-100%) & direction
def stop_motor(id)          # Stop motor
def update()                # Flush LED/motor data to hardware
```

#### 2. **Effect System** (effects.py)

Predefined animation patterns:
- `steady(brightness)` — constant brightness
- `pulse(brightness, frequency)` — breathing effect
- `blink(brightness, frequency)` — on/off blink
- `strobe(brightness, frequency)` — fast strobe
- `fade(start_bright, end_bright, duration)` — smooth fade

#### 3. **Module System** (modules/cabin/)

Logical groupings of LEDs and motors:
- **Cabin1** (channels 0-2): Cabin lights + door motor
- **Cabin2** (channels 3-5): Cabin lights + door motor
- **Cabin3** (channels 6-7): Engine compartment lights
- Extensible: add more cabins or systems as needed

---

## Mould King Motor Integration Guidelines

### Motor Control Pattern

```python
# Speed: 0-100 (percent of 6V), Direction: True/False
hw.set_motor(motor_id, speed, direction)

# Examples:
hw.set_motor(0, 100, True)   # Door fully open
hw.set_motor(0, 0, True)     # Door stopped
hw.set_motor(0, 50, False)   # Door half-speed reverse
```

### Motor Behavior Requirements

1. **Door Motors (Cabin 1, 2)**
   - Speed: 0-100% (PWM duty 0-1023)
   - Direction: open/close
   - Soft limit: don't exceed 5s continuous (detect stall)
   - On ERROR status: center doors (50% open)

2. **Engine Motors (Cabin 3)**
   - Speed: throttle effect (visual, no actual motion)
   - Sync to ship status:
     - IDLE: 0% (silent)
     - LOADING: 30% throttle
     - ERROR: 80% throttle (alarm)
     - DAMAGED: 10% + strobe (damage effect)

### Motor Safety

- **Stall detection**: Monitor GPIO current if available, or enforce time limits
- **Thermal**: Don't exceed 30s continuous at 100%
- **Power**: 2 motors at 100% may exceed Mould King 6.0 capacity — implement priority or throttle
- **Graceful shutdown**: `ship.stop()` must deactivate all motors before OFF

---

## Development Guidelines

### File Organization

```
rasor_crest/
├── main.py              # Entry point, ship initialization
├── system.py            # ShipSystem orchestrator
├── hw.py                # Hardware abstraction (TLC5940, motors)
├── effects.py           # Animation patterns
├── drivers.py           # (TLC5940 driver details if large)
├── module.py            # Base module class
├── wifi.py              # (Network/REPL if added)
├── README.md            # Project docs
├── .copilot/
│   └── copilot-instructions.md  # This file
├── modules/
│   └── cabin/
│       ├── __init__.py
│       ├── cabin1.py    # (channels 0-2) + door 0
│       ├── cabin2.py    # (channels 3-5) + door 1
│       └── cabin3.py    # (channels 6-7) + engine motor
└── test_*.py            # Test scripts (bare, channels, etc.)
```

### Coding Conventions

1. **Status names**: Use `Status.UPPERCASE` constants, not strings
2. **Channel numbers**: 0-15 (TLC5940 has 16 outputs)
3. **Motor IDs**: 0=door1, 1=door2, 2=engine (define in hw.py)
4. **Timing**: Main loop ~20ms; use `time.ticks_ms()` for longer durations
5. **Thread safety**: Use locks if accessing shared state from REPL
6. **Debug output**: `print("[module_name] message")` format
7. **Comments**: Document WHY, not WHAT (code should be self-documenting)

### Testing Workflow

1. **REPL tests** (Thonny IDE):
   ```python
   exec(open("main.py").read())  # Load ship
   ship.set_status(Status.IDLE)
   hw.set_motor(0, 50, True)     # Test door
   hw.set_motor(2, 75, True)     # Test engine throttle
   ship.stop()
   ```

2. **Unit tests** (test_*.py):
   - `test_channels.py` — LED control per channel
   - `test_cabin11.py` — Cabin 1 animation
   - `test_bare.py` — Minimal setup

3. **Integration test**:
   - Upload all files to ESP32, power on
   - Observe LED sequence: PRELOADING → LOADING → IDLE
   - Manually trigger status changes via REPL
   - Check motor responses

### Implementation Priority

1. ✅ LED control (TLC5940) — already working
2. ✅ Status system — already working
3. 🔲 Motor GPIO init (hw.py) — next
4. 🔲 Motor speed/direction control (hw.py) — next
5. 🔲 Cabin module motor effects (modules/cabin/*.py)
6. 🔲 Stall detection & safety limits
7. 🔲 WiFi/remote control (optional future)

---

## Important Notes

### GSCLK & BLANK Requirements (TLC5940)

- **GSCLK**: Continuous 4MHz PWM (active even when not updating data)
- **BLANK pulse**: Must fire every ~1200µs (every 4096 GSCLK ticks)
  - Restarts grayscale PWM cycle
  - Without it, TLC5940 only does 1 cycle then stops
- Both are handled in `hw.update()` and `main_loop()` in `hw.py`

### Mould King 6.0 Power Module Specs

- Input: USB-C or barrel jack
- Output: 6V @ up to 2A (check datasheet)
- Shared GND with all components
- No internal step-down; use linear regulator or boost for 3.3V if needed

### Motor Current Draw

Typical Mould King motor:
- Stall current: ~500-800mA @ 6V
- Running current: ~200-300mA @ 6V
- **Two motors @ 100%**: ~1000mA (at limit of 6.0 module)
- **Design motors to run <50% duty in IDLE** to stay within power budget

---

## Status Definitions

| Status | Meaning | Motor Behavior | LED Pattern |
|--------|---------|----------------|-------------|
| **OFF** | Ship powered down | All stop | All off |
| **PRELOADING** | Initializing (5s) | Slow idle pulse | Amber pulse |
| **LOADING** | Booting (8s) | 30% throttle | Blue scanning |
| **IDLE** | Ready, nominal (15s) | 0% (off) | Green steady |
| **ERROR** | System fault | 80% throttle (alarm) | Red pulse |
| **DAMAGED** | Critical damage | 10% + strobe | Red + white strobe |

---

## Quick Reference: Adding a New Motor

1. **Define motor ID** in `hw.py`:
   ```python
   MOTOR_DOOR1 = 0
   MOTOR_ENGINE = 2
   ```

2. **Allocate GPIO pins** in `hw.py`:
   ```python
   # GPIO 12/13 for door1
   # GPIO 14/25 for engine
   ```

3. **Init in `hw.init_motors()`**:
   ```python
   motor_pins[MOTOR_DOOR1] = {"pwm": PWM(Pin(12), freq=5000), "dir": Pin(13, Pin.OUT)}
   ```

4. **Implement `set_motor()` logic**:
   ```python
   def set_motor(motor_id, speed, direction):
       pwm, dir_pin = motor_pins[motor_id]
       pwm.duty(int(speed * 10.23))  # 0-100% → 0-1023
       dir_pin.value(1 if direction else 0)
   ```

5. **Use in cabin module**:
   ```python
   hw.set_motor(MOTOR_DOOR1, 50, True)  # Half-speed open
   ```

6. **Test in REPL**:
   ```python
   hw.set_motor(0, 50, True)
   # Watch motor spin
   hw.set_motor(0, 0, True)
   # Motor stops
   ```

---

## Resources & Debugging

- **MicroPython Docs**: https://docs.micropython.org/en/latest/esp32/quickref.html
- **TLC5940 Datasheet**: Check grayscale PWM timing requirements
- **Mould King Motor Specs**: Verify stall current & thermal limits
- **ESP32 GPIO Limits**: 12mA max per pin, 40mA per port
  - **Motor control via transistor/MOSFETs required** (PWM pin can't drive motor directly)

---

**Version**: 1.0  
**Last Updated**: 2026-06-27  
**Project Status**: Core LED system ✅ | Motor system 🔲
