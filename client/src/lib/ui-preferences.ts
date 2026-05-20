export type ThemeMode = "light" | "dark" | "system";

const THEME_KEY = "sms-theme";
const COMPACT_KEY = "sms-compact-mode";

export function resolveDarkMode(theme: ThemeMode): boolean {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return theme === "dark";
}

export function applyThemeMode(theme: ThemeMode): void {
  localStorage.setItem(THEME_KEY, theme);
  const isDark = resolveDarkMode(theme);
  document.documentElement.classList.toggle("dark", isDark);
}

export function getStoredThemeMode(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light" || stored === "system") {
    return stored;
  }
  return "system";
}

export function applyCompactMode(compact: boolean): void {
  localStorage.setItem(COMPACT_KEY, compact ? "true" : "false");
  document.documentElement.classList.toggle("compact", compact);
}

export function getStoredCompactMode(): boolean {
  return localStorage.getItem(COMPACT_KEY) === "true";
}

export function applyStoredUiPreferences(): { theme: ThemeMode; compactMode: boolean } {
  const theme = getStoredThemeMode();
  const compactMode = getStoredCompactMode();
  applyThemeMode(theme);
  applyCompactMode(compactMode);
  return { theme, compactMode };
}
