import type { MastraMessageV2 } from "@mastra/core/agent/message-list";
import type { TracingContext } from "@mastra/core/ai-tracing";
import type { MastraModelConfig } from "@mastra/core/llm";
import {
  PIIDetector,
  PromptInjectionDetector,
  UnicodeNormalizer,
} from "@mastra/core/processors";
import type { Processor } from "@mastra/core/processors";

const DEFAULT_PII_TYPES = ["address", "credit_card"];

const getTextFromMessage = (message: MastraMessageV2 | undefined) => {
  if (!message || message.role !== "user") return "";
  const parts = message.content?.parts || [];
  return parts
    .filter((part) => part.type === "text")
    .map((part) => (part as { type: "text"; text: string }).text)
    .join(" ")
    .trim();
};

const looksLikePromptInjection = (text: string) => {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("ignore previous instructions") ||
    normalized.includes("system prompt") ||
    normalized.includes("developer message") ||
    normalized.includes("jailbreak") ||
    normalized.includes("act as") ||
    normalized.includes("you are now")
  );
};

const looksLikePII = (text: string) => {
  return (
    /\b\d{3}-\d{2}-\d{4}\b/.test(text) || // SSN-like
    /\b(?:\d[ -]*?){13,19}\b/.test(text) // credit card-ish
  );
};

export class FastGuardrailsProcessor implements Processor {
  readonly name = "fast-guardrails-processor";
  private unicodeNormalizer: UnicodeNormalizer;
  private promptInjectionDetector: PromptInjectionDetector;
  private piiDetector: PIIDetector;

  constructor(config: { model: MastraModelConfig; piiTypes?: string[] }) {
    this.unicodeNormalizer = new UnicodeNormalizer({ stripControlChars: true });
    this.promptInjectionDetector = new PromptInjectionDetector({
      model: config.model,
      strategy: "block",
      structuredOutputOptions: { jsonPromptInjection: true },
    });
    this.piiDetector = new PIIDetector({
      model: config.model,
      strategy: "redact",
      detectionTypes: config.piiTypes || DEFAULT_PII_TYPES,
      structuredOutputOptions: { jsonPromptInjection: true },
    });
  }

  async processInput(args: {
    messages: MastraMessageV2[];
    abort: (reason?: string) => never;
    tracingContext?: TracingContext;
  }): Promise<MastraMessageV2[]> {
    const normalizedMessages = await this.unicodeNormalizer.processInput(args);
    const lastMessage = normalizedMessages[normalizedMessages.length - 1];
    const content = getTextFromMessage(lastMessage);

    if (!content) {
      return normalizedMessages;
    }

    if (looksLikePromptInjection(content)) {
      return this.promptInjectionDetector.processInput({
        ...args,
        messages: normalizedMessages,
      });
    }

    if (looksLikePII(content)) {
      return this.piiDetector.processInput({
        ...args,
        messages: normalizedMessages,
      });
    }

    return normalizedMessages;
  }
}
