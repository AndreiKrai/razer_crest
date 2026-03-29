import hw, time

# Stop ship.run() thread from main.py (it overwrites channel values every 30ms)
try:
    ship._running = False
    time.sleep_ms(100)
except:
    pass
hw.stop_blank_thread()
time.sleep_ms(200)

hw.init()
hw.start_blank_thread()

print(">>> only ch2 ON (brightness=2000), ch0+ch1 OFF — 15 sec")
hw.set_channel(0, 0)
hw.set_channel(1, 0)
hw.set_channel(2, 2000)
hw.update()

time.sleep(15)

hw.all_off()
hw.stop_blank_thread()
print(">>> done")
