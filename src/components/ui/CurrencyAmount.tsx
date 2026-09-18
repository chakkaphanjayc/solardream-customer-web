"use client";

import React, { useSyncExternalStore } from "react";
import { useCurrencyStore } from "@/store/useCurrencyStore";

const subscribeToMount = () => () => undefined;
const getMountedSnapshot = () => true;
const getServerSnapshot = () => false;

type CurrencyAmountProps = {
  amount: number | string;
  className?: string;
  prefix?: string;
  suffix?: string;
};

export default function CurrencyAmount({
  amount,
  className,
  prefix = "",
  suffix = "",
}: CurrencyAmountProps) {
  const currency = useCurrencyStore((state) => state.currency);
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const mounted = useSyncExternalStore(subscribeToMount, getMountedSnapshot, getServerSnapshot);

  const numericAmount = typeof amount === "number" ? amount : Number(String(amount || 0).replace(/,/g, ""));
  const safeNumeric = Number.isFinite(numericAmount) ? numericAmount : 0;

  const formatted = mounted
    ? formatCurrency(safeNumeric)
    : `${currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "JPY" ? "¥" : "฿"}${safeNumeric.toLocaleString()}`;

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
