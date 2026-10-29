/** AMAROK ONE design tokens (aligned with the approved light web/mobile UI). */
export const colors = {
  primary: "#ffc928",
  primaryPressed: "#eab51c",
  primarySoft: "#fff4c7",
  primaryOn: "#111111",
  bg: "#f6f7fa",
  bgPanel: "#ffffff",
  bgElevated: "#ffffff",
  border: "#d9dce3",
  borderStrong: "#b7bdc8",
  text: "#111318",
  textMuted: "#626873",
  textSubtle: "#8a909b",
  success: "#1f9d55",
  successSoft: "#e8f7ee",
  error: "#c92f3d",
  errorSoft: "#fde8ea",
  warning: "#b77900",
  warningSoft: "#fff4c7",
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
