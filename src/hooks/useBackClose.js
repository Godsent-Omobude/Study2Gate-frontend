import { useEffect, useRef } from "react";
import { pushBackHandler } from "../native/backButton";

// While `active` is true, the Android back button calls `onClose` instead of
// leaving the page. No effect in a browser (nothing triggers the handler).
export default function useBackClose(active, onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return undefined;
    return pushBackHandler(() => onCloseRef.current?.());
  }, [active]);
}
