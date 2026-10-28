# AGENTS.md — entry point for AI coding agents (Claude, Copilot, Codex, Cursor…)

**Rasor Crest** is a visual construction kit for LEGO electronics: ready-made boards (ESP32 controller, TLC5940
lighting board, TB6612 motor board), MicroPython firmware, and an Expo phone app that lets non-technical users
attach lights and motors, build sequences and play them. The **Rasor Crest starship** is the first real model and
ships as a sample project; nothing model-specific may be hard-coded long-term. Full picture: `docs/PRODUCT.md`.

This file is the only place for agent rules. Topic details live in `docs/`; read the relevant doc **before**
working in its area.

## Rules that always apply

1. **Reply to the user in Ukrainian.** Code, comments and docs are in English, except `README.md` and
   `docs/TODO.md`, which are the user's own notes and stay in Ukrainian.
2. **Power safety:** never tell the user to connect USB and the buck converter's Vo → ESP32 VIN at the same
   time. USB 5 V back-feeds into the Mould King battery. USB for development, the buck for standalone runs,
   never both (until the Schottky diode is fitted and the user confirms it; `docs/HARDWARE.md` §2).
3. Items marked **TBD** / **OPEN** are unverified or undecided. Never present them as facts; ask or flag them.
   **DECISION** items are proposals; confirm before building on them.
4. Firmware is **MicroPython on ESP32**, not CPython (`docs/FIRMWARE.md` §1).

## Repository map

```
AGENTS.md                 this file: rules + map
README.md                 the user's quick-start cheat sheet (Ukrainian)
.claude/CLAUDE.md         imports this file (Claude Code)
.github/copilot-instructions.md   points to this file (GitHub Copilot)
docs/
  PRODUCT.md              vision, domain model, app modes, app↔ESP32 architecture, milestones, open questions
  FIRMWARE.md             firmware runtime, deploy commands, architecture, contracts, conventions
  HARDWARE.md             physical build: components, power, perfboards, pin maps, motor rules, open items
  PROTOCOL.md             BLE contract between app and firmware
  APP_WORKFLOW.md         what the app does today, screen by screen (built behaviour only)
  TODO.md                 bench/soldering tasks for the user (Ukrainian)
firmware/                 MicroPython code; the device's root filesystem mirrors this folder
app/                      Expo / React Native app (TypeScript, Expo Router); own rules in app/AGENTS.md
protocol/                 shared machine-readable contract: config schema, effect ids, boards (planned)
```

## Where to read before you act

| You are about to… | Read first |
|---|---|
| change anything in `firmware/` | `docs/FIRMWARE.md` |
| touch `hw.py`, `drivers.py`, `motor.py`, choose GPIOs, or give wiring/power advice | `docs/HARDWARE.md` (+ `docs/FIRMWARE.md`) |
| work in `app/` | `app/AGENTS.md`, `docs/PRODUCT.md` |
| need to know what the app already does, or change a screen or a picker/option rule | `docs/APP_WORKFLOW.md` (update it in the same change) |
| work on product features, UX | `docs/PRODUCT.md` |
| add or change a BLE command, state field, config field or effect id | `docs/PROTOCOL.md`; change firmware and app together |
| update the user's to-do list | `docs/TODO.md` |

## Sources of truth

- Physical reality (pins, wiring, power, parts): `docs/HARDWARE.md`. Where it disagrees with the code, ask the
  user: the code reflects what's on the bench today.
- Firmware behaviour: the code in `firmware/`, then `docs/FIRMWARE.md`.
- App ↔ firmware contract: `docs/PROTOCOL.md`.
- Product decisions and open questions: `docs/PRODUCT.md` §10.

## Keeping the docs healthy

- **One fact, one place.** Don't copy rules or numbers between docs; link to the section instead
  (`docs/HARDWARE.md` §4). Agent rules go only in `AGENTS.md` files.
- When you learn or decide something, update the doc that owns it, in the same change as the code.
- When you add a firmware file, add it to the upload command in both `docs/FIRMWARE.md` §2 and `README.md`.
- New topic that fits no doc? Add a new file in `docs/` and a row to the map and the table above.
- Don't add tool-specific instruction files with real content. `.claude/CLAUDE.md` and
  `.github/copilot-instructions.md` stay thin pointers to this file. Area-specific agent rules go in a nested
  `AGENTS.md` (today only `app/AGENTS.md`, with `app/CLAUDE.md` importing it).
