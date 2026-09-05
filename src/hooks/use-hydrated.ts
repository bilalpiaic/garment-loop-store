"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useCartStore, usePreferenceStore } from "@/store/store";

function subscribe() {
  return () => undefined;
}

export function useHydrated() {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    try {
      void useCartStore.persist?.rehydrate?.();
      void usePreferenceStore.persist?.rehydrate?.();
    } catch {
      // Persist APIs are client-only.
    }
  }, []);

  return hydrated;
}
