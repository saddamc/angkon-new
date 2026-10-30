"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { pageview, logEventTelemetry } from "@/lib/fpixel";

export interface PixelConfig {
  enabled: boolean;
  pixelId: string;
  testEventCode?: string;
  trackPageView?: boolean;
  trackViewContent?: boolean;
  trackAddToCart?: boolean;
  trackInitiateCheckout?: boolean;
  trackPurchase?: boolean;
}

function FacebookPixelNavigationTracker({
  pixelId,
  testEventCode,
  eventsConfig,
}: {
  pixelId: string;
  testEventCode?: string;
  eventsConfig: {
    trackPageView: boolean;
    trackViewContent: boolean;
    trackAddToCart: boolean;
    trackInitiateCheckout: boolean;
    trackPurchase: boolean;
  };
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__angkon_meta_test_code = testEventCode || undefined;
      window.__angkon_pixel_events_config = eventsConfig;
    }
  }, [testEventCode, eventsConfig]);

  useEffect(() => {
    if (!pixelId) return;
    if (eventsConfig.trackPageView === false) return;

    // The base <Script> tag fires the initial PageView on page load (if enabled).
    // Subsequent client-side route navigations are tracked here.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    pageview();
  }, [pathname, searchParams, pixelId, eventsConfig]);

  return null;
}

export function FacebookPixel({ initialConfig }: { initialConfig?: PixelConfig | null }) {
  // Initialize with server-provided config if available
  const [config, setConfig] = useState<PixelConfig | null>(() => {
    if (!initialConfig) return null;
    return {
      enabled: Boolean(initialConfig.enabled),
      pixelId: (initialConfig.pixelId || "").trim(),
      testEventCode: initialConfig.testEventCode || "",
      trackPageView: initialConfig.trackPageView !== false,
      trackViewContent: initialConfig.trackViewContent !== false,
      trackAddToCart: initialConfig.trackAddToCart !== false,
      trackInitiateCheckout: initialConfig.trackInitiateCheckout !== false,
      trackPurchase: initialConfig.trackPurchase !== false,
    };
  });

  // Re-fetch live config from database on client mount (bypasses Next.js static build caches)
  useEffect(() => {
    let ignore = false;
    fetch("/api/pixel/config", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((live) => {
        if (!ignore && live) {
          setConfig({
            enabled: Boolean(live.enabled),
            pixelId: String(live.pixelId || "").trim(),
            testEventCode: live.testEventCode || "",
            trackPageView: live.events?.trackPageView !== false && live.events?.pageView !== false,
            trackViewContent: live.events?.trackViewContent !== false && live.events?.viewContent !== false,
            trackAddToCart: live.events?.trackAddToCart !== false && live.events?.addToCart !== false,
            trackInitiateCheckout: live.events?.trackInitiateCheckout !== false && live.events?.initiateCheckout !== false,
            trackPurchase: live.events?.trackPurchase !== false && live.events?.purchase !== false,
          });
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, []);

  const activePixelId = (config ? config.pixelId : (initialConfig?.pixelId || "")).trim();
  const isEnabled = config ? Boolean(config.enabled && activePixelId) : Boolean(initialConfig?.enabled && activePixelId);

  const testEventCode = config?.testEventCode?.trim() || initialConfig?.testEventCode?.trim();
  const eventsConfig = useMemo(() => ({
    trackPageView: (config?.trackPageView ?? initialConfig?.trackPageView) !== false,
    trackViewContent: (config?.trackViewContent ?? initialConfig?.trackViewContent) !== false,
    trackAddToCart: (config?.trackAddToCart ?? initialConfig?.trackAddToCart) !== false,
    trackInitiateCheckout: (config?.trackInitiateCheckout ?? initialConfig?.trackInitiateCheckout) !== false,
    trackPurchase: (config?.trackPurchase ?? initialConfig?.trackPurchase) !== false,
  }), [config, initialConfig]);

  // Synchronize client-side global tracking flags
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__angkon_meta_enabled = isEnabled;
      window.__angkon_pixel_events_config = eventsConfig;
      window.__angkon_meta_test_code = testEventCode || undefined;

      // If tracking is disabled, revoke Meta consent immediately
      if (!isEnabled && typeof window.fbq === "function") {
        try {
          window.fbq("consent", "revoke");
        } catch {
          // ignore
        }
      }
    }
  }, [isEnabled, eventsConfig, testEventCode]);

  // If master tracking is paused or pixel ID is empty, completely suppress script
  if (!isEnabled || !activePixelId) {
    return null;
  }

  return (
    <>
      <Suspense fallback={null}>
        <FacebookPixelNavigationTracker
          pixelId={activePixelId}
          testEventCode={testEventCode}
          eventsConfig={eventsConfig}
        />
      </Suspense>

      {/* Meta Pixel Base Initialization */}
      <Script
        id="facebook-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${activePixelId}');
            ${
              eventsConfig.trackPageView
                ? testEventCode
                  ? `fbq('track', 'PageView', { test_event_code: '${testEventCode}' });`
                  : `fbq('track', 'PageView');`
                : ""
            }
          `,
        }}
        onLoad={() => {
          if (eventsConfig.trackPageView) {
            logEventTelemetry(
              "PageView",
              testEventCode ? { test_event_code: testEventCode } : {},
              testEventCode
            );
          }
        }}
      />

      {/* Fallback for users/crawlers with JavaScript disabled */}
      {eventsConfig.trackPageView && (
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${activePixelId}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
      )}
    </>
  );
}

export default FacebookPixel;
