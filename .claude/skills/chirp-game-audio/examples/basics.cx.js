// Basics: chip sound effects, a variant, layering, effects, a song and an audio-sprite bank.

// A coin: two quick square blips, the second a fourth higher.
sfx("coin", { vol: 0.5 },
  tone({ wave: "square", freq: "B5", dur: 0.06, env: [0.001, 0.02, 0.6, 0.02], duty: 0.25 }),
  at(0.06, tone({ wave: "square", freq: "E6", dur: 0.2, env: [0.001, 0.05, 0.5, 0.18], duty: 0.25 })))
sfx("coin_big", { base: "coin", pitch: -5 })                          // variant: 1 line

// A jump: a fast upward exponential slide.
sfx("jump", { vol: 0.5 },
  tone({ wave: "square", freq: 180, to: 620, slide: 0.16, dur: 0.16, env: [0.002, 0.08, 0.4, 0.06], duty: 0.4 }))

// A laser: high saw diving down, with a little delay.
sfx("laser", { vol: 0.4, fx: [delay({ time: 0.06, feedback: 0.3, mix: 0.25 })] },
  tone({ wave: "saw", freq: 1800, to: 160, slide: 0.18, dur: 0.18, env: [0.001, 0.1, 0.3, 0.05] }))

// A hit: noise crack + a short low thump.
sfx("hit", { vol: 0.7 },
  noise({ dur: 0.04, env: [0.001, 0.06, 0, 0.05], filter: { type: "bp", cutoff: 2200, q: 0.8 } }),
  tone({ wave: "triangle", freq: 140, to: 60, dur: 0.08, env: [0.001, 0.08, 0, 0.05] }))

// An explosion: brown noise with a closing filter, a sub drop, crushed and driven.
sfx("explosion", { vol: 0.8, fx: [crush({ bits: 8, rate: 16000 }), drive({ amount: 1.6 })] },
  noise({ color: "brown", dur: 0.5, env: [0.002, 0.2, 0.5, 0.6], filter: { type: "lp", from: 4000, to: 150 } }),
  tone({ wave: "sine", freq: 110, to: 35, dur: 0.4, env: [0.001, 0.2, 0.4, 0.3], vol: 0.9 }))

// A power-up: arpeggiated major chord sweeping up, with vibrato.
sfx("powerup", { vol: 0.45, fx: [reverb({ size: 0.4, mix: 0.2 })] },
  tone({ wave: "square", freq: "C5", to: "C6", dur: 0.5, arp: { notes: [0, 4, 7, 12], rate: 0.04 }, env: [0.005, 0.1, 0.6, 0.2], duty: 0.3 }))

sfx("select", { vol: 0.4 }, tone({ wave: "triangle", freq: "A5", dur: 0.04, env: [0.001, 0.03, 0.3, 0.04] }))

// A tiny loop: 2 bars of bass, lead and drums.
inst("lead", { wave: "square", duty: 0.25, env: [0.005, 0.08, 0.5, 0.08], vol: 0.25, vibrato: { rate: 6, depth: 0.15, delay: 0.1 } })
inst("bass", { wave: "triangle", env: [0.003, 0.05, 0.8, 0.04], vol: 0.5 })
song("loop", { bpm: 128, vol: 0.55, fx: [reverb({ size: 0.3, mix: 0.12 })] },
  track("lead", "E5 . G5 . A5 - - . | B5 . A5 . G5 - E5 . | D5 . E5 . G5 - - . | E5 - - - . . . ."),
  track("bass", "A2 . A3 . A2 . A3 . | F2 . F3 . F2 . F3 . | G2 . G3 . G2 . G3 . | E2 . E3 . E2 . E3 ."),
  track("kick", "x . . . x . . . | x . . . x . . ."),
  track("snare", ". . . . x . . . | . . . . x . . x"),
  track("hat", ". . x . . . x . | . . x . . . x x"))

bank("sfx", ["coin*", "jump", "laser", "hit", "explosion", "powerup", "select"])
