// ---------------------------------------------------------------------------
// theme.ts
// Purpose : Screen layout (180x320 logical pixels) and UI colours taken from the
//           pxl palette (assets_src/art/pal.px.js), so code-drawn panels match the art.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
export const W = 180;
export const H = 320;

export const C = {
  ink: 0x141022,
  white: 0xf6f1e7,
  cream: 0xe6d9bf,
  night: 0x08060e,
  indigo: 0x1e1c3b,
  indigo2: 0x433f77,
  indigo3: 0x816ea6,
  steel: 0x3f3a57,
  steel2: 0x63658e,
  steel3: 0x9aa3b5,
  steel4: 0xd3d8dc,
  blue: 0x2552c1,
  blue2: 0x6ca8d8,
  sky: 0xa8f0ff,
  green: 0x3e8f54,
  green2: 0x73ba73,
  red: 0xc32647,
  red2: 0xd9756f,
  gold: 0xd68013,
  gold2: 0xe5cf62,
  purple: 0x8a5ac8,
  teal: 0x2fa8a0,
  orange: 0xe8743a,
  pink: 0xf27db5,
} as const;

export const L = {
  hudH: 22,
  cpBarY: 23,
  officeTop: 34,
  floorH: 60,
  floorX: 4,
  officeBottom: 214,
  comboY: 218,
  shipY: 226,
  tickerY: 259,
  tabsY: 296,
  panelTop: 34,
  panelBottom: 294,
} as const;
