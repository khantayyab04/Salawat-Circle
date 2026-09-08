import { beforeEach, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useSunsetLocation } from "./use-sunset-location";

const mockPermission = jest.fn<() => Promise<{ granted: boolean }>>();
const mockPosition = jest.fn<() => Promise<{ coords: { latitude: number; longitude: number } }>>();
jest.mock("expo-location", () => ({
  Accuracy: { Low: 2 },
  requestForegroundPermissionsAsync: () => mockPermission(),
  getForegroundPermissionsAsync: () => mockPermission(),
  getCurrentPositionAsync: () => mockPosition(),
}));
beforeEach(() => {
  jest.clearAllMocks();
  globalThis.localStorage?.removeItem("salawat.sunset-location-enabled");
  mockPermission.mockResolvedValue({ granted: true });
  mockPosition.mockResolvedValue({ coords: { latitude: 52.5234, longitude: 13.4078 } });
});

it("cannot re-enable location through a late result after the user switches it off", async () => {
  let resolvePosition!: (value: { coords: { latitude: number; longitude: number } }) => void;
  mockPosition.mockReturnValue(new Promise(resolve => { resolvePosition = resolve; }));
  const { result } = await renderHook(() => useSunsetLocation());
  expect(mockPermission).not.toHaveBeenCalled();
  await act(() => { void result.current.enable(); });
  await waitFor(() => expect(mockPosition).toHaveBeenCalledTimes(1));
  await act(() => result.current.disable());
  await act(async () => { resolvePosition({ coords: { latitude: 52.52, longitude: 13.4 } }); });
  expect(result.current.enabled).toBe(false);
  expect(result.current.coordinates).toBeNull();
});

it("does not request coordinates when permission is denied", async () => {
  mockPermission.mockResolvedValue({ granted: false });
  const { result } = await renderHook(() => useSunsetLocation());
  await act(() => { result.current.enable(); });
  await waitFor(() => expect(result.current.status).toBe("denied"));
  expect(mockPosition).not.toHaveBeenCalled();
  expect(result.current.coordinates).toBeNull();
});

it("keeps only the opt-in preference on disk, not coordinates", async () => {
  const { result } = await renderHook(() => useSunsetLocation());
  await act(() => { result.current.enable(); });
  await waitFor(() => expect(result.current.status).toBe("ready"));
  expect(result.current.coordinates).toEqual({ latitude: 52.52, longitude: 13.41 });
  expect(mockPosition).toHaveBeenCalledTimes(1);
  expect(globalThis.localStorage.length).toBe(1);
  expect(globalThis.localStorage.getItem("salawat.sunset-location-enabled")).toBe("true");
  await act(() => result.current.disable());
  expect(globalThis.localStorage.length).toBe(0);
});
