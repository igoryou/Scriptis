import test from "node:test";
import assert from "node:assert/strict";
import { generateLocal } from "../../src/lib/generator";
import {
  CHANNELS,
  TONES,
  OBJECTIVES,
  RELATIONSHIPS,
  generationSchema,
  type LeadInput,
} from "../../src/lib/domain";

const base: LeadInput = {
  name: "Carla",
  niche: "clínica odontológica",
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

const copy = (input: LeadInput, iteration = 0) =>
  generateLocal(input, iteration)
    .variants.map((v) => v.messages.join(" "))
    .join("\n");

test("composition reflects each selected brief field rather than a fixed meeting template", () => {
  for (const [field, values] of Object.entries({
    tone: TONES,
    objective: OBJECTIVES,
    relationship: RELATIONSHIPS,
  })) {
    const versions = values.map((value) => copy({ ...base, [field]: value }));
    assert.equal(new Set(versions).size, values.length, field);
  }
  const hooked = { ...base, hook: "há interesse em agendamento online" };
  for (const v of generateLocal(hooked).variants)
    assert.ok(v.messages.join(" ").includes(hooked.hook));
  assert.notEqual(copy(base, 0), copy(base, 1));
  for (const channel of CHANNELS)
    for (const tone of TONES)
      for (const objective of OBJECTIVES)
        for (const relationship of RELATIONSHIPS) {
          const result = generateLocal({
            ...base,
            channel,
            tone,
            objective,
            relationship,
          });
          assert.ok(generationSchema.safeParse(result).success);
          assert.equal(result.variants.length, 3);
          for (const v of result.variants) {
            assert.match(v.messages.at(-1)!, /\?$/);
            if (channel === "E-mail" || channel === "LinkedIn")
              assert.equal(v.messages.length, 1);
            else assert.ok(v.messages.length >= 2 && v.messages.length <= 4);
            if (channel === "E-mail") assert.ok(v.subject);
            if (tone !== "Formal")
              assert.doesNotMatch(
                v.messages.join(" "),
                /Prezado|Venho por meio/i,
              );
            if (relationship === "Contato frio")
              assert.doesNotMatch(
                v.messages.join(" "),
                /como combinamos|retomar nossa conversa|me indicou/i,
              );
          }
        }
});