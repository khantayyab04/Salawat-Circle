import { beforeEach, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { ProgressScreen } from "./progress-screen";

const mockEntries = jest.fn();
const mockPush = jest.fn();
const mockLoad = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }), useFocusEffect: () => {} }));
jest.mock("@/lib/entries", () => ({ useEntries: () => mockEntries() }));
jest.mock("@/localization", () => ({
  formatAppNumber: (value: bigint) => String(value),
  useTranslation: () => ({ localeTag: "de-DE", t: (key: string) => key }),
}));
jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return { ...actual, useAppTheme: () => ({ colors: actual.lightColors, isDark: false }) };
});
const series = {
  range: "week", today: "2026-09-06", total: "333", goalDays: "7", achievedGoalDays: "4",
  currentStreak: 6, longestStreak: 12, buckets: [],
};
const data = () => ({
  viewState: "content", timeZone: "Europe/Berlin", online: true, pendingCount: 0,
  summary: { allTimeTotal: "1234", todayGoal: "100", achievedDays: "4", eligibleGoalDays: "7" },
  progressSeries: series, progressRange: "week", progressLoading: false, progressFailed: false,
  loadProgressSeries: mockLoad, refresh: mockLoad,
});
beforeEach(() => { mockEntries.mockReturnValue(data()); mockPush.mockClear(); mockLoad.mockClear(); });
it("replaces a loaded chart with an explicit waiting state while local changes await sync", async () => {
  const view = await render(<ProgressScreen />);
  expect(view.getByText("progressChartWeek")).toBeTruthy();
  mockEntries.mockReturnValue({ ...data(), online: false, pendingCount: 1 });
  await view.rerender(<ProgressScreen />);
  expect(view.queryByText("progressChartWeek")).toBeNull();
  expect(view.getByText("progressAwaitingSyncTitle")).toBeTruthy();
  expect(view.getByText("progressAwaitingSyncBody")).toBeTruthy();
  expect(view.queryByText("progressSyncNotice")).toBeNull();
});
it("shows the current daily goal instead of excluded streak metrics", async () => {
  const view = await render(<ProgressScreen />);
  expect(view.queryByText("progressActiveStreak")).toBeNull();
  expect(view.getByText("todayGoal")).toBeTruthy();
  expect(view.getByText("100")).toBeTruthy();
});
it("opens individual entry history from the dashboard", async () => {
  const view = await render(<ProgressScreen />);
  await fireEvent.press(view.getByRole("button", { name: "todayHistory" }));
  expect(mockPush).toHaveBeenCalledWith("/progress/history");
});
it("shows loading instead of fabricated zero period totals", async () => {
  mockEntries.mockReturnValue({ ...data(), progressSeries: null, progressLoading: true });
  const view = await render(<ProgressScreen />);
  expect(view.getByText("stateLoadingTitle")).toBeTruthy();
  expect(view.queryByText("0")).toBeNull();
});
it("retries a failed period and does not mislabel the previous range", async () => {
  mockEntries.mockReturnValue({ ...data(), progressSeries: { ...series, range: "month" }, progressFailed: true });
  const view = await render(<ProgressScreen />);
  expect(view.queryByText("333")).toBeNull();
  await fireEvent.press(view.getByRole("button", { name: "commonRetry" }));
  expect(mockLoad).toHaveBeenCalledWith("week");
});
it("reloads the selected range after timezone becomes available or data changes", async () => {
  mockEntries.mockReturnValue({ ...data(), timeZone: "", viewState: "loading", progressRevision: 0 });
  const view = await render(<ProgressScreen />);
  expect(mockLoad).not.toHaveBeenCalled();
  mockEntries.mockReturnValue({ ...data(), progressRevision: 1 });
  await view.rerender(<ProgressScreen />);
  expect(mockLoad).toHaveBeenCalledTimes(1);
  mockEntries.mockReturnValue({ ...data(), progressRevision: 2 });
  await view.rerender(<ProgressScreen />);
  expect(mockLoad).toHaveBeenCalledTimes(2);
});
