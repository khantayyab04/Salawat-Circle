const maximumEntryAmount = 10_000_000;

export type Tally = {
  amount: number;
  limitReached: boolean;
};

export function createTally(amount = 0): Tally {
  return { amount, limitReached: false };
}

export function addTallyAmount(current: Tally, amount: number): Tally {
  const nextAmount = current.amount + amount;
  if (nextAmount > maximumEntryAmount) {
    return { ...current, limitReached: true };
  }
  return { amount: nextAmount, limitReached: false };
}

export function resetTally(_: Tally): Tally {
  return createTally();
}
