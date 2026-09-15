import { leadInputSchema, type Generation, type LeadInput } from "./domain";
import { buildPrompt } from "./agent/buildPrompt";
import { composeLocal as agentComposeLocal } from "./agent/composeLocal";

/** @deprecated Use agent/composeLocal directly. Mantido para compatibilidade com código existente. */
export function generateLocal(raw: LeadInput, iteration = 0): Generation {
  return agentComposeLocal(raw, iteration);
}

/** Gera prompt reutilizável (formato legado - string única). */
export function buildReusablePrompt(input: LeadInput): string {
  const promptVersions = buildPrompt(input);
  return promptVersions[0].fullPrompt;
}

// Re-exporta os novos módulos para uso direto
export { composeLocal } from "./agent/composeLocal";
export { composeLlama } from "./agent/composeLlama";
export { composeOpenAI } from "./agent/composeOpenAI";
export { buildPrompt } from "./agent/buildPrompt";
export { parseSituation } from "./agent/parseSituation";
export { detectScriptType } from "./agent/detectScriptType";