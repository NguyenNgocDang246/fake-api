export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiSystemBlock {
  text: string;
  cacheable?: boolean;
}

export interface AiChatParams {
  system?: string | AiSystemBlock[];
  messages: AiMessage[];
  maxTokens: number;
  effort?: "low" | "medium" | "high";
  jsonSchema?: Record<string, unknown>;
}

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export type AiStopReason = "max_tokens" | "stop" | "other";

export interface AiChatResult {
  text: string;
  provider: string;
  model: string;
  stopReason?: AiStopReason;
  usage?: AiUsage;
}

export interface AiSlot {
  provider: string;
  model: string;
  apiKey: string;
}

export interface AiRoute {
  providers?: string[];
}

export interface AiProvider {
  readonly name: string;
  readonly defaultModel: string;
  chat(params: AiChatParams, slot: AiSlot): Promise<AiChatResult>;
  chatStream?(params: AiChatParams, slot: AiSlot): AsyncIterable<string>;
}

export function toSystemBlocks(system: AiChatParams["system"]): AiSystemBlock[] {
  if (!system) return [];
  return typeof system === "string" ? [{ text: system }] : system;
}
