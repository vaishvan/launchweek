// Launch Week: the office cross-section. Three floors stack up as the company grows
// (Act 1 garage office, Act 2 open-plan, Act 3 penthouse HQ), skies per act, desks and props.
// Floors are 172x60: 0-3 ceiling slab, 4-51 wall, 52-55 floor, 56-59 slab. Desks stand on y=52.
include("pal.px.js")

// ---------------------------------------------------------------- props (parts)
sprite("_plant", `
  ..ee.f..
  .eff.fg.
  efgfefgh
  .eefgfe.
  ..efe...
  .uvvvw..
  .uvvvw..
  ..uvw...`)
sprite("_coffee", `
  .5666667.
  .5kkkkk7.
  .56OO667.
  .5kkkkk7.
  .5666667.
  .5k...k7.
  .5k.W.k7.
  .5666667.
  .5555556.`)
anim("steam", { w: 3, h: 4, fps: 4 }, frame(grid(0, 0, ".8.\n8..\n.8.\n..8")), frame(grid(0, 0, "8..\n.8.\n..8\n.8.")))
sprite("_whiteboard", { w: 30, h: 18 }, rect(0, 0, 30, 18, "6"), rect(1, 1, 28, 15, "W"), hline(1, 16, 28, "V"),
  line(4, 12, 10, 9, "a"), line(10, 9, 15, 10, "a"), line(15, 10, 24, 3, "a"), px(24, 3, "e"), px(25, 3, "e"),
  text(3, 2, "MAU", "i"), rect(3, 17, 4, 1, "j"), rect(9, 17, 3, 1, "a"))
sprite("_poster_ship", { w: 20, h: 14 }, rect(0, 0, 20, 14, "k"), rect(1, 1, 18, 12, "A"), text(2, 2, "SHIP", "W"), text(6, 8, "IT", "k"))
sprite("_window_small", { w: 24, h: 18 }, rect(0, 0, 24, 18, "5"), rect(1, 1, 22, 16, "c"), grad(1, 1, 22, 16, "bcd", "v"), vline(12, 1, 16, "5"), hline(1, 8, 22, "5"), px(3, 3, "W"), px(4, 2, "W"))
sprite("_server", { w: 12, h: 30 }, rect(0, 0, 12, 30, "5"), rect(1, 1, 10, 28, "1"),
  (c) => { for (let i = 0; i < 6; i++) { c.rect(2, 2 + i * 4, 8, 3, "k"); c.px(3, 3 + i * 4, i % 2 ? "g" : "e"); c.hline(5, 3 + i * 4, 4, "5") } })
sprite("_neon_logo", { w: 40, h: 10 }, rect(0, 0, 40, 10, "1"), text(3, 3, "LAUNCH", "Q"), hline(2, 1, 36, "q"), hline(2, 8, 36, "q"))
sprite("_beanbag", `
  ...zzzz..
  .zzAAAAz.
  zAAAAAAAz
  zAAAAAAAB
  .zzAAAABB`)
sprite("_trophy", `
  mnnnnnnm
  mnooopnm
  .mnoopm.
  ..mnnm..
  ...mm...
  ...mn...
  ..mnnnm.
  .uuuuuuu`)
sprite("_bell", `
  ...u....
  ...m....
  ..mnop..
  .mnnoop.
  .mnnnop.
  mnnnnnop
  kkkkkkkk`)
sprite("_lamp", `
  ..6..
  ..6..
  .nnn.
  nnopn`)

// ---------------------------------------------------------------- desk (front view, laptop back)
sprite("desk", { w: 28, h: 12 },
  rect(7, 0, 14, 5, "7"), rect(8, 1, 12, 3, "8"), px(13, 2, "k"), px(14, 2, "Q"),   // laptop lid with a sticker
  rect(0, 5, 28, 3, "w"), hline(0, 5, 28, "W"), rect(0, 8, 28, 1, "u"),
  rect(1, 9, 3, 3, "u"), rect(24, 9, 3, 3, "u"), rect(4, 9, 20, 2, "v"))

// ---------------------------------------------------------------- floors
function shell(wallKeys, floorKeys) {
  return [
    rect(0, 0, 172, 4, "1"), hline(0, 3, 172, "2"),
    rect(0, 4, 172, 48, wallKeys[1]), rect(0, 4, 172, 3, wallKeys[0]),
    noise(0, 7, 172, 44, wallKeys[2], 0.03, 7),
    rect(0, 52, 172, 4, floorKeys[1]), hline(0, 52, 172, floorKeys[2]),
    (c) => { for (let x = 6; x < 172; x += 14) c.vline(x, 53, 3, floorKeys[0]) },
    rect(0, 56, 172, 4, "5"), hline(0, 59, 172, "4"),
  ]
}

scene("floor_1", { w: 172, h: 60 },
  ...shell("ijl", "uvw"),
  // brick hints on a red garage wall
  (c) => { for (let y = 10; y < 50; y += 6) for (let x = (y / 6) % 2 ? 2 : 9; x < 172; x += 14) c.hline(x, y, 6, "i") },
  stamp("_window_small", 8, 8), stamp("_poster_ship", 40, 10), stamp("_whiteboard", 116, 7),
  stamp("_coffee", 160, 43), stamp("_plant", 2, 44),
)

scene("floor_2", { w: 172, h: 60 },
  ...shell("678", "uvw"),
  rect(4, 8, 164, 22, "5"), grad(5, 9, 162, 20, "bcd", "v"),
  (c) => { for (let x = 5; x < 168; x += 27) c.vline(x, 9, 20, "5") },
  line(12, 26, 40, 12, "W"), line(70, 26, 96, 10, "W"),
  stamp("_neon_logo", 66, 11), stamp("_server", 156, 22), stamp("_plant", 4, 44), stamp("_beanbag", 140, 47),
)

scene("floor_3", { w: 172, h: 60 },
  ...shell("123", "uvw"),
  rect(2, 6, 168, 26, "2"), grad(3, 7, 166, 24, "123", "v"),
  (c) => { const r = c.rng(5); for (let i = 0; i < 30; i++) c.px(3 + Math.floor(r() * 165), 7 + Math.floor(r() * 22), r() < 0.3 ? "O" : "W") },
  (c) => { for (let x = 3; x < 170; x += 42) c.vline(x, 7, 24, "1") },
  rect(118, 36, 30, 2, "u"), stamp("_trophy", 122, 28), stamp("_trophy", 134, 28, { swap: { m: "6", n: "7", o: "8", p: "W" } }),
  stamp("_bell", 156, 44), stamp("_lamp", 8, 34), stamp("_plant", 100, 44),
)

// scaffolding for floors not built yet
scene("scaffold", { w: 172, h: 60 },
  rect(0, 56, 172, 4, "5"), hline(0, 59, 172, "4"),
  (c) => {
    for (let x = 0; x <= 172; x += 43) c.rect(Math.min(x, 169), 0, 3, 56, "n")
    for (let x = 0; x < 168; x += 43) { c.line(x + 2, 2, x + 42, 54, "o"); c.line(x + 42, 2, x + 2, 54, "o") }
    c.rect(0, 0, 172, 3, "n")
  },
  rect(60, 22, 52, 13, "k"), rect(61, 23, 50, 11, "m"), text(64, 26, "SOON", "k"), text(84, 26, "(ISH)", "k"))

// roof cap with antenna
sprite("roof", { w: 180, h: 12 },
  rect(0, 8, 180, 4, "2"), hline(0, 8, 180, "3"),
  rect(140, 0, 2, 8, "6"), px(141, 0, "i"), rect(20, 4, 24, 4, "5"), rect(22, 5, 20, 2, "6"))

// ---------------------------------------------------------------- skies (180x184, behind the building)
scene("sky_1", { w: 180, h: 184 }, grad(0, 0, 180, 184, "cdW", "v"),
  (c) => { for (const [x, y] of [[20, 30], [120, 18], [70, 60]]) { c.ellipse(x, y, 12, 4, "W"); c.ellipse(x + 8, y - 3, 8, 4, "W") } })
scene("sky_2", { w: 180, h: 184 }, grad(0, 0, 180, 184, "qzBN", "v"),
  (c) => { for (const [x, y] of [[30, 40], [140, 26]]) { c.ellipse(x, y, 14, 3, "B"); c.ellipse(x + 6, y - 2, 8, 3, "N") } })
scene("sky_3", { w: 180, h: 184 }, grad(0, 0, 180, 184, "k12", "v"),
  (c) => { const r = c.rng(3); for (let i = 0; i < 60; i++) c.px(Math.floor(r() * 180), Math.floor(r() * 150), r() < 0.2 ? "N" : "W") },
  circ(150, 24, 8, "V"), circ(147, 22, 7, "W"))

// distant city silhouette at the bottom of every sky
sprite("city", { w: 180, h: 40 }, (c) => {
  const r = c.rng(11)
  let x = 0
  while (x < 180) {
    const w = 8 + Math.floor(r() * 14), h = 10 + Math.floor(r() * 28)
    c.rect(x, 40 - h, w, h, "1")
    for (let wy = 40 - h + 3; wy < 38; wy += 4) for (let wx = x + 2; wx < x + w - 2; wx += 3) if (r() < 0.35) c.px(wx, wy, "2")
    x += w + 1
  }
})

sheet("office", ["steam", "desk", "roof", "scaffold", "floor_*", "city"], { pad: 1 })
