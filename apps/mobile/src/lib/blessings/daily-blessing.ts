import { getPersonalDate } from "@/lib/entries/calendar";
import { getSunsetMinutes, type Coordinates } from "@/lib/jumuah/sunset";
import { narrations } from "./narrations";

export function getDailyBlessing(now: Date, timeZone: string, coordinates?: Coordinates | null) {
  const date = getPersonalDate(now, timeZone);
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  const sunset = getSunsetMinutes(date, timeZone, coordinates);
  const parts = new Intl.DateTimeFormat("en", { timeZone, hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(now);
  const minutes = Number(parts.find(p => p.type === "hour")!.value) * 60 + Number(parts.find(p => p.type === "minute")!.value);
  const isFriday = sunset === null ? day === 5 : (day === 4 && minutes >= sunset) || (day === 5 && minutes < sunset);
  const pool = narrations.filter(narration => narration.friday === isFriday);
  const dayNumber = Math.floor(Date.parse(date) / 86_400_000);
  // Thursday evening and Friday share one Friday date and therefore one text.
  const index = isFriday ? Math.floor((dayNumber + (day === 4 ? 1 : 0)) / 7) : dayNumber;
  return { isFriday, sunset, narration: pool[((index % pool.length) + pool.length) % pool.length] };
}
