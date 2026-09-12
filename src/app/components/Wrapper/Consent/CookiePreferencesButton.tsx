"use client";

import { GA_ID } from "@/app/components/Wrapper/Consent/Analytics";
import { useConsent } from "@/app/components/Wrapper/Consent/ConsentWrapper";

// A button and not a TextLink, because it goes nowhere. The classes match the muted links it
// sits beside in the footer.
const CLASSES = "cursor-pointer text-gray-600 hover:text-gray-900 hover:underline";

export function CookiePreferencesButton() {
  const { setConsent } = useConsent();

  // Nothing to configure where no measurement id was built in. The id is a build-time constant,
  // so this is decided identically on the server and in the browser and costs no layout shift.
  if (!GA_ID) return null;

  // Clearing the answer is what reopens the banner, so there is one place the choice is made
  // and the two can never disagree. Revoking an accepted consent reloads, and the banner is
  // waiting afterwards.
  return (
    <button type="button" className={CLASSES} onClick={() => setConsent(null)}>
      Cookie preferences
    </button>
  );
}
