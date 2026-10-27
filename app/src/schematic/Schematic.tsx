import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, G, Path, Pattern, Rect, Text as SvgText } from 'react-native-svg';

import { CABLES, CONTROLLER_ID, optionValue } from '@/catalog/boards';
import { t } from '@/i18n';
import { categoryColors, colors, wireColor } from '@/theme';

import { PIN_PITCH, wirePath, type LaidBoard, type LaidConnector, type Layout } from './layout';

const MARGIN = 50;
const HEADER_DEPTH = 10;
// A lone controller would otherwise be blown up to fill the whole screen.
const MAX_SCALE = 1.4;
// Smallest comfortable touch target, in screen points.
const MIN_HIT = 44;
// SVG text on web defaults to a serif font.
const FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, sans-serif' : undefined;

type Box = { x: number; y: number; width: number; height: number };

type Props = {
  layout: Layout;
  selectedUid: string | null;
  onSelectBoard: (uid: string | null) => void;
  onPressFreeSocket: () => void;
};

/**
 * Drawing is pure SVG; taps go to plain Pressables laid over it. react-native-svg's onPress
 * isn't reliable on web, and the overlay also gives small parts a finger-sized target.
 */
export function Schematic({ layout, selectedUid, onSelectBoard, onPressFreeSocket }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => setSize(e.nativeEvent.layout);

  const { minX, minY, maxX, maxY } = layout.bounds;
  const contentW = maxX - minX + MARGIN * 2;
  const contentH = maxY - minY + MARGIN * 2;
  const scale = size.width && size.height ? Math.min(size.width / contentW, size.height / contentH, MAX_SCALE) : 1;
  // The viewBox matches the screen exactly, so content is centred and screen = (svg - origin) * scale.
  const vb = {
    x: minX - MARGIN - (size.width / scale - contentW) / 2,
    y: minY - MARGIN - (size.height / scale - contentH) / 2,
    w: size.width / scale,
    h: size.height / scale,
  };
  // Box in SVG units → absolute style in screen points, grown to at least MIN_HIT.
  const hitStyle = (box: Box) => {
    const width = box.width * scale;
    const height = box.height * scale;
    const padX = Math.max(0, MIN_HIT - width) / 2;
    const padY = Math.max(0, MIN_HIT - height) / 2;
    return {
      left: (box.x - vb.x) * scale - padX,
      top: (box.y - vb.y) * scale - padY,
      width: width + padX * 2,
      height: height + padY * 2,
    };
  };

  const freeSockets = layout.boards.flatMap((board) =>
    board.connectors
      .filter((c) => c.conn.role === 'host' && !c.occupied)
      .map((c) => ({ key: board.placed.uid + ':' + c.conn.id, box: socketHitBox(c) })),
  );

  return (
    <View style={styles.fill} onLayout={onLayout}>
      {size.width > 0 && (
        <Svg width={size.width} height={size.height} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} pointerEvents="none">
          <Defs>
            <Pattern id="grid" width={20} height={20} patternUnits="userSpaceOnUse">
              <Circle cx={1} cy={1} r={1} fill={colors.grid} />
            </Pattern>
          </Defs>
          <Rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="url(#grid)" />

          {layout.boards.map((board) => (
            <BoardShape key={board.placed.uid} board={board} selected={board.placed.uid === selectedUid} />
          ))}

          {/* Wires on top of the boards so they visibly land on the pins. */}
          {layout.wires.map((wire) => (
            <Path
              key={wire.key}
              d={wirePath(wire)}
              stroke={wireColor(wire.kind, wire.signalIndex)}
              strokeWidth={2.5}
              strokeLinecap="round"
              fill="none"
            />
          ))}

          {layout.boards.map((board) =>
            board.connectors.map((c) => <ConnectorShape key={board.placed.uid + ':' + c.conn.id} connector={c} />),
          )}
        </Svg>
      )}

      <Pressable style={StyleSheet.absoluteFill} onPress={() => onSelectBoard(null)} />
      {layout.boards.map((board) => (
        <Pressable
          key={board.placed.uid}
          style={[styles.hit, hitStyle({ x: board.x, y: board.y, width: board.def.width, height: board.def.height })]}
          onPress={() => onSelectBoard(board.placed.uid)}
        />
      ))}
      {freeSockets.map((socket) => (
        <Pressable key={socket.key} style={[styles.hit, hitStyle(socket.box)]} onPress={onPressFreeSocket} />
      ))}
    </View>
  );
}

function headerBox({ conn, pins, center }: LaidConnector): Box {
  const length = pins.length * PIN_PITCH;
  return conn.side === 'left' || conn.side === 'right'
    ? { x: center.x - HEADER_DEPTH / 2, y: center.y - length / 2, width: HEADER_DEPTH, height: length }
    : { x: center.x - length / 2, y: center.y - HEADER_DEPTH / 2, width: length, height: HEADER_DEPTH };
}

// Room the "+ Motors"-style caption takes beside a socket, in SVG units.
const LABEL_W = 70;
const LABEL_H = 22;

/** Where a socket caption sits: outside the board, so it never covers the board's own drawing. */
function labelPlacement({ conn, center }: LaidConnector, header: Box) {
  if (conn.side === 'left') return { x: header.x + header.width, y: header.y - 8, anchor: 'end' as const };
  if (conn.side === 'right') return { x: header.x, y: header.y - 8, anchor: 'start' as const };
  return { x: header.x + header.width + 8, y: center.y + 4, anchor: 'start' as const };
}

/** The header plus its caption, so tapping the words works as well as tapping the pins. */
function socketHitBox(connector: LaidConnector): Box {
  const header = headerBox(connector);
  const side = connector.conn.side;
  if (side === 'left') {
    return { x: header.x + header.width - LABEL_W, y: header.y - LABEL_H, width: LABEL_W, height: header.height + LABEL_H };
  }
  if (side === 'right') return { x: header.x, y: header.y - LABEL_H, width: LABEL_W, height: header.height + LABEL_H };
  return { x: header.x, y: header.y - 6, width: header.width + LABEL_W, height: header.height + 12 };
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
  hit: { position: 'absolute' },
});

function BoardShape({ board, selected }: { board: LaidBoard; selected: boolean }) {
  const { def, x, y } = board;
  const accent = categoryColors[def.category];
  // "Motor board (4 motors)" is too wide for one line, so the bracketed part drops to a second line.
  const name = t(def.nameKey);
  const split = name.indexOf(' (');
  const lines = split > 0 ? [name.slice(0, split), name.slice(split + 1)] : [name];
  const summaryOption = def.options?.find((o) => o.summaryKey);
  if (summaryOption?.summaryKey) {
    const count = optionValue(def, board.placed.options, summaryOption.id) * (summaryOption.summaryFactor ?? 1);
    lines.push(t(summaryOption.summaryKey, { count }));
  }
  if (board.deviceCount > 0) lines.push(t('board.devices', { count: board.deviceCount }));
  const nameY = board.chips ? y + 26 : y + def.height / 2 - (lines.length - 1) * 8 + 5;

  return (
    <G>
      <Rect
        x={x}
        y={y}
        width={def.width}
        height={def.height}
        rx={10}
        fill={colors.board}
        stroke={accent}
        strokeWidth={selected ? 3.5 : 1.5}
        strokeOpacity={selected ? 1 : 0.75}
      />
      {def.id === CONTROLLER_ID && <ControllerHeaders board={board} />}
      {Array.from({ length: board.chips }, (_, i) => (
        <Chip key={i} board={board} index={i} />
      ))}
      {lines.map((line, i) => (
        <SvgText
          key={i}
          x={x + def.width / 2}
          y={nameY + i * 16}
          fontSize={i === 0 ? 13 : 11}
          fontWeight={i === 0 ? '600' : '400'}
          fill={i === 0 ? colors.text : colors.textMuted}
          textAnchor="middle"
          fontFamily={FONT}
        >
          {line}
        </SvgText>
      ))}
    </G>
  );
}

/** The two 15-pin rows of the ESP32 DevKit, purely so the controller reads as "the microcontroller". */
function ControllerHeaders({ board }: { board: LaidBoard }) {
  const { x, y, def } = board;
  const top = y + 45;
  const step = (def.height - 60) / 14;
  const dots = [];
  for (let i = 0; i < 15; i++) {
    for (const cx of [x + 26, x + def.width - 26]) {
      dots.push(<Circle key={cx + ':' + i} cx={cx} cy={top + i * step} r={2.2} fill={colors.pinFree} />);
    }
  }
  return <>{dots}</>;
}

function Chip({ board, index }: { board: LaidBoard; index: number }) {
  const { x, y, def } = board;
  const count = board.chips;
  const w = def.width * 0.38;
  const h = 34;
  const gap = 22;
  const total = count * h + (count - 1) * gap;
  const cx = x + def.width / 2;
  const top = y + 52 + (def.height - 52 - total) / 2 + index * (h + gap);
  const legs = [];
  for (let i = 0; i < 5; i++) {
    const ly = top + 5 + i * ((h - 10) / 4);
    legs.push(<Rect key={'l' + i} x={cx - w / 2 - 5} y={ly - 1} width={5} height={2} fill={colors.pinFree} />);
    legs.push(<Rect key={'r' + i} x={cx + w / 2} y={ly - 1} width={5} height={2} fill={colors.pinFree} />);
  }
  return (
    <G>
      {legs}
      <Rect x={cx - w / 2} y={top} width={w} height={h} rx={3} fill={colors.chip} />
    </G>
  );
}

function ConnectorShape({ connector }: { connector: LaidConnector }) {
  const { conn, pins, occupied, pinUsed } = connector;
  const header = headerBox(connector);
  const free = conn.role === 'host' && !occupied;

  // Only sockets get a caption: they tell the user what can be plugged in where.
  const label = conn.role === 'host' ? labelPlacement(connector, header) : null;

  return (
    <G>
      <Rect
        {...header}
        rx={3}
        fill={colors.surfaceRaised}
        stroke={free ? colors.textMuted : colors.border}
        strokeDasharray={free ? '3,3' : undefined}
      />
      {pins.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3} fill={pinUsed[i] ? colors.pinUsed : colors.pinFree} />
      ))}
      {label && (
        <SvgText
          x={label.x}
          y={label.y}
          fontSize={11}
          fontWeight="600"
          fill={free ? colors.textMuted : colors.text}
          textAnchor={label.anchor}
          fontFamily={FONT}
        >
          {(free ? '+ ' : '') + t(CABLES[conn.cable].labelKey)}
        </SvgText>
      )}
    </G>
  );
}
