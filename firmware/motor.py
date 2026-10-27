"""
motor.py — DRV8833 H-bridge channel: signed speed with ramping, plus a global stop.

One DRV8833Motor drives one DRV8833 channel (two inputs). Two motors wired in
parallel on one channel are a single DRV8833Motor in software.

Usage:
    from motor import DRV8833Motor, stop_all
    engine = DRV8833Motor("engine", in1=26, in2=13)
    engine.set(60)          # -100..100, sign = direction; ramps toward it
    while ...:
        engine.update()     # call every ~20-30 ms to advance the ramp
    engine.coast()          # immediate stop (both inputs 0)
    stop_all()              # emergency stop for every motor created

PWM keeps running in hardware even if Python crashes, so callers must wrap
motor code in try/finally: stop_all().
"""

import time
from machine import Pin, PWM

_FREQ = 1000              # 1-2 kHz suits brushed gearmotors (see docs/HARDWARE.md)
_DUTY_MAX = 65535
_DEFAULT_RAMP_MS = 250    # 0→100% time; slower start avoids ESP32 brown-out (no VM capacitor)
_REVERSE_PAUSE_MS = 100   # hold at 0 before reversing so back-EMF dies down

# Internal speed unit is 1/1000 of a percent so short update intervals
# still make progress (integer math, no floats needed).
_SCALE = 1000

_motors = []


def stop_all():
    """Coast every motor immediately. Safe to call at any time, any number of times."""
    for m in _motors:
        m.coast()


class DRV8833Motor:
    """One DRV8833 channel.

    Args:
        name:     label used in log lines
        in1, in2: GPIO numbers wired to xIN1 / xIN2
        invert:   flip direction in software instead of rewiring
        ramp_ms:  time to go from 0 to 100% (and back); 0 = no ramp
        freq:     PWM frequency in Hz
    """

    def __init__(self, name, in1, in2, invert=False, ramp_ms=_DEFAULT_RAMP_MS, freq=_FREQ):
        self.name = name
        self._invert = invert
        self._ramp_ms = ramp_ms
        # Drive both pins low before PWM attaches so the motor can't twitch
        self._p1 = PWM(Pin(in1, Pin.OUT, value=0), freq=freq, duty_u16=0)
        self._p2 = PWM(Pin(in2, Pin.OUT, value=0), freq=freq, duty_u16=0)
        self._target = 0          # requested speed, -100..100
        self._cur = 0             # applied speed in _SCALE units
        self._applied = (0, 0)    # last duties written, to skip redundant writes
        self._braking = False
        self._hold_until = None   # reversal pause deadline (ticks_ms) or None
        self._last_ms = time.ticks_ms()
        _motors.append(self)
        print("[motor] {} on GPIO {}/{}".format(name, in1, in2))

    @property
    def target(self):
        return self._target

    @property
    def speed(self):
        """Currently applied speed, -100..100 (lags target while ramping)."""
        return self._cur // _SCALE

    @property
    def moving(self):
        return self._cur != 0 or self._target != 0

    def set(self, speed):
        """Request a speed (-100..100). Takes effect gradually through update()."""
        speed = max(-100, min(100, int(speed)))
        self._target = speed
        if speed != 0:
            self._braking = False

    def coast(self):
        """Stop now: both inputs low, motor spins down freely."""
        self._target = 0
        self._cur = 0
        self._braking = False
        self._hold_until = None
        self._write(0, 0)

    def brake(self):
        """Stop now: both inputs high, motor windings shorted for a hard stop."""
        self._target = 0
        self._cur = 0
        self._braking = True
        self._hold_until = None
        self._write(_DUTY_MAX, _DUTY_MAX)

    def update(self, now_ms=None):
        """Advance the ramp toward the target and write PWM. Call regularly."""
        if now_ms is None:
            now_ms = time.ticks_ms()
        dt = time.ticks_diff(now_ms, self._last_ms)
        self._last_ms = now_ms

        if self._braking:
            return
        if self._hold_until is not None:
            if time.ticks_diff(self._hold_until, now_ms) > 0:
                return
            self._hold_until = None

        tgt = self._target * _SCALE
        cur = self._cur
        reversing = cur != 0 and tgt != 0 and (cur > 0) != (tgt > 0)
        aim = 0 if reversing else tgt

        if self._ramp_ms <= 0:
            cur = aim
        else:
            step = dt * 100 * _SCALE // self._ramp_ms
            if aim > cur:
                cur = min(aim, cur + step)
            else:
                cur = max(aim, cur - step)

        if reversing and cur == 0:
            self._hold_until = time.ticks_add(now_ms, _REVERSE_PAUSE_MS)

        self._cur = cur
        self._apply()

    def _apply(self):
        s = -self._cur if self._invert else self._cur
        duty = abs(s) * _DUTY_MAX // (100 * _SCALE)
        # Fast decay: PWM on one input, the other held low (docs/HARDWARE.md truth table)
        if s > 0:
            self._write(duty, 0)
        elif s < 0:
            self._write(0, duty)
        else:
            self._write(0, 0)

    def _write(self, d1, d2):
        if (d1, d2) == self._applied:
            return
        # Release the idle side first so the bridge never briefly drives both ways
        if d1 == 0:
            self._p1.duty_u16(0)
            self._p2.duty_u16(d2)
        elif d2 == 0:
            self._p2.duty_u16(0)
            self._p1.duty_u16(d1)
        else:
            self._p1.duty_u16(d1)  # brake: both high
            self._p2.duty_u16(d2)
        self._applied = (d1, d2)
