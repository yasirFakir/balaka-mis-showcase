"use client";

import { useCurrency } from "../currency-context";

/**
 * Convenience hook for formatting financial amounts.
 * Subscribes to global currency state (SAR/BDT).
 */
export function useCurrencyFormatter() {
  const { formatCurrency, currency, rate } = useCurrency();
  
  return {
    format: formatCurrency,
    mode: currency,
    exchangeRate: rate
  };
}
