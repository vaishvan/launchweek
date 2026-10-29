# Asset Log

> Every third-party or AI-assisted asset gets a row BEFORE it is used. Use `/asset-intake`.
> Source of truth for credits screens, store disclosures, and license audits.
> Where to find things: `docs/RESOURCES.md` (index into `docs/resources/`).

| ID | Type | File(s) in repo | Source / URL | Author | License | Attribution text (if required) | AI-assisted? | Modified? | Date added | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| A-0001 | Art (all sprites, scenes, icons, font) | public/assets/art/* | Drawn in code: assets_src/art/*.px.js with pxl (github.com/uilianks/pxl, MIT tool) | Claude (Opus 5.5) for this project | Project's own | none | dev-only (code written by AI; no image model) | n/a | 2026-10-29 | Rebuild: node tools/art/build_assets.mjs --art |
| A-0002 | Audio (35 SFX, 4 music loops) | public/assets/audio/* | Synthesized in code: assets_src/audio/*.cx.js with chirp (github.com/uilianks/chirp, MIT tool) | Claude (Opus 5.5) for this project | Project's own | none | dev-only (code written by AI; no audio model) | n/a | 2026-10-29 | MP3 fallback via ffmpeg |
| A-0003 | Font glyphs | public/assets/art/sprites/font.png | pxl built-in 3x5 font (MIT, crsolver/claude-pxl and uilianks) | crsolver, uilianks | MIT | MIT notice in .claude/skills/pxl-pixel-art/LICENSE | no | repacked as BMFont | 2026-10-29 | |

## Rules
- "AI-assisted?" uses one of: `no`, `dev-only` (AI helped, nothing AI-made ships), `pre-generated` (AI output ships in the build), `live` (generated at runtime). Steam's disclosure is built from the `pre-generated` and `live` rows (see SOP-04).
- Unknown license means it does not go in. Prototype-only (NC) assets are tagged `PLACEHOLDER` in Notes and replaced before release.
- Store the license text or a screenshot of the license page next to the asset or in `docs/licenses/`.
- AI-assisted: record tool, date, prompt summary, how much was edited by hand. Needed for store disclosure forms.
- Keep `CREDITS.md` generated from this table (see `/release-check`).
