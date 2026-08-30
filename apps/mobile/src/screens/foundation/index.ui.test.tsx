import { describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { checkConfiguredBackend } from "@/lib/backend";
import { FoundationScreen } from "./index";

jest.mock("@/lib/backend", () => ({
  ...jest.requireActual<typeof import("@/lib/backend")>("@/lib/backend"),
  checkConfiguredBackend: jest.fn(),
}));

const checkBackend = jest.mocked(checkConfiguredBackend);

describe("FoundationScreen", () => {
  it("shows a quiet loading state while checking the backend", async () => {
    checkBackend.mockReturnValue(new Promise(() => undefined));

    const view = await render(<FoundationScreen />);

    expect(view.getByRole("header", { name: "Salawat Circle" })).toBeTruthy();
    expect(view.getByText("Backend wird geprüft …")).toBeTruthy();
  });

  it("shows that the local backend connection is ready", async () => {
    checkBackend.mockResolvedValue(undefined);

    const view = await render(<FoundationScreen />);

    expect(
      await view.findByText("Lokales Backend erreichbar"),
    ).toBeTruthy();
  });

  it("shows a safe setup hint when the backend is unavailable", async () => {
    checkBackend.mockRejectedValue(new Error("must-not-appear"));

    const view = await render(<FoundationScreen />);

    expect(
      await view.findByText("Lokales Backend nicht erreichbar"),
    ).toBeTruthy();
    expect(view.queryByText("must-not-appear")).toBeNull();
  });
});
