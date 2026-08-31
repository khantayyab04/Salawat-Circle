const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const DAY_MS = 86_400_000;

function parseDate(value: string) {
  if (!DATE_PATTERN.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value ? date : null;
}

export function getPersonalDate(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone,
  }).formatToParts(instant);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export function getWeekStart(value: string) {
  const date = parseDate(value);
  if (!date) throw new Error("INVALID_DATE");
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - weekday + 1);
  return date.toISOString().slice(0, 10);
}

export function isEntryDateAllowed(value: string, today: string) {
  const entryDate = parseDate(value);
  const todayDate = parseDate(today);
  if (!entryDate || !todayDate) return false;
  const oldestDate = new Date(todayDate.getTime() - 365 * DAY_MS);
  return entryDate >= oldestDate && entryDate <= todayDate;
}
