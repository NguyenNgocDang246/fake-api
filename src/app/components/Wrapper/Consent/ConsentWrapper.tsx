"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { COOKIE_CONSENT_STORAGE_KEY } from "@/app/components/Wrapper/QueryClient/Constants";

// `null` is "not answered yet", which is what shows the banner. It is not the same as "denied":
// a visitor who declined is never asked again.
export type ConsentValue = "granted" | "denied" | null;

interface ConsentContextValue {
  consent: ConsentValue;
  // False until the stored answer has been read, so nothing renders off a value that is only
  // null because the effect has not run.
  ready: boolean;
  setConsent: (next: ConsentValue) => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

function readStoredConsent(): ConsentValue {
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    return raw === "granted" || raw === "denied" ? raw : null;
  } catch {
    return null;
  }
}

// Expiring a cookie needs the same path and domain it was set on. GA sets `_ga` on the
// registrable domain, so the host itself and every parent of it are cleared in turn.
function clearAnalyticsCookies() {
  const names = document.cookie
    .split(";")
    .map((entry) => entry.split("=")[0]?.trim() ?? "")
    .filter((name) => name === "_ga" || name.startsWith("_ga_"));

  const parts = window.location.hostname.split(".");
  const domains = parts.map((_, index) => parts.slice(index).join("."));

  for (const name of names) {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    for (const domain of domains) {
      document.cookie = `${name}=; path=/; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = `${name}=; path=/; domain=.${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }
}

export function ConsentWrapper({ children }: { children: React.ReactNode }) {
  const [consent, setConsentState] = useState<ConsentValue>(null);
  const [ready, setReady] = useState(false);

  // Read after mount, never during render: the server has no localStorage and the markup
  // would not match.
  useEffect(() => {
    const stored = readStoredConsent();
    setConsentState(stored);
    setReady(true);

    // Sweep on every load without consent, not only at the moment consent is withdrawn. A tab
    // whose gtag was still alive can rewrite a cookie in the gap before it reloads, and racing
    // it is unwinnable, so the deletion is repeated once the script is provably gone.
    if (stored !== "granted") clearAnalyticsCookies();
  }, []);

  // A second tab still has gtag running, and it rewrites the `_ga` cookies this tab just
  // deleted. `storage` fires only in the other tabs, so withdrawing consent anywhere clears
  // them everywhere instead of leaving the promise on the privacy page half kept.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== COOKIE_CONSENT_STORAGE_KEY) return;
      const next: ConsentValue =
        event.newValue === "granted" || event.newValue === "denied" ? event.newValue : null;

      // Only a tab already running gtag needs the document restarted to be rid of it. The rest
      // just follow the new answer, so nobody watches an idle tab reload for no reason.
      if (consent === "granted" && next !== "granted") {
        clearAnalyticsCookies();
        window.location.reload();
        return;
      }

      setConsentState(next);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [consent]);

  const setConsent = useCallback(
    (next: ConsentValue) => {
      const revoking = consent === "granted" && next !== "granted";

      try {
        if (next) window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, next);
        else window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
      } catch {
        // A browser refusing storage still gets the choice honoured for this page view, it
        // just gets asked again next time.
      }

      // gtag is already on the page and cannot be unloaded, so the only way to actually stop
      // it is to drop its cookies and start the document over.
      if (revoking) {
        clearAnalyticsCookies();
        window.location.reload();
        return;
      }

      setConsentState(next);
    },
    [consent]
  );

  return (
    <ConsentContext.Provider value={{ consent, ready, setConsent }}>
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextValue {
  const context = useContext(ConsentContext);
  if (!context) throw new Error("useConsent must be used inside ConsentWrapper");
  return context;
}
