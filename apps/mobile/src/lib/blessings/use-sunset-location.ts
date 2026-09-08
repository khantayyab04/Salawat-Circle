import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import type { Coordinates } from "@/lib/jumuah/sunset";

const PREFERENCE_KEY = "salawat.sunset-location-enabled";
const LOCATION_TIMEOUT = 20_000;

export function useSunsetLocation() {
  const [enabled, setEnabled] = useState(() => {
    try { return globalThis.localStorage?.getItem(PREFERENCE_KEY) === "true"; }
    catch { return false; }
  });
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "denied" | "unavailable">("idle");
  const request = useRef(0);
  const promptOnEnable = useRef(false);

  const refresh = useCallback(async (askPermission: boolean) => {
    const generation = ++request.current;
    setStatus("loading");
    setCoordinates(null);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        (async () => {
          // Loading on demand also lets an older development client show the
          // calendar fallback rather than crash when this native module is absent.
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const location: typeof import("expo-location") = require("expo-location");
          const permission = askPermission
            ? await location.requestForegroundPermissionsAsync()
            : await location.getForegroundPermissionsAsync();
          if (!permission.granted) throw new Error("DENIED");
          if (generation !== request.current) throw new Error("CANCELLED");
          const result = await location.getCurrentPositionAsync({ accuracy: location.Accuracy.Low });
          return result.coords;
        })(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("UNAVAILABLE")), LOCATION_TIMEOUT); }),
      ]);
      if (generation !== request.current) return;
      if (!Number.isFinite(result.latitude) || !Number.isFinite(result.longitude) || Math.abs(result.latitude) > 90 || Math.abs(result.longitude) > 180) throw new Error("UNAVAILABLE");
      // Approximate location lives only in this mounted card. No coordinate is
      // written to disk, logged, or sent to the application's backend.
      setCoordinates({ latitude: Math.round(result.latitude * 100) / 100, longitude: Math.round(result.longitude * 100) / 100 });
      setStatus("ready");
    } catch (error) {
      if (generation === request.current) {
        ++request.current;
        setStatus(error instanceof Error && error.message === "DENIED" ? "denied" : "unavailable");
      }
    } finally { clearTimeout(timer); }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const activeRequest = request;
    const askPermission = promptOnEnable.current;
    promptOnEnable.current = false;
    void refresh(askPermission);
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") void refresh(false);
      else { ++request.current; setCoordinates(null); }
    });
    return () => { ++activeRequest.current; subscription.remove(); };
  }, [enabled, refresh]);

  const enable = () => {
    promptOnEnable.current = true;
    try { globalThis.localStorage?.setItem(PREFERENCE_KEY, "true"); } catch { /* Session-only preference if storage is unavailable. */ }
    setEnabled(true);
  };
  const disable = () => {
    ++request.current;
    setEnabled(false);
    setCoordinates(null);
    setStatus("idle");
    try { globalThis.localStorage?.removeItem(PREFERENCE_KEY); } catch { /* Current session still stops location use. */ }
  };
  return { enabled, coordinates, status, enable, disable };
}
