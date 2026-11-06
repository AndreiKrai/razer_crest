# APP_WORKFLOW.md — what the app does today, screen by screen

What a user can do in the app **right now** (concept stage). Plans, the full product and open questions are in
`PRODUCT.md`; this file is only the built behaviour, so update it in the same change as the screens.
File map: `app/AGENTS.md`. Pin and wiring facts behind the rules: `HARDWARE.md`.

## How to try it

Commands and Node version: `app/AGENTS.md`. The web version at `http://localhost:8081` is handy for clicking through
flows. Projects are **saved on the phone** and survive a restart (see "Saved projects"); on the web they stay in
memory, so a reload starts empty. The language follows the
phone (English or Ukrainian), read once at start.

## Screens

| Route | What it does |
|---|---|
| `index` | Project list; empty state; "Create project"; "Import project" (phone only); the ⋮ button (or a long press) on a card opens a sheet with Duplicate, Export (phone only) and Delete (confirmed inside the sheet) |
| `project/new` | Name (required), a template ("Empty project" or "Rasor Crest Starship") and an optional cover image; "Next" creates the project |
| `project/[id]` | Hub: the connection card, three options (Hardware, Modules and Actions) and a small "Debug" link |
| `project/[id]/connect` | Scan for models and pick one; the first successful connection binds it to the project |
| `project/[id]/hardware` | The schematic: every board, the cables between them, the controls for the selected board |
| `project/[id]/modules` | The named devices of the project; tap one for its test button and commands |
| `project/[id]/actions` | The project's actions; "Add action", tap one to edit, "Run" on each |
| `project/[id]/action` | Create (no `actionId`) or edit one action |
| `project/[id]/debug` | Talk to the real model over BLE: scan, connect, statuses, STOP ALL, rename (see below) |

## Saved projects

Every change is written to the phone a moment later (and at once when the app goes to the background), one folder per
project: `project.json` plus the cover image, which is copied in because the photo picker's file is temporary. The
list is loaded at launch while the splash screen is still up. A file that can't be read is skipped; boards the
catalog no longer has are dropped on load together with what depended on them. The file carries a schema version
so later changes can upgrade old projects (`PRODUCT.md` §10, A11). Duplicating a project copies everything except
the bound model.

## Templates, export and import

- **Templates.** "Empty project" is only the controller. "Rasor Crest Starship" is the model on the bench today
  (`HARDWARE.md` §4, `firmware/main.py`): power board with battery, lighting board with 8 lights in three cabins
  (3 + 3 + 2, grouped "Cabin 1..3"), motor board with one driver (Engine on output 1, Door on output 2) and eight
  ready actions: Standby and Error (the cabin lights' old ship statuses from `firmware/modules/cabin/*.py` with their
  brightness and blink frequency), the sequences Preloading (with the old 1 s and 2 s delays) and Loading (a loop;
  cabin 3 steps every 1.25 s instead of the old 1 s, because a loop has one length), all four "Stop everything else",
  then Lights on, Lights off, Engine on and Engine off. It is plain project content built in
  `app/src/project/templates.ts`, so the user edits it like any project. Which way the engine turns on "forward" is
  not verified on the bench.
- **Export.** Opens the system share sheet with a `.json` file of the project. The bound model (specific to this
  phone) and the cover image are not in the file.
- **Import.** "Import project" picks any file; the content decides. The file is checked field by field (known boards
  on free matching sockets, outputs that exist, commands that suit the device kind), and what doesn't pass is left
  out. A file that isn't a project, or comes from a newer app version, is refused with a message. The project is
  added under a new id, so importing the same file twice gives two projects.

## The hub

Opening a project shows the **connection card** and three cards: **Hardware** (the schematic below, with the board
count), **Modules** (the device list below, with the device count) and **Actions** (with the action count).

The connection card is how a project meets its model. Without a bound model it offers "Find my model", which opens
the connect screen: the first model the user picks and connects to becomes the project's model (its name is kept up
to date after a rename). After that the card shows "Connect" (straight to the saved model, no scan), "Choose another
model" and, while linked, "Disconnect". There is one link at a time: opening another project's hub drops it.
Building (Hardware, Modules, Actions) works without a connection. There is no Play screen yet.

## The debug screen

Opened from the small "Debug" link at the bottom of the hub. The place to check the link itself (statuses, rename); the
Modules Test button and the Actions Run button send commands too. The protocol is in `PROTOCOL.md`.

1. **Connect.** "Scan for models" lists the controllers advertising the Rasor Crest service; tap one to connect. The
   phase (scanning, connecting, connected, reconnecting) and any failure (Bluetooth off, permission denied, no
   answer) are shown in words.
2. **While connected.** The model's name and firmware version, a chip per status (the current one is highlighted),
   a red STOP ALL, and a rename field. A dropped link reconnects by itself (1, 2, 4, 8 s) until "Disconnect".
3. **Simulation.** In the iOS simulator, an Android emulator and on the web there is no Bluetooth: a notice says so
   and one pretend model ("RasorCrest-DEMO") answers like the firmware. On a real phone it is the real radio.
4. **Not bound.** Connecting here doesn't bind the model to the project; use the hub's connection card for that.

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
is reused when an action picks a module. Tap a row for a sheet with a **Test** button and a line saying what it does:
a light blinks twice; a motor runs forward for half a second at low speed (the text asks the user to make sure
nothing blocks it). The app works out the output from the board and its position (`project/outputs.ts`) and sends
`device_test` (`PROTOCOL.md`). Without a connection the sheet shows "Not connected to the model yet"; if the model
doesn't answer or refuses, it shows a failure line. The kind's other commands (On, Off, Blink…) aren't offered here
yet. With no modules the screen shows a hint and a button to Hardware.

## Actions

An **action** is a name plus a set of modules, each with one command; running it would send all commands together.
The list shows each action's name and module count, a **▶ Run** and a **■ Stop** button, and "Add action" (off while
the project has no modules). ▶ sends the action to the model (`run_action`, `PROTOCOL.md`); its commands run until
the user presses ■ (`stop_action`) or the red **STOP ALL**, so several actions can run at once. Both buttons are always
active: the phone doesn't track which actions are running, so ▶ on a running action starts it again and ■ on a stopped
one does nothing. Each light or motor obeys the last action that gave it a command (`PROTOCOL.md`, `run_action`). An
action with a motor Forward or Reverse shows a red warning that the motor turns until Stop. Without a connection, or
if the model doesn't answer, a line above the list says so. Tap an action to edit it.

The action form has a name (required, at most 32 characters), the list of modules with their commands, "+ Add module",
a **Stop everything else** switch (an exclusive action first stops every other light and motor; ship-error style) and
Save (needs a name and at least one module); editing also has "Delete action". Modules are added one at a time:
a sheet shows the grouped module list (modules already in the action are ticked and can't be picked again), then the
commands of the chosen module. Light commands that take parameters (On: brightness; Blink, Pulse: brightness and
frequency; Flicker: brightness) show number fields and a Done button; the others are picked on tap. Brightness is a
percent in 0.01 steps (the cabin lights ran at about 0.4–1.2%), frequency is in Hz, speed (Forward, Reverse; 1–100%, default 50) is a percent, and invalid values are refused. Tap a module in the form to change its command, the cross removes it. Removing a
module or a board removes the module from every action; an action left with no modules is deleted.

**Sequences.** A new action starts with an **Action / Sequence** switch; the mode is fixed once it is saved. A
sequence is a **timeline** under the name: a fixed column of module names on the left and, scrolling sideways, the
**slots** of each row from left to right. "+ Add module" adds a row with one pause of 1 s; the cross on the name
removes the row. A slot is a **pause** (seconds, 0.1–600, two decimals) or a **command** with the same parameters as
in an action; tap a slot to change or delete it, the "+" at the end of a row adds one. A command is instant and
stays until the next command in its row; only pauses take time. All rows start together when Run is pressed. A
**Repeat** switch starts the whole sequence again when the longest row ends (it needs at least one pause); the form
shows that row's length. "Stop everything else" works as for an action. After a sequence that doesn't repeat ends,
the lights and motors stay in their last state until ■, STOP ALL or another action changes them.

## Not built yet

Wiring guide, inserting a slot in the middle of a row or moving one, sequences longer than one 512-byte message
(chunked upload), Play mode, saving, BLE and sending the
config to the ESP32 (`PRODUCT.md` §4, §6, §9; `PROTOCOL.md`). Device groups (one name over several outputs) and
numbering of outputs across chained lighting boards (the firmware counts 0–31) are also open.
