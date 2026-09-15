import assert from "node:assert/strict";
import test from "node:test";
import { generationSchema, type LeadInput } from "../../src/lib/domain";
import { buildPrompt } from "../../src/lib/agent/buildPrompt";

const input: LeadInput = {
  name: "Ana",
  niche: "arquitetura",
  channel: "WhatsApp",
  objective: "Agendar reunião",
  tone: "Casual",
  hook: "",
  relationship: "Contato frio",
  scriptType: "abordagem_inicial",
  objection: "",
  nextStep: "",
  context: "",
};

test("composição gratuita gera três conversas distintas e válidas sem gancho", async () => {
  const { generateLocal } = await import("../../src/lib/generator");
  const before = Date.now();
  const result = generateLocal(input);
  assert.ok(!(result instanceof Promise), "API local é síncrona");
  assert.deepEqual(generationSchema.parse(result), result);
  assert.equal(result.engine, "local");
  assert.deepEqual(result.input, input);
  assert.ok(result.promptVersions.length >= 1);
  assert.equal(result.promptVersions[0].fullPrompt, buildPrompt(input)[0].fullPrompt);
  assert.ok(
    Date.parse(result.createdAt) >= before &&
      Date.parse(result.createdAt) <= Date.now(),
  );
  assert.equal(result.variants.length, 3);
  assert.equal(
    new Set([result.id, ...result.variants.map((v) => v.id)]).size,
    4,
  );
  assert.equal(new Set(result.variants.map((v) => v.title)).size, 3);
  assert.equal(
    new Set(result.variants.map((v) => v.messages.join(" "))).size,
    3,
  );
  for (const variant of result.variants) {
    assert.equal(variant.favorite, false);
    assert.ok(variant.messages.length >= 2 && variant.messages.length <= 4);
    const copy = variant.messages.join(" ");
    assert.ok(copy.includes(input.name));
    assert.ok(copy.includes(input.niche));
    assert.match(copy, /\bse\b/i);
    assert.match(copy, /reunião|conversa/i);
    assert.match(variant.messages.at(-1)!, /\?$/);
    assert.doesNotMatch(
      copy,
      /vi (seu|sua)|acompanho|me indicou|garant|dobrar|aumentar.*vendas/i,
    );
  }
});

test("compositor valida argumentos em runtime e guarda uma cópia normalizada da entrada", async () => {
  const { generateLocal } = await import("../../src/lib/generator");
  const dirty = Object.freeze({
    ...input,
    name: "  Ana  ",
    niche: " arquitetura ",
    hook: "  ",
  });
  const result = generateLocal(dirty);
  assert.deepEqual(result.input, input);
  assert.equal(dirty.name, "  Ana  ");
  for (const invalid of [
    null,
    {},
    { ...input, name: "" },
    { ...input, extra: "x" },
  ]) {
    assert.throws(() => generateLocal(invalid as LeadInput), {
      name: "ZodError",
    });
  }
  for (const iteration of [
    -1,
    0.5,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    "1",
    null,
  ]) {
    assert.throws(() => generateLocal(input, iteration as number), RangeError);
  }
});