/**
 * Schematic geometry: places every board next to the socket it plugs into and routes one wire per pin.
 * Pure functions, no React, so the layout rules stay testable and separate from drawing.
 */
import {
  CABLES,
  chipCount,
  getBoard,
  optionValue,
  type BoardDef,
  type Connector,
  type PinKind,
  type Side,
} from '@/catalog/boards';
import type { PlacedBoard, Project } from '@/project/types';

export const PIN_PITCH = 14;
// Room between two boards for the wires to be visible.
const WIRE_GAP = 90;

export type Point = { x: number; y: number };

export type LaidConnector = {
  conn: Connector;
  pins: Point[];
  center: Point;
  occupied: boolean;
  // Pins with a wire landing on them; a socket can be occupied yet leave some pins unused.
  pinUsed: boolean[];
};

export type LaidBoard = {
  placed: PlacedBoard;
  def: BoardDef;
  x: number;
  y: number;
  chips: number;
  deviceCount: number;
  connectors: LaidConnector[];
};

export type Wire = {
  key: string;
  from: Point;
  to: Point;
  side: Side;
  kind: PinKind;
  signalIndex: number;
};

export type Layout = {
  boards: LaidBoard[];
  wires: Wire[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
};

const DIRECTION: Record<Side, Point> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
};

/** Pin positions relative to the board's top-left corner, centred along the connector's edge. */
function pinOffsets(def: BoardDef, conn: Connector): Point[] {
  const count = CABLES[conn.cable].pins.length;
  const pins: Point[] = [];
  for (let i = 0; i < count; i++) {
    const along = (i - (count - 1) / 2) * PIN_PITCH;
    if (conn.side === 'left') pins.push({ x: 0, y: def.height / 2 + along });
    else if (conn.side === 'right') pins.push({ x: def.width, y: def.height / 2 + along });
    else if (conn.side === 'top') pins.push({ x: def.width / 2 + along, y: 0 });
    else pins.push({ x: def.width / 2 + along, y: def.height });
  }
  return pins;
}

function midpoint(points: Point[]): Point {
  const first = points[0];
  const last = points[points.length - 1];
  return { x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 };
}

const SIDES: Side[] = ['top', 'right', 'bottom', 'left'];

/** Quarter turns clockwise. A board hangs off the side of its parent that faces its plug, whichever socket it uses. */
function rotateSide(side: Side, turns: number): Side {
  return SIDES[(SIDES.indexOf(side) + turns) % 4];
}

export function layoutProject(project: Project): Layout {
  const laid = new Map<string, LaidBoard>();
  const wires: Wire[] = [];

  const place = (placed: PlacedBoard, x: number, y: number, turns = 0) => {
    const def = getBoard(placed.boardId);
    const connectors = def.connectors.map((original) => {
      const conn = turns ? { ...original, side: rotateSide(original.side, turns) } : original;
      const pins = pinOffsets(def, conn).map((p) => ({ x: p.x + x, y: p.y + y }));
      const occupied =
        conn.role === 'plug'
          ? true
          : project.boards.some((b) => b.parentUid === placed.uid && b.hostConnectorId === conn.id);
      return { conn, pins, center: midpoint(pins), occupied, pinUsed: pins.map(() => false) };
    });
    const deviceCount = project.devices.filter((d) => d.boardUid === placed.uid).length;
    const board = { placed, def, x, y, chips: chipCount(def, placed.options), deviceCount, connectors };
    laid.set(placed.uid, board);
    return board;
  };

  const root = project.boards.find((b) => !b.parentUid);
  if (root) place(root, 0, 0);

  // Breadth-first so a parent is always laid out before its children.
  const queue = root ? [root.uid] : [];
  while (queue.length) {
    const parent = laid.get(queue.shift() as string) as LaidBoard;
    for (const child of project.boards.filter((b) => b.parentUid === parent.placed.uid)) {
      const host = parent.connectors.find((c) => c.conn.id === child.hostConnectorId);
      const def = getBoard(child.boardId);
      const plug = def.connectors.find((c) => c.role === 'plug');
      if (!host || !plug) continue;

      const dir = DIRECTION[host.conn.side];
      const turns = (SIDES.indexOf(rotateSide(host.conn.side, 2)) - SIDES.indexOf(plug.side) + 4) % 4;
      const turnedPlug = { ...plug, side: rotateSide(plug.side, turns) };
      const plugCenter = midpoint(pinOffsets(def, turnedPlug));
      const x = host.center.x + dir.x * WIRE_GAP - plugCenter.x;
      const y = host.center.y + dir.y * WIRE_GAP - plugCenter.y;
      const board = place(child, x, y, turns);
      const childPlug = board.connectors.find((c) => c.conn.id === plug.id) as LaidConnector;

      let signalIndex = 0;
      CABLES[host.conn.cable].pins.forEach(({ kind, needs, onlyFor }, i) => {
        if (needs && optionValue(def, child.options, needs.option) < needs.min) return;
        if (onlyFor && !onlyFor.includes(child.boardId)) return;
        host.pinUsed[i] = true;
        childPlug.pinUsed[i] = true;
        wires.push({
          key: child.uid + ':' + i,
          from: host.pins[i],
          to: childPlug.pins[i],
          side: host.conn.side,
          kind,
          signalIndex: kind === 'signal' ? signalIndex++ : 0,
        });
      });
      queue.push(child.uid);
    }
  }

  const boards = [...laid.values()];
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const b of boards) {
    bounds.minX = Math.min(bounds.minX, b.x);
    bounds.minY = Math.min(bounds.minY, b.y);
    bounds.maxX = Math.max(bounds.maxX, b.x + b.def.width);
    bounds.maxY = Math.max(bounds.maxY, b.y + b.def.height);
  }
  return { boards, wires, bounds };
}

/** A gentle S-curve that leaves and enters each connector at a right angle. */
export function wirePath(wire: Wire): string {
  const dir = DIRECTION[wire.side];
  const reach = WIRE_GAP * 0.45;
  const c1 = { x: wire.from.x + dir.x * reach, y: wire.from.y + dir.y * reach };
  const c2 = { x: wire.to.x - dir.x * reach, y: wire.to.y - dir.y * reach };
  return `M${wire.from.x},${wire.from.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${wire.to.x},${wire.to.y}`;
}
