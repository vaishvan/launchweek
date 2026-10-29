include("office.px.js")
include("people.px.js")
scene("mock", { w: 180, h: 320, bg: "1" },
  stamp("sky_2", 0, 30), stamp("city", 0, 174),
  stamp("roof", 0, 22),
  stamp("floor_3", 4, 34, { frame: 0 }), stamp("floor_2", 4, 94, { frame: 0 }), stamp("floor_1", 4, 154, { frame: 0 }),
  (c) => { const ids = ["lead", "marketer", "community", "seo", "designer", "analyst"]; for (let f = 0; f < 3; f++) for (let i = 0; i < 5; i++) { const y = 34 + (2 - f) * 60; c.stamp(`p_${ids[(i + f) % 6]}`, 4 + 8 + i * 30 + 6, y + 26, { frame: 0 }); c.stamp("desk", 4 + 8 + i * 30, y + 40) } },
)
