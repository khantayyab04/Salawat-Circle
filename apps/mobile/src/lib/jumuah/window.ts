export type LocalSunset = {
  day: number;
  sunsetMinutes: number;
};

export function isJumuahWindow(
  localTime: Date,
  { day, sunsetMinutes }: LocalSunset,
) {
  if (day === 5) return true;
  if (day !== 4) return false;
  return localTime.getHours() * 60 + localTime.getMinutes() >= sunsetMinutes;
}
