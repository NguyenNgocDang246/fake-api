describe("src/app/api/auth/google/google.OAuth2.ts", () => {
  it("creates oauth2Client with redirect URL = DOMAIN + /api/auth/google/callback", async () => {
    jest.resetModules();
    process.env["DOMAIN"] = "http://localhost";
    process.env["GOOGLE_CLIENT_ID"] = "id";
    process.env["GOOGLE_CLIENT_SECRET"] = "secret";

    const OAuth2Mock = jest.fn();
    jest.doMock("googleapis", () => ({
      __esModule: true,
      google: { auth: { OAuth2: OAuth2Mock } },
    }));

    await import("@/app/api/auth/google/google.OAuth2");
    expect(OAuth2Mock).toHaveBeenCalledWith("id", "secret", "http://localhost/api/auth/google/callback");
  });
});

