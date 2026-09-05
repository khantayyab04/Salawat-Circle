type Coordinates = { latitude: number; longitude: number };

const timezoneCoordinates: Record<string, Coordinates> = {
  "Europe/Berlin": { latitude: 52.52, longitude: 13.405 },
  "Europe/London": { latitude: 51.507, longitude: -0.128 },
  "Europe/Istanbul": { latitude: 41.008, longitude: 28.978 },
  "America/New_York": { latitude: 40.713, longitude: -74.006 },
  "America/Los_Angeles": { latitude: 34.052, longitude: -118.244 },
  "Asia/Karachi": { latitude: 24.86, longitude: 67.01 },
  "Asia/Dubai": { latitude: 25.205, longitude: 55.271 },
  "Asia/Jakarta": { latitude: -6.209, longitude: 106.846 },
  "Africa/Cairo": { latitude: 30.044, longitude: 31.236 },
};

const fallbackSunsetMinutes = 18 * 60;
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

export function getSunsetMinutes(date: string, timezone: string) {
  const location = timezoneCoordinates[timezone];
  if (!location) return fallbackSunsetMinutes;

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
  if (hourAngleCosine < -1 || hourAngleCosine > 1) return fallbackSunsetMinutes;
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
