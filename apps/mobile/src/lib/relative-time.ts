export type RelativeTimeCopy = {
  justNow: string;
  /** Uses `%{count}` for the number of minutes. */
  minutes: string;
  /** Uses `%{count}` for the number of hours. */
  hours: string;
  /** Uses `%{count}` for the number of days. */
  days: string;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Formats a timestamp as a short relative age, for example "2m ago".
 *
 * The design shows this in a small tile next to other figures, where a full
 * date would wrap or shrink into unreadability. A clock skew that puts the
 * timestamp slightly in the future is reported as "just now" rather than as a
 * negative age.
 */
export function formatRelativeTime(
  value: string,
  now: Date,
  copy: RelativeTimeCopy,
): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const elapsed = now.getTime() - parsed.getTime();
  if (elapsed < MINUTE) return copy.justNow;

  if (elapsed < HOUR) {
    return copy.minutes.replace("%{count}", String(Math.floor(elapsed / MINUTE)));
  }
  if (elapsed < DAY) {
    return copy.hours.replace("%{count}", String(Math.floor(elapsed / HOUR)));
  }
  return copy.days.replace("%{count}", String(Math.floor(elapsed / DAY)));
}
