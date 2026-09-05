"use client";

import { formatMoney, type Currency } from "@/lib/money";
import { usePreferenceStore } from "@/store/store";

export function Price({
  amountPkr,
  compareAtPkr,
  className,
}: {
  amountPkr: number;
  compareAtPkr?: number;
  className?: string;
}) {
  const currency = usePreferenceStore((state) => state.currency);
  return (
    <span className={className}>
      {compareAtPkr && compareAtPkr > amountPkr ? (
        <>
          <span className="mr-2 text-muted-foreground line-through">
            {formatMoney(compareAtPkr, currency)}
          </span>
          <span>{formatMoney(amountPkr, currency)}</span>
        </>
      ) : (
        formatMoney(amountPkr, currency)
      )}
    </span>
  );
}

export function Money({ amountPkr, currency }: { amountPkr: number; currency?: Currency }) {
  const stored = usePreferenceStore((state) => state.currency);
  return <>{formatMoney(amountPkr, currency ?? stored)}</>;
}
