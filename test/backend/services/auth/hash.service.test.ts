jest.mock("argon2", () => ({
  __esModule: true,
  default: {
    hash: jest.fn(async (p: string) => `hashed:${p}`),
    verify: jest.fn(async (hash: string, p: string) => hash === `hashed:${p}`),
  },
}));

import argon2 from "argon2";
import { hashPassword, verifyPassword } from "@/server/services/auth/hash.service";

describe("src/server/services/auth/hash.service.ts", () => {
  it("hashPassword delegates to argon2.hash", async () => {
    await expect(hashPassword("pw")).resolves.toBe("hashed:pw");
    expect(argon2.hash).toHaveBeenCalledWith("pw");
  });

  it("verifyPassword delegates to argon2.verify", async () => {
    await expect(verifyPassword("pw", "hashed:pw")).resolves.toBe(true);
    expect(argon2.verify).toHaveBeenCalledWith("hashed:pw", "pw");
  });
});

