"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { readConsent } from "@/lib/analytics/consent";
import {
  isAllPixelsReady,
  isAnyPixelReady,
  subscribeConsent,
} from "@/lib/analytics/ready";

const SCRIPT_WAIT_MS = 100;
const MAX_SCRIPT_WAITS = 50; // ~5s after Accept while gtag/fbq load

/**
 * Runs `track` once when analytics consent + pixel runtimes are ready.
 * Waits for consent via event (no polling while undecided/declined).
 * After Accept, waits for all configured pixels; if the cap elapses with
 * at least one pixel ready, fires anyway so a slow secondary tag cannot block.
 */
export function useTrackWhenReady(track: () => boolean | void, deps: unknown[]) {
  const doneRef = useRef(false);
  const onTrack = useEffectEvent(track);

  useEffect(() => {
    doneRef.current = false;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let scriptWaits = 0;
    let trackWaits = 0;

    function clearTimer() {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    }

    function schedule(next: () => void) {
      clearTimer();
      timer = setTimeout(next, SCRIPT_WAIT_MS);
    }

    function attempt() {
      if (cancelled || doneRef.current) return;
      clearTimer();

      const consent = readConsent();
      if (consent !== "accepted") {
        // Undecided or Essential only — wait for a consent event, do not poll.
        return;
      }

      const allReady = isAllPixelsReady();
      const anyReady = isAnyPixelReady();
      if (!allReady) {
        scriptWaits += 1;
        if (scriptWaits <= MAX_SCRIPT_WAITS) {
          schedule(attempt);
          return;
        }
        // Cap elapsed: proceed only if at least one pixel loaded.
        if (!anyReady) return;
      }

      const result = onTrack();
      if (result === false) {
        trackWaits += 1;
        if (trackWaits <= MAX_SCRIPT_WAITS) schedule(attempt);
        return;
      }
      doneRef.current = true;
    }

    attempt();
    const unsubscribe = subscribeConsent(() => {
      scriptWaits = 0;
      trackWaits = 0;
      attempt();
    });
    return () => {
      cancelled = true;
      clearTimer();
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies semantic deps
  }, deps);
}
