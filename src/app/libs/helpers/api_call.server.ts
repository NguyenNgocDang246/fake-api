import { cookies } from "next/headers";
import { API_ROUTES } from "@/app/libs/routes";

const BASE_URL = process.env["DOMAIN"] ?? "http://localhost:3000";

function resolveUrl(url: string): string {
  return url.startsWith("/") ? `${BASE_URL}${url}` : url;
}

const ignoreAuthAPIRoute = [
  API_ROUTES.AUTH.LOGOUT,
  API_ROUTES.AUTH.LOGIN,
  API_ROUTES.AUTH.REGISTER,
  API_ROUTES.AUTH.GOOGLE.LOGIN,
  API_ROUTES.AUTH.PASSWORD.FORGOT,
  API_ROUTES.AUTH.PASSWORD.RESET,
  API_ROUTES.AUTH.EMAIL.VERIFY,
  API_ROUTES.AUTH.EMAIL.RESEND,
];

type FetchOptions = RequestInit & {
  retry?: boolean;
};

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

async function plainFetch(url: string, options: RequestInit = {}) {
  const cookieStore = await cookies();
  return fetch(resolveUrl(url), {
    ...options,
    cache: "no-store",
    headers: {
      ...options.headers,
      Cookie: cookieStore.toString(),
    },
  });
}

async function refreshToken() {
  if (!isRefreshing) {
    isRefreshing = true;

    refreshPromise = (async () => {
      try {
        const res = await plainFetch(API_ROUTES.AUTH.REFRESH_TOKEN, {
          method: "GET",
        });
        if (!res.ok) {
          throw new Error("Refresh token failed");
        }
      } finally {
        isRefreshing = false;
      }
    })();
  }

  return refreshPromise!;
}

async function apiFetch(url: string, options: FetchOptions = {}): Promise<any> {
  const cookieStore = await cookies();
  const res = await fetch(resolveUrl(url), {
    ...options,
    cache: "no-store",
    headers: {
      ...options.headers,
      Cookie: cookieStore.toString(),
    },
  });

  if (res.status !== 401) {
    if (!res.ok) {
      throw await res.json();
    }
    return res.json();
  }

  if (ignoreAuthAPIRoute.includes(url) || options.retry) {
    throw await res.json();
  }

  try {
    await refreshToken();

    return apiFetch(url, {
      ...options,
      retry: true,
    });
  } catch (err) {
    try {
      await plainFetch(API_ROUTES.AUTH.LOGOUT, {
        method: "POST",
      });
    } catch (_) {}
    throw err;
  }
}

const api = {
  get: (url: string, options?: Omit<FetchOptions, "method">) =>
    apiFetch(url, { ...options, method: "GET" }),

  post: <T = unknown>(url: string, body?: T, options?: Omit<FetchOptions, "method" | "body">) =>
    apiFetch(url, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : null,
      headers: { "Content-Type": "application/json", ...options?.headers },
    }),

  put: <T = unknown>(url: string, body?: T, options?: Omit<FetchOptions, "method" | "body">) =>
    apiFetch(url, {
      ...options,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : null,
      headers: { "Content-Type": "application/json", ...options?.headers },
    }),

  delete: (url: string, options?: Omit<FetchOptions, "method">) =>
    apiFetch(url, { ...options, method: "DELETE" }),
};

export default api;
