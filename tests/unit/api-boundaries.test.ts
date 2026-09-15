import test from "node:test";
import assert from "node:assert/strict";
import { createApi } from "../../src/lib/backend/api";
import { readSettings } from "../../src/lib/backend/settings";
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
const request = (body: unknown, origin?: string) =>
  new Request("http://localhost/api/generate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(origin ? { origin } : {}),
    },
    body: JSON.stringify(body),
  });
const configured = readSettings({
  NEXT_PUBLIC_SITE_URL: "http://localhost",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-public",
  ANTHROPIC_API_KEY: "test-secret",
  ANTHROPIC_MODEL: "test-model",
  OPENAI_COMPATIBLE_BASE_URL: "https://api.example.com/v1",
  OPENAI_COMPATIBLE_API_KEY: "test-openai-secret",
  OPENAI_COMPATIBLE_MODEL: "test-openai-model",
});
test("paid generation is fail-closed and never silently converted into a local result", async () => {
  const disabled = createApi({
    settings: readSettings({}),
    getUser: async () => null,
  });
  assert.equal(
    (await disabled.generate(request({ input, provider: "anthropic" }))).status,
    503,
  );
  assert.equal(
    (await disabled.generate(request({ input, provider: "openai_compatible" }))).status,
    503,
  );
  assert.equal((await disabled.generate(request({ input }))).status, 400);
  assert.equal(
    (await disabled.generate(request({ input, provider: "untrusted" }))).status,
    400,
  );
  assert.equal(
    (
      await disabled.generate(
        request({ input, provider: "local" }, "https://evil.example"),
      )
    ).status,
    403,
  );
  const anon = createApi({ settings: configured, getUser: async () => null });
  assert.equal(
    (await anon.generate(request({ input, provider: "anthropic" }))).status,
    401,
  );
  assert.equal(
    (await anon.generate(request({ input, provider: "openai_compatible" }))).status,
    401,
  );
});

test("OpenAI-compatible generation is explicit, authenticated and quota-controlled", async () => {
  let calls = 0;
  const generation = generateLocal(input);
  const api = createApi({
    settings: configured,
    getUser: async () => ({ id: "00000000-0000-4000-8000-000000000001", email: "person@example.com" }),
    consumeQuota: async () => true,
    generateOpenAI: async () => {
      calls += 1;
      return { ...generation, engine: "openai_compatible" as const, model: "test-openai-model" };
    },
  });

  const response = await api.generate(request({ input, provider: "openai_compatible" }));
  assert.equal(response.status, 200);
  assert.equal(calls, 1);
  assert.equal((await response.json()).generation.engine, "openai_compatible");
});
