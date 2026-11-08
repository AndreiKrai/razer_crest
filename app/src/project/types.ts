import type { PortKind } from '@/catalog/boards';
import type { ChaseDirection, CommandId } from '@/catalog/commands';

/** A named thing the user attached to one output of a board, e.g. a lamp called "Door" or a motor called "Engine". */
export type Device = {
  id: string;
  boardUid: string;
  // Output index on the board, counted from 0 (the screen shows it from 1).
  port: number;
  kind: PortKind;
  name: string;
  // Where the device sits in the model ("Cabin", "Engine"); absent = ungrouped.
  group?: string;
};

export type PlacedBoard = {
  uid: string;
  boardId: string;
  // Absent only for the controller, which is the root of the tree.
  parentUid?: string;
  hostConnectorId?: string;
  // Values for the board's catalog options; missing ones use the option default.
  options?: Record<string, number>;
};

// brightness and speed are percents and frequency is in Hz (catalog/commands.ts); absent = the command's default.
// duration is in seconds: the light goes off or the motor stops after it; absent = endless (until the next command).
export type ActionStep = {
  deviceId: string;
  command: CommandId;
  brightness?: number;
  frequency?: number;
  speed?: number;
  duration?: number;
};

/** One cell of a sequence row: wait, or give the row's module a command that stays until the next one. */
export type Slot = { type: 'pause'; seconds: number } | ({ type: 'command' } & Omit<ActionStep, 'deviceId'>);

/** The timeline of one module; the slots run from left to right. */
export type SequenceRow = { deviceId: string; slots: Slot[] };

// A running light: the head is `brightness` (percent), `tail` lights fade out behind it, and it moves on every `step`
// seconds. duration is in seconds (absent = endless), as for commands.
export type ChaseParams = {
  brightness?: number;
  step: number;
  direction: ChaseDirection;
  tail: number;
  duration?: number;
};

/** A chase over several lights; `deviceIds` is the running order. */
export type ChaseStep = ChaseParams & { deviceIds: string[] };

/** One cell of a group row: wait, run a chase over the row's lights, or turn them all off. */
export type GroupSlot = { type: 'pause'; seconds: number } | { type: 'off' } | ({ type: 'chase' } & ChaseParams);

/** The timeline of a group of lights; `deviceIds` is the running order of the chase. */
export type GroupRow = { deviceIds: string[]; slots: GroupSlot[] };

/** A line of the timeline: one module's row or a group's row, in the order the user arranged them. */
export type TimelineRow = SequenceRow | GroupRow;

type ActionBase = {
  id: string;
  name: string;
  // Running it first stops every output it doesn't use; absent = it only touches its own modules.
  exclusive?: boolean;
};

/** A named set of commands, one per module, that run together. */
export type SimpleAction = ActionBase & { mode?: 'action'; steps: ActionStep[]; chases?: ChaseStep[] };

/** Rows start together and run in parallel; the sequence ends when the longest row does, or starts again if it loops. */
export type SequenceAction = ActionBase & { mode: 'sequence'; rows: TimelineRow[]; loop?: boolean };

export type Action = SimpleAction | SequenceAction;

/** The ESP32 a project is bound to, remembered after the first successful connection. Specific to this phone. */
export type Controller = { bleId: string; name: string };

export const MAX_PROJECT_NAME_LENGTH = 40;

export type Project = {
  id: string;
  name: string;
  imageUri?: string;
  controller?: Controller;
  boards: PlacedBoard[];
  devices: Device[];
  actions: Action[];
  createdAt: number;
};
