// The endpoint CRUD templates a component needs. `API_ROUTES.ENDPOINT` and
// `API_ROUTES.GUEST.ENDPOINT` both satisfy it, which is what lets one component serve both.
export interface EndpointRoutes {
  GET_ALL: string;
  CREATE: string;
  UPDATE_BY_ID: string;
  DELETE_BY_ID: string;
}

export const API_ROUTES = {
  AUTH: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    LOGOUT: "/api/auth/logout",
    CHECK: "/api/auth/check",
    REFRESH_TOKEN: "/api/auth/refresh-token",
    EMAIL: {
      VERIFY: "/api/auth/email/verify",
      RESEND: "/api/auth/email/resend",
    },
    PASSWORD: {
      FORGOT: "/api/auth/password/forgot",
      RESET: "/api/auth/password/reset",
      CHANGE: "/api/auth/password/change",
    },
    GOOGLE: {
      LOGIN: "/api/auth/google",
    },
  },
  USER: {
    GET: "/api/user",
    USAGE: "/api/user/usage",
    CREATE: "/api/user",
  },
  PROJECT: {
    GET_ALL: "/api/project",
    DELETE_ALL: "/api/project",
    GET_BY_ID: "/api/project/:projectId",
    DELETE_BY_ID: "/api/project/:projectId",
    CREATE: "/api/project",
    UPDATE_BY_ID: "/api/project/:projectId",
  },
  ENDPOINT_GROUP: {
    GET_ALL: "/api/project/:projectId/endpoint-group",
    GET_BY_ID: "/api/project/:projectId/endpoint-group/:endpointGroupId",
    CREATE: "/api/project/:projectId/endpoint-group",
    UPDATE_BY_ID: "/api/project/:projectId/endpoint-group/:endpointGroupId",
    DELETE_BY_ID: "/api/project/:projectId/endpoint-group/:endpointGroupId",
  },
  ENDPOINT: {
    GET_ALL: "/api/project/:projectId/endpoint-group/:endpointGroupId/endpoint",
    GET_BY_ID: "/api/project/:projectId/endpoint-group/:endpointGroupId/endpoint/:endpointId",
    CREATE: "/api/project/:projectId/endpoint-group/:endpointGroupId/endpoint",
    UPDATE_BY_ID: "/api/project/:projectId/endpoint-group/:endpointGroupId/endpoint/:endpointId",
    DELETE_BY_ID: "/api/project/:projectId/endpoint-group/:endpointGroupId/endpoint/:endpointId",
    DELETE_ALL: "/api/project/:projectId/endpoint-group/:endpointGroupId/endpoint",
    AI_PREVIEW: "/api/project/:projectId/endpoint-group/:endpointGroupId/endpoint/ai-preview",
  },
  AI: {
    STATUS: "/api/ai/status",
  },
  // Mirrors ENDPOINT above under a prefix that middleware rewrites onto it, attaching the
  // shared guest account. Same route handlers, no session.
  GUEST: {
    SANDBOX: "/api/guest/sandbox",
    ENDPOINT: {
      GET_ALL: "/api/guest/project/:projectId/endpoint-group/:endpointGroupId/endpoint",
      CREATE: "/api/guest/project/:projectId/endpoint-group/:endpointGroupId/endpoint",
      UPDATE_BY_ID:
        "/api/guest/project/:projectId/endpoint-group/:endpointGroupId/endpoint/:endpointId",
      DELETE_BY_ID:
        "/api/guest/project/:projectId/endpoint-group/:endpointGroupId/endpoint/:endpointId",
    },
  },
};

export const PAGE_ROUTES = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    PASSWORD: {
      RESET: "/auth/password/reset",
      CHANGE: "/auth/password/change",
    },
    EMAIL: {
      VERIFY: "/auth/email/verify",
    },
  },
  DOCS: "/docs",
  HOME: "/",
  PROJECT: "/project",
  MARKETING: {
    MOCK_API_GENERATOR: "/mock-api-generator",
    FAKE_JSON_API: "/fake-json-api",
    FAQ: "/faq",
  },
};
