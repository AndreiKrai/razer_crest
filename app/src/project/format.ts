/**
 * The saved form of a project: a versioned envelope around the project JSON. A change to the Project type that
 * old files can't satisfy bumps SCHEMA_VERSION and adds a step to `upgrade`.
 */
import { BOARDS, CONTROLLER_ID, getBoard, plugOf } from '@/catalog/boards';
import type { CommandId } from '@/catalog/commands';

import { cleanSteps, MAX_ACTION_NAME_LENGTH } from './actions';
import { attachProblem, cleanGroup, MAX_NAME_LENGTH } from './devices';
import { pruneUnmet } from './placement';
import type { Action, Device, PlacedBoard, Project } from './types';

export const SCHEMA_VERSION = 1;
export const MAX_PROJECT_NAME_LENGTH = 40;

export type StoredProject = {
  project: Project;
  // File name of the cover image inside the project's folder.
  cover?: string;
};

export function serialize(project: Project, cover?: string): string {
  const { imageUri: _imageUri, ...rest } = project;
  return JSON.stringify({ schemaVersion: SCHEMA_VERSION, project: rest, cover });
}

/** Returns null for anything that isn't a readable project of a known version. */
export function parse(text: string): StoredProject | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(raw) || typeof raw.schemaVersion !== 'number' || raw.schemaVersion > SCHEMA_VERSION) return null;
  const upgraded = upgrade(raw);
  if (!isRecord(upgraded.project)) return null;
  const project = sanitize(upgraded.project);
  if (!project) return null;
  return { project, cover: typeof upgraded.cover === 'string' ? upgraded.cover : undefined };
}

// Files of older versions are brought to the current shape here, one version at a time.
function upgrade(raw: Record<string, unknown>): Record<string, unknown> {
  return raw;
}

function sanitize(p: Record<string, unknown>): Project | null {
  if (typeof p.id !== 'string' || typeof p.name !== 'string' || typeof p.createdAt !== 'number') return null;
  if (!Array.isArray(p.boards) || !Array.isArray(p.devices) || !Array.isArray(p.actions)) return null;
  const boards = cleanBoards(p.boards);
  if (!boards) return null;
  const devices = cleanDevices(p.devices, boards);
  return {
    id: p.id,
    name: p.name.trim().slice(0, MAX_PROJECT_NAME_LENGTH) || p.id,
    createdAt: p.createdAt,
    controller: isController(p.controller) ? { bleId: p.controller.bleId, name: p.controller.name } : undefined,
    boards,
    devices,
    actions: cleanActions(p.actions, devices),
  };
}

// Files may come from another phone or be edited by hand, so every field is checked, not just the shape.
function cleanBoards(raw: unknown[]): PlacedBoard[] | null {
  const candidates: PlacedBoard[] = [];
  for (const b of raw) {
    if (!isRecord(b) || typeof b.uid !== 'string' || typeof b.boardId !== 'string') continue;
    // A board the catalog no longer has can't be drawn.
    const def = BOARDS.find((d) => d.id === b.boardId);
    if (!def || candidates.some((c) => c.uid === b.uid)) continue;
    const options: Record<string, number> = {};
    if (isRecord(b.options)) {
      for (const option of def.options ?? []) {
        const value = b.options[option.id];
        if (typeof value === 'number' && option.values.includes(value)) options[option.id] = value;
      }
    }
    candidates.push({
      uid: b.uid,
      boardId: b.boardId,
      parentUid: typeof b.parentUid === 'string' ? b.parentUid : undefined,
      hostConnectorId: typeof b.hostConnectorId === 'string' ? b.hostConnectorId : undefined,
      options: Object.keys(options).length > 0 ? options : undefined,
    });
  }

  const root = candidates.find((b) => b.boardId === CONTROLLER_ID && !b.parentUid);
  if (!root) return null;
  // Keep only boards that really hang off a free host socket of a board that is kept, starting from the controller.
  const kept: PlacedBoard[] = [root];
  for (let grew = true; grew; ) {
    grew = false;
    for (const b of candidates) {
      const parent = kept.find((k) => k.uid === b.parentUid);
      const host = parent && getBoard(parent.boardId).connectors.find((c) => c.id === b.hostConnectorId && c.role === 'host');
      const socketOk =
        parent &&
        host &&
        plugOf(getBoard(b.boardId))?.cable === host.cable &&
        !kept.some((k) => k.parentUid === parent.uid && k.hostConnectorId === b.hostConnectorId);
      if (socketOk && !kept.includes(b)) {
        kept.push(b);
        grew = true;
      }
    }
  }
  return pruneUnmet(kept);
}

function cleanDevices(raw: unknown[], boards: PlacedBoard[]): Device[] {
  const devices: Device[] = [];
  for (const d of raw) {
    if (!isRecord(d) || typeof d.id !== 'string' || typeof d.boardUid !== 'string') continue;
    const board = boards.find((b) => b.uid === d.boardUid);
    const kind = board ? getBoard(board.boardId).ports?.kind : undefined;
    if (!board || !kind || d.kind !== kind || typeof d.name !== 'string' || !d.name.trim()) continue;
    if (typeof d.port !== 'number' || attachProblem(board, devices, d.port, d.name)) continue;
    if (devices.some((o) => o.id === d.id)) continue;
    devices.push({
      id: d.id,
      boardUid: board.uid,
      port: d.port,
      kind,
      name: d.name.trim().slice(0, MAX_NAME_LENGTH),
      group: typeof d.group === 'string' ? cleanGroup(d.group) : undefined,
    });
  }
  return devices;
}

function cleanActions(raw: unknown[], devices: Device[]): Action[] {
  const actions: Action[] = [];
  for (const a of raw) {
    if (!isRecord(a) || typeof a.id !== 'string' || typeof a.name !== 'string' || !Array.isArray(a.steps)) continue;
    if (!a.name.trim() || actions.some((o) => o.id === a.id)) continue;
    const steps = cleanSteps(
      a.steps.filter(isRecord).map((s) => ({ deviceId: String(s.deviceId), command: s.command as CommandId })),
      devices,
    );
    if (steps.length > 0) {
      actions.push({
        id: a.id,
        name: a.name.trim().slice(0, MAX_ACTION_NAME_LENGTH),
        steps,
        ...(a.exclusive === true && { exclusive: true }),
      });
    }
  }
  return actions;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isController(value: unknown): value is NonNullable<Project['controller']> {
  return isRecord(value) && typeof value.bleId === 'string' && typeof value.name === 'string';
}
