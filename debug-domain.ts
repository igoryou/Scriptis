import { generationSchema, leadInputSchema } from './src/lib/domain';

const validLeadInput = {
  name: "Ana",
  niche: "arquitetura",
  channel: "WhatsApp",
  objective: "Agendar reunião",
  tone: "Casual",
  relationship: "Contato frio",
  hook: "",
  scriptType: "abordagem_inicial",
  objection: "",
  nextStep: "",
  context: "",
};

const v = leadInputSchema.parse(validLeadInput);
console.log('LeadInput parsed:', v);

const val = {
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  situationRaw: "teste",
  input: v,
  variants: Array.from({ length: 3 }, (_, i) => ({
    id: crypto.randomUUID(),
    title: `Abordagem ${i + 1}`,
    description: "desc",
    messages: ["msg"],
    favorite: i === 1,
    version: 1,
  })),
  promptVersions: [{
    version: 1,
    systemPrompt: "System prompt com mais de 50 caracteres para validação.",
    fewShotExamples: [{ input: "ex", output: "res" }],
    outputSchema: JSON.stringify({ type: "object", properties: {} }),
    guardrails: ["a", "b", "c"],
    fullPrompt: "Prompt completo com mais de 200 caracteres para atender o mínimo de validação do schema Zod.",
    engine: "local" as const,
    model: undefined,
    createdAt: new Date().toISOString(),
  }],
  engine: "local" as const,
  model: undefined,
};

const result = generationSchema.safeParse(val);
console.log('Generation validation result:', result);
if (!result.success) {
  console.error('Validation errors:', result.error.issues);
}