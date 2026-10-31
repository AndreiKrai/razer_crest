import { MemoryStorage } from './MemoryStorage';
import type { ProjectStorage } from './storage';

// No file system on the web: projects stay in memory.
export function createStorage(): ProjectStorage {
  return new MemoryStorage();
}
