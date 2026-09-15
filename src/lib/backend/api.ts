import { z } from "zod";
import type { Settings } from "./settings";
import { HttpError, withDeadline, readJson } from "./http";
import { leadInputSchema, type Generation, type LeadInput } from "../domain";
import { generateLocal } from "../generator";

export type User = { id: string; email: string };
export type Dependencies = {
  settings: Settings;
  getUser: (signal: AbortSignal) => Promise<User | null>;
  consumeQuota?: (signal: AbortSignal) => Promise<boolean>;
  generateAnthropic?: (
    input: LeadInput,
    signal: AbortSignal,
  ) => Promise<Generation>;
  generateOpenAI?: (
    input: LeadInput,
    signal: AbortSignal,
  ) => Promise<Generation>;
};
export const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "cache-control": "no-store" } });
export async function respond(
  operation: (signal: AbortSignal) => Promise<Response>,
): Promise<Response> {
  try {
    return await withDeadline(operation);
  } catch (error) {
    if (error instanceof HttpError)
      return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError)
      return json(
        { error: "Dados inválidos. Confira os campos e tente novamente." },
        400,
      );
    return json(
      { error: "O serviço não está disponível agora. Tente novamente." },
      503,
    );
  }
}
export function guardOrigin(request: Request, settings: Settings) {
  const origin = request.headers.get("origin");
  if (
    request.headers.get("sec-fetch-site") === "cross-site" ||
    (origin && origin !== (settings.siteOrigin ?? new URL(request.url).origin))
  ) {
    throw new HttpError(403, "Origem da solicitação não permitida.");
  }
}
const generateSchema = z.strictObject({
  input: leadInputSchema,
  provider: z.enum(["local", "anthropic", "openai_compatible"]),
  iteration: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
});
export function createApi(deps: Dependencies) {
  return {
    generate: (request: Request) =>
      respond(async (signal) => {
        guardOrigin(request, deps.settings);
        const body = generateSchema.parse(
          await readJson(request, 8192, signal),
        );
        if (body.provider === "local")
          return json({
            generation: generateLocal(body.input, body.iteration),
          });
        const isAnthropic = body.provider === "anthropic";
        const configured = isAnthropic ? deps.settings.anthropic : deps.settings.openai;
        if (!configured)
          throw new HttpError(
            503,
            `${isAnthropic ? "A Anthropic" : "A API OpenAI-compatível"} não está configurada. Use o motor gratuito.`,
          );
        if (!(await deps.getUser(signal)))
          throw new HttpError(
            401,
            `Entre na sua conta para usar ${isAnthropic ? "a Anthropic" : "a API OpenAI-compatível"}.`,
          );
        const generatePaid = isAnthropic ? deps.generateAnthropic : deps.generateOpenAI;
        if (!deps.consumeQuota || !generatePaid)
          throw new HttpError(
            503,
            "A integração está incompleta. Use o motor gratuito.",
          );
        if (!(await deps.consumeQuota(signal)))
          throw new HttpError(
            429,
            "O limite diário de gerações por API foi atingido. O motor gratuito continua disponível.",
          );
        return json({
          generation: await generatePaid(body.input, signal),
        });
      }),
    config: () =>
      respond(async (signal) => {
        const user = deps.settings.supabase ? await deps.getUser(signal) : null;
        return json({
          supabaseConfigured: !!deps.settings.supabase,
          anthropicConfigured: !!deps.settings.anthropic,
          openaiConfigured: !!deps.settings.openai,
          user: user ? { id: user.id, email: user.email } : null,
        });
      }),
  };
}
