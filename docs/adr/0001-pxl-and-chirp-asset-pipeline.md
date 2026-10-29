# ADR 0001: Art with pxl, audio with chirp, both built from code

**Status:** accepted, 2026-10-29

## Context
The owner asked for 2D pixel art made with pxl and sound made with chirp. Both are MIT-licensed, code-first tools with an
agent skill each.

## Decision
- Install both as project skills in `.claude/skills/` (pxl-pixel-art, chirp-game-audio).
- Source files live in `assets_src/art/*.px.js` and `assets_src/audio/*.cx.js`; `node tools/art/build_assets.mjs`
  builds them and copies PNG atlases (TexturePacker JSON), a BMFont XML for pxl's 3x5 font, OGG and MP3 into `public/assets/`.
- Neither tool ships to players: they are build-time only, so no runtime dependency is added.

## Consequences
- Every asset is reproducible and diffable; tweaks are code edits.
- ffmpeg is needed for OGG/MP3 output. Node 22.18+ is needed for both tools (higher than the kit's 22.12).
