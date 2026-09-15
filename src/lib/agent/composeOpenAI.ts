import { type LeadInput, type Generation, type PromptVersion } from "../domain";

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  response_format?: { type: "json_object" };
}

interface OpenAIResponse {
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
  usage?: { total_tokens: number };
}

async function callOpenAICompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: OpenAIMessage[],
  temperature = 0.7,
  maxTokens = 2048,
  timeoutMs = 12_000,
  parentSignal?: AbortSignal,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const signal = parentSignal
    ? AbortSignal.any([controller.signal, parentSignal])
    : controller.signal;
  
  try {
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p: 0.9,
        response_format: { type: "json_object" },
      } as OpenAIRequest),
      signal,
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`OpenAI-compatible HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json() as OpenAIResponse;
    return data.choices[0]?.message?.content || "";
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`OpenAI-compatible timeout após ${timeoutMs}ms`);
    }
    throw error;
  }
}

function parseOpenAIResponse(response: string, input: LeadInput, promptVersions: PromptVersion[]): Generation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(response);
  } catch {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error("Resposta da API não é JSON válido");
      }
    } else {
      throw new Error("Resposta da API não contém JSON");
    }
  }
  
  const root = typeof parsed === "object" && parsed !== null
    ? parsed as Record<string, unknown>
    : {};
  const variantes = root.variantes ?? root.variants ?? [];
  if (!Array.isArray(variantes) || variantes.length !== 3) {
    throw new Error("API não retornou 3 variantes válidas");
  }
  
  const variants = variantes.map((value: unknown, index: number) => {
    const variant = typeof value === "object" && value !== null
      ? value as Record<string, unknown>
      : {};
    const rawMessages = variant.mensagens ?? variant.messages ?? variant.message;
    const messages = Array.isArray(rawMessages)
      ? rawMessages.filter((message): message is string => typeof message === "string")
      : typeof rawMessages === "string" ? [rawMessages] : [];
    const subject = variant.assunto ?? variant.subject;
    return {
      id: crypto.randomUUID(),
      title: typeof (variant.titulo ?? variant.title) === "string" ? String(variant.titulo ?? variant.title) : `Variante ${index + 1}`,
      description: typeof (variant.descricao ?? variant.description) === "string" ? String(variant.descricao ?? variant.description) : "Abordagem gerada por IA",
      messages,
      ...(typeof subject === "string" ? { subject } : {}),
      favorite: false,
      version: 1,
    };
  });
  
  for (const variant of variants) {
    if (variant.messages.length === 0) {
      variant.messages = [`Mensagem para ${input.name} sobre ${input.niche}`];
    }
    if (input.channel === "E-mail" && !variant.subject) {
      variant.subject = `Conversa sobre ${input.niche}`;
    }
  }
  
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    situationRaw: input.context || `${input.scriptType}: ${input.name} — ${input.niche} (${input.channel})`,
    input,
    variants,
    promptVersions,
    engine: "openai_compatible",
    model: undefined, // Preenchido pelo orquestrador
  };
}

/** Composição via endpoint OpenAI-compatível (OpenAI, Groq, Together, LM Studio, vLLM, etc.). */
export async function composeOpenAI(
  raw: LeadInput,
  promptVersions: PromptVersion[],
  options: {
    endpoint: string;
    apiKey: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
    signal?: AbortSignal;
  }
): Promise<Generation> {
  const input = raw;
  const { endpoint, apiKey, model, temperature = 0.7, maxTokens = 2048, timeoutMs = 12_000, signal } = options;
  
  const promptVersion = promptVersions[0];
  
  const messages: OpenAIMessage[] = [
    { role: "system", content: promptVersion.systemPrompt },
    { role: "user", content: promptVersion.fullPrompt },
  ];
  
  const response = await callOpenAICompatible(
    endpoint,
    apiKey,
    model,
    messages,
    temperature,
    maxTokens,
    timeoutMs,
    signal,
  );
  
  const generation = parseOpenAIResponse(response, input, promptVersions);
  generation.model = model;
  return generation;
}

/** Testa conexão com endpoint OpenAI-compatível. */
export async function checkOpenAIAvailability(endpoint: string, credential: string): Promise<{ available: boolean; models?: string[] }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${endpoint}/models`, {
      headers: { "Authorization": `Bearer ${credential}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    
    if (!response.ok) return { available: false };
    
    const data = await response.json() as { data?: Array<{ id: string }> };
    const models = data.data?.map(m => m.id) || [];
    return { available: true, models };
  } catch {
    return { available: false };
  }
}