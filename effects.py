"""
effects.py — Reusable lighting effects for the ship system.
Each effect is a lightweight object with tick(now_ms) → brightness.
"""

import time


class Steady:
    """Constant brightness."""

    done = False

    def __init__(self, brightness=4095):
        if not 0 <= brightness <= 4095:
            raise ValueError("brightness must be 0-4095, got {}".format(brightness))
        self.brightness = brightness

    def reset(self):
        pass

    def tick(self, now_ms):
        return self.brightness


class Blink:
    """Square wave on/off blink at given frequency."""

    done = False

    def __init__(self, brightness=4095, freq=1.0):
        if not 0 <= brightness <= 4095:
            raise ValueError("brightness must be 0-4095, got {}".format(brightness))
        self.brightness = brightness
        self.period_ms = int(1000 / freq) if freq > 0 else 1000
        self._start_ms = None

    def reset(self):
        self._start_ms = None  # will be set on first tick

    def tick(self, now_ms):
        if self._start_ms is None:
            self._start_ms = now_ms
        half = self.period_ms // 2
        phase = (now_ms - self._start_ms) % self.period_ms
        if phase < half:
            return self.brightness
        return 0


class Pulse:
    """Smooth triangle-wave fade in/out."""

    done = False

    def __init__(self, brightness=4095, freq=0.5):
        self.brightness = brightness
        self.period_ms = int(1000 / freq) if freq > 0 else 2000

    def reset(self):
        pass

    def tick(self, now_ms):
        phase = now_ms % self.period_ms
        half = self.period_ms // 2
        if half == 0:
            return self.brightness
        if phase < half:
            # Fade up
            return (self.brightness * phase) // half
        else:
            # Fade down
            return (self.brightness * (self.period_ms - phase)) // half


class Flicker:
    """Pseudo-random flicker effect for "damaged" look.
    Uses a simple LCG instead of random module to save memory."""

    done = False

    def __init__(self, brightness=2000, intensity=0.5):
        self.brightness = brightness
        self.min_br = int(brightness * (1.0 - intensity))
        self.range_br = brightness - self.min_br
        self._seed = 12345

    def reset(self):
        self._seed = 12345

    def _next_rand(self):
        # Simple LCG pseudo-random (lightweight, no import needed)
        self._seed = (self._seed * 1103515245 + 12345) & 0x7FFFFFFF
        return self._seed

    def tick(self, now_ms):
        # Change flicker every ~50ms
        r = self._next_rand()
        return self.min_br + (r % (self.range_br + 1))


class Sweep:
    """Sequential light-up across channels. Used for loading animation.
    Sets `done = True` when complete (signals auto-transition)."""

    def __init__(self, num_channels, speed_ms=200, brightness=4095):
        self.num_channels = num_channels
        self.speed_ms = speed_ms
        self.brightness = brightness
        self.done = False
        self._start_ms = 0
        self._started = False

    def reset(self):
        self.done = False
        self._started = False
        self._start_ms = 0

    def tick_multi(self, now_ms):
        """Returns list of brightness values, one per channel.
        Use tick_multi() instead of tick() for multi-channel effects."""
        if not self._started:
            self._start_ms = now_ms
            self._started = True

        elapsed = now_ms - self._start_ms
        lit_count = elapsed // self.speed_ms

        if lit_count >= self.num_channels:
            self.done = True
            return [self.brightness] * self.num_channels

        result = []
        for i in range(self.num_channels):
            if i < lit_count:
                result.append(self.brightness)
            elif i == lit_count:
                # Current channel fading in
                phase = elapsed % self.speed_ms
                result.append((self.brightness * phase) // self.speed_ms)
            else:
                result.append(0)
        return result

    def tick(self, now_ms):
        # Single-channel fallback: just returns brightness when not done
        if not self._started:
            self._start_ms = now_ms
            self._started = True
        elapsed = now_ms - self._start_ms
        if elapsed >= self.speed_ms:
            self.done = True
            return self.brightness
        return (self.brightness * elapsed) // self.speed_ms


class LoadingSteps:
    """Loading animation for N LEDs synchronized with a blink LED.

    Cycles through N+1 steps (each lasting one blink period = 1/freq seconds):
      step 0:   only last LED on
      step 1:   last 2 LEDs on
      ...
      step N-1: all N LEDs on
      step N:   all off → repeat

    For example with num_leds=3:
      step 0: [off, off, LED2]
      step 1: [off, LED1, LED2]
      step 2: [LED0, LED1, LED2]
      step 3: all off → repeat

    Fully time-based (uses now_ms), so it stays in sync with a Blink
    effect created at the same freq without any shared state.
    Use tick_multi(now_ms) — returns a list of num_leds brightness values.
    """

    done = False

    def __init__(self, num_leds=3, brightness=4095, freq=2.0):
        if not 0 <= brightness <= 4095:
            raise ValueError("brightness must be 0-4095, got {}".format(brightness))
        self.num_leds = num_leds
        self.brightness = brightness
        self.period_ms = int(1000 / freq) if freq > 0 else 500
        self._start_ms = None

    def reset(self):
        self._start_ms = None  # will be set on first tick

    def tick_multi(self, now_ms):
        """Returns list of num_leds brightness values."""
        if self._start_ms is None:
            self._start_ms = now_ms
        step = ((now_ms - self._start_ms) // self.period_ms) % (self.num_leds + 1)
        # step N = all off; step k = last (k+1) LEDs on
        lit_from = self.num_leds - step  # index from which LEDs are on
        return [
            self.brightness if i >= lit_from else 0
            for i in range(self.num_leds)
        ]
