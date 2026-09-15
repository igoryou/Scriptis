import test from "node:test";
import assert from "node:assert/strict";
import { createApi } from "../../src/lib/backend/api";
import { readSettings } from "../../src/lib/backend/settings";
const input = {
  name: "Carla",
  niche: "clínica",
  channel: "WhatsApp",
  objective: "Agendar reunião",
  tone: "Casual",
  hook: "",
  relationship: "Contato frio",
};
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
});
