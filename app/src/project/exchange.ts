/** Sharing a project as a file and reading one back. Phone only: the web build has no file system. */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { parse, serialize } from './format';
import type { Project } from './types';

// A project file is a few kilobytes; anything much bigger isn't one.
const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

export type ImportResult =
  | { status: 'ok'; project: Project }
  | { status: 'canceled' }
  | { status: 'invalid' };

function fileName(name: string): string {
  const slug = name.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  return (slug || 'project') + '.json';
}

/** Opens the system share sheet with the project as a JSON file. The bound model and the cover are not included. */
export async function shareProject(project: Project): Promise<void> {
  const text = serialize({ ...project, controller: undefined });
  const file = new File(Paths.cache, fileName(project.name));
  if (file.exists) file.delete();
  file.create();
  await file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' });
}

/** Lets the user pick a project file. The content is checked; the caller gives it a new id. */
export async function pickProject(): Promise<ImportResult> {
  // Any file type is offered: messengers often hand JSON over as plain "octet-stream". The content decides.
  const picked = await File.pickFileAsync({ mimeTypes: '*/*' });
  if (picked.canceled) return { status: 'canceled' };
  try {
    if ((picked.result.size ?? 0) > MAX_IMPORT_BYTES) return { status: 'invalid' };
    const stored = parse(await picked.result.text());
    return stored ? { status: 'ok', project: stored.project } : { status: 'invalid' };
  } catch {
    return { status: 'invalid' };
  }
}
