# DESIGN.md — design templates (themes), motion and effects

> **Status: partly built.** The template system, Blueprint (default) and Space exist (§3). Items marked
> **DECISION** / **OPEN** are not settled; confirm them with the user before building on them.

## 1. What a design template is

A **design template** (theme) changes how every part of the app looks and moves, without changing what it does:
Space, Architecture, LEGO style and so on. When the template changes, every button, card, sheet, chip, icon,
header, background and the schematic re-style themselves to it. Behaviour, layout rules, texts and the
app ↔ firmware contract stay the same.

- **Per project.** The template is chosen per project (user decision). Screens inside a project
  (`src/app/project/[id]/…`) use that project's template. Screens outside a project (project list, account,
  new project) use the **default template**: the current blueprint look (user decision).
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

## 3. Architecture (built)

```
app/src/design/
  tokens.ts            the Theme type: every token a template must fill; wireColor(theme, kind, i)
  templates/
    blueprint.ts       default template (the original blueprint colours)
    space.ts           cold deep space (brief: app/design/space/README.md)
    index.ts           registry: id → Theme, TEMPLATE_IDS (picker order), getTemplate (unknown id → default)
  ThemeProvider.tsx    context + useTheme(); makeStyles(theme => styles) (adds the template font to every text
                       style); heading(theme, size) for titles; fontFor for one-off text styles
  ScreenFrame.tsx      wraps every screen (Stack screenLayout in src/app/_layout.tsx): picks the route's template
                       (project/[id]/… → that project's, else default), paints background + ambient background;
                       HeaderTitle draws header titles in the heading style
  fonts.ts             useTemplateFonts: loads all template fonts; the splash waits for them
  backgrounds/         AmbientBackground (runs only when focused, app in front, Reduce Motion off);
                       SpaceBackground (Skia shader: nebula, parallax stars, shooting star, 30 fps);
                       SpaceBackground.web.tsx (still SVG gradient, keeps Skia out of the web bundle)
  components/          PlayTile (Play button: template shape, press spring + glow, particle burst, running ring:
                       timer fill or orbiting comet, pulse strength = motion.runPulse)
```

- Screen roots are transparent; the frame paints the background. Styles use `makeStyles`, never fixed colours.
- Titles (sheet titles, header) use `heading(t, size)`, so a template can make them uppercase and wide.

### 3.1 Tokens

`Theme` is a typed object; a template that misses a token does not compile.

| Group | Examples |
|---|---|
| `colors` | background, surface, surfaceRaised, border, text, textMuted, accent, accentText, secondary, glow, danger, backdrop, shade, tile, schematic colours |
| `category` / `wire` | colours per board category and wire kind (today's `categoryColors`, `wireColor`) |
| `typography` | font families (loaded with `expo-font`), sizes, weights, letter spacing |
| `shape` | built: `tileCut` (cut corner of Play tiles). Planned: radii, border widths, studs, bevels |
| `elevation` | shadows, glow, glass/blur |
| `background` | the animated backdrop component for the template (starfield, blueprint grid, brick plate…) |
| `motion` | built: `pressScale`, `ambient`, `burst`, `runPulse`. Planned: enter/exit, list stagger, sheet spring |
| `icons` | optional icon set override per device kind (`KindIcon`) |
| `sound` | **OPEN:** press sounds per template (no haptics, user decision) |

### 3.2 Components

- Screens never use fixed colours: they use `makeStyles`, `useTheme()` or themed primitives from
  `src/design/components/`. The old `src/theme.ts` is gone.
- A primitive may render a **variant** per template (e.g. `Button` as a LEGO brick with studs, a glowing space
  panel, or a stone-carved architectural plate) behind one prop API.
- The schematic (`src/schematic/`) takes its colours and stroke styles from the theme; geometry in `layout.ts`
  stays theme-free.

### 3.3 Persistence

- The project stores only the template id (`project.designTemplate?: string`). Optional, so no schema version
  bump: `sanitize` in `src/project/format.ts` drops unknown ids and the default is used.
- The template picker lives in the project's ⋮ sheet (`ProjectEditSheet`). Template names are i18n keys
  (`en.ts` + `uk.ts`).

## 4. Motion and effects

The app should feel alive: motion explains state and rewards interaction.

- **Library:** `react-native-reanimated` (+ worklets) and `react-native-svg` for UI motion;
  `@shopify/react-native-skia` for ambient backgrounds, particles, glow and shaders (user approved, not installed
  yet). Any other new library (Lottie, expo-blur, audio) only after the user approves it. No haptics (user
  decision).
- **Fonts:** a template may use a Latin-only display font; Ukrainian text then falls back to the system font.
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
- **OPEN:** sounds per template.
- **OPEN:** should the Play screen's own background image override the template background?
