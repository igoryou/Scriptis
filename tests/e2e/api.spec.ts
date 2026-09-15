import { test, expect } from "@playwright/test";
test("real HTTP routes keep the free base usable while cloud services are absent", async ({
  request,
}) => {
  const config = await request.get("/api/config");
  expect(config.status()).toBe(200);
  expect(await config.json()).toEqual({
    supabaseConfigured: false,
    anthropicConfigured: false,
    user: null,
  });
  const input = {
    name: "Carla",
    niche: "clínica",
    channel: "Instagram DM",
    objective: "Reconexão",
    tone: "Casual",
    hook: "",
    relationship: "Contato frio",
  };
  const local = await request.post("/api/generate", {
    data: { input, provider: "local" },
  });
  expect(local.status()).toBe(200);
  const { generation } = await local.json();
  expect(generation.variants).toHaveLength(3);
  expect(generation.provider).toBe("local");
  const paid = await request.post("/api/generate", {
    data: { input, provider: "anthropic" },
  });
  expect(paid.status()).toBe(503);
  expect((await request.get("/api/history")).status()).toBe(401);
  expect(
    (
      await request.post("/api/auth", {
        data: { email: "example@example.com" },
      })
    ).status(),
  ).toBe(503);
  expect(
    (
      await request.post("/api/generate", {
        data: { input, provider: "local" },
        headers: { Origin: "https://evil.example" },
      })
    ).status(),
  ).toBe(403);
});
