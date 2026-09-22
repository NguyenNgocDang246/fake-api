import {
  PUBLIC_ID_ALPHABET,
  PUBLIC_ID_LENGTH,
  PUBLIC_ID_REGEX,
  PublicIdSchema,
  generatePublicId,
} from "@/app/libs/helpers/publicId";
import { GetProjectByIdSchema } from "@/models/project.model";
import { GetEndpointByIdSchema } from "@/models/endpoint/endpoint.model";

describe("a public id has to survive being a hostname label", () => {
  it("holds no uppercase, which DNS would fold away", () => {
    expect(PUBLIC_ID_ALPHABET).toBe(PUBLIC_ID_ALPHABET.toLowerCase());
  });

  it("keeps out the characters that read as each other", () => {
    for (const char of "01lIO") expect(PUBLIC_ID_ALPHABET).not.toContain(char);
  });

  it("generates ids of the shared length that match the regex", () => {
    for (let i = 0; i < 200; i++) {
      const id = generatePublicId();
      expect(id).toHaveLength(PUBLIC_ID_LENGTH);
      expect(PUBLIC_ID_REGEX.test(id)).toBe(true);
    }
  });

  it("refuses an id carrying uppercase", () => {
    expect(PublicIdSchema.safeParse("projectPubAB").success).toBe(false);
  });
});

// The whole point of one alphabet: no schema has to know which table its id came from.
describe("one alphabet serves every table", () => {
  it("hands the same generated id to a project schema and an endpoint one", () => {
    const id = generatePublicId();

    expect(GetProjectByIdSchema.safeParse({ public_id: id }).success).toBe(true);
    expect(GetEndpointByIdSchema.safeParse({ public_id: id }).success).toBe(true);
  });

  it("refuses an uppercase id on both of them", () => {
    expect(GetProjectByIdSchema.safeParse({ public_id: "projectPubAB" }).success).toBe(false);
    expect(GetEndpointByIdSchema.safeParse({ public_id: "projectPubAB" }).success).toBe(false);
  });
});
