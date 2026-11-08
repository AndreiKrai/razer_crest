/** Where a device sits on the controller, in the numbers the firmware knows. Pure functions. */
import { getBoard, portCount } from '@/catalog/boards';
import type { ChaseDirection } from '@/catalog/commands';
import { MOTOR_SOCKET_PINS } from '@/catalog/gpio';
import type { TestTarget, WireChase, WireChaseSlot, WireRow, WireSlot, WireStep } from '@/ble/protocol';

import type { ActionStep, ChaseParams, Device, PlacedBoard, SequenceAction, SimpleAction } from './types';
import { isGroupRow } from './actions';

/** What to send so the model tests this device, or null when the board isn't wired to the controller. */
export function testTarget(boards: PlacedBoard[], device: Device): TestTarget | null {
  const board = boards.find((b) => b.uid === device.boardUid);
  if (!board) return null;
  const def = getBoard(board.boardId);

  if (def.pinGroup === 'tlc') {
    // Lighting boards chain: the one nearest the controller owns the first outputs (firmware/hw.py).
    let before = 0;
    let parent = boards.find((b) => b.uid === board.parentUid);
    while (parent) {
      if (parent.boardId === board.boardId) before += portCount(def, parent.options);
      const next: string | undefined = parent.parentUid;
      parent = boards.find((b) => b.uid === next);
    }
    return { k: 'light', i: before + device.port };
  }

  if (def.pinGroup === 'tb6612') {
    // Two pins per motor, sockets numbered in catalog order.
    const sockets = Object.keys(MOTOR_SOCKET_PINS);
    const at = sockets.indexOf(board.hostConnectorId ?? '');
    if (at === -1) return null;
    const earlier = sockets.slice(0, at).reduce((sum, s) => sum + MOTOR_SOCKET_PINS[s].length / 2, 0);
    return { k: 'motor', i: earlier + device.port };
  }

  return null;
}

/** A command's tail as the model wants it: a light's brightness and frequency or a motor's speed, then the duration in ms. */
function wireParams(kind: TestTarget['k'], step: Omit<ActionStep, 'deviceId'>): (number | null)[] {
  const params = kind === 'motor' ? [step.speed ?? null, null] : [step.brightness ?? null, step.frequency ?? null];
  params.push(step.duration !== undefined ? Math.round(step.duration * 1000) : null);
  while (params.length > 0 && params[params.length - 1] === null) params.pop();
  return params;
}

/** The light indices of a chase group in running order, or null if a module isn't a light the model can locate. */
function lightIndices(boards: PlacedBoard[], devices: Device[], ids: string[]): number[] | null {
  const indices: number[] = [];
  for (const id of ids) {
    const device = devices.find((d) => d.id === id);
    const target = device && testTarget(boards, device);
    if (!target || target.k !== 'light') return null;
    indices.push(target.i);
  }
  return indices;
}

/** A chase's values as the model wants them: brightness, step in ms, direction, tail, then the duration in ms if any. */
function chaseValues(chase: ChaseParams): [number | null, number, ChaseDirection, number, ...number[]] {
  const values: [number | null, number, ChaseDirection, number, ...number[]] = [
    chase.brightness ?? null,
    Math.round(chase.step * 1000),
    chase.direction,
    chase.tail,
  ];
  if (chase.duration !== undefined) values.push(Math.round(chase.duration * 1000));
  return values;
}

/** The steps of an action as the model wants them, or null if a step's device or board can't be located. */
export function actionSteps(boards: PlacedBoard[], devices: Device[], action: SimpleAction): WireStep[] | null {
  const steps: WireStep[] = [];
  for (const step of action.steps) {
    const device = devices.find((d) => d.id === step.deviceId);
    const target = device && testTarget(boards, device);
    if (!target) return null;
    steps.push([target.k, target.i, step.command, ...wireParams(target.k, step)]);
  }
  for (const chase of action.chases ?? []) {
    const indices = lightIndices(boards, devices, chase.deviceIds);
    if (!indices) return null;
    steps.push(['chase', indices, ...chaseValues(chase)] as WireChase);
  }
  return steps;
}

/** The rows of a sequence as the model wants them (pauses in ms), or null if a module can't be located. */
export function sequenceRows(boards: PlacedBoard[], devices: Device[], sequence: SequenceAction): WireRow[] | null {
  const rows: WireRow[] = [];
  for (const row of sequence.rows) {
    if (isGroupRow(row)) {
      const indices = lightIndices(boards, devices, row.deviceIds);
      if (!indices) return null;
      const slots: WireSlot[] = row.slots.map((slot) => {
        if (slot.type === 'pause') return Math.round(slot.seconds * 1000);
        return slot.type === 'chase' ? (['chase', ...chaseValues(slot)] as WireChaseSlot) : ['off'];
      });
      rows.push(['group', indices, slots]);
      continue;
    }
    const device = devices.find((d) => d.id === row.deviceId);
    const target = device && testTarget(boards, device);
    if (!target) return null;
    const slots: WireSlot[] = row.slots.map((slot) =>
      slot.type === 'pause' ? Math.round(slot.seconds * 1000) : [slot.command, ...wireParams(target.k, slot)],
    );
    rows.push([target.k, target.i, slots]);
  }
  return rows;
}
