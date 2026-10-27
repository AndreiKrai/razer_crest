/** Does the controller have enough GPIO for the boards in a project? Recalculated on every change. */
import { getBoard, optionValue } from '@/catalog/boards';
import { MOTOR_SOCKET_PINS, PINS_PER_DRIVER } from '@/catalog/gpio';

import type { PlacedBoard } from './types';

export function fitsBudget(boards: PlacedBoard[]): boolean {
  return boards.every((placed) => {
    const def = getBoard(placed.boardId);
    if (def.pinGroup !== 'tb6612') return true;
    const socketPins = MOTOR_SOCKET_PINS[placed.hostConnectorId ?? ''] ?? [];
    return optionValue(def, placed.options, 'drivers') * PINS_PER_DRIVER <= socketPins.length;
  });
}

export function fitsWithOption(boards: PlacedBoard[], uid: string, optionId: string, value: number): boolean {
  return fitsBudget(
    boards.map((b) => (b.uid === uid ? { ...b, options: { ...b.options, [optionId]: value } } : b)),
  );
}
