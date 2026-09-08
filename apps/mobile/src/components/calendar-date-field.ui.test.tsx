import { afterEach, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { Platform } from "react-native";
import { CalendarDateField } from "./calendar-date-field";

jest.mock("@/localization", () => ({ useTranslation: () => ({ localeTag: "de-DE", t: (key: string) => key }) }));
jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return { ...actual, useAppTheme: () => ({ colors: actual.lightColors, isDark: false }) };
});
const originalPlatform = Platform.OS;
afterEach(() => { Platform.OS = originalPlatform; });

it("offers the browser calendar when the native picker is unavailable on web", async () => {
  Platform.OS = "web";
  const onChange = jest.fn();
  const view = await render(<CalendarDateField label="Datum" value="2026-09-06" minimumDate="2025-09-06" maximumDate="2026-09-06" onChange={onChange} />);
  const input = view.root?.children.find(child => typeof child !== "string" && child.type === "input");
  expect(input).toBeDefined();
  if (!input || typeof input === "string") throw new Error("Browser calendar absent");
  expect(input.props.type).toBe("date");
  expect(input.props.min).toBe("2025-09-06");
  expect(input.props.max).toBe("2026-09-06");
  input.props.onChange({ currentTarget: { value: "2026-08-30" } });
  expect(onChange).toHaveBeenCalledWith("2026-08-30");
});

it.each(["", "2026-02-30", "2025-09-05", "2026-09-07"])("keeps the selected date when the browser supplies invalid date %s", async invalid => {
  Platform.OS = "web";
  const onChange = jest.fn();
  const view = await render(<CalendarDateField label="Datum" value="2026-09-06" minimumDate="2025-09-06" maximumDate="2026-09-06" onChange={onChange} />);
  const input = view.root?.children.find(child => typeof child !== "string" && child.type === "input");
  if (!input || typeof input === "string") throw new Error("Browser calendar absent");
  input.props.onChange({ currentTarget: { value: invalid } });
  expect(onChange).not.toHaveBeenCalled();
});

it("roundtrips native calendar dates in UTC and constrains selectable days", async () => {
  Platform.OS = "ios";
  const onChange = jest.fn();
  const view = await render(<CalendarDateField label="Datum" value="2026-09-06" minimumDate="2025-09-06" maximumDate="2026-09-06" onChange={onChange} />);
  await fireEvent.press(view.getByRole("button", { name: "Datum" }));
  const picker = view.getByTestId("calendar-date-picker");
  expect(picker.props.value.toISOString()).toBe("2026-09-06T00:00:00.000Z");
  expect(picker.props.minimumDate.toISOString()).toBe("2025-09-06T00:00:00.000Z");
  expect(picker.props.maximumDate.toISOString()).toBe("2026-09-06T00:00:00.000Z");
  expect(picker.props.timeZoneName).toBe("UTC");
  await fireEvent(picker, "valueChange", {}, new Date("2026-08-30T00:00:00Z"));
  expect(onChange).toHaveBeenCalledWith("2026-08-30");
  expect(view.queryByTestId("calendar-date-picker")).toBeNull();
});

it("dismisses an Android calendar without changing the selected date", async () => {
  Platform.OS = "android";
  const onChange = jest.fn();
  const view = await render(<CalendarDateField label="Datum" value="2026-09-06" onChange={onChange} />);
  await fireEvent.press(view.getByRole("button", { name: "Datum" }));
  await fireEvent(view.getByTestId("calendar-date-picker"), "dismiss");
  expect(view.queryByTestId("calendar-date-picker")).toBeNull();
  expect(onChange).not.toHaveBeenCalled();
});
