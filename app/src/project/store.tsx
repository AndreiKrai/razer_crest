/**
 * Projects live in React state and are written to the phone through `usePersistedProjects`, so everything the
 * user builds is still there after a restart. Nothing here knows about files.
 */
import { createContext, useContext, useState, type ReactNode } from 'react';

import { CONTROLLER_ID, getBoard } from '@/catalog/boards';
import type { TemplateId } from '@/design/tokens';

import { fitsWithOption } from './budget';
import { createStorage } from './createStorage';
import { attachProblem, cleanGroup, holdsDevices, MAX_NAME_LENGTH } from './devices';
import { usePersistedProjects } from './persistence';
import { findPlacement, pruneUnmet, subtreeUids, type PlaceAt } from './placement';
import type { ProjectContent } from './templates';
import { actionDeviceIds, actionProblem, buildAction, moveItem, pruneActions, type ActionDraft } from './actions';
import { buildButton, buttonProblem, pruneButtons, type ButtonDraft } from './play';
import { buildScenario, pruneScenarios, scenarioProblem, type ScenarioDraft } from './scenarios';
import { MAX_PROJECT_NAME_LENGTH, type Action, type Device, type Project, type Scenario } from './types';

type ProjectsApi = {
  projects: Project[];
  // False until the saved projects are loaded; the list must not be shown (as empty) before that.
  ready: boolean;
  // `content` (a template) replaces the default controller-only start.
  createProject: (name: string, imageUri?: string, content?: ProjectContent) => string;
  // Adds a project read from a file under a new id, unbound and without a cover. Returns the new id.
  importProject: (project: Project) => string;
  // A copy with its own id and cover, not bound to any controller. Returns the new id, or null if the source is gone.
  duplicateProject: (projectId: string, name: string) => string | null;
  removeProject: (projectId: string) => void;
  // Ignored when the name is empty; trimmed and cut to MAX_PROJECT_NAME_LENGTH.
  renameProject: (projectId: string, name: string) => void;
  // Copies a picked image in as the project's new cover.
  setProjectCover: (projectId: string, sourceUri: string) => void;
  // Remembers which ESP32 the project talks to (or its new name).
  bindController: (projectId: string, bleId: string, name: string) => void;
  // Returns the new board's uid, or null if there's no free socket for it.
  // `at` plugs the board into that socket with those options (used when the model reports it); null if it doesn't fit.
  addBoard: (projectId: string, boardId: string, at?: PlaceAt) => string | null;
  setBoardOption: (projectId: string, uid: string, optionId: string, value: number) => void;
  removeBoard: (projectId: string, uid: string) => void;
  // Returns false if the output doesn't exist, is taken, or the name is empty.
  addDevice: (projectId: string, boardUid: string, port: number, name: string, group?: string) => boolean;
  // Ignored when the name is empty.
  updateDevice: (projectId: string, deviceId: string, name: string, group?: string) => void;
  removeDevice: (projectId: string, deviceId: string) => void;
  // Return false (and change nothing) if the name is empty or there are no steps.
  addAction: (projectId: string, draft: ActionDraft) => boolean;
  updateAction: (projectId: string, actionId: string, draft: ActionDraft) => boolean;
  removeAction: (projectId: string, actionId: string) => void;
  // Return false (and change nothing) if the name is empty or no action is left to run.
  addScenario: (projectId: string, draft: ScenarioDraft) => boolean;
  updateScenario: (projectId: string, scenarioId: string, draft: ScenarioDraft) => boolean;
  removeScenario: (projectId: string, scenarioId: string) => void;
  // Return false (and change nothing) if the name is empty or the action/scenario is not in the project.
  addButton: (projectId: string, draft: ButtonDraft) => boolean;
  updateButton: (projectId: string, buttonId: string, draft: ButtonDraft) => boolean;
  removeButton: (projectId: string, buttonId: string) => void;
  moveButton: (projectId: string, from: number, to: number) => void;
  // Copies a picked image in as the Play screen's background; undefined removes it.
  setPlayBackground: (projectId: string, sourceUri: string | undefined) => void;
  setDesignTemplate: (projectId: string, template: TemplateId) => void;
};

const ProjectsContext = createContext<ProjectsApi | null>(null);

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** The project with these scenarios; Play buttons of actions or scenarios that are gone are removed. */
function withScenarios(project: Project, scenarios: Scenario[]): Project {
  return { ...project, scenarios, buttons: pruneButtons(project.buttons, project.actions, scenarios) };
}

/** The project with these actions; scenarios lose the slots of actions that are gone, buttons follow. */
function withActions(project: Project, actions: Action[]): Project {
  return withScenarios({ ...project, actions }, pruneScenarios(project.scenarios, actions));
}

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [storage] = useState(createStorage);
  const { projects, setProjects, ready } = usePersistedProjects(storage);

  const updateProject = (projectId: string, change: (p: Project) => Project) =>
    setProjects((all) => all.map((p) => (p.id === projectId ? change(p) : p)));

  const api: ProjectsApi = {
    projects,
    ready,
    createProject(name, imageUri, content) {
      const id = newId();
      const project: Project = {
        id,
        name,
        imageUri: imageUri ? storage.importImage(id, imageUri, 'cover') : undefined,
        boards: content?.boards ?? [{ uid: newId(), boardId: CONTROLLER_ID }],
        devices: content?.devices ?? [],
        actions: content?.actions ?? [],
        scenarios: [],
        buttons: content?.buttons ?? [],
        createdAt: Date.now(),
      };
      setProjects((all) => [project, ...all]);
      return id;
    },
    importProject(project) {
      const id = newId();
      setProjects((all) => [
        { ...project, id, imageUri: undefined, backgroundUri: undefined, controller: undefined, createdAt: Date.now() },
        ...all,
      ]);
      return id;
    },
    duplicateProject(projectId, name) {
      const source = projects.find((p) => p.id === projectId);
      if (!source) return null;
      const id = newId();
      const copy: Project = {
        ...source,
        id,
        name,
        imageUri: source.imageUri ? storage.importImage(id, source.imageUri, 'cover') : undefined,
        backgroundUri: source.backgroundUri ? storage.importImage(id, source.backgroundUri, 'background') : undefined,
        controller: undefined,
        createdAt: Date.now(),
      };
      setProjects((all) => [copy, ...all]);
      return id;
    },
    removeProject(projectId) {
      setProjects((all) => all.filter((p) => p.id !== projectId));
    },
    renameProject(projectId, name) {
      const trimmed = name.trim().slice(0, MAX_PROJECT_NAME_LENGTH);
      if (!trimmed) return;
      updateProject(projectId, (p) => (p.name === trimmed ? p : { ...p, name: trimmed }));
    },
    setProjectCover(projectId, sourceUri) {
      const imageUri = storage.importImage(projectId, sourceUri, 'cover');
      if (imageUri) updateProject(projectId, (p) => ({ ...p, imageUri }));
    },
    bindController(projectId, bleId, name) {
      updateProject(projectId, (p) =>
        p.controller?.bleId === bleId && p.controller.name === name ? p : { ...p, controller: { bleId, name } },
      );
    },
    addBoard(projectId, boardId, at) {
      const project = projects.find((p) => p.id === projectId);
      const placement = project ? findPlacement(project, getBoard(boardId), at) : null;
      if (!placement?.ok) return null;
      const board = {
        uid: newId(),
        boardId,
        parentUid: placement.parentUid,
        hostConnectorId: placement.hostConnectorId,
        ...(at?.options && { options: at.options }),
      };
      updateProject(projectId, (p) => ({ ...p, boards: [...p.boards, board] }));
      return board.uid;
    },
    setBoardOption(projectId, uid, optionId, value) {
      const project = projects.find((p) => p.id === projectId);
      const board = project?.boards.find((b) => b.uid === uid);
      if (project && !fitsWithOption(project.boards, uid, optionId, value)) return;
      // Never drop devices silently: the user has to remove them from the outputs that would disappear.
      if (project && board && !holdsDevices(board, project.devices, optionId, value)) return;
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
        const boards = pruneUnmet(p.boards.filter((b) => !removed.has(b.uid)));
        const kept = new Set(boards.map((b) => b.uid));
        const devices = p.devices.filter((d) => kept.has(d.boardUid));
        return withActions({ ...p, boards, devices }, pruneActions(p.actions, devices));
      });
    },
    addDevice(projectId, boardUid, port, name, group) {
      const project = projects.find((p) => p.id === projectId);
      const board = project?.boards.find((b) => b.uid === boardUid);
      const kind = board ? getBoard(board.boardId).ports?.kind : undefined;
      if (!project || !board || !kind || attachProblem(board, project.devices, port, name)) return false;
      const device: Device = {
        id: newId(),
        boardUid,
        port,
        kind,
        name: name.trim().slice(0, MAX_NAME_LENGTH),
        group: cleanGroup(group),
      };
      updateProject(projectId, (p) => ({ ...p, devices: [...p.devices, device] }));
      return true;
    },
    updateDevice(projectId, deviceId, name, group) {
      const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
      if (!trimmed) return;
      updateProject(projectId, (p) => ({
        ...p,
        devices: p.devices.map((d) => (d.id === deviceId ? { ...d, name: trimmed, group: cleanGroup(group) } : d)),
      }));
    },
    removeDevice(projectId, deviceId) {
      updateProject(projectId, (p) => {
        const devices = p.devices.filter((d) => d.id !== deviceId);
        return withActions({ ...p, devices }, pruneActions(p.actions, devices));
      });
    },
    addAction(projectId, draft) {
      const project = projects.find((p) => p.id === projectId);
      if (!project || actionProblem(draft)) return false;
      const action = buildAction(newId(), draft, project.devices);
      if (actionDeviceIds(action).length === 0) return false;
      updateProject(projectId, (p) => ({ ...p, actions: [...p.actions, action] }));
      return true;
    },
    updateAction(projectId, actionId, draft) {
      const project = projects.find((p) => p.id === projectId);
      if (!project || actionProblem(draft)) return false;
      const action = buildAction(actionId, draft, project.devices);
      if (actionDeviceIds(action).length === 0) return false;
      updateProject(projectId, (p) => ({ ...p, actions: p.actions.map((a) => (a.id === actionId ? action : a)) }));
      return true;
    },
    removeAction(projectId, actionId) {
      updateProject(projectId, (p) =>
        withActions(
          p,
          p.actions.filter((a) => a.id !== actionId),
        ),
      );
    },
    addScenario(projectId, draft) {
      const project = projects.find((p) => p.id === projectId);
      if (!project || scenarioProblem(draft, project.actions)) return false;
      const scenario = buildScenario(newId(), draft, project.actions);
      if (scenario.rows.length === 0) return false;
      updateProject(projectId, (p) => ({ ...p, scenarios: [...p.scenarios, scenario] }));
      return true;
    },
    updateScenario(projectId, scenarioId, draft) {
      const project = projects.find((p) => p.id === projectId);
      if (!project || scenarioProblem(draft, project.actions)) return false;
      const scenario = buildScenario(scenarioId, draft, project.actions);
      if (scenario.rows.length === 0) return false;
      updateProject(projectId, (p) => ({
        ...p,
        scenarios: p.scenarios.map((s) => (s.id === scenarioId ? scenario : s)),
      }));
      return true;
    },
    removeScenario(projectId, scenarioId) {
      updateProject(projectId, (p) =>
        withScenarios(
          p,
          p.scenarios.filter((s) => s.id !== scenarioId),
        ),
      );
    },
    addButton(projectId, draft) {
      const project = projects.find((p) => p.id === projectId);
      if (!project || buttonProblem(draft)) return false;
      const button = buildButton(newId(), draft, project.actions, project.scenarios);
      if (!button) return false;
      updateProject(projectId, (p) => ({ ...p, buttons: [...p.buttons, button] }));
      return true;
    },
    updateButton(projectId, buttonId, draft) {
      const project = projects.find((p) => p.id === projectId);
      if (!project || buttonProblem(draft)) return false;
      const button = buildButton(buttonId, draft, project.actions, project.scenarios);
      if (!button) return false;
      updateProject(projectId, (p) => ({ ...p, buttons: p.buttons.map((b) => (b.id === buttonId ? button : b)) }));
      return true;
    },
    removeButton(projectId, buttonId) {
      updateProject(projectId, (p) => ({ ...p, buttons: p.buttons.filter((b) => b.id !== buttonId) }));
    },
    moveButton(projectId, from, to) {
      updateProject(projectId, (p) => ({ ...p, buttons: moveItem(p.buttons, from, to) }));
    },
    setPlayBackground(projectId, sourceUri) {
      const backgroundUri = sourceUri ? storage.importImage(projectId, sourceUri, 'background') : undefined;
      if (sourceUri && !backgroundUri) return;
      updateProject(projectId, (p) => ({ ...p, backgroundUri }));
    },
    setDesignTemplate(projectId, template) {
      updateProject(projectId, (p) => (p.designTemplate === template ? p : { ...p, designTemplate: template }));
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
