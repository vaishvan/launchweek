// Launch Week: people. Seated office workers (front view, behind a desk) and card portraits.
// Brief: tiny 16x16 startup staff, each role readable by colour + one prop:
//   growth lead = orange hoodie + headphones; marketer = blue blazer; community = green tee + headset;
//   SEO writer = purple sweater + glasses + bun; designer = black turtleneck + pink hair + beret;
//   analyst = teal shirt + glasses + ponytail; engineer = grey hoodie (hood up) + beard.
// Palette from pal.px.js; light from the top-left.
include("pal.px.js")

const SKIN = { light: "CDE", mid: "FGH", deep: "IJK" }   // dark, mid, light keys

// Template legend: H hair, h hair shadow, S skin, s skin shadow, z skin light, e eye,
// T shirt, t shirt shadow, Y shirt light, A/a accessory.
const BODY = [
  "......HHHH......",
  "....HHHHHHHH....",
  "...hHHHHHHHHH...",
  "...hHHHHHHHHH...",
  "...hzSSSSSSSh...",
  "...hzSeSSeSSh...",
  "....zSSSSSSs....",
  "....sSSSSSSs....",
  ".....sSssSs.....",
  "......ssss......",
  "...YYTTTTTTTt...",
  "..YYTTTTTTTTtt..",
  "..YTTTTTTTTTTt..",
  ".YYTTTTTTTTTTtt.",
  ".YTTtTTTTTTtTTt.",
  ".zSt........tSs.",
]

function paint(rows, map) {
  return rows.map((r) => [...r].map((ch) => (ch in map ? map[ch] : ch)).join("")).join("\n")
}
function put(rows, x, y, patch) {
  const out = rows.map((r) => [...r])
  patch.forEach((line, dy) => [...line].forEach((ch, dx) => { if (ch !== "." && out[y + dy] && x + dx < 16) out[y + dy][x + dx] = ch }))
  return out.map((r) => r.join(""))
}

const HAIR = {
  short: (r) => r,
  long: (r) => put(r, 3, 6, ["H........H", "H........H", "hH......Hh", ".h......h."]),
  bun: (r) => put(r, 6, 0, ["HHHH"]),
  pony: (r) => put(r, 12, 3, ["H.", "HH", ".H", ".h", ".h"]),
  curly: (r) => put(r, 2, 1, ["HH........HH", "H..........H", "h..........h", "h..........h", ".h........h."]),
  buzz: (r) => put(r, 3, 0, ["...hhhh...", ".hhhhhhhh.", "hhh....hhh"]),
}

const ACC = {
  none: (r) => r,
  glasses: (r) => put(r, 5, 5, ["AOAAOA"]),
  headphones: (r) => put(put(r, 4, 0, ["AAAAAAAA"]), 2, 3, ["A..........A", "a..........a", "a..........a"]),
  headset: (r) => put(put(r, 2, 3, ["A..........A", "a..........a"]), 4, 6, ["a", ".a", "..aa"]),
  beret: (r) => put(r, 3, 0, ["..AAAAAA..", ".AAAAAAAAa", "aaaaaaaaaa"]),
  hood: (r) => put(r, 2, 0, ["...TTTTTT...", ".YTTTTTTTTt.", "YT........Tt", "Y..........t", "Y..........t", "Y..........t", ".T........t.", "..T......t.."]),
  tie: (r) => put(r, 7, 10, ["WW", "AA", "Aa", "Aa"]),
  beard: (r) => put(r, 4, 6, ["H......H", "HH....HH", ".hHHHHh."]),
}

function person(o) {
  const sk = SKIN[o.skin]
  let rows = [...BODY]
  rows = HAIR[o.hair](rows)
  for (const a of o.acc) rows = ACC[a](rows)
  return paint(rows, {
    H: o.hairKeys[1], h: o.hairKeys[0], S: sk[1], s: sk[0], z: sk[2], e: "k",
    T: o.shirt[1], t: o.shirt[0], Y: o.shirt[2], A: o.accKeys[1], a: o.accKeys[0],
  })
}

const ROLES = {
  lead:      { skin: "mid",   hair: "short", hairKeys: "LM", shirt: "zAB",  acc: ["headphones"], accKeys: "4k" },
  marketer:  { skin: "light", hair: "short", hairKeys: "MR", shirt: "abc",  acc: ["tie"],        accKeys: "jX" },
  community: { skin: "deep",  hair: "curly", hairKeys: "kL", shirt: "efg",  acc: ["headset"],    accKeys: "6k" },
  seo:       { skin: "light", hair: "bun",   hairKeys: "uM", shirt: "qrs",  acc: ["glasses"],    accKeys: "kk" },
  designer:  { skin: "mid",   hair: "short", hairKeys: "jQ", shirt: "k12",  acc: ["beret"],      accKeys: "iX" },
  analyst:   { skin: "light", hair: "pony",  hairKeys: "nN", shirt: "txy",  acc: ["glasses"],    accKeys: "kk" },
  engineer:  { skin: "deep",  hair: "buzz",  hairKeys: "kL", shirt: "567",  acc: ["hood", "beard"], accKeys: "kk" },
}

// Seated anims: 0-1 typing, 2 celebrate (arms up), 3 burnout (slumped). Desk is drawn separately in front.
for (const [id, o] of Object.entries(ROLES)) {
  const sk = SKIN[o.skin]
  const base = person(o)
  anim(`p_${id}`, { w: 16, h: 16, fps: 6, outline: "k" },
    base,
    frame(),
    frame(grid(1, 15, `.${sk[2]}${o.shirt[0]}........${o.shirt[0]}..`), grid(12, 14, `${o.shirt[0]}${sk[1]}`)),
    frame(grid(0, 9, `${sk[2]}..............${sk[1]}`), grid(0, 10, `${sk[1]}${o.shirt[2]}............${o.shirt[0]}${sk[0]}`), grid(1, 15, "_._........_._")),
    frame(grid(0, 0, "________________\n________________\n________________\n________________\n________________"),
      grid(0, 5, paint(["......HHHH......", "....HHHHHHHH....", "...HHHHHHHHHH..."], { H: o.hairKeys[1] })),
      grid(0, 8, "................")),
  )
}

// ---------------------------------------------------------------- card portraits (32x32)
// A bust on a coloured disc. Head is drawn bigger: the 16px body template at 2x via a function.
function bust(o, bg, extra = []) {
  const rows = person(o).split("\n")
  return [
    circ(16, 16, 15, bg[1]), circ(13, 13, 9, bg[2]), ring(16, 16, 15, bg[0]),
    clip([16, 16, 15], (c) => {
      rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== ".") c.rect(x * 2, 3 + y * 2, 2, 2, ch) }))
    }),
    ...extra,
  ]
}
const PORTRAITS = {
  creator:  [{ skin: "mid", hair: "long", hairKeys: "qr", shirt: "QQW", acc: ["none"], accKeys: "kk" }, "123", [rect(22, 22, 6, 9, "k"), rect(23, 23, 4, 6, "O")]],
  intern:   [{ skin: "light", hair: "curly", hairKeys: "uM", shirt: "efg", acc: ["none"], accKeys: "kk" }, "ijX", [rect(20, 20, 7, 10, "4"), rect(21, 21, 5, 7, "P"), text(21, 22, "LOL", "W")]],
  partner:  [{ skin: "light", hair: "buzz", hairKeys: "56", shirt: "567", acc: ["tie"], accKeys: "1a" }, "678", []],
  investor: [{ skin: "deep", hair: "short", hairKeys: "56", shirt: "k12", acc: ["tie", "glasses"], accKeys: "mn" }, "mno", [text(23, 2, "$", "k")]],
  user:     [{ skin: "mid", hair: "pony", hairKeys: "kL", shirt: "abc", acc: ["glasses"], accKeys: "kk" }, "ijX", [text(24, 3, "?!", "W")]],
  engineer_sleep: [{ skin: "deep", hair: "buzz", hairKeys: "kL", shirt: "567", acc: ["hood"], accKeys: "kk" }, "123", [text(22, 3, "Z", "O"), text(26, 0, "z", "O")]],
  blogger:  [{ skin: "light", hair: "long", hairKeys: "nN", shirt: "txy", acc: ["none"], accKeys: "kk" }, "zAB", [rect(24, 18, 3, 5, "5"), rect(23, 17, 5, 3, "k"), vline(25, 23, 6, "k")]],
  bigLab:   [{ skin: "light", hair: "buzz", hairKeys: "78", shirt: "W78", acc: ["glasses"], accKeys: "kk" }, "qrs", [ring(26, 6, 3, "W"), px(26, 6, "O")]],
  press:    [{ skin: "mid", hair: "short", hairKeys: "LM", shirt: "567", acc: ["glasses"], accKeys: "kk" }, "678", [rect(2, 19, 14, 11, "V"), hline(3, 21, 12, "k"), hline(3, 23, 9, "6"), hline(3, 25, 11, "6"), hline(3, 27, 8, "6")]],
}
for (const [id, [o, bg, extra]] of Object.entries(PORTRAITS)) sprite(`por_${id}`, { w: 32, h: 32 }, ...bust(o, bg, extra))

// the melting server rack
anim("por_server", { w: 32, h: 32, frames: 4, fps: 8 },
  circ(16, 16, 15, "j"), circ(13, 13, 9, "l"), ring(16, 16, 15, "i"),
  rect(9, 6, 14, 22, "5"), rect(10, 7, 12, 20, "6"),
  (c) => { for (let i = 0; i < 4; i++) { c.rect(11, 8 + i * 5, 10, 4, "k"); c.px(12, 9 + i * 5, (c.frame + i) % 2 ? "e" : "i"); c.px(14, 9 + i * 5, "g"); c.hline(16, 10 + i * 5, 4, "6") } },
  (c) => { const f = c.frame; c.poly([8, 8, 11, 1 + (f % 2), 13, 6, 16, 0 + ((f + 1) % 2), 19, 6, 21, 2 + (f % 2), 24, 8], "z"); c.poly([10, 8, 12, 4 + (f % 2), 15, 7, 17, 3, 19, 7, 22, 8], "n"); c.poly([12, 8, 14, 6, 16, 5 + (f % 2), 18, 7, 20, 8], "W") })

sheet("people", ["p_*", "por_*"], { pad: 1 })
