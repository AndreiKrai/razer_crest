"""
module.py — Base Module class for the ship system.
A module owns hardware channels and defines behavior per status.
Modules can contain sub-modules (hierarchical).
"""


class Module:
    """Base module that maps ship statuses to lighting effects.

    Args:
        name:        Human-readable module name (e.g., "cabin11")
        channels:    List of channel numbers this module controls
        status_map:  Dict mapping status name → Effect instance (or None for off)
        driver:      Hardware driver (TLCDriver, GPIODriver, ServoDriver, ...).
                     Required if channels is non-empty.
        sub_modules: Optional list of child Module instances
    """

    def __init__(self, name, channels=None, status_map=None, driver=None, sub_modules=None):
        self.name = name
        self.channels = channels or []
        self.status_map = status_map or {}
        self.driver = driver
        self.sub_modules = sub_modules or []
        self._current_status = "off"
        self._effect = None

    def on_status_change(self, new_status):
        """Called by ShipSystem when global status changes."""
        self._current_status = new_status
        self._effect = self.status_map.get(new_status)

        # Reset effect state for a clean start
        if self._effect is not None:
            self._effect.reset()

        # If no effect (e.g., "off"), zero out channels immediately
        if self._effect is None:
            for ch in self.channels:
                self.driver.set(ch, 0)

        # Propagate to sub-modules
        for sm in self.sub_modules:
            sm.on_status_change(new_status)

    def tick(self, now_ms):
        """Called every cycle from main loop. Updates effect → channels.
        Returns True if this module's effect is 'done' (for auto-transitions)."""
        done = False

        if self._effect is not None:
            # Multi-channel effects: any effect that exposes tick_multi()
            if hasattr(self._effect, 'tick_multi'):
                values = self._effect.tick_multi(now_ms)
                for i, ch in enumerate(self.channels):
                    if i < len(values):
                        self.driver.set(ch, values[i])
            else:
                # Single-value effect applied to all channels
                brightness = self._effect.tick(now_ms)
                for ch in self.channels:
                    self.driver.set(ch, brightness)

            if self._effect.done:
                done = True
        else:
            # No effect → keep channels at 0 every tick
            for ch in self.channels:
                self.driver.set(ch, 0)

        # Tick sub-modules
        for sm in self.sub_modules:
            if sm.tick(now_ms):
                done = True

        return done
