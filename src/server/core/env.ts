// For values that must never fall back to a guessable default, the JWT signing secrets
// above all. Call it at module scope so a missing variable fails at startup rather than
// on the first request that happens to need it.
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
