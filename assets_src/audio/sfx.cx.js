// Launch Week: sound effects. Retro chip palette (pulse waves, chip noise) to match the pixel art.
// Peaks kept around -6 to -12 dBFS; similar sounds at similar levels.

// ---- tapping
sfx("tap", { vol: 0.32 }, tone({ wave: "square", duty: 0.25, freq: "C5", to: "G5", slide: 0.03, dur: 0.035, env: [0.001, 0.02, 0.4, 0.03] }))
sfx("tap_2", { base: "tap", pitch: 2 })
sfx("tap_3", { base: "tap", pitch: 4 })
sfx("combo_full", { vol: 0.35 }, tone({ wave: "square", duty: 0.125, freq: "C5", dur: 0.3, arp: { notes: [0, 4, 7, 12], rate: 0.04 }, env: [0.002, 0.05, 0.6, 0.12] }))
sfx("launch", { vol: 0.42, fx: [delay({ time: 0.09, feedback: 0.3, mix: 0.25 })] },
  noise({ color: "white", dur: 0.6, env: [0.01, 0.3, 0.3, 0.3], filter: { type: "bp", from: 400, to: 4000, q: 1.5 }, vol: 0.5 }),
  tone({ wave: "square", duty: 0.25, freq: "C4", to: "C6", slide: 0.5, dur: 0.5, env: [0.01, 0.1, 0.5, 0.2], vol: 0.6 }),
  at(0.45, tone({ wave: "triangle", freq: "C6", dur: 0.25, arp: { notes: [0, 7, 12], rate: 0.05 } })))
sfx("mini_launch", { vol: 0.28 }, tone({ wave: "square", duty: 0.25, freq: "G5", to: "C6", slide: 0.08, dur: 0.1 }))

// ---- economy
sfx("buy", { vol: 0.38 },
  tone({ wave: "square", duty: 0.5, freq: "E5", dur: 0.05, env: [0.001, 0.02, 0.6, 0.02] }),
  at(0.05, tone({ wave: "square", duty: 0.5, freq: "A5", dur: 0.12, env: [0.001, 0.04, 0.5, 0.1] })))
sfx("hire", { vol: 0.38 },
  tone({ wave: "square", duty: 0.25, freq: "C5", dur: 0.06 }), at(0.07, tone({ wave: "square", duty: 0.25, freq: "E5", dur: 0.06 })),
  at(0.14, tone({ wave: "square", duty: 0.25, freq: "G5", dur: 0.16, env: [0.001, 0.05, 0.5, 0.12] })))
sfx("upgrade", { vol: 0.36, fx: [reverb({ mix: 0.15 })] }, tone({ wave: "fm", fm: { ratio: 3.5, index: 3, decay: 0.3 }, freq: "E5", dur: 0.12 }), at(0.1, tone({ wave: "fm", fm: { ratio: 3.5, index: 3, decay: 0.3 }, freq: "B5", dur: 0.3 })))
sfx("unlock", { vol: 0.36 }, tone({ wave: "triangle", freq: "G4", dur: 0.4, arp: { notes: [0, 5, 9, 12], rate: 0.06 } }), tone({ wave: "square", duty: 0.125, freq: "G5", dur: 0.4, arp: { notes: [0, 5, 9, 12], rate: 0.06 }, vol: 0.3 }))
sfx("cant_afford", { vol: 0.3 }, tone({ wave: "square", duty: 0.5, freq: "A3", to: "E3", slide: 0.12, dur: 0.14, env: [0.001, 0.05, 0.6, 0.05] }))
sfx("cash_in", { vol: 0.4 },
  tone({ wave: "square", duty: 0.25, freq: "B5", dur: 0.05 }), at(0.05, tone({ wave: "square", duty: 0.25, freq: "E6", dur: 0.2, env: [0.001, 0.05, 0.5, 0.15] })),
  at(0.12, tone({ wave: "square", duty: 0.25, freq: "B5", dur: 0.05, vol: 0.5 })), at(0.17, tone({ wave: "square", duty: 0.25, freq: "E6", dur: 0.25, vol: 0.5 })))

// ---- UI
sfx("click", { vol: 0.25 }, tone({ wave: "square", duty: 0.25, freq: "A5", dur: 0.02, env: [0.001, 0.01, 0.3, 0.02] }))
sfx("tab", { vol: 0.28 }, tone({ wave: "triangle", freq: "E5", to: "A5", slide: 0.04, dur: 0.05 }))
sfx("open", { vol: 0.28 }, tone({ wave: "triangle", freq: "C5", to: "G5", slide: 0.08, dur: 0.08 }))
sfx("close", { vol: 0.28 }, tone({ wave: "triangle", freq: "G5", to: "C5", slide: 0.08, dur: 0.08 }))

// ---- cards
sfx("card_in", { vol: 0.4, fx: [reverb({ mix: 0.15 })] },
  noise({ dur: 0.15, env: [0.002, 0.1, 0.2, 0.05], filter: { type: "hp", cutoff: 3000 }, vol: 0.3 }),
  tone({ wave: "square", duty: 0.25, freq: "E5", dur: 0.08 }), at(0.09, tone({ wave: "square", duty: 0.25, freq: "C5", dur: 0.08 })), at(0.18, tone({ wave: "square", duty: 0.25, freq: "E5", dur: 0.18 })))
sfx("tick", { vol: 0.22 }, noise({ freq: 8000, dur: 0.015, env: [0.001, 0.01, 0.2, 0.01] }), tone({ wave: "square", freq: 1800, dur: 0.012 }))
sfx("select", { vol: 0.34 }, tone({ wave: "square", duty: 0.25, freq: "G5", dur: 0.05 }), at(0.05, tone({ wave: "square", duty: 0.25, freq: "D6", dur: 0.12 })))
sfx("default_fired", { vol: 0.36, fx: [crush({ bits: 6 })] }, tone({ wave: "saw", freq: "F3", dur: 0.35, env: [0.002, 0.1, 0.7, 0.1], vibrato: { rate: 14, depth: 0.6 } }))
sfx("roll_good", { vol: 0.36 }, tone({ wave: "square", duty: 0.25, freq: "C5", dur: 0.35, arp: { notes: [0, 4, 7, 12, 16], rate: 0.05 } }))
sfx("roll_bad", { vol: 0.36 }, tone({ wave: "square", duty: 0.5, freq: "E4", to: "A3", slide: 0.4, dur: 0.45, vibrato: { rate: 6, depth: 0.3 } }))

// ---- checkpoints and events
sfx("cp_pass", { vol: 0.3, fx: [reverb({ mix: 0.18 })] },
  ...["C5", "E5", "G5"].map((n, i) => at(i * 0.09, tone({ wave: "square", duty: 0.25, freq: n, dur: 0.08 }))),
  at(0.27, tone({ wave: "square", duty: 0.25, freq: "C6", dur: 0.5, vibrato: { rate: 6, depth: 0.15, delay: 0.15 } })),
  at(0.27, tone({ wave: "triangle", freq: "C4", dur: 0.5 })))
sfx("cp_miss", { vol: 0.38 }, ...["G4", "F#4", "F4"].map((n, i) => at(i * 0.18, tone({ wave: "square", duty: 0.5, freq: n, dur: 0.16 }))),
  at(0.54, tone({ wave: "square", duty: 0.5, freq: "E4", dur: 0.6, vibrato: { rate: 5, depth: 0.4 } })))
sfx("loan", { vol: 0.36 }, tone({ wave: "triangle", freq: "D4", dur: 0.2 }), at(0.2, tone({ wave: "triangle", freq: "A3", dur: 0.4 })), noise({ freq: 3000, dur: 0.05, vol: 0.2 }))
sfx("term_pick", { vol: 0.36, fx: [reverb({ mix: 0.2 })] }, tone({ wave: "fm", fm: { ratio: 3.5, index: 4, decay: 0.4 }, freq: "A5", dur: 0.6 }))
sfx("act_up", { vol: 0.28, fx: [reverb({ mix: 0.2 })] },
  ...["C4", "G4", "C5", "E5", "G5", "C6"].map((n, i) => at(i * 0.07, tone({ wave: "square", duty: 0.25, freq: n, dur: 0.1 }))),
  at(0.42, tone({ wave: "square", duty: 0.125, freq: "C6", dur: 0.6 })))
sfx("notify", { vol: 0.32 }, tone({ wave: "sine", freq: "A5", dur: 0.06 }), at(0.08, tone({ wave: "sine", freq: "E6", dur: 0.12 })))
sfx("burst", { vol: 0.36 }, noise({ dur: 0.3, env: [0.005, 0.2, 0.2, 0.1], filter: { type: "bp", from: 1000, to: 6000 }, vol: 0.4 }), tone({ wave: "triangle", freq: "E5", to: "E6", slide: 0.2, dur: 0.2 }))
sfx("alarm", { vol: 0.34 }, tone({ wave: "square", duty: 0.5, freq: "A5", dur: 0.6, arp: { notes: [0, -5], rate: 0.12 } }))
sfx("chime", { vol: 0.34, fx: [reverb({ mix: 0.3 })] }, ...["E5", "C5", "D5", "G4"].map((n, i) => at(i * 0.22, tone({ wave: "fm", fm: { ratio: 3.5, index: 3, decay: 0.5 }, freq: n, dur: 0.3 }))))
sfx("sigh", { vol: 0.9 }, noise({ color: "pink", dur: 0.5, env: [0.1, 0.2, 0.5, 0.2], filter: { type: "lp", from: 1500, to: 400 } }))

// ---- endings
sfx("end_good", { vol: 0.3, fx: [reverb({ mix: 0.2 })] },
  ...["C5", "C5", "C5", "C5", "Ab4", "Bb4", "C5", "Bb4", "C5"].map((n, i) => at([0, 0.12, 0.24, 0.36, 0.6, 0.84, 1.08, 1.26, 1.38][i], tone({ wave: "square", duty: 0.25, freq: n, dur: i === 8 ? 0.8 : 0.1 }))),
  at(1.38, tone({ wave: "triangle", freq: "C4", dur: 0.8 })))
sfx("end_mixed", { vol: 0.4, fx: [reverb({ mix: 0.2 })] }, ...["C5", "G4", "A4", "F4"].map((n, i) => at(i * 0.25, tone({ wave: "square", duty: 0.25, freq: n, dur: i === 3 ? 0.7 : 0.2 }))))
sfx("end_bad", { vol: 0.4 }, ...["C5", "B4", "Bb4", "A4"].map((n, i) => at(i * 0.35, tone({ wave: "square", duty: 0.5, freq: n, dur: i === 3 ? 1.0 : 0.3, vibrato: i === 3 ? { rate: 5, depth: 0.4 } : undefined }))))

bank("sfx_bank", ["*"])
