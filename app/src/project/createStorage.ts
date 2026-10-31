import { FileStorage } from './FileStorage';
import type { ProjectStorage } from './storage';

export function createStorage(): ProjectStorage {
  return new FileStorage();
}
