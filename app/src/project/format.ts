/**
 * The saved form of a project: a versioned envelope around the project JSON. A change to the Project type that
 * old files can't satisfy bumps SCHEMA_VERSION and adds a step to `upgrade`.
 */
import { BOARDS, CONTROLLER_ID } from '@/catalog/boards';

import { pruneActions } from './actions';
import { pruneUnmet } from './placement';
import type { Project } from './types';

export const SCHEMA_VERSION = 1;

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
  const known = new Set(BOARDS.map((b) => b.id));
  // A board the catalog no longer has can't be drawn; drop it together with what depended on it.
  const boards = pruneUnmet((p.boards as Project['boards']).filter((b) => known.has(b?.boardId)));
  if (!boards.some((b) => b.boardId === CONTROLLER_ID)) return null;
  const alive = new Set(boards.map((b) => b.uid));
  const devices = (p.devices as Project['devices']).filter((d) => alive.has(d?.boardUid));
  return {
    id: p.id,
    name: p.name,
    createdAt: p.createdAt,
    controller: isController(p.controller) ? p.controller : undefined,
    boards,
    devices,
    actions: pruneActions(p.actions as Project['actions'], devices),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isController(value: unknown): value is NonNullable<Project['controller']> {
  return isRecord(value) && typeof value.bleId === 'string' && typeof value.name === 'string';
}
