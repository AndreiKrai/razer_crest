"""
modules/cabin11.py — Submodule for cabin 11.

Controls 4 LED channels with the following behaviour per status:

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
from effects import Blink, Delay, Steady
from system import Status
from drivers import TLCDriver

# Blink/step frequency shared across both sub-modules so they stay in sync
_LOAD_FREQ = 2.0
_LOAD_BRIGHTNESS = 15
_INDICATOR_BRIGHTNESS = 15
_IDLE_BRIGHTNESS = 15


def create(channels, driver=None):
    """Return the cabin 11 Module.

    Args:
        channels: list of 4 channel numbers [ch0, ch1, ch2, ch3].
        driver:   Hardware driver instance. Defaults to TLCDriver.
    """
    if driver is None:
        driver = TLCDriver()

    ch0, ch1, ch2 = channels

    sub_ch0 = Module(
        name="cabin1_cool",
        channels=[ch0],
        driver=driver,
        status_map={
            Status.OFF:     None,
            Status.PRELOADING: Steady(brightness=_LOAD_BRIGHTNESS),
            Status.LOADING: Blink(brightness=_LOAD_BRIGHTNESS, freq=_LOAD_FREQ),
            Status.IDLE:    Steady(brightness=_IDLE_BRIGHTNESS),
            Status.ERROR:   None,
            Status.DAMAGED: None,
        },
    )

    sub_ch1 = Module(
        name="cabin1_warm",
        channels=[ch1],
        driver=driver,
        status_map={
            Status.OFF:     None,
            Status.PRELOADING:Steady(brightness=_LOAD_BRIGHTNESS),
            Status.LOADING: Blink(brightness=_LOAD_BRIGHTNESS, freq= 1),
            Status.IDLE:    Blink(brightness=_LOAD_BRIGHTNESS, freq= 1),
            Status.ERROR:   Steady(brightness=_INDICATOR_BRIGHTNESS),
            Status.DAMAGED: None,
        },
    )

    sub_ch2 = Module(
        name="cabin1_red",
        channels=[ch2],
        driver=driver,
        status_map={
            Status.OFF:     None,
            Status.PRELOADING: Steady(brightness=_INDICATOR_BRIGHTNESS),
            Status.LOADING: Blink(brightness=_INDICATOR_BRIGHTNESS, freq=_LOAD_FREQ),
            Status.IDLE:    Steady(brightness=20),
            Status.ERROR:   Steady(brightness=_INDICATOR_BRIGHTNESS),
            Status.DAMAGED: None,
        },
    )

    return Module(
        name="cabin1",
        channels=[],
        status_map={},
        sub_modules=[sub_ch0, sub_ch1, sub_ch2],
    )
