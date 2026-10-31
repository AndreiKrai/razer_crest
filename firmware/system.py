"""
system.py — ShipSystem: the orchestrator.
Manages global status, module registry, and the main tick loop.
"""

import time
from collections import deque
import hw
import motor

_HEARTBEAT_TIMEOUT_MS = 2000

# Status constants
class Status:
    OFF        = "off"
    PRELOADING = "preloading"
    LOADING    = "loading"
    IDLE       = "idle"
    ERROR      = "error"
    DAMAGED    = "damaged"

STATUSES = (Status.OFF, Status.PRELOADING, Status.LOADING, Status.IDLE, Status.ERROR, Status.DAMAGED)


class ShipSystem:
    """Central ship controller. Registers modules, manages status, runs main loop."""

    def __init__(self):
        self.status = Status.OFF
        self.modules = []
        self._running = False
        # Auto-transition: when loading finishes, go to this status
        self._after_loading = Status.IDLE
        # Commands from the BLE thread; the tick applies them. Overflow raises IndexError.
        self._commands = deque((), 16, 1)
        # None = watchdog not armed (no phone heard yet, or already tripped)
        self._last_heartbeat = None

    def post(self, command):
        """Queue a (name, arg) command from another thread. Raises IndexError when the queue is full."""
        self._commands.append(command)

    def heartbeat(self):
        """The phone is alive: arm or feed the motor watchdog."""
        self._last_heartbeat = time.ticks_ms()

    def stop_all(self):
        """Motors coast, lights off; the system keeps running."""
        motor.stop_all()
        self.set_status(Status.OFF)

    def register(self, module):
        """Register a top-level module."""
        self.modules.append(module)
        print("[ship] registered:", module.name)

    def set_status(self, new_status):
        """Change global ship status. Notifies all modules."""
        if new_status not in STATUSES:
            print("[ship] unknown status:", new_status)
            return
        old = self.status
        self.status = new_status
        print("[ship]", old, "->", new_status)
        for m in self.modules:
            m.on_status_change(new_status)
        # Immediately push channel data to TLC5940
        hw.update()

    def tick(self):
        """One tick cycle: apply queued commands, update all module effects, push to hardware."""
        now_ms = time.ticks_ms()
        all_done = True

        while len(self._commands):
            name, arg = self._commands.popleft()
            if name == "set_status":
                self.set_status(arg)
            elif name == "stop_all":
                self.stop_all()

        last = self._last_heartbeat
        if last is not None and time.ticks_diff(now_ms, last) > _HEARTBEAT_TIMEOUT_MS:
            self._last_heartbeat = None
            motor.stop_all()  # lights may continue
            print("[ship] heartbeat lost, motors stopped")

        for m in self.modules:
            done = m.tick(now_ms)
            if not done:
                all_done = False

        hw.update()

        # Auto-transition: loading → idle when all modules report done
        if self.status == Status.LOADING and all_done and len(self.modules) > 0:
            self.set_status(self._after_loading)

    def run(self, tick_interval_ms=30):
        """Start the main loop in the OFF status; the app sets every status after that.
        Call after registering all modules. Also starts the BLANK pulse background thread.

        Args:
            tick_interval_ms: How often to tick module effects (default 30ms = 33fps)
        """
        hw.init()
        hw.start_blank_thread()
        self._running = True

        print("[ship] system running, tick interval:", tick_interval_ms, "ms")

        self.set_status(Status.OFF)
        while self._running:
            self.tick()
            time.sleep_ms(tick_interval_ms)

    def stop(self):
        """Stop the main loop and blank thread."""
        self._running = False
        hw.stop_blank_thread()
        hw.all_off()
        print("[ship] stopped")
