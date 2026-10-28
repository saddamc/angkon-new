"use client";

import { useEffect, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { FB_PIXEL_ID, pageview, logEventTelemetry } from "@/lib/fpixel";

interface PixelConfig {
  enabled: boolean;
  pixelId: string;
  testEventCode?: string;
}

function FacebookPixelNavigationTracker({
  pixelId,
  testEventCode,
}: {
  pixelId: string;
  testEventCode?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__angkon_meta_test_code = testEventCode || undefined;
    }
  }, [testEventCode]);

  useEffect(() => {
    if (!pixelId) return;

    // The base <Script> tag fires the initial PageView on page load.
    // We only trigger pageview() on subsequent client-side route navigations.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    pageview();
  }, [pathname, searchParams, pixelId]);

  return null;
}

export function FacebookPixel({ initialConfig }: { initialConfig?: PixelConfig | null }) {
  // Use DB configured pixel ID if provided, otherwise fallback to environment variable
  const activePixelId = (initialConfig?.pixelId || FB_PIXEL_ID || "").trim();
  const isEnabled = initialConfig ? initialConfig.enabled : Boolean(activePixelId);

  if (!isEnabled || !activePixelId) {
    return null;
  }

  const testEventCode = initialConfig?.testEventCode?.trim();

  return (
    <>
      <Suspense fallback={null}>
        <FacebookPixelNavigationTracker
          pixelId={activePixelId}
          testEventCode={testEventCode}
        />
      </Suspense>

      {/* Meta Pixel Base Initialization & Initial PageView */}
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
              testEventCode
                ? `fbq('track', 'PageView', { test_event_code: '${testEventCode}' });`
                : `fbq('track', 'PageView');`
            }
          `,
        }}
        onLoad={() => {
          logEventTelemetry(
            "PageView",
            testEventCode ? { test_event_code: testEventCode } : {},
            testEventCode
          );
        }}
      />

      {/* Fallback for users/crawlers with JavaScript disabled */}
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${activePixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

export default FacebookPixel;
