/** Card demo is a sandbox payment path — never allow it in production unless explicitly opted in. */
export function cardDemoAllowed() {
  const flags = [
    process.env.ALLOW_CARD_DEMO,
    process.env.NEXT_PUBLIC_ALLOW_CARD_DEMO,
  ];
  if (flags.some((value) => value === "1" || value === "true")) {
    return true;
  }
  return process.env.NODE_ENV !== "production";
}

export function rejectCardDemoIfDisallowed(paymentMethod: string): string | null {
  if (paymentMethod === "card_demo" && !cardDemoAllowed()) {
    return "Card demo checkout is disabled in production.";
  }
  return null;
}
