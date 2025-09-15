export const API_ROUTES = {
  AUTH: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    LOGOUT: "/api/auth/logout",
    CHECK: "/api/auth/check",
    REFRESH_TOKEN: "/api/auth/refresh-token",
  },
  USER: {
    GET: "/api/user",
    CREATE: "/api/user",
    // UPDATE: "/api/users/:id",
    // DELETE: "/api/users/:id",
  },
  PROJECT: {
    GET_ALL: "/api/project",
    GET_BY_ID: "/api/project/:id",
    CREATE: "/api/project",
    // UPDATE: "/api/projects/:id",
    // DELETE: "/api/projects/:id",
  },
};

export const PAGE_ROUTES = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
  },
  HOME: "/",
};

