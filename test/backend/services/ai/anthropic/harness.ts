const createMock = jest.fn();
const streamMock = jest.fn();

class FakeAPIError extends Error {
  status: number | undefined;
  constructor(status?: number, message?: string) {
    super(message ?? `api error ${status}`);
    this.status = status;
  }
}
class FakeRateLimitError extends FakeAPIError {}
class FakeAuthenticationError extends FakeAPIError {}
class FakeNotFoundError extends FakeAPIError {}
class FakeBadRequestError extends FakeAPIError {}
class FakeConnectionTimeoutError extends FakeAPIError {}

const AnthropicMock = Object.assign(
  jest.fn().mockImplementation(() => ({
    messages: { create: createMock, stream: streamMock },
  })),
  {
    APIError: FakeAPIError,
    RateLimitError: FakeRateLimitError,
    AuthenticationError: FakeAuthenticationError,
    NotFoundError: FakeNotFoundError,
    BadRequestError: FakeBadRequestError,
    APIConnectionTimeoutError: FakeConnectionTimeoutError,
  }
);

jest.mock("@anthropic-ai/sdk", () => ({ __esModule: true, default: AnthropicMock }));

import anthropicProvider, {
  ANTHROPIC_DEFAULT_MODEL,
} from "@/server/services/ai/providers/anthropic.provider";
import type { AiChatParams, AiSlot } from "@/server/services/ai/ai.types";

const slot: AiSlot = { provider: "anthropic", model: "claude-test", apiKey: "sk-key" };

const params: AiChatParams = {
  system: "be terse",
  messages: [{ role: "user", content: "hello" }],
  maxTokens: 500,
};

const textReply = (text: string, extra: Record<string, unknown> = {}) => ({
  content: [{ type: "text", text }],
  model: "claude-test-20990101",
  ...extra,
});

function request() {
  return createMock.mock.calls[0][0];
}

beforeEach(() => {
  createMock.mockReset();
  streamMock.mockReset();
  AnthropicMock.mockClear();
  createMock.mockResolvedValue(textReply("{}"));
});

export {
  createMock,
  streamMock,
  FakeAPIError,
  FakeRateLimitError,
  FakeAuthenticationError,
  FakeNotFoundError,
  FakeBadRequestError,
  FakeConnectionTimeoutError,
  AnthropicMock,
  anthropicProvider,
  ANTHROPIC_DEFAULT_MODEL,
  slot,
  params,
  textReply,
  request,
};
