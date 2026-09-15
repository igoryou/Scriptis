import { test, expect } from "@playwright/test";

test("motor Llama indisponível pode ser configurado sem acionar API paga", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Local (gratuito)", exact: true }).click();
  const llama = page.getByRole("option", { name: /Llama \(Ollama local\)/ });
  await expect(llama).toBeEnabled();
  await llama.click();

  await expect(page.getByRole("heading", { name: "Configurar Llama (Ollama)" })).toBeVisible();
  await expect(page.getByLabel("Endpoint")).toHaveValue("http://localhost:11434");
  await expect(page.getByLabel("Modelo")).toHaveValue("llama3.1:8b");

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Não foi possível conectar");
    await dialog.accept();
  });
  await page.getByRole("button", { name: "Testar conexão" }).click();
});
