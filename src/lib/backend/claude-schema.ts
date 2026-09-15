import { z } from "zod";
import { generationSchema, type LeadInput, type Generation } from "../domain";
import { buildReusablePrompt } from "../prompt";
import { HttpError } from "./http";
export const claudePayloadSchema = z.strictObject({
  variants: z
    .array(
      z.strictObject({
        title: z.string().min(1).max(80),
        description: z.string().min(1).max(240),
        messages: z.array(z.string().min(1).max(6000)).min(1).max(4),
        subject: z.string().min(1).max(200).optional(),
      }),
    )
    .length(3),
});
export function parseClaudePayload(
  payload: unknown,
  input: LeadInput,
): Generation {
  const parsed = claudePayloadSchema.safeParse(payload);
  if (!parsed.success)
    throw new HttpError(
      502,
      "A IA retornou um formato inválido. Tente novamente ou use o motor gratuito.",
    );
  for (const variant of parsed.data.variants) {
    const sequential =
      input.channel === "WhatsApp" || input.channel === "Instagram DM";
    if (
      (sequential && variant.messages.length < 2) ||
      (!sequential && variant.messages.length !== 1) ||
      (input.channel === "E-mail" && !variant.subject) ||
      (input.channel !== "E-mail" && variant.subject) ||
      !variant.messages.at(-1)!.trim().endsWith("?") ||
      (input.tone !== "Formal" &&
        /prezado|venho por meio/i.test(variant.messages.join(" ")))
    ) {
      throw new HttpError(
        502,
        "A IA não seguiu o formato da conversa. Tente novamente ou use o motor gratuito.",
      );
    }
  }
  const result = generationSchema.safeParse({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    input,
    variants: parsed.data.variants.map((variant) => ({
      ...variant,
      id: crypto.randomUUID(),
      favorite: false,
    })),
    prompt: buildReusablePrompt(input),
    provider: "anthropic",
  });
  if (!result.success)
    throw new HttpError(
      502,
      "A IA retornou textos fora dos limites. Tente novamente.",
    );
  return result.data;
}
