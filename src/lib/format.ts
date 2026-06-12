// Currency-aware money formatting. The active currency defaults to ZAR
// (South African rand) and follows the user's choice in Settings → Profile.
// It's seeded synchronously from localStorage so reloads format correctly,
// then confirmed from the financial profile after sign-in.

export const SUPPORTED_CURRENCIES = [
  { code: "ZAR", label: "South African Rand (R)" },
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "AUD", label: "Australian Dollar (A$)" },
  { code: "NGN", label: "Nigerian Naira (₦)" },
  { code: "KES", label: "Kenyan Shilling (KSh)" },
  { code: "INR", label: "Indian Rupee (₹)" },
] as const;

const LOCALES: Record<string, string> = {
  ZAR: "en-ZA",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  AUD: "en-AU",
  NGN: "en-NG",
  KES: "en-KE",
  INR: "en-IN",
};

let activeCurrency = "ZAR";
if (typeof localStorage !== "undefined") {
  const saved = localStorage.getItem("fh-currency");
  if (saved && LOCALES[saved]) activeCurrency = saved;
}

export function getActiveCurrency() {
  return activeCurrency;
}

export function setActiveCurrency(code: string) {
  if (!LOCALES[code]) return;
  activeCurrency = code;
  if (typeof localStorage !== "undefined") localStorage.setItem("fh-currency", code);
}

export const fmtMoney = (n: number) =>
  new Intl.NumberFormat(LOCALES[activeCurrency] ?? "en-ZA", {
    style: "currency",
    currency: activeCurrency,
    maximumFractionDigits: 0,
  }).format(n);

export const fmtMoneyDecimal = (n: number) =>
  new Intl.NumberFormat(LOCALES[activeCurrency] ?? "en-ZA", {
    style: "currency",
    currency: activeCurrency,
  }).format(n);
