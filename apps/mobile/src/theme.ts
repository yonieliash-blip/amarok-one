/** AMAROK ONE design tokens (aligned with apps/web design-system/tokens.css). */
export const colors = {
  primary: "#ffc928",
  primaryPressed: "#eab51c",
  primarySoft: "#fff4cf",
  primaryOn: "#111111",
  bg: "#ffffff",
  bgPanel: "#ffffff",
  bgElevated: "#f6f7f8",
  border: "#e2e5e9",
  borderStrong: "#c5cbd3",
  text: "#1c232b",
  textMuted: "#5f6974",
  textSubtle: "#8a949f",
  success: "#218c55",
  successSoft: "#e8f7ee",
  error: "#c72e3b",
  errorSoft: "#ffedef",
  warning: "#bf8500",
  warningSoft: "#fff4cf",
} as const;

export const typography = {
  regular: "Alef",
  bold: "Alef-Bold",
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
