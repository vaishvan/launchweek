# Tuning notes (v0.1.0)

Where the build differs from `launch-week-content.md` v1, and why. All numbers live in `src/data/*.json`.
Balance is checked with bots: `npx vitest run --config tools/balance/vitest.balance.ts --silent=false`
(env `BOTS=pace,idler,tapper,chaos,acquire`, `SEEDS=N`, `TAP=taps per second`).

## Results with the current numbers
Target since 2026-10-29: a casual player (1.5 taps/s) finishes in about 15 real minutes.
| Player | Result |
|---|---|
| Casual, 1.5 taps/s | 1M in 14-16 min, IPO Bell, tap share ~17% |
| Steady, 2.5 taps/s | 1M in 11.5-13.5 min, tap share ~26% |
| Fast tapper, 3 taps/s | 1M in 10.5-11.5 min |
| Random card choices (chaos bot) | 1M in 14-15 min |
| Taps only / idle only | Zombie Startup (115-555K) |

## 15-minute retime (2026-10-29, on top of the 20-minute one)
| What | Was | Now | Why |
|---|---|---|---|
| All times (deadlines, card `at`, grace, hard end) | hard end 21:20 | x0.8, hard end 17:00 | Keep deadlines meaningful for a faster run |
| Income per user | $0.0011/s | $0.0022/s | Owner: more money earned; casual should finish in ~15 min |
| `priceScale` | 0.7 | 0.3 | Income alone left casual players stuck before the big channels |

## 20-minute retime (2026-10-29)
| What | Was | Now | Why |
|---|---|---|---|
| Hard end, checkpoint deadlines, card `at` times, early-hire grace | 32:00 etc. | x2/3 (hard end 21:20) | Owner wants ~20 min runs |
| Income per user | $0.0006/s | $0.0011/s | Faster economy to fit the shorter clock |
| `priceScale` | 1 | 0.7 | Cheaper hires, channels and upgrades |
| `injectionScale` | 0.3 | 0.4 | Bigger investor cash at each checkpoint |
| Landing page | 1.5 users/s | 2.5 users/s | Faster first minute |
| Start cash | $250 | $1,000 | Owner wants more money up front; bots: steady 17.5-20 min, fast 15-16 min, casual 570-690K |
User-count card triggers (`atUsers`) and checkpoint user targets are unchanged.

## Changes from the content doc (and why)
| What | Doc | Build | Why |
|---|---|---|---|
| Income per user | $0.002/s | $0.0006/s (now $0.0011/s, see retime) | With doc values a bot reached 1M in 6 minutes |
| Prices | base cost | base x (base/100)^0.75 (upgrades ^0.3) | Cheap items keep doc prices (first buys in seconds); expensive ones grow faster to slow the late game |
| Checkpoint cash and loans | as listed | x0.3 | Injections were worth 10+ minutes of income |
| Card cash rewards | as listed | x0.5 | Same reason; card costs are unchanged |
| Combo bonus | +10% | max +10% at full meter | Doc's intent; fill 2.5%/tap, a Launch Moment every 40 taps |
| Tap value | flat | flat + 8% of users/sec per tap | Keeps tapping relevant all run (doc pillar); gives the 25-35% tap share |
| Synergy | +25% per hire | +15% per hire | 10 matching hires on Paid ads was x3.5 output |
| Hire copy cost | x1.5 | x1.8 | Late game was too fast |
| Channel level cost | x1.4 | x1.6 | Late game was too fast |
| Landing page | (start state) | 1.5 users/s | "A landing page" at start; makes early pace less tap-dependent |
| Crisis cards | by time only | by time or a user count, whichever comes first, 25 s apart | Fast players otherwise finish before Act 3 cards |
| Missed checkpoint after 3 loans | (unspecified) | no loan, run continues | Doc: Shutdown is "3 loans and cash at 0 again", not a 4th miss |

## Open questions from the PRD, answered with defaults
| Q | Default used |
|---|---|
| Q3 tick | 20 Hz fixed step |
| Q4 multiplier caps | 0.3x floor, 6x ceiling |
| Q5 clock pause | clock runs during cards; pauses on checkpoint review, loans, the Pause button |
| Q6 channel risks | Twitter x0.5-1.8 every 5 s; Creator 35% burst every 15 s; Partnerships x1.6 for 20 s every minute (x0.8 otherwise); SEO +sentiment, Paid ads -sentiment |
| Q7 spam | more than 9 + 2 x quality taps in 1 s costs 0.0015 sentiment per tap |
| Q8 comeback | 8% drop within 30 s -> +30% growth for 20 s (90 s cooldown) |
| Q9 acts | change on Seed and Series B (pass or miss) |
| Q12 company name | random satirical name, re-rollable on the title screen |
| Q13 share | Web Share sheet where supported, otherwise PNG download (6x upscale) |
| Q14 resolution | 180x320, FIT scaling |
| Q15 palette | custom hue-shifted ramps (`assets_src/art/pal.px.js`) |
| Q16 font | pxl's 3x5 pixel font as a proportional bitmap font |
| Q17 endings audio | 3 jingles (good / mixed / bad) |
| Units | S 1 = 0.01x sentiment; R 1 = +1% hype buff (cards hold 20 s, decay 40 s); M 1 = 1 morale point |
| Doc conflicts | Content doc wins (Operator: morale drains 10% faster; Hype Fund: sentiment gains -25%; Brand Angel: hires +20%); run hard-ends at 17:00 |
