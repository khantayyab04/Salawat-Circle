import { describe, expect, it, jest } from "@jest/globals";
import { render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { EntriesGateway } from "./entries-gateway";
import { EntriesProvider, useEntries } from "./provider";

function Consumer() {
  const entries = useEntries();
  return <Text>{`${entries.summary.todayTotal}:${entries.timeZone}`}</Text>;
}

describe("EntriesProvider", () => {
  it("loads entries with the saved timezone", async () => {
    const gateway: EntriesGateway = {
      getTimeZone: jest.fn<() => Promise<string>>().mockResolvedValue("Europe/Berlin"),
      getSummary: jest.fn<EntriesGateway["getSummary"]>().mockResolvedValue({
        todayTotal: "42",
        weekTotal: "42",
        allTimeTotal: "42",
        todayGoal: null,
        achievedDays: "0",
        eligibleGoalDays: "0",
      }),
      list: jest.fn<EntriesGateway["list"]>().mockResolvedValue({
        items: [],
        nextCursor: null,
        hasMore: false,
      }),
      create: jest.fn<EntriesGateway["create"]>(),
      update: jest.fn<EntriesGateway["update"]>(),
      delete: jest.fn<EntriesGateway["delete"]>(),
      setGoal: jest.fn<EntriesGateway["setGoal"]>(),
    };
    const view = await render(
      <EntriesProvider gateway={gateway} createId={() => "test-id"}>
        <Consumer />
      </EntriesProvider>,
    );

    await waitFor(() =>
      expect(view.getByText("42:Europe/Berlin")).toBeTruthy(),
    );
  });
});
