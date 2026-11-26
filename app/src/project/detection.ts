import { boardForType, detectedType, getBoard } from '@/catalog/boards';
import type { BoardReport } from '@/ble/protocol';

import { subtreeUids } from './placement';
import type { Project } from './types';

// Boards plugged straight into the controller, with the type their socket's ID line must report.
function sockets(project: Project) {
  const root = project.boards.find((b) => !b.parentUid);
  return project.boards.filter((b) => root && b.parentUid === root.uid && b.hostConnectorId);
}

/**
 * Placed boards that the model doesn't see. Only boards with an ID resistor can be judged (catalog `detectType`);
 * a board hanging off a missing one (a chained second lighting board) is missing too.
 */
export function absentBoards(project: Project, report: BoardReport | null): Set<string> {
  const absent = new Set<string>();
  if (!report) return absent;
  for (const placed of sockets(project)) {
    const expected = detectedType(getBoard(placed.boardId), placed.options);
    const found = report[placed.hostConnectorId as string];
    if (expected && found !== undefined && found !== expected) absent.add(placed.uid);
  }
  let grew = true;
  while (grew) {
    grew = false;
    for (const placed of project.boards) {
      if (placed.parentUid && absent.has(placed.parentUid) && !absent.has(placed.uid)) {
        absent.add(placed.uid);
        grew = true;
      }
    }
  }
  return absent;
}

export type Unplaced = { boardId: string; connector: string; options?: Record<string, number> };

/** Boards the model sees on a controller socket that has no board in the project, with the socket and options. */
export function unplacedBoards(project: Project, report: BoardReport | null): Unplaced[] {
  if (!report) return [];
  const taken = new Set(sockets(project).map((b) => b.hostConnectorId));
  const found: Unplaced[] = [];
  for (const [connector, type] of Object.entries(report)) {
    const match = taken.has(connector) ? undefined : boardForType(type);
    if (match) found.push({ boardId: match.def.id, connector, options: match.options });
  }
  return found;
}

/** Does the model currently see this board, or one plugged into it? Removing it would only get it added again. */
export function isSeen(project: Project, uid: string, report: BoardReport | null): boolean {
  if (!report) return false;
  const tree = subtreeUids(project.boards, uid);
  return sockets(project).some(
    (b) => tree.has(b.uid) && detectedType(getBoard(b.boardId), b.options) === report[b.hostConnectorId as string],
  );
}
