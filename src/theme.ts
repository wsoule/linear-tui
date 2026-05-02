import { isRecord, readJsonConfig } from "./config-files"

const baseTheme = {
  bg: "#0e0e10",
  bgPanel: "#16161a",
  bgSelected: "#26262e",
  border: "#2a2a32",
  borderActive: "#5e6ad2",
  fg: "#e6e6e6",
  fgDim: "#8a8a96",
  fgMuted: "#5c5c66",
  accent: "#5e6ad2",
  warn: "#f2c94c",
  danger: "#eb5757",
  success: "#4cb782",
  priority: {
    0: "#5c5c66",
    1: "#eb5757",
    2: "#f2994a",
    3: "#f2c94c",
    4: "#8a8a96",
  } as Record<number, string>,
} as const

type Theme = typeof baseTheme
type ThemeOverride = Partial<Omit<Theme, "priority">> & {
  priority?: Partial<Record<number, string>>
}

function readThemeOverride(): ThemeOverride {
  const parsed = readJsonConfig("theme.json")
  if (!isRecord(parsed)) return {}
  const priority = isRecord(parsed.priority)
    ? parsed.priority as Partial<Record<number, string>>
    : undefined
  return {
    ...parsed,
    priority,
  } as ThemeOverride
}

function loadTheme(): Theme {
  const override = readThemeOverride()
  return {
    ...baseTheme,
    ...override,
    priority: {
      ...baseTheme.priority,
      ...override.priority,
    },
  } as Theme
}

export const theme = loadTheme()
