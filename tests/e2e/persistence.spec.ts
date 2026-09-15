import { test, expect } from "@playwright/test";
test("edits, individual copy and favorites survive reloading and reopening", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByLabel("Nome do contato", { exact: true }).fill("Ana");
  await page
    .getByLabel("Nicho ou tipo de negócio", { exact: true })
    .fill("Arquitetura");
  await page
    .getByRole("button", { name: "Gerar abordagens", exact: true })
    .click();
  const text = "Oi, Ana! Esta é a minha versão editada.";
  await page.getByLabel("Mensagem 1", { exact: true }).fill(text);
  await page
    .getByRole("button", { name: "Copiar mensagem 1", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(text);
  await page
    .getByRole("button", { name: "Favoritar variante", exact: true })
    .click();
  await page.reload();
  await page.getByRole("button", { name: /Favoritos/ }).click();
  await page.getByRole("button", { name: "Reabrir abordagem de Ana" }).click();
  await expect(page.getByLabel("Mensagem 1", { exact: true })).toHaveValue(
    text,
  );
  await expect(
    page.getByRole("button", { name: "Remover dos favoritos" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByText("O prompt por trás", { exact: true }).click();
  await page
    .getByRole("button", { name: "Copiar prompt", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("{{nome}}");
  await page.getByRole("button", { name: /Histórico/ }).click();
  await page.getByRole("button", { name: "Excluir abordagem de Ana" }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Reabrir abordagem de Ana" }),
  ).toBeVisible();
});
