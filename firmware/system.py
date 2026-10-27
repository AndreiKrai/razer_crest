"""
system.py — ShipSystem: the orchestrator.
Manages global status, module registry, and the main tick loop.
"""

import time
import hw

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
        """One tick cycle: update all module effects, push to hardware."""
        now_ms = time.ticks_ms()
        all_done = True

        for m in self.modules:
            done = m.tick(now_ms)
            if not done:
                all_done = False

        hw.update()

        # Auto-transition: loading → idle when all modules report done
        if self.status == Status.LOADING and all_done and len(self.modules) > 0:
            self.set_status(self._after_loading)

    def run(self, sequence=None, tick_interval_ms=30):
        """Start the main loop. Call after registering all modules.
        Also starts the BLANK pulse background thread.

        Args:
            sequence:  List of (status, duration_sec) tuples to play in order.
                       After the last one, loop stops. If None, starts in LOADING forever.
            tick_interval_ms: How often to tick module effects (default 30ms = 33fps)
        """
        hw.init()
        hw.start_blank_thread()
        self._running = True

        print("[ship] system running, tick interval:", tick_interval_ms, "ms")

        if sequence:
            for status, duration_sec in sequence:
                if not self._running:
                    break
                self.set_status(status)
                deadline = time.ticks_add(time.ticks_ms(), duration_sec * 1000)
                while self._running and time.ticks_diff(deadline, time.ticks_ms()) > 0:
                    self.tick()
                    time.sleep_ms(tick_interval_ms)
            # After sequence, stay in last status and keep ticking
            while self._running:
                self.tick()
                time.sleep_ms(tick_interval_ms)
        else:
            self.set_status(Status.LOADING)
            while self._running:
                self.tick()
                time.sleep_ms(tick_interval_ms)

    def stop(self):
        """Stop the main loop and blank thread."""
        self._running = False
        hw.stop_blank_thread()
        hw.all_off()
        print("[ship] stopped")
