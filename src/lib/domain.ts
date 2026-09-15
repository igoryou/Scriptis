import { z } from 'zod';

/* ─── Enums / Constantes ─── */

export const CHANNELS = ['WhatsApp', 'E-mail', 'Instagram DM', 'LinkedIn'] as const;
export const OBJECTIVES = ['Agendar reunião', 'Vender produto', 'Follow-up', 'Reconexão'] as const;
export const TONES = ['Formal', 'Casual', 'Consultivo'] as const;
export const RELATIONSHIPS = ['Contato frio', 'Indicação', 'Já conversamos antes', 'Cliente atual'] as const;

export const SCRIPT_TYPES = [
  'abordagem_inicial',
  'follow_up',
  'tratamento_objeção',
  'fechamento_proximo_passo',
  'reativacao',
  'nutricao_valor',
  'resposta_inbound',
] as const;

export const ENGINES = ['local', 'llama', 'anthropic', 'openai_compatible'] as const;

export type Channel = (typeof CHANNELS)[number];
export type Objective = (typeof OBJECTIVES)[number];
export type Tone = (typeof TONES)[number];
export type Relationship = (typeof RELATIONSHIPS)[number];
export type ScriptType = (typeof SCRIPT_TYPES)[number];
export type Engine = (typeof ENGINES)[number];

/* ─── Utilitários de validação ─── */

const singleLine = (max: number) => z.string().max(max).trim().min(1)
  .refine((value) => !/[\p{Cc}\p{Zl}\p{Zp}]/u.test(value), 'Use apenas uma linha de texto.');


/* ─── Entrada bruta do usuário (linguagem natural) ─── */

export const situationInputSchema = z.strictObject({
  raw: z.string().min(10).max(4000).trim(),
  engine: z.enum(ENGINES).optional().default('local'),
  model: z.string().optional(),
  temperature: z.number().min(0).max(1).optional().default(0.7),
});

export type SituationInput = z.infer<typeof situationInputSchema>;

/* ─── LeadInput estruturado (extraído pelo agente) ─── */

export const leadInputSchema = z.strictObject({
  name: singleLine(80),
  niche: singleLine(120),
  channel: z.enum(CHANNELS),
  objective: z.enum(OBJECTIVES),
  tone: z.enum(TONES),
  relationship: z.enum(RELATIONSHIPS),
  hook: z.string().max(600).trim().optional().default('')
    .refine((value) => !/\p{Cc}/u.test(value.replace(/[\n\r\t]/g, '')), 'O gancho contém caracteres de controle.'),
  scriptType: z.enum(SCRIPT_TYPES),
  objection: z.string().max(500).trim().optional().default(''),
  nextStep: z.string().max(300).trim().optional().default(''),
  context: z.string().max(1000).trim().optional().default(''),
});

export type LeadInput = z.infer<typeof leadInputSchema>;

/* ─── Variante de script gerada ─── */

const savedText = (max: number) => z.string().min(1).max(max)
  .refine((value) => value.trim().length > 0, 'O texto não pode ficar em branco.');

const variantSchema = z.strictObject({
  id: z.uuid(),
  title: savedText(80),
  description: savedText(240),
  messages: z.array(savedText(6000)).min(1).max(6),
  subject: savedText(200)
    .refine((value) => !/[\p{Cc}\p{Zl}\p{Zp}]/u.test(value), 'O assunto deve ter apenas uma linha.')
    .optional(),
  favorite: z.boolean(),
  version: z.number().int().positive().default(1),
});

export type Variant = z.infer<typeof variantSchema>;

/* ─── Prompt elaborado versionado ─── */

export const promptVersionSchema = z.strictObject({
  version: z.number().int().positive(),
  systemPrompt: z.string().min(50),
  fewShotExamples: z.array(z.object({
    input: z.string(),
    output: z.string(),
  })).min(1).max(3),
  outputSchema: z.string().min(100), // JSON Schema como string
  guardrails: z.array(z.string()).min(3),
  fullPrompt: z.string().min(200),
  engine: z.enum(ENGINES),
  model: z.string().optional(),
  createdAt: z.iso.datetime({ offset: true }),
});

export type PromptVersion = z.infer<typeof promptVersionSchema>;

/* ─── Configuração de modelo (para engines remotos) ─── */

export const modelConfigSchema = z.strictObject({
  engine: z.enum(ENGINES),
  model: z.string().optional(),
  endpoint: z.string().url().optional(),
  apiKey: z.string().optional(),
  temperature: z.number().min(0).max(1).default(0.7),
  maxTokens: z.number().int().positive().max(8192).default(2048),
  timeoutMs: z.number().int().positive().default(15000),
});

export type ModelConfig = z.infer<typeof modelConfigSchema>;

/* ─── Geração completa (persistida) ─── */

export const generationSchema = z.strictObject({
  id: z.uuid(),
  createdAt: z.iso.datetime({ offset: true }),
  situationRaw: z.string().min(1).max(4000),
  input: leadInputSchema,
  variants: z.array(variantSchema).length(3),
  promptVersions: z.array(promptVersionSchema).min(1).max(5),
  engine: z.enum(ENGINES),
  model: z.string().optional(),
}).superRefine((value, context) => {
  const ids = new Set<string>();
  if (ids.has(value.id)) context.addIssue({ code: 'custom', path: ['id'], message: 'ID duplicado.' });
  ids.add(value.id);
  value.variants.forEach((variant, index) => {
    if (ids.has(variant.id)) context.addIssue({ code: 'custom', path: ['variants', index, 'id'], message: 'Use IDs únicos.' });
    ids.add(variant.id);
  });
});

export type Generation = z.infer<typeof generationSchema>;

/* ─── Configuração do usuário (persistida no localStorage/conta) ─── */

export const userConfigSchema = z.strictObject({
  defaultEngine: z.enum(ENGINES).default('local'),
  llamaEndpoint: z.string().url().optional().default('http://localhost:11434'),
  llamaModel: z.string().optional().default('llama3.1:8b'),
  openaiEndpoint: z.string().url().optional(),
  openaiModel: z.string().optional(),
  anthropicModel: z.string().optional().default('claude-3-5-sonnet-20241022'),
  theme: z.enum(['dark', 'light', 'system']).default('dark'),
  reducedMotion: z.boolean().default(false),
  sidebarCollapsed: z.boolean().default(false),
});

export type UserConfig = z.infer<typeof userConfigSchema>;
export const defaultUserConfig: UserConfig = userConfigSchema.parse({});

/* ─── Histórico (para listagem) ─── */

export const historyEntrySchema = z.strictObject({
  id: z.uuid(),
  createdAt: z.iso.datetime({ offset: true }),
  situationPreview: z.string().max(200),
  scriptType: z.enum(SCRIPT_TYPES),
  channel: z.enum(CHANNELS),
  engine: z.enum(ENGINES),
  model: z.string().optional(),
  favoriteCount: z.number().int().min(0).max(3),
});

export type HistoryEntry = z.infer<typeof historyEntrySchema>;