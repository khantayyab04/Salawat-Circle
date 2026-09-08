import { beforeEach, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { Alert } from "react-native";
import { HistoryScreen } from "./history-screen";
const mockEntries = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockLoadMore = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockUpdate = jest.fn<(...args: unknown[]) => Promise<void>>().mockResolvedValue(undefined);
const mockDelete = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, back: mockBack, canGoBack: () => false, replace: mockReplace }) }));
jest.mock("@/lib/entries", () => ({ ...jest.requireActual<typeof import("@/lib/entries/calendar")>("@/lib/entries/calendar"), ...jest.requireActual<typeof import("@/lib/entries/amount")>("@/lib/entries/amount"), useEntries: () => mockEntries() }));
jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return { ...actual, useAppTheme: () => ({ colors: actual.lightColors, isDark: false }) };
});
jest.mock("@/localization", () => ({
  formatAppNumber: (value: bigint) => String(value), formatAppTime: () => "10:00",
  useTranslation: () => ({ localeTag: "de-DE", t: (key: string) => key }),
}));
const entry = { id: "entry-1", amount: "333", entryDate: "2026-09-06", recordedAtClient: "2026-09-06T10:00:00Z", timezone: "UTC", revision: 1 };
function data(overrides = {}) {
  return { viewState: "content", entries: [entry], hasMore: true, busy: false, loadingMore: false,
    timeZone: "UTC", conflicts: [], update: mockUpdate, loadMore: mockLoadMore, delete: mockDelete, refresh: mockLoadMore, ...overrides };
}
beforeEach(() => { mockEntries.mockReturnValue(data()); mockUpdate.mockReset().mockResolvedValue(undefined); mockPush.mockClear(); mockReplace.mockClear(); mockBack.mockClear(); mockDelete.mockClear(); mockLoadMore.mockClear(); });
it("returns to progress when history was opened without navigation history", async () => {
  const view = await render(<HistoryScreen />);
  await fireEvent.press(view.getByRole("button", { name: "commonBack" }));
  expect(mockReplace).toHaveBeenCalledWith("/progress");
});
it("expands the entry in place and collapses after saving the edited amount", async () => {
  const view = await render(<HistoryScreen />);
  expect(view.getByText("333")).toBeTruthy();
  await fireEvent.press(view.getByRole("button", { name: "entryEdit" }));
  expect(view.getByLabelText("entryAmountLabel").props.value).toBe("333");
  expect(mockPush).not.toHaveBeenCalled();
  await fireEvent.changeText(view.getByLabelText("entryAmountLabel"), "444");
  await fireEvent.press(view.getByRole("button", { name: "commonSave" }));
  expect(mockUpdate).toHaveBeenCalledWith("entry-1", 444, "2026-09-06");
  expect(view.queryByLabelText("entryAmountLabel")).toBeNull();
  expect(view.getByRole("button", { name: "entryEdit" })).toBeTruthy();
});
it("loads another page and offers retry after pagination fails", async () => {
  mockEntries.mockReturnValue(data({ paginationError: true }));
  const view = await render(<HistoryScreen />);
  expect(view.getByText("historyLoadFailed")).toBeTruthy();
  await fireEvent.press(view.getByRole("button", { name: "historyLoadMore" }));
  expect(mockLoadMore).toHaveBeenCalledTimes(1);
});
it("requires confirmation before deleting an individual entry", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const view = await render(<HistoryScreen />);
  await fireEvent.press(view.getByRole("button", { name: "entryDelete" }));
  expect(mockDelete).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole("button", { name: "entryEdit" }));
  const confirm = alert.mock.calls[0]?.[2]?.find(button => button.style === "destructive");
  expect(confirm).toBeDefined();
  confirm?.onPress?.();
  expect(mockDelete).toHaveBeenCalledWith("entry-1");
  alert.mockRestore();
});
it("offers retry when history has no usable data", async () => {
  mockEntries.mockReturnValue(data({ viewState: "error", entries: [] }));
  const view = await render(<HistoryScreen />);
  expect(view.getByText("stateErrorTitle")).toBeTruthy();
  await fireEvent.press(view.getByRole("button", { name: "commonRetry" }));
  expect(mockLoadMore).toHaveBeenCalledTimes(1);
});
it("keeps the entered amount and calendar date open after a failed save", async () => {
  mockUpdate.mockRejectedValueOnce(new Error("INTERNAL"));
  const view = await render(<HistoryScreen />);
  await fireEvent.press(view.getByRole("button", { name: "entryEdit" }));
  await fireEvent.changeText(view.getByLabelText("entryAmountLabel"), "555");
  await fireEvent.press(view.getByRole("button", { name: "entryDateLabel" }));
  await fireEvent(view.getByTestId("calendar-date-picker"), "valueChange", {}, new Date("2026-09-05T00:00:00Z"));
  await fireEvent.press(view.getByRole("button", { name: "commonSave" }));
  expect(view.getByText("entrySaveFailed")).toBeTruthy();
  expect(view.getByLabelText("entryAmountLabel").props.value).toBe("555");
  expect(view.getByRole("button", { name: "entryDateLabel" }).props.accessibilityValue.text).toBe("5. September 2026");
  await fireEvent.press(view.getByRole("button", { name: "commonSave" }));
  expect(mockUpdate).toHaveBeenLastCalledWith("entry-1", 555, "2026-09-05");
  expect(view.queryByLabelText("entryAmountLabel")).toBeNull();
});
it("routes conflicted entries to the existing explicit conflict resolution", async () => {
  mockEntries.mockReturnValue(data({ entries: [{ ...entry, localState: "conflict" }] }));
  const view = await render(<HistoryScreen />);
  await fireEvent.press(view.getByRole("button", { name: "entryResolveConflict" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/entry/[id]/edit", params: { id: "entry-1" } });
  expect(view.queryByLabelText("entryAmountLabel")).toBeNull();
});
it("preserves the draft and blocks saving when a newer revision arrives", async () => {
  const view = await render(<HistoryScreen />);
  await fireEvent.press(view.getByRole("button", { name: "entryEdit" }));
  await fireEvent.changeText(view.getByLabelText("entryAmountLabel"), "555");
  mockEntries.mockReturnValue(data({ entries: [{ ...entry, amount: "777", revision: 2 }] }));
  await view.rerender(<HistoryScreen />);
  expect(view.getByLabelText("entryAmountLabel").props.value).toBe("555");
  expect(view.getByRole("button", { name: "commonSave" }).props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(view.getByRole("button", { name: "entryUseLatest" }));
  expect(view.getByLabelText("entryAmountLabel").props.value).toBe("777");
});
