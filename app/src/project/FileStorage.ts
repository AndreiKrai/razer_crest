import { Directory, File, Paths } from 'expo-file-system';

import { parse, serialize } from './format';
import type { ProjectStorage } from './storage';
import type { Project } from './types';

const FILE_NAME = 'project.json';

// <documents>/projects/<id>/project.json plus the cover image next to it.
const projectDir = (id: string) => new Directory(Paths.document, 'projects', id);

function inside(dir: Directory, uri: string): boolean {
  return uri.startsWith(dir.uri.endsWith('/') ? dir.uri : dir.uri + '/');
}

function ensure(dir: Directory) {
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
}

const COVER_PREFIX = 'cover-';

// The time a cover was copied in, from its name (see importCover); NaN for anything else.
const coverTime = (name: string) =>
  name.startsWith(COVER_PREFIX) ? parseInt(name.slice(COVER_PREFIX.length).split('.')[0], 36) : NaN;

// A replaced cover stays on disk until the project is saved with the new one. Only older covers go: a newer one
// may have been copied in while this (earlier) save was still queued.
function removeOlderCovers(dir: Directory, kept: string) {
  const keptTime = coverTime(kept);
  if (Number.isNaN(keptTime)) return;
  for (const entry of dir.list()) {
    if (entry instanceof File && entry.name !== kept && coverTime(entry.name) < keptTime) {
      try {
        entry.delete();
      } catch (error) {
        console.warn('Could not remove an old cover', entry.name, error);
      }
    }
  }
}

export class FileStorage implements ProjectStorage {
  async list() {
    const root = new Directory(Paths.document, 'projects');
    if (!root.exists) return [];
    const projects: Project[] = [];
    for (const entry of root.list()) {
      if (!(entry instanceof Directory)) continue;
      try {
        const file = new File(entry, FILE_NAME);
        if (!file.exists) continue;
        const stored = parse(await file.text());
        // The folder name is the id: a mismatch means the file was moved or edited by hand.
        if (!stored || stored.project.id !== entry.name) continue;
        const imageUri = stored.cover ? new File(entry, stored.cover) : undefined;
        projects.push({ ...stored.project, imageUri: imageUri?.exists ? imageUri.uri : undefined });
      } catch (error) {
        console.warn('Skipping unreadable project folder', entry.name, error);
      }
    }
    return projects.sort((a, b) => b.createdAt - a.createdAt);
  }

  async save(project: Project) {
    const dir = projectDir(project.id);
    ensure(dir);
    const cover = project.imageUri && inside(dir, project.imageUri) ? new File(project.imageUri).name : undefined;
    const file = new File(dir, FILE_NAME);
    if (!file.exists) file.create();
    await file.write(serialize(project, cover));
    if (cover) removeOlderCovers(dir, cover);
  }

  async remove(projectId: string) {
    const dir = projectDir(projectId);
    if (dir.exists) dir.delete();
  }

  importCover(projectId: string, sourceUri: string) {
    try {
      const dir = projectDir(projectId);
      ensure(dir);
      const extension = new File(sourceUri).extension || '.jpg';
      const target = new File(dir, COVER_PREFIX + Date.now().toString(36) + extension);
      new File(sourceUri).copySync(target);
      return target.uri;
    } catch (error) {
      console.warn('Could not copy the cover image', error);
      return undefined;
    }
  }
}
