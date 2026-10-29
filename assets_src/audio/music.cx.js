// Launch Week: music. Four seamless chiptune loops: title, Act 1 (scrappy), Act 2 (busy), Act 3 (big, tense).
inst("lead", { wave: "square", duty: 0.25, env: [0.004, 0.08, 0.55, 0.06], vol: 0.22, vibrato: { rate: 5.5, depth: 0.12, delay: 0.15 } })
inst("lead2", { wave: "square", duty: 0.125, env: [0.004, 0.06, 0.5, 0.05], vol: 0.18 })
inst("bass", { wave: "triangle", env: [0.003, 0.06, 0.85, 0.04], vol: 0.5 })
inst("pad", { wave: "saw", env: [0.08, 0.2, 0.6, 0.3], vol: 0.07, filter: { type: "lp", cutoff: 1400 } })
inst("arp", { wave: "square", duty: 0.5, env: [0.002, 0.05, 0.3, 0.03], vol: 0.1 })

const roots = (prog, oct) => prog.map((c) => c.replace(/(m|7|maj|sus.)+$/, "") + oct)

// --- title: relaxed, hopeful (C major, 100 bpm)
{
  const prog = ["C", "Am", "F", "G"]
  song("mus_title", { bpm: 100, bars: 8, vol: 0.5, fx: [reverb({ mix: 0.18 }), limiter()] },
    track("pad", prog.map((c) => chord(c, 4) + " - - - - - - - - - - - - - - -").join(" | ")),
    track("bass", roots(prog, 2).map((r) => `${r} . . . ${r} . . . ${r} . . . ${r} . . .`).join(" | ")),
    track("lead", ["E5 - - . G5 - . . C6 - - . B5 - A5 .", "A5 - - . E5 - . . C5 - - . E5 - . .", "F5 - - . A5 - . . C6 - - . A5 - F5 .", "G5 - - - - - . . D5 - - . G5 - . ."].join(" | ")),
    track("hat", ". . x . . . x . . . x . . . x ."))
}

// --- act 1: scrappy garage (A minor, 118 bpm)
{
  const prog = ["Am", "F", "C", "G"]
  const A = "A4 . C5 . E5 . C5 . | F4 . A4 . C5 . A4 . | E5 . G5 . C5 . G4 . | D5 . B4 . G4 . B4 ."
  const B = "A5 - - . G5 . E5 . | F5 - - . E5 . C5 . | E5 - G5 . C6 - B5 . | B5 - - - G5 - - ."
  song("mus_act1", { bpm: 118, bars: 8, vol: 0.5, fx: [reverb({ mix: 0.12 }), limiter()] },
    track("bass", roots(prog, 2).concat(roots(prog, 2)).map((r) => `${r} . ${r} . . ${r} . .`).join(" | ")),
    track("lead2", [A, A].join(" | ")),
    track("lead", ". . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | " + B),
    track("kick", "x . . . x . . . "), track("snare", ". . x . . . x ."), track("hat", "x x x x x x x x"))
}

// --- act 2: scaling up, busier (D dorian, 128 bpm)
{
  const prog = ["Dm7", "G7", "Dm7", "Am7", "Bbmaj7", "C", "Dm7", "Am7"]
  const S = scale("D", "dorian", 5)
  const mel = [0, 2, 4, 2, 5, 4, 2, 1, 0, 1, 2, 4, 7, 6, 4, 2].map((i) => S[i % S.length]).join(" ")
  song("mus_act2", { bpm: 128, bars: 8, vol: 0.5, fx: [reverb({ mix: 0.12 }), limiter()] },
    track("pad", prog.map((c) => chord(c, 4) + " - - - - - - - - - - - - - - -").join(" | ")),
    track("bass", roots(prog, 2).map((r) => `${r} . ${r}! . ${r} . . ${r} . . ${r} . ${r} . . .`).join(" | ")),
    track("arp", prog.map((c) => { const n = chord(c, 5).split("+"); return Array.from({ length: 16 }, (_, i) => n[i % n.length]).join(" ") }).join(" | ")),
    track("lead", ". . . . . . . . . . . . . . . . | " + mel + " | . . . . . . . . . . . . . . . . | " + mel),
    track("kick", "x . . . x . . x x . . . x . . ."), track("snare", ". . . . x . . . . . . . x . . x"), track("hat", "x . x . x . x x x . x . x . x x"))
}

// --- act 3: empire, tense and big (E minor, 140 bpm)
{
  const prog = ["Em", "C", "D", "B7", "Em", "C", "Am", "B7"]
  song("mus_act3", { bpm: 140, bars: 8, vol: 0.5, fx: [reverb({ mix: 0.1 }), limiter()] },
    track("pad", prog.map((c) => chord(c, 4) + " - - - - - - - - - - - - - - -").join(" | ")),
    track("bass", roots(prog, 2).map((r) => `${r} ${r} . ${r} ${r} . ${r} . ${r} ${r} . ${r} ${r} . ${r} .`).join(" | ")),
    track("lead", ["E5 - - . B5 - . . G5 - A5 - B5 - - .", "C6 - - . B5 - A5 . G5 - - . E5 - - .", "D5 - - . F#5 - . . A5 - G5 - F#5 - - .", "D#5 - - - - - . . B4 - - . D#5 - F#5 .",
      "E5 - - . B5 - . . G5 - A5 - B5 - - .", "C6 - - . E6 - D6 . C6 - B5 . A5 - - .", "A5 - - . C6 - B5 . A5 - G5 - E5 - - .", "D#5 - - - F#5 - - - B5 - - - - - . ."].join(" | ")),
    track("arp", prog.map((c) => { const n = chord(c, 5).split("+"); return Array.from({ length: 16 }, (_, i) => n[(i * 2) % n.length]).join(" ") }).join(" | "), { vol: 0.7 }),
    track("kick", "x . . . x . . . x . . . x . x ."), track("snare", ". . . . x . . . . . . . x . . ."), track("hat", "x x x x x x x x x x x x x x x x"), track("openhat", ". . . . . . . x . . . . . . . x"))
}
