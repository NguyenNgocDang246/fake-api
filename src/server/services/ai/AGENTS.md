# src/server/services/ai — Agent Guide

## Summary

Shared infrastructure for calling an LLM. It knows one thing: send a conversation, get text back. It knows nothing about endpoints, response bodies or variants. The AI response variant feature is its first caller, but it is shaped so a chatbox can reuse it later untouched.

## Content

- `ai.types.ts` — the shared contract. `AiProvider` requires `chat(params, slot)` and optionally offers `chatStream(params, slot)`, plus a `defaultModel` used when the provider's `*_MODEL` env var is unset. `AiChatParams` takes the shape of an ordinary chat API: `system` (a string, or `AiSystemBlock[]` where a block can be flagged `cacheable`), a multi-turn `messages` array, `maxTokens`, `effort`, and an optional `jsonSchema`. `AiSlot` is one concrete provider + key + model combination, and `AiRoute` is the optional list of providers a single call may use. `toSystemBlocks` normalizes `system` to a block array so adapters handle a single shape.
- `providers/gemini.provider.ts` — the Gemini adapter, built on `@google/genai`. Maps `effort` to `thinkingConfig.thinkingLevel`, `maxTokens` to `maxOutputTokens`, `jsonSchema` to `responseJsonSchema` plus a JSON response mime type, and joins the system blocks into one `systemInstruction`. The assistant turn is renamed to `model`, which is the role name Gemini expects. `ApiError.status` drives the error mapping: 429 is rate limiting, and 400/401/403 are all treated as credential problems because Gemini answers a bad key with 400 as often as 401, which lets the router move to the next key.
- `providers/anthropic.provider.ts` — the Anthropic adapter, built on `@anthropic-ai/sdk`. Uses adaptive thinking, sets `output_config.effort` (default `low`), maps `jsonSchema` to `output_config.format`, and maps the `cacheable` flag to `cache_control: { type: "ephemeral" }`. SDK failures become `AppError` through typed classes (`RateLimitError`, `AuthenticationError`), never string matching.
- `providers/index.ts` — the `Record<string, AiProvider>` registry. A new provider is one line here. Order in this file decides nothing; `AI_PROVIDERS` in env does.
- `ai_rate_limit.ts` — one sliding window for the whole process, in front of every model call. `consumeAiRateLimit()` records a call or throws `AI_MESSAGES.TOO_MANY_REQUESTS` with a 429; `getAiRateLimit()` reports the active setting; `resetAiRateLimit()` exists only for tests and is called from `resetAiRouter`. Configured by `AI_RATE_LIMIT_CALLS` and `AI_RATE_LIMIT_WINDOW_SECONDS`, either at `0` to turn it off.
- `ai_router.service.ts` — builds a pool per configured provider from env and picks which one to call. `chat(params, route?)` and `chatStream(params, route?)` are the only public entry points; `isAiConfigured(route?)` tells the UI whether to show the feature at all, and with a route whether one particular provider is available; `listAiProviders` reports the configuration without exposing keys; `resetAiRouter` exists only for tests.

Configuration comes from env, every value a comma separated list:

```
AI_PROVIDERS=gemini,anthropic
GEMINI_API_KEYS=gm-a,gm-b
GEMINI_MODEL=gemini-3.7-flash
ANTHROPIC_API_KEYS=sk-a,sk-b
ANTHROPIC_MODEL=claude-opus-5
```

Env var names follow from the provider name (`gemini` reads `GEMINI_API_KEYS` and `GEMINI_MODEL`), so registering an adapter is the only step needed to add a provider. An empty `AI_PROVIDERS` turns the whole feature off.

Gemini leads the default configuration: a flash model is the cheap fit for generating small mock payloads, with Anthropic behind it as the fallback. Neither position is baked into the code, so reordering the env var is all it takes to swap them.

## Conventions

- **Import nothing from the domain.** No file here may mention endpoints, variants, response bodies or any other feature. Prompts, JSON extraction and result validation belong to the caller (`../endpoint/endpoint_variant_generator.service.ts`), not here. That boundary is what lets a chatbox reuse this directory without changing a line of it.
- **Adding a provider**: write an adapter under `providers/`, add one line to the registry in `providers/index.ts`. Nothing else. The router derives env names and the default model from the adapter itself.
- **Providers only return raw text.** Parsing JSON and checking the content is the caller's job, because providers differ in how much structured output they support. `jsonSchema` only tightens things model-side; it is never the real gate.
- **Round-robin applies to API keys, not providers.** Each provider holds its own key cursor, so successive calls walk that provider's keys and spread load across them. The order of `AI_PROVIDERS` is a priority order: the first provider handles every call, and a later one is reached only after the ones before it fail, making the list a fallback chain rather than a load split. The model is fixed per provider. Providers are deliberately never rotated: they differ in price and quality, so rotating them would make the cost and the output of the same feature vary call to call.
- **A caller that needs a specific vendor passes a route, it does not get its own router.** `chat(params, { providers: ["anthropic"] })` narrows the fallback chain to that subset; one name pins the call with no fallback, several keep a chain inside them, and omitting the route means every configured provider in env order. The caller's order wins over the env order, since naming providers is a preference and not a repeat of the config. Keep this out of `AiChatParams`: that interface is what gets sent to the model, a route is where it gets sent, and only the router ever reads it. No adapter takes a route.
- **The rate limit is per process, not per caller.** It throttles how fast this server is willing to spend money and deliberately does not know who is asking, which is why no user id is threaded down here. It counts one logical `chat`/`chatStream`, not one per failover attempt. It is also the only ceiling a request cannot rewind: the per-role daily quota counts rows in `endpoint_ai_variants`, so a preview slips past it entirely and a create/delete loop resets it. What it does not do is cap a daily total, which needs an append-only usage log the quota should be counting instead of cache rows.
- **A bad value in the rate limit env falls back to the constant, never to unlimited.** A typo in `AI_RATE_LIMIT_CALLS` must not quietly remove the ceiling. Only an explicit `0` turns it off.
- **A route that matches nothing is a deployment error, not an outage.** Asking for a provider this server has no keys for throws `AI_MESSAGES.PROVIDER_NOT_AVAILABLE`, which is a separate message from `NOT_CONFIGURED` on purpose: one means an operator forgot a key, the other means AI is off entirely, and they need different fixes.
- **Key cursors live in process memory**, so distribution is only approximately even across multiple instances. Spreading load across keys is the goal, not an exact split.
- **A key is taken at the moment of the attempt**, not up front, so a call that succeeds immediately does not burn a key slot on providers it never touched.
- **Switch on failure, but never mid-stream.** `chat` walks up to three attempts and rethrows the last error. `chatStream` only switches while nothing has been emitted, since retrying after partial output would hand the consumer the opening text twice.
- **Falling over and retrying are two different things.** While untried provider + key combinations remain, any failure moves to the next one. Once they are exhausted, only an overloaded provider earns another pass over the same slot, after a short backoff. A rejected key or an unreachable model fails identically every time, and a rate limit needs seconds rather than milliseconds (Gemini's free tier quotes delays like "retry in 8s"), so repeating either one only adds latency or spends more quota.
- **Every adapter logs the vendor's own explanation before wrapping the error, and attaches it as `cause`.** The `AI_MESSAGES` strings are user-facing and vague on purpose, so without this a wrong model name and a revoked key would look identical in the logs. Never log the API key, and never return `cause` to a client.

Error normalization and the other service-layer conventions are in [../AGENTS.md](../AGENTS.md); project-wide conventions are in the root [AGENTS.md](../../../AGENTS.md).
