"use client";

import { useCallback } from "react";
import { GoogleAnalytics, sendGAEvent } from "@next/third-parties/google";
import { useConsent } from "@/app/components/Wrapper/Consent/ConsentWrapper";

// Read here rather than passed down from the layout, so the component that mounts gtag and the
// hook that reports to it can never disagree about whether analytics exists at all. A
// `NEXT_PUBLIC_` variable is inlined at build time, which is why a client file may read it.
export const GA_ID = process.env["NEXT_PUBLIC_GA_ID"];

// Nothing is loaded until the visitor agrees, rather than loading gtag in a denied consent
// state. GA4 Consent Mode would still ping Google on a refusal, and one measurement id is not
// worth that.
export function Analytics() {
  const { consent } = useConsent();

  if (!GA_ID || consent !== "granted") return null;

  return <GoogleAnalytics gaId={GA_ID} />;
}

// The one way to report an event, so the consent check is never left to the caller. Calling
// `sendGAEvent` when gtag was not mounted is not merely a no-op: it warns into the console of
// the very visitor who asked not to be measured. The guard therefore matches `Analytics`
// exactly, since a missing id leaves gtag unmounted just as a refusal does.
export function useAnalyticsEvent() {
  const { consent } = useConsent();

  return useCallback(
    (name: string) => {
      if (!GA_ID || consent !== "granted") return;
      sendGAEvent("event", name);
    },
    [consent]
  );
}
