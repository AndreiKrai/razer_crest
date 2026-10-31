import type { ProjectStorage } from './storage';

/** Keeps nothing: the web build and tests, where there is no file system. */
export class MemoryStorage implements ProjectStorage {
  async list() {
    return [];
  }

  async save() {}

  async remove() {}

  importCover(_projectId: string, sourceUri: string) {
    return sourceUri;
  }
}
