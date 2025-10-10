"use client";

type AnalyticsPayload = Record<string, unknown> | undefined;

export function trackEvent(eventName: string, payload?: AnalyticsPayload): void {
  if (typeof window === "undefined") return;

  try {
    // Google Analytics (gtag)
    const gtag = (window as any).gtag as
      | ((...args: unknown[]) => void)
      | undefined;
    if (gtag) {
      gtag("event", eventName, payload ?? {});
    }

    // Plausible
    const plausible = (window as any).plausible as
      | ((event: string, opts?: { props?: Record<string, unknown> }) => void)
      | undefined;
    if (plausible) {
      plausible(eventName, payload ? { props: payload } : undefined);
    }

    // Generic dataLayer push (e.g., GTM)
    const dataLayer = (window as any).dataLayer as any[] | undefined;
    if (Array.isArray(dataLayer)) {
      dataLayer.push({ event: eventName, ...(payload ?? {}) });
    }
  } catch (_) {
    // no-op
  }
}


