"""
ble.py — BLE link to the phone app (GATT server). The contract is in docs/PROTOCOL.md.

Runs on asyncio in the main thread. Handlers never touch hw or motors: commands go to
ShipSystem.post() and the ship's 30 ms tick applies them.
"""

import asyncio
import bluetooth
import json
import machine
import aioble
from system import STATUSES

_FW_VERSION = "0.1"
_NAME_FILE = "name.txt"
_NAME_MAX_BYTES = 20          # name travels in the 31-byte scan response
_ADV_INTERVAL_US = 250_000
_STATE_POLL_MS = 100
_MAX_MSG = 128                # characteristic buffer; messages must fit the negotiated MTU

_SERVICE_UUID = bluetooth.UUID("6f9d0001-7b5a-4a5e-8c11-5261736f7243")
_COMMAND_UUID = bluetooth.UUID("6f9d0002-7b5a-4a5e-8c11-5261736f7243")
_STATE_UUID = bluetooth.UUID("6f9d0003-7b5a-4a5e-8c11-5261736f7243")
_HEARTBEAT_UUID = bluetooth.UUID("6f9d0004-7b5a-4a5e-8c11-5261736f7243")


def _name_problem(name):
    if not isinstance(name, str):
        return "bad_name"
    name = name.strip()
    if not name or len(name.encode()) > _NAME_MAX_BYTES:
        return "bad_name"
    for ch in name:
        if ord(ch) < 32:
            return "bad_name"
    return None


def _load_name():
    try:
        with open(_NAME_FILE) as f:
            name = f.read().strip()
        if _name_problem(name) is None:
            return name
    except OSError:
        pass
    return "RasorCrest-" + "".join("{:02X}".format(b) for b in machine.unique_id()[-2:])


def _save_name(name):
    with open(_NAME_FILE, "w") as f:
        f.write(name)


class _Link:
    def __init__(self, ship):
        self.ship = ship
        self.name = _load_name()
        service = aioble.Service(_SERVICE_UUID)
        self.command = aioble.BufferedCharacteristic(
            service, _COMMAND_UUID, write=True, capture=True, max_len=_MAX_MSG
        )
        self.state = aioble.BufferedCharacteristic(
            service, _STATE_UUID, read=True, notify=True, max_len=_MAX_MSG
        )
        self.heartbeat = aioble.Characteristic(
            service, _HEARTBEAT_UUID, write_no_response=True, capture=True
        )
        aioble.register_services(service)
        self.service = service

    def send(self, connection, msg):
        data = json.dumps(msg).encode()
        self.state.write(data)
        try:
            self.state.notify(connection, data)
        except OSError:
            pass  # phone went away between the write and the notify

    def send_state(self, connection):
        self.send(connection, {"t": "state", "s": self.ship.status})

    def post(self, item):
        try:
            self.ship.post(item)
        except IndexError:
            return "busy"
        return None

    def handle(self, connection, data):
        try:
            msg = json.loads(data.decode())
            seq = msg["n"]
            cmd = msg["c"]
        except (ValueError, KeyError, TypeError):
            return  # without a sequence number there is nothing to acknowledge

        error = None
        if cmd == "hello":
            self.send(connection, {"t": "hello", "n": seq, "fw": _FW_VERSION, "name": self.name, "s": self.ship.status})
            return
        elif cmd == "set_status":
            status = msg.get("id")
            error = "bad_status" if status not in STATUSES else self.post(("set_status", status))
        elif cmd == "stop_all":
            error = self.post(("stop_all", None))
        elif cmd == "device_test":
            kind, index = msg.get("k"), msg.get("i")
            error = self.ship.test_problem(kind, index) or self.post(("device_test", (kind, index)))
        elif cmd == "set_name":
            name = msg.get("name")
            error = _name_problem(name)
            if error is None:
                self.name = name.strip()
                _save_name(self.name)  # advertised from the next connection on
        else:
            error = "unknown_command"

        ack = {"t": "ack", "n": seq}
        if error:
            ack["e"] = error
        self.send(connection, ack)


async def _commands(link):
    while True:
        result = await link.command.written()
        if result[0] is not None:
            link.handle(result[0], result[1])


async def _heartbeats(link):
    while True:
        await link.heartbeat.written()
        link.ship.heartbeat()


async def serve(ship):
    """Advertise, accept one phone at a time and serve it. Never returns."""
    link = _Link(ship)
    asyncio.create_task(_commands(link))
    asyncio.create_task(_heartbeats(link))

    while True:
        bluetooth.BLE().config(gap_name=link.name)
        print("[ble] advertising as", link.name)
        connection = await aioble.advertise(
            _ADV_INTERVAL_US, name=link.name.encode(), services=[_SERVICE_UUID]
        )
        print("[ble] connected")
        last = None
        while connection.is_connected():
            if ship.status != last:
                last = ship.status
                link.send_state(connection)
            await asyncio.sleep_ms(_STATE_POLL_MS)
        print("[ble] disconnected")
