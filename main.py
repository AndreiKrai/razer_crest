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
from modules.cabin.cabin1 import create as cabin1_create
from modules.cabin.cabin2 import create as cabin2_create
from modules.cabin.cabin3 import create as cabin3_create


# --- Build the ship ---
ship = ShipSystem()
ship.register(cabin1_create(channels=[0, 1, 2]))
ship.register(cabin2_create(channels=[3, 4, 5]))
ship.register(cabin3_create(channels=[6, 7]))



# --- GO ---
print("=== Rasor Crest Ship System ===")
print("Statuses: off, loading, idle, error, damaged")
print("Usage:  ship.set_status('loading')")
print("Stop:   ship.stop()")
print()

_thread.start_new_thread(ship.run, ([
    (Status.PRELOADING, 5),
    (Status.LOADING, 8),
    (Status.IDLE, 15),
    (Status.OFF, 1),
],))
