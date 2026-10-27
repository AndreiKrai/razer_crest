/** Rules for attaching devices to board outputs. Pure functions, used by the store and the UI. */
import { getBoard, portCount } from '@/catalog/boards';

import type { Device, PlacedBoard } from './types';

export const MAX_NAME_LENGTH = 24;

export function deviceAt(devices: Device[], boardUid: string, port: number): Device | undefined {
  return devices.find((d) => d.boardUid === boardUid && d.port === port);
}

/** Why a device can't go on this output, or null if it can. */
export function attachProblem(
  board: PlacedBoard,
  devices: Device[],
  port: number,
  name: string,
): 'noPort' | 'taken' | 'noName' | null {
  const count = portCount(getBoard(board.boardId), board.options);
  if (!Number.isInteger(port) || port < 0 || port >= count) return 'noPort';
  if (deviceAt(devices, board.uid, port)) return 'taken';
  if (!name.trim()) return 'noName';
  return null;
}

/** Would the board still hold all its devices if its options changed? */
export function holdsDevices(board: PlacedBoard, devices: Device[], optionId: string, value: number): boolean {
  const next = { ...board, options: { ...board.options, [optionId]: value } };
  const count = portCount(getBoard(next.boardId), next.options);
  return devices.every((d) => d.boardUid !== board.uid || d.port < count);
}
