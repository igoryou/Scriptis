import test from "node:test";
import assert from "node:assert/strict";
import { parseClaudePayload } from "../../src/lib/backend/claude-schema";
import { generateLocal } from "../../src/lib/generator";

const input = {
  name: "Carla",
  niche: "clínica",
  channel: "WhatsApp",
  objective: "Agendar reunião",
  tone: "Casual",
  hook: "",
  relationship: "Contato frio",
  scriptType: "abordagem_inicial",
  objection: "",
  nextStep: "",
  context: "",
} as const;

test("provider output is independently validated for sequential conversations", () => {
  const variants = generateLocal(input).variants.map(
    ({ title, description, messages }) => ({ title, description, messages }),
  );
  const result = parseClaudePayload({ variants }, input);
  assert.equal(result.engine, "anthropic");
  assert.equal(result.variants.length, 3);
  assert.throws(() =>
    parseClaudePayload({ variants: variants.slice(0, 2) }, input),
  );
  assert.throws(() =>
    parseClaudePayload(
      {
        variants: variants.map((v) => ({
          ...v,
          messages: ["Olá sem pergunta final"],
        })),
      },
      input,
    ),
  );
  assert.throws(() =>
    parseClaudePayload({ variants }, { ...input, channel: "E-mail" }),
  );
});