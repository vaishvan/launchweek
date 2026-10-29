# Launch Week

A one-sitting pixel idle tycoon. You are the first growth hire at an AI startup: get to **1,000,000 users in about
20 minutes**. Tap SHIP, hire, open channels, survive 12 crisis cards, pass 5 funding rounds (each with an investor
term that has a perk and a catch), and earn one of 7 endings with a shareable card.

Portrait, mobile-first, runs in any modern browser. Phaser 4 + TypeScript + Vite, scaffolded with the
[Claude Code Game Kit](https://github.com/Er2oneousbit/claude-code-game-kit). Art is drawn in code with
[pxl](https://github.com/uilianks/pxl), sound is synthesized with [chirp](https://github.com/uilianks/chirp).

## Play it
```
python tools/dev.py setup     # once: npm install + headless browser for tests
python tools/dev.py run       # dev server, opens the game
python tools/dev.py build     # dist/ for upload (zip its contents for itch.io)
```
Needs Node.js 22.18+ and Python 3.8+. To rebuild art and audio from source: `node tools/art/build_assets.mjs`
(needs ffmpeg for OGG/MP3).

## Where things live
| Path | What |
|---|---|
| `src/core/` | Rules engine (engine-free, seeded): `sim.ts`, `bot.ts`, `data.ts` |
| `src/data/*.json` | Every number, card, investor term and ending |
| `src/game/` | Phaser scenes and views (office, HUD, SHIP bar, panels, overlays) |
| `assets_src/art/`, `assets_src/audio/` | pxl and chirp sources |
| `docs/design/` | Original design docs, the technical PRD, tuning notes |
| `tests/` | Vitest rules tests; `balance.report.ts` is the bot balance report |

## Testing
```
python tools/dev.py check | test | smoke
python tools/dev.py smoke --query "autoplay=pace&speed=60" --until END_SCREEN --timeout 150   # a full bot run
npx vitest run --config tools/balance/vitest.balance.ts --silent=false                       # balance report
```
