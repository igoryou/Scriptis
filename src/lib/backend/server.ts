import "server-only";
import { z } from "zod";
import { NextResponse } from "next/server";
import { readSettings } from "./settings";
import { createApi, guardOrigin, json, respond } from "./api";
import { HttpError, readJson, withDeadline } from "./http";
import { generationSchema } from "../domain";
import { createServerSupabase } from "../supabase/server";
import { generateWithClaude } from "./anthropic";
import { composeOpenAI } from "../agent/composeOpenAI";
import { buildPrompt } from "../agent/buildPrompt";

/** Request-scoped clients only: cookies and identity must never cross requests. */
export function serverApi() {
  const settings = readSettings(process.env);
  let clientPromise: ReturnType<typeof createServerSupabase> | undefined;
  const client = (signal: AbortSignal) =>
    (clientPromise ??= createServerSupabase(settings, signal));
  async function getUser(signal: AbortSignal) {
    const supabase = await client(signal);
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? "" };
  }
  async function authenticated(signal: AbortSignal) {
    const user = await getUser(signal);
    if (!user)
      throw new HttpError(
        401,
        "Entre na sua conta para acessar o histórico sincronizado.",
      );
    return { user, supabase: (await client(signal))! };
  }
  const base = createApi({
    settings,
    getUser,
    consumeQuota: async (signal) => {
      const supabase = await client(signal);
      if (!supabase) return false;
      const { data, error } = await supabase
        .rpc("consume_scriptis_quota")
        .abortSignal(signal);
      if (error)
        throw new HttpError(
          503,
          "O controle de uso não está disponível. Use o motor gratuito.",
        );
      return data === true;
    },
    generateAnthropic: (input, signal) =>
      generateWithClaude(input, settings, signal),
    generateOpenAI: (input, signal) => {
      const config = settings.openai;
      if (!config)
        throw new HttpError(503, "A API OpenAI-compatível não está configurada.");
      return composeOpenAI(input, buildPrompt(input), {
        endpoint: config.endpoint,
        apiKey: config.apiKey,
        model: config.model,
        timeoutMs: 11_000,
        signal,
      });
    },
  });
  return {
    ...base,
    history: () =>
      respond(async (signal) => {
        const { user, supabase } = await authenticated(signal);
        const { data, error } = await supabase
          .from("scriptis_history")
          .select("record")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(50)
          .abortSignal(signal);
        if (error)
          throw new HttpError(
            503,
            "Não foi possível carregar o histórico. Confira a conexão e a migração do banco.",
          );
        const generations = (data ?? []).map((row) =>
          generationSchema.parse(row.record),
        );
        return json({ generations });
      }),
    saveHistory: (request: Request) =>
      respond(async (signal) => {
        guardOrigin(request, settings);
        const { user, supabase } = await authenticated(signal);
        const { generation } = z
          .strictObject({ generation: generationSchema })
          .parse(await readJson(request, 65536, signal));
        const { error } = await supabase
          .from("scriptis_history")
          .upsert(
            {
              id: generation.id,
              user_id: user.id,
              record: generation,
              created_at: generation.createdAt,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id", ignoreDuplicates: false },
          )
          .abortSignal(signal);
        if (error)
          throw new HttpError(
            503,
            "Não foi possível salvar esta abordagem na conta. Copie o texto antes de sair.",
          );
        const { data, error: readError } = await supabase
          .from("scriptis_history")
          .select("record")
          .eq("user_id", user.id)
          .eq("id", generation.id)
          .abortSignal(signal)
          .single();
        if (readError || !data)
          throw new HttpError(
            503,
            "Não foi possível confirmar o salvamento. Tente novamente.",
          );
        const saved = generationSchema.parse(data.record);
        if (JSON.stringify(saved) !== JSON.stringify(generation))
          throw new HttpError(
            409,
            "O registro foi alterado em outra solicitação. Reabra o histórico para conferir.",
          );
        return json({ generation: saved });
      }),
    deleteHistory: (request: Request) =>
      respond(async (signal) => {
        guardOrigin(request, settings);
        const { user, supabase } = await authenticated(signal);
        const id = z.uuid().parse(new URL(request.url).searchParams.get("id"));
        const { error } = await supabase
          .from("scriptis_history")
          .delete()
          .eq("user_id", user.id)
          .eq("id", id)
          .abortSignal(signal);
        if (error)
          throw new HttpError(503, "Não foi possível excluir a abordagem.");
        const { data, error: readError } = await supabase
          .from("scriptis_history")
          .select("id")
          .eq("user_id", user.id)
          .eq("id", id)
          .abortSignal(signal);
        if (readError || data?.length)
          throw new HttpError(503, "Não foi possível confirmar a exclusão.");
        return json({ deleted: true });
      }),
    auth: (request: Request) =>
      respond(async (signal) => {
        guardOrigin(request, settings);
        if (!settings.supabase || !settings.siteOrigin)
          throw new HttpError(
            503,
            "Contas ainda não estão configuradas. Você pode continuar gratuitamente sem conta.",
          );
        const { email } = z
          .strictObject({ email: z.email().max(254) })
          .parse(await readJson(request, 2048, signal));
        const supabase = (await client(signal))!;
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: `${settings.siteOrigin}/auth/callback`,
          },
        });
        if (error)
          throw new HttpError(
            error.status === 429 ? 429 : 503,
            "Não foi possível enviar o link agora. Aguarde um minuto e tente novamente.",
          );
        return json({
          message:
            "Se o endereço puder receber mensagens, um link de acesso chegará em instantes. Confira também o spam.",
        });
      }),
    logout: (request: Request) =>
      respond(async (signal) => {
        guardOrigin(request, settings);
        const { supabase } = await authenticated(signal);
        const { error } = await supabase.auth.signOut({ scope: "local" });
        if (error)
          throw new HttpError(
            503,
            "Não foi possível sair da conta. Tente novamente.",
          );
        return json({ message: "Sessão encerrada neste navegador." });
      }),
    callback: async (request: Request) => {
      const origin = settings.siteOrigin ?? new URL(request.url).origin;
      let succeeded = false;
      try {
        succeeded = await withDeadline(async (signal) => {
          const supabase = await client(signal);
          if (!supabase) return false;
          const params = new URL(request.url).searchParams;
          const code = params.get("code");
          const tokenHash = params.get("token_hash");
          if (code && code.length < 2048)
            return !(await supabase.auth.exchangeCodeForSession(code)).error;
          if (
            tokenHash &&
            tokenHash.length < 2048 &&
            params.get("type") === "email"
          )
            return !(
              await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type: "email",
              })
            ).error;
          return false;
        });
      } catch {
        succeeded = false;
      }
      return NextResponse.redirect(
        new URL(succeeded ? "/" : "/login?error=auth", origin),
        {
          status: 303,
          headers: {
            "cache-control": "no-store",
            "referrer-policy": "no-referrer",
          },
        },
      );
    },
  };
}
