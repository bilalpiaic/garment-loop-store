"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { isTrackingReady, subscribeConsent } from "@/lib/analytics/ready";

/**
 * Runs `track` once when analytics consent + pixel runtimes are ready.
 * Retries on consent changes and briefly while scripts finish loading.
 * Return `false` from `track` to keep retrying; otherwise treated as done.
 */
export function useTrackWhenReady(track: () => boolean | void, deps: unknown[]) {
  const doneRef = useRef(false);
  const onTrack = useEffectEvent(track);

  useEffect(() => {
    doneRef.current = false;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function attempt() {
      if (cancelled || doneRef.current) return;
      if (!isTrackingReady()) {
        timer = setTimeout(attempt, 100);
        return;
      }
      const result = onTrack();
      if (result === false) {
        timer = setTimeout(attempt, 100);
        return;
      }
      doneRef.current = true;
    }

    attempt();
    const unsubscribe = subscribeConsent(attempt);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies semantic deps
  }, deps);
}
