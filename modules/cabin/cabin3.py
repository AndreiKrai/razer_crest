"""
modules/cabin2.py — Submodule for cabin.

Controls 3 LED channels with the following behaviour per status:

  LED 0-2  (ch0-ch2) : sequence display + idle lighting
  LED 3    (ch3)     : status indicator

Status behaviour:
  loading  — LED3 blinks at 2 Hz; LED0-2 fill in step with the same period:
               step 0: LED2 on
               step 1: LED1+2 on
               step 2: LED0+1+2 on
               step 3: all off → repeat
  idle     — LED0-2 steady on; LED3 off
  error    — LED0-2 off; LED3 steady on
  off      — all off
"""

from module import Module
from effects import Blink, Delay, LoadingSteps, Steady
from system import Status
from drivers import TLCDriver

# Blink/step frequency shared across both sub-modules so they stay in sync
_LOAD_FREQ = 1.0
_LOAD_BRIGHTNESS = 50
_INDICATOR_BRIGHTNESS = 50
_IDLE_BRIGHTNESS = 50


def create(channels, driver=None):
    """Return the cabin 11 Module.

    Args:
        channels: list of 3 channel numbers [ch0, ch1, ch2].
        driver:   Hardware driver instance. Defaults to TLCDriver.
    """
    if driver is None:
        driver = TLCDriver()

    ch6, ch7 = channels

    # LED 0-2 (white): sequential fill on loading, steady on idle
    sub_seq = Module(
        name="cabin3_one",
        channels=[ch6, ch7],
        driver=driver,
        status_map={
            Status.OFF:     None,
            Status.LOADING: Delay(LoadingSteps(num_leds=2, brightness=_LOAD_BRIGHTNESS, freq=_LOAD_FREQ), delay_ms=1000),
            Status.IDLE:    Steady(brightness=_IDLE_BRIGHTNESS),
            Status.ERROR:   Steady(brightness=_IDLE_BRIGHTNESS),
            Status.DAMAGED: None,
        },
    )

    return Module(
        name="cabin3",
        channels=[],
        status_map={},
        sub_modules=[sub_seq],
    )
