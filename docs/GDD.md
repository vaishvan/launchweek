# Launch Week: Game Design Document

> Living document. Short beats complete. Update with `/gdd-sync` when reality diverges from this page.
> Last reviewed: 2026-10-29

## Identity
- **Working title:** Launch Week (a codename is fine, do not spend time on the name yet)
- **One-line pitch:** A one-sitting pixel idle tycoon: grow an AI startup to 1,000,000 users in about 30 minutes while crisis cards (bad tweets, ghosting partners, free competitors) bite.
- **Genre:** Idle / incremental tycoon with timed decision cards
- **Perspective:** 2D pixel art, office cross-section (portrait, mobile-first, 180x320)
- **Reference games:** Tiny Tower (stacked floors), Reigns (swipe-speed decisions), Cookie Clicker (tap + idle)
- **The twist:** a finite 30-minute run with funding deadlines, investor terms and multiple satirical endings, instead of an endless idler

## Pillars (3 max)
Pillars decide arguments. If a feature does not serve one, it goes to the Parking lot.
1. **One sitting**: about 30 minutes start to ending; no saves, no offline progress
2. **The engine hums, the events bite**: idle growth is the calm, crisis cards are the drama
3. **Everything costs something; your choices pick your ending**

## Core loop
```
tap SHIP / buy hires+channels -> users and cash grow -> crisis card or funding check -> pick an option or term -> back to growing
```
Time per loop: ~15-60 seconds. The fun must be present in this loop before anything else gets built.

Loop at three time scales (if you cannot fill all three, the game's structure is not clear yet):
| Scale | What the player does | Why they keep going |
|---|---|---|
| Every ~30 seconds | | |
| Every ~10 minutes | | |
| Whole session | | |

## Player fantasy and target audience
- Fantasy: 
- Audience: 
- Comparable games (2 to 3) and what we do differently: 

## Scope tiers
| Tier | Contents | Done means |
|---|---|---|
| **Toy** | Core mechanic playable in a gray box | Someone wants to keep playing for 2 minutes |
| **Vertical slice** | 1 polished level or loop, art, audio, UI, save | Looks and feels like the final game |
| **MVP / Release** | Minimum content that makes a shippable product | Passes `/release-check` |
| **Stretch** | Everything else | Only after release scope is locked |

Current tier: **Vertical slice** (full 30-minute run playable with final-style art and audio; needs human playtests)

Claude scopes work by this line (SOP-08 "Tiers"). Move it with `/next-tier` when the tier's "Done means" is met.

## Source design docs
Full design and numbers: `docs/design/launch-week-game-loop.md`, `docs/design/launch-week-content.md`, technical PRD `docs/design/LAUNCH_WEEK_TECH_PRD.md`, tuning changes `docs/design/TUNING_NOTES.md`.

## Content list (MVP)
| Item | Count | Status |
|---|---|---|
| Levels / areas | | |
| Enemies / obstacles | | |
| Player abilities | | |
| Music tracks | | |
| SFX sets | | |

## Systems overview
List each system in one line and link to `ARCHITECTURE.md` for how it is built.
Mark which ones the **vertical slice** needs. Everything marked "no" waits, otherwise the AI invents assumptions you never tested.
| System | One line | In the vertical slice? |
|---|---|---|
| Health and damage | | yes |
| Weapons / abilities | | one only |
| Enemies and bosses | | 1 or 2 types, 1 boss |
| XP, skill trees, economy, world map, save | | no |

## Controls
| Action | Keyboard/Mouse | Gamepad |
|---|---|---|
| | | |

## Tunables that define feel
List the numbers that make the game feel right (gravity, jump height, coyote time, hit stop, camera lag).
These live in data, not code. File: `<path to tuning data>`

## Art and audio direction
- Style, tone, and the kinds of enemies/NPCs the player sees: 
- Palette / resolution / camera: 
- Music mood and references (see `RESOURCES.md`): 
- SFX style: 
- Fill the style fragments in `BRIEFS.md` from this section.

## First-time user experience (FTUE, from E05 in `docs/EVIDENCE.md`)
Teach the mechanics by playing, not by a wall of text. Example from a shipped browser game: level 1 introduces the basic tool, level 2 forces the harder tool (a stain the basic tool cannot clear), level 3 adds the timer. Lock out advanced options until the lesson is passed.
| Lesson | Mechanic taught | How we know they got it |
|---|---|---|
| 1 | | |

## Platform and engine target
- Engine: see `ENGINE.md`. Storefront: <Steam first is the simple default; web (itch.io) or handheld targets change input and performance budgets>.
- Input: <keyboard + mouse / controller / both>

## Assumptions to test (feeds the vertical slice)
Write these BEFORE building so you know what the slice is for.
| Assumption | How we will know (observable) |
|---|---|
| The hook comes through in the first minutes | |
| The core mechanic feels good | |
| The art style works | |
| The setting carries a full game | |

## Risks and unknowns
| Risk | Why it matters | How we test it cheaply |
|---|---|---|
| | | |

## Out of scope (explicit)
- 
