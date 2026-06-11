import Anthropic from "@anthropic-ai/sdk";

// Server-only AI helper built on the official Anthropic SDK.
// Configure with ANTHROPIC_API_KEY (required) and optionally ANTHROPIC_MODEL.

export function anthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "AI is not configured. Set ANTHROPIC_API_KEY on the server (get a key at console.anthropic.com).",
    );
  }
  return new Anthropic({ apiKey });
}

export function aiModel() {
  return process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
}

// Adaptive thinking is only accepted on Fable/Mythos 5, Opus 4.6+, Sonnet 4.6 —
// older/smaller models 400 on it, so gate by model id.
function supportsAdaptiveThinking(model: string) {
  return /fable-5|mythos-5|opus-4-[678]|sonnet-4-6/.test(model);
}

export interface AiTextOptions {
  system?: string;
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
}

/** Run a Claude request and return the concatenated text output. */
export async function aiText(opts: AiTextOptions): Promise<string> {
  const client = anthropicClient();
  const model = aiModel();

  const stream = client.messages.stream({
    model,
    max_tokens: opts.maxTokens ?? 16000,
    ...(supportsAdaptiveThinking(model) ? { thinking: { type: "adaptive" as const } } : {}),
    ...(opts.system ? { system: opts.system } : {}),
    messages: opts.messages,
  });
  const msg = await stream.finalMessage();

  if (msg.stop_reason === "refusal") {
    throw new Error("The AI declined this request. Try rephrasing or a different file.");
  }
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/** Convenience: single user prompt (optionally with a system prompt). */
export function aiPrompt(prompt: string, system?: string, maxTokens?: number) {
  return aiText({ system, messages: [{ role: "user", content: prompt }], maxTokens });
}

/** Build an image content block from base64 data. */
export function imageBlock(base64: string, mediaType: string): Anthropic.ImageBlockParam {
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
      data: base64,
    },
  };
}

/** Build a PDF document content block from base64 data. */
export function pdfBlock(base64: string): Anthropic.DocumentBlockParam {
  return {
    type: "document",
    source: { type: "base64", media_type: "application/pdf", data: base64 },
  };
}

/** Strip markdown fences and parse JSON from a model reply. */
export function parseJsonReply<T = unknown>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?/im, "")
    .replace(/```\s*$/m, "")
    .trim();
  // Tolerate prose around the JSON object by slicing to the outermost braces.
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const candidate = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(candidate) as T;
}
