/**
 * Ready-made starting points for a new project. A template is plain project content: nothing in the app or the
 * firmware knows about it, and the user edits it like any other project.
 */
import { getBoard, type PortKind } from '@/catalog/boards';
import type { CommandId } from '@/catalog/commands';
import { t } from '@/i18n';

import { findPlacement } from './placement';
import type { Action, Device, PlacedBoard, Project, SequenceAction } from './types';

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
    ...cabinSequences(lights),
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
// every one of these stops everything else. Preloading and Loading have timing: see cabinSequences.
function cabinStates(lights: Device[]): Action[] {
  const state = (id: string, name: string, steps: LightStep[]): Action => ({
    id,
    name,
    exclusive: true,
    steps: steps.map(([light, command, level, frequency]) => ({
      deviceId: lights[light].id,
      command,
      ...(level !== undefined && { brightness: percent(level) }),
      ...(frequency !== undefined && { frequency }),
    })),
  });
  return [
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

const percent = (level: number) => Math.round((level / 4095) * 10000) / 100;

// A pause in seconds, or [command, level out of 4095, Hz].
type Cell = number | [CommandId, number?, number?];

// Preloading and Loading of the old statuses. The preloading delays were 1 s (cabin 2) and 2 s (cabin 3). Loading
// repeats every 3.75 s: the cabin 2 and 3 lights each switch on for one step of 1.25 s (cabin 3 stepped every 1 s
// before, but a loop has one length), while the cabin 1 lights and the red light of cabin 2 just blink.
function cabinSequences(lights: Device[]): SequenceAction[] {
  const sequence = (id: string, name: string, loop: boolean, rows: [number, Cell[]][]): SequenceAction => ({
    id,
    name,
    mode: 'sequence',
    exclusive: true,
    ...(loop && { loop: true }),
    rows: rows.map(([light, cells]) => ({
      deviceId: lights[light].id,
      slots: cells.map((cell) =>
        typeof cell === 'number'
          ? { type: 'pause' as const, seconds: cell }
          : {
              type: 'command' as const,
              command: cell[0],
              ...(cell[1] !== undefined && { brightness: percent(cell[1]) }),
              ...(cell[2] !== undefined && { frequency: cell[2] }),
            },
      ),
    })),
  });
  const lit = (level: number, wait: number, on: number): Cell[] => [['off'], wait, ['steady', level], on];
  return [
    sequence('preloading', t('template.preloading'), false, [
      [0, [['steady', 15]]], [1, [['steady', 15]]], [2, [['steady', 15]]],
      [3, [1, ['steady', 30]]], [4, [1, ['steady', 30]]], [5, [1, ['steady', 30]]],
      [6, [2, ['steady', 50]]], [7, [2, ['steady', 50]]],
    ]),
    sequence('loading', t('template.loading'), true, [
      [0, [['blink', 15, 2]]], [1, [['blink', 15, 1]]], [2, [['blink', 15, 2]]],
      [3, lit(30, 2.5, 1.25)], [4, lit(30, 2.5, 1.25)], [5, [['blink', 30, 0.8]]],
      [6, lit(50, 2.5, 1.25)], [7, lit(50, 1.25, 2.5)],
    ]),
  ];
}
