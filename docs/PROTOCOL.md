# PROTOCOL.md — app ↔ ESP32 link (BLE): transport, commands, state, reliability

The single source of truth for the contract between the Expo app (`app/`, not created yet) and the
firmware (`firmware/`). Product context: `PRODUCT.md` §6. A change here is a change on **both** sides:
update the firmware and the app together, in one commit where possible.

Machine-readable parts (config schema, effect ids, board catalog, example messages) will go into a shared
`protocol/` folder once the app work starts. Until then this document is the spec.

---

## 1. Transport: BLE (decided)

The phone app (built with **Expo / React Native**, also to be shown at an expo) needs reliable two-way
control, **the phone's internet must stay up**, and zero-setup reconnect.

- **BLE, not Wi-Fi.** In AP mode the phone loses internet; venue Wi-Fi is unreliable.
- The app finds the controller by **custom service UUID** and remembers the device ID. No OS pairing.
- Each controller needs a **unique, user-renamable BLE name** (several projects/models per user).
- App side: BLE needs an Expo **development build** (EAS), not Expo Go. Library: `react-native-ble-plx`.
- Firmware side: MicroPython `bluetooth` / `aioble`. **Drop Wi-Fi (`wifi.py`)** when BLE goes in:
  both together use too much RAM.

## 2. GATT layout

| Characteristic | Direction | Properties |
|---|---|---|
| **Command** | phone → ESP32 | write with response |
| **State** | ESP32 → phone | read + notify |
| **Heartbeat** | phone → ESP32 | **TBD** (write, or a write to Command) |

Messages are compact (small MTU).

## 3. Commands

| Command | Purpose |
|---|---|
| `hello` | Returns firmware version, connected boards (`boards: [{connector, type, revision?}]`, see `PRODUCT.md` §5a) and config hash |
| `upload_config` | Chunked upload of the compiled project config; the ESP32 stores it in flash (e.g. `config.json`) |
| `run_sequence <id>` | Start a sequence stored in the config |
| `cancel_sequence <id>` | Cancel a running sequence |
| `set_status <id>` | Set a status/scene (matches the firmware `Status` concept) |
| `device_test <device>` | Blink a lamp / nudge a motor, for the Setup-mode test step |
| `stop_all` | Stop all motors (and running sequences) immediately |

The first milestone (`PRODUCT.md` §9) only needs `hello`, heartbeat, `stop_all` and `set_status` with the
existing hard-coded statuses. The earlier HTTP draft in `wifi.py` (`GET status`, `set status <name>`,
`list statuses`) can be mapped onto these; `ShipSystem.status` and `set_status()` already exist in `system.py`.

## 4. State notifications

- current status;
- running sequences + progress;
- per-port activity (on/off, brightness, motor direction/speed) for the live occupancy view;
- errors (e.g. motor runtime limit hit, config rejected, board missing);
- battery voltage, if measured later.

## 5. Reliability rules

- Read the full state after every (re)connect.
- Commands are **idempotent** ("set status = loading", not "next status").
- Commands carry **sequence numbers** and get acks; the app retries on timeout.
- The app auto-reconnects with backoff.
- **Motor watchdog:** if there's no heartbeat for 1–2 s, the ESP32 stops the motors (lights may continue).

## 6. Config

- Versioned with `schema_version`. The ESP32 rejects a config it doesn't understand, with a clear error.
- Contains devices, port bindings, sequences and statuses (`PRODUCT.md` §3). Effect ids and parameters
  match `firmware/effects.py`.
- The firmware **refuses to drive a port whose board isn't detected**.

## 7. Firmware integration rules

- BLE handlers must **enqueue** commands; the 30 ms tick loop applies them.
  Never touch status, motors or `hw` directly from the BLE callback (see `FIRMWARE.md` §4).

## 8. Security

- One controlling phone at a time, with a PIN/token handshake: anyone with nRF Connect can see the device.
