import assert from "node:assert/strict";
import test from "node:test";

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

test("LeadInput válido aceita todos os campos obrigatórios e opcionais", async () => {
  const { leadInputSchema } = await import("../../src/lib/domain");
  const parsed = leadInputSchema.parse(validLeadInput);
  assert.equal(parsed.name, "Ana");
  assert.equal(parsed.niche, "arquitetura");
  assert.equal(parsed.channel, "WhatsApp");
  assert.equal(parsed.objective, "Agendar reunião");
  assert.equal(parsed.tone, "Casual");
  assert.equal(parsed.relationship, "Contato frio");
  assert.equal(parsed.hook, "");
  assert.equal(parsed.scriptType, "abordagem_inicial");
  assert.equal(parsed.objection, "");
  assert.equal(parsed.nextStep, "");
  assert.equal(parsed.context, "");
});

test("LeadInput rejeita campos desconhecidos, tipos errados e limites excedidos", async () => {
  const { leadInputSchema } = await import("../../src/lib/domain");
  const invalid: unknown[] = [
    null,
    [],
    "Ana",
    {},
    { ...validLeadInput, extra: true },
    { ...validLeadInput, name: "" },
    { ...validLeadInput, name: "   " },
    { ...validLeadInput, name: "a".repeat(81) },
    { ...validLeadInput, name: "Ana\nOutra pessoa" },
    { ...validLeadInput, niche: "" },
    { ...validLeadInput, niche: "n".repeat(121) },
    { ...validLeadInput, niche: 42 },
    { ...validLeadInput, hook: "g".repeat(601) },
    { ...validLeadInput, hook: "\u0000" },
    { ...validLeadInput, channel: "SMS" },
    { ...validLeadInput, objective: "Disparar" },
    { ...validLeadInput, tone: "Agressivo" },
    { ...validLeadInput, relationship: "Amigo" },
    { ...validLeadInput, scriptType: "invalido" },
  ];
  for (const value of invalid) {
    assert.equal(
      leadInputSchema.safeParse(value).success,
      false,
      JSON.stringify(value),
    );
  }
  assert.equal(
    leadInputSchema.safeParse({
      ...validLeadInput,
      name: "a".repeat(80),
      niche: "n".repeat(120),
      hook: "g".repeat(600),
    }).success,
    true,
  );
  assert.equal(
    leadInputSchema.safeParse({ ...validLeadInput, hook: "Fase 1\nFase 2" })
      .success,
    true,
  );
});

function createValidVariant(overrides: Partial<{
  id: string;
  title: string;
  description: string;
  messages: string[];
  subject: string;
  favorite: boolean;
  version: number;
}> = {}) {
  return {
    id: crypto.randomUUID(),
    title: "Abordagem 1",
    description: "Texto revisado pela pessoa.",
    messages: ["Texto editado livremente.\nPode terminar com ponto."],
    favorite: false,
    version: 1,
    ...overrides,
  };
}

function createValidPromptVersion(overrides: Partial<{
  version: number;
  systemPrompt: string;
  fewShotExamples: Array<{ input: string; output: string }>;
  outputSchema: string;
  guardrails: string[];
  fullPrompt: string;
  engine: "local" | "llama" | "anthropic" | "openai_compatible";
  model: string;
  createdAt: string;
}> = {}) {
  return {
    version: 1,
    systemPrompt: "System prompt com mais de 50 caracteres para validação.",
    fewShotExamples: [{ input: "exemplo", output: "resposta" }],
    outputSchema: JSON.stringify({ type: "object", properties: { variant: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, description: { type: "string" }, messages: { type: "array", items: { type: "string" } }, subject: { type: "string" }, favorite: { type: "boolean" } } } } }),
        guardrails: ["Regra 1: Não invente informações", "Regra 2: Termine com pergunta", "Regra 3: Seja natural"],
        fullPrompt: "Prompt completo com mais de 200 caracteres para atender o mínimo de validação do schema Zod. Este prompt inclui system prompt, few-shot examples, output schema JSON e guardrails factuais para garantir qualidade.",
    engine: "local",
    model: undefined,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function savedGeneration(overrides: Partial<{
  id: string;
  createdAt: string;
  situationRaw: string;
  input: typeof validLeadInput;
  variants: ReturnType<typeof createValidVariant>[];
  promptVersions: ReturnType<typeof createValidPromptVersion>[];
  engine: "local" | "llama" | "anthropic" | "openai_compatible";
  model: string;
}> = {}) {
  return {
    id: crypto.randomUUID(),
    createdAt: "2026-09-14T12:00:00.000Z",
    situationRaw: "Situação de teste para validação.",
    input: validLeadInput,
    variants: Array.from({ length: 3 }, (_, index) => createValidVariant({ title: `Abordagem ${index + 1}`, favorite: index === 1 })),
    promptVersions: [createValidPromptVersion()],
    engine: "local",
    model: undefined,
    ...overrides,
  };
}

test("Generation válido com todos os novos campos passa na validação", async () => {
  const { generationSchema } = await import("../../src/lib/domain");
  const value = savedGeneration();
  assert.deepEqual(generationSchema.parse(value), value);
});

test("Generation aceita engine anthropic e modelo", async () => {
  const { generationSchema } = await import("../../src/lib/domain");
  const value = savedGeneration({ engine: "anthropic", model: "claude-3-5-sonnet-20241022" });
  assert.deepEqual(generationSchema.parse(value), value);
});

test("Generation aceita engine llama e modelo", async () => {
  const { generationSchema } = await import("../../src/lib/domain");
  const value = savedGeneration({ engine: "llama", model: "llama3.1:8b" });
  assert.deepEqual(generationSchema.parse(value), value);
});

test("Generation aceita engine openai_compatible", async () => {
  const { generationSchema } = await import("../../src/lib/domain");
  const value = savedGeneration({ engine: "openai_compatible", model: "gpt-4o-mini" });
  assert.deepEqual(generationSchema.parse(value), value);
});

test("Generation rejeita payloads malformados, IDs inválidos e coleções excessivas", async () => {
  const { generationSchema } = await import("../../src/lib/domain");
  const value = savedGeneration();
  const withVariant = (patch: Record<string, unknown>) => ({
    ...value,
    variants: value.variants.map((variant, i) =>
      i === 0 ? { ...variant, ...patch } : variant,
    ),
  });
  const withPromptVersion = (patch: Record<string, unknown>) => ({
    ...value,
    promptVersions: value.promptVersions.map((pv, i) =>
      i === 0 ? { ...pv, ...patch } : pv,
    ),
  });
  const invalid: unknown[] = [
    null,
    {},
    { ...value, extra: true },
    { ...value, id: "not-a-uuid" },
    { ...value, id: ` ${value.id}` },
    { ...value, createdAt: "ontem" },
    { ...value, createdAt: "2026-02-30T12:00:00.000Z" },
    { ...value, provider: "mock" }, // campo antigo
    { ...value, engine: "mock" },
    { ...value, input: { ...value.input, secret: "unexpected" } },
    { ...value, situationRaw: "p".repeat(4001) },
    { ...value, situationRaw: "" },
    { ...value, promptVersions: [] },
    { ...value, promptVersions: Array(6).fill(createValidPromptVersion()) },
    { ...value, variants: [] },
    { ...value, variants: value.variants.slice(0, 2) },
    { ...value, variants: [...value.variants, value.variants[0]] },
    {
      ...value,
      variants: [value.variants[0], value.variants[0], value.variants[2]],
    },
    withVariant({ id: value.id }),
    withVariant({ id: "variant-1" }),
    withVariant({ extra: 1 }),
    withVariant({ title: "a".repeat(81) }),
    withVariant({ title: " " }),
    withVariant({ description: "d".repeat(241) }),
    withVariant({ messages: [] }),
    withVariant({ messages: ["a", "b", "c", "d", "e", "f", "g"] }),
    withVariant({ messages: ["m".repeat(6001)] }),
    withVariant({ messages: ["   "] }),
    withVariant({ messages: [42] }),
    withVariant({ subject: "s".repeat(201) }),
    withVariant({ subject: "Assunto\nBcc: outra pessoa" }),
    withVariant({ favorite: "true" }),
    withVariant({ version: "1" }),
    withPromptVersion({ version: "1" }),
    withPromptVersion({ systemPrompt: "curto" }),
    withPromptVersion({ fewShotExamples: [] }),
    withPromptVersion({ fewShotExamples: Array(4).fill({ input: "a", output: "b" }) }),
    withPromptVersion({ outputSchema: "curto" }),
    withPromptVersion({ guardrails: ["a", "b"] }),
    withPromptVersion({ fullPrompt: "curto" }),
    withPromptVersion({ engine: "mock" }),
    withPromptVersion({ createdAt: "ontem" }),
  ];
  for (const candidate of invalid) {
    assert.equal(
      generationSchema.safeParse(candidate).success,
      false,
      JSON.stringify(candidate).slice(0, 400),
    );
  }
  assert.equal(
    generationSchema.safeParse(
      withVariant({
        title: "a".repeat(80),
        description: "d".repeat(240),
        subject: "s".repeat(200),
        messages: Array(6).fill("m".repeat(6000)),
        version: 2,
      }),
    ).success,
    true,
  );
  assert.equal(
    generationSchema.safeParse({
      ...value,
      promptVersions: [createValidPromptVersion({ version: 2, fullPrompt: "p".repeat(12000) })],
    }).success,
    true,
  );
});

test("SituationInput valida entrada de linguagem natural", async () => {
  const { situationInputSchema } = await import("../../src/lib/domain");
  const valid = { raw: "Preciso fazer follow-up com a Carla da clínica, ela pediu para ligar terça mas não atendeu" };
  assert.deepEqual(situationInputSchema.parse(valid), { ...valid, engine: "local", temperature: 0.7 });
  
  const invalid: unknown[] = [
    null,
    {},
    { raw: "curto" },
    { raw: "a".repeat(4001) },
    { raw: 42 },
    { raw: "texto", engine: "invalido" },
    { raw: "texto", temperature: 1.5 },
    { raw: "texto", temperature: -0.1 },
  ];
  for (const value of invalid) {
    assert.equal(situationInputSchema.safeParse(value).success, false, JSON.stringify(value));
  }
});

test("UserConfig tem defaults corretos", async () => {
  const { userConfigSchema, defaultUserConfig } = await import("../../src/lib/domain");
  assert.deepEqual(userConfigSchema.parse({}), defaultUserConfig);
  assert.equal(defaultUserConfig.defaultEngine, "local");
  assert.equal(defaultUserConfig.llamaEndpoint, "http://localhost:11434");
  assert.equal(defaultUserConfig.llamaModel, "llama3.1:8b");
  assert.equal(defaultUserConfig.theme, "dark");
});

test("HistoryEntry serializa para listagem", async () => {
  const { historyEntrySchema } = await import("../../src/lib/domain");
  const entry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    situationPreview: "Follow-up com Carla da clínica...",
    scriptType: "follow_up",
    channel: "WhatsApp",
    engine: "local",
    model: undefined,
    favoriteCount: 1,
  };
  assert.deepEqual(historyEntrySchema.parse(entry), entry);
});