// Launch Week palette. One file, included by every art file so the whole game shares it.
// Hue-shifted ramps (shades) dark -> light; light comes from the top-left.
pal({ k: "#141022", W: "#f6f1e7", V: "#e6d9bf", O: "#a8f0ff", P: "#52b8e8", Q: "#f27db5", L: "#231c2b", M: "#6b4230", N: "#e8c070", R: "#c4553a" })
shades("1234", "#2c2f5a")            // indigo: night, UI panels
shades("5678", "#7d84a3")            // steel: walls, metal, laptops
shades("uvw", "#b07a4a", { spread: 0.4 })   // wood: desks, floors
shades("abcd", "#3f7fd6")            // brand blue
shades("efgh", "#4fae5c")            // growth green
shades("ijlX", "#d6424e")            // alert red (k is ink, so the ramp skips it)
shades("mnop", "#e8b030")            // cash gold
shades("qrs", "#8a5ac8", { spread: 0.45 })  // purple
shades("txy", "#2fa8a0", { spread: 0.45 })  // teal
shades("zAB", "#e8743a", { spread: 0.45 })  // orange
shades("CDE", "#eebc96", { spread: 0.28, shift: 8, sat: 0.6 })  // skin light
shades("FGH", "#c0845a", { spread: 0.3, shift: 8, sat: 0.6 })  // skin mid
shades("IJK", "#7a4a32", { spread: 0.3, shift: 8, sat: 0.7 })  // skin deep
