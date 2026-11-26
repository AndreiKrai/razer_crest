"""
boards.py — which peripheral board is plugged into each controller connector.

Every connector has one ID line: a 10 kOhm pull-up to 3V3 on the controller and an ID resistor to GND on the
peripheral board, so the pin sees a voltage divider (docs/HARDWARE.md §3 "Board ID resistors"). The line goes to
an input-only ADC1 pin, so detection costs no output GPIO and works while BLE runs.
"""

from machine import ADC, Pin

# Connector id (the app's catalog uses the same ids) -> ID-line GPIO. Only connectors whose board has an ID
# resistor are listed; the app treats every other connector as "not monitored".
_ID_PINS = {"lights": 34, "motors": 36, "motors2": 39}

# (upper bound in mV, board type). Midway between the calculated levels of docs/HARDWARE.md (1.1, 1.65, 2.2, 3.3 V);
# the lighting level was measured at 1.1 V on the bench, the others are proposals. Below the first bound the line
# is shorted or wired wrong; everything above the last bound is a floating line (no board).
_LEVELS = (
    (700, "unknown"),
    (1375, "lighting"),
    (1925, "motor1"),
    (2750, "motor2"),
)
_NONE = "none"

_SAMPLES = 16  # the ESP32 ADC is noisy: average a few readings


def classify(millivolts):
    for upper, board_type in _LEVELS:
        if millivolts < upper:
            return board_type
    return _NONE


class Detector:
    """Reads the ID lines. `found` maps connector id -> board type, e.g. {"lights": "lighting"} or "none"."""

    def __init__(self):
        self._adc = {conn: ADC(Pin(pin), atten=ADC.ATTN_11DB) for conn, pin in _ID_PINS.items()}
        self.found = {}
        self._last = {}
        self.refresh()
        print("[boards] at start:", self.found)

    def _read(self, conn):
        total = 0
        for _ in range(_SAMPLES):
            total += self._adc[conn].read_uv()
        return classify(total // _SAMPLES // 1000)

    def refresh(self):
        """Read every line now and trust the result (boot, `hello`)."""
        for conn in self._adc:
            self.found[conn] = self._last[conn] = self._read(conn)

    def poll(self):
        """Read every line; a change counts only once two readings in a row agree. True if `found` changed."""
        changed = False
        for conn in self._adc:
            board_type = self._read(conn)
            if board_type == self._last[conn] and board_type != self.found[conn]:
                self.found[conn] = board_type
                changed = True
                print("[boards] {}: {}".format(conn, board_type))
            self._last[conn] = board_type
        return changed
