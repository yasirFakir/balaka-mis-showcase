"use client";

import { useMemo } from "react";
import { ServiceRequest, Transaction, FinancialItem } from "../types";

/**
 * Shared hook for calculating financial status of a service request.
 * Centralizes logic for paid amounts, remaining balance, and profit.
 */
export function useRequestFinancials(request: ServiceRequest | null, transactions: Transaction[] = []) {
  return useMemo(() => {
    if (!request) {
      return {
        income: 0,
        expense: 0,
        profit: 0,
        paid: 0,
        pending: 0,
        refunded: 0,
        balance: 0,
        isSettled: false,
        isFullyPaid: false,
        isOverpaid: false,
        targetPrice: 0,
      };
    }

    const breakdown = (request.financial_breakdown as FinancialItem[]) || [];

    // 1. Calculate base Income & Expenses from breakdown
    let income = breakdown
      .filter((i) => i.type === "INCOME")
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    const expense = breakdown
      .filter((i) => i.type === "EXPENSE" || i.type === "PAYMENT")
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    const discount = breakdown
      .filter((i) => i.type === "DISCOUNT")
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    const payouts = breakdown
      .filter((i) => i.type === "PAYMENT")
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    // FALLBACK: If no explicit breakdown (income or payouts), use the request's selling_price or base_price
    if (income === 0 && payouts === 0) {
      income = request.selling_price > 0 
        ? request.selling_price 
        : (request.service_definition?.base_price || 0);
    }

    // 2. Calculate Transactional Data
    const verifiedTxns = transactions.filter((t) => t.status === "Verified");
    const pendingTxns = transactions.filter((t) => t.status === "Pending");

    const paid = verifiedTxns
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + (t.amount + (t.discount || 0)), 0);

    const pending = pendingTxns
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const refunded = verifiedTxns
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // 3. Final Aggregates
    // For internal ops, target is (Income - Discount) + Payouts (we need to pay this out)
    const targetPrice = Math.max(0, (income - discount) + payouts);
    const netPaid = paid - refunded;
    const rawBalance = targetPrice - netPaid;
    const balance = Math.round(rawBalance * 100) / 100; // Precision fix

    const profit = targetPrice - expense;
    // Considered settled if we have either Income (Client) or Payouts (Internal) defined
    const isSettled = income > 0 || payouts > 0;
    const isFullyPaid = balance <= 0 && isSettled;
    const isOverpaid = balance < 0;

    return {
      income,
      expense,
      discount,
      profit,
      paid,
      pending,
      refunded,
      balance,
      isSettled,
      isFullyPaid,
      isOverpaid,
      targetPrice,
    };
  }, [request, transactions]);
}
