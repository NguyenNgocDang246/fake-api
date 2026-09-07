/**
 * Read a required environment variable, throwing if it is missing or empty.
 *
 * Used for values that must never silently fall back to a guessable default, most of
 * all the JWT signing secrets. Call it at module scope so a missing variable fails at
 * startup rather than on the first request that happens to need it.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
