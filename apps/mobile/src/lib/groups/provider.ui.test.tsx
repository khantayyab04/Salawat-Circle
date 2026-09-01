import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { act, render, waitFor } from "@testing-library/react-native";
import * as ExpoNetwork from "expo-network";
import { Text } from "react-native";
import type { GroupsGateway } from "./groups-gateway";
import { GroupsProvider, useGroups } from "./provider";

let getNetworkStateAsyncSpy: jest.SpiedFunction<
  typeof ExpoNetwork.getNetworkStateAsync
>;
let addNetworkStateListenerSpy: jest.SpiedFunction<
  typeof ExpoNetwork.addNetworkStateListener
>;

type ProviderActionSnapshot = {
  accountId: string | null;
  groups: {
    status: string;
  };
  refreshGroups(): Promise<void>;
  createGroup: unknown;
  loadLeaderboard: unknown;
  setAnonymity: unknown;
  loadInvites: unknown;
  createInvite: unknown;
  revokeInvite: unknown;
  previewInvite: unknown;
  acceptInvite: unknown;
};

function Consumer() {
  const groups = useGroups();
  return (
    <Text>
      {(groups.accountId ?? "none") +
        ":" +
        groups.groups.items.length +
        ":" +
        groups.groups.status}
    </Text>
  );
}

function CallbackConsumer({
  onUpdate,
}: {
  onUpdate(value: ProviderActionSnapshot): void;
}) {
  const groups = useGroups();
  onUpdate(groups as ProviderActionSnapshot);
  return (
    <Text>
      {(groups.accountId ?? "none") + ":" + groups.groups.status}
    </Text>
  );
}

function gateway(): GroupsGateway {
  return {
    listMyGroups: jest
      .fn<GroupsGateway["listMyGroups"]>()
      .mockResolvedValue({
        items: [
          {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
            name: "Alpha Circle",
            timezone: "Europe/Berlin",
            role: "owner",
            memberCount: "2",
            ownWeekTotal: "9",
            ownRank: 1,
            leaderboardAnonymous: false,
            revision: 3,
            updatedAt: "2026-08-31T20:00:00.000Z",
            calculatedAt: "2026-08-31T20:00:01.000Z",
          },
        ],
      }),
    createGroup: jest.fn<GroupsGateway["createGroup"]>(),
    getLeaderboard: jest.fn<GroupsGateway["getLeaderboard"]>(),
    setLeaderboardAnonymity: jest.fn<GroupsGateway["setLeaderboardAnonymity"]>(),
    createInvite: jest.fn<GroupsGateway["createInvite"]>(),
    listInvites: jest.fn<GroupsGateway["listInvites"]>(),
    revokeInvite: jest.fn<GroupsGateway["revokeInvite"]>(),
    previewInvite: jest.fn<GroupsGateway["previewInvite"]>(),
    acceptInvite: jest.fn<GroupsGateway["acceptInvite"]>(),
  };
}

describe("GroupsProvider", () => {
  beforeEach(() => {
    getNetworkStateAsyncSpy = jest
      .spyOn(ExpoNetwork, "getNetworkStateAsync")
      .mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: ExpoNetwork.NetworkStateType.WIFI,
      });
    addNetworkStateListenerSpy = jest
      .spyOn(ExpoNetwork, "addNetworkStateListener")
      .mockReturnValue({
        remove: jest.fn(),
      } as ReturnType<typeof ExpoNetwork.addNetworkStateListener>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("wires context loading and resets when account is cleared", async () => {
    const wiredGateway = gateway();
    const view = await render(
      <GroupsProvider
        gateway={wiredGateway}
        accountId="account-1"
        enabled
        onlineCheck={async () => true}
        createId={() => "test-group-id"}
      >
        <Consumer />
      </GroupsProvider>,
    );

    await waitFor(() => expect(view.getByText("account-1:1:ready")).toBeTruthy());

    await act(async () => {
      view.rerender(
        <GroupsProvider
          gateway={wiredGateway}
          accountId={null}
          enabled={false}
          onlineCheck={async () => true}
          createId={() => "test-group-id"}
        >
          <Consumer />
        </GroupsProvider>,
      );
    });

    await waitFor(() => expect(view.getByText("none:0:idle")).toBeTruthy());
  });

  it("uses expo-network for cold-start online checks and keeps startup offline", async () => {
    const wiredGateway = gateway();
    getNetworkStateAsyncSpy.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
      type: ExpoNetwork.NetworkStateType.UNKNOWN,
    });

    const view = await render(
      <GroupsProvider
        gateway={wiredGateway}
        accountId="account-1"
        enabled
        createId={() => "test-group-id"}
      >
        <Consumer />
      </GroupsProvider>,
    );

    await waitFor(() => expect(view.getByText("account-1:0:error")).toBeTruthy());
    expect(getNetworkStateAsyncSpy).toHaveBeenCalled();
    expect(addNetworkStateListenerSpy).toHaveBeenCalled();
    expect(wiredGateway.listMyGroups).toHaveBeenCalledTimes(0);
  });

  it("keeps exposed action callback identities stable across store updates and refreshes them on account switch", async () => {
    const wiredGateway = gateway();
    const groupsForAccountOne = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      name: "Alpha Circle",
      timezone: "Europe/Berlin",
      role: "owner" as const,
      memberCount: "2",
      ownWeekTotal: "9",
      ownRank: 1,
      leaderboardAnonymous: false,
      revision: 3,
      updatedAt: "2026-08-31T20:00:00.000Z",
      calculatedAt: "2026-08-31T20:00:01.000Z",
    };
    const groupsForAccountTwo = {
      ...groupsForAccountOne,
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
      name: "Beta Circle",
    };
    wiredGateway.listMyGroups = jest
      .fn<GroupsGateway["listMyGroups"]>()
      .mockResolvedValueOnce({ items: [groupsForAccountOne] })
      .mockResolvedValueOnce({ items: [groupsForAccountOne] })
      .mockResolvedValueOnce({ items: [groupsForAccountTwo] });

    let latestValue: ProviderActionSnapshot | null = null;
    const alwaysOnline = async () => true;
    const stableCreateId = () => "test-group-id";
    const readLatestValue = (): ProviderActionSnapshot => {
      if (!latestValue) {
        throw new Error("Groups context missing after render.");
      }
      return latestValue;
    };

    const view = await render(
      <GroupsProvider
        gateway={wiredGateway}
        accountId="account-1"
        enabled
        onlineCheck={alwaysOnline}
        createId={stableCreateId}
      >
        <CallbackConsumer onUpdate={(value) => (latestValue = value)} />
      </GroupsProvider>,
    );

    await waitFor(() => expect(view.getByText("account-1:ready")).toBeTruthy());
    const initialValue = readLatestValue();

    const initialCallbacks = {
      refreshGroups: initialValue.refreshGroups,
      createGroup: initialValue.createGroup,
      loadLeaderboard: initialValue.loadLeaderboard,
      setAnonymity: initialValue.setAnonymity,
      loadInvites: initialValue.loadInvites,
      createInvite: initialValue.createInvite,
      revokeInvite: initialValue.revokeInvite,
      previewInvite: initialValue.previewInvite,
      acceptInvite: initialValue.acceptInvite,
    };

    await act(async () => {
      await readLatestValue().refreshGroups();
    });
    await waitFor(() => expect(view.getByText("account-1:ready")).toBeTruthy());
    const afterRefresh = readLatestValue();

    expect(afterRefresh.refreshGroups).toBe(initialCallbacks.refreshGroups);
    expect(afterRefresh.createGroup).toBe(initialCallbacks.createGroup);
    expect(afterRefresh.loadLeaderboard).toBe(initialCallbacks.loadLeaderboard);
    expect(afterRefresh.setAnonymity).toBe(initialCallbacks.setAnonymity);
    expect(afterRefresh.loadInvites).toBe(initialCallbacks.loadInvites);
    expect(afterRefresh.createInvite).toBe(initialCallbacks.createInvite);
    expect(afterRefresh.revokeInvite).toBe(initialCallbacks.revokeInvite);
    expect(afterRefresh.previewInvite).toBe(initialCallbacks.previewInvite);
    expect(afterRefresh.acceptInvite).toBe(initialCallbacks.acceptInvite);

    await act(async () => {
      view.rerender(
        <GroupsProvider
          gateway={wiredGateway}
          accountId="account-2"
          enabled
          onlineCheck={alwaysOnline}
          createId={stableCreateId}
        >
          <CallbackConsumer onUpdate={(value) => (latestValue = value)} />
        </GroupsProvider>,
      );
    });

    await waitFor(() => expect(view.getByText("account-2:ready")).toBeTruthy());
    const afterAccountSwitch = readLatestValue();

    expect(afterAccountSwitch.refreshGroups).not.toBe(initialCallbacks.refreshGroups);
    expect(afterAccountSwitch.createGroup).not.toBe(initialCallbacks.createGroup);
    expect(afterAccountSwitch.loadLeaderboard).not.toBe(initialCallbacks.loadLeaderboard);
    expect(afterAccountSwitch.setAnonymity).not.toBe(initialCallbacks.setAnonymity);
    expect(afterAccountSwitch.loadInvites).not.toBe(initialCallbacks.loadInvites);
    expect(afterAccountSwitch.createInvite).not.toBe(initialCallbacks.createInvite);
    expect(afterAccountSwitch.revokeInvite).not.toBe(initialCallbacks.revokeInvite);
    expect(afterAccountSwitch.previewInvite).not.toBe(initialCallbacks.previewInvite);
    expect(afterAccountSwitch.acceptInvite).not.toBe(initialCallbacks.acceptInvite);
  });
});
