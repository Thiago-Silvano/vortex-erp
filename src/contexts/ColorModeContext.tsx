import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type ColorMode = "dark" | "light";
const STORAGE_KEY = "vortex_color_mode";

interface ColorModeCtx {
  mode: ColorMode;
  setMode: (m: ColorMode) => void;
  toggle: () => void;
}

const ColorModeContext = createContext<ColorModeCtx>({
  mode: "dark",
  setMode: () => {},
  toggle: () => {},
});

function applyMode(mode: ColorMode) {
  const root = document.documentElement;
  if (mode === "light") {
    root.classList.add("light");
    root.classList.remove("dark");
  } else {
    root.classList.add("dark");
    root.classList.remove("light");
  }
}

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ColorMode>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem(STORAGE_KEY) as ColorMode) || "dark";
  });

  useEffect(() => {
    applyMode(mode);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch {}
  }, [mode]);

  const setMode = (m: ColorMode) => setModeState(m);
  const toggle = () => setModeState((m) => (m === "dark" ? "light" : "dark"));

  return (
    <ColorModeContext.Provider value={{ mode, setMode, toggle }}>
      {children}
    </ColorModeContext.Provider>
  );
}

export function useColorMode() {
  return useContext(ColorModeContext);
}