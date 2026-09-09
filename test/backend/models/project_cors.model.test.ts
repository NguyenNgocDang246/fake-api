import {
  ClientUpdateProjectSchema,
  CorsOriginListSchema,
  MAX_CORS_ORIGINS,
  UpdateProjectByIdSchema,
} from "@/models/project.model";

const parseOrigins = (origins: string[]) => CorsOriginListSchema.safeParse(origins);

const CLIENT_VALID = {
  name: "P",
  description: null,
  cors_enabled: true,
  cors_origins: [] as string[],
  cors_allow_credentials: false,
};

const parseClient = (overrides: Record<string, unknown>) =>
  ClientUpdateProjectSchema.safeParse({ ...CLIENT_VALID, ...overrides });

describe("what counts as an origin", () => {
  it.each(["http://localhost:3000", "https://app.example.com", "http://127.0.0.1:8080"])(
    "accepts %s",
    (origin) => {
      expect(parseOrigins([origin]).success).toBe(true);
    }
  );

  // A trailing slash or a path is the usual mistake, and neither ever matches the Origin a
  // browser actually sends.
  it.each([
    "http://localhost:3000/",
    "http://localhost:3000/app",
    "localhost:3000",
    "ftp://example.com",
    "*",
  ])("refuses %s", (origin) => {
    expect(parseOrigins([origin]).success).toBe(false);
  });

  it("refuses the same origin twice", () => {
    expect(parseOrigins(["http://a.com", "http://a.com"]).success).toBe(false);
  });

  it(`stops past ${MAX_CORS_ORIGINS}`, () => {
    const many = Array.from({ length: MAX_CORS_ORIGINS + 1 }, (_, i) => `http://a${i}.com`);

    expect(parseOrigins(many).success).toBe(false);
  });

  it("drops a row the author added and left empty", () => {
    expect(parseOrigins(["", "http://localhost:3000", "  "]).data).toEqual([
      "http://localhost:3000",
    ]);
  });

  it("points an error at the row the form rendered", () => {
    const result = parseOrigins(["", "nope"]);

    expect(result.error?.issues[0]?.path).toEqual([1]);
  });
});

// The browser refuses a wildcard origin next to credentials, so the pair is caught here rather
// than leaving the author with a CORS error that names neither setting.
describe("credentials need somewhere to send them", () => {
  it("refuses credentials while every origin is allowed", () => {
    const result = parseClient({ cors_allow_credentials: true });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["cors_allow_credentials"]);
  });

  it("allows credentials once an origin is named", () => {
    expect(
      parseClient({ cors_allow_credentials: true, cors_origins: ["http://localhost:3000"] }).success
    ).toBe(true);
  });

  it("applies the same rule on the server", () => {
    expect(
      UpdateProjectByIdSchema.safeParse({
        public_id: "aaaaaaaaaaaa",
        name: "P",
        description: null,
        cors_enabled: true,
        cors_origins: [],
        cors_allow_credentials: true,
      }).success
    ).toBe(false);
  });
});

describe("what a project answers with before anyone touches it", () => {
  it("is open to every origin, with credentials off", () => {
    const result = UpdateProjectByIdSchema.safeParse({
      public_id: "aaaaaaaaaaaa",
      name: "P",
      description: null,
    });

    expect(result.data).toMatchObject({
      cors_enabled: true,
      cors_origins: [],
      cors_allow_credentials: false,
    });
  });
});
