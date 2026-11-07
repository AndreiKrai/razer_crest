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
blank_pin = Pin(4, Pin.OUT, value=1)  # high = outputs off until _blank_loop takes over
gsclk     = None  # initialized in init()
_blank_pwm = None  # BLANK pulse train, owned by _blank_loop

# Number of daisy-chained TLC5940 chips. Channels 0-15 sit on the chip next to the ESP32, 16-31 on the next one.
# Every extra chip adds ~1 ms to each shift (see _blank_loop), so keep this equal to the chips actually fitted.
NUM_TLC = 2
NUM_CHANNELS = 16 * NUM_TLC
_channels = [0] * NUM_CHANNELS

# GSCLK at 500kHz → 4096 ticks = 8.192ms; after that the TLC5940 holds its outputs off until a BLANK pulse.
# BLANK comes from a hardware PWM, not a Python loop: thread switching on MicroPython can delay a software
# pulse past 8.192ms, which showed as random LED dips. 125 Hz = 8.0ms = 4000 GSCLK ticks, so the counter
# always restarts in time (grayscale values 4000-4095 all read as full on). Both clocks come from the same
# crystal, so they can't drift apart.
_GSCLK_HZ = 500_000
_BLANK_HZ = 125
_BLANK_PULSE_NS = 4000  # 2 GSCLK ticks; the chip needs only 20 ns
# duty_ns in the PWM constructor raises "PWM is inactive" on this MicroPython, so pass the pulse as duty_u16 (rounded up).
_BLANK_DUTY_U16 = (_BLANK_PULSE_NS * _BLANK_HZ * 65536 + 999_999_999) // 1_000_000_000
_SHIFT_POLL_MS = 5

_blank_running = False
_dirty = False  # set by update(); cleared by blank_loop after shift+latch


def init():
    """Initialize TLC5940 hardware: start GSCLK PWM, clear outputs. Outputs stay off until _blank_loop runs."""
    global gsclk
    gsclk = PWM(Pin(15), freq=_GSCLK_HZ, duty=512)
    blank_pin.value(1)
    _send_and_latch()  # prime with all-zero data


def set_channel(ch, brightness):
    """Set brightness for a single channel (0-31 with two chips, 0-4095). Does NOT send to chip."""
    if not 0 <= ch < NUM_CHANNELS:
        raise ValueError("channel must be 0-{}, got {}".format(NUM_CHANNELS - 1, ch))
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
    """Shift all channels into the TLC5940 chain and latch.

    Runs while the outputs are lit: shifting doesn't touch them, and a latch between BLANK pulses only
    affects the current 8 ms cycle, which the eye can't see."""
    # Highest channel goes first, so it travels furthest down the chain; channel 0 ends up on the first chip.
    for ch in range(NUM_CHANNELS - 1, -1, -1):
        val = _channels[ch]
        for bit in range(11, -1, -1):
            sin_pin.value((val >> bit) & 1)
            sclk_pin.value(1)
            sclk_pin.value(0)
    xlat_pin.value(1)
    xlat_pin.value(0)


def _blank_loop():
    """Background thread — sole owner of blank_pin/xlat_pin/sin_pin/sclk_pin.

    Starts the hardware BLANK pulses (outputs live), then shifts+latches whenever new data is pending
    (_dirty). When _blank_running goes False it stops the pulses and holds BLANK high (outputs off)."""
    global _blank_pwm, _dirty, blank_pin
    _blank_pwm = PWM(Pin(4), freq=_BLANK_HZ, duty_u16=_BLANK_DUTY_U16)
    try:
        while _blank_running:
            if _dirty:
                _dirty = False
                _send_and_latch()   # ~1ms per chip; timing no longer matters
            time.sleep_ms(_SHIFT_POLL_MS)
    finally:
        _blank_pwm.deinit()
        _blank_pwm = None
        blank_pin = Pin(4, Pin.OUT, value=1)


def start_blank_thread():
    """Start the background thread (BLANK pulses + data shifts). Call once after init()."""
    global _blank_running
    if not _blank_running:
        _blank_running = True
        _thread.start_new_thread(_blank_loop, ())


def stop_blank_thread():
    """Stop the background thread; it turns the outputs off within ~5 ms."""
    global _blank_running
    _blank_running = False
