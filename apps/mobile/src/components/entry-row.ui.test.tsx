import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { EntryRow } from "./entry-row";

jest.mock("@/localization", () => ({
  formatAppNumber: (value: string) => value,
  formatAppTime: () => "10:00",
  useTranslation: () => ({
    localeTag: "de-DE",
    t: (key: string) =>
      ({
        entryEdit: "Bearbeiten",
        entryResolveConflict: "Konflikt lösen",
        entryDelete: "Löschen",
        entryDeleteTitle: "Eintrag löschen?",
        entryDeleteBody: "Dieser Eintrag wird endgültig gelöscht.",
        commonCancel: "Abbrechen",
        entryDeleteConfirm: "Löschen",
        entrySyncPending: "Ausstehend",
        entrySyncSynced: "Synchronisiert",
        entrySyncFailed: "Synchronisierung fehlgeschlagen",
        entrySyncConflict: "Konflikt",
      })[key] ?? key,
  }),
}));
jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return {
    ...actual,
    useAppTheme: () => ({ colors: actual.lightColors, isDark: false }),
  };
});

describe("EntryRow", () => {
  it("offers edit and confirmed delete actions for an entry", async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const view = await render(
      <EntryRow
        entry={{
          id: "entry-1",
          amount: "42",
          entryDate: "2026-08-31",
          timezone: "Europe/Berlin",
          recordedAtClient: "2026-08-31T10:00:00.000Z",
          createdAt: "2026-08-31T10:00:00.000Z",
          updatedAt: "2026-08-31T10:00:00.000Z",
          revision: 1,
        }}
        onDelete={onDelete}
        onEdit={onEdit}
        showTime
      />,
    );

    fireEvent.press(view.getByRole("button", { name: "Bearbeiten" }));

    expect(onEdit).toHaveBeenCalledWith("entry-1");
    expect(view.getByText(/10:00/u)).toBeTruthy();
  });

  it("shows the durable local sync state", async () => {
    const view = await render(
      <EntryRow
        entry={{
          id: "entry-1",
          amount: "42",
          entryDate: "2026-08-31",
          timezone: "Europe/Berlin",
          recordedAtClient: "2026-08-31T10:00:00.000Z",
          createdAt: "2026-08-31T10:00:00.000Z",
          updatedAt: "2026-08-31T10:00:00.000Z",
          revision: 0,
          localState: "pending_create",
        }}
        onDelete={jest.fn()}
        onEdit={jest.fn()}
        showTime={false}
      />,
    );

    expect(view.getByText("Ausstehend")).toBeTruthy();
  });

  it("offers only explicit conflict resolution for a conflicted entry", async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const view = await render(
      <EntryRow
        entry={{
          id: "entry-1",
          amount: "42",
          entryDate: "2026-08-31",
          timezone: "Europe/Berlin",
          recordedAtClient: "2026-08-31T10:00:00.000Z",
          createdAt: "2026-08-31T10:00:00.000Z",
          updatedAt: "2026-08-31T10:00:00.000Z",
          revision: 1,
          localState: "conflict",
        }}
        onDelete={onDelete}
        onEdit={onEdit}
        showTime={false}
      />,
    );

    fireEvent.press(view.getByRole("button", { name: "Konflikt lösen" }));
    fireEvent.press(view.getByRole("button", { name: "Löschen" }));

    expect(onEdit).toHaveBeenCalledWith("entry-1");
    expect(onDelete).not.toHaveBeenCalled();
    expect(
      view.getByRole("button", { name: "Löschen" }).props.accessibilityState
        .disabled,
    ).toBe(true);
  });
});
