import type { Project } from './types';

/** The images a project keeps in its own storage: the list's cover and the Play screen's background. */
export type ImageKind = 'cover' | 'background';

/** Where projects live between launches: files on a phone, memory on the web. Picked by createStorage. */
export interface ProjectStorage {
  // Every readable project, newest first. Unreadable ones are skipped.
  list(): Promise<Project[]>;
  save(project: Project): Promise<void>;
  remove(projectId: string): Promise<void>;
  // Copies an image (a picked photo, or another project's cover or background) into the project's own storage and
  // returns the URI to keep, or undefined if it couldn't be copied.
  importImage(projectId: string, sourceUri: string, kind: ImageKind): string | undefined;
}
