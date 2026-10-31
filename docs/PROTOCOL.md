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
  (The app saves it per project, see `APP_WORKFLOW.md`; reconnecting by that ID without a scan is unverified on
  iOS, where an ID the phone hasn't seen recently may fail until a scan finds the model again.)
- Each controller needs a **unique, user-renamable BLE name** (several projects/models per user).
- App side: BLE needs an Expo **development build** (EAS), not Expo Go. Library: `react-native-ble-plx`.
  Simulators and emulators have **no Bluetooth**: the app uses a simulated model there (`app/src/ble/MockTransport.ts`).
- Firmware side: MicroPython `aioble` (install: `mpremote mip install aioble`), on asyncio in the main thread.
  **Wi-Fi is dropped** (`wifi.py` removed): both together use too much RAM.

## 2. GATT layout

| Characteristic | UUID | Direction | Properties |
|---|---|---|---|
| Service | `6f9d0001-7b5a-4a5e-8c11-5261736f7243` | | advertised, so the app can scan by it |
| **Command** | `6f9d0002-…` | phone → ESP32 | write with response |
| **State** | `6f9d0003-…` | ESP32 → phone | read + notify |
| **Heartbeat** | `6f9d0004-…` | phone → ESP32 | write without response (**decided**) |

The `…` is the same tail as the service UUID. Constants: `app/src/ble/protocol.ts`, `firmware/ble.py`.

**Advertising:** the service UUID is in the advertising data, the name (default `RasorCrest-XXXX`, last two bytes of
the chip id) in the scan response, so it is at most **20 bytes** of UTF-8. One phone at a time.

**Heartbeat (decided):** a separate characteristic, 1 byte, sent about every 500 ms. The firmware only updates a
`last_seen` timestamp; it doesn't go through the command queue, so it can't delay `stop_all`. Connection state in
the UI comes from BLE disconnect events and State notifications.

**Message format (decided):** Command and State messages are UTF-8 **JSON**, kept compact (short keys). It is
easy to debug (nRF Connect, logs) and is the same format as the stored `config.json`. Messages longer than the
MTU are chunked (`upload_config`). If RAM or speed becomes a problem, move hot messages (heartbeat, `stop_all`,
`set_status`) to a short binary form and keep JSON for config and `hello`. Ids and schema stay unchanged.

### Messages (built, milestone 1)

All are JSON objects in UTF-8. Keys are short; the app writes Command and Heartbeat, the ESP32 writes State
(notify, and the same bytes can be read).

| Direction | Message | Meaning |
|---|---|---|
| phone → ESP32 | `{"n":5,"c":"hello"}` | `n` is the sequence number, `c` the command |
| phone → ESP32 | `{"n":6,"c":"set_status","id":"idle"}` | `id` is one of the firmware statuses (`system.py` `STATUSES`) |
| phone → ESP32 | `{"n":7,"c":"stop_all"}` | |
| phone → ESP32 | `{"n":8,"c":"set_name","name":"Starship"}` | 1–20 bytes of UTF-8, no control characters; stored in flash, advertised from the next connection |
| ESP32 → phone | `{"t":"hello","n":5,"fw":"0.1","name":"RasorCrest-AB12","s":"off"}` | the reply to `hello` (`s` = current status) |
| ESP32 → phone | `{"t":"ack","n":6}` or `{"t":"ack","n":6,"e":"bad_status"}` | the command was accepted (queued) or refused |
| ESP32 → phone | `{"t":"state","s":"loading"}` | the status changed; also sent right after connecting |
| phone → ESP32 | one byte `0x01` on Heartbeat | about every 500 ms |

Error codes in `e`: `bad_status`, `bad_name`, `unknown_command`, `busy` (the command queue is full).

- **One command in flight.** The app waits for the ack (1.5 s, up to 3 attempts) before sending the next; the
  firmware keeps only a short write queue.
- An `ack` means "queued", not "applied": the 30 ms tick applies the command (section 7).
- The app subscribes to State before `hello`, but the subscription can lag behind on a fresh connection, which
  the `hello` retries cover.
- Messages must fit the negotiated MTU (a notify is at most MTU − 3 bytes). iOS negotiates by itself; the app asks
  Android for 185.

## 3. Commands

| Command | Purpose |
|---|---|
| `hello` | Returns firmware version, name and current status (built). Boards (`boards: [{connector, type, revision?}]`, see `PRODUCT.md` §5a) and config hash are added with detection and config upload |
| `upload_config` | Chunked upload of the compiled project config; the ESP32 stores it in flash (e.g. `config.json`) |
| `run_sequence <id>` | Start a sequence stored in the config |
| `cancel_sequence <id>` | Cancel a running sequence |
| `set_status <id>` | Set a status/scene (matches the firmware `Status` concept) |
| `set_name <name>` | Rename the controller (built) |
| `device_test <device>` | Blink a lamp / nudge a motor, for the Setup-mode test step |
| `stop_all` | Stop all motors (and running sequences) immediately; lights go off (status `off`), the system keeps running |

Built so far (milestone 1): `hello`, heartbeat, `set_status`, `stop_all`, `set_name`. Replaces the earlier HTTP
draft (the removed `wifi.py`). The ship starts in `off` and only the app changes the status; there is no automatic sequence.

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
- **Motor watchdog:** if there's no heartbeat for 2 s, the ESP32 stops the motors (lights may continue). It is
  armed by the first heartbeat and re-armed by the next one after it trips (`system.py`).

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
