import type { PortKind } from '@/catalog/boards';
import type { CommandId } from '@/catalog/commands';

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

export type ActionStep = { deviceId: string; command: CommandId };

/** A named set of commands, one per module, that run together. */
export type Action = {
  id: string;
  name: string;
  steps: ActionStep[];
  // Running it first stops every output it doesn't use; absent = it only touches its own modules.
  exclusive?: boolean;
};

/** The ESP32 a project is bound to, remembered after the first successful connection. Specific to this phone. */
export type Controller = { bleId: string; name: string };

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
