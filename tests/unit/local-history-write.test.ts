import test from "node:test";
import assert from "node:assert/strict";
import { generateLocal } from "../../src/lib/generator";
import {
  readLocalHistory,
  writeLocalHistory,
  upsertHistory,
  HISTORY_KEY,
} from "../../src/lib/local-history";

const input = {
  name: "Carla",
  niche: "clínica",
  channel: "WhatsApp",
  objective: "Agendar reunião",
  tone: "Consultivo",
  hook: "",
  relationship: "Contato frio",
  scriptType: "abordagem_inicial",
  objection: "",
  nextStep: "",
  context: "",
} as const;

test("editing and favoriting persists exact text without duplicate history rows", () => {
  const first = generateLocal(input);
  const edited = structuredClone(first);
  edited.variants[0].messages[0] = "  Minha mensagem editada.  ";
  edited.variants[0].favorite = true;
  const rows = upsertHistory([first], edited);
  assert.equal(rows.length, 1);
  const data = new Map<string, string>();
  assert.equal(
    writeLocalHistory(
      {
        setItem: (k, v) => {
          data.set(k, v);
        },
      },
      rows,
    ),
    null,
  );
  assert.ok(data.has(HISTORY_KEY));
  assert.deepEqual(
    readLocalHistory({ getItem: (k) => data.get(k) ?? null }).generations,
    [edited],
  );
  const many = Array.from({ length: 60 }, () => generateLocal(input));
  assert.equal(upsertHistory(many, first).length, 50);
  assert.match(
    writeLocalHistory(
      {
        setItem: () => {
          throw new Error("quota");
        },
      },
      rows,
    ) ?? "",
    /salvar/i,
  );
});