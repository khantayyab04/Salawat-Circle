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
  it("registers the streamlined route inventory without legacy duplicates", () => {
    const config = getMockConfig("src/app") as {
      screens: Record<string, RouteNode>;
    };
    const routes = collectRoutes(config.screens);

    for (const route of [
      "welcome",
      "auth",
      "onboarding",
      "today",
      "progress",
      "groups",
      "groups/create",
      "groups/:id",
      "groups/:id/members",
      "groups/:id/invites",
      "groups/:id/manage",
      "join",
      "join/:token",
      "account",
      "account/profile",
      "account/reminder",
      "account/privacy",
      "account/legal",
      "account/support",
    ]) {
      expect(routes).toContain(route);
    }
    for (const retiredRoute of [
      "auth/email",
      "auth/code",
      "onboarding/profile",
      "onboarding/consent",
      "entry/:id/edit",
      "settings",
    ]) {
      expect(routes).not.toContain(retiredRoute);
    }
  });
});
