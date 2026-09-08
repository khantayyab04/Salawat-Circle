export type Coordinates = { latitude: number; longitude: number };

const degrees = Math.PI / 180;

function normaliseDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function timeZoneOffsetMinutes(date: string, timezone: string) {
  const reference = new Date(`${date}T12:00:00.000Z`);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(reference);
  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const localAsUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
  );
  return Math.round((localAsUtc - reference.getTime()) / 60_000);
}

export function getSunsetMinutes(date: string, timezone: string, coordinates?: Coordinates | null) {
  const location = coordinates;
  if (!location) return null;

  const startOfYear = Date.UTC(Number(date.slice(0, 4)), 0, 0);
  const currentDay = new Date(`${date}T12:00:00.000Z`);
  const dayOfYear = Math.floor((currentDay.getTime() - startOfYear) / 86_400_000);
  const longitudeHour = location.longitude / 15;
  const approximateTime = dayOfYear + (18 - longitudeHour) / 24;
  const meanAnomaly = 0.9856 * approximateTime - 3.289;
  const trueLongitude = normaliseDegrees(
    meanAnomaly +
      1.916 * Math.sin(meanAnomaly * degrees) +
      0.02 * Math.sin(2 * meanAnomaly * degrees) +
      282.634,
  );
  let rightAscension = Math.atan(0.91764 * Math.tan(trueLongitude * degrees)) / degrees;
  rightAscension = normaliseDegrees(rightAscension);
  rightAscension +=
    Math.floor(trueLongitude / 90) * 90 - Math.floor(rightAscension / 90) * 90;
  rightAscension /= 15;
  const sinDeclination = 0.39782 * Math.sin(trueLongitude * degrees);
  const cosDeclination = Math.cos(Math.asin(sinDeclination));
  const hourAngleCosine =
    (Math.cos(90.833 * degrees) -
      sinDeclination * Math.sin(location.latitude * degrees)) /
    (cosDeclination * Math.cos(location.latitude * degrees));
  if (hourAngleCosine < -1 || hourAngleCosine > 1) return null;
  const localMeanTime =
    Math.acos(hourAngleCosine) / degrees / 15 +
    rightAscension -
    0.06571 * approximateTime -
    6.622;
  const universalHours = ((localMeanTime - longitudeHour) % 24 + 24) % 24;
  return Math.round(
    (universalHours * 60 + timeZoneOffsetMinutes(date, timezone) + 1_440) % 1_440,
  );
}
