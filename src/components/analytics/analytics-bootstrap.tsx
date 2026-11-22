"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import {
  gaMeasurementId,
  metaPixelId,
  readConsent,
  subscribeConsent,
  trackPageView,
  type ConsentValue,
} from "@/lib/analytics";

function getConsentSnapshot(): ConsentValue | null {
  return readConsent();
}

function getConsentServerSnapshot(): ConsentValue | null {
  return null;
}

/**
 * Loads GA4 + Meta Pixel only after shopper consent, and only when IDs are set.
 * Safe no-op when env vars are empty.
 */
export function AnalyticsBootstrap() {
  const consent = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getConsentServerSnapshot,
  );
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const gaId = gaMeasurementId();
  const metaId = metaPixelId();
  const enabled = consent === "accepted";

  useEffect(() => {
    if (!enabled) return;
    if (!gaId && !metaId) return;
    const path = `${pathname}${searchParams?.toString() ? `?${searchParams}` : ""}`;
    // Retry briefly so page_view lands after gtag/fbq stubs initialize.
    let attempts = 0;
    const tick = () => {
      const gaOk = !gaId || typeof window.gtag === "function";
      const metaOk = !metaId || typeof window.fbq === "function";
      if (gaOk && metaOk) {
        trackPageView(path);
        return;
      }
      attempts += 1;
      if (attempts < 20) window.setTimeout(tick, 50);
    };
    tick();
  }, [enabled, gaId, metaId, pathname, searchParams]);

  if (!enabled) return null;

  return (
    <>
      {gaId ? (
        <>
          <Script id="garmentloop-ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){window.dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${gaId}', { send_page_view: false, anonymize_ip: true });
            `}
          </Script>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`}
            strategy="afterInteractive"
          />
        </>
      ) : null}
      {metaId ? (
        <Script id="garmentloop-meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
            (window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${metaId}');
          `}
        </Script>
      ) : null}
    </>
  );
}
