import { createRateLimiter } from "@/server/core/rate_limit";
import { AppError } from "@/server/core/errors";
import { STATUS_CODE } from "@/server/core/constants";

const CALLS_ENV = "TEST_RATE_LIMIT_CALLS";
const WINDOW_ENV = "TEST_RATE_LIMIT_WINDOW_SECONDS";

function makeLimiter() {
  return createRateLimiter({
    callsEnv: CALLS_ENV,
    windowEnv: WINDOW_ENV,
    fallbackCalls: 2,
    fallbackWindowSeconds: 60,
    message: "too many",
  });
}

describe("src/server/core/rate_limit.ts", () => {
  afterEach(() => {
    delete process.env[CALLS_ENV];
    delete process.env[WINDOW_ENV];
    jest.useRealTimers();
  });

  it("allows up to the limit then throws 429", () => {
    const limiter = makeLimiter();
    limiter.consume("a");
    limiter.consume("a");

    try {
      limiter.consume("a");
      throw new Error("expected the third call to be refused");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusCode).toBe(STATUS_CODE.TOO_MANY_REQUESTS);
      expect((error as AppError).message).toBe("too many");
    }
  });

  it("counts each key on its own", () => {
    const limiter = makeLimiter();
    limiter.consume("a");
    limiter.consume("a");

    expect(() => limiter.consume("b")).not.toThrow();
  });

  it("lets a key through again once its window has passed", () => {
    jest.useFakeTimers();
    const limiter = makeLimiter();
    limiter.consume("a");
    limiter.consume("a");
    expect(() => limiter.consume("a")).toThrow(AppError);

    jest.advanceTimersByTime(61 * 1000);
    expect(() => limiter.consume("a")).not.toThrow();
  });

  it("reads the limit from env, overriding the fallback", () => {
    process.env[CALLS_ENV] = "1";
    const limiter = makeLimiter();
    limiter.consume("a");
    expect(() => limiter.consume("a")).toThrow(AppError);
  });

  it("is off entirely when calls is 0", () => {
    process.env[CALLS_ENV] = "0";
    const limiter = makeLimiter();
    for (let i = 0; i < 10; i++) limiter.consume("a");
    expect(() => limiter.consume("a")).not.toThrow();
  });

  it("is off entirely when the window is 0", () => {
    process.env[WINDOW_ENV] = "0";
    const limiter = makeLimiter();
    for (let i = 0; i < 10; i++) limiter.consume("a");
    expect(() => limiter.consume("a")).not.toThrow();
  });

  it("ignores a non-integer env value and keeps the fallback", () => {
    process.env[CALLS_ENV] = "not-a-number";
    const limiter = makeLimiter();
    limiter.consume("a");
    limiter.consume("a");
    expect(() => limiter.consume("a")).toThrow(AppError);
  });

  it("reset clears both the cached config and the counts", () => {
    const limiter = makeLimiter();
    limiter.consume("a");
    limiter.consume("a");
    expect(() => limiter.consume("a")).toThrow(AppError);

    limiter.reset();
    expect(() => limiter.consume("a")).not.toThrow();
  });

  it("drops keys that went quiet so the map does not only grow", () => {
    jest.useFakeTimers();
    const limiter = makeLimiter();
    limiter.consume("stale");

    jest.advanceTimersByTime(61 * 1000);
    limiter.consume("fresh");

    // "stale" was pruned, so its allowance starts over rather than carrying the old hit.
    limiter.consume("stale");
    limiter.consume("stale");
    expect(() => limiter.consume("stale")).toThrow(AppError);
  });
});
