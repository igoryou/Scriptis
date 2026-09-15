import { test, expect } from "@playwright/test";

test("edições, cópia e favoritos persistem após recarregar", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByLabel("Nome", { exact: true }).fill("Ana");
  await page.getByLabel("Nicho", { exact: true }).fill("Arquitetura");
  await page.getByRole("button", { name: "Gerar script", exact: true }).click();

  const text = "Oi, Ana! Esta é a minha versão editada.";
  const firstMessage = page.getByRole("tabpanel").locator(".editable-display").first();
  await firstMessage.dblclick();
  const editor = page.getByRole("tabpanel").locator("textarea.editable-text");
  await editor.fill(text);
  await editor.press("Control+Enter");
  await expect(firstMessage).toHaveText(text);

  await page.getByRole("button", { name: "Copiar mensagem 1", exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(text);
  await page.getByRole("button", { name: "Favoritar", exact: true }).click();

  await page.reload();
  await page.getByRole("button", { name: /Favoritos/ }).click();
  await page.getByRole("button", { name: "Reabrir abordagem de Ana" }).click();
  await expect(page.getByRole("tabpanel").locator(".editable-display").first()).toHaveText(text);
  await expect(page.getByRole("button", { name: "Remover dos favoritos" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: /Histórico/ }).click();
  await page.getByRole("button", { name: "Excluir abordagem de Ana" }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Reabrir abordagem de Ana" })).toBeVisible();
});
