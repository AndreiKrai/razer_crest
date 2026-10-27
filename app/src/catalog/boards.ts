/**
 * Board catalog: what boards exist, which sockets they have and which cable joins them.
 *
 * Physical source of truth is docs/HARDWARE.md. The user never sees pin or GPIO names,
 * so pins here only carry a kind (for wire colour), not a signal name.
 */
import type { TKey } from '@/i18n';

export type Side = 'left' | 'right' | 'top' | 'bottom';

export type PinKind = 'gnd' | 'power' | 'battery' | 'signal';

export type CableId = 'lights' | 'motors' | 'battery' | 'power';

export type Category = 'controller' | 'lighting' | 'motors' | 'power' | 'servo' | 'sound' | 'sensors';

/** What a board output can drive. Each kind is a device preset the user can attach. */
export type PortKind = 'light' | 'motor';

/** The outputs of a board: a fixed number, plus some per unit of a board option (e.g. 2 motors per driver). */
export type PortSpec = {
  kind: PortKind;
  fixed?: number;
  perOption?: { option: string; factor: number };
};

export type Connector = {
  id: string;
  cable: CableId;
  side: Side;
  // A host socket accepts a child board; a plug is how a board attaches to its parent.
  role: 'host' | 'plug';
};

/** A user choice on a placed board, e.g. how many motor drivers sit on the motor board. */
export type BoardOption = {
  id: string;
  labelKey: TKey;
  hintKey: TKey;
  values: number[];
  default: number;
  // Shown under the board name on the schematic as summaryKey({count: value * summaryFactor}).
  summaryKey?: TKey;
  summaryFactor?: number;
  // The option's value is also the number of chips drawn on the board.
  isChipCount?: boolean;
};

export type BoardDef = {
  id: string;
  category: Category;
  nameKey: TKey;
  descKey: TKey;
  width: number;
  height: number;
  connectors: Connector[];
  // Decorative chips drawn on the board so boards look different on the schematic.
  chips?: number;
  options?: BoardOption[];
  comingSoon?: boolean;
  // Which controller pins the board uses (see catalog/gpio.ts and project/budget.ts).
  pinGroup?: 'tlc' | 'tb6612';
  // Where the user attaches devices (lights, motors); numbered from 1 on the screen.
  ports?: PortSpec;
  // Upper limit per model, for chains whose length isn't verified yet.
  maxCount?: number;
  // Id of a board that must be in the project first, even if it isn't this board's parent (e.g. motors need the
  // power board for their motor supply).
  requires?: string;
};

export type CablePin = {
  kind: PinKind;
  // Wired only when the child board's option has at least this value (e.g. the second motor driver's inputs).
  needs?: { option: string; min: number };
  // Wired only for these child boards (e.g. the battery supply line exists on the power board, not on USB power).
  onlyFor?: string[];
};

export type CableDef = {
  id: CableId;
  labelKey: TKey;
  // Same order on both ends (HARDWARE.md §3). The real ribbon pin order is still TBD there.
  pins: CablePin[];
};

const pins = (...kinds: PinKind[]): CablePin[] => kinds.map((kind) => ({ kind }));
const secondDriver: CablePin = { kind: 'signal', needs: { option: 'drivers', min: 2 } };

export const CABLES: Record<CableId, CableDef> = {
  lights: {
    id: 'lights',
    labelKey: 'cable.lights',
    pins: pins('gnd', 'power', 'signal', 'signal', 'signal', 'signal', 'signal', 'gnd'),
  },
  motors: {
    id: 'motors',
    labelKey: 'cable.motors',
    // The motor supply (VM) is a pass-through: it arrives from the power board on the controller shield and leaves on
    // this cable without touching the ESP32. Then GND, 3V3 and 4 inputs per TB6612 driver (HARDWARE.md §3, §4).
    // Each motor board has its own cable, and only the lines of the drivers it has are wired.
    pins: [
      ...pins('battery', 'battery', 'gnd', 'power', 'signal', 'signal', 'signal', 'signal'),
      secondDriver,
      secondDriver,
      secondDriver,
      secondDriver,
      ...pins('gnd'),
    ],
  },
  power: {
    id: 'power',
    labelKey: 'cable.power',
    // One wide keyed cable: 5V for the ESP32 and the motor supply (VM), both with GND. VM is only on the power
    // board's cable, so USB power uses the 5V and GND pins only. The real pin count follows the current (O21).
    pins: [
      { kind: 'power' },
      { kind: 'battery', onlyFor: ['powerboard'] },
      { kind: 'battery', onlyFor: ['powerboard'] },
      { kind: 'gnd' },
      { kind: 'gnd', onlyFor: ['powerboard'] },
    ],
  },
  battery: {
    id: 'battery',
    labelKey: 'cable.battery',
    pins: pins('battery', 'gnd'),
  },
};

export const CONTROLLER_ID = 'controller';

export const BOARDS: BoardDef[] = [
  {
    id: CONTROLLER_ID,
    category: 'controller',
    nameKey: 'board.controller.name',
    descKey: 'board.controller.desc',
    width: 220,
    height: 230,
    chips: 1,
    connectors: [
      { id: 'motors', cable: 'motors', side: 'left', role: 'host' },
      // A second motor board has its own socket and its own pins (see catalog/gpio.ts).
      { id: 'motors2', cable: 'motors', side: 'top', role: 'host' },
      { id: 'lights', cable: 'lights', side: 'right', role: 'host' },
      // Either the power board (battery) or the USB power source; never both (HARDWARE.md §2).
      { id: 'power', cable: 'power', side: 'bottom', role: 'host' },
    ],
  },
  {
    id: 'lighting16',
    category: 'lighting',
    nameKey: 'board.lighting16.name',
    descKey: 'board.lighting16.desc',
    width: 140,
    height: 230,
    chips: 1,
    pinGroup: 'tlc',
    ports: { kind: 'light', fixed: 16 },
    // Lighting chips daisy-chain: another lighting board takes the data from this one, on the same controller pins.
    // The chain length is unverified (HARDWARE.md), hence the limit.
    maxCount: 2,
    connectors: [
      { id: 'in', cable: 'lights', side: 'left', role: 'plug' },
      { id: 'next', cable: 'lights', side: 'right', role: 'host' },
    ],
  },
  {
    // One board with room for two TB6612 drivers; the user says how many are fitted (HARDWARE.md §3, board 3).
    id: 'motor',
    category: 'motors',
    nameKey: 'board.motor.name',
    descKey: 'board.motor.desc',
    width: 140,
    height: 230,
    options: [
      {
        id: 'drivers',
        labelKey: 'option.drivers.label',
        hintKey: 'option.drivers.hint',
        values: [1, 2],
        default: 1,
        summaryKey: 'board.motor.summary',
        summaryFactor: 2,
        isChipCount: true,
      },
    ],
    pinGroup: 'tb6612',
    // Each TB6612 driver runs 2 motors.
    ports: { kind: 'motor', perOption: { option: 'drivers', factor: 2 } },
    // The motors run straight from the battery, which only the power board has.
    requires: 'powerboard',
    connectors: [{ id: 'in', cable: 'motors', side: 'right', role: 'plug' }],
  },
  {
    // Battery socket, switch, fuse, bulk capacitor and the 5 V buck in one place (HARDWARE.md §2, §3).
    id: 'powerboard',
    category: 'power',
    nameKey: 'board.powerboard.name',
    descKey: 'board.powerboard.desc',
    width: 140,
    height: 110,
    connectors: [
      { id: 'in', cable: 'power', side: 'top', role: 'plug' },
      { id: 'battery', cable: 'battery', side: 'bottom', role: 'host' },
    ],
  },
  {
    // The controller's own USB-C port: lights and sound without a battery. It can't run motors.
    id: 'usb',
    category: 'power',
    nameKey: 'board.usb.name',
    descKey: 'board.usb.desc',
    width: 130,
    height: 70,
    connectors: [{ id: 'in', cable: 'power', side: 'top', role: 'plug' }],
  },
  {
    id: 'battery',
    category: 'power',
    nameKey: 'board.battery.name',
    descKey: 'board.battery.desc',
    width: 130,
    height: 70,
    connectors: [{ id: 'in', cable: 'battery', side: 'top', role: 'plug' }],
  },
  {
    // Servo support is undecided (PRODUCT.md A2); listed so the catalog shows where it will live.
    id: 'servo16',
    category: 'servo',
    nameKey: 'board.servo16.name',
    descKey: 'board.servo16.desc',
    width: 140,
    height: 200,
    connectors: [],
    comingSoon: true,
  },
  {
    id: 'sound',
    category: 'sound',
    nameKey: 'board.sound.name',
    descKey: 'board.sound.desc',
    width: 120,
    height: 120,
    connectors: [],
    comingSoon: true,
  },
  {
    id: 'sensors',
    category: 'sensors',
    nameKey: 'board.sensors.name',
    descKey: 'board.sensors.desc',
    width: 120,
    height: 120,
    connectors: [],
    comingSoon: true,
  },
];

// Order of sections in the board picker; the controller is always placed, so it isn't offered.
export const PICKER_CATEGORIES: Category[] = ['lighting', 'motors', 'power', 'servo', 'sound', 'sensors'];

export const CATEGORY_KEYS: Record<Category, TKey> = {
  controller: 'category.controller',
  lighting: 'category.lighting',
  motors: 'category.motors',
  power: 'category.power',
  servo: 'category.servo',
  sound: 'category.sound',
  sensors: 'category.sensors',
};

export function getBoard(id: string): BoardDef {
  const board = BOARDS.find((b) => b.id === id);
  if (!board) throw new Error('Unknown board: ' + id);
  return board;
}

export function plugOf(board: BoardDef): Connector | undefined {
  return board.connectors.find((c) => c.role === 'plug');
}

export function optionValue(def: BoardDef, values: Record<string, number> | undefined, optionId: string): number {
  const option = def.options?.find((o) => o.id === optionId);
  return values?.[optionId] ?? option?.default ?? 0;
}

export function chipCount(def: BoardDef, values: Record<string, number> | undefined): number {
  const option = def.options?.find((o) => o.isChipCount);
  return option ? optionValue(def, values, option.id) : (def.chips ?? 0);
}

/** How many outputs the board has with the given option values. */
export function portCount(def: BoardDef, values: Record<string, number> | undefined): number {
  const spec = def.ports;
  if (!spec) return 0;
  const extra = spec.perOption ? optionValue(def, values, spec.perOption.option) * spec.perOption.factor : 0;
  return (spec.fixed ?? 0) + extra;
}
