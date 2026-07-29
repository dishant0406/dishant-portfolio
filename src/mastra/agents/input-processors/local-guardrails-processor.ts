import type { MastraMessageV2 } from "@mastra/core/agent/message-list";
import type { TracingContext } from "@mastra/core/ai-tracing";
import { UnicodeNormalizer } from "@mastra/core/processors";
import type { Processor } from "@mastra/core/processors";

type TextPart = { type: "text"; text: string };

const getTextFromMessage = (message: MastraMessageV2 | undefined) => {
  if (!message || message.role !== "user") return "";
  const parts = message.content?.parts || [];
  return parts
    .filter((part) => part.type === "text")
    .map((part) => (part as TextPart).text)
    .join(" ")
    .trim();
};

export const looksLikePromptInjection = (text: string) => {
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

const redactSensitiveText = (text: string) =>
  text
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[redacted]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[redacted]");

const redactMessage = (message: MastraMessageV2) => {
  const parts = message.content?.parts;
  if (!parts?.length) return message;

  return {
    ...message,
    content: {
      ...message.content,
      parts: parts.map((part) =>
        part.type === "text"
          ? { ...part, text: redactSensitiveText((part as TextPart).text) }
          : part
      ),
    },
  };
};

export class LocalGuardrailsProcessor implements Processor {
  readonly name = "local-guardrails-processor";
  private unicodeNormalizer = new UnicodeNormalizer({ stripControlChars: true });

  async processInput(args: {
    messages: MastraMessageV2[];
    abort: (reason?: string) => never;
    tracingContext?: TracingContext;
  }): Promise<MastraMessageV2[]> {
    const normalizedMessages = await this.unicodeNormalizer.processInput(args);
    const lastMessage = normalizedMessages[normalizedMessages.length - 1];
    const content = getTextFromMessage(lastMessage);

    if (content && looksLikePromptInjection(content)) {
      args.abort("Request blocked by local guardrails.");
    }

    return normalizedMessages.map(redactMessage);
  }
}
