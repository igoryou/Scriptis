import { type LeadInput, type Generation, type SituationInput, type PromptVersion, type UserConfig, type Engine, leadInputSchema, situationInputSchema, generationSchema, userConfigSchema } from "../domain";
import { parseSituation } from "./parseSituation";
import { detectScriptType } from "./detectScriptType";
import { buildPrompt } from "./buildPrompt";
import { composeLocal } from "./composeLocal";
import { composeLlama, checkOllamaAvailability } from "./composeLlama";


export interface OrchestratorOptions {
  userConfig?: UserConfig;
  situation?: SituationInput;
  leadInput?: LeadInput;
  engine?: Engine;
  iteration?: number;
}

export interface OrchestratorResult {
  generation: Generation;
  parsedInput: LeadInput;
  detectedScriptType: string;
  promptVersions: PromptVersion[];
  engineUsed: Engine;
  modelUsed?: string;
}

/** Orquestrador principal: parse → detect → buildPrompt → compose → return Generation. */
export async function generateScript(options: OrchestratorOptions): Promise<OrchestratorResult> {
  const userConfig = userConfigSchema.parse(options.userConfig || {});
  const iteration = options.iteration ?? 0;
  
  // 1. Parse: situação em linguagem natural → LeadInput estruturado
  let parsedInput: LeadInput;
  
  if (options.leadInput) {
    parsedInput = leadInputSchema.parse(options.leadInput);
  } else if (options.situation) {
    const situation = situationInputSchema.parse(options.situation);
    parsedInput = await parseSituation(situation.raw);
    // Aplica engine/model do situation se não vier no options
    if (!options.engine && situation.engine) {
      options.engine = situation.engine;
    }
  } else {
    throw new Error("Forneça 'situation' (linguagem natural) ou 'leadInput' (estruturado).");
  }
  
  // 2. Detect: classifica tipo de script se não veio explícito
  const detectedScriptType = detectScriptType(parsedInput);
  parsedInput = { ...parsedInput, scriptType: detectedScriptType };
  
  // 3. BuildPrompt: gera versões de prompt elaborado
  const promptVersions = buildPrompt(parsedInput);
  
  // 4. Determina engine a usar
  const engine = options.engine || userConfig.defaultEngine || "local";
  
  // 5. Compose: gera as variantes usando o engine escolhido
  let generation: Generation;
  let modelUsed: string | undefined;
  
  switch (engine) {
    case "local": {
      generation = composeLocal(parsedInput, iteration);
      generation.promptVersions = promptVersions.map(pv => ({ ...pv, engine: "local" }));
      break;
    }
    
    case "llama": {
      const llamaEndpoint = userConfig.llamaEndpoint || "http://localhost:11434";
      const llamaModel = userConfig.llamaModel || "llama3.1:8b";
      
      const { available } = await checkOllamaAvailability(llamaEndpoint);
      if (!available) {
        throw new Error("Ollama não está acessível em " + llamaEndpoint + ". Verifique se está rodando (ollama serve).");
      }
      
      generation = await composeLlama(parsedInput, promptVersions, {
        endpoint: llamaEndpoint,
        model: llamaModel,
        temperature: 0.7,
        maxTokens: 2048,
      });
      modelUsed = llamaModel;
      break;
    }
    
    case "anthropic": {
      // Anthropic é tratado via API route no servidor (chave não exposta no cliente)
      throw new Error("Engine 'anthropic' deve ser chamado via /api/generate no servidor (requer autenticação e chave configurada).");
    }
    
    case "openai_compatible": {
      // API key não deve vir no userConfig do cliente - rota server-side
      throw new Error("Engine 'openai_compatible' deve ser chamado via /api/generate no servidor (requer autenticação e chave configurada).");
    }
    
    default:
      throw new Error(`Engine desconhecido: ${engine}`);
  }
  
  // Validação final
  const validated = generationSchema.safeParse(generation);
  if (!validated.success) {
    throw new Error("Geração inválida: " + validated.error.issues.map(i => i.message).join("; "));
  }
  
  return {
    generation: validated.data,
    parsedInput,
    detectedScriptType,
    promptVersions,
    engineUsed: engine,
    modelUsed,
  };
}

/** Gera iteração alternativa (para botão "Outra versão"). */
export async function generateAlternative(
  previousGeneration: Generation,
  userConfig: UserConfig,
  engine?: Engine
): Promise<OrchestratorResult> {
  return generateScript({
    leadInput: previousGeneration.input,
    userConfig,
    engine: engine || previousGeneration.engine as Engine,
    iteration: (previousGeneration.variants[0]?.version || 1) + 1,
  });
}

/** Lista engines disponíveis baseada na configuração do usuário. */
export function getAvailableEngines(): Array<{ engine: Engine; label: string; available: boolean; reason?: string }> {
  const engines: Array<{ engine: Engine; label: string; available: boolean; reason?: string }> = [
    { engine: "local", label: "Local (gratuito, offline)", available: true },
    { engine: "llama", label: "Llama (Ollama local)", available: false, reason: "Requer Ollama rodando localmente" },
    { engine: "anthropic", label: "Claude (Anthropic API)", available: false, reason: "Requer conta autenticada e chave no servidor" },
    { engine: "openai_compatible", label: "OpenAI-compatível (Groq, Together, LM Studio...)", available: false, reason: "Requer conta autenticada e endpoint configurado" },
  ];
  
  // Para engines que precisam de configuração server-side, o frontend só sabe se estão disponíveis via /api/config
  // Aqui apenas retornamos a configuração local
  return engines;
}

/** Valida situação sem gerar (para preview/feedback). */
export async function validateSituation(raw: string): Promise<{ valid: boolean; parsed?: LeadInput; errors?: string[] }> {
  try {
    const situation = situationInputSchema.parse({ raw });
    const parsed = await parseSituation(situation.raw);
    return { valid: true, parsed };
  } catch (error) {
    if (error instanceof Error) {
      return { valid: false, errors: [error.message] };
    }
    return { valid: false, errors: ["Erro desconhecido na validação"] };
  }
}