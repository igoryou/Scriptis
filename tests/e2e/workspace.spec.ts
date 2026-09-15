import { test, expect } from "@playwright/test";

test("fluxo gratuito cria três scripts editáveis e um prompt reutilizável", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Nome", { exact: true }).fill("Carla");
  await page.getByLabel("Nicho", { exact: true }).fill("Clínica odontológica");
  await page.getByRole("button", { name: "Gerar script", exact: true }).click();

  const result = page.getByRole("region", { name: "Scripts gerados" });
  await expect(result.getByRole("tab")).toHaveCount(3);
  await expect(result.getByRole("tabpanel").getByRole("listitem").first()).toContainText("Carla");
  await expect(result.getByRole("tabpanel").getByRole("listitem").last()).toContainText(/\?$/);

  for (let index = 0; index < 3; index += 1) {
    await result.getByRole("tab").nth(index).click();
    await expect(result.getByRole("tabpanel").getByRole("listitem").first()).toContainText("Carla");
  }

  await expect(page.getByTestId("reusable-prompt")).toContainText("{{nome}}");
  await expect(page.getByTestId("reusable-prompt")).toContainText("{{nicho}}");
});

test("descrição livre é interpretada sem exigir formulário estruturado", async ({ page }) => {
  await page.goto("/");
  await page
    .getByLabel("Descreva a situação para gerar o script")
    .fill("Preciso fazer follow-up com a Carla da clínica odontológica pelo WhatsApp");
  await expect(page.getByLabel("Gancho observado opcional")).toHaveValue("");
  await page.getByRole("button", { name: "Gerar script", exact: true }).click();

  const result = page.getByRole("region", { name: "Scripts gerados" });
  await expect(result.getByRole("tab")).toHaveCount(3);
  await expect(result).toContainText("Carla");
  await expect(result).toContainText("follow up");
});
