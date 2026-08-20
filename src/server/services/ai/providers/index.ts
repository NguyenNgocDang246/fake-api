import { AiProvider } from "@/server/services/ai/ai.types";
import anthropicProvider, {
  ANTHROPIC_PROVIDER_NAME,
} from "@/server/services/ai/providers/anthropic.provider";
import geminiProvider, {
  GEMINI_PROVIDER_NAME,
} from "@/server/services/ai/providers/gemini.provider";

/**
 * Provider registry. Adding another vendor means writing one adapter and adding exactly
 * one line here; the router and everything above it stay untouched.
 *
 * Order here does not decide which provider is used. That comes from `AI_PROVIDERS` in env.
 */
export const AI_PROVIDERS: Record<string, AiProvider> = {
  [ANTHROPIC_PROVIDER_NAME]: anthropicProvider,
  [GEMINI_PROVIDER_NAME]: geminiProvider,
};

export function getProvider(name: string): AiProvider | undefined {
  return AI_PROVIDERS[name];
}
