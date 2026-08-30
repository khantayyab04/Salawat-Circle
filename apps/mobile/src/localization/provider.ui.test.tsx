import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";

jest.mock("expo-sqlite/localStorage/install", () => ({}));
jest.mock("expo-localization", () => ({
  useLocales: () => [{ languageTag: "de-DE" }],
}));

const values = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  },
});

const { I18nProvider, useTranslation } =
  jest.requireActual<typeof import("./provider")>("./provider");

describe("I18nProvider", () => {
  it("switches the complete visible language immediately without mixing catalogs", async () => {
    function Probe() {
      const { setPreference, t } = useTranslation();
      return (
        <>
          <Text>{t("tabsToday")}</Text>
          <Text>{t("tabsSettings")}</Text>
          <Pressable
            accessibilityLabel="English"
            accessibilityRole="button"
            onPress={() => setPreference("en")}
          />
        </>
      );
    }

    const view = await render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    expect(view.getByText("Heute")).toBeTruthy();
    expect(view.queryByText("Today")).toBeNull();

    fireEvent.press(view.getByRole("button", { name: "English" }));

    await waitFor(() => {
      expect(view.getByText("Today")).toBeTruthy();
      expect(view.getByText("Settings")).toBeTruthy();
      expect(view.queryByText("Heute")).toBeNull();
      expect(view.queryByText("Einstellungen")).toBeNull();
    });
  });
});
