import type { Project } from './types';

/** Where projects live between launches: files on a phone, memory on the web. Picked by createStorage. */
export interface ProjectStorage {
  // Every readable project, newest first. Unreadable ones are skipped.
  list(): Promise<Project[]>;
  save(project: Project): Promise<void>;
  remove(projectId: string): Promise<void>;
  // Copies an image (a picked photo, or another project's cover) into the project's own storage and returns the
  // URI to keep, or undefined if it couldn't be copied.
  importCover(projectId: string, sourceUri: string): string | undefined;
}
