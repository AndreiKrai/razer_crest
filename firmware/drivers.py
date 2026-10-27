"""
drivers.py — Hardware driver abstractions for Module channels.

Each driver knows how to write a brightness value (0-4095) to its hardware.
Pass a driver instance to Module so it is not tied to a specific hardware bus.

Usage:
    from drivers import TLCDriver, GPIODriver, ServoDriver
    Module(..., driver=TLCDriver())
    Module(..., driver=GPIODriver(Pin(12)))
    Module(..., driver=ServoDriver(PWM(Pin(14))))
"""

import hw


class TLCDriver:
    """Write to TLC5940 channels via hw.set_channel()."""

    def set(self, ch, value):
        hw.set_channel(ch, value)


class GPIODriver:
    """Single GPIO pin: on when value > 0, off when value == 0.
    Channel number is ignored — driver controls exactly one pin."""

    def __init__(self, pin):
        self._pin = pin

    def set(self, ch, value):
        self._pin.value(1 if value > 0 else 0)


class ServoDriver:
    """PWM servo: maps 0-4095 brightness range to servo duty cycle.
    Adjust min_duty/max_duty to match your servo's pulse range."""

    def __init__(self, pwm, min_duty=40, max_duty=115):
        self._pwm = pwm
        self._min = min_duty
        self._max = max_duty

    def set(self, ch, value):
        # Map 0-4095 → min_duty-max_duty
        duty = self._min + (value * (self._max - self._min)) // 4095
        self._pwm.duty(duty)
