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
from effects import Blink, Delay, LoadingSteps, Flicker, Steady
from system import Status
from drivers import TLCDriver

# Blink/step frequency shared across both sub-modules so they stay in sync
_LOAD_FREQ = 0.8
_LOAD_BRIGHTNESS = 30
_INDICATOR_BRIGHTNESS = 30
_IDLE_BRIGHTNESS = 30


def create(channels, driver=None):
    """Return the cabin 11 Module.

    Args:
        channels: list of 3 channel numbers [ch0, ch1, ch2].
        driver:   Hardware driver instance. Defaults to TLCDriver.
    """
    if driver is None:
        driver = TLCDriver()

    ch3, ch4, ch5 = channels

    # LED 0-2 (white): sequential fill on loading, steady on idle
    sub_warm = Module(
        name="cabin2_warm",
        channels=[ch3],
        driver=driver,
        status_map={
            Status.OFF:     None,
            Status.PRELOADING: Delay(Steady(brightness=_IDLE_BRIGHTNESS)),
            Status.LOADING: LoadingSteps(num_leds=2, brightness=_LOAD_BRIGHTNESS, freq=_LOAD_FREQ),
            Status.IDLE:    Blink(brightness=_INDICATOR_BRIGHTNESS, freq=_LOAD_FREQ),
            Status.ERROR:   None,
            Status.DAMAGED: None,
        },
    )

    sub_cool = Module(
        name="cabin2_cool",
        channels=[ch4],
        driver=driver,
        status_map={
            Status.OFF:     None,
            Status.PRELOADING: Delay(Steady(brightness=_IDLE_BRIGHTNESS)),
            Status.LOADING: LoadingSteps(num_leds=2, brightness=_LOAD_BRIGHTNESS, freq=_LOAD_FREQ),
            Status.IDLE:    Steady(brightness=_IDLE_BRIGHTNESS),
            Status.ERROR:   None,
            Status.DAMAGED: None,
        },
    )

    # LED 3 (red): blinks on loading, steady on error
    sub_ind = Module(
        name="cabin2_red",
        channels=[ch5],
        driver=driver,
        status_map={
            Status.OFF:     None,
            Status.PRELOADING: Delay(Steady(brightness=_INDICATOR_BRIGHTNESS)),
            Status.LOADING: Blink(brightness=_INDICATOR_BRIGHTNESS, freq=_LOAD_FREQ),
            Status.IDLE:    None,
            Status.ERROR:   Steady(brightness=_INDICATOR_BRIGHTNESS),
            Status.DAMAGED: None,
        },
    )

    return Module(
        name="cabin2",
        channels=[],
        status_map={},
        sub_modules=[sub_warm, sub_cool, sub_ind],
    )
