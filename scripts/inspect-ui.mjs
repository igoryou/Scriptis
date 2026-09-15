import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const out = new URL("../.impeccable/review/", import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "msedge" });
const reports = [];
for (const [name, width] of [
  ["desktop", 1440],
  ["mobile", 390],
]) {
  const page = await browser.newPage({
    viewport: { width, height: 1000 },
    reducedMotion: "reduce",
  });
  await page.goto("http://127.0.0.1:3000/");
  await page
    .getByRole("button", { name: "Gerar abordagens", exact: true })
    .waitFor();
  await page.waitForFunction(
    () => !document.querySelector(".generate-button").disabled,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: new URL(`${name}.png`, out).pathname.replace(/^\/(\w:)/, "$1"),
    fullPage: true,
  });
  await page.getByLabel("Nome do contato", { exact: true }).fill("Carla");
  await page
    .getByLabel("Nicho ou tipo de negócio", { exact: true })
    .fill("Clínica odontológica");
  await page.getByRole("radio", { name: "Casual", exact: true }).check();
  await page
    .getByRole("button", { name: "Gerar abordagens", exact: true })
    .click();
  await page.getByLabel("Mensagem 3", { exact: true }).waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: new URL(`${name}-result.png`, out).pathname.replace(/^\/(\w:)/, "$1"),
    fullPage: true,
  });
  reports.push({
    viewport: width,
    ...(await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
      title: document.title,
      controls: [
        ...document.querySelectorAll(
          ".field input:not([type=radio]),.generate-button",
        ),
      ].map((el) => ({
        label: el.id || el.textContent.trim(),
        height: el.getBoundingClientRect().height,
      })),
    }))),
  });
  await page.goto("http://127.0.0.1:3000/login");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: new URL(`${name}-login.png`, out).pathname.replace(/^\/(\w:)/, "$1"),
    fullPage: true,
  });
  await page.close();
}
await browser.close();
await writeFile(
  new URL("viewport-report.json", out),
  JSON.stringify(reports, null, 2),
);
console.log(JSON.stringify(reports, null, 2));
