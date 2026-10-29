# Launch Week: Technical PRD (v0.1, draft)

Source docs: `launch-week-game-loop.md` (v2) and `launch-week-content.md` (v1).
This doc turns them into build requirements: code, assets, sound, tooling, testing and release.
Items marked **[Q#]** are open questions listed in section 11.

---

## 1. Product summary

| Item | Requirement |
|---|---|
| Genre | Single-sitting idle tycoon with timed crisis cards |
| Goal | 0 to 1,000,000 users in about 30 minutes |
| Platform | Web browser, mobile-first, portrait (9:16). Desktop browsers show the same portrait frame, letterboxed |
| Art | 2D pixel art, all made with **pxl** (code-generated PNG, sheets, GIFs) |
| Audio | All SFX and music made with **chirp** (code-generated WAV/OGG, audio-sprite banks) |
| Session | One run, no saves, no offline progress, no accounts |
| Distribution | Static web build (itch.io and/or GitHub Pages) **[Q1]** |

---

## 2. Toolchain

| Tool | Role | Version / need |
|---|---|---|
| claude-code-game-kit | Scaffold, `dev.py` command contract, skills, SOPs, tests | `scripts/new_game.py --engine web` |
| Phaser | Game engine (2D, WebGL) | 4.2.1 (kit pin). Phaser 4 API, not 3 |
| TypeScript | Language, strict mode | 7.0.2 (kit pin) |
| Vite | Dev server and build | 8.3.5 (kit pin) |
| Vitest | Unit tests for engine-free logic | 5.0.5 (kit pin) |
| Playwright | Headless smoke and scripted runs | 1.64.1 (kit pin) |
| pxl | Pixel art as code | Node >= 22.18 |
| chirp | SFX and music as code | Node >= 22.18, `npm install` once; ffmpeg for `--ogg` |
| Node.js | Runtime for all of the above | **>= 22.18** (pxl/chirp need more than the kit's 22.12) |
| Python | Runs `tools/dev.py` | >= 3.8 |
| ffmpeg | OGG/MP3 export from chirp | any recent build |

Install plan:
1. Scaffold: `python scripts/new_game.py --name "Launch Week" --engine web --dest ../launch-week --git-init`
2. In the game folder: `python tools/dev.py setup`, then `python tools/dev.py doctor`
3. Register pxl and chirp as project skills: copy (or clone) them into `.claude/skills/pxl-pixel-art` and `.claude/skills/chirp-game-audio`
4. Source art and sound live in `assets_src/art/*.px.js` and `assets_src/audio/*.cx.js`. Build output is copied into `public/assets/`

> Note: the kit warns against OneDrive-synced folders (thousands of small files fight the sync). The current folder is under OneDrive **[Q2]**.

---

## 3. Code architecture

Kit rule: pure logic in `src/core/` (no Phaser import, unit tested), rendering in `src/game/`.

### 3.1 Folder layout

```
src/
  main.ts                 Phaser.Game config: portrait, pixel-art mode, integer scaling, scene list
  core/                   engine-free, deterministic, unit tested
    sim.ts                fixed-step simulation tick (10 Hz or 20 Hz) [Q3]
    state.ts              GameState type: resources, hires, channels, upgrades, flags, clock
    economy.ts            growth formula, income, salaries, cost curves
    team.ts               hires, synergy, morale
    channels.ts           unlocks, levels, output, risk effects
    tap.ts                tap power, combo meter, Launch Moments, spam penalty
    cards.ts              crisis card scheduler, timer, chains, defaults, weighted rolls
    checkpoints.ts        targets, deadlines, injections, bridge loans
    terms.ts              investor term pool, draw 3, apply perk/catch modifiers
    endings.ts            ending resolution in priority order
    modifiers.ts          one place that stacks every multiplier, with floor/ceiling caps
    rng.ts                seeded RNG (reproducible runs and tests)
    log.ts                kit Log (BOOT_OK, markers for smoke)
  game/
    BootScene.ts          load assets, show title
    OfficeScene.ts        office cross-section, employees, floor upgrades, tap target
    HudScene.ts           top HUD, expand panel, bottom bar, tabs
    CardScene.ts          crisis card overlay
    CheckpointScene.ts    investor review and term pick
    EndScene.ts           ending screen and share card
    ui/                   buttons, tabs, lists, number formatting, bitmap text
    audio.ts              sound bank wrapper, music, mute
data/ (public/assets/data/)
  tuning.json             every number from the content doc
  cards.json              12 cards: text, options, effects, chains, defaults
  terms.json              8 investor terms
  endings.json            7 endings: condition id, title, epitaph, icon key
tests/
  *.test.ts               Vitest suites for src/core
```

### 3.2 Data-driven rule

Every number in `launch-week-content.md` lives in JSON, never in code. The kit requires this ("tunables in one module or JSON"). Playtest tuning then needs no code change.

### 3.3 Simulation

- Fixed timestep, separate from render frame rate. Uses the kit's `dt` clamp convention.
- Growth: `users/sec = (team output + channel output) x sentiment x reach buff x morale`, then all modifiers (terms, loans, card buffs), capped by a combined floor and ceiling **[Q4]**.
- Income: `cash/sec = users x 0.002 x revenue multiplier`. Salaries are subtracted every tick.
- Run clock: 0:00 to 32:00 hard end. Clock pauses while a menu or card is open? **[Q5]**
- Deterministic with a seed so a bot can replay a whole run in a test.

### 3.4 Systems and acceptance criteria

| System | Must do | Done when |
|---|---|---|
| Resources | Users, Cash, Sentiment (0.5x to 2x), Reach (decaying buff), Morale (%) | Values match a hand-calculated tick in tests |
| Team | 6 roles, max 5 each, cost x1.5 per copy, salary per second, base output, +25% synergy per matching hire to boosted channels | Unit test per role; synergy stacks correctly |
| Morale | Drops when salaries > 60% of income for > 30 s | Test with forced salary/income ratio |
| Channels | 8 channels, unlock thresholds, cost x1.4 per level, max level 8, risk effects (Twitter spikes, Paid ads -S, Creator bursts, Partnership events) | Each risk effect has a test **[Q6]** |
| Tap / SHIP | Base +1 user, combo +10%, combo meter, Launch Moment (Reach +25 for 10 s, decays over 30 s), 5 upgrades, spam penalty to sentiment | Tap share 25 to 35% of growth in bot run **[Q7]** |
| Crisis cards | 12 scripted cards at set times, 15 s timer, pauses in menus, default on timeout, chains (1 to 6, 2 to 10), weighted rolls by sentiment, pity rule | All 12 fire in a bot run; chains verified |
| Checkpoints | 6 targets with deadlines, trigger on hit, injection on pass, review screen | Pass and miss paths tested |
| Bridge loan | 50% advance, -15% output until next pass, deducted from next injection, 3 loans + cash 0 = Shutdown | Test for each rule |
| Investor terms | Draw 3 from remaining pool of 8 at each of 5 checkpoints, permanent | No duplicates, effects applied |
| Endings | 7 endings checked in doc order | Each ending reachable by a scripted bot |
| Comeback bonus | Short recovery buff after a big crash | Needs numbers **[Q8]** |
| Acts | 3 acts, new office floor and higher-tier cards per act | Floor swap at 10:00-ish / Seed and 20:00-ish / Series B **[Q9]** |

### 3.5 Testing (kit contract)

- `python tools/dev.py check` (types) and `test` (Vitest) pass before any change is called done.
- `smoke`: production build boots headless, logs `BOOT_OK`, no console errors, no missing assets.
- Scenario bots via `smoke --query "autoplay=<bot>&seed=N" --until <MARKER>`:
  - `pace` bot: follows the growth curve; must land within about 15% of each table row
  - `tapper` bot: taps only; must not reach 1M (proves the idle engine matters)
  - `idler` bot: never taps; checks tap share
  - one bot per ending (`ENDING_IPO`, `ENDING_SHUTDOWN` and so on)
- Balance report: a Node script that simulates 100 seeded runs and prints time to each checkpoint.

### 3.6 Performance and platform

- 60 fps on a mid-range Android phone in Chrome **[Q10]**
- First load under 3 MB total (pixel art and synthesized audio are small)
- Touch input with large tap targets (min 44 px on screen); thumb-reach controls at the bottom
- Audio starts after first tap (browser autoplay rule)
- No backend, no keys, no analytics in v1 **[Q11]**

---

## 4. Screen and UI requirements

| Screen | Elements |
|---|---|
| Title | Logo "Launch Week", company name input? **[Q12]**, Start, mute toggle |
| Intro card | 2 to 3 lines of setup text, tap to begin |
| Main | Top HUD (Users, Cash, Sentiment); expand panel (Reach, Morale); office cross-section; SHIP button; combo meter; tabs Team / Channels / Upgrades; run clock; next checkpoint target and deadline |
| Tab panels | Scrollable lists with icon, name, level/count, cost, output, buy button, locked state |
| Crisis card | Slides over office; title, art, text, 2 to 3 options with stat icons, countdown bar |
| Checkpoint review | Stats summary, pass/miss, injection or loan, pick 1 of 3 term cards |
| Bridge loan card | Loan details, accept |
| Ending | Ending title, pixel icon, stats, epitaph, share card, Play again |
| Share card | Vertical image: title, icon, final users, time, loans, 5 checkpoint pips, epitaph, company name, logo. Export as PNG **[Q13]** |

---

## 5. Art requirements (pxl)

### 5.1 Global spec

| Item | Value |
|---|---|
| Base resolution | 180 x 320 logical pixels, integer scaled (x4 = 720x1280, x6 = 1080x1920) **[Q14]** |
| Palette | One fixed palette for the whole game (e.g. endesga32 or a custom 24 to 32 colour set), hue-shifted ramps via `shades()` **[Q15]** |
| Outline | `selout` (selective outline) on characters and props |
| Light | Single light direction, top-left |
| Quality gate | `pxl lint` passes (no orphans, jaggies, pillow shading) before an asset ships |
| Output | Sprite sheets + TexturePacker-style JSON, loaded as Phaser atlases |
| Font | pxl built-in pixel font, or a licensed bitmap font **[Q16]** |

### 5.2 Asset list

**Office and environment**
| Asset | Count | Notes |
|---|---|---|
| Floor 1 (Act 1: tiny office, 1 desk) | 1 scene | Starts empty |
| Floor 2 (Act 2: open-plan) | 1 scene | Stacks above floor 1 |
| Floor 3 (Act 3: penthouse / HQ) | 1 scene | Stacks on top |
| Desks | 1 per hire slot, up to 30 | Tiered by floor |
| Props | about 15 | Monitors, plants, coffee machine, whiteboard, server rack, beanbag, neon sign, trophy shelf, pizza boxes |
| Background / sky | 1 to 3 | Changes per act (day, evening, night) |
| Server-meltdown overlay | 1 anim | For card 12 |

**Characters**
| Asset | Count | Animations |
|---|---|---|
| Growth lead (player) | 1 | idle, typing, celebrate |
| Hires | 6 roles | idle, typing, celebrate, burnout (slumped), each role visually distinct |
| Variants | palette swaps per copy (up to 5) | via `swap` |
| Founder | 1 | for cards (Send the founder) |
| Card portraits | about 8 | Creator, investor, SynergyCorp rep, blogger, NeoMind exec, big-lab exec, sleeping engineer, angry users |

**UI**
| Asset | Count |
|---|---|
| SHIP button (normal, pressed, combo-full glow) | 3 states |
| Combo meter (frame + fill) | 1 |
| HUD icons: Users, Cash, Sentiment, Reach, Morale, clock | 6 |
| Tab icons: Team, Channels, Upgrades | 3 |
| Channel icons | 8 |
| Upgrade icons | 5 |
| Role icons | 6 |
| Stat-effect chips (+/- arrows per stat) | 10 |
| Panels, 9-slice frames, buttons, lock icon, checkbox pips | about 10 |
| Crisis card frame + countdown bar | 1 set |
| Investor term cards | 8 icons + 1 frame |
| Checkpoint pips (empty, passed, missed) | 3 |
| Ending icons | 7 |
| Logo "Launch Week" | 1 (+ small version) |

**FX**
| Asset | Notes |
|---|---|
| Floating "+N users" numbers | bitmap text |
| Tap burst particles | small sprites |
| Launch Moment burst | anim |
| Confetti (checkpoint pass) | particles |
| Notification bubbles above desks (tweet, post, heart) | 4 to 6 |

Rough total: about 120 sprites/frames-sets across 6 to 8 `.px.js` files.

---

## 6. Sound requirements (chirp)

### 6.1 Global spec
- Synthesized only (no samples) unless needed.
- Export OGG + MP3 fallback (kit guidance for Safari).
- SFX peaks -6 to -12 dBFS, similar sounds at similar levels; no `CLIPPED` warnings.
- SFX packed into one audio-sprite bank with JSON; music as separate looping files.
- Retro chiptune style to match pixel art.

### 6.2 SFX list
| Group | Sounds |
|---|---|
| Tap | ship tap (3 pitch variants), combo tick, combo full, Launch Moment |
| Economy | buy/hire, upgrade, level up, cannot afford, unlock channel, cash in |
| UI | tab switch, open panel, close, button hover/press |
| Cards | card slide-in stinger, timer tick (last 5 s), option select, default fired (bad buzz), good roll, bad roll |
| Checkpoint | pass fanfare, miss, loan accepted, term picked |
| Events | bad tweet notification, creator burst, server alarm, acquisition chime, morale drop sigh |
| Endings | 7 short end jingles (or 3: good, mixed, bad) **[Q17]** |

About 35 to 40 sounds.

### 6.3 Music
| Track | Length | Notes |
|---|---|---|
| Title theme | 30 to 60 s loop | |
| Act 1: Launch | 60 to 90 s loop | scrappy, light |
| Act 2: Scale | 60 to 90 s loop | faster, fuller |
| Act 3: Empire | 60 to 90 s loop | tense, big |
| Crisis-card layer | short loop or ducking | music ducks while a card is open |
| Ending stingers | 5 to 10 s | per ending group |

Mute toggle for music and SFX separately.

---

## 7. Data files (content as data)

| File | Contents |
|---|---|
| `tuning.json` | growth curve targets, income rule, checkpoint table, loan rules, hire table, channel table, tap upgrades, morale rule, caps |
| `cards.json` | per card: id, act, time, title, body, portrait key, options (label, effects, roll, chain), default, severity |
| `terms.json` | per term: id, perk modifiers, catch modifiers, text |
| `endings.json` | per ending: id, priority, condition, title, epitaph, icon key, jingle key |
| `strings.json` | all UI text (eases later translation) |

---

## 8. Build and release

- `python tools/dev.py build` makes `dist/` with relative paths.
- itch.io: zip `dist/` contents, HTML game, portrait viewport, fullscreen button.
- Test the uploaded build on a real phone (Android Chrome, iOS Safari) with sound on.
- Version from `package.json`, shown on title screen.

---

## 9. Milestones

| # | Milestone | Output |
|---|---|---|
| M0 | Setup | Kit scaffold, pxl + chirp installed as skills, `doctor` clean |
| M1 | Core sim | `src/core` with tests; headless bot reaches 1M near 30 min |
| M2 | Greybox UI | Playable in browser with boxes and text; all 12 cards and 5 checkpoints |
| M3 | Art pass | pxl office, characters, UI, icons |
| M4 | Audio pass | chirp bank + 4 music loops |
| M5 | Endings + share card | All 7 endings reachable, share PNG |
| M6 | Tuning + release | Balance report, playtest fixes, itch.io build |

Kit rule: prove it's fun in greybox (M2) before the art and audio passes.

---

## 10. Inconsistencies found between the two source docs

1. **The Operator** catch: game-loop doc says "board member adds extra crisis cards"; content doc says "morale drains 10% faster".
2. **Hype Fund** catch: "sentiment decays faster" vs "sentiment gains -25%".
3. **Brand Angel** catch: "slower hiring" vs "hire costs +20%".
4. **Run end**: Zombie Startup "survived to 30 min" vs final deadline 32:00.
5. **Card timer**: 10 to 20 s vs a fixed 15 s.
6. **Channel staff requirement** is mentioned in the loop doc but no channel has one in the content doc.
7. **Team upgrades** (training, tools, better desks) are in the loop doc but have no numbers.
8. **Paid ads unlock** says "Act 2" while every other unlock uses a user count.

---

## 11. Open questions

- **Q1** Host: itch.io, GitHub Pages, or both?
- **Q2** Build the project in this OneDrive folder, or a short non-synced path (e.g. `C:\Games\launch-week`)?
- **Q3** Sim tick rate: 10 Hz or 20 Hz?
- **Q4** Combined multiplier floor and ceiling values?
- **Q5** Does the run clock pause while a menu or card is open, or only the card timer?
- **Q6** Numbers for channel risks: Twitter spike size, Creator burst odds, Partnership events?
- **Q7** Tap quality and spam penalty: how is "low content quality" measured, and how much sentiment does it cost?
- **Q8** Comeback bonus: what counts as a "big crash", buff size and length?
- **Q9** Act change trigger: time (10:00 / 20:00) or checkpoint (Seed / Series B)?
- **Q10** Lowest target device?
- **Q11** Any analytics or leaderboard?
- **Q12** Does the player name the company?
- **Q13** Share card: download PNG only, or also native share sheet (Web Share API)?
- **Q14** Base resolution 180x320 OK, or larger (e.g. 270x480) for more readable text?
- **Q15** Palette preference: a known one (endesga32, sweetie16, pico8) or custom brand colours?
- **Q16** Font: pxl's built-in pixel font or a licensed bitmap font?
- **Q17** Endings: 7 unique jingles or 3 grouped?
- **Units**: what do "S +5", "R +40" and "M -5" mean in card effects? Proposed: S in 0.01x steps (S +5 = +0.05x), R as raw Reach points where Reach 100 = 2x buff, M in percentage points.
