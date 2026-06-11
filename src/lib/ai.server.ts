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

/* ---------------- Per-user rate limiting ----------------
 * AI calls cost real money, so each user gets a sliding window of
 * AI_RATE_LIMIT calls per AI_RATE_WINDOW_MS (defaults: 30 per 10 min).
 * In-memory per server instance — a first line of defense, not billing
 * enforcement. */

const AI_RATE_LIMIT = Number(process.env.AI_RATE_LIMIT) || 30;
const AI_RATE_WINDOW_MS = Number(process.env.AI_RATE_WINDOW_MS) || 10 * 60_000;
const aiCalls = new Map<string, number[]>();

export function checkAiRateLimit(key: string) {
  const now = Date.now();
  const calls = (aiCalls.get(key) ?? []).filter((t) => now - t < AI_RATE_WINDOW_MS);
  if (calls.length >= AI_RATE_LIMIT) {
    throw new Error("AI rate limit reached — please wait a few minutes and try again.");
  }
  calls.push(now);
  aiCalls.set(key, calls);
  if (aiCalls.size > 10_000) aiCalls.clear();
}

export interface AiTextOptions {
  system?: string;
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
  /** Rate-limit key — pass the authenticated userId. */
  rateKey?: string;
}

/** Run a Claude request and return the concatenated text output. */
export async function aiText(opts: AiTextOptions): Promise<string> {
  if (opts.rateKey) checkAiRateLimit(opts.rateKey);
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
export function aiPrompt(prompt: string, system?: string, maxTokens?: number, rateKey?: string) {
  return aiText({ system, messages: [{ role: "user", content: prompt }], maxTokens, rateKey });
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
