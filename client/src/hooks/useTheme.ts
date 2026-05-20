import { useEffect, useState } from "react";
import { applyStoredUiPreferences, applyThemeMode, getStoredThemeMode, type ThemeMode } from "@/lib/ui-preferences";

export function useTheme() {
  const [isDark, setIsDark] = useState(false);
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const { theme } = applyStoredUiPreferences();
    const initialDark = document.documentElement.classList.contains("dark");
    setMode(theme);
    setIsDark(initialDark);
  }, []);

  const toggle = () => {
    const currentMode = getStoredThemeMode();
    const nextMode: ThemeMode = currentMode === "dark" ? "light" : "dark";
    applyThemeMode(nextMode);
    setMode(nextMode);
    setIsDark(document.documentElement.classList.contains("dark"));
  };

  const setThemeMode = (nextMode: ThemeMode) => {
    applyThemeMode(nextMode);
    setMode(nextMode);
    setIsDark(document.documentElement.classList.contains("dark"));
  };

  return { isDark, mode, toggle, setThemeMode };
}
