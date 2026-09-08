import { expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { BlessingsCard } from "./blessings-card";

jest.mock("@/lib/blessings/use-sunset-location", () => ({
  useSunsetLocation: () => ({
    enabled: false,
    coordinates: null,
    status: "idle",
    enable: jest.fn(),
    disable: jest.fn(),
  }),
}));
jest.mock("@/localization", () => ({
  useTranslation: () => ({
    localeTag: "de-DE",
    t: (key: string) => ({
      blessingsLabel: "Segen von Salawat",
      jumuahLabel: "Segen des Freitags",
    })[key] ?? key,
  }),
}));
jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return {
    ...actual,
    useAppTheme: () => ({ colors: actual.darkColors, isDark: true }),
  };
});

it("uses readable primary-card copy and shows only the collection and number", async () => {
  jest.useFakeTimers({ now: new Date("2026-09-07T10:00:00Z") });
  try {
    const view = await render(<BlessingsCard timeZone="Europe/Berlin" />);

    expect(view.getByText("Segen von Salawat")).toHaveStyle({ color: "#04241A" });
    expect(view.getByText(/^(Ṣaḥīḥ Muslim 408|Sunan an-Nasāʾī 1297|Jāmiʿ at-Tirmidhī 484|Sunan an-Nasāʾī 1282|Sunan Abī Dāwūd 2041)$/)).toBeTruthy();
    expect(view.queryByText(/Sahih|Darussalam|al-Albani/)).toBeNull();
    expect(view.queryByRole("link")).toBeNull();
    expect(view.queryByText("blessingsSunset")).toBeNull();
  } finally {
    jest.useRealTimers();
  }
});
