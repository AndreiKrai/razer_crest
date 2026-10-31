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
| `project/[id]` | Hub with three options (Hardware, Modules and Actions) and a small "Debug" link |
| `project/[id]/hardware` | The schematic: every board, the cables between them, the controls for the selected board |
| `project/[id]/modules` | The named devices of the project; tap one for its test button and commands |
| `project/[id]/actions` | The project's actions; "Add action", tap one to edit, "Run" on each |
| `project/[id]/action` | Create (no `actionId`) or edit one action |
| `project/[id]/debug` | Talk to the real model over BLE: scan, connect, statuses, STOP ALL, rename (see below) |

## The hub

Opening a project shows three cards: **Hardware** (the schematic below, with the board count), **Modules** (the
device list below, with the device count) and **Actions** (with the action count).

## The debug screen

Opened from the small "Debug" link at the bottom of the hub. It is the only place that talks to the model; Modules and
Actions still don't send anything. The protocol is in `PROTOCOL.md`.

1. **Connect.** "Scan for models" lists the controllers advertising the Rasor Crest service; tap one to connect. The
   phase (scanning, connecting, connected, reconnecting) and any failure (Bluetooth off, permission denied, no
   answer) are shown in words.
2. **While connected.** The model's name and firmware version, a chip per status (the current one is highlighted),
   a red STOP ALL, and a rename field. A dropped link reconnects by itself (1, 2, 4, 8 s) until "Disconnect".
3. **Simulation.** In the iOS simulator, an Android emulator and on the web there is no Bluetooth: a notice says so
   and one pretend model ("RasorCrest-DEMO") answers like the firmware. On a real phone it is the real radio.
4. **Not saved.** The app doesn't remember the model between launches yet (nothing persists, see above).

## The schematic screen (Hardware)

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
- The form also has an optional **Group** (at most 24 characters; "Cabin", "Back door", "Garden", "Engine") with a
  line explaining it. While the field has focus, a dropdown lists the groups already used in the project (up to 5);
  typing narrows it to the names that start with the typed text, and tapping one fills the field. "cabin" and "Cabin"
  are one group.
- Devices carry a kind icon (lamp for Light, engine for Motor) in the form, on the output tiles, in the Modules list
  and in the module sheet.
- A **used output** shows the name; tap it to rename or remove the device.
- The form sits above the grid so it stays visible when the keyboard is open.
- The board on the schematic shows "Devices: N".

## Modules

A list of every named device (Light, Motor), called a **module** in the app. Modules with a group sit in **collapsible
groups**: one section per group, in the order the groups were first used; every section starts collapsed and shows
its module count. Modules without a group have no header: they follow the groups as plain rows. Inside a group,
modules are ordered by board and output; each row shows the icon, name, kind, board and output number. The same list
is reused when an action picks a module. Tap a row for a sheet with a **Test** button and the **commands** of that
kind: Light: On, Off, Blink, Pulse, Flicker; Motor: Forward, Reverse, Stop (names only, no parameters yet). Without
BLE every button only shows "Not connected to the model yet". With no modules the screen shows a hint and a button to
Hardware.

## Actions

An **action** is a name plus a set of modules, each with one command; running it would send all commands together.
The list shows each action's name and module count, a **Run** button (only shows "Not connected to the model yet")
and "Add action" (off while the project has no modules). Tap an action to edit it.

The action form has a name (required, at most 32 characters), the list of modules with their commands, "+ Add module"
and Save (needs a name and at least one module); editing also has "Delete action". Modules are added one at a time:
a sheet shows the grouped module list (modules already in the action are ticked and can't be picked again), then the
commands of the chosen module. Tap a module in the form to change its command, the cross removes it. Removing a
module or a board removes the module from every action; an action left with no modules is deleted.

## Not built yet

Wiring guide, sending test/commands/actions to the model, command parameters, sequences, statuses, Play mode,
saving, BLE and sending the
config to the ESP32 (`PRODUCT.md` §4, §6, §9; `PROTOCOL.md`). Device groups (one name over several outputs) and
numbering of outputs across chained lighting boards (the firmware counts 0–31) are also open.
