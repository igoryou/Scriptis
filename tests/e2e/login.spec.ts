import { test, expect } from "@playwright/test";

test("login informa Supabase ausente e mantém o modo gratuito acessível", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Entre no seu espaço." })).toBeVisible();
  await page.getByLabel("E-mail", { exact: true }).fill("teste@example.com");
  await page.getByRole("button", { name: "Enviar link mágico" }).click();
  await expect(page.getByText("Contas ainda não estão configuradas. Você pode continuar gratuitamente sem conta.", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Voltar ao gerador gratuito" }).click();
  await expect(page.getByLabel("Nome", { exact: true })).toBeVisible();
});
