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
_PAUSE_RANGE_MS = (100, 600_000)  # run_sequence pauses and command durations; the tick is 30 ms
_OWNER_MAX = 32
_ENDLESS_COMMANDS = ("off", "stop")  # a duration on these changes nothing

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


def _duration_ok(ms):
    """None means endless; otherwise whole milliseconds inside the pause range."""
    return ms is None or (isinstance(ms, int) and not isinstance(ms, bool) and _PAUSE_RANGE_MS[0] <= ms <= _PAUSE_RANGE_MS[1])


def _tail(items, start):
    """(p1, p2, duration ms) from a step or slot, starting at its first parameter; missing ones are None."""
    n = len(items)
    return (
        items[start] if n > start else None,
        items[start + 1] if n > start + 1 else None,
        items[start + 2] if n > start + 2 else None,
    )


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
        # Motors are created on first use; outputs: (kind, index) ->
        # (owner id, light effect or None, command signature, ms when it goes off/stop or None = endless)
        self._motors = {}
        self._outputs = {}
        # Running sequences: owner id -> [rows, loop, [[next slot, due ms] per row]]
        self._sequences = {}

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
        self._sequences = {}
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

    def _step_problem(self, kind, cmd, p1, p2, ms):
        """Error code if a command with its optional parameters and duration doesn't suit the output kind, else None."""
        known = _LIGHT_COMMANDS if kind == "light" else _MOTOR_COMMANDS
        if not isinstance(cmd, str) or cmd not in known or not _duration_ok(ms):
            return "bad_action"
        if kind == "motor":
            # A motor's only parameter is its speed, in the first slot.
            if p2 is not None or not _in_range(p1, _SPEED_RANGE):
                return "bad_action"
        elif not _in_range(p1, _BRIGHTNESS_RANGE) or not _in_range(p2, _FREQUENCY_RANGE):
            return "bad_action"
        return None

    def action_problem(self, owner, steps):
        """Error code if run_action's arguments are malformed, else None. Safe to call from another thread."""
        if not isinstance(owner, str) or not 0 < len(owner) <= _OWNER_MAX:
            return "bad_action"
        if not isinstance(steps, list) or not steps:
            return "bad_action"
        for step in steps:
            if not isinstance(step, list) or not 3 <= len(step) <= 6:
                return "bad_action"
            error = self.test_problem(step[0], step[1])
            if error:
                return error
            error = self._step_problem(step[0], step[2], *_tail(step, 3))
            if error:
                return error
        return None

    def sequence_problem(self, owner, rows, loop):
        """Error code if run_sequence's arguments are malformed, else None. Safe to call from another thread.

        A row is [kind, index, slots]; a slot is a pause in ms or [command, parameter, parameter, duration ms]."""
        if not isinstance(owner, str) or not 0 < len(owner) <= _OWNER_MAX:
            return "bad_action"
        if not isinstance(rows, list) or not rows:
            return "bad_action"
        longest = 0
        for row in rows:
            if not isinstance(row, list) or len(row) != 3 or not isinstance(row[2], list) or not row[2]:
                return "bad_action"
            kind = row[0]
            error = self.test_problem(kind, row[1])
            if error:
                return error
            total = 0
            for slot in row[2]:
                if isinstance(slot, int) and not isinstance(slot, bool):
                    if not _PAUSE_RANGE_MS[0] <= slot <= _PAUSE_RANGE_MS[1]:
                        return "bad_action"
                    total += slot
                elif isinstance(slot, list) and 1 <= len(slot) <= 4:
                    error = self._step_problem(kind, slot[0], *_tail(slot, 1))
                    if error:
                        return error
                else:
                    return "bad_action"
            longest = max(longest, total)
        if loop and longest < _PAUSE_RANGE_MS[0]:
            return "bad_action"  # a loop with no time in it would spin
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

    def _apply(self, owner, kind, index, cmd, p1, p2, ms, now_ms):
        """Give one output to an owner with a command; the last command on an output wins.

        With a duration the output goes off (light) or stops (motor) after ms; the next command replaces the deadline."""
        key = (kind, index)
        due = None if ms is None or cmd in _ENDLESS_COMMANDS else time.ticks_add(now_ms, ms)
        if kind == "light":
            sig = (cmd, p1, p2)
            old = self._outputs.get(key)
            if old is not None and old[0] == owner and old[2] == sig:
                # The same command again (a looping sequence): don't restart its effect, only re-arm its duration.
                self._outputs[key] = (owner, old[1], sig, due)
                return
            effect = _light_effect(cmd, p1, p2)
            effect.reset()
            self._outputs[key] = (owner, effect, sig, due)
        else:
            m = self._motor(index, now_ms)
            if cmd == "stop":
                m.coast()
            else:
                m.set(_MOTOR_COMMANDS[cmd] * (_SPEED_DEFAULT if p1 is None else p1))
            self._outputs[key] = (owner, None, None, due)

    def _expire(self, key, owner, now_ms):
        """A command's duration is over: the output stays with its owner, light off or motor stopped."""
        if key[0] == "light":
            self._apply(owner, "light", key[1], "off", None, None, None, now_ms)
        else:
            self._motors[key[1]].coast()
            self._outputs[key] = (owner, None, None, None)

    def _stop_everything_else(self):
        self._clear_outputs(None)
        self._sequences = {}
        motor.stop_all()

    def _run_action(self, owner, exclusive, steps, now_ms):
        self._end_test()
        if exclusive:
            self._stop_everything_else()
        for step in steps:
            p1, p2, ms = _tail(step, 3)
            self._apply(owner, step[0], step[1], step[2], p1, p2, ms, now_ms)

    def _run_sequence(self, owner, exclusive, loop, rows, now_ms):
        self._end_test()
        if exclusive:
            self._stop_everything_else()
        self._sequences[owner] = [rows, loop, [[0, now_ms] for _ in rows]]

    def _stop_owner(self, owner):
        self._sequences.pop(owner, None)
        self._clear_outputs(owner)

    def _run_sequences(self, now_ms):
        """Advance every row: run the commands whose time has come, wait out the pauses."""
        for owner in list(self._sequences):
            rows, loop, states = self._sequences[owner]
            finished = True
            end = None
            for row, state in zip(rows, states):
                slots = row[2]
                while state[0] < len(slots) and time.ticks_diff(now_ms, state[1]) >= 0:
                    slot = slots[state[0]]
                    state[0] += 1
                    if isinstance(slot, int):
                        state[1] = time.ticks_add(state[1], slot)  # pauses add up from the planned time, so no drift
                    else:
                        p1, p2, ms = _tail(slot, 1)
                        self._apply(owner, row[0], row[1], slot[0], p1, p2, ms, now_ms)
                if state[0] < len(slots):
                    finished = False
                elif end is None or time.ticks_diff(state[1], end) > 0:
                    end = state[1]
            # The sequence ends when its longest row does; outputs keep their last command until stopped.
            if finished and time.ticks_diff(now_ms, end) >= 0:
                if loop:
                    for state in states:
                        state[0] = 0
                        state[1] = end
                else:
                    del self._sequences[owner]

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
            owner, effect, _, due = self._outputs[key]
            if due is not None and time.ticks_diff(now_ms, due) >= 0:
                self._expire(key, owner, now_ms)  # replaces the value of an existing key; the dict keeps its size
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
            elif name == "run_sequence":
                self._run_sequence(arg[0], arg[1], arg[2], arg[3], now_ms)
            elif name == "stop_action":
                self._stop_owner(arg)

        last = self._last_heartbeat
        if last is not None and time.ticks_diff(now_ms, last) > _HEARTBEAT_TIMEOUT_MS:
            self._last_heartbeat = None
            motor.stop_all()  # lights may continue
            print("[ship] heartbeat lost, motors stopped")

        for m in self.modules:
            done = m.tick(now_ms)
            if not done:
                all_done = False

        self._run_sequences(now_ms)
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
