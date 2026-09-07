import { AiProvider } from "@/server/services/ai/ai.types";
import anthropicProvider, {
  ANTHROPIC_PROVIDER_NAME,
} from "@/server/services/ai/providers/anthropic.provider";
import geminiProvider, {
  GEMINI_PROVIDER_NAME,
} from "@/server/services/ai/providers/gemini.provider";

export const AI_PROVIDERS: Record<string, AiProvider> = {
  [ANTHROPIC_PROVIDER_NAME]: anthropicProvider,
  [GEMINI_PROVIDER_NAME]: geminiProvider,
};

export function getProvider(name: string): AiProvider | undefined {
  return AI_PROVIDERS[name];
}
