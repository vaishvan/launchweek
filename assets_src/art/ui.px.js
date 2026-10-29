// Launch Week: UI art. HUD icons (9x9), channel and upgrade icons, the SHIP button,
// investor-term icons (16x16), ending icons (32x32), the logo and the bitmap font strip.
// No real brand logos: channels use generic symbols (speech bubble, forum, magnifier...).
include("pal.px.js")

// ---------------------------------------------------------------- 9x9 icons
const icons = {
  ic_users: `
    ..d...b..
    .ddd.bbb.
    .ddd.bbb.
    ..d...b..
    .ccc.aaa.
    ddddbbbbb
    dcccbaaab
    .........
    .........`,
  ic_cash: `
    ..nnnnn..
    .noopoon.
    noonnmoon
    nonnnnnon
    nooonoomn
    nmnnnnomn
    nmoonnomn
    .nmmmmmn.
    ..nnnnn..`,
  ic_sent: `
    .ii...ii.
    illi.illi
    ilWlilllX
    illlllllX
    .illlllX.
    ..illlX..
    ...ilX...
    ....X....
    .........`,
  ic_reach: `
    .......n.
    ......no.
    .zz..nop.
    zAAzzop..
    zABBAAn..
    zAAzzop..
    .zz..nop.
    ......no.
    .......n.`,
  ic_morale: `
    ..8.8....
    .8.8.....
    .........
    WWWWWW...
    W5555W66.
    W5555W.6.
    W5555W66.
    .W55W....
    .WWWW....`,
  ic_clock: `
    ..WWWWW..
    .W88888W.
    W888k888W
    W888k888W
    W888kkk8W
    W8888888W
    W8888888W
    .W88888W.
    ..WWWWW..`,
  ic_team: `
    ...HHH...
    ..HHHHH..
    ..HFFFH..
    ..FFFFF..
    ...FFF...
    .zzzzzzz.
    zzAAAAAzz
    zAAAAAAAz
    zAAAAAAAz`,
  ic_channels: `
    .d.....d.
    d..c.c..d
    d.c...c.d
    d.c.W.c.d
    d..c8c..d
    .d..8..d.
    ....8....
    ...888...
    ..88888..`,
  ic_upgrades: `
    ....e....
    ...efe...
    ..efgfe..
    .efgggfe.
    eeefgfeee
    ...fgf...
    ...fgf...
    ...fgf...
    ...eee...`,
  ic_lock: `
    ..666....
    .6...6...
    .6...6...
    mmmmmmm..
    mnoopnm..
    mnokonm..
    mnokonm..
    mnnnnnm..
    mmmmmmm..`,
  // channels
  ch_twitter: `
    .ccccccc.
    cddddddcc
    cdkdkdkdc
    cdddddddc
    cdkdkdkdc
    .cccddddc
    ...cc.cc.
    ...c.....
    .........`,
  ch_reddit: `
    ...zzz...
    ..zBBBz..
    .zBBzBBz.
    zAAAAAAAz
    zAWkAkWAz
    zAAAAAAAz
    .zAAkAAz.
    ..zzzzz..
    .........`,
  ch_seo: `
    .5555....
    5OOOO5...
    5OWOO5...
    5OOOO5...
    5OOOO5...
    .5555k...
    .....kk..
    ......kk.
    .......k.`,
  ch_newsletter: `
    .........
    WWWWWWWWW
    W6WVVVW6W
    WV6WVW6VW
    WVV6W6VVW
    WVVV6VVVW
    WVVVVVVVW
    WWWWWWWWW
    .........`,
  ch_referral: `
    ...i.i...
    ..iXiXi..
    ...iii...
    llllllll.
    lijllijl.
    lijllijl.
    lijllijl.
    llllllll.
    .........`,
  ch_creators: `
    .........
    ..kkk....
    kkkkkkkk.
    k666666k.
    k6OOOO6kk
    k6O1kO6kk
    k6OOOO6kk
    k666666k.
    kkkkkkkk.`,
  ch_paidads: `
    nnnnnnnnn
    nopppppon
    nopmpmpon
    nopppppon
    nopmppmon
    nnnnnnnnn
    ...5.5...
    ...5.5...
    ..55.55..`,
  ch_partnerships: `
    .........
    GG.....zz
    GGG...zzz
    .GGGHzzz.
    ..GHHHz..
    ...HHzz..
    ....zz...
    .........
    .........`,
  // tap upgrades
  up_templates: `
    WWWWWW...
    W6666WW..
    WWWWWWWW.
    W66666W..
    WWWWWWWW.
    W6666WW..
    WWWWWWWW.
    W666WWW..
    WWWWWWWW.`,
  up_pipeline: `
    .........
    .bb.bb.bb
    bccbccbcc
    bccbccbcc
    .bb.bb.bb
    666666666
    5k5k5k5k5
    666666666
    .........`,
  up_playbook: `
    .rrrrrrr.
    rssssssrk
    rsWWWWsrk
    rssssssrk
    rsWWWWsrk
    rssssssrk
    rsssssqrk
    rrrrrrrrk
    .kkkkkkkk`,
  up_demo: `
    666666666
    61111116.
    611W1116.
    611WW116.
    611W1116.
    61111116.
    666666666
    .5555555.
    555555555`,
  up_hooks: `
    ....66...
    ...6..6..
    ....66...
    .....6...
    .....6...
    .6...6...
    66...6...
    .6..66...
    ..666....`,
}
for (const [name, g] of Object.entries(icons)) sprite(name, g)

// ---------------------------------------------------------------- SHIP button (76x28)
function shipButton(face, lip, glow) {
  return [
    rect(0, 2, 76, 26, "k"), rect(1, 3, 74, 24, lip),
    rect(1, glow === "down" ? 3 : 1, 74, 22, "k"), rect(2, glow === "down" ? 4 : 2, 72, 20, face[1]),
    hline(3, glow === "down" ? 5 : 3, 70, face[2]), vline(3, glow === "down" ? 5 : 3, 17, face[2]),
    (c) => {
      const y = glow === "down" ? 2 : 0
      // rocket
      c.poly([10, 18 + y, 16, 8 + y, 22, 18 + y], "W"); c.rect(14, 12 + y, 4, 3, "c")
      c.px(12, 19 + y, "z"); c.px(19, 19 + y, "z"); c.px(16, 20 + y, "n")
      c.text(28, 9 + y, "SHIP", "W", { scale: 2, gap: 1 })
      c.text(28, 9 + y + 1, "SHIP", ".", { scale: 2 })
    },
  ]
}
sprite("btn_ship", { w: 76, h: 28 }, ...shipButton("zAB", "R", "up"))
sprite("btn_ship_down", { w: 76, h: 28 }, ...shipButton("zAB", "R", "down"))
sprite("btn_ship_hot", { w: 76, h: 28 }, ...shipButton("mop", "n", "up"))

// ---------------------------------------------------------------- investor terms (16x16)
const terms = {
  term_growth: [rect(0, 0, 16, 16, "e"), rect(1, 1, 14, 14, "f"), line(3, 12, 7, 8, "W"), line(7, 8, 9, 10, "W"), line(9, 10, 13, 4, "W"), poly([10, 3, 14, 3, 14, 7], "W")],
  term_angel: [rect(0, 0, 16, 16, "c"), rect(1, 1, 14, 14, "d"), ellipse(8, 4, 5, 2, "p", true), circ(8, 9, 3, "W"), poly([1, 8, 5, 6, 5, 12], "W"), poly([15, 8, 11, 6, 11, 12], "W")],
  term_operator: [rect(0, 0, 16, 16, "5"), rect(1, 1, 14, 14, "6"), rect(4, 2, 8, 12, "W"), rect(6, 1, 4, 2, "u"), hline(5, 5, 6, "6"), hline(5, 8, 6, "6"), hline(5, 11, 4, "6")],
  term_hype: [rect(0, 0, 16, 16, "q"), rect(1, 1, 14, 14, "r"), poly([8, 1, 12, 9, 4, 9], "W"), rect(6, 9, 4, 3, "8"), poly([6, 12, 8, 15, 10, 12], "z"), px(8, 6, "c")],
  term_revenue: [rect(0, 0, 16, 16, "m"), rect(1, 1, 14, 14, "n"), rect(3, 10, 10, 3, "o"), rect(4, 7, 8, 3, "p"), rect(5, 4, 6, 3, "o"), text(6, 4, "$", "m")],
  term_accel: [rect(0, 0, 16, 16, "t"), rect(1, 1, 14, 14, "x"), poly([9, 1, 3, 9, 8, 9, 6, 15, 13, 6, 8, 6, 10, 1], "N")],
  term_patient: [rect(0, 0, 16, 16, "v"), rect(1, 1, 14, 14, "w"), hline(4, 2, 8, "u"), hline(4, 13, 8, "u"), poly([5, 3, 11, 3, 8, 8], "O"), poly([8, 8, 5, 12, 11, 12], "N")],
  term_nepo: [rect(0, 0, 16, 16, "Q"), rect(1, 1, 14, 14, "s"), ellipse(5, 7, 3, 2, "8"), line(7, 8, 13, 13, "8", 1), poly([3, 2, 5, 4, 7, 2, 7, 5, 3, 5], "o")],
}
for (const [name, items] of Object.entries(terms)) sprite(name, { w: 16, h: 16 }, ...items)

// ---------------------------------------------------------------- endings (32x32)
const disc = (keys) => [circ(16, 16, 15, keys[1]), circ(13, 13, 9, keys[2]), ring(16, 16, 15, keys[0])]
sprite("end_shutdown", { w: 32, h: 32 }, ...disc("ijX"), rect(6, 10, 20, 12, "k"), rect(7, 11, 18, 10, "W"), text(10, 14, "SHUT", "i"), line(10, 10, 16, 4, "6"), line(22, 10, 16, 4, "6"))
sprite("end_acquired", { w: 32, h: 32 }, ...disc("efg"), rect(6, 9, 20, 14, "o"), rect(7, 10, 18, 12, "p"), text(10, 13, "$$$", "m"), rect(6, 22, 20, 2, "n"))
sprite("end_scandal", { w: 32, h: 32 }, ...disc("qrs"), poly([16, 4, 22, 18, 10, 18], "W"), rect(13, 18, 6, 4, "8"), poly([12, 22, 16, 29, 20, 22], "z"), poly([14, 22, 16, 26, 18, 22], "N"), circ(16, 12, 2, "c"), text(3, 3, "!", "ij"[0]), text(27, 5, "!", "i"))
sprite("end_burnout", { w: 32, h: 32 }, ...disc("123"), ellipse(16, 20, 9, 6, "W"), poly([16, 4, 18, 14, 14, 14], "N"), circ(12, 19, 1, "k"), circ(20, 19, 1, "k"), text(22, 6, "Z", "O"), text(26, 2, "Z", "O"))
sprite("end_biglab", { w: 32, h: 32 }, ...disc("678"), rect(5, 6, 14, 22, "1"), (c) => { for (let y = 8; y < 26; y += 4) for (let x = 7; x < 18; x += 4) c.rect(x, y, 2, 2, "O") }, rect(21, 18, 7, 10, "z"), rect(22, 20, 2, 2, "W"))
sprite("end_ipo", { w: 32, h: 32 }, ...disc("mno"), poly([16, 5, 24, 22, 8, 22], "n"), poly([16, 7, 22, 21, 10, 21], "p"), rect(6, 22, 20, 3, "m"), circ(16, 26, 2, "u"), rect(15, 2, 2, 4, "u"))
sprite("end_zombie", { w: 32, h: 32 }, ...disc("efg"), circ(16, 15, 9, "g"), circ(14, 13, 8, "h"), rect(11, 12, 3, 3, "W"), rect(19, 12, 3, 3, "W"), px(12, 13, "k"), px(20, 14, "k"), hline(12, 20, 8, "k"), px(13, 21, "W"), px(17, 21, "W"))

// ---------------------------------------------------------------- logo (128x30)
sprite("logo", { w: 128, h: 30 },
  text(2, 3, "LAUNCH", "k", { scale: 3, gap: 1 }), text(1, 2, "LAUNCH", "W", { scale: 3, gap: 1 }),
  text(33, 21, "WEEK", "k", { scale: 2, gap: 1 }), text(32, 20, "WEEK", "o", { scale: 2, gap: 1 }),
  poly([108, 22, 116, 2, 124, 22], "W"), rect(113, 10, 6, 4, "c"), poly([110, 22, 116, 29, 122, 22], "z"), poly([113, 22, 116, 26, 119, 22], "N"))

sheet("ui", ["ic_*", "ch_*", "up_*", "btn_*", "term_*", "end_*", "logo"], { pad: 1 })

// ---------------------------------------------------------------- font strip (ASCII 32..95, 4px cells)
const FONT_CHARS = Array.from({ length: 64 }, (_, i) => String.fromCharCode(32 + i)).join("")
sprite("font", { w: 64 * 4, h: 5 }, (c) => { [...FONT_CHARS].forEach((ch, i) => c.text(i * 4, 0, ch, "W")) })
