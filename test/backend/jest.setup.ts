process.env["SECRET_SALT"] ??= "test-secret-salt";
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

  return { NextResponse };
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
