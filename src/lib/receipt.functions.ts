import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { aiText, imageBlock, parseJsonReply } from "./ai.server";

const InputSchema = z.object({
  imageBase64: z.string().min(20).max(8_000_000),
  mimeType: z.string().min(3).max(40).default("image/jpeg"),
});

const CATS = [
  "Food","Groceries","Rent","Transport","Utilities","Entertainment",
  "Health","Shopping","Travel","Subscriptions","Business","Other",
] as const;

const ResultSchema = z.object({
  merchant: z.string().max(120).default(""),
  date: z.string().max(20).default(""),
  total: z.number().min(0).default(0),
  category: z.enum(CATS).default("Other"),
  description: z.string().max(160).default(""),
});

export const parseReceipt = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const today = new Date().toISOString().slice(0, 10);
    const text = await aiText({
      system: `You extract structured data from receipt photos. Reply ONLY with valid minified JSON, no prose, no code fences. Schema: {"merchant": string, "date": "YYYY-MM-DD", "total": number, "category": one of [${CATS.join(", ")}], "description": short label like "Lunch at Cafe Roma"}. If date is missing or unreadable use "${today}". Total is the final amount paid.`,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Parse this receipt." },
            imageBlock(data.imageBase64, data.mimeType),
          ],
        },
      ],
    });

    let parsed: unknown;
    try {
      parsed = parseJsonReply(text);
    } catch {
      return { merchant: "", date: today, total: 0, category: "Other" as const, description: "" };
    }
    const result = ResultSchema.safeParse(parsed);
    if (!result.success) {
      return { merchant: "", date: today, total: 0, category: "Other" as const, description: "" };
    }
    if (!result.data.date) result.data.date = today;
    return result.data;
  });
