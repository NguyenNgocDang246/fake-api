import { cookies } from "next/headers";

const BASE_URL = process.env["DOMAIN"] ?? "http://localhost:3000";

function resolveUrl(url: string): string {
  return url.startsWith("/") ? `${BASE_URL}${url}` : url;
}

async function apiFetch(url: string, options: RequestInit = {}): Promise<any> {
  const cookieStore = await cookies();
  const res = await fetch(resolveUrl(url), {
    ...options,
    cache: "no-store",
    headers: {
      ...options.headers,
      Cookie: cookieStore.toString(),
    },
  });

  if (!res.ok) {
    throw await res.json();
  }
  return res.json();
}

const api = {
  get: (url: string, options?: Omit<RequestInit, "method">) =>
    apiFetch(url, { ...options, method: "GET" }),

  post: <T = unknown>(url: string, body?: T, options?: Omit<RequestInit, "method" | "body">) =>
    apiFetch(url, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : null,
      headers: { "Content-Type": "application/json", ...options?.headers },
    }),

  put: <T = unknown>(url: string, body?: T, options?: Omit<RequestInit, "method" | "body">) =>
    apiFetch(url, {
      ...options,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : null,
      headers: { "Content-Type": "application/json", ...options?.headers },
    }),

  delete: (url: string, options?: Omit<RequestInit, "method">) =>
    apiFetch(url, { ...options, method: "DELETE" }),
};

export default api;
