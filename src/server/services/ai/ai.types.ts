/**
 * The contract every AI provider implements.
 *
 * These signatures deliberately take the shape of an ordinary chat API (a system prompt, a
 * list of messages, optional streaming) rather than the shape of the variant problem. That
 * is what lets a chatbox reuse this layer later without changing anything in it.
 */

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiSystemBlock {
  text: string;
  /**
   * Marks the stable prefix so the provider can turn on prompt caching.
   * A provider without that feature ignores the flag: still correct, just more expensive.
   */
  cacheable?: boolean;
}

export interface AiChatParams {
  system?: string | AiSystemBlock[];
  messages: AiMessage[];
  maxTokens: number;
  effort?: "low" | "medium" | "high";
  /** Optional structured output. Each provider maps it, and not all of them support it. */
  jsonSchema?: Record<string, unknown>;
}

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface AiChatResult {
  text: string;
  provider: string;
  model: string;
  usage?: AiUsage;
}

/** One concrete provider + key + model combination the router can call. */
export interface AiSlot {
  provider: string;
  model: string;
  apiKey: string;
}

/**
 * Where a call is allowed to go. A router concept, not a provider one: no adapter ever sees it.
 *
 * Kept out of `AiChatParams` on purpose. That interface describes what is sent to the model,
 * this one describes where it is sent, and mixing the two would put routing policy into the
 * payload a chatbox reuses.
 */
export interface AiRoute {
  /**
   * Providers this call may use, most preferred first. Omitted or empty means every configured
   * provider, in `AI_PROVIDERS` order. A single name pins the call to that provider with no
   * fallback; several names keep the usual fallback chain inside that subset.
   */
  providers?: string[];
}

export interface AiProvider {
  readonly name: string;
  /** Model used when the provider's `*_MODEL` env var is not set. */
  readonly defaultModel: string;
  chat(params: AiChatParams, slot: AiSlot): Promise<AiChatResult>;
  chatStream?(params: AiChatParams, slot: AiSlot): AsyncIterable<string>;
}

/** Normalize `system` to a block array so providers handle a single shape. */
export function toSystemBlocks(system: AiChatParams["system"]): AiSystemBlock[] {
  if (!system) return [];
  return typeof system === "string" ? [{ text: system }] : system;
}
