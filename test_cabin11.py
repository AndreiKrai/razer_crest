"""
test_cabin11.py — Manual test for the cabin 11 submodule.

Wiring assumption:
  ch0 = LED 0   (sequence)
  ch1 = LED 1   (sequence)
  ch2 = LED 2   (sequence)
  ch3 = LED 3   (indicator / blink)

Runs each status for a fixed duration, then moves to the next.

Upload to ESP32 and run from REPL:
    exec(open("test_cabin11.py").read())
"""

import time
import hw
import modules.cabin.cabin11 as cabin11
from system import Status

TICK_MS = 30         # update interval (~33 fps)
STATUS_SEC = 6       # seconds to show each status

# Use physical channels 0-3 for the test
module = cabin11.create(channels=[0, 1, 2, 3])

hw.init()
hw.start_blank_thread()

def run_status(status, duration_sec):
    print(">>> cabin11 status:", status)
    module.on_status_change(status)
    deadline = time.ticks_add(time.ticks_ms(), duration_sec * 1000)
    while time.ticks_diff(deadline, time.ticks_ms()) > 0:
        module.tick(time.ticks_ms())
        hw.update()
        time.sleep_ms(TICK_MS)

try:
    run_status(Status.LOADING, STATUS_SEC)   # LED3 blinks; LED2→1→0 fill in steps
    run_status(Status.IDLE,    STATUS_SEC)   # LED0-2 dim steady; LED3 off
    run_status(Status.ERROR,   STATUS_SEC)   # LED0-2 off;        LED3 bright steady
    run_status(Status.OFF,     2)            # all off
finally:
    hw.all_off()
    hw.stop_blank_thread()
    print(">>> DONE")
