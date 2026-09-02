export type ReminderTime = {
  hour: number;
  minute: number;
};

export function parseReminderTime(value: unknown): ReminderTime {
  if (
    typeof value !== "object" ||
    value === null ||
    !("hour" in value) ||
    !("minute" in value) ||
    typeof value.hour !== "number" ||
    typeof value.minute !== "number" ||
    !Number.isInteger(value.hour) ||
    !Number.isInteger(value.minute) ||
    value.hour < 0 ||
    value.hour > 23 ||
    value.minute < 0 ||
    value.minute > 59
  ) {
    throw new Error("INVALID_REMINDER_TIME");
  }
  return { hour: value.hour, minute: value.minute };
}

export function toPickerDate(value: ReminderTime) {
  const time = parseReminderTime(value);
  const date = new Date();
  date.setHours(time.hour, time.minute, 0, 0);
  return date;
}

export function fromPickerDate(value: Date): ReminderTime {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error("INVALID_REMINDER_TIME");
  }
  return parseReminderTime({
    hour: value.getHours(),
    minute: value.getMinutes(),
  });
}
