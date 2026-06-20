export const fmtMoney = (n: number) =>
  "R " + new Intl.NumberFormat("en-ZA", { maximumFractionDigits: 0 }).format(n);

export const fmtMoneyDecimal = (n: number) =>
  "R " + new Intl.NumberFormat("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
