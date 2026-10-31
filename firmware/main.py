"""
main.py — Entry point for the Rasor Crest ship system.
Upload all files to ESP32, then this runs automatically on boot.

The ship starts dark (status "off"); the phone app sets every status over BLE (docs/PROTOCOL.md).
The ship ticks on a _thread and BLE runs on asyncio in the main thread, so this file blocks.
Run from a PC with `mpremote connect auto run main.py` (Ctrl-C to stop).
"""

import _thread
import asyncio
from system import ShipSystem
from modules.cabin.cabin1 import create as cabin1_create
from modules.cabin.cabin2 import create as cabin2_create
from modules.cabin.cabin3 import create as cabin3_create
import ble


# --- Build the ship ---
ship = ShipSystem()
ship.register(cabin1_create(channels=[0, 1, 2]))
ship.register(cabin2_create(channels=[3, 4, 5]))
ship.register(cabin3_create(channels=[6, 7]))


# --- GO ---
print("=== Rasor Crest Ship System ===")

_thread.start_new_thread(ship.run, ())
asyncio.run(ble.serve(ship))
