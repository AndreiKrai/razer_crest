"""
test_motor.py — bench test for the TB6612 channels: each motor forward, then reverse.

Needs motor.py on the device:
    mpremote connect auto cp motor.py :/ + run test_motor.py

Power: USB to the PC, buck VO disconnected from the ESP32, battery on (it feeds VM).
Ctrl-C stops the test; the finally block coasts every motor.
"""

import time
from motor import DRV8833Motor, stop_all

_TICK_MS = 20
_PAUSE_MS = 1000

# (name, in1, in2, speed %, run ms) — pins from docs/HARDWARE.md.
# Door runs short and slow: with no end stops, 2 s at 50% could jam the mechanism
# if the motor is already mounted. Raise these once the door is detached or measured.
_TESTS = (
    ("engine", 26, 13, 50, 2000),
    ("door",   27, 25, 40, 700),
)


def _run(m, speed, ms):
    """Hold a target speed for ms while ticking the ramp, then coast."""
    print("[test_motor] {} -> {}% for {} ms".format(m.name, speed, ms))
    m.set(speed)
    deadline = time.ticks_add(time.ticks_ms(), ms)
    while time.ticks_diff(deadline, time.ticks_ms()) > 0:
        m.update()
        time.sleep_ms(_TICK_MS)
    m.coast()
    time.sleep_ms(_PAUSE_MS)


def _run_reversal(m, speed, ms):
    """Go straight from forward to reverse to exercise the ramp-through-zero pause."""
    print("[test_motor] {} reversal {}% -> -{}%".format(m.name, speed, speed))
    m.set(speed)
    t0 = time.ticks_ms()
    flipped = False
    while time.ticks_diff(time.ticks_ms(), t0) < 2 * ms:
        if not flipped and time.ticks_diff(time.ticks_ms(), t0) >= ms:
            m.set(-speed)
            flipped = True
        m.update()
        time.sleep_ms(_TICK_MS)
    m.coast()
    time.sleep_ms(_PAUSE_MS)


motors = [(DRV8833Motor(n, a, b), s, ms) for n, a, b, s, ms in _TESTS]

try:
    for m, speed, ms in motors:
        _run(m, speed, ms)
        _run(m, -speed, ms)
        _run_reversal(m, speed, ms)
    print("[test_motor] done")
finally:
    stop_all()
