import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** Start gently while the system preference loads; follow changes live. */
export function useAppReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    let receivedChange = false;
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      receivedChange = true;
      if (active) setReduced(value);
    });
    void Promise.resolve(AccessibilityInfo.isReduceMotionEnabled())
      .then((value) => {
        if (active && !receivedChange) setReduced(Boolean(value));
      })
      .catch(() => {});
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}
