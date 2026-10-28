# APP_WORKFLOW.md — what the app does today, screen by screen

What a user can do in the app **right now** (concept stage). Plans, the full product and open questions are in
`PRODUCT.md`; this file is only the built behaviour, so update it in the same change as the screens.
File map: `app/AGENTS.md`. Pin and wiring facts behind the rules: `HARDWARE.md`.

## How to try it

Commands and Node version: `app/AGENTS.md`. The web version at `http://localhost:8081` is handy for clicking through
flows. **Nothing is saved**: projects and devices live in memory, so a reload starts empty. The language follows the
phone (English or Ukrainian), read once at start.

## Screens

| Route | What it does |
|---|---|
| `index` | Project list; empty state; "Create project" |
| `project/new` | Name (required) and an optional cover image; "Next" creates a project that contains only the controller |
| `project/[id]` | The schematic: every board, the cables between them, the controls for the selected board |

## The schematic screen

1. **Boards and cables.** The controller is in the middle with four sockets: Motors (left), Motors (top), Lights
   (right), Power (bottom). Each placed board hangs off the socket it plugs into. One wire is drawn per cable pin,
   coloured by kind (signal, 3V3/5V, GND, orange for the motor supply). A free socket shows a "+ Name" caption.
2. **Add a board.** "+ Add board" (when nothing is selected) or tapping a free socket opens the picker, grouped by
   category. A board is placed in the first free matching socket and selected at once.
3. **Dimmed items in the picker** always say why:

   | Reason shown | When |
   |---|---|
   | Coming soon | Servo, Sound, Sensor boards (listed, not built) |
   | Add a board from "X" first | No socket of that kind exists yet (e.g. Battery pack needs a power board) |
   | The "X" socket is already used | Every matching socket is taken |
   | At most N of these per model | Lighting boards: 2 (chain length unverified, `HARDWARE.md` O19) |
   | No space left on the controller | The board's pins no longer fit (`PRODUCT.md` §3, "Board budget") |
   | Add the "X" first | Motor board needs the Power board |

4. **Selecting a board** (tap it; tap the empty canvas to deselect) shows a bar with its name, a description and:
   - **Options.** Motor board: number of drivers (1 or 2, 2 motors each). A value is dimmed if the controller has
     no pins for it, or if devices sit on the outputs it would remove (the bar says so).
   - **Outputs and devices** (lighting and motor boards), see below.
   - **Remove.** Not for the controller. It also removes everything plugged into that board, boards that need it
     (motor boards without a power board) and the devices on all of them.

## Rules behind the dimming

Why a board or option fits or not is decided in code and explained in `PRODUCT.md` §3 ("Board budget", "Power");
the pin numbers are in `HARDWARE.md` §3. Where to read the code: `app/AGENTS.md` (code map). In short, the picker
and the options only ever ask three questions: is a matching socket free, does the board's pin budget still fit,
and is the board it requires (the Power board for motors) present. The user never sees GPIO numbers.

## Outputs and devices (the sheet)

Select a board, tap "Outputs and devices". The sheet lists every output of the board: 16 on the lighting board,
2 per driver on the motor board, numbered from 1.

- A **free output** takes a **named device**. The kind follows the board (lighting board → Light, motor board →
  Motor); one device per output; the name is required and at most 24 characters.
- A **used output** shows the name; tap it to rename or remove the device.
- The form sits above the grid so it stays visible when the keyboard is open.
- The board on the schematic shows "Devices: N".

## Not built yet

Wiring guide, device test button, actions/effects, statuses, sequences, Play mode, saving, BLE and sending the
config to the ESP32 (`PRODUCT.md` §4, §6, §9; `PROTOCOL.md`). Device groups (one name over several outputs) and
numbering of outputs across chained lighting boards (the firmware counts 0–31) are also open.
