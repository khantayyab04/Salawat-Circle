import { describe, expect, it, jest } from "@jest/globals";
import { getMockConfig } from "expo-router/testing-library";

jest.mock("expo-sqlite/localStorage/install", () => ({}));

type RouteNode =
  | string
  | { path?: string; screens?: Record<string, RouteNode> };

function collectRoutes(
  screens: Record<string, RouteNode>,
  prefix = "",
  routes = new Set<string>(),
) {
  for (const node of Object.values(screens)) {
    if (typeof node === "string") {
      const route = [prefix, node].filter(Boolean).join("/");
      if (route && !route.startsWith("_") && !route.includes("*"))
        routes.add(route);
      continue;
    }

    const segment = node.path?.startsWith("(") ? "" : node.path;
    const nextPrefix = [prefix, segment].filter(Boolean).join("/");
    if (node.screens) collectRoutes(node.screens, nextPrefix, routes);
  }

  return routes;
}

describe("MVP02 route inventory", () => {
  it("registers every public shell route", () => {
    const config = getMockConfig("src/app") as {
      screens: Record<string, RouteNode>;
    };
    const routes = collectRoutes(config.screens);

    for (const route of [
      "welcome",
      "auth/email",
      "auth/code",
      "onboarding/profile",
      "onboarding/consent",
      "today",
      "entry/:id/edit",
      "groups",
      "groups/create",
      "groups/:id",
      "groups/:id/members",
      "groups/:id/invites",
      "join",
      "join/:token",
      "settings",
      "settings/profile",
      "settings/reminder",
      "settings/privacy",
      "settings/legal",
      "settings/support",
    ]) {
      expect(routes).toContain(route);
    }
  });
});
