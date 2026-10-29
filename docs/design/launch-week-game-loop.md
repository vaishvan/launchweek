# Launch Week: Growth Lead (Game Loop Doc, v2)

A one-sitting idle tycoon about growing an AI startup to **1,000,000 users in about 30 minutes**. Vertical, mobile-first, web-based, retro pixel art.

Seed idea: a creator posts early, a bad tweet appears, a partner pulls out. Every choice moves reach, sentiment and budget.

**v2 changes:** one company, one continuous run (no resets), 3 acts of about 10 min, soft fail, multiple endings with a share card. Offline progress and retention hooks are cut because the game is a single sitting.

---

## 1. Pillars

1. **One sitting.** About 30 minutes, start to ending. No saves needed, no offline play.
2. **The engine hums, the events bite.** Idle growth is the calm; crisis cards are the drama.
3. **Everything costs something.** Growth trades against sentiment, morale or cash.
4. **Your choices pick your ending.**

---

## 2. Setup

- **Company:** an AI startup. Only one for now; other company types can be added later.
- **Role:** you're the growth lead, the first non-founder hire.
- **Start state:** a tiny office, one desk, a little cash, 0 users, a landing page.
- **Tone:** startup satire. Dry, self-aware humor about founders, VCs, AI hype and Twitter drama.

---

## 3. Resources

| Resource | Role | On main HUD? |
|---|---|---|
| **Users** | The score. Goal is 1,000,000. | Yes |
| **Cash** | Buys hires, channels, upgrades. Burns each second via salaries. | Yes |
| **Sentiment** | Multiplier on growth (0.5x to 2x). Low sentiment causes churn. | Yes |
| **Reach (hype)** | Temporary buff. Spikes on launches and creators, decays. | Tap-to-expand panel |
| **Morale** | Team output multiplier. Burnout stalls hires. | Tap-to-expand panel |

Growth formula:
`users/sec = (team output + channel output) x sentiment x reach buff x morale`

Guardrails against death spirals:
- The combined multiplier is capped (floor and ceiling).
- **Comeback bonus:** after a big crash, a short recovery buff kicks in.
- Cash at 0 triggers a bridge-loan card, not instant death (see section 9).

---

## 4. The idle engine: Team x Channels

**Team** (pixel employees visible at desks):
- Roles: Marketer, Community Manager, SEO Writer, Designer, Data Analyst, Engineer.
- Each hire adds base output and boosts specific channels.
- Upgrades: training, tools, better desks.
- Over-hiring on a thin budget drops morale.

**Channels** (passive generators, unlocked across the run):
- Twitter/X, Reddit, SEO, Newsletter, Referral program, Creator deals, Paid ads, Partnerships.
- Each has a level, a staff requirement, and a risk profile. Paid ads are fast but hurt sentiment; SEO is slow and safe.
- **Synergy rule:** certain hires multiply certain channels (Community Manager x Reddit, Data Analyst x Paid ads). This is the main build decision.

No offline progress. The game runs only while the player is in it.

---

## 5. Active play: Tap to ship

- A big **SHIP** button. Each tap ships content (tweet, post, demo clip, feature).
- Taps give a small user burst and fill a **combo meter**.
- A full combo triggers a **Launch Moment**: a short reach buff.
- **Tap power scales with upgrades** (e.g. Ship Pipeline, Content Templates, Launch Playbook), so tapping stays relevant to the end.
- Spammy tapping at low content quality chips away at sentiment.

---

## 6. Crisis cards

A card slides over the office. It has a **countdown (about 10 to 20 sec)**. If it runs out, the worse default fires.

- **Timer pauses** if the player opens a menu or is mid-purchase. No unfair interrupts.
- 2 or 3 choices, each with icon hints about what it affects.
- Outcome has a weighted roll. Higher sentiment improves the odds.
- Some choices unlock **follow-up cards** (chains), so decisions echo.
- Pity rule: never more than 1 severe crisis back to back.

**Categories:**
| Type | Example | Choice flavor |
|---|---|---|
| Creator | A creator posts about you early | Pay them, collab, or stay organic |
| PR crisis | A bad tweet appears | Delete, apologize, double down, ignore |
| Partner | A partner pulls out | Renegotiate, replace, go solo |
| Opportunity | Press wants an interview | Take the risk or decline |
| Internal | A team member is burning out | Give time off, push through, replace |
| Market | A big lab launches a competing model | Counter-launch, pivot, ignore |

**Volume:** about 10 to 12 cards per run (3 to 4 per act). Fewer cards, each with real stakes and consequences, beats a lot of filler.

---

## 7. Structure: 3 acts, funding checkpoints

One continuous run. No resets. Funding rounds are milestones inside each act. At each one, investors review you.

| Act | Time | Users | Checkpoints | Theme |
|---|---|---|---|---|
| **Act 1: Launch** | 0 to 10 min | 0 to 10K | Pre-seed (1K), Seed (10K) | Scrappy. First hires, first channels. |
| **Act 2: Scale** | 10 to 20 min | 10K to 200K | Series A (50K), Series B (200K) | Systems. More channels, bigger crises. |
| **Act 3: Empire** | 20 to 30 min | 200K to 1M | Series C (500K), Final (1M) | Chaos. Huge stakes, big-lab drama. |

*(Targets and timing are placeholders until we model the growth curve.)*

Each act brings:
- A new office floor (visual progress).
- New channels and roles unlocked.
- A higher tier of crisis cards.

---

## 8. Funding checkpoints and investor terms

At each checkpoint, a review screen shows users, sentiment, cash health and morale.

- **Pass:** you get a cash injection and pick **1 of 3 investor terms**. Terms are permanent for the rest of the run.
- Each term has a perk and a catch. Examples:
  - **Growth VC:** +20% channel output, but a higher next target.
  - **Brand Angel:** a sentiment floor, but slower hiring.
  - **The Operator:** cheaper hires, but a board member adds extra crisis cards.
  - **Hype Fund:** longer launch moments, but sentiment decays faster.
- Terms and catches are balanced so no single term wins every time.

---

## 9. Failure: soft fail with bridge loan

- **Miss a target or hit 0 cash:** a bridge-loan card appears. You take the loan and continue.
- Loan effects: a debt penalty (e.g. reduced output or tighter burn) that lasts until the next checkpoint is passed.
- **Hard stop (shutdown ending)** only if you've taken multiple loans and collapse again, or sentiment and morale both hit the floor.

---

## 10. Endings and share card

Ending depends on final stats and the choices made during the run.

| Ending | Roughly when |
|---|---|
| **IPO Bell** | 1M users, healthy cash and sentiment |
| **Acquired by a Big Lab** | 1M users, but with debt or low morale; or an offer you accept earlier |
| **Burnout Unicorn** | 1M users, but morale ends near zero |
| **Scandal Rocket** | 1M users, but sentiment crashed |
| **Zombie Startup** | Survived to 30 min below 1M |
| **Shutdown** | Hard fail |

The end screen shows a **shareable score card**: ending title, final users, time taken, key choices, a one-line satirical epitaph.

---

## 11. Presentation

- **Vertical, mobile-first.** One-hand play, thumb-reachable controls at the bottom.
- **Pixel-art office cross-section:** floors stack vertically. Employees visible at their desks. The office grows with each act.
- **Main HUD:** Users, Cash, Sentiment. Reach and Morale live in a tap-to-expand panel.
- **Bottom bar:** SHIP button, tabs for Team, Channels, Upgrades.
- Crisis cards slide over the office.
- Chiptune loop, tap blips, event stingers.

---

## 12. Session flow

1. Start: short intro card, empty office, tap SHIP.
2. Spend first cash on a hire, then a channel.
3. A crisis card hits. Decide before the timer ends.
4. Hit a checkpoint. Review, pick an investor term.
5. Act ends, the office upgrades, harder events begin.
6. Reach the finale. Ending screen and share card.

---

## 13. Content and numbers

See `launch-week-content.md`: growth curve, checkpoints, team, channels, tap upgrades, the 12 scripted crisis cards, 8 investor terms, endings and share card.

## 14. Still open

1. Playtest tuning of all numbers (the content doc has starting values only).
2. Whether to include a short tutorial, or teach through the first act.
3. Art and sound asset list (for the toolkit handoff).
