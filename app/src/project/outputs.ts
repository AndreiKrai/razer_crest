/** Where a device sits on the controller, in the numbers the firmware knows. Pure functions. */
import { getBoard, portCount } from '@/catalog/boards';
import { MOTOR_SOCKET_PINS } from '@/catalog/gpio';
import type { TestTarget } from '@/ble/protocol';

import type { Device, PlacedBoard } from './types';

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
