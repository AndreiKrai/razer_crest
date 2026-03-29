"""
hw.py — Hardware abstraction layer for TLC5940 LED driver.
Extracts the working TLC5940 communication from the proven code
into clean reusable functions.
"""

from machine import Pin, PWM
import time
import _thread

# --- TLC5940 pins ---
sin_pin   = Pin(23, Pin.OUT)
sclk_pin  = Pin(18, Pin.OUT)
xlat_pin  = Pin(5, Pin.OUT)
blank_pin = Pin(4, Pin.OUT)
gsclk     = None  # initialized in init()

# 16 channels, 12-bit brightness (0-4095)
NUM_CHANNELS = 16
_channels = [0] * NUM_CHANNELS

# GSCLK at 500kHz → 4096 ticks = 8.192ms timeout.
# Python GPIO bit-bang takes ~1ms → safe BLANK interval: 6ms.
# PWM frequency: 500kHz / 4096 = ~122 Hz (above flicker threshold).
_GSCLK_HZ = 500_000
_BLANK_INTERVAL_US = 6000

_blank_running = False
_dirty = False  # set by update(); cleared by blank_loop after shift+latch


def init():
    """Initialize TLC5940 hardware: start GSCLK PWM, clear outputs."""
    global gsclk
    gsclk = PWM(Pin(15), freq=_GSCLK_HZ, duty=512)
    _send_and_latch()  # prime with all-zero data
    blank_pin.value(1)
    blank_pin.value(0)


def set_channel(ch, brightness):
    """Set brightness for a single channel (0-15, 0-4095). Does NOT send to chip."""
    if not 0 <= ch <= 15:
        raise ValueError("channel must be 0-15, got {}".format(ch))
    if not 0 <= brightness <= 4095:
        raise ValueError("brightness must be 0-4095, got {}".format(brightness))
    _channels[ch] = brightness


def get_channel(ch):
    """Read current brightness value for a channel."""
    return _channels[ch]


def all_off():
    """Set all channels to 0 and send to chip."""
    for i in range(NUM_CHANNELS):
        _channels[i] = 0
    update()


def update():
    """Mark channel data as dirty; background thread will shift+latch it."""
    global _dirty
    _dirty = True


def _send_and_latch():
    """Shift all 16 channels into TLC5940 and latch. Call with BLANK=HIGH."""
    for ch in range(15, -1, -1):
        val = _channels[ch]
        for bit in range(11, -1, -1):
            sin_pin.value((val >> bit) & 1)
            sclk_pin.value(1)
            sclk_pin.value(0)
    xlat_pin.value(1)
    xlat_pin.value(0)


def _blank_loop():
    """Background thread — sole owner of blank_pin/xlat_pin/sin_pin/sclk_pin.

    Every _BLANK_INTERVAL_US:
      - If new data is pending (_dirty): shift+latch under BLANK, then release.
      - Otherwise: quick BLANK keep-alive pulse only.
    """
    global _blank_running, _dirty
    while _blank_running:
        time.sleep_us(_BLANK_INTERVAL_US)
        blank_pin.value(1)
        if _dirty:
            _dirty = False
            _send_and_latch()   # ~1ms, well within 8.2ms timeout
        blank_pin.value(0)


def start_blank_thread():
    """Start the background BLANK pulse thread. Call once after init()."""
    global _blank_running
    if not _blank_running:
        _blank_running = True
        _thread.start_new_thread(_blank_loop, ())


def stop_blank_thread():
    """Stop the background BLANK pulse thread."""
    global _blank_running
    _blank_running = False
