export function parseEmail(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("INVALID_EMAIL");
  }
  return normalized;
}

export function parseOtp(value: string) {
  if (!/^\d{6}$/.test(value)) {
    throw new Error("INVALID_OTP");
  }
  return value;
}

export function parseDisplayName(value: string) {
  const normalized = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  if (Array.from(normalized).length < 2 || Array.from(normalized).length > 30) {
    throw new Error("INVALID_DISPLAY_NAME");
  }
  return normalized;
}

export function parseTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
  } catch {
    throw new Error("INVALID_TIME_ZONE");
  }
  return value;
}
