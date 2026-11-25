# DESIGN.md — design templates (themes), motion and effects

> **Status: proposal, not built yet.** Today the app has one hard-coded dark "blueprint" palette in
> `app/src/theme.ts`. Everything below marked **DECISION** needs the user's confirmation before it is built on.

## 1. What a design template is

A **design template** (theme) changes how every part of the app looks and moves, without changing what it does:
Space, Architecture, LEGO style and so on. When the template changes, every button, card, sheet, chip, icon,
header, background and the schematic re-style themselves to it. Behaviour, layout rules, texts and the
app ↔ firmware contract stay the same.

- **Per project.** The template is chosen per project (user decision). Screens inside a project
  (`src/app/project/[id]/…`) use that project's template. Screens outside a project (project list, account,
  new project) use the **default template**. **DECISION:** the default is the current blueprint look.
- A template is **data + a small set of component variants**, never a fork of a screen.

## 2. Design sources

Source material for a template (mood boards, reference screenshots, palettes, fonts, textures, icons, sounds,
Figma exports) lives in `app/design/<TemplateName>/`, one folder per template, as provided by the user.

```
app/design/
  Space/
    README.md          what the user gave, licence/origin of each asset, notes on the mood
    refs/              reference images (not bundled into the app)
    assets/            assets that ARE used in the app (textures, fonts, Lottie/SVG)
  Lego/
  Architecture/
```

- `refs/` is inspiration only and never imported by app code. Only `assets/` may be imported.
- Every asset that ships must have a known licence/origin recorded in that folder's `README.md`. **OPEN:** no
  asset licences are recorded yet.

## 3. Architecture (DECISION)

```
app/src/design/
  tokens.ts            the Theme type: the full list of tokens every template must fill
  templates/
    blueprint.ts       default template (today's colours from theme.ts)
    space.ts
    lego.ts
    index.ts           registry: id → Theme; ids are stable strings saved in projects
  ThemeProvider.tsx    context + useTheme(); a project screen wraps its subtree with the project's template
  components/          themed primitives: Screen, Button, Card, Sheet, Chip, IconButton, Field, Background…
  motion.ts            shared Reanimated presets (durations, springs, easing) per template
```

### 3.1 Tokens

`Theme` is a typed object; a template that misses a token does not compile.

| Group | Examples |
|---|---|
| `colors` | background, surface, surfaceRaised, border, text, textMuted, accent, accentText, danger, success |
| `category` / `wire` | colours per board category and wire kind (today's `categoryColors`, `wireColor`) |
| `typography` | font families (loaded with `expo-font`), sizes, weights, letter spacing |
| `shape` | radii, border widths, stud/bevel style (e.g. LEGO studs, sharp architectural corners) |
| `elevation` | shadows, glow, glass/blur |
| `background` | the animated backdrop component for the template (starfield, blueprint grid, brick plate…) |
| `motion` | press feedback, enter/exit, list stagger, sheet spring, ambient loop speed |
| `icons` | optional icon set override per device kind (`KindIcon`) |
| `sound` / `haptics` | **OPEN:** press sounds and haptic patterns per template |

### 3.2 Components

- Screens never read colours directly: they use themed primitives from `src/design/components/` or
  `useTheme()`. `src/theme.ts` is retired once every import moved (migration, screen by screen).
- A primitive may render a **variant** per template (e.g. `Button` as a LEGO brick with studs, a glowing space
  panel, or a stone-carved architectural plate) behind one prop API.
- The schematic (`src/schematic/`) takes its colours and stroke styles from the theme; geometry in `layout.ts`
  stays theme-free.

### 3.3 Persistence

- The project stores only the template id (`project.designTemplate: string`). Unknown ids fall back to the
  default. Adding the field is a version step in `src/project/format.ts` (sanitize + upgrade).
- The template picker lives in the project's ⋮ sheet (`ProjectEditSheet`). Template names are i18n keys
  (`en.ts` + `uk.ts`).

## 4. Motion and effects

The app should feel alive: motion explains state and rewards interaction.

- **Library:** `react-native-reanimated` (+ worklets) and `react-native-svg`, already installed. Any new
  library (Skia, Lottie, expo-blur, haptics, audio) only after the user approves it.
- **Kinds of motion:** press feedback on every tappable (scale/tilt/glow), screen and sheet enter/exit, list
  stagger, state changes (connected, playing, running action) and an ambient template background.
- **Performance:** animations run on the UI thread (shared values, `useAnimatedStyle`), never via React state
  per frame. Target 60 fps on a mid-range Android phone. Ambient loops pause when the screen is not focused or
  the app is in background.
- **Accessibility:** respect Reduce Motion (`useReducedMotion` from Reanimated): replace movement with fades,
  stop ambient loops. Text contrast ≥ WCAG AA (4.5:1) on every template; touch targets ≥ 44 pt.
- **Meaning first:** status colours (connected, error, danger) stay recognisable in every template.

## 5. Open questions

- **OPEN:** which templates ship first and which are free vs paid (see `docs/MONETIZATION.md`).
- **OPEN:** sounds and haptics per template.
- **OPEN:** should the Play screen's own background image override the template background?
