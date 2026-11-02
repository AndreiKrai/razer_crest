"""
system.py — ShipSystem: the orchestrator.
Manages global status, module registry, and the main tick loop.
"""

import time
from collections import deque
import hw
import motor
from effects import Blink, Pulse, RandomBlink, Steady

_HEARTBEAT_TIMEOUT_MS = 2000

# device_test: a light blinks twice, a motor gets a short low-speed push forward.
_TEST_BLINK_MS = 300
_TEST_BLINKS = 2
_TEST_MOTOR_SPEED = 40
_TEST_MOTOR_MS = 500
# (in1, in2) per TB6612 channel, in the app's motor-socket order (app/src/catalog/gpio.ts, docs/HARDWARE.md §3).
_MOTOR_PINS = ((26, 13), (27, 25), (33, 32), (16, 17), (19, 21), (22, 2))

# run_action: default parameters of each command; a step may override brightness (percent) and frequency (Hz).
_FULL = 4095
_LIGHT_COMMANDS = ("steady", "off", "blink", "pulse", "flicker")
_MOTOR_COMMANDS = {"forward": 1, "reverse": -1, "stop": 0}  # direction; the step's speed is a percent
_SPEED_DEFAULT = 50
_SPEED_RANGE = (1, 100)
_BRIGHTNESS_RANGE = (0.01, 100)
_FREQUENCY_RANGE = (0.1, 10)
_OWNER_MAX = 32

# Status constants
class Status:
    OFF        = "off"
    PRELOADING = "preloading"
    LOADING    = "loading"
    IDLE       = "idle"
    ERROR      = "error"
    DAMAGED    = "damaged"

STATUSES = (Status.OFF, Status.PRELOADING, Status.LOADING, Status.IDLE, Status.ERROR, Status.DAMAGED)


def _in_range(value, limits):
    """None means "use the default"; otherwise a number (not a bool) inside limits."""
    if value is None:
        return True
    return isinstance(value, (int, float)) and not isinstance(value, bool) and limits[0] <= value <= limits[1]


def _light_effect(cmd, brightness, frequency):
    level = _FULL if brightness is None else int(brightness * _FULL / 100 + 0.5)
    if cmd == "steady":
        return Steady(level)
    if cmd == "blink":
        return Blink(level, 2.0 if frequency is None else frequency)
    if cmd == "pulse":
        return Pulse(level, 0.5 if frequency is None else frequency)
    if cmd == "flicker":
        return RandomBlink(level, 0.5, 3.0)
    return Steady(0)  # "off"


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
        # (kind, index, started_ms) while a device test runs
        self._test = None
        # Motors are created on first use; outputs: (kind, index) -> (owner action id, light effect or None)
        self._motors = {}
        self._outputs = {}

    def post(self, command):
        """Queue a (name, arg) command from another thread. Raises IndexError when the queue is full."""
        self._commands.append(command)

    def heartbeat(self):
        """The phone is alive: arm or feed the motor watchdog."""
        self._last_heartbeat = time.ticks_ms()

    def stop_all(self):
        """Motors coast, lights off; the system keeps running."""
        self._end_test()
        self._clear_outputs(None)
        motor.stop_all()
        self.set_status(Status.OFF)

    def test_problem(self, kind, index):
        """Error code if (kind, index) isn't a testable output, else None. Safe to call from another thread."""
        if not isinstance(index, int):
            return "bad_target"
        if kind == "light":
            limit = hw.NUM_CHANNELS
        elif kind == "motor":
            limit = len(_MOTOR_PINS)
        else:
            return "bad_target"
        return None if 0 <= index < limit else "bad_target"

    def action_problem(self, owner, steps):
        """Error code if run_action's arguments are malformed, else None. Safe to call from another thread."""
        if not isinstance(owner, str) or not 0 < len(owner) <= _OWNER_MAX:
            return "bad_action"
        if not isinstance(steps, list) or not steps:
            return "bad_action"
        for step in steps:
            if not isinstance(step, list) or not 3 <= len(step) <= 5:
                return "bad_action"
            kind, index, cmd = step[0], step[1], step[2]
            error = self.test_problem(kind, index)
            if error:
                return error
            known = _LIGHT_COMMANDS if kind == "light" else _MOTOR_COMMANDS
            if not isinstance(cmd, str) or cmd not in known:
                return "bad_action"
            brightness = step[3] if len(step) > 3 else None
            frequency = step[4] if len(step) > 4 else None
            if kind == "motor":
                # A motor's only parameter is its speed, in the first slot.
                if frequency is not None or not _in_range(brightness, _SPEED_RANGE):
                    return "bad_action"
            elif not _in_range(brightness, _BRIGHTNESS_RANGE) or not _in_range(frequency, _FREQUENCY_RANGE):
                return "bad_action"
        return None

    def _motor(self, index, now_ms):
        m = self._motors.get(index)
        if m is None:
            in1, in2 = _MOTOR_PINS[index]
            m = motor.DRV8833Motor("m{}".format(index), in1, in2)
            self._motors[index] = m
        m.update(now_ms)  # resets the ramp clock, so a start ramps up instead of jumping
        return m

    def _start_test(self, kind, index, now_ms):
        self._end_test()
        if kind == "motor":
            self._motor(index, now_ms).set(_TEST_MOTOR_SPEED)
        self._test = (kind, index, now_ms)

    def _end_test(self):
        if self._test is None:
            return
        kind, index, _ = self._test
        self._test = None
        if kind == "light":
            hw.set_channel(index, 0)
        else:
            self._motors[index].coast()

    def _run_test(self, now_ms):
        if self._test is None:
            return
        kind, index, started = self._test
        elapsed = time.ticks_diff(now_ms, started)
        if kind == "light":
            phase = elapsed // _TEST_BLINK_MS
            if phase >= 2 * _TEST_BLINKS:
                self._end_test()
            else:
                hw.set_channel(index, 4095 if phase % 2 == 0 else 0)
        elif elapsed >= _TEST_MOTOR_MS:
            self._end_test()
        else:
            self._motors[index].update(now_ms)

    def _run_action(self, owner, exclusive, steps, now_ms):
        self._end_test()
        if exclusive:
            self._clear_outputs(None)
            motor.stop_all()
        for step in steps:
            kind, index, cmd = step[0], step[1], step[2]
            if kind == "light":
                effect = _light_effect(cmd, step[3] if len(step) > 3 else None, step[4] if len(step) > 4 else None)
                effect.reset()
                self._outputs[(kind, index)] = (owner, effect)
            else:
                m = self._motor(index, now_ms)
                if cmd == "stop":
                    m.coast()
                else:
                    speed = step[3] if len(step) > 3 and step[3] is not None else _SPEED_DEFAULT
                    m.set(_MOTOR_COMMANDS[cmd] * speed)
                self._outputs[(kind, index)] = (owner, None)

    def _clear_outputs(self, owner):
        """Stop the outputs a running action still owns (all of them for owner None): lights off, motors coast."""
        for key in list(self._outputs):
            if owner is None or self._outputs[key][0] == owner:
                del self._outputs[key]
                if key[0] == "light":
                    hw.set_channel(key[1], 0)
                else:
                    self._motors[key[1]].coast()

    def _run_outputs(self, now_ms):
        for key in self._outputs:
            effect = self._outputs[key][1]
            if effect is not None:
                hw.set_channel(key[1], effect.tick(now_ms))
            else:
                self._motors[key[1]].update(now_ms)

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
            elif name == "device_test":
                self._start_test(arg[0], arg[1], now_ms)
            elif name == "run_action":
                self._run_action(arg[0], arg[1], arg[2], now_ms)
            elif name == "stop_action":
                self._clear_outputs(arg)

        last = self._last_heartbeat
        if last is not None and time.ticks_diff(now_ms, last) > _HEARTBEAT_TIMEOUT_MS:
            self._last_heartbeat = None
            motor.stop_all()  # lights may continue
            print("[ship] heartbeat lost, motors stopped")

        for m in self.modules:
            done = m.tick(now_ms)
            if not done:
                all_done = False

        self._run_outputs(now_ms)  # after the modules, so an action overrides the channel they just wrote
        self._run_test(now_ms)
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
