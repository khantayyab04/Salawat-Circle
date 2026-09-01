const MAX_ENTRY_AMOUNT = 10_000_000;

export function parseEntryAmount(value: string) {
  const trimmed = value.trim();
  const isDigits = /^\d+$/u.test(trimmed);
  const isGrouped = /^\d{1,3}([.,]\d{3})+$/u.test(trimmed);
  if (!isDigits && !isGrouped) {
    throw new Error("INVALID_AMOUNT");
  }

  const normalized = trimmed.replace(/[.,]/g, "");
  const amount = Number(normalized);
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > MAX_ENTRY_AMOUNT) {
    throw new Error("INVALID_AMOUNT");
  }

  return amount;
}
