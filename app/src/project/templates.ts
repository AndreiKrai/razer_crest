/**
 * Ready-made starting points for a new project. A template is plain project content: nothing in the app or the
 * firmware knows about it, and the user edits it like any other project.
 */
import { getBoard, type PortKind } from '@/catalog/boards';
import type { CommandId } from '@/catalog/commands';
import { t } from '@/i18n';

import { findPlacement } from './placement';
import type { Action, Device, PlacedBoard, Project } from './types';

export type TemplateId = 'empty' | 'starship';

export type ProjectContent = Pick<Project, 'boards' | 'devices' | 'actions'>;

export const TEMPLATE_IDS: readonly TemplateId[] = ['empty', 'starship'];

/** Content of a template, or undefined for the empty project. Texts follow the phone's language. */
export function templateContent(id: TemplateId): ProjectContent | undefined {
  return id === 'starship' ? starship() : undefined;
}

// The model on the bench today (HARDWARE.md §4 and firmware/main.py): 8 lights in three cabins on the lighting
// board, and on the motor board the engine (driver 1, channel A) and the door (channel B).
function starship(): ProjectContent {
  let boards: PlacedBoard[] = [{ uid: 'controller', boardId: 'controller' }];
  for (const boardId of ['powerboard', 'battery', 'lighting16', 'motor']) {
    const draft = { id: '', name: '', createdAt: 0, boards, devices: [], actions: [] };
    const placement = findPlacement(draft, getBoard(boardId));
    if (!placement.ok) throw new Error('Starship template does not fit: ' + boardId);
    boards = [
      ...boards,
      {
        uid: boardId,
        boardId,
        parentUid: placement.parentUid,
        hostConnectorId: placement.hostConnectorId,
        ...(boardId === 'motor' ? { options: { drivers: 1 } } : {}),
      },
    ];
  }

  const devices: Device[] = [];
  const add = (boardUid: string, port: number, kind: PortKind, name: string, group: string) =>
    devices.push({ id: `${boardUid}-${port}`, boardUid, port, kind, name, group });

  const cabins = [3, 3, 2];
  let port = 0;
  cabins.forEach((lights, cabin) => {
    for (let light = 0; light < lights; light++) {
      add('lighting16', port++, 'light', t('template.light', { n: light + 1 }), t('template.cabin', { n: cabin + 1 }));
    }
  });
  add('motor', 0, 'motor', t('template.engine'), t('template.engine'));
  add('motor', 1, 'motor', t('template.door'), t('template.door'));

  const lights = devices.filter((d) => d.kind === 'light');
  const engine = devices.find((d) => d.boardUid === 'motor' && d.port === 0);
  const actions: Action[] = [
    ...cabinStates(lights),
    { id: 'lights-on', name: t('template.lightsOn'), steps: lights.map((d) => ({ deviceId: d.id, command: 'steady' })) },
    { id: 'lights-off', name: t('template.lightsOff'), steps: lights.map((d) => ({ deviceId: d.id, command: 'off' })) },
    ...(engine
      ? [
          { id: 'engine-on', name: t('template.engineOn'), steps: [{ deviceId: engine.id, command: 'forward' as const }] },
          { id: 'engine-off', name: t('template.engineOff'), steps: [{ deviceId: engine.id, command: 'stop' as const }] },
        ]
      : []),
  ];

  return { boards, devices, actions };
}

// [light index, command, level out of 4095, Hz]: the levels are the raw TLC5940 values the firmware used.
type LightStep = [number, CommandId, number?, number?];

// The cabin lights' old ship statuses (firmware/modules/cabin/*.py) as actions. Lights left out are off, because
// every one of these stops everything else. The loading sweep and the preloading delays need sequences: not here yet.
function cabinStates(lights: Device[]): Action[] {
  const state = (id: string, name: string, steps: LightStep[]): Action => ({
    id,
    name,
    exclusive: true,
    steps: steps.map(([light, command, level, frequency]) => ({
      deviceId: lights[light].id,
      command,
      ...(level !== undefined && { brightness: Math.round((level / 4095) * 10000) / 100 }),
      ...(frequency !== undefined && { frequency }),
    })),
  });
  return [
    state('preloading', t('template.preloading'), [
      [0, 'steady', 15], [1, 'steady', 15], [2, 'steady', 15],
      [3, 'steady', 30], [4, 'steady', 30], [5, 'steady', 30],
      [6, 'steady', 50], [7, 'steady', 50],
    ]),
    state('standby', t('template.standby'), [
      [0, 'steady', 15], [1, 'blink', 15, 1], [2, 'steady', 20],
      [3, 'blink', 30, 0.8], [4, 'steady', 30],
      [6, 'steady', 50], [7, 'steady', 50],
    ]),
    state('error', t('template.error'), [
      [1, 'steady', 15], [2, 'steady', 15],
      [5, 'steady', 30],
      [6, 'steady', 50], [7, 'steady', 50],
    ]),
  ];
}
