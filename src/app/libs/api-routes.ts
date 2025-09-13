export const API_ROUTES = {
  AUTH: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    LOGOUT: "/api/auth/logout",
    REFRESH_TOKEN: "/api/auth/refresh-token",
  },
  USER: {
    GET_ALL: "/api/users",
    // GET_BY_ID: "/api/users/:id",
    CREATE: "/api/users",
    // UPDATE: "/api/users/:id",
    // DELETE: "/api/users/:id",
  },
  PROJECT: {
    GET_ALL: "/api/projects",
    GET_BY_ID: "/api/projects/:id",
    CREATE: "/api/projects",
    // UPDATE: "/api/projects/:id",
    // DELETE: "/api/projects/:id",
  },
};
