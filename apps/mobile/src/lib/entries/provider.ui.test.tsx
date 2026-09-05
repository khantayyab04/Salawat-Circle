import { describe, expect, it, jest } from "@jest/globals";
import { render, waitFor } from "@testing-library/react-native";
import { useEffect } from "react";
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

describe("EntriesProvider action identity", () => {
  function baseGateway(): EntriesGateway {
    return {
      getTimeZone: jest
        .fn<() => Promise<string>>()
        .mockResolvedValue("Europe/Berlin"),
      getSummary: jest.fn<EntriesGateway["getSummary"]>().mockResolvedValue({
        todayTotal: "0",
        weekTotal: "0",
        allTimeTotal: "0",
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
  }

  it("keeps its actions stable so effects keyed on them do not loop", async () => {
    // A screen loads its data in an effect keyed on the action. If the action
    // changed identity on every store update, the effect would refetch, update
    // the store again and loop until React aborts the render.
    const getProgressSeries = jest
      .fn<NonNullable<EntriesGateway["getProgressSeries"]>>()
      .mockResolvedValue({
        range: "week",
        periodStart: "2026-08-31",
        periodEnd: "2026-09-06",
        today: "2026-09-05",
        total: "0",
        activeDays: "0",
        goalDays: "0",
        achievedGoalDays: "0",
        currentStreak: 0,
        longestStreak: 0,
        buckets: [],
      });

    function LoadingConsumer() {
      const { loadProgressSeries, timeZone } = useEntries();
      useEffect(() => {
        // The store only fetches once it knows the timezone, which is exactly
        // how the real screens are shaped.
        if (!timeZone) return;
        void loadProgressSeries("week").catch(() => {});
      }, [loadProgressSeries, timeZone]);
      return <Text>loaded</Text>;
    }

    await render(
      <EntriesProvider
        createId={() => "test-id"}
        gateway={{ ...baseGateway(), getProgressSeries }}
      >
        <LoadingConsumer />
      </EntriesProvider>,
    );

    await waitFor(() => expect(getProgressSeries).toHaveBeenCalled());
    const callsAfterFirstLoad = getProgressSeries.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(getProgressSeries.mock.calls.length).toBe(callsAfterFirstLoad);
    expect(callsAfterFirstLoad).toBeLessThanOrEqual(2);
  });
});
