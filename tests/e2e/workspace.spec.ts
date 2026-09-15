import { test, expect } from "@playwright/test";
test("the free flow creates three editable sequential approaches and a reusable prompt", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Nome do contato", { exact: true }).fill("Carla");
  await page
    .getByLabel("Nicho ou tipo de negócio", { exact: true })
    .fill("clínica odontológica");
  await page
    .getByRole("button", { name: "Gerar abordagens", exact: true })
    .click();
  const result = page.getByRole("region", { name: "Suas abordagens" });
  await expect(result.getByRole("tab")).toHaveCount(3);
  await expect(result.getByLabel("Mensagem 1", { exact: true })).toContainText(
    "",
  );
  await expect(result.getByLabel("Mensagem 1", { exact: true })).toHaveValue(
    /Carla/,
  );
  await expect(result.getByLabel("Mensagem 3", { exact: true })).toHaveValue(
    /\?$/,
  );
  for (let index = 0; index < 3; index++) {
    await result.getByRole("tab").nth(index).click();
    await expect(result.getByLabel("Mensagem 1", { exact: true })).toHaveValue(
      /Carla/,
    );
  }
  await page.getByText("O prompt por trás", { exact: true }).click();
  await expect(page.getByTestId("reusable-prompt")).toContainText("{{nome}}");
  await expect(page.getByTestId("reusable-prompt")).toContainText("{{nicho}}");
});
