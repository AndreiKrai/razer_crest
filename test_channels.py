import hw, time, _thread, sys

# Stop ship.run() thread if main.py auto-ran on boot
if 'system' in sys.modules:
    ship_mod = sys.modules.get('__main__')
    if ship_mod and hasattr(ship_mod, 'ship'):
        ship_mod.ship._running = False
        print(">>> stopped ship.run() thread")

# Stop any existing blank thread (started by main.py on boot)
hw._blank_running = False
time.sleep_ms(500)

# Reinit hw cleanly
hw.init()
hw._blank_running = True
_thread.start_new_thread(hw._blank_loop, ())

print(">>> ch2=2000 ON, ch0+ch1=0 OFF — 15 sec")
hw.set_channel(0, 0)
hw.set_channel(1, 0)
hw.set_channel(2, 2000)
hw.update()

time.sleep(15)

hw.all_off()
hw._blank_running = False
print(">>> done")
