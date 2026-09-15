import { test, expect } from "@playwright/test";
test("login is honest about absent Supabase and leaves free creation available", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Comece sem nenhuma barreira." }),
  ).toBeVisible();
  await expect(
    page.getByText("Supabase ainda não conectado.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Continuar sem conta" }).click();
  await expect(
    page.getByLabel("Nome do contato", { exact: true }),
  ).toBeVisible();
});
