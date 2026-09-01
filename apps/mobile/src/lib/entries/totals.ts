export function addTotal(total: string, amount: string) {
  return (BigInt(total) + BigInt(amount)).toString();
}

export function subtractTotal(total: string, amount: string) {
  return (BigInt(total) - BigInt(amount)).toString();
}

export function totalFromAmounts(amounts: readonly string[]) {
  return amounts.reduce(addTotal, "0");
}
