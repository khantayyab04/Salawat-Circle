import type { InviteKind } from "./types";

const INVITE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const INVITE_CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/;
const FALLBACK_JOIN_SCHEME = "salawat-circle://join";

export type InviteSecret = {
  kind: InviteKind;
  secret: string;
};

function trimTrailingSlashes(pathname: string): string {
  if (pathname === "/") {
    return "";
  }

  return pathname.replace(/\/+$/u, "");
}

function toSafeJoinBase(configuredBaseUrl?: string): string | null {
  if (!configuredBaseUrl) {
    return null;
  }

  const candidate = configuredBaseUrl.trim();
  if (candidate.length === 0) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") {
    return null;
  }

  if (parsed.username.length > 0 || parsed.password.length > 0) {
    return null;
  }

  if (parsed.search.length > 0 || parsed.hash.length > 0) {
    return null;
  }

  return `${parsed.origin}${trimTrailingSlashes(parsed.pathname)}`;
}

function readSingleRouteParam(
  value: string | string[] | undefined,
): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.length === 1 && typeof value[0] === "string") {
    return value[0];
  }

  return null;
}

export function normalizeTokenInvite(value: string): string | null {
  const normalized = value.trim();
  if (!INVITE_TOKEN_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
}

export function normalizeManualInviteCode(value: string): string | null {
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/gu, "");
  if (!INVITE_CODE_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
}

export function parseInviteSecretParam(
  value: string | string[] | undefined,
): InviteSecret | null {
  const routeParam = readSingleRouteParam(value);
  if (!routeParam) {
    return null;
  }

  const token = normalizeTokenInvite(routeParam);
  if (token) {
    return { kind: "token", secret: token };
  }

  const code = normalizeManualInviteCode(routeParam);
  if (code) {
    return { kind: "code", secret: code };
  }

  return null;
}

export function buildInviteLink(
  token: string,
  configuredBaseUrl?: string,
): string {
  const normalizedToken = normalizeTokenInvite(token);
  if (!normalizedToken) {
    throw new Error("INVALID_INVITE_TOKEN");
  }

  const safeBase = toSafeJoinBase(configuredBaseUrl);
  const encodedToken = encodeURIComponent(normalizedToken);

  if (safeBase) {
    return `${safeBase}/join/${encodedToken}`;
  }

  return `${FALLBACK_JOIN_SCHEME}/${encodedToken}`;
}
