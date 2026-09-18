import { customAlphabet } from "nanoid";
import { z } from "zod";

export const PUBLIC_ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export const PUBLIC_ID_LENGTH = 12;

const nanoid = customAlphabet(PUBLIC_ID_ALPHABET, PUBLIC_ID_LENGTH);

export function generatePublicId(): string {
  return nanoid();
}

export const PUBLIC_ID_REGEX = new RegExp(`^[${PUBLIC_ID_ALPHABET}]{${PUBLIC_ID_LENGTH}}$`);

export const PublicIdSchema = z.string().regex(PUBLIC_ID_REGEX, "The ID is not valid");

// A project id is the first label of its mock host, and DNS folds case, so this one drops the
// uppercase half. It stays a subset of the alphabet above, which is what lets anything matching
// PROJECT_PUBLIC_ID_REGEX still pass PublicIdSchema.
export const PROJECT_PUBLIC_ID_ALPHABET = "23456789abcdefghijkmnopqrstuvwxyz";

const projectNanoid = customAlphabet(PROJECT_PUBLIC_ID_ALPHABET, PUBLIC_ID_LENGTH);

export function generateProjectPublicId(): string {
  return projectNanoid();
}

export const PROJECT_PUBLIC_ID_REGEX = new RegExp(
  `^[${PROJECT_PUBLIC_ID_ALPHABET}]{${PUBLIC_ID_LENGTH}}$`
);

export const ProjectPublicIdSchema = z
  .string()
  .regex(PROJECT_PUBLIC_ID_REGEX, "The ID is not valid");
