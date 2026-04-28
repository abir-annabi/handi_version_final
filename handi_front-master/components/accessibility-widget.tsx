"use client";

import { useEffect, useState } from "react";
import { useAccessibility } from "@/components/accessibility-provider";
import { useI18n } from "@/components/i18n-provider";

const ACCESSIBILITY_PANEL_EVENT = "handitalents:accessibility-panel";

type AccessibilityPanelAction = "open" | "close" | "toggle";

export function triggerAccessibilityPanel(action: AccessibilityPanelAction = "toggle") {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(ACCESSIBILITY_PANEL_EVENT, {
      detail: { action },
    }),
  );
}

function FeatureToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`accessibility-tile ${active ? "accessibility-tile-active" : ""}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="accessibility-tile-icon" aria-hidden="true">
        {active ? "\u25cf" : "\u25cb"}
      </span>
      <span>{label}</span>
    </button>
  );
}

function StepControl({
  label,
  valueLabel,
  onDecrease,
  onIncrease,
}: {
  label: string;
  valueLabel: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="accessibility-step-card">
      <strong>{label}</strong>
      <div className="accessibility-step-row">
        <button type="button" className="accessibility-step-button" onClick={onIncrease} aria-label={`Increase ${label}`}>
          +
        </button>
        <span>{valueLabel}</span>
        <button type="button" className="accessibility-step-button" onClick={onDecrease} aria-label={`Decrease ${label}`}>
          -
        </button>
      </div>
    </div>
  );
}

export function AccessibilityWidget() {
  const { t } = useI18n();
  const { settings, setFontScale, setLineHeight, toggleSetting, resetSettings } = useAccessibility();
  const [open, setOpen] = useState(false);

  const fontLabel = settings.fontScale === 1 ? t("accessibility.default") : `${Math.round(settings.fontScale * 100)}%`;
  const lineHeightLabel = `${Math.round((settings.lineHeight - 1) * 100)}%`;

  useEffect(() => {
    const handlePanelEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ action?: AccessibilityPanelAction }>;
      const action = customEvent.detail?.action ?? "toggle";

      setOpen((current) => {
        if (action === "open") {
          return true;
        }

        if (action === "close") {
          return false;
        }

        return !current;
      });
    };

    window.addEventListener(ACCESSIBILITY_PANEL_EVENT, handlePanelEvent);
    return () => window.removeEventListener(ACCESSIBILITY_PANEL_EVENT, handlePanelEvent);
  }, []);

  if (!open) {
    return null;
  }

  return (
    <div id="accessibility-panel" className="accessibility-panel" role="dialog" aria-label={t("accessibility.title")}>
      <div className="accessibility-panel-head">
        <strong>{t("accessibility.title")}</strong>
        <button type="button" className="accessibility-close" onClick={() => setOpen(false)} aria-label={t("common.actions.close")}>
          {"\u00d7"}
        </button>
      </div>

      <section className="accessibility-module">
        <p className="accessibility-module-title">{t("accessibility.content")}</p>
        <div className="accessibility-grid accessibility-grid-large">
          <StepControl
            label={t("accessibility.fontSize")}
            valueLabel={fontLabel}
            onIncrease={() => setFontScale(settings.fontScale + 0.05)}
            onDecrease={() => setFontScale(settings.fontScale - 0.05)}
          />
          <FeatureToggle label={t("accessibility.readableFont")} active={settings.readableFont} onClick={() => toggleSetting("readableFont")} />
          <StepControl
            label={t("accessibility.lineHeight")}
            valueLabel={lineHeightLabel}
            onIncrease={() => setLineHeight(settings.lineHeight + 0.1)}
            onDecrease={() => setLineHeight(settings.lineHeight - 0.1)}
          />
          <FeatureToggle label={t("accessibility.largeCursor")} active={settings.largeCursor} onClick={() => toggleSetting("largeCursor")} />
          <FeatureToggle label={t("accessibility.letterSpacing")} active={settings.letterSpacing} onClick={() => toggleSetting("letterSpacing")} />
          <FeatureToggle label={t("accessibility.centerAlign")} active={settings.centerAlign} onClick={() => toggleSetting("centerAlign")} />
          <FeatureToggle label={t("accessibility.boldText")} active={settings.boldText} onClick={() => toggleSetting("boldText")} />
        </div>
      </section>

      <section className="accessibility-module">
        <p className="accessibility-module-title">{t("accessibility.colors")}</p>
        <div className="accessibility-grid">
          <FeatureToggle label={t("accessibility.lightContrast")} active={settings.lightContrast} onClick={() => toggleSetting("lightContrast")} />
          <FeatureToggle label={t("accessibility.highContrast")} active={settings.highContrast} onClick={() => toggleSetting("highContrast")} />
          <FeatureToggle label={t("accessibility.monochrome")} active={settings.monochrome} onClick={() => toggleSetting("monochrome")} />
        </div>
      </section>

      <section className="accessibility-module">
        <p className="accessibility-module-title">{t("accessibility.orientation")}</p>
        <div className="accessibility-grid">
          <FeatureToggle label={t("accessibility.keyboardMoveMode")} active={settings.keyboardMoveMode} onClick={() => toggleSetting("keyboardMoveMode")} />
          <FeatureToggle label={t("accessibility.readingLine")} active={settings.readingLine} onClick={() => toggleSetting("readingLine")} />
          <FeatureToggle label={t("accessibility.readingMask")} active={settings.readingMask} onClick={() => toggleSetting("readingMask")} />
          <FeatureToggle label={t("accessibility.hideImages")} active={settings.hideImages} onClick={() => toggleSetting("hideImages")} />
          <FeatureToggle label={t("accessibility.stopAnimations")} active={settings.stopAnimations} onClick={() => toggleSetting("stopAnimations")} />
          <FeatureToggle label={t("accessibility.highlightContent")} active={settings.highlightContent} onClick={() => toggleSetting("highlightContent")} />
          <FeatureToggle label={t("accessibility.underlineLinks")} active={settings.underlineLinks} onClick={() => toggleSetting("underlineLinks")} />
        </div>
      </section>

      <button type="button" className="accessibility-reset" onClick={resetSettings}>
        {t("accessibility.reset")}
      </button>
    </div>
  );
}
