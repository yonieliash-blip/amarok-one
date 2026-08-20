/** AMAROK ONE design tokens (aligned with apps/web design-system/tokens.css). */
export const colors = {
  primary: "#ffc928",
  primaryPressed: "#eab51c",
  primarySoft: "#2b2512",
  primaryOn: "#111111",
  bg: "#0b0c0e",
  bgPanel: "#131519",
  bgElevated: "#1a1d22",
  border: "#2a2e35",
  borderStrong: "#3b414b",
  text: "#f7f7f8",
  textMuted: "#a4a9b2",
  textSubtle: "#747b86",
  success: "#36d17c",
  successSoft: "#10271c",
  error: "#ff5d65",
  errorSoft: "#30171a",
  warning: "#ffc928",
  warningSoft: "#2b2512",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;
