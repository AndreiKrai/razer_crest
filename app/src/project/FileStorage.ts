import { Directory, File, Paths } from 'expo-file-system';

import { parse, serialize } from './format';
import type { ImageKind, ProjectStorage } from './storage';
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

// Image files are named <kind>-<time copied in, base 36>.<ext>.
const prefix = (kind: ImageKind) => kind + '-';

// The time an image of this kind was copied in, from its name (see importImage); NaN for anything else.
const imageTime = (name: string, kind: ImageKind) =>
  name.startsWith(prefix(kind)) ? parseInt(name.slice(prefix(kind).length).split('.')[0], 36) : NaN;

// A replaced image stays on disk until the project is saved with the new one. Only older images of the kind go: a
// newer one may have been copied in while this (earlier) save was still queued. A removed background stays until
// the next one replaces it, for the same reason.
function removeOlderImages(dir: Directory, kind: ImageKind, kept: string) {
  const keptTime = imageTime(kept, kind);
  if (Number.isNaN(keptTime)) return;
  for (const entry of dir.list()) {
    if (entry instanceof File && entry.name !== kept && imageTime(entry.name, kind) < keptTime) {
      try {
        entry.delete();
      } catch (error) {
        console.warn('Could not remove an old image', entry.name, error);
      }
    }
  }
}

const fileIn = (dir: Directory, uri: string | undefined) => (uri && inside(dir, uri) ? new File(uri).name : undefined);

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
        const image = (name?: string) => {
          const file = name ? new File(entry, name) : undefined;
          return file?.exists ? file.uri : undefined;
        };
        projects.push({ ...stored.project, imageUri: image(stored.cover), backgroundUri: image(stored.background) });
      } catch (error) {
        console.warn('Skipping unreadable project folder', entry.name, error);
      }
    }
    return projects.sort((a, b) => b.createdAt - a.createdAt);
  }

  async save(project: Project) {
    const dir = projectDir(project.id);
    ensure(dir);
    const cover = fileIn(dir, project.imageUri);
    const background = fileIn(dir, project.backgroundUri);
    const file = new File(dir, FILE_NAME);
    if (!file.exists) file.create();
    await file.write(serialize(project, cover, background));
    if (cover) removeOlderImages(dir, 'cover', cover);
    if (background) removeOlderImages(dir, 'background', background);
  }

  async remove(projectId: string) {
    const dir = projectDir(projectId);
    if (dir.exists) dir.delete();
  }

  importImage(projectId: string, sourceUri: string, kind: ImageKind) {
    try {
      const dir = projectDir(projectId);
      ensure(dir);
      const extension = new File(sourceUri).extension || '.jpg';
      const target = new File(dir, prefix(kind) + Date.now().toString(36) + extension);
      new File(sourceUri).copySync(target);
      return target.uri;
    } catch (error) {
      console.warn('Could not copy the image', kind, error);
      return undefined;
    }
  }
}
