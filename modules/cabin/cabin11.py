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
from effects import Blink, LoadingSteps, Steady
from system import Status
from drivers import TLCDriver

# Blink/step frequency shared across both sub-modules so they stay in sync
_LOAD_FREQ = 2.0
_LOAD_BRIGHTNESS = 200
_INDICATOR_BRIGHTNESS = 200
_IDLE_BRIGHTNESS = 200


def create(channels, driver=None):
    """Return the cabin 11 Module.

    Args:
        channels: list of 4 channel numbers [ch0, ch1, ch2, ch3].
        driver:   Hardware driver instance. Defaults to TLCDriver.
    """
    if driver is None:
        driver = TLCDriver()

    ch0, ch1, ch2 = channels

    # LED 0-2 (white): sequential fill on loading, steady on idle
    sub_seq = Module(
        name="11_seq",
        channels=[ch0, ch1],
        driver=driver,
        status_map={
            Status.OFF:     None,
            Status.LOADING: LoadingSteps(num_leds=2, brightness=_LOAD_BRIGHTNESS, freq=_LOAD_FREQ),
            Status.IDLE:    Steady(brightness=_IDLE_BRIGHTNESS),
            Status.ERROR:   None,
            Status.DAMAGED: None,
        },
    )

    # LED 3 (red): blinks on loading, steady on error
    sub_ind = Module(
        name="11_indicator",
        channels=[ch2],
        driver=driver,
        status_map={
            Status.OFF:     None,
            Status.LOADING: Blink(brightness=_INDICATOR_BRIGHTNESS, freq=_LOAD_FREQ),
            Status.IDLE:    None,
            Status.ERROR:   Steady(brightness=_INDICATOR_BRIGHTNESS),
            Status.DAMAGED: None,
        },
    )

    return Module(
        name="11",
        channels=[],
        status_map={},
        sub_modules=[sub_seq, sub_ind],
    )
