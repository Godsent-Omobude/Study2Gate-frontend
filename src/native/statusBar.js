import { Capacitor, registerPlugin } from "@capacitor/core";

// Keeps the Android status-bar icons (clock, signal, battery) readable
// against the app's light/dark theme. Uses registerPlugin so nothing breaks
// if @capacitor/status-bar isn't installed: the calls simply fail quietly.
const StatusBar = registerPlugin("StatusBar");

const applyStatusBarStyle = () => {
  const dark = document.documentElement.dataset.theme === "dark";
  // Capacitor naming: "DARK" = light icons for dark backgrounds,
  // "LIGHT" = dark icons for light backgrounds.
  StatusBar.setStyle({ style: dark ? "DARK" : "LIGHT" }).catch(() => {});
};

export function initStatusBar() {
  try {
    if (!Capacitor.isNativePlatform()) return;
  } catch {
    return;
  }

  applyStatusBarStyle();
  new MutationObserver(applyStatusBarStyle).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
}
