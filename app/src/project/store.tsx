/**
 * Projects live in memory for now: the concept stage doesn't persist anything, so a reload starts empty.
 */
import { createContext, useContext, useState, type ReactNode } from 'react';

import { CONTROLLER_ID, getBoard } from '@/catalog/boards';

import { findPlacement, subtreeUids } from './placement';
import type { Project } from './types';

type ProjectsApi = {
  projects: Project[];
  createProject: (name: string, imageUri?: string) => string;
  // Returns the new board's uid, or null if there's no free socket for it.
  addBoard: (projectId: string, boardId: string) => string | null;
  setBoardOption: (projectId: string, uid: string, optionId: string, value: number) => void;
  removeBoard: (projectId: string, uid: string) => void;
};

const ProjectsContext = createContext<ProjectsApi | null>(null);

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);

  const updateProject = (projectId: string, change: (p: Project) => Project) =>
    setProjects((all) => all.map((p) => (p.id === projectId ? change(p) : p)));

  const api: ProjectsApi = {
    projects,
    createProject(name, imageUri) {
      const id = newId();
      const project: Project = {
        id,
        name,
        imageUri,
        boards: [{ uid: newId(), boardId: CONTROLLER_ID }],
        createdAt: Date.now(),
      };
      setProjects((all) => [project, ...all]);
      return id;
    },
    addBoard(projectId, boardId) {
      const project = projects.find((p) => p.id === projectId);
      const placement = project ? findPlacement(project, getBoard(boardId)) : null;
      if (!placement?.ok) return null;
      const board = { uid: newId(), boardId, parentUid: placement.parentUid, hostConnectorId: placement.hostConnectorId };
      updateProject(projectId, (p) => ({ ...p, boards: [...p.boards, board] }));
      return board.uid;
    },
    setBoardOption(projectId, uid, optionId, value) {
      updateProject(projectId, (p) => ({
        ...p,
        boards: p.boards.map((b) => (b.uid === uid ? { ...b, options: { ...b.options, [optionId]: value } } : b)),
      }));
    },
    removeBoard(projectId, uid) {
      updateProject(projectId, (p) => {
        const target = p.boards.find((b) => b.uid === uid);
        if (!target || target.boardId === CONTROLLER_ID) return p;
        const removed = subtreeUids(p.boards, uid);
        return { ...p, boards: p.boards.filter((b) => !removed.has(b.uid)) };
      });
    },
  };

  return <ProjectsContext.Provider value={api}>{children}</ProjectsContext.Provider>;
}

export function useProjects(): ProjectsApi {
  const api = useContext(ProjectsContext);
  if (!api) throw new Error('useProjects must be used inside ProjectsProvider');
  return api;
}

export function useProject(id: string | undefined): Project | undefined {
  return useProjects().projects.find((p) => p.id === id);
}
