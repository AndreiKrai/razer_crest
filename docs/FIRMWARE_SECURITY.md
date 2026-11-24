# FIRMWARE\_SECURITY.md — secure boot, flash encryption, licensed boards

Status: **OPEN** (agreed in discussion with the owner on 2026-11-23). Details of ESP-IDF options must be **verified** against the current Espressif documentation before production. eFuse writes are **irreversible**: test every step on spare development boards first.

## 1. Goals and limits

- Prevent copying our firmware from a board and running unsigned firmware on genuine or licensed boards.
- Allow licensed third-party makers to sell boards that our app turns into working boards.
- **No fee for licensed makers** (owner decision): the programme is free; we only register their boards.
- Not a goal: stopping a competitor from building their own hardware, firmware and app from scratch. Encryption cannot prevent that; content and update speed are the defence (`MONETIZATION.md`).
- Assume the BLE command set is public. The React Native app can be unpacked and its Hermes bundle disassembled (strings such as UUIDs and command names stay readable), and the protocol can also be sniffed over the air while the official app runs. Obfuscation only raises the effort, so never rely on hiding the protocol. Protect the board with signed firmware, server-checked registration and challenge-response (section 4), and keep effect logic in firmware so that the app sends only high-level commands.

## 2. Chip choice

Use a recent chip such as **ESP32-S3 or ESP32-C3** with Secure Boot V2. Older ESP32 (v1) revisions had published fault-injection attacks on secure boot and flash encryption. Use a pre-certified module (CE/RED) to simplify compliance.

## 3. Protection features (ESP-IDF)

| Feature | What it does | Note |
| --- | --- | --- |
| Secure Boot V2 | The chip runs only firmware signed with our private key | Signing key stays offline; losing it = no more updates |
| Flash encryption (release mode) | Flash contents are encrypted with a per-device key stored in eFuse, not readable from outside | Plain firmware cannot be dumped |
| NVS encryption | Encrypts stored settings and device secrets | Needed if secrets live in NVS |
| Disable JTAG and UART download in release | Closes debug and re-flash paths | Factory flashing must happen before this step |
| Signed OTA updates | Over-the-air updates over BLE, verified by secure boot | Same signing key |

## 4. Boot and provisioning flow

A blank chip cannot be flashed over BLE: it has no firmware and no Bluetooth stack yet. The first write is always by wire.

1. **We build a small signed loader** (bootloader plus minimal BLE OTA app) and give it to licensed makers.
2. **Factory:** the maker flashes the loader by USB/UART. This is a standard production step.
3. **First boot:** the chip burns the secure boot key digest and generates its own flash-encryption key in eFuse, encrypts flash in place, and locks debug paths.
4. **Registration:** the app connects over BLE, reads the device ID and a device certificate, and asks our server to confirm the board belongs to a registered maker.
5. **Install:** the app downloads the full signed firmware from our server and installs it by BLE OTA. The board accepts only firmware signed by us.
6. **Updates:** later firmware versions arrive the same way.

## 5. Licensed-maker programme

- Free registration; the maker receives the signed loader and a batch of device certificates.
- Each board registers through our server on first activation, so we see volumes per maker and can revoke a leaked batch.
- Effect unlocks for these boards are sold in the app as for any board without a box code.

## 6. Key management

- The secure boot signing key is the most valuable secret of the company: keep it offline (hardware token or HSM), with a secure backup. **Verify** process with a security specialist.
- Device certificates are signed by a separate intermediate key per maker, so one maker's leak does not expose others.

## 7. Open questions

| # | Question | Status |
| --- | --- | --- |
| F1 | Exact chip and module | ⏳ Open |
| F2 | BLE OTA component and image size limits | ⏳ Verify |
| F3 | Device certificate format and server check | ⏳ Open |
| F4 | Key storage (hardware token, HSM, backup) | ⏳ Open |
| F5 | Factory provisioning tool for makers | ⏳ Open |
| F6 | MicroPython gap: Secure Boot verifies only the MicroPython binary, not `.py` files on the filesystem. Likely fix: freeze our modules into the image, disable REPL / raw REPL / WebREPL in release builds, update only the whole signed image (never single `.py` files). Also check that the VFS partition is really encrypted (`encrypted` flag in the partition table) | ⏳ Verify, critical, **required before sales** |
| F7 | Effect unlocks (§5) must be enforced by firmware, not only by the app (a patched app would unlock everything). Proposal: server-signed entitlement token bound to the board ID, checked on the board | ⏳ Open |
| F8 | Device private keys must not be handed to makers in a certificate batch (they could clone boards). Proposal: the board generates its key on-chip (e.g. Digital Signature peripheral on S3/C3), we sign its CSR | ⏳ Verify, **required before sales** |
| F9 | Fault-injection attacks may also exist for newer chips (possibly ESP32-C3); check Espressif security advisories before choosing (F1). Changing from the classic ESP32 on the bench affects `HARDWARE.md` pin maps and boards | ⏳ Verify |
| F10 | Backup signing keys: Secure Boot V2 on S3/C3 may allow several key digests with revocation, which would soften "losing the key = no more updates" (§3) | ⏳ Verify |
| F11 | Anti-rollback (secure version in eFuse) so old signed firmware with known bugs cannot be reinstalled | ⏳ Verify |
| F12 | Secure Download Mode instead of fully disabling UART download: allows re-flashing for repair while blocking flash reads | ⏳ Verify |
| F13 | Provisioning on the host (`espefuse` / `espsecure`) instead of on-device first boot (§4 step 3), which is slow and risky if power is lost | ⏳ Verify |
| F14 | Describe the challenge-response check referenced in §1: app or server sends a random nonce, the board signs it with its device key, the certificate chain is verified | ⏳ Open |
| F15 | Docs housekeeping: add this doc to the `AGENTS.md` map, rename the file to a plain name, resolve the two `MONETIZATION` files | ✅ Done (2026-11-23) |
| F16 | Server-signed config for paid effects (owner decision, `MONETIZATION.md` §2): the firmware runs paid effect ids only from a config signed by our server for this board's ID (owner decision, 2026-11-23), so one paid account cannot copy a model onto many boards. The board ID must be proven by the device certificate (F8). The licence itself stays on the account; moving a model re-signs it for the new board, within a per-account board limit (`MONETIZATION.md` M17). Design key, signature format, size within the BLE config upload (`PROTOCOL.md`), and what the board does with an unsigned config (run free effects only). Depends on F6, F8 | ⏳ Open, **required before sales** |
