import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [390, 768, 1024, 1440]) {
  test(`workspace gratuito funciona em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/");
    const generate = page.getByRole("button", { name: "Gerar script", exact: true });
    await expect(generate).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);

    await page.getByLabel("Nome", { exact: true }).fill("Marina");
    await page.getByLabel("Nicho", { exact: true }).fill("Consultoria");
    await page.getByRole("group", { name: "Canal" }).getByText("Instagram", { exact: true }).click();
    await expect(generate).toBeEnabled();
    await generate.click();

    const result = page.getByRole("region", { name: "Scripts gerados" });
    await expect(result.getByRole("tab")).toHaveCount(3);
    await expect(result.getByRole("listitem").last()).toContainText(/\?$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(errors).toEqual([]);
  });
}

test("e-mail usa assunto e corpo único; briefing incompleto não gera", async ({ page }) => {
  await page.goto("/");
  const generate = page.getByRole("button", { name: "Gerar script", exact: true });
  await expect(generate).toBeDisabled();
  await expect(page.getByRole("region", { name: "Scripts gerados" }).getByRole("tab")).toHaveCount(0);

  await page.getByLabel("Nome", { exact: true }).fill("Lucas");
  await page.getByLabel("Nicho", { exact: true }).fill("Imobiliária");
  await page.getByRole("group", { name: "Canal" }).getByText("E-mail", { exact: true }).click();
  await generate.click();

  const panel = page.getByRole("tabpanel");
  await expect(panel.locator(".subject-display")).toContainText("Imobiliária");
  await expect(panel.getByRole("listitem")).toHaveCount(1);
  await expect(panel.getByRole("listitem")).toContainText("Lucas");
});
