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
});
