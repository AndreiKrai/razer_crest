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
| `index` | Project list; empty state; "Create project"; "Import project" (phone only); the ⋮ button (or a long press) on a card opens a sheet with Duplicate, Export (phone only) and Delete (confirmed inside the sheet); the account icon in the header opens `account` |
| `account` | Sign in with Apple / Google, or Sign out. Everyone starts as an anonymous guest and nothing in the app requires an account yet. **Mock only**: a stand-in service, nothing is stored and a restart is a fresh guest; Firebase and the real Apple / Google sign-in are not built (`AUTHENTICATION.md`) |
| `project/new` | Name (required), a template ("Empty project" or "Rasor Crest Starship") and an optional cover image; "Next" creates the project |
| `project/[id]` | Play screen (the project's home): the Play buttons, STOP ALL, the Options gear at the bottom right, a Bluetooth icon in the header; the ⋮ button opens a sheet with Rename project and Change image |
| `project/[id]/effects` | "Effects": the connection card, Hardware, Modules, Actions and Scenarios cards and a small "Debug" link |
| `project/[id]/play` | Edit play screen: the background image and the list of buttons (reorder ▲ ▼, tap to edit, "Add button") |
| `project/[id]/play-button` | Create (no `buttonId`) or edit one Play button: name, icon, the action or scenario it runs |
| `project/[id]/connect` | Scan for models and pick one; the first successful connection binds it to the project |
| `project/[id]/hardware` | The schematic: every board, the cables between them, the controls for the selected board |
| `project/[id]/modules` | The named devices of the project; tap one for its test button and commands |
| `project/[id]/actions` | The project's actions; "Add action", tap one to edit, "Run" on each |
| `project/[id]/action` | Create (no `actionId`) or edit one action |
| `project/[id]/scenarios` | The project's scenarios; "Add scenario", tap one to edit, "Run" and "Stop" on each |
| `project/[id]/scenario` | Create (no `scenarioId`) or edit one scenario |
| `project/[id]/debug` | Talk to the real model over BLE: scan, connect, statuses, STOP ALL, rename (see below) |

## Saved projects

Every change is written to the phone a moment later (and at once when the app goes to the background), one folder per
project: `project.json` plus the cover image, which is copied in because the photo picker's file is temporary. Covers
are square, like the thumbnail in the list: the picker opens the system editor with a square frame the user can zoom
and move (iOS and Android), and the cropped image is what's kept. A replaced cover is deleted on the next save. The
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

## The Play screen (project home) and Effects

Opening a project shows its **Play screen**: big square buttons in two columns on the project's background image
(or the plain dark background), a red **STOP ALL** and a round **Options** (gear) button at the bottom right. A
button runs its action or scenario exactly as ▶ does in the Actions / Scenarios lists (`modules/run.ts`); without a
connection the "Connect to your model first" notice appears. A project from the Starship template has a button per
action; a new empty project has none and shows a hint.

**Options** opens a sheet with two entries: **Create / edit effects** (opens `effects`: the connection card and the
Hardware, Modules, Actions and Scenarios cards, with their counts, plus the "Debug" link) and **Edit play screen**
(opens `play`).

**Edit play screen.** Choose or remove the background image (the photo library, no crop; it is stored next to the
cover and copied by Duplicate, but is not in an exported file) and manage the buttons. "Add button" is off while the
project has no action and no scenario. The button form has a name (required, at most 24 characters), an icon from a
fixed grid of about 36 and the action or scenario it runs (required; picking one names an unnamed button after it).
Deleting an action or scenario removes the buttons that ran it.

**The connection.** Opening a project connects to its saved model by itself (no bound model: a banner with "Find my
model"). A Bluetooth icon in the header shows the state (connected, not connected or failed); every change of the
connection also shows its status for a few seconds under the header, and tapping the icon shows it again and, when
not connected, connects. The full connection card (Find / Choose another model / Disconnect) lives on `effects`.
There is one link at a time: opening another project drops it.
Building (Hardware, Modules, Actions) works without a connection.

**Bluetooth off.** If the phone's Bluetooth is off when the user scans (connect screen) or presses "Connect" (Effects
or the notice below), the screen says so and asks to turn it on; the scan or connection then continues by itself as
soon as Bluetooth is on (leaving the connect screen cancels the wait). If Bluetooth goes off while connected, the
Effects shows the same line while the link keeps reconnecting, and it tries again at once when Bluetooth is back.

**"Connect to your model first".** Test (Modules) and ▶ / ■ / STOP ALL (Actions) pressed without a connection show
a notice with a **Connect** button (straight to the saved model) or, without a bound model, **Find my model** (opens
the connect screen). The notice shows the progress, the reason a connection failed (including Bluetooth off) and
disappears once connected; the user then presses the button again.

The ⋮ button in the Play screen's header opens a sheet: **Rename project** (a system text prompt; an empty name is ignored,
the name is cut to 40 characters; iOS only for now, `Alert.prompt` does nothing on Android) and **Change image**
(the same square cover picker as on `project/new`; the list shows the new cover).

## The debug screen

Opened from the small "Debug" link at the bottom of the Effects screen. The place to check the link itself (statuses, rename); the
Modules Test button and the Actions Run button send commands too. The protocol is in `PROTOCOL.md`.

1. **Connect.** "Scan for models" lists the controllers advertising the Rasor Crest service; tap one to connect. The
   phase (scanning, connecting, connected, reconnecting) and any failure (Bluetooth off, permission denied, no
   answer) are shown in words.
2. **While connected.** The model's name and firmware version, a chip per status (the current one is highlighted),
   a red STOP ALL, and a rename field. A dropped link reconnects by itself (1, 2, 4, 8 s) until "Disconnect".
3. **Simulation.** In the iOS simulator, an Android emulator and on the web there is no Bluetooth: a notice says so
   and one pretend model ("RasorCrest-DEMO") answers like the firmware. On a real phone it is the real radio.
4. **Not bound.** Connecting here doesn't bind the model to the project; use the connection card on Effects for that.

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
`device_test` (`PROTOCOL.md`). Without a connection the sheet shows the "Connect to your model first" notice (see
"The Play screen"); if the model
doesn't answer or refuses, it shows a failure line. The kind's other commands (On, Off, Blink…) aren't offered here
yet. With no modules the screen shows a hint and a button to Hardware.

## Actions

An **action** is a name plus a set of modules, each with one command; running it would send all commands together.
The list shows each action's name and module count, a **▶ Run** and a **■ Stop** button, and "Add action" (off while
the project has no modules). After the name a clock shows the action's total time when it can be told: until the last
timed command is over (an action: its longest duration; a sequence: its longest row, or later if a row's last command
still runs). An action with an endless command, a repeating sequence, or only Off/Stop has no clock. ▶ sends the action to the model (`run_action`, `PROTOCOL.md`); its commands run until
the user presses ■ (`stop_action`) or the red **STOP ALL**, so several actions can run at once. Both buttons are always
active: the phone doesn't track which actions are running, so ▶ on a running action starts it again and ■ on a stopped
one does nothing. Each light or motor obeys the last action that gave it a command (`PROTOCOL.md`, `run_action`). An
action with an endless motor Forward or Reverse shows a red warning that the motor turns until Stop; a timed one doesn't. Without a connection the "Connect to your model first" notice appears above the list (see "The Play screen"); if the
model doesn't answer, a line above the list says so. Tap an action to edit it.

The action form has a name (required, at most 32 characters), the list of modules with their commands, "+ Add module",
a **Stop everything else** switch (an exclusive action first stops every other light and motor; ship-error style) and
Save (needs a name and at least one module); editing also has "Delete action". Modules are added one at a time:
a sheet shows the grouped module list (modules already in the action are ticked and can't be picked again), then the
commands of the chosen module. Light commands that take parameters (On: brightness; Blink, Pulse: brightness and
frequency; Flicker: brightness) show number fields and a Done button; the others are picked on tap. Brightness is a
percent in 0.01 steps (the cabin lights ran at about 0.4–1.2%), frequency is in Hz, speed (Forward, Reverse; 1–100%, default 50) is a percent, and invalid values are refused. Every command except Off and
Stop also has a **duration**: "∞ Endless" (the default) or 0.1–600 s, after which the light goes off or the motor stops.
In the form's module list a clock with the duration ("5 s") sits after the module name; an endless command and Off/Stop
have no clock. Tap a module in the form to change its command, the cross removes it. Removing a
module or a board removes the module from every action; an action left with no modules is deleted.

**Sequences.** A new action starts with an **Action / Sequence** switch; the mode is fixed once it is saved. A
sequence is a **timeline** under the name: a fixed column of module names on the left and, scrolling sideways, the
**slots** of each row from left to right. "+ Add module" adds a row with one pause of 1 s; the cross on the name
removes the row. The ▲ ▼ arrows on a name move the row one place up or down (greyed at the ends); the order only
decides how the rows are listed, since all rows start together. A slot is a **pause** (seconds, 0.1–600, two decimals) or a **command** with the same parameters as
in an action; tap a slot to change or delete it, the "+" at the end of a row adds one. A command is instant and
stays until the next command in its row; only pauses take time. A command slot with a duration shows a timer and the
seconds; the light goes off or the motor stops when the duration is over, alongside the row (it doesn't lengthen the
row), unless the row's next command comes first. All rows start together when Run is pressed. A
**Repeat** switch starts the whole sequence again when the longest row ends (it needs at least one pause); the form
shows that row's length. "Stop everything else" works as for an action. After a sequence that doesn't repeat ends,
the lights and motors stay in their last state until ■, STOP ALL or another action changes them.

**Chase (action for a group of modules).** Next to "+ Add module", both the Action form and the sequence timeline have
**"+ Action for a group of modules"**: a running light over several lights. A sheet lists the project's lights (only
lights, groups open); tapping a light adds it and shows its place (1, 2, 3…), tapping it again removes it, and the
number order is the running order. At least 2 lights; lights the action already uses are ticked and can't be picked. In an
action, Next opens the chase form; in a sequence, Done adds a **group row** (one row for all the lights, labelled
with their names and a layers icon, starting with a 1 s pause).
- Chase form: **Brightness** (the head, % as for Steady), **Direction** (Forward, Backward, There and back),
  **Step** (seconds the head stays on one light, 0.1–5, default 0.2), **Tail** (lights glowing behind the head,
  fading out; 1–16, default 3, never more than the group) and **Duration** (endless or 0.1–600 s, then the group
  goes off).
- In an action the chase is a card like a module step (names, "N lights · Chase · …"), tap to change it (its own
  lights stay pickable; the back arrow returns to the light choice), the cross removes it. In a sequence a group row's
  slots are a pause, **Chase** (the form above) or **Off** (all lights of the row); the "+" adds a slot at the end,
  as in other rows. A group row takes part in the longest-row length, Repeat and the row order (▲ ▼) like any row.
- A module is used once per action: a light in a chase or group row can't also be a single module there.
  Removing a light from the project removes it from its chases; one left with no lights is deleted.

## Scenarios

A **scenario** arranges existing actions in time. The list (Scenarios on Effects) shows each scenario's name and
how many different actions it uses, with **▶ Run** and **■ Stop** buttons, the red **STOP ALL** and "Add scenario"
(off while the project has no actions). A scenario that uses an action with an endless motor Forward or Reverse
shows the same red motor warning as the action. Unlike an action, a scenario is run by the model alone: ▶ first
sends the model every action the scenario uses (`define_action`), then the timeline (`run_scenario`, `PROTOCOL.md`),
so it keeps going if the phone disconnects. ■ (`stop_action` with the scenario's id) stops it together with every
action it started. Without a connection the "Connect to your model first" notice appears, as for actions.

The scenario form works like a sequence's timeline: a name (required, at most 32 characters), then **rows**, each a
line of slots from left to right. "+ Add row" opens the list of actions and starts the row with the one tapped;
the "+" at the end of a row adds a slot, tap a slot to change or delete it, the ▲ ▼ arrows move a row and the cross
removes it. A slot is an **action** (the list of the project's actions, with the action's time when known) or a
**pause** (0.1–600 s). **All rows start together** (they run at the same time); **a row runs one action at a time,
the slots following one another**. How long an action holds its row (the timer on the slot):
- An action that **ends by itself** (every command has a duration, or a sequence without Repeat) holds the row for its
  own length (the clock the Actions list shows); the next slot starts after it.
- An action with **no end of its own** (an endless command, or a repeating sequence) asks for **"Runs for, seconds"**
  when it is picked. The default is its longest row + 1 s (a plain action: 1 s), and the sheet notes that the action
  itself lasts N s, so adding 1 s extra is recommended. When that time is over the action **stops** (lights off,
  motors coast), even if no slot follows, and the next slot starts. A default isn't stored, so it follows the
  action if the action changes.
- The **last** slot of a row has a **"Run until Stop"** switch: that action never stops by itself and runs until ■.
  The list shows the red motor warning only for such an action with an endless motor.
- An action that takes no time (only Off/Stop) holds nothing; a pause adds an extra gap on top.

When an action starts, the previous action of that row is stopped (unless another action has taken those outputs
over). Inside a scenario an action's own **Stop everything else** flag is ignored: only the scenario's flag counts. The
same action may appear in several slots and rows (but then one row's takeover also stops it in the other). A **Repeat**
switch starts the scenario again when the longest row ends (needs a pause or an action with a time; an endless last
action adds none); the form shows the longest row's length;
**Stop everything else** first stops every other light and motor. Save needs a name and at least one action. A
scenario can use at most 12 different actions and must fit one 512-byte message per action and for the timeline
(otherwise Run says it is too big). Deleting an action (or the module it needs) removes its slots from every
scenario; a row left with no action is dropped and a scenario left with no rows is deleted. Changing an action changes
the scenarios that use it. A scenario can't start another scenario.

## Not built yet

Wiring guide, inserting a slot in the middle of a row or moving one, sequences longer than one 512-byte message
(chunked upload), saving, BLE and sending the
config to the ESP32 (`PRODUCT.md` §4, §6, §9; `PROTOCOL.md`). For Play: free placement of buttons, colours, a lock gesture to leave Play (`PRODUCT.md` A8). Device groups (one name over several outputs) and
numbering of outputs across chained lighting boards (the firmware counts 0–31) are also open.
