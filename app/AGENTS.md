# app/AGENTS.md — Expo / React Native app: agent rules

Read the root `../AGENTS.md` first (language, power safety, repo map). This file adds the app-specific rules.
Product spec: `../docs/PRODUCT.md`. What the app already does, screen by screen: `../docs/APP_WORKFLOW.md`
(keep it current when you change a screen or a rule). The app ↔ firmware contract: `../docs/PROTOCOL.md`; a protocol change
touches `../firmware/` too.

- Node 22 (`.nvmrc`): run `nvm use` in `app/` before any npm/npx command. Expo SDK 58 doesn't run on Node 20.
- BLE (`react-native-ble-plx`) needs a development build; Expo Go won't work for anything that talks to the ESP32.
- No hard-coded user-facing strings: English and Ukrainian via i18n (`PRODUCT.md` §1).

### Code map (concept stage)

```
src/app/                  routes: index (project list) → project/new (name, cover image) → project/[id] (schematic)
src/catalog/boards.ts     board catalog: boards, sockets (host/plug), cables and pin kinds. Mirrors ../docs/HARDWARE.md
src/project/              Project types, in-memory store (nothing persists yet), placement rules (which socket is free)
src/project/budget.ts     GPIO budget: does the project fit? Used by placement (dims boards) and the driver-count option
src/project/devices.ts    rules for attaching devices to board outputs (free output, non-empty name, no option change that drops devices)
src/schematic/PortSheet.tsx  "Outputs and devices" sheet: all outputs of a selected board; add, rename or remove a named device
src/catalog/gpio.ts       the controller's pin pools (mirrors ../docs/HARDWARE.md §3); only budget.ts reads them
src/schematic/layout.ts   pure geometry: auto-places each board next to its socket, one wire per pin
src/schematic/Schematic.tsx  SVG drawing + a Pressable overlay for taps (SVG onPress is unreliable on web)
src/schematic/BoardPicker.tsx  "Add board" sheet, grouped by category, disabled items show why
src/i18n/                 en.ts is the key list; uk.ts must have every key (typed)
```

- Boards and sockets come only from the catalog; never special-case a board id in UI code.
- The user never sees GPIO numbers or signal names: pins carry only a kind (wire colour).

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
