import test from "node:test";
import assert from "node:assert/strict";
import { createApi } from "../../src/lib/backend/api";
import { readSettings } from "../../src/lib/backend/settings";
import { generationSchema } from "../../src/lib/domain";

const input = {
  name: "Lia",
  niche: "arquitetura",
  channel: "WhatsApp",
  objective: "Agendar reunião",
  tone: "Casual",
  hook: "",
  relationship: "Contato frio",
  scriptType: "abordagem_inicial",
} as const;
const request = (body: unknown) =>
  new Request("http://localhost/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

test("explicit local generation uses the real free composer without auth or network", async () => {
  const api = createApi({
    settings: readSettings({}),
    getUser: async () => {
      throw new Error("unexpected auth");
    },
  });
  const response = await api.generate(
    request({ input, provider: "local", iteration: 1 }),
  );
  assert.equal(response.status, 200);
  const { generation } = await response.json();
  assert.equal(generationSchema.safeParse(generation).success, true);
  assert.equal(generation.engine, "local");
  assert.equal(generation.variants.length, 3);
  assert.equal(generation.input.name, "Lia");
});
