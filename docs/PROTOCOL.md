# PROTOCOL.md — app ↔ ESP32 link (BLE): transport, commands, state, reliability

The single source of truth for the contract between the Expo app (`app/`) and the
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
| **Heartbeat** | phone → ESP32 | write without response (**decided**) |

**Heartbeat (decided):** a separate characteristic, 1 byte, sent about every 500 ms. The firmware only updates a
`last_seen` timestamp; it doesn't go through the command queue, so it can't delay `stop_all`. Connection state in
the UI comes from BLE disconnect events and State notifications.

**Message format (decided):** Command and State messages are UTF-8 **JSON**, kept compact (short keys). It is
easy to debug (nRF Connect, logs) and is the same format as the stored `config.json`. Messages longer than the
MTU are chunked (`upload_config`). If RAM or speed becomes a problem, move hot messages (heartbeat, `stop_all`,
`set_status`) to a short binary form and keep JSON for config and `hello`. Ids and schema stay unchanged.

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

**Compilation and validation (decided):** the app compiles the project into the config. The schema lives in the
shared `protocol/` folder (JSON Schema, single source of truth; TS types are generated from it). The app
validates the config **before** uploading it. The ESP32 checks only `schema_version` and basic structure, and
enforces its own safety limits regardless of the config (motor speed and runtime, no driving of a port without a
detected board). It does not run a full schema validator (RAM).

## 7. Firmware integration rules

- BLE handlers must **enqueue** commands; the 30 ms tick loop applies them.
  Never touch status, motors or `hw` directly from the BLE callback (see `FIRMWARE.md` §4).

## 8. Security

- One controlling phone at a time, with a PIN/token handshake: anyone with nRF Connect can see the device.
