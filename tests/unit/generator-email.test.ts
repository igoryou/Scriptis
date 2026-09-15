import test from "node:test";
import assert from "node:assert/strict";
import { generateLocal } from "../../src/lib/generator";
import type { LeadInput } from "../../src/lib/domain";

const input: LeadInput = {
  name: "Carla",
  niche: "clínica odontológica",
  channel: "E-mail",
  objective: "Agendar reunião",
  tone: "Consultivo",
  hook: "",
  relationship: "Contato frio",
  scriptType: "abordagem_inicial",
  objection: "",
  nextStep: "",
  context: "",
};

test("email variants are a single readable body with a separate subject", () => {
  for (const v of generateLocal(input).variants) {
    assert.equal(v.messages.length, 1);
    assert.ok(v.subject && v.subject.length < 200);
    assert.match(v.messages[0], /\?$/);
  }
});