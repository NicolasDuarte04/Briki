import { type CurrencyCode, type Money } from "@/lib/types";

const DEFAULT_LOCALE = "en-US" as const;

const CURRENCY_FRACTION_DIGITS: Record<CurrencyCode, number> = {
  COP: 2,
  USD: 2,
  MXN: 2,
  EUR: 2,
};

export interface FormatMoneyOptions {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  currencyDisplay?: Intl.NumberFormatOptions["currencyDisplay"];
  fallback?: string;
}

export function formatMoney(money: Money | null | undefined, options: FormatMoneyOptions = {}): string {
  const {
    locale = DEFAULT_LOCALE,
    minimumFractionDigits,
    maximumFractionDigits,
    currencyDisplay,
    fallback = "—",
  } = options;

  if (!money) {
    return fallback;
  }

  try {
    const { amountMinor, currency } = money;
    const fractionDigits = CURRENCY_FRACTION_DIGITS[currency] ?? 2;
    const resolvedMinimumFractionDigits = minimumFractionDigits ?? fractionDigits;
    const resolvedMaximumFractionDigits = maximumFractionDigits ?? fractionDigits;

    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: resolvedMinimumFractionDigits,
      maximumFractionDigits: resolvedMaximumFractionDigits,
      currencyDisplay,
    });

    const amountMajor = amountMinor / 10 ** fractionDigits;
    return formatter.format(amountMajor);
  } catch {
    return fallback;
  }
}

export function getMoneyAmountMajor(money: Money): number {
  const fractionDigits = CURRENCY_FRACTION_DIGITS[money.currency] ?? 2;
  return money.amountMinor / 10 ** fractionDigits;
}

export function createMoneyFromMajor(amountMajor: number, currency: CurrencyCode): Money {
  const fractionDigits = CURRENCY_FRACTION_DIGITS[currency] ?? 2;
  const multiplier = 10 ** fractionDigits;
  const amountMinor = Math.round(amountMajor * multiplier);
  return {
    amountMinor,
    currency,
  };
}

/** ISO 8601 formatted date string (e.g., 2025-01-30T18:45:00Z). */
export type ISODateString = string;

export interface FormatDateOptions extends Intl.DateTimeFormatOptions {
  locale?: string;
  fallback?: string;
}

export function parseISODate(isoString: ISODateString): Date {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Invalid ISO date string: ${isoString}`);
  }
  return date;
}

export function formatDate(isoString: ISODateString | null | undefined, options: FormatDateOptions = {}): string {
  const { locale = DEFAULT_LOCALE, fallback = "—", ...dateOptions } = options;

  if (!isoString) {
    return fallback;
  }

  try {
    const date = parseISODate(isoString);
    const formatter = new Intl.DateTimeFormat(locale, dateOptions);
    return formatter.format(date);
  } catch {
    return fallback;
  }
}

