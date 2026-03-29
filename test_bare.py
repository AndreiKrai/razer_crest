"""
test_bare.py — Bare-metal TLC5940 test. No modules, no system, no main.py interference.
Lights channel 0 at max brightness for 10 seconds.
If this doesn't work → hardware/wiring issue.
If this works but test_channels.py doesn't → main.py conflict.
"""
import sys, time, _thread

# Kill ALL background threads from main.py
for name in list(sys.modules):
    mod = sys.modules[name]
    if hasattr(mod, '_running'):
        mod._running = False
    if hasattr(mod, 'ship') and hasattr(mod.ship, '_running'):
        mod.ship._running = False

# Reset hw state
import hw
hw._blank_running = False
time.sleep_ms(500)

# Fresh init
hw.init()
hw._blank_running = True
_thread.start_new_thread(hw._blank_loop, ())

# Set ALL 3 channels to MAX brightness
for ch in range(3):
    hw.set_channel(ch, 4095)
hw.update()

print(">>> ALL channels 0-2 at MAX brightness (4095) for 10 sec")
print(">>> If LEDs don't light up → check wiring / power")
time.sleep(10)

hw.all_off()
hw._blank_running = False
print(">>> done")
