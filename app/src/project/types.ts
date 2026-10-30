import type { PortKind } from '@/catalog/boards';

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

export type Project = {
  id: string;
  name: string;
  imageUri?: string;
  boards: PlacedBoard[];
  devices: Device[];
  createdAt: number;
};
