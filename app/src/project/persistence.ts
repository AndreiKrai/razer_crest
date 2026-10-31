import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { ProjectStorage } from './storage';
import type { Project } from './types';

const SAVE_DELAY_MS = 400;

/**
 * Project state that survives restarts. Loads everything once (`ready` turns true), then writes back whatever
 * changed: updates are immutable, so a project whose object differs from the saved one is the one to write.
 */
export function usePersistedProjects(storage: ProjectStorage) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [ready, setReady] = useState(false);
  // What is on disk now, by id.
  const saved = useRef(new Map<string, Project>());
  const latest = useRef(projects);
  // Writes and deletes run one after another, so a slow save never overtakes a later one.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    storage
      .list()
      .catch((error) => {
        console.warn('Could not load projects', error);
        return [] as Project[];
      })
      .then((loaded) => {
        if (cancelled) return;
        saved.current = new Map(loaded.map((p) => [p.id, p]));
        setProjects(loaded);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [storage]);

  useEffect(() => {
    if (!ready) return;
    latest.current = projects;
    const timer = setTimeout(() => flush(storage, saved.current, projects, queue), SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [storage, projects, ready]);

  // Don't wait for the delay when the app goes to the background: it may be killed there.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') flush(storage, saved.current, latest.current, queue);
    });
    return () => subscription.remove();
  }, [storage]);

  return { projects, setProjects, ready };
}

function flush(
  storage: ProjectStorage,
  saved: Map<string, Project>,
  current: Project[],
  queue: { current: Promise<unknown> },
) {
  const run = (task: () => Promise<void>, onError: () => void) => {
    queue.current = queue.current.then(task).catch((error) => {
      console.warn('Could not save projects', error);
      onError();
    });
  };

  const ids = new Set(current.map((p) => p.id));
  for (const project of current) {
    if (saved.get(project.id) === project) continue;
    saved.set(project.id, project);
    // A failed save is forgotten, so the next flush tries again.
    run(
      () => storage.save(project),
      () => {
        if (saved.get(project.id) === project) saved.delete(project.id);
      },
    );
  }
  for (const id of [...saved.keys()]) {
    if (ids.has(id)) continue;
    saved.delete(id);
    run(
      () => storage.remove(id),
      () => undefined,
    );
  }
}
