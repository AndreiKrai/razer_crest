/** Which socket a new board plugs into, and why it can't when it can't. */
import { BOARDS, getBoard, plugOf, type BoardDef, type CableId } from '@/catalog/boards';

import { fitsBudget } from './budget';
import type { PlacedBoard, Project } from './types';

export type Placement =
  | { ok: true; parentUid: string; hostConnectorId: string }
  | { ok: false; reason: 'comingSoon' }
  | { ok: false; reason: 'taken'; cable: CableId }
  | { ok: false; reason: 'limit'; max: number }
  | { ok: false; reason: 'noPins' }
  | { ok: false; reason: 'requires'; board: BoardDef }
  // `needs` is the catalog board that provides the missing socket.
  | { ok: false; reason: 'needs'; needs: BoardDef };

export function findPlacement(project: Project, board: BoardDef): Placement {
  const plug = plugOf(board);
  if (board.comingSoon || !plug) return { ok: false, reason: 'comingSoon' };
  if (board.requires && !project.boards.some((b) => b.boardId === board.requires)) {
    return { ok: false, reason: 'requires', board: getBoard(board.requires) };
  }

  let sawHost = false;
  for (const placed of project.boards) {
    for (const conn of getBoard(placed.boardId).connectors) {
      if (conn.role !== 'host' || conn.cable !== plug.cable) continue;
      sawHost = true;
      const occupied = project.boards.some(
        (b) => b.parentUid === placed.uid && b.hostConnectorId === conn.id,
      );
      if (occupied) continue;
      if (board.maxCount && project.boards.filter((b) => b.boardId === board.id).length >= board.maxCount) {
        return { ok: false, reason: 'limit', max: board.maxCount };
      }
      if (!fitsBudget([...project.boards, { uid: '', boardId: board.id, hostConnectorId: conn.id }])) {
        return { ok: false, reason: 'noPins' };
      }
      return { ok: true, parentUid: placed.uid, hostConnectorId: conn.id };
    }
  }
  if (sawHost) return { ok: false, reason: 'taken', cable: plug.cable };

  const provider = BOARDS.find((b) =>
    b.connectors.some((c) => c.role === 'host' && c.cable === plug.cable),
  );
  return provider ? { ok: false, reason: 'needs', needs: provider } : { ok: false, reason: 'comingSoon' };
}

/** The board and everything plugged into it, directly or further down. */
export function subtreeUids(boards: PlacedBoard[], rootUid: string): Set<string> {
  const uids = new Set([rootUid]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const b of boards) {
      if (b.parentUid && uids.has(b.parentUid) && !uids.has(b.uid)) {
        uids.add(b.uid);
        grew = true;
      }
    }
  }
  return uids;
}

/** Drops boards whose required board is gone (e.g. motor boards after the power board was removed), with their subtree. */
export function pruneUnmet(boards: PlacedBoard[]): PlacedBoard[] {
  let result = boards;
  for (;;) {
    const lost = result.find((b) => {
      const need = getBoard(b.boardId).requires;
      return need && !result.some((o) => o.boardId === need);
    });
    if (!lost) return result;
    const removed = subtreeUids(result, lost.uid);
    result = result.filter((b) => !removed.has(b.uid));
  }
}
