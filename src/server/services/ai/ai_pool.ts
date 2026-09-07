import { AiRoute, AiSlot } from "@/server/services/ai/ai.types";
import { getProvider } from "@/server/services/ai/providers";
import { resetAiRateLimit } from "@/server/services/ai/ai_rate_limit";

export interface ProviderPool {
  provider: string;
  model: string;
  apiKeys: string[];
  nextKey: number;
}

// Env var names follow from the provider name, so registering an adapter is the only step
// needed to add a provider: `gemini` reads GEMINI_API_KEYS and GEMINI_MODEL.
function envNames(provider: string) {
  const prefix = provider.toUpperCase();
  return { keys: `${prefix}_API_KEYS`, model: `${prefix}_MODEL` };
}

function splitEnv(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildPools(): ProviderPool[] {
  return splitEnv("AI_PROVIDERS").flatMap((name) => {
    const provider = getProvider(name);
    if (!provider) return [];

    const env = envNames(name);
    const apiKeys = splitEnv(env.keys);
    if (apiKeys.length === 0) return [];

    return [
      {
        provider: name,
        model: (process.env[env.model] ?? "").trim() || provider.defaultModel,
        apiKeys,
        nextKey: 0,
      },
    ];
  });
}

let cachedPools: ProviderPool[] | null = null;

function getPools(): ProviderPool[] {
  cachedPools ??= buildPools();
  return cachedPools;
}

export function resetAiRouter(): void {
  cachedPools = null;
  resetAiRateLimit();
}

export function selectPools(route?: AiRoute): ProviderPool[] {
  const pools = getPools();
  const wanted = route?.providers;
  if (!wanted?.length) return pools;

  return wanted.flatMap((name) => pools.filter((pool) => pool.provider === name));
}

export function isAiConfigured(route?: AiRoute): boolean {
  return selectPools(route).length > 0;
}

export function listAiProviders(): { provider: string; model: string; keyCount: number }[] {
  return getPools().map((pool) => ({
    provider: pool.provider,
    model: pool.model,
    keyCount: pool.apiKeys.length,
  }));
}

function takeKey(pool: ProviderPool): string {
  const apiKey = pool.apiKeys[pool.nextKey % pool.apiKeys.length]!;
  pool.nextKey = (pool.nextKey + 1) % pool.apiKeys.length;
  return apiKey;
}

export function toSlot(pool: ProviderPool): AiSlot {
  return { provider: pool.provider, model: pool.model, apiKey: takeKey(pool) };
}
