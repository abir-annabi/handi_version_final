"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type AccessibilitySettings = {
  fontScale: number;
  lineHeight: number;
  readingLine: boolean;
  readingMask: boolean;
  keyboardMoveMode: boolean;
  readableFont: boolean;
  largeCursor: boolean;
  letterSpacing: boolean;
  centerAlign: boolean;
  boldText: boolean;
  lightContrast: boolean;
  highContrast: boolean;
  monochrome: boolean;
  hideImages: boolean;
  stopAnimations: boolean;
  highlightContent: boolean;
  underlineLinks: boolean;
};

type AccessibilityContextValue = {
  settings: AccessibilitySettings;
  setFontScale: (value: number) => void;
  setLineHeight: (value: number) => void;
  toggleSetting: (key: Exclude<keyof AccessibilitySettings, "fontScale" | "lineHeight">) => void;
  resetSettings: () => void;
};

const STORAGE_KEY = "handitalents_accessibility_settings";

const defaultSettings: AccessibilitySettings = {
  fontScale: 1,
  lineHeight: 1.6,
  readingLine: false,
  readingMask: false,
  keyboardMoveMode: false,
  readableFont: false,
  largeCursor: false,
  letterSpacing: false,
  centerAlign: false,
  boldText: false,
  lightContrast: false,
  highContrast: false,
  monochrome: false,
  hideImages: false,
  stopAnimations: false,
  highlightContent: false,
  underlineLinks: false,
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [pointerY, setPointerY] = useState(-200);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<AccessibilitySettings>;
      setSettings({ ...defaultSettings, ...parsed });
    } catch {
      setSettings(defaultSettings);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }

    const body = document.body;
    body.style.setProperty("--accessibility-font-scale", String(settings.fontScale));
    body.style.setProperty("--accessibility-line-height", String(settings.lineHeight));

    body.dataset.readingLine = String(settings.readingLine);
    body.dataset.readingMask = String(settings.readingMask);
    body.dataset.keyboardMoveMode = String(settings.keyboardMoveMode);
    body.dataset.readableFont = String(settings.readableFont);
    body.dataset.largeCursor = String(settings.largeCursor);
    body.dataset.letterSpacing = String(settings.letterSpacing);
    body.dataset.centerAlign = String(settings.centerAlign);
    body.dataset.boldText = String(settings.boldText);
    body.dataset.lightContrast = String(settings.lightContrast);
    body.dataset.highContrast = String(settings.highContrast);
    body.dataset.monochrome = String(settings.monochrome);
    body.dataset.hideImages = String(settings.hideImages);
    body.dataset.stopAnimations = String(settings.stopAnimations);
    body.dataset.highlightContent = String(settings.highlightContent);
    body.dataset.underlineLinks = String(settings.underlineLinks);
  }, [settings]);

  useEffect(() => {
    const updatePointer = (event: MouseEvent) => {
      setPointerY(event.clientY);
    };

    if (settings.readingLine || settings.readingMask) {
      window.addEventListener("mousemove", updatePointer);
      return () => window.removeEventListener("mousemove", updatePointer);
    }

    setPointerY(-200);
    return undefined;
  }, [settings.readingLine, settings.readingMask]);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      settings,
      setFontScale: (value) =>
        setSettings((current) => ({
          ...current,
          fontScale: Math.min(1.45, Math.max(0.9, Number(value.toFixed(2)))),
        })),
      setLineHeight: (value) =>
        setSettings((current) => ({
          ...current,
          lineHeight: Math.min(2.2, Math.max(1.3, Number(value.toFixed(2)))),
        })),
      toggleSetting: (key) =>
        setSettings((current) => {
          const nextValue = !current[key];

          if (key === "lightContrast" && nextValue) {
            return { ...current, lightContrast: true, highContrast: false };
          }

          if (key === "highContrast" && nextValue) {
            return { ...current, lightContrast: false, highContrast: true };
          }

          return { ...current, [key]: nextValue };
        }),
      resetSettings: () => setSettings(defaultSettings),
    }),
    [settings],
  );

  const readingLineStyle: CSSProperties = {
    top: `${pointerY}px`,
    opacity: settings.readingLine ? 1 : 0,
  };

  const readingMaskStyle: CSSProperties = {
    opacity: settings.readingMask ? 1 : 0,
    background: `linear-gradient(
      to bottom,
      rgba(23, 18, 37, 0.58) 0,
      rgba(23, 18, 37, 0.58) ${Math.max(pointerY - 48, 0)}px,
      rgba(255, 255, 255, 0) ${Math.max(pointerY - 48, 0)}px,
      rgba(255, 255, 255, 0) ${Math.max(pointerY + 48, 0)}px,
      rgba(23, 18, 37, 0.58) ${Math.max(pointerY + 48, 0)}px,
      rgba(23, 18, 37, 0.58) 100%
    )`,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      <div aria-hidden="true" className="accessibility-reading-line accessibility-reading-line-active" style={readingLineStyle} />
      <div aria-hidden="true" className="accessibility-reading-mask accessibility-reading-mask-active" style={readingMaskStyle} />
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within AccessibilityProvider.");
  }
  return context;
}
