import { test, expect } from "@playwright/test";

const input = {
  name: "Carla",
  niche: "Clínica odontológica",
  channel: "WhatsApp",
  objective: "Agendar reunião",
  tone: "Consultivo",
  hook: "",
  relationship: "Contato frio",
  scriptType: "abordagem_inicial",
};

test("rotas HTTP mantêm o motor local disponível sem serviços de nuvem", async ({ request }) => {
  const config = await request.get("/api/config");
  expect(config.status()).toBe(200);
  expect(await config.json()).toEqual({
    supabaseConfigured: false,
    anthropicConfigured: false,
    openaiConfigured: false,
    user: null,
  });

  const local = await request.post("/api/generate", { data: { input, provider: "local" } });
  expect(local.status()).toBe(200);
  const { generation } = await local.json();
  expect(generation.variants).toHaveLength(3);
  expect(generation.engine).toBe("local");

  const anthropic = await request.post("/api/generate", { data: { input, provider: "anthropic" } });
  expect(anthropic.status()).toBe(503);
  expect(await anthropic.json()).toEqual({ error: "A Anthropic não está configurada. Use o motor gratuito." });

  const history = await request.get("/api/history");
  expect(history.status()).toBe(401);
  expect(await history.json()).toEqual({ error: "Entre na sua conta para acessar o histórico sincronizado." });

  const auth = await request.post("/api/auth", { data: { email: "person@example.com" } });
  expect(auth.status()).toBe(503);
});
