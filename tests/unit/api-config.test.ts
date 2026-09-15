import test from "node:test";
import assert from "node:assert/strict";
import { readSettings } from "../../src/lib/backend/settings";
import { createApi } from "../../src/lib/backend/api";

test("configured flags require complete settings and never expose keys or extra user fields", async () => {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-key",
    NEXT_PUBLIC_SITE_URL: "https://scriptis.example",
    ANTHROPIC_API_KEY: "private-key",
    ANTHROPIC_MODEL: "configured-model",
  };
  const settings = readSettings(env);
  const response = await createApi({
    settings,
    getUser: async () => ({
      id: "user-1",
      email: "user@example.com",
      access_token: "hidden",
    }),
  }).config();
  assert.deepEqual(await response.json(), {
    supabaseConfigured: true,
    anthropicConfigured: true,
    user: { id: "user-1", email: "user@example.com" },
  });
  const noAuth = await createApi({
    settings: readSettings({
      ANTHROPIC_API_KEY: "private-key",
      ANTHROPIC_MODEL: "configured-model",
    }),
    getUser: async () => null,
  }).config();
  assert.equal((await noAuth.json()).anthropicConfigured, false);
  assert.equal(
    readSettings({ ...env, NEXT_PUBLIC_SITE_URL: "https://other.example/path" })
      .supabase,
    null,
  );
  assert.equal(readSettings({ ...env, ANTHROPIC_MODEL: "" }).anthropic, null);
});

test("unconfigured config keeps the free base available without touching auth or returning secrets", async () => {
  const api = createApi({
    settings: readSettings({}),
    getUser: async () => {
      throw new Error("must not call auth");
    },
  });
  const response = await api.config();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    supabaseConfigured: false,
    anthropicConfigured: false,
    user: null,
  });
});
