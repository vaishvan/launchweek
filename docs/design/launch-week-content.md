# Launch Week: Content and Numbers (v1)

Companion to `launch-week-game-loop.md` (v2). Everything here is a **starting value**. Tune in playtest.

Abbreviations: **U** users, **C** cash, **S** sentiment, **R** reach, **M** morale.

---

## 1. Growth curve (target pace)

If the player plays at a sensible pace, they should be near these numbers. Faster players finish early; slower ones get bridge loans.

| Minute | Users | Income (cash/sec) | What the player should have |
|---|---|---|---|
| 1 | 150 | 0.3 | Templates, first hire |
| 3 | 1,000 | 2 | Pre-seed checkpoint. 2 hires, Twitter, Reddit |
| 5 | 3,500 | 7 | SEO, first Bad Tweet card |
| 7 | 6,500 | 13 | Newsletter, 4 hires |
| 10 | 10,000 | 20 | Seed checkpoint. Act 1 ends |
| 12 | 20,000 | 40 | Referral, Ship Pipeline |
| 14 | 35,000 | 70 | Creator deals |
| 16 | 50,000 | 100 | Series A checkpoint |
| 18 | 100,000 | 200 | Paid ads, 5 hires |
| 20 | 200,000 | 400 | Series B checkpoint. Act 2 ends |
| 22 | 300,000 | 600 | Partnerships, Demo Machine |
| 25 | 500,000 | 1,000 | Series C checkpoint |
| 28 | 750,000 | 1,500 | Viral Hooks |
| 30 | 1,000,000 | 2,000 | Final checkpoint |

**Income rule:** `cash/sec = users x $0.002 x revenue multiplier`.
**Tap share:** taps should be about 25 to 35% of total growth through the whole run.

### Checkpoints

| Checkpoint | User target | Deadline | Cash injection on pass | Investor term? |
|---|---|---|---|---|
| Pre-seed | 1,000 | 4:00 | $1,000 | Yes |
| Seed | 10,000 | 11:00 | $8,000 | Yes |
| Series A | 50,000 | 17:30 | $40,000 | Yes |
| Series B | 200,000 | 22:00 | $150,000 | Yes |
| Series C | 500,000 | 27:00 | $500,000 | Yes |
| Final | 1,000,000 | 32:00 | none | No, run ends |

A checkpoint triggers the moment the target is hit. If the deadline passes first, it counts as a **miss** (bridge loan).

### Bridge loan
- Advance: 50% of that checkpoint's normal injection.
- Penalty: output -15% until the next checkpoint is passed.
- Repayment: the advance is deducted from the next injection.
- 3 loans plus cash at 0 again = **Shutdown**.

---

## 2. Team (6 hires)

Each role can be hired up to 5 times. Cost grows x1.5 per copy.

| Hire | Base cost | Salary/sec | Base output (u/s) | Boosts |
|---|---|---|---|---|
| Marketer | $200 | 0.5 | 2 | Twitter/X, Paid ads |
| Community Manager | $400 | 0.8 | 3 | Reddit, Newsletter |
| SEO Writer | $600 | 1.0 | 4 | SEO, Newsletter |
| Designer | $1,000 | 1.5 | 5 | Tap quality, Creator deals |
| Data Analyst | $2,500 | 3.0 | 8 | Paid ads, Referral |
| Engineer | $5,000 | 5.0 | 15 | Referral, Partnerships, Demo Machine |

**Synergy rule:** each matching hire adds +25% to the boosted channel's output.
**Morale:** drops if total salary exceeds 60% of income for more than 30 seconds.

---

## 3. Channels (8)

Cost grows x1.4 per level. Max level 8.

| Channel | Unlock | Base cost | Output (u/s per level) | Risk |
|---|---|---|---|---|
| Twitter/X | Start | $100 | 3 | Spiky. Feeds Bad Tweet chances |
| Reddit | 500 users | $300 | 5 | Low |
| SEO | 1,000 users | $500 | 4 | Safe. +S slowly |
| Newsletter | 3,000 users | $1,200 | 8 | Safe |
| Referral program | 10,000 users | $4,000 | 25 | Medium |
| Creator deals | 25,000 users | $10,000 | 60 | High variance (random bursts) |
| Paid ads | Act 2 | $15,000 | 150 | -S while active |
| Partnerships | 100,000 users | $60,000 | 400 | Tied to partner events |

---

## 4. Tap upgrades (5)

Base tap: +1 user, combo +10%. Target tap rate is about 3 per second.

| Upgrade | Cost | Effect |
|---|---|---|
| Content Templates | $150 | Tap +3 |
| Ship Pipeline | $2,000 | Tap +15, combo fills 25% faster |
| Launch Playbook | $12,000 | Launch Moments last 2x |
| Demo Machine | $50,000 | Tap +60 (needs 1 Engineer) |
| Viral Hooks | $200,000 | Tap +150, every 10th tap fires a mini Launch Moment |

**Launch Moment:** Reach +25 for 10 seconds (decays over 30).

---

## 5. Crisis cards (12, scripted)

Timer 15 seconds. Pauses when a menu is open. Default fires on timeout.

### Act 1: Launch

**1. The Early Bird** (about 1:30)
A tech creator posted a 40-second demo before you even launched.
- Pay $300 to pin it: R +40, U +300, S -5 *(chains to card 6)*
- Collab on a thread: R +25, S +5, M -5
- Thank them and move on: S +8, R +10
- *Default:* R +10

**2. The Bad Tweet** (about 5:00)
The company account posts "AI will replace growth teams lol".
- Delete and apologize: S -5
- Double down ("it's a bit"): R +50, S -20 *(chains to card 10)*
- Ignore it: S -12, small churn
- *Default:* Ignore it

**3. The Partner Ghost** (about 7:30)
SynergyCorp, your co-launch partner, pulls out two days before launch.
- Renegotiate ($2,000): keeps the launch, no change to stats
- Replace with a smaller partner ($500): R +10, U +400
- Go solo and subtweet them: R +30, S -10
- *Default:* R -10, M -8

**4. Term Sheet Drama** (about 9:30)
A seed investor will fund you only if you "pivot to agents."
- Pivot: C +$10,000, S -5
- Decline: M +10
- Negotiate: 50% C +$5,000, 50% investor walks and R -10
- *Default:* Decline

### Act 2: Scale

**5. Hallucination Screenshot** (about 12:00)
Your product told a user the capital of Australia is Sydney, then fired them.
- Own it with a meme: R +40, S +5, M +5
- Quiet patch: S -8
- Blame the model vendor: R +10, S -15
- *Default:* S -15

**6. The Creator Wants a Raise** (about 14:00)
*(If you paid in card 1; otherwise a bigger creator cold-DMs you.)*
- Pay $10,000: R +60, U +2,000
- Refuse: R -10
- Offer equity: R +40, U +1,500, cash income -5% permanently
- *Default:* Refuse

**7. Burnout Under the Desk** (about 16:30)
Your best engineer is asleep under their desk with a keyboard for a pillow.
- Mandatory week off: M +25, output -20% for 30 seconds
- Push through: M -20, output +30% for 60 seconds
- Hire a contractor ($5,000): M +10
- *Default:* M -10

**8. The Press Call** (about 18:30)
A tech blogger wants a quick interview about "your journey."
- Take the call: weighted by S. Good roll: R +60, S +10. Bad roll: S -15
- Send the founder: R +20, M -5
- No comment: no change
- *Default:* No comment

### Act 3: Empire

**9. The Free Competitor** (about 21:00)
NeoMind, a big lab, announces a free rival and calls it "democratizing."
- Counter-launch ($20,000): R +50, M -5
- Price war: U +20,000, income -20% for 2 minutes
- Ignore it: lose 3% of users, S -5
- *Default:* Ignore it

**10. The Pile-On** (about 23:00)
A headline reads "Move Fast, Break Everything." *(If you doubled down in card 2, penalties on this card are doubled.)*
- Public apology: S +8, R -10
- Transparency report ($8,000): S +12, M +5
- Hit back with a thread: R +40, S -20
- *Default:* S -15

**11. The Acquisition Offer** (about 26:00)
A big lab wants to buy you for "an undisclosed number with a lot of zeros."
- Accept: run ends, **Acquired** ending
- Counter-offer: 50% the offer improves (still ends the run if accepted), 50% they walk
- Decline publicly: R +50, S +10, M -5
- *Default:* Decline publicly

**12. Launch Day Meltdown** (about 29:00)
A traffic spike is melting your servers.
- Emergency infra ($50,000): safe, U +10,000
- Throttle signups: S +5, growth -30% for 30 seconds
- Let it ride: R +80, 50% outage (S -25)
- *Default:* Let it ride (outage roll applies)

---

## 6. Investor terms (8)

At each of 5 checkpoints, 3 random terms are offered from the remaining pool. Pick one. It lasts for the run.

| Term | Perk | Catch |
|---|---|---|
| Growth VC | Channel output +20% | Next target +15% |
| Brand Angel | Sentiment never below 0.8x | Hire costs +20% |
| The Operator | Hire costs -25% | Morale drains 10% faster |
| Hype Fund | Launch Moments last 2x | Sentiment gains -25% |
| Revenue Partners | Cash income +30% | Tap power -15% |
| The Accelerator | Tap power +25%, combo fills faster | Channel unlock costs +20% |
| Patient Capital | Bridge loans are interest-free | Checkpoint injections -40% |
| Nepo Baby Fund | Injections +100% | Card default penalties x1.5 |

---

## 7. Endings

Checked in this order:

| Ending | Condition | Epitaph |
|---|---|---|
| **Shutdown** | 3 loans and cash at 0 again, or S < 0.6x and M < 15% | "Ran out of runway, then ran out of excuses." |
| **Acquired (early exit)** | Accept card 11 | "Sold for a number with a lot of zeros and a lot of lawyers." |
| **Scandal Rocket** | 1M users and S < 0.8x | "A million users, none of whom would say your name out loud." |
| **Burnout Unicorn** | 1M users and M < 25% | "A million users and one very tired team." |
| **Acquired (big lab)** | 1M users and 2+ loans | "Rescued by the same company you called a competitor." |
| **IPO Bell** | 1M users, otherwise | "Rang the bell. Nobody asked about the Bad Tweet." |
| **Zombie Startup** | 32:00 passes under 1M | "Still technically alive. Still technically a startup." |

### Share card (vertical)
- Ending title and pixel icon
- Final users, total time, number of loans taken
- Checkpoints passed (shown as 5 pips)
- One-line epitaph
- Company name and "Launch Week" logo
