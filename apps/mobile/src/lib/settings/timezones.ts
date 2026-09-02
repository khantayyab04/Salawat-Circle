import { parseTimeZone } from "@/lib/auth/validation";

const COMMON_TIME_ZONES = [
  "Europe/Berlin",
  "Europe/London",
  "Europe/Paris",
  "Europe/Istanbul",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Jakarta",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
];

function isValidTimeZone(value: string) {
  try {
    parseTimeZone(value);
    return true;
  } catch {
    return false;
  }
}

export function getTimeZoneOptions(detected: string, saved: string) {
  return [...new Set([detected, saved, ...COMMON_TIME_ZONES])]
    .filter(isValidTimeZone)
    .sort((left, right) => left.localeCompare(right));
}
