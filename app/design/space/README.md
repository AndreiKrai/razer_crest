# Space — design template brief

Status: **brief, awaiting the user's approval.** Nothing is built yet.

## Sources

| Source | What we take | Licence |
|---|---|---|
| [Reforge, Arounda (Behance)](https://www.behance.net/gallery/245592957/Mobile-App-Admin-Panel-Design-for-a-Fitness-Platform) | shapes only: hairline glowing borders, chamfered panels, HUD rings, pill chips, light rays | reference only; no assets copied, screenshots not stored in the repo |
| Orbitron (Google Fonts) | UI font for Latin text | SIL OFL 1.1 (verify when adding) |
| [Mechsuit](https://www.dafont.com/mechsuit.font) by Fredric Harbin (pho-ku) | display font for headings | free for personal and commercial use, but CC BY-ND 4.0, "do NOT redistribute", "may ONLY be hosted at DaFont" (`assets/fonts/Mechsuit-license.txt`). **OPEN:** bundling it in the app binary and committing it to the repo may count as redistribution; the font file is not in the repo until the author confirms |

The reference's warm copper palette and illustrations are **not** used (user decision: cold space).

## Mood

Cold deep space: near-black navy, violet nebula, ice-cyan light, stars drifting in depth. Calm, precise HUD
instrument panels, not a game interface.

## Palette (draft)

| Token | Value | Use |
|---|---|---|
| background | `#05070F` | screen base |
| nebula | `#1B1240` → `#0B1026` | background gradient / shader |
| surface | `#0F1630` (80 % opacity) | cards, sheets |
| surfaceRaised | `#18223F` | pressed / active cards |
| border | `#2B3A66` | hairline borders |
| glow | `#6FA8FF` | border glow, HUD rings |
| accent | `#8B7CFF` | primary buttons, active state |
| accentText | `#0A0820` | text on accent |
| secondary | `#5CE1E6` | progress, wires, connected |
| text | `#E8EEFF` | body text |
| textMuted | `#8C9AC4` | secondary text |
| danger | `#FF6B81` | errors, STOP |

Contrast to be checked against WCAG AA before building.

## Type

Headings: **Orbitron for now**, uppercase, bold (700) and letter-spaced (~0.12 em) for a wider look. The user
likes Mechsuit for headings: switch to it **after the author confirms** that it may be embedded in the app (see
Sources). Orbitron stays for the rest of the UI. Both are Latin-only (Mechsuit checked: 406 Latin glyphs, no
Cyrillic). Ukrainian text falls back to the system font; text is never restricted to Latin.
Body text at small sizes may stay system for readability.

## Shapes

- Cards and sheets: 16 px radius, 1 px `border` hairline with a soft `glow` outline on the active one.
- Hero panels (Play buttons, project cover): one chamfered (cut) corner.
- Chips: pills with a hairline border; the selected one filled with `accent`.
- HUD rings for status (connection) and timers.

## Motion

- **Background (Skia):** a starfield in 2–3 parallax layers drifting slowly, a nebula shader that breathes over
  ~20 s, occasional shooting star. Paused off-screen, in background and with Reduce Motion.
- **Press:** scale 0.96 + glow flash; Play buttons emit a short burst of star particles.
- **Running:** a Play button whose action or scenario runs has a rotating HUD ring and pulsing glow.
- **Connection:** HUD ring spins while connecting, locks in with a flash when connected, turns `danger` on loss.
- **Sequence progress:** an ice-cyan beam sweeping along the progress bar.
- **Schematic:** wires glow `secondary`; light pulses travel along wires on test.
- **Sheets:** soft spring up; lists stagger in by 30 ms.
