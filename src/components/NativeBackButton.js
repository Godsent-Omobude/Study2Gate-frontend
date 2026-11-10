import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { runBackHandler } from "../native/backButton";

// Pages where back should leave the app rather than step through history.
const EXIT_PATHS = new Set(["/", "/login"]);

const canHandleBack = () => {
  try {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("App");
  } catch {
    return false;
  }
};

// Registering a backButton listener turns off Capacitor's built-in behaviour,
// so this also has to do the "go back, or exit" part itself.
export default function NativeBackButton() {
  const { pathname } = useLocation();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    if (!canHandleBack()) return undefined;

    let cancelled = false;
    let listener;

    App.addListener("backButton", ({ canGoBack }) => {
      if (runBackHandler()) return;
      if (!canGoBack || EXIT_PATHS.has(pathRef.current)) {
        App.exitApp();
        return;
      }
      window.history.back();
    }).then((handle) => {
      if (cancelled) handle.remove();
      else listener = handle;
    });

    return () => {
      cancelled = true;
      listener?.remove();
    };
  }, []);

  return null;
}
