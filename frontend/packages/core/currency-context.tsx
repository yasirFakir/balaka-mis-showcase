"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fetchClient } from "./api";

export type CurrencyMode = "SAR" | "BDT";

interface CurrencyContextType {
  currency: CurrencyMode;
  setCurrency: (mode: CurrencyMode) => void;
  rate: number;
  loading: boolean;
  formatCurrency: (amount: number) => string;
  formatCompactCurrency: (amount: number) => string;
  convertToBDT: (sarAmount: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyMode>("SAR");
  const [rate, setRate] = useState(32.0); // Default fallback
  const [loading, setLoading] = useState(false);

  // Persistence: Save preference to localStorage
  useEffect(() => {
    const saved = localStorage.getItem("gonia_currency") as CurrencyMode;
    if (saved && (saved === "SAR" || saved === "BDT")) {
      setCurrencyState(saved);
    }
    fetchRate();
  }, []);

  const setCurrency = (mode: CurrencyMode) => {
    setCurrencyState(mode);
    localStorage.setItem("gonia_currency", mode);
  };

  const fetchRate = async () => {
    setLoading(true);
    try {
      const data = await fetchClient<{ rate: number }>("/api/v1/system/currency-rate");
      if (data && data.rate) {
        setRate(Math.round(data.rate * 100) / 100);
      }
    } catch (error) {
      console.error("Failed to fetch exchange rate", error);
    } finally {
      setLoading(false);
    }
  };

  const convertToBDT = useCallback((sarAmount: number) => {
    return sarAmount * rate;
  }, [rate]);

  const formatCurrency = useCallback((amount: number) => {
    if (currency === "BDT") {
      const bdtAmount = convertToBDT(amount);
      return `৳${bdtAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `SR ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [currency, convertToBDT]);

  const formatCompactCurrency = useCallback((amount: number) => {
    const compactFormatter = new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    });

    if (currency === "BDT") {
      return `৳${compactFormatter.format(convertToBDT(amount))}`;
    }
    return `SR ${compactFormatter.format(amount)}`;
  }, [currency, convertToBDT]);

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      setCurrency, 
      rate, 
      loading, 
      formatCurrency, 
      formatCompactCurrency,
      convertToBDT
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
