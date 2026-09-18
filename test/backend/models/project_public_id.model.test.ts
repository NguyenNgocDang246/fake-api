import {
  PROJECT_PUBLIC_ID_ALPHABET,
  PROJECT_PUBLIC_ID_REGEX,
  PUBLIC_ID_LENGTH,
  PUBLIC_ID_REGEX,
  generateProjectPublicId,
} from "@/app/libs/helpers/publicId";
import { GetProjectByIdSchema } from "@/models/project.model";

describe("a project id has to survive being a hostname label", () => {
  it("holds no uppercase, which DNS would fold away", () => {
    expect(PROJECT_PUBLIC_ID_ALPHABET).toBe(PROJECT_PUBLIC_ID_ALPHABET.toLowerCase());
  });

  it("keeps out the characters that read as each other", () => {
    for (const char of "01lIO") expect(PROJECT_PUBLIC_ID_ALPHABET).not.toContain(char);
  });

  it("generates ids of the shared length that match its own regex", () => {
    for (let i = 0; i < 200; i++) {
      const id = generateProjectPublicId();
      expect(id).toHaveLength(PUBLIC_ID_LENGTH);
      expect(PROJECT_PUBLIC_ID_REGEX.test(id)).toBe(true);
    }
  });

  // Being a subset is what lets every schema still validating against the wider alphabet keep
  // accepting a project id.
  it("stays a subset of the general alphabet", () => {
    for (let i = 0; i < 200; i++) {
      expect(PUBLIC_ID_REGEX.test(generateProjectPublicId())).toBe(true);
    }
  });
});

describe("GetProjectByIdSchema", () => {
  it("accepts an id from the project alphabet", () => {
    expect(GetProjectByIdSchema.safeParse({ public_id: generateProjectPublicId() }).success).toBe(
      true
    );
  });

  it("refuses an id carrying uppercase", () => {
    expect(GetProjectByIdSchema.safeParse({ public_id: "projectPubAB" }).success).toBe(false);
  });
});
