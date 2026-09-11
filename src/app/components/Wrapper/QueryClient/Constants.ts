export const QUERY_KEY = {
  AUTH: {
    CHECK: "auth-check",
  },
  USER: {
    USAGE: "user-usage",
  },
  PROJECT: {
    ALL: "projects",
    ONE: "project",
  },
  ENDPOINT: {
    ALL: "endpoints",
    ONE: "endpoint",
  },
  ENDPOINT_GROUP: {
    ALL: "endpoint-groups",
    ONE: "endpoint-group",
  },
  AI: {
    STATUS: "ai-status",
  },
  GUEST: {
    SANDBOX: "guest-sandbox",
  },
};

// Where the home-page trial box remembers which sandbox belongs to this browser. It is the
// only thing tying a visitor to their endpoints, since a visitor has no session.
export const GUEST_SANDBOX_STORAGE_KEY = "fake-api.guest-sandbox";

// Whether this browser agreed to analytics cookies. Nothing is stored until the visitor
// answers, so an absent key means the banner has not been shown yet.
export const COOKIE_CONSENT_STORAGE_KEY = "fake-api.cookie-consent";

export const STALETIME = 5 * 60 * 1000;
