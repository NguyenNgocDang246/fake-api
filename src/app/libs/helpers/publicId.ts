import { customAlphabet } from "nanoid";
import { z } from "zod";

// One alphabet for every table. A project id is the first label of its mock host and DNS folds
// case, so an id carrying uppercase names a host nothing can reach; giving the rest the same
// alphabet is what lets a validator accept an id without knowing which table it came from.
// `0`, `1`, `l`, `I` and `O` are out because they read as each other when somebody retypes one.
// Twelve characters of this set is about 2^60, which a unique column and `retryOnPublicIdConflict`
// cover between them.
export const PUBLIC_ID_ALPHABET = "23456789abcdefghijkmnopqrstuvwxyz";
export const PUBLIC_ID_LENGTH = 12;

const nanoid = customAlphabet(PUBLIC_ID_ALPHABET, PUBLIC_ID_LENGTH);

export function generatePublicId(): string {
  return nanoid();
}

export const PUBLIC_ID_REGEX = new RegExp(`^[${PUBLIC_ID_ALPHABET}]{${PUBLIC_ID_LENGTH}}$`);

export const PublicIdSchema = z.string().regex(PUBLIC_ID_REGEX, "The ID is not valid");
