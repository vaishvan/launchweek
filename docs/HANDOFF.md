# Handoff

**Last updated:** 2026-10-29
**Engine version:** Phaser 4.2.1 (see `docs/ENGINE.md`)

## Where we are
Full run is playable: title -> 3 acts -> 12 crisis cards -> 6 checkpoints with investor terms -> 7 endings with a share card.
Art is pxl (`assets_src/art/*.px.js`), audio is chirp (`assets_src/audio/*.cx.js`). 22 unit tests pass; smoke passes;
bots finish a run in 18-19 min at 2.5 taps/s (retimed from 30 to ~20 min on 2026-10-29).

## What changed last session
- Scaffolded from the kit (web overlay), built the rules engine (`src/core/sim.ts`), bots, all scenes, art and audio.
- Tuned balance away from content-doc v1 (see `docs/design/TUNING_NOTES.md`).

## Next step (specific, first action)
- Human playtest on a phone: `python tools/dev.py run`, play one full run, write notes into `docs/PLAYTEST_LOG.md`.

## Open questions / decisions pending
- PRD open questions were answered with defaults (`docs/design/TUNING_NOTES.md`); owner to confirm.

## Known broken or flaky
- Kit `smoke --screenshot` captures before modals render; use `node tools/capture.mjs` for phone-size screenshots.
- Card portraits are drawn at 2x pixel size (mixed pixel scale with the 1x office).

## Commands that matter right now
```
python tools/dev.py check | test | smoke | run | build
node tools/art/build_assets.mjs            # rebuild art + audio into public/assets
node tools/capture.mjs --query "autoplay=pace&speed=6" --until "ACT 2" --out captures/progress/x.png
npx vitest run --config tools/balance/vitest.balance.ts --silent=false   # balance report
```

## Context a fresh Claude needs
- Every number is in `src/data/*.json`; the sim is engine-free and seeded.
- `?autoplay=pace|idler|tapper|chaos|acquire&speed=N&seed=N` plays the game with a bot (logs CARD / CHECKPOINT / ENDING markers).
