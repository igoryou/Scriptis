import { type LeadInput, type Generation, type PromptVersion } from "../domain";

const OLLAMA_DEFAULT_ENDPOINT = "http://localhost:11434";
const OLLAMA_DEFAULT_MODEL = "llama3.1:8b";

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  format?: "json";
  options?: {
    temperature?: number;
    num_predict?: number;
    top_p?: number;
  };
  stream?: boolean;
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

async function callOllama(
  endpoint: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.7,
  maxTokens = 2048,
  timeoutMs = 15000
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(`${endpoint}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        format: "json",
        options: {
          temperature,
          num_predict: maxTokens,
          top_p: 0.9,
        },
        stream: false,
      } as OllamaGenerateRequest),
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Ollama HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json() as OllamaGenerateResponse;
    return data.response;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Ollama timeout após ${timeoutMs}ms`);
    }
    throw error;
  }
}

function parseOllamaResponse(response: string, input: LeadInput, promptVersions: PromptVersion[]): Generation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(response);
  } catch {
    // Fallback: tenta extrair JSON de dentro do texto
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error("Resposta do Ollama não é JSON válido");
      }
    } else {
      throw new Error("Resposta do Ollama não contém JSON");
    }
  }
  
  const root = typeof parsed === "object" && parsed !== null
    ? parsed as Record<string, unknown>
    : {};
  const variantes = root.variantes ?? root.variants ?? [];
  if (!Array.isArray(variantes) || variantes.length !== 3) {
    throw new Error("Ollama não retornou 3 variantes válidas");
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
  
  // Garante que cada variante tem mensagens válidas
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
    engine: "llama",
    model: OLLAMA_DEFAULT_MODEL,
  };
}

/** Composição via Ollama (Llama local). Requer Ollama rodando em localhost:11434. */
export async function composeLlama(
  raw: LeadInput,
  promptVersions: PromptVersion[],
  options: {
    endpoint?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
  } = {}
): Promise<Generation> {
  const input = raw; // já validado pelo orquestrador
  const endpoint = options.endpoint || OLLAMA_DEFAULT_ENDPOINT;
  const model = options.model || OLLAMA_DEFAULT_MODEL;
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 2048;
  const timeoutMs = options.timeoutMs ?? 15000;
  
  // Usa a v1 do prompt (mais completa)
  const promptVersion = promptVersions[0];
  
  const response = await callOllama(
    endpoint,
    model,
    promptVersion.systemPrompt,
    promptVersion.fullPrompt,
    temperature,
    maxTokens,
    timeoutMs
  );
  
  return parseOllamaResponse(response, input, promptVersions);
}

/** Verifica se Ollama está disponível e lista modelos. */
export async function checkOllamaAvailability(endpoint = OLLAMA_DEFAULT_ENDPOINT): Promise<{ available: boolean; models: string[] }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${endpoint}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) return { available: false, models: [] };
    
    const data = await response.json() as { models?: Array<{ name: string }> };
    const models = data.models?.map(m => m.name) || [];
    return { available: true, models };
  } catch {
    return { available: false, models: [] };
  }
}