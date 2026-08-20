// Avoid Node experimental webstorage warning by providing explicit mock storage.
function createStorageMock() {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

try {
  Object.defineProperty(globalThis, "localStorage", {
    value: createStorageMock(),
    writable: false,
    configurable: true,
    enumerable: true,
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    value: createStorageMock(),
    writable: false,
    configurable: true,
    enumerable: true,
  });
} catch {
  // If Node defines non-configurable WebStorage accessors, ignore.
}

process.env["DOMAIN"] ??= "http://localhost";
process.env["DUMMY_PASSWORD_SALT"] ??= "dummy-salt";
process.env["ACCESS_SECRET"] ??= "access_secret";
process.env["REFRESH_SECRET"] ??= "refresh_secret";
process.env["RESET_PASSWORD_SECRET"] ??= "reset_password_secret";
process.env["VERIFY_EMAIL_SECRET"] ??= "verify_email_secret";

jest.mock("next/server", () => {
  type HeadersInitLike = Record<string, string>;
  type ResponseInitLike = { status?: number; headers?: HeadersInitLike };
  type RedirectInitLike = number | { status?: number };

  class NextResponse {
    status: number;
    headers: Headers;
    #body: unknown;

    constructor(body: unknown = null, init: ResponseInitLike = {}) {
      this.status = init.status ?? 200;
      this.headers = new Headers(init.headers ?? {});
      this.#body = body;
    }

    static json(body: unknown, init: ResponseInitLike = {}) {
      return new NextResponse(body, init);
    }

    static redirect(url: URL, init: RedirectInitLike = 307) {
      const status = typeof init === "number" ? init : init?.status ?? 307;
      return new NextResponse(null, {
        status,
        headers: { Location: url.toString() },
      });
    }

    static rewrite(url: URL) {
      return new NextResponse(null, {
        status: 200,
        headers: { "x-middleware-rewrite": url.toString() },
      });
    }

    static next() {
      return new NextResponse(null, { status: 200 });
    }

    async json() {
      return this.#body;
    }

    async text() {
      return typeof this.#body === "string" ? this.#body : JSON.stringify(this.#body);
    }
  }

  // Route handlers schedule background work (AI variant refills) with `after`. Queue the
  // callbacks instead of running them, so a suite only pays for that work when it asks:
  // call `__flushAfter()` to run what is queued.
  const afterCallbacks: (() => unknown)[] = [];

  function after(callback: () => unknown) {
    afterCallbacks.push(callback);
  }

  async function __flushAfter() {
    for (const callback of afterCallbacks.splice(0)) await callback();
  }

  function __clearAfter() {
    afterCallbacks.length = 0;
  }

  function __afterCount() {
    return afterCallbacks.length;
  }

  return { NextResponse, after, __flushAfter, __clearAfter, __afterCount };
});

beforeEach(() => {
  // `clearMocks` resets jest.fn()s but not the queue held inside the next/server mock.
  const server = jest.requireMock("next/server") as { __clearAfter: () => void };
  server.__clearAfter();
});

jest.mock("next/headers", () => {
  let cookieJar = new Map<string, string>();

  function __setMockCookies(entries: Record<string, string> | undefined) {
    cookieJar = new Map(Object.entries(entries ?? {}));
  }

  async function cookies() {
    return {
      get(name: string) {
        if (!cookieJar.has(name)) return undefined;
        return { name, value: cookieJar.get(name) };
      },
    };
  }

  return { cookies, __setMockCookies };
});
