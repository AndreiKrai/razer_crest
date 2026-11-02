/** Where a device sits on the controller, in the numbers the firmware knows. Pure functions. */
import { getBoard, portCount } from '@/catalog/boards';
import { MOTOR_SOCKET_PINS } from '@/catalog/gpio';
import type { TestTarget, WireStep } from '@/ble/protocol';

import type { Action, Device, PlacedBoard } from './types';

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

/** The steps of an action as the model wants them, or null if a step's device or board can't be located. */
export function actionSteps(boards: PlacedBoard[], devices: Device[], action: Action): WireStep[] | null {
  const steps: WireStep[] = [];
  for (const step of action.steps) {
    const device = devices.find((d) => d.id === step.deviceId);
    const target = device && testTarget(boards, device);
    if (!target) return null;
    steps.push([target.k, target.i, step.command]);
  }
  return steps;
}
