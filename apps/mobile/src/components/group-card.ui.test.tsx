import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { GroupCard } from "./group-card";

jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return {
    ...actual,
    useAppTheme: () => ({ colors: actual.lightColors, isDark: false }),
  };
});

function renderCard(overrides: Record<string, unknown> = {}) {
  return render(
    <GroupCard
      anonymityLabel="Ranking shows display names"
      contribution="2,400"
      contributionLabel="Your contribution"
      membersLabel="8 active members"
      name="Evening Circle"
      onPress={() => {}}
      openLabel="Open Evening Circle"
      rankLabel="#2"
      {...overrides}
    />,
  );
}

describe("GroupCard", () => {
  it("answers the key questions without opening the circle", async () => {
    const view = await renderCard();
    expect(view.getByText("Evening Circle")).toBeTruthy();
    expect(view.getByText("8 active members")).toBeTruthy();
    expect(view.getByText("#2")).toBeTruthy();
    expect(view.getByText("2,400")).toBeTruthy();
  });

  it("opens the circle when pressed", async () => {
    const onPress = jest.fn();
    const view = await renderCard({ onPress });
    await fireEvent.press(
      view.getByRole("button", { name: "Open Evening Circle" }),
    );
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("shows a placeholder when the user has no rank yet", async () => {
    const view = await renderCard({ rankLabel: null });
    expect(view.getByText("–")).toBeTruthy();
  });

  it("keeps a long circle name readable instead of cutting it to one line", async () => {
    const view = await renderCard({
      name: "Friday Salawat Circle of the Neighbourhood",
    });
    const title = view.getByText("Friday Salawat Circle of the Neighbourhood");
    expect(title.props.numberOfLines).toBe(2);
  });

  it("keeps a very large contribution fully visible", async () => {
    const view = await renderCard({ contribution: "12,345,678" });
    expect(view.getByText("12,345,678").props.adjustsFontSizeToFit).toBe(true);
  });

  it("keeps the privacy relevant ranking mode visible in the list", async () => {
    const view = await renderCard({ anonymityLabel: "Anonymous ranking" });
    expect(view.getByText("Anonymous ranking")).toBeTruthy();
  });
});
