"use client";

import { useEffect, useRef, useState } from "react";
import { ActionButton } from "@/app/components/Button/ActionButton";
import { TextLink } from "@/app/components/Link/TextLink";
import { GA_ID } from "@/app/components/Wrapper/Consent/Analytics";
import { useConsent } from "@/app/components/Wrapper/Consent/ConsentWrapper";
import { PAGE_ROUTES } from "@/app/libs/routes";

// Above the page, below the sticky header. The header's z-20 is a stacking context, so a bar
// above it would also cover the mobile menu that opens inside it. The two never share space:
// the bar is pinned to the bottom and the header to the top.
const LAYER = "z-10";

export function CookieBanner() {
  const { consent, ready, setConsent } = useConsent();
  const barRef = useRef<HTMLDivElement>(null);
  const [barHeight, setBarHeight] = useState(0);

  // The bar is fixed, so without a spacer of its own height it sits on top of the end of the
  // page, and on a narrow screen it wraps to three lines and buries the footer entirely.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const observer = new ResizeObserver(() => setBarHeight(bar.offsetHeight));
    observer.observe(bar);
    return () => observer.disconnect();
  }, [ready, consent]);

  // With no measurement id there is no script to ask about, so local work and any deploy made
  // before GA was configured do not pester a visitor for permission that buys nothing.
  if (!GA_ID || !ready || consent !== null) return null;

  return (
    <>
      <div style={{ height: barHeight }} aria-hidden />

      <div
        ref={barRef}
        className={`fixed inset-x-0 bottom-0 ${LAYER} border-t border-gray-200 bg-white px-4 py-4 shadow-lg sm:px-8`}
        role="region"
        aria-label="Cookie consent"
      >
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed text-gray-600">
            We use Google Analytics to see which pages are worth keeping. It sets cookies in your
            browser, and nothing loads until you say yes. Read the{" "}
            <TextLink href={PAGE_ROUTES.PRIVACY} className="text-blue-600 hover:underline">
              privacy policy
            </TextLink>{" "}
            for what it collects.
          </p>

          <div className="flex w-full shrink-0 justify-end gap-2 sm:w-auto">
            <ActionButton label="Reject" onClick={() => setConsent("denied")} className="text-sm" />
            <ActionButton
              label="Accept"
              variant="create"
              onClick={() => setConsent("granted")}
              className="text-sm"
            />
          </div>
        </div>
      </div>
    </>
  );
}
