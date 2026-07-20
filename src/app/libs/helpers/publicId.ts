import { customAlphabet } from "nanoid";
import { z } from "zod";

export const PUBLIC_ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export const PUBLIC_ID_LENGTH = 12;

const nanoid = customAlphabet(PUBLIC_ID_ALPHABET, PUBLIC_ID_LENGTH);

export function generatePublicId(): string {
  return nanoid();
}

export const PUBLIC_ID_REGEX = new RegExp(`^[${PUBLIC_ID_ALPHABET}]{${PUBLIC_ID_LENGTH}}$`);

export const PublicIdSchema = z.string().regex(PUBLIC_ID_REGEX, "ID không hợp lệ");
