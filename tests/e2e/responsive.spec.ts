import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const width of [390, 768, 1024, 1440])
  test(`free workspace is usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Gerar abordagens", exact: true }),
    ).toBeEnabled();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      audit.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await page.getByLabel("Nome do contato", { exact: true }).fill("Marina");
    await page
      .getByLabel("Nicho ou tipo de negócio", { exact: true })
      .fill("consultoria");
    await page
      .getByRole("radio", { name: "Instagram DM", exact: true })
      .check();
    await page
      .getByRole("button", { name: "Gerar abordagens", exact: true })
      .click();
    await expect(page.getByLabel("Mensagem 3", { exact: true })).toHaveValue(
      /\?$/,
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    expect(errors).toEqual([]);
  });
test("email format and incomplete forms are handled without inventing an output", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Gerar abordagens", exact: true })
    .click();
  await expect(page.getByRole("tab")).toHaveCount(0);
  await page.getByLabel("Nome do contato", { exact: true }).fill("Lucas");
  await page
    .getByLabel("Nicho ou tipo de negócio", { exact: true })
    .fill("Imobiliária");
  await page.getByRole("radio", { name: "E-mail", exact: true }).check();
  await page
    .getByRole("button", { name: "Gerar abordagens", exact: true })
    .click();
  await expect(page.getByLabel("Assunto do e-mail")).toHaveValue(/Imobiliária/);
  await expect(page.getByLabel("Mensagem 1", { exact: true })).toHaveValue(
    /Lucas/,
  );
  await expect(page.getByLabel("Mensagem 2", { exact: true })).toHaveCount(0);
});
