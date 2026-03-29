"""
main.py — Entry point for the Rasor Crest ship system.
Upload all files to ESP32, then this runs automatically on boot.

For REPL testing, run:
    exec(open("main.py").read())
Then use:
    from system import Status
    ship.set_status(Status.LOADING)
    ship.set_status(Status.IDLE)
    ship.set_status(Status.ERROR)
    ship.set_status(Status.DAMAGED)
    ship.set_status(Status.OFF)
    ship.stop()
"""

import _thread
from system import ShipSystem, Status
from modules.cabin.cabin11 import create as cabin11_create

# --- Build the ship ---
ship = ShipSystem()
ship.register(cabin11_create(channels=[0, 1, 2]))

# --- GO ---
print("=== Rasor Crest Ship System ===")
print("Statuses: off, loading, idle, error, damaged")
print("Usage:  ship.set_status('loading')")
print("Stop:   ship.stop()")
print()

_thread.start_new_thread(ship.run, (Status.LOADING,))
