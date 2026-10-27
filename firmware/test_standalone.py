"""
test_standalone.py — self-test that runs on boot without a PC: cabin LEDs, then motors.

Install it as main.py so it starts on power-up:
    mpremote connect auto cp hw.py motor.py :/ + cp test_standalone.py :main.py
Then unplug USB and power the ESP32 from the buck (VO → VIN). Never both at once.
Restore the ship afterwards with the normal upload command from README.md.

Nobody is watching the console, so the cabin LEDs report progress:
    5 fast blinks at start   last reset wasn't a power-on (likely a brown-out)
    LEDs light one by one    TLC5940 wiring check, one LED per channel
    all LEDs dim, steady     motors running
    all LEDs slow blink      finished OK (press EN to run again)
    all LEDs fast blink      a Python error stopped the test
"""

import time
import machine
import hw
from motor import DRV8833Motor, stop_all

_LED_CHANNELS = range(8)   # cabin1 0–2, cabin2 3–5, cabin3 6–7 (see main.py)
_LED_ON = 40               # same low range as the cabins; enough to see
_LED_DIM = 15

_START_DELAY_MS = 3000     # time to take your hands off the ship after power-on
_ROUNDS = 3                # repeat so a flaky connection shows up, not run forever
_ROUND_PAUSE_MS = 3000
_TICK_MS = 20
_PAUSE_MS = 1000

# (name, in1, in2, speed %, run ms) — pins from docs/HARDWARE.md.
# Door runs short and slow: no end stops, so a long run could jam the mechanism.
_TESTS = (
    ("engine", 26, 13, 50, 2000),
    ("door",   27, 25, 40, 700),
)


def _leds(value):
    for ch in _LED_CHANNELS:
        hw.set_channel(ch, value)
    hw.update()


def _blink(times, on_ms, off_ms):
    for _ in range(times):
        _leds(_LED_ON)
        time.sleep_ms(on_ms)
        _leds(0)
        time.sleep_ms(off_ms)


def _led_check():
    for ch in _LED_CHANNELS:
        print("[test_standalone] LED ch{}".format(ch))
        hw.set_channel(ch, _LED_ON)
        hw.update()
        time.sleep_ms(400)
        hw.set_channel(ch, 0)
        hw.update()
    time.sleep_ms(500)


def _run(m, speed, ms, flip_ms=None):
    """Drive at speed for ms; if flip_ms is set, reverse direction at that point."""
    print("[test_standalone] {} {}% for {} ms".format(m.name, speed, ms))
    m.set(speed)
    t0 = time.ticks_ms()
    while time.ticks_diff(time.ticks_ms(), t0) < ms:
        if flip_ms is not None and time.ticks_diff(time.ticks_ms(), t0) >= flip_ms:
            m.set(-speed)
            flip_ms = None
        m.update()
        time.sleep_ms(_TICK_MS)
    m.coast()
    time.sleep_ms(_PAUSE_MS)


hw.init()
hw.start_blank_thread()
_leds(0)

try:
    # Brown-out from a motor start resets the ESP32 and lands here again;
    # power-on and the EN button both report PWRON_RESET.
    if machine.reset_cause() != machine.PWRON_RESET:
        print("[test_standalone] reset cause {}, not power-on".format(machine.reset_cause()))
        _blink(5, 100, 100)

    time.sleep_ms(_START_DELAY_MS)
    _led_check()

    motors = [(DRV8833Motor(n, a, b), s, ms) for n, a, b, s, ms in _TESTS]
    for r in range(_ROUNDS):
        print("[test_standalone] round {}/{}".format(r + 1, _ROUNDS))
        _leds(_LED_DIM)
        for m, speed, ms in motors:
            _run(m, speed, ms)
            _run(m, -speed, ms)
            _run(m, speed, 2 * ms, flip_ms=ms)
        _leds(0)
        time.sleep_ms(_ROUND_PAUSE_MS)

    stop_all()
    print("[test_standalone] done")
    while True:
        _blink(1, 1000, 1000)
except Exception as e:
    stop_all()
    print("[test_standalone] error: {}".format(e))
    while True:
        _blink(1, 100, 100)
finally:
    # Ctrl-C from mpremote lands here too; leave nothing driven
    stop_all()
    hw.all_off()
